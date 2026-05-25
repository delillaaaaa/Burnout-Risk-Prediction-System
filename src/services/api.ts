import axios from 'axios';

const ML_API_URL = 'http://localhost:8000/predict';

export const predictBurnout = async (data: any) => {
  try {
    const response = await axios.post(ML_API_URL, data);
    return response.data; // { burnout_score, risk_level }
  } catch (error) {
    console.error('Prediction error:', error);
    throw error;
  }
};