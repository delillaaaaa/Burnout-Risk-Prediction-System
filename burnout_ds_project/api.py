from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, create_model
import pickle
import pandas as pd
import numpy as np
import sys

app = FastAPI(title="Burnout Prediction API")

# Load model artifacts
model_obj = None
feature_names = None
scaler = None

try:
    with open("model_artifacts.pkl", "rb") as f:
        model_artifacts = pickle.load(f)
    print("Model loaded. Type:", type(model_artifacts))

    # Ekstrak model dan scaler dari dictionary
    if isinstance(model_artifacts, dict):
        print("Keys in dict:", list(model_artifacts.keys()))
        if "model" in model_artifacts:
            model_obj = model_artifacts["model"]
        else:
            # cari objek dengan method predict
            for key, val in model_artifacts.items():
                if hasattr(val, "predict"):
                    model_obj = val
                    print(f"Found model at key '{key}'")
                    break
        if "scaler" in model_artifacts:
            scaler = model_artifacts["scaler"]
    else:
        model_obj = model_artifacts

    # Ambil feature names dari model jika ada
    if model_obj and hasattr(model_obj, "feature_names_in_"):
        feature_names = list(model_obj.feature_names_in_)
        print("Feature names from model:", feature_names)
    else:
        # Baca df_clean.csv untuk menentukan fitur (asumsikan kolom terakhir adalah target)
        df = pd.read_csv("df_clean.csv")
        target_col = df.columns[-1]  # misal 'BurnoutScore'
        feature_names = [col for col in df.columns if col != target_col]
        print("Feature names from df_clean.csv (excluding target):", feature_names)

    if not feature_names:
        raise RuntimeError("No feature names could be determined.")

except Exception as e:
    print(f"Error loading model: {e}", file=sys.stderr)
    model_obj = None
    feature_names = None

if not feature_names:
    print("WARNING: Feature names not loaded. Please check files.")
    # Fallback: gunakan 14 field dari error sebelumnya
    feature_names = [
        "Age", "Experience", "Gender_enc", "HighRiskFlag", "JobRole_enc",
        "WorkHoursPerWeek", "RemoteRatio", "SatisfactionLevel", "StressLevel",
        "StressWorkRatio", "WorkLifeScore", "SeniorEmployee", "StressCategory",
        "SatisfactionInverse"
    ]
    print("Using fallback feature names:", feature_names)

# Buat model Pydantic dinamis
fields = {name: (float, ...) for name in feature_names}
BurnoutInput = create_model("BurnoutInput", **fields)

@app.get("/")
def root():
    return {"message": "Burnout Prediction API"}

@app.post("/predict")
def predict(data: BurnoutInput):
    if model_obj is None:
        raise HTTPException(status_code=500, detail="Model not loaded")
    try:
        input_dict = data.dict()
        # Pastikan urutan kolom sesuai feature_names
        input_df = pd.DataFrame([input_dict])[feature_names]
        # Terapkan scaler jika ada
        if scaler is not None and hasattr(scaler, "transform"):
            input_df = scaler.transform(input_df)
        pred = model_obj.predict(input_df)[0]
        burnout_score = float(pred)
        burnout_score = max(0, min(100, burnout_score))
        return {
            "burnout_score": burnout_score,
            "risk_level": "High Risk" if burnout_score >= 70 else ("Medium Risk" if burnout_score >= 40 else "Low Risk")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")