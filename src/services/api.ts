import axios from "axios";

const API_BASE = "https://apiburnout-production.up.railway.app";

export const apiClient = axios.create({ baseURL: API_BASE });

export interface PredictResponse {
  status_code: number;
  success: boolean;
  data: {
    burnout_probability: number;
    burnout_probability_percent: string;
    risk_level: string;
    hr_recommendation: string;
    ui_theme_color: string;
    ai_wellness_recommendations: string[];
  };
}

export async function predictBurnout(mlInput: object): Promise<PredictResponse> {
  const response = await apiClient.post<PredictResponse>("/predict", mlInput);
  return response.data;
}