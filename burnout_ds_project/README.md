# 🔥 Burnout Risk Prediction System — Data Scientist Files
**Capstone Project Coding Camp 2026 | CC26-PSU335**
**Tema: Healthy Lives & Well-being**

---

## 📁 Struktur File

```
burnout_ds_project/
├── burnout_analysis.py          ← Script Python utama (jalankan ini dulu!)
├── burnout_analysis.ipynb       ← Versi Jupyter Notebook (interaktif)
├── dashboard_burnout.py         ← Dashboard Streamlit
├── synthetic_employee_burnout.csv  ← Dataset mentah
├── requirements.txt             ← Daftar library yang dibutuhkan
│
├── [GENERATED setelah run analysis.py]
├── df_clean.csv                 ← Dataset bersih
├── data_dictionary.csv          ← Kamus data
├── model_artifacts.pkl          ← Model ML tersimpan
├── fig1_distribusi_fitur.png
├── fig2_heatmap_korelasi.png
├── fig3_burnout_kategori.png
├── fig4_boxplot_burnout.png
├── fig5_risk_level.png
├── fig6_scatter_burnout.png
├── fig7_explanatory.png
└── fig8_ab_testing.png
```

---

## 🚀 Cara Menjalankan

### Step 1: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 2: Jalankan Pipeline Analisis
```bash
# Opsi A: Script Python langsung
python burnout_analysis.py

# Opsi B: Jupyter Notebook (lebih interaktif, ada penjelasan di setiap cell)
jupyter notebook burnout_analysis.ipynb
# atau
jupyter lab burnout_analysis.ipynb
```

> ⚠️ Wajib jalankan Step 2 terlebih dahulu sebelum dashboard!
> Script ini menghasilkan `model_artifacts.pkl` dan `df_clean.csv` yang dibutuhkan dashboard.

### Step 3: Jalankan Dashboard Streamlit (Lokal)
```bash
streamlit run dashboard_burnout.py
```
Dashboard akan otomatis terbuka di browser: `http://localhost:8501`

---

## ☁️ Deploy Dashboard ke Streamlit Cloud (Publik)

### Prasyarat
- Akun GitHub
- Akun Streamlit Cloud (gratis di [streamlit.io/cloud](https://streamlit.io/cloud))

### Langkah-langkah

**1. Persiapkan Repository GitHub**
```bash
# Pastikan semua file berikut ada di folder proyek:
# - dashboard_burnout.py
# - model_artifacts.pkl   (generate dari burnout_analysis.py)
# - df_clean.csv          (generate dari burnout_analysis.py)
# - requirements.txt

git init
git add dashboard_burnout.py model_artifacts.pkl df_clean.csv requirements.txt
git commit -m "feat: burnout risk prediction dashboard"
git remote add origin https://github.com/USERNAME/burnout-prediction.git
git push -u origin main
```

**2. Deploy di Streamlit Cloud**
1. Buka [https://streamlit.io/cloud](https://streamlit.io/cloud)
2. Klik **"New app"**
3. Pilih repository GitHub yang sudah di-push
4. Set **Main file path**: `dashboard_burnout.py`
5. Klik **"Deploy!"**
6. Tunggu 2–5 menit → Dashboard online! 🎉

**3. Dapatkan URL Publik**
Setelah deploy selesai, Streamlit Cloud akan memberikan URL seperti:
```
https://USERNAME-burnout-prediction-dashboard-burnout-XXXXX.streamlit.app
```

### Tips Deployment
- File `model_artifacts.pkl` bisa besar, pastikan ukurannya < 100MB (biasanya <10MB)
- Jika ada error, cek log di Streamlit Cloud → bagian "Manage app"
- Untuk update: `git push` saja, Streamlit Cloud auto-redeploy

---

## 🤖 Integrasi dengan AI Engineer (FastAPI)

File `model_artifacts.pkl` berisi semua komponen untuk inference:

```python
import pickle
import pandas as pd

# Load artifacts
with open("model_artifacts.pkl", "rb") as f:
    artifacts = pickle.load(f)

model     = artifacts["best_model"]
scaler    = artifacts["scaler"]
le_gender = artifacts["le_gender"]
le_role   = artifacts["le_role"]
FEATURES  = artifacts["features"]

# Contoh inference
def predict_burnout(age, gender, job_role, experience, work_hours,
                    remote, satisfaction, stress):
    gender_enc   = le_gender.transform([gender])[0]
    role_enc     = le_role.transform([job_role])[0]
    stress_ratio = stress / (work_hours + 1)
    wl_score     = satisfaction * (1 - remote / 100)
    high_risk    = int(stress >= 7 and work_hours >= 50)
    senior       = int(experience >= 10)
    stress_cat   = 0 if stress <= 3 else (1 if stress <= 6 else 2)
    sat_inv      = 5.0 - satisfaction

    X = pd.DataFrame([[age, experience, work_hours, remote, satisfaction, stress,
                       gender_enc, role_enc, stress_ratio, wl_score,
                       high_risk, senior, stress_cat, sat_inv]],
                     columns=FEATURES)
    X_scaled   = scaler.transform(X)
    prediction = model.predict(X_scaled)[0]
    proba      = model.predict_proba(X_scaled)[0][1]
    return {"burnout": int(prediction), "probability": float(proba)}
```

---

## 📊 Ringkasan Hasil Analisis

| Item | Hasil |
|------|-------|
| Total karyawan | 2.000 |
| Burnout rate | 6.5% |
| Faktor terkuat | StressLevel (r=+0.32), SatisfactionLevel (r=-0.23), WorkHoursPerWeek (r=+0.23) |
| Model terbaik | Gradient Boosting / Random Forest (AUC-ROC = 1.000) |
| A/B Test | Jam kerja ≥50 jam memiliki burnout rate 13.1% vs 0% untuk <40 jam (p<0.05 ✅) |

---

*Dibuat oleh tim Data Science CC26-PSU335 | Coding Camp 2026 × DBS Foundation*
