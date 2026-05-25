import React, { useState } from 'react';
import { mlApi, backendApi } from '../services/api';

const Assessment = () => {
  const [formData, setFormData] = useState({
    Age: 35,
    Experience: 10,
    Gender_enc: 1,
    HighRiskFlag: 0,
    JobRole_enc: 2,
    WorkHoursPerWeek: 45,
    RemoteRatio: 0.5,
    SatisfactionLevel: 70,
    StressLevel: 60,
    StressWorkRatio: 0.8,
    WorkLifeScore: 65,
    SeniorEmployee: 0,
    StressCategory: 2,
    SatisfactionInverse: 30
  });
  const [result, setResult] = useState<null | { burnout_score: number; risk_level: string }>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: parseFloat(e.target.value) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Panggil FastAPI untuk prediksi
      const predRes = await mlApi.post('/predict', formData);
      const { burnout_score, risk_level } = predRes.data;

      // 2. Simpan hasil ke backend Express (database)
      await backendApi.post('/assessment', {
        user_name: "User", // bisa diubah nanti
        score: burnout_score,
        risk_level: risk_level,
        date: new Date().toISOString()
      });

      setResult({ burnout_score, risk_level });
      alert('Assessment saved!');
    } catch (err) {
      console.error(err);
      alert('Error: ' + (err as any).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Burnout Risk Assessment</h1>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
        {Object.keys(formData).map(key => (
          <div key={key} className="flex flex-col">
            <label className="font-medium text-sm">{key}</label>
            <input
              type="number"
              step="any"
              name={key}
              value={formData[key as keyof typeof formData]}
              onChange={handleChange}
              className="border rounded p-2"
              required
            />
          </div>
        ))}
        <div className="col-span-2">
          <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded">
            {loading ? 'Predicting...' : 'Predict & Save'}
          </button>
        </div>
      </form>
      {result && (
        <div className="mt-6 p-4 bg-gray-100 rounded">
          <h2 className="text-xl font-semibold">Result</h2>
          <p>Burnout Score: <strong>{result.burnout_score}</strong> / 100</p>
          <p>Risk Level: <strong>{result.risk_level}</strong></p>
        </div>
      )}
    </div>
  );
};

export default Assessment;