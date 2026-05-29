import axios from 'axios';
import { supabase } from './supabase';

const API_URL = 'http://localhost:5000/api';

const getToken = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
};

export const submitAssessment = async (assessmentData: any) => {
  const token = await getToken();
  
  if (!token) {
    throw new Error('User not authenticated');
  }
  
  const response = await axios.post(`${API_URL}/assessment`, assessmentData, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  return response.data;
};

export const getAssessmentHistory = async () => {
  const token = await getToken();
  
  if (!token) {
    throw new Error('User not authenticated');
  }
  
  const response = await axios.get(`${API_URL}/assessments`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return response.data;
};