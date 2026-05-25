import React, { useState } from 'react';
import { predictBurnout } from '../services/api';

const Assessment = () => {
  const [formData, setFormData] = useState({
    Age: 30,
    Experience: 5,
    Gender_enc: 1,
    HighRiskFlag: 0,
    JobRole_enc: 1,
    WorkHoursPerWeek: 40,
    RemoteRatio: 0.5,
    SatisfactionLevel: 70,
    StressLevel: 50,
    StressWorkRatio: 0.6,
    WorkLifeScore: 60,
    SeniorEmployee: 0,
    StressCategory: 1,
    SatisfactionInverse: 30
  });
  const [result, setResult] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: parseFloat(e.target.value) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const prediction = await predictBurnout(formData);
    setResult(prediction);
  };

  return (
    <div>
      <h1>Burnout Assessment</h1>
      <form onSubmit={handleSubmit}>
        {/* Buat 14 input field sesuai nama */}
        {Object.keys(formData).map(key => (
          <div key={key}>
            <label>{key}</label>
            <input
              type="number"
              name={key}
              value={formData[key]}
              onChange={handleChange}
              step="any"
            />
          </div>
        ))}
        <button type="submit">Predict</button>
      </form>
      {result && (
        <div>
          <h2>Result</h2>
          <p>Burnout Score: {result.burnout_score}</p>
          <p>Risk Level: {result.risk_level}</p>
        </div>
      )}
    </div>
  );
};

export default Assessment;