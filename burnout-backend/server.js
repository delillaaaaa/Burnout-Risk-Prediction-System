require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const FASTAPI_URL = 'https://apiburnout-production.up.railway.app/predict';

// ========== HEALTH CHECK ==========
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ========== POST ASSESSMENT ==========
app.post('/api/assessment', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization token' });
    }
    
    const token = authHeader.split(' ')[1];
    const supabaseWithAuth = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    
    const { data: { user }, error: sessionError } = await supabaseWithAuth.auth.getUser(token);
    if (sessionError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    const { 
      stress_level, workload_level, work_life_balance, job_satisfaction,
      age, gender, job_role, years_experience, work_hours_per_week, remote_ratio
    } = req.body;
    
    const fastapiBody = {
      Age: age || 30,
      Gender: gender || "Not specified",
      JobRole: job_role || "Unknown",
      Experience: years_experience || 0,
      WorkHoursPerWeek: work_hours_per_week || 40,
      RemoteRatio: remote_ratio || 0,
      SatisfactionLevel: job_satisfaction,
      StressLevel: stress_level
    };
    
    const predictResponse = await fetch(FASTAPI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fastapiBody)
    });
    
    const predictResult = await predictResponse.json();
    if (!predictResult.success) throw new Error('FastAPI prediction failed');
    
    const { data: mlData } = predictResult;
    
    const { data: assessmentData, error: insertError } = await supabaseWithAuth
      .from('burnout_assessments')
      .insert({
        user_id: user.id,
        stress_level, workload_level, work_life_balance, job_satisfaction,
        burnout_score: mlData.burnout_probability,
        burnout_label: mlData.risk_level,
        prediction_confidence: null
      })
      .select()
      .single();
    
    if (insertError) throw insertError;
    
    const recommendations = [
      { assessment_id: assessmentData.id, category: 'HR', recommendation_text: mlData.hr_recommendation },
      ...mlData.ai_wellness_recommendations.map(rec => ({ assessment_id: assessmentData.id, category: 'Wellness', recommendation_text: rec }))
    ];
    
    const { error: recError } = await supabaseWithAuth.from('recommendations').insert(recommendations);
    if (recError) throw recError;
    
    res.json({
      success: true,
      assessment_id: assessmentData.id,
      burnout_score: mlData.burnout_probability,
      burnout_probability_percent: mlData.burnout_probability_percent,
      risk_level: mlData.risk_level,
      ui_theme_color: mlData.ui_theme_color,
      hr_recommendation: mlData.hr_recommendation,
      ai_wellness_recommendations: mlData.ai_wellness_recommendations,
      created_at: assessmentData.created_at
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== GET ALL ASSESSMENTS BY USER ID ==========
// URL BARU: /api/assessments/user/:user_id
app.get('/api/assessments/user/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization token' });
    }
    
    const token = authHeader.split(' ')[1];
    const supabaseWithAuth = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    
    const { data: { user }, error: sessionError } = await supabaseWithAuth.auth.getUser(token);
    if (sessionError || !user) return res.status(401).json({ error: 'Invalid token' });
    
    if (user.id !== user_id) {
      return res.status(403).json({ error: 'Forbidden: You can only access your own data' });
    }
    
    const { data, error } = await supabaseWithAuth
      .from('burnout_assessments')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== GET SINGLE ASSESSMENT + RECOMMENDATIONS ==========
app.get('/api/assessment/:assessment_id', async (req, res) => {
  try {
    const { assessment_id } = req.params;
    
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization token' });
    }
    
    const token = authHeader.split(' ')[1];
    const supabaseWithAuth = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    
    const { data: { user }, error: sessionError } = await supabaseWithAuth.auth.getUser(token);
    if (sessionError || !user) return res.status(401).json({ error: 'Invalid token' });
    
    const { data: assessment, error: aError } = await supabaseWithAuth
      .from('burnout_assessments')
      .select('*')
      .eq('id', assessment_id)
      .single();
    
    if (aError) throw aError;
    
    if (assessment.user_id !== user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const { data: recommendations, error: rError } = await supabaseWithAuth
      .from('recommendations')
      .select('*')
      .eq('assessment_id', assessment_id);
    
    if (rError) throw rError;
    
    res.json({ success: true, assessment, recommendations });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== PROFILE ENDPOINTS ==========
app.post('/api/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization token' });
    }
    
    const token = authHeader.split(' ')[1];
    const supabaseWithAuth = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    
    const { data: { user }, error: sessionError } = await supabaseWithAuth.auth.getUser(token);
    if (sessionError || !user) return res.status(401).json({ error: 'Invalid token' });
    
    const { age, gender, job_role, department, years_experience, work_hours_per_week, remote_ratio } = req.body;
    
    const { data: existingProfile } = await supabaseWithAuth
      .from('general_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();
    
    let result;
    if (existingProfile) {
      result = await supabaseWithAuth
        .from('general_profiles')
        .update({ age, gender, job_role, department, years_experience, work_hours_per_week, remote_ratio, updated_at: new Date() })
        .eq('user_id', user.id)
        .select();
    } else {
      result = await supabaseWithAuth
        .from('general_profiles')
        .insert({ user_id: user.id, age, gender, job_role, department, years_experience, work_hours_per_week, remote_ratio })
        .select();
    }
    
    if (result.error) throw result.error;
    res.json({ success: true, data: result.data[0] });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization token' });
    }
    
    const token = authHeader.split(' ')[1];
    const supabaseWithAuth = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    
    const { data: { user }, error: sessionError } = await supabaseWithAuth.auth.getUser(token);
    if (sessionError || !user) return res.status(401).json({ error: 'Invalid token' });
    
    const { data, error } = await supabaseWithAuth
      .from('general_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    res.json({ success: true, data: data || null });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});