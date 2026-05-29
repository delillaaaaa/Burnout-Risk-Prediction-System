import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { submitAssessment } from '../lib/api';

interface AssessmentResult {
  success: boolean;
  assessment_id?: string;
  burnout_score?: number;
  burnout_probability_percent?: string;
  risk_level?: string;
  hr_recommendation?: string;
  ai_wellness_recommendations?: string[];
  ui_theme_color?: string;
}

export default function AssessmentForm() {
  const [formData, setFormData] = useState({
    stress_level: 5,
    workload_level: 5,
    work_life_balance: 5,
    job_satisfaction: 5,
    age: 30,
    gender: 'Male',
    job_role: 'Software Engineer',
    years_experience: 5,
    work_hours_per_week: 45,
    remote_ratio: 50
  });
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setError('User not logged in');
      setLoading(false);
      return;
    }
    
    const payload = {
      ...formData,
      user_id: user.id,
      stress_level: Number(formData.stress_level),
      workload_level: Number(formData.workload_level),
      work_life_balance: Number(formData.work_life_balance),
      job_satisfaction: Number(formData.job_satisfaction),
      age: Number(formData.age),
      years_experience: Number(formData.years_experience),
      work_hours_per_week: Number(formData.work_hours_per_week),
      remote_ratio: Number(formData.remote_ratio)
    };
    
    try {
      const response = await submitAssessment(payload);
      setResult(response);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Burnout Risk Assessment</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Stress Level (1-10)</label>
          <input
            type="range"
            name="stress_level"
            min="1"
            max="10"
            value={formData.stress_level}
            onChange={handleChange}
            className="w-full"
          />
          <span>{formData.stress_level}</span>
        </div>
        
        <div>
          <label className="block text-sm font-medium">Workload Level (1-10)</label>
          <input
            type="range"
            name="workload_level"
            min="1"
            max="10"
            value={formData.workload_level}
            onChange={handleChange}
            className="w-full"
          />
          <span>{formData.workload_level}</span>
        </div>
        
        <div>
          <label className="block text-sm font-medium">Work-Life Balance (1-10)</label>
          <input
            type="range"
            name="work_life_balance"
            min="1"
            max="10"
            value={formData.work_life_balance}
            onChange={handleChange}
            className="w-full"
          />
          <span>{formData.work_life_balance}</span>
        </div>
        
        <div>
          <label className="block text-sm font-medium">Job Satisfaction (1-10)</label>
          <input
            type="range"
            name="job_satisfaction"
            min="1"
            max="10"
            value={formData.job_satisfaction}
            onChange={handleChange}
            className="w-full"
          />
          <span>{formData.job_satisfaction}</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Age</label>
            <input
              type="number"
              name="age"
              value={formData.age}
              onChange={handleChange}
              className="w-full border rounded px-2 py-1"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium">Gender</label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="w-full border rounded px-2 py-1"
            >
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium">Job Role</label>
            <input
              type="text"
              name="job_role"
              value={formData.job_role}
              onChange={handleChange}
              className="w-full border rounded px-2 py-1"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium">Years Experience</label>
            <input
              type="number"
              name="years_experience"
              value={formData.years_experience}
              onChange={handleChange}
              className="w-full border rounded px-2 py-1"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium">Work Hours/Week</label>
            <input
              type="number"
              name="work_hours_per_week"
              value={formData.work_hours_per_week}
              onChange={handleChange}
              className="w-full border rounded px-2 py-1"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium">Remote Ratio (%)</label>
            <input
              type="number"
              name="remote_ratio"
              value={formData.remote_ratio}
              onChange={handleChange}
              className="w-full border rounded px-2 py-1"
            />
          </div>
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Processing...' : 'Submit Assessment'}
        </button>
      </form>
      
      {error && (
        <div className="mt-6 p-4 bg-red-100 text-red-700 rounded">
          Error: {error}
        </div>
      )}
      
      {result && result.success && (
        <div className="mt-6 p-4 bg-green-100 rounded" style={{ borderTop: `4px solid ${result.ui_theme_color}` }}>
          <h2 className="text-xl font-bold mb-2">Results</h2>
          <p><strong>Burnout Probability:</strong> {result.burnout_probability_percent}</p>
          <p><strong>Risk Level:</strong> {result.risk_level}</p>
          <p><strong>HR Recommendation:</strong> {result.hr_recommendation}</p>
          <p><strong>AI Wellness Recommendations:</strong></p>
          <ul className="list-disc pl-5">
            {result.ai_wellness_recommendations?.map((rec, idx) => (
              <li key={idx}>{rec}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}