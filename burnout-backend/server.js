require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Supabase Client (tanpa auth dulu)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// FastAPI endpoint
const FASTAPI_URL = 'https://apiburnout-production.up.railway.app/predict';

// ========== MIDDLEWARE: Ambil token dari header ==========
const getSupabaseWithToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return supabase; // tanpa token (hanya untuk read public)
  }
  
  const token = authHeader.split(' ')[1];
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }).auth.setSession({ access_token: token, refresh_token: '' })
    .then(({ data }) => {
      // Return supabase client dengan session
      const clientWithAuth = createClient(supabaseUrl, supabaseKey);
      clientWithAuth.auth.setSession(data.session);
      return clientWithAuth;
    });
};

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
    
    // Buat supabase client dengan token
    const supabaseWithAuth = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // Set session dengan token
    const { data: { user }, error: sessionError } = await supabaseWithAuth.auth.getUser(token);
    
    if (sessionError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    const { 
      stress_level, workload_level, work_life_balance, job_satisfaction,
      age, gender, job_role, years_experience, work_hours_per_week, remote_ratio
    } = req.body;
    
    // Panggil FastAPI
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
    
    if (!predictResult.success) {
      throw new Error('FastAPI prediction failed');
    }
    
    const { data: mlData } = predictResult;
    
    // Insert ke burnout_assessments
    const { data: assessmentData, error: insertError } = await supabaseWithAuth
      .from('burnout_assessments')
      .insert({
        user_id: user.id,
        stress_level: stress_level,
        workload_level: workload_level,
        work_life_balance: work_life_balance,
        job_satisfaction: job_satisfaction,
        burnout_score: mlData.burnout_probability,
        burnout_label: mlData.risk_level,
        prediction_confidence: null
      })
      .select()
      .single();
    
    if (insertError) throw insertError;
    
    // Insert recommendations
    const recommendations = [];
    
    recommendations.push({
      assessment_id: assessmentData.id,
      category: 'HR',
      recommendation_text: mlData.hr_recommendation
    });
    
    for (const rec of mlData.ai_wellness_recommendations) {
      recommendations.push({
        assessment_id: assessmentData.id,
        category: 'Wellness',
        recommendation_text: rec
      });
    }
    
    const { error: recError } = await supabaseWithAuth
      .from('recommendations')
      .insert(recommendations);
    
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

// GET history (perlu token juga)
app.get('/api/assessments', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing token' });
    }
    
    const token = authHeader.split(' ')[1];
    const supabaseWithAuth = createClient(supabaseUrl, supabaseKey);
    const { data: { user }, error: sessionError } = await supabaseWithAuth.auth.getUser(token);
    
    if (sessionError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    const { data, error } = await supabaseWithAuth
      .from('burnout_assessments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});