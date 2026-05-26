# =============================================================================
#  BURNOUT RISK PREDICTION SYSTEM — PIPELINE DATA SCIENTIST
#  Capstone Project Coding Camp 2026 | CC26-PSU335
#  Tema: Healthy Lives & Well-being
#  Dataset: synthetic_employee_burnout.csv
# =============================================================================
#
#  DAFTAR TAHAPAN:
#   1. Problem Discovery & Analisis Permasalahan
#   2. Data Wrangling (Gathering → Assessing → Cleaning)
#   3. Definisi Business Questions (7 Pertanyaan Bisnis)
#   4. Exploratory Data Analysis (EDA)
#   5. Visualisasi & Explanatory Analysis (menjawab BQ)
#   6. Feature Engineering & Data Dictionary
#   7. Persiapan Data untuk Model
#   8. A/B Testing
#
#  CARA MENJALANKAN:
#   python burnout_analysis.py
#
#  OUTPUT yang dihasilkan:
#   - fig1_distribusi_fitur.png   → distribusi semua fitur
#   - fig2_heatmap_korelasi.png   → heatmap korelasi
#   - fig3_burnout_kategori.png   → burnout per JobRole & Gender
#   - fig4_boxplot_burnout.png    → boxplot perbandingan
#   - fig5_risk_level.png         → distribusi risk level
#   - fig6_scatter_burnout.png    → scatter plot WorkHours vs Stress
#   - fig7_explanatory.png        → jawaban BQ komprehensif
#   - fig8_ab_testing.png         → visualisasi A/B Testing
#   - data_dictionary.csv         → kamus data
#   - df_clean.csv                → dataset bersih siap pakai
#   - model_artifacts.pkl         → model & scaler tersimpan
# =============================================================================

import warnings
warnings.filterwarnings("ignore")

import pandas as pd
import numpy as np
import matplotlib
matplotlib.use("Agg")   # Non-interactive backend (aman untuk server/script)
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import seaborn as sns
import os
import pickle
from scipy import stats

from sklearn.model_selection import (
    train_test_split, StratifiedKFold, cross_val_score
)
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import (
    classification_report, confusion_matrix,
    roc_auc_score, roc_curve,
    accuracy_score, f1_score, precision_score, recall_score
)

# ── Konfigurasi Path ──────────────────────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
DATA_PATH  = os.path.join(BASE_DIR, "synthetic_employee_burnout.csv")
OUTPUT_DIR = BASE_DIR          # simpan di folder yang sama agar mudah diakses
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ── Tema Visualisasi ──────────────────────────────────────────────────────────
sns.set_theme(style="whitegrid", palette="husl", font_scale=1.05)
PALETTE    = ["#2196F3", "#F44336", "#4CAF50", "#FF9800", "#9C27B0", "#00BCD4"]
COLOR_NO   = "#2196F3"   # Tidak Burnout → biru
COLOR_YES  = "#F44336"   # Burnout → merah


# =============================================================================
# BAGIAN 1 — PROBLEM DISCOVERY & ANALISIS PERMASALAHAN
# =============================================================================
print("=" * 70)
print("  BAGIAN 1: PROBLEM DISCOVERY & ANALISIS PERMASALAHAN")
print("=" * 70)

"""
KONTEKS BISNIS
──────────────
Burnout karyawan adalah kondisi kelelahan fisik dan mental akibat stres
kerja yang berkepanjangan. Dalam dunia kerja modern, burnout seringkali
tidak terdeteksi secara dini sehingga menyebabkan:
  • Penurunan produktivitas hingga 30–40%
  • Tingginya turnover karyawan (biaya rekrutmen bisa 50–200% gaji tahunan)
  • Dampak kesehatan mental jangka panjang (depresi, anxietas)
  • Kerugian finansial perusahaan

PERMASALAHAN YANG DIANALISIS
─────────────────────────────
Setelah melakukan diskusi tim dan literatur review, kami mengidentifikasi
3 permasalahan utama di dunia kerja:

  P1. Beban kerja berlebih tanpa sistem monitoring yang memadai
  P2. Tidak ada mekanisme deteksi dini burnout berbasis data
  P3. Intervensi HR bersifat reaktif (setelah masalah terjadi), bukan preventif

SOLUSI YANG DIPILIH
───────────────────
Dari ketiga masalah di atas, kami memilih P2 sebagai fokus utama:

  → Membangun Burnout Risk Prediction System berbasis Machine Learning
    yang dapat mengklasifikasikan risiko burnout karyawan menjadi
    Rendah / Sedang / Tinggi berdasarkan data profil dan kebiasaan kerja.

Alasan pemilihan solusi ini:
  ✓ Data tersedia (dataset burnout karyawan)
  ✓ Solvable dengan ML/Deep Learning
  ✓ Dampak nyata: HR bisa melakukan intervensi proaktif
  ✓ Scalable: bisa diintegrasikan ke sistem HR perusahaan

STAKEHOLDER:
  - HR Manager        → memantau kesehatan karyawan secara keseluruhan
  - Manajer Tim       → mengidentifikasi anggota tim berisiko
  - Karyawan Individu → self-assessment dan self-care

SUCCESS METRICS:
  - Model accuracy  ≥ 85%
  - AUC-ROC         ≥ 0.85
  - F1-Score        ≥ 0.70
"""

problem_statement = {
    "Masalah Utama": (
        "Burnout karyawan tidak terdeteksi secara dini, menyebabkan "
        "penurunan produktivitas dan tingginya turnover."
    ),
    "Akar Penyebab": [
        "Beban kerja berlebih (WorkHoursPerWeek tinggi)",
        "Tingkat stres tidak terkelola (StressLevel tinggi)",
        "Kepuasan kerja rendah (SatisfactionLevel rendah)",
        "Ketidakseimbangan work-life (RemoteRatio tidak optimal)",
        "Faktor demografis & pengalaman kerja",
    ],
    "Solusi Dipilih": (
        "Burnout Risk Prediction System — model ML untuk klasifikasi "
        "risiko (Rendah/Sedang/Tinggi) + dashboard interaktif Streamlit."
    ),
    "Target": "Accuracy ≥ 85%, AUC-ROC ≥ 0.85, F1 ≥ 0.70",
}

print("\n📋 PROBLEM STATEMENT:")
for k, v in problem_statement.items():
    if isinstance(v, list):
        print(f"\n  ▸ {k}:")
        for item in v:
            print(f"      - {item}")
    else:
        print(f"\n  ▸ {k}:\n      {v}")

print("\n✅ Bagian 1 selesai: Problem Discovery & Analisis Permasalahan")


# =============================================================================
# BAGIAN 2 — DATA WRANGLING
# =============================================================================
print("\n" + "=" * 70)
print("  BAGIAN 2: DATA WRANGLING")
print("=" * 70)

# ── 2a. Gathering Data ────────────────────────────────────────────────────────
print("\n── 2a. GATHERING DATA ──")
print("""
  Sumber Data:
  Dataset "Synthetic Employee Burnout" — dataset sintetis yang dihasilkan
  menggunakan teknik simulasi berbasis distribusi statistik nyata dari
  literatur kesehatan mental kerja. Dataset ini tersedia secara publik
  dan aman untuk digunakan dalam penelitian.

  Relevansi dataset:
  ✓ Mencakup fitur-fitur yang relevan: usia, jam kerja, stres, kepuasan
  ✓ Target variabel jelas: Burnout (0/1)
  ✓ Ukuran dataset cukup: 2.000 baris
  ✓ Tidak ada masalah lisensi untuk penelitian/pendidikan
""")

df = pd.read_csv(DATA_PATH)
print(f"  ✓ Dataset berhasil dimuat dari: {DATA_PATH}")
print(f"  ✓ Ukuran dataset: {df.shape[0]:,} baris × {df.shape[1]} kolom")
print(f"\n  Kolom & Tipe Data:")
print(df.dtypes.to_frame(name="Tipe Data").to_string())
print(f"\n  5 Baris Pertama (Preview):")
print(df.head().to_string(index=False))

# ── 2b. Assessing Data ────────────────────────────────────────────────────────
print("\n── 2b. ASSESSING DATA ──")
print("""
  Pada tahap ini kita mengevaluasi kualitas data sebelum membersihkannya.
  Tiga hal yang dicek: missing values, duplikasi, dan outlier.
""")

# Missing values
missing = df.isnull().sum()
print("  [CHECK 1] Missing Values per Kolom:")
if missing.sum() == 0:
    print("  → Tidak ada missing values! Dataset bersih dari nilai kosong.")
else:
    print(missing[missing > 0].to_string())
    print(f"  → Total missing: {missing.sum()} nilai")

# Duplikasi
dupl = df.duplicated().sum()
print(f"\n  [CHECK 2] Baris Duplikat: {dupl}")
if dupl == 0:
    print("  → Tidak ada baris duplikat. Dataset unik.")
else:
    print(f"  → Ditemukan {dupl} duplikat yang perlu dihapus.")

# Statistik deskriptif
print("\n  [CHECK 3] Statistik Deskriptif:")
print(df.describe().round(2).to_string())

# Distribusi target
print("\n  [CHECK 4] Distribusi Target (Burnout):")
vc = df["Burnout"].value_counts()
total = len(df)
for val, cnt in vc.items():
    label = "Burnout" if val == 1 else "Tidak Burnout"
    print(f"    {label} (={val}): {cnt:,} ({cnt/total*100:.1f}%)")
print(f"""
  ⚠️  PERHATIAN: Dataset tidak seimbang (imbalanced)!
      Hanya {vc.get(1,0)/total*100:.1f}% karyawan yang mengalami burnout.
      Ini wajar secara nyata, tetapi perlu penanganan khusus saat modeling
      (stratified split, class_weight, atau resampling).
""")

# Nilai unik kategorikal
print("  [CHECK 5] Nilai Unik Kolom Kategorikal:")
for col in ["Gender", "JobRole"]:
    print(f"    {col}: {df[col].unique().tolist()}")

# ── 2c. Cleaning Data ─────────────────────────────────────────────────────────
print("\n── 2c. CLEANING DATA ──")
print("""
  Langkah pembersihan data:
  1. Hapus duplikat (jika ada)
  2. Hapus kolom Name (tidak relevan untuk analisis/model)
  3. Imputasi missing values (jika ada)
  4. Tambah kolom RiskLevel (label multi-kelas buatan)
  5. Validasi range nilai tiap kolom
""")

df_clean = df.copy()

# Hapus duplikat
before = len(df_clean)
df_clean = df_clean.drop_duplicates()
removed = before - len(df_clean)
print(f"  → Duplikat dihapus: {removed} baris")

# Hapus kolom Name (identifier, tidak berguna untuk ML)
df_clean = df_clean.drop(columns=["Name"])
print("  → Kolom 'Name' dihapus (hanya identifier, tidak informatif untuk model)")

# Imputasi (untuk antisipasi jika ada di data nyata)
num_cols = df_clean.select_dtypes(include=np.number).columns.tolist()
cat_cols = df_clean.select_dtypes(include="object").columns.tolist()
imputed = 0
for col in num_cols:
    n_miss = df_clean[col].isnull().sum()
    if n_miss > 0:
        df_clean[col] = df_clean[col].fillna(df_clean[col].median())
        print(f"  → Imputasi '{col}' dengan median ({n_miss} nilai)")
        imputed += 1
for col in cat_cols:
    n_miss = df_clean[col].isnull().sum()
    if n_miss > 0:
        df_clean[col] = df_clean[col].fillna(df_clean[col].mode()[0])
        print(f"  → Imputasi '{col}' dengan modus ({n_miss} nilai)")
        imputed += 1
if imputed == 0:
    print("  → Tidak ada missing values yang perlu diimputasi.")

# Validasi range nilai
print("\n  [VALIDASI RANGE NILAI]")
validation_rules = {
    "Age":               (22, 60),
    "Experience":        (0, 40),
    "WorkHoursPerWeek":  (30, 80),
    "RemoteRatio":       (0, 100),
    "SatisfactionLevel": (1.0, 5.0),
    "StressLevel":       (1, 10),
    "Burnout":           (0, 1),
}
all_valid = True
for col, (low, high) in validation_rules.items():
    n_invalid = ((df_clean[col] < low) | (df_clean[col] > high)).sum()
    status = "✓" if n_invalid == 0 else f"⚠️ {n_invalid} nilai di luar range"
    print(f"    {col:<22}: [{low}, {high}]  {status}")
    if n_invalid > 0:
        all_valid = False
if all_valid:
    print("  → Semua nilai dalam range yang valid!")

# Buat kolom RiskLevel (label multi-kelas berdasarkan kombinasi faktor)
def risk_label(row):
    """
    Aturan klasifikasi risiko burnout berdasarkan kombinasi 3 faktor utama:
    stres, jam kerja, dan kepuasan kerja.
    Score ≥ 4 → Tinggi, Score 2-3 → Sedang, Score 0-1 → Rendah
    """
    score = 0
    # Faktor 1: Jam Kerja
    if row["WorkHoursPerWeek"] >= 55:
        score += 2
    elif row["WorkHoursPerWeek"] >= 45:
        score += 1
    # Faktor 2: Stres
    if row["StressLevel"] >= 7:
        score += 2
    elif row["StressLevel"] >= 4:
        score += 1
    # Faktor 3: Kepuasan (rendah = buruk)
    if row["SatisfactionLevel"] <= 2.0:
        score += 2
    elif row["SatisfactionLevel"] <= 3.5:
        score += 1
    # Tentukan label
    if score >= 4:
        return "Tinggi"
    elif score >= 2:
        return "Sedang"
    else:
        return "Rendah"

df_clean["RiskLevel"] = df_clean.apply(risk_label, axis=1)
print("\n  → Kolom 'RiskLevel' berhasil dibuat berdasarkan kombinasi stres, jam kerja, kepuasan")
print("    Distribusi RiskLevel:")
risk_vc = df_clean["RiskLevel"].value_counts()
for lvl in ["Rendah", "Sedang", "Tinggi"]:
    cnt = risk_vc.get(lvl, 0)
    print(f"      {lvl:<8}: {cnt:,} ({cnt/len(df_clean)*100:.1f}%)")

print(f"\n  ✓ Dataset bersih: {df_clean.shape[0]:,} baris × {df_clean.shape[1]} kolom")
print("\n✅ Bagian 2 selesai: Data Wrangling (Gathering → Assessing → Cleaning)")


# =============================================================================
# BAGIAN 3 — DEFINISI BUSINESS QUESTIONS
# =============================================================================
print("\n" + "=" * 70)
print("  BAGIAN 3: DEFINISI BUSINESS QUESTIONS")
print("=" * 70)

print("""
  Business questions dirancang berjenjang: dari pertanyaan umum (deskriptif)
  hingga spesifik (kausalitas & pemodelan). Ini membantu memastikan analisis
  kita terarah dan dapat menjawab kebutuhan stakeholder secara menyeluruh.
""")

business_questions = [
    ("BQ1", "Umum",        "Seberapa besar proporsi karyawan yang mengalami burnout?"),
    ("BQ2", "Umum",        "Bagaimana distribusi burnout di antara berbagai peran pekerjaan (JobRole)?"),
    ("BQ3", "Umum",        "Apakah ada perbedaan tingkat burnout antara karyawan laki-laki dan perempuan?"),
    ("BQ4", "Menengah",    "Apakah beban kerja (WorkHoursPerWeek) berkorelasi signifikan dengan burnout?"),
    ("BQ5", "Menengah",    "Bagaimana kombinasi stres tinggi + jam kerja panjang mempengaruhi risiko burnout?"),
    ("BQ6", "Spesifik",    "Faktor apa yang paling berpengaruh terhadap prediksi risiko burnout karyawan?"),
    ("BQ7", "Spesifik",    "Apakah kepuasan kerja rendah secara konsisten berkorelasi dengan stres & burnout tinggi?"),
]

print("  Business Questions yang akan dijawab:")
print(f"  {'Kode':<5} {'Level':<10} {'Pertanyaan'}")
print("  " + "-" * 65)
for code, level, q in business_questions:
    print(f"  {code:<5} {level:<10} {q}")

# Jawab ringkas setiap BQ dari data
print("\n── Jawaban Ringkas (Preview) ──")

br_overall = df_clean["Burnout"].mean() * 100
print(f"\n  [BQ1] Proporsi burnout keseluruhan: {br_overall:.1f}%")
print(f"        → Dari {len(df_clean):,} karyawan, {int(df_clean['Burnout'].sum())} mengalami burnout.")

print("\n  [BQ2] Burnout rate per JobRole:")
br_role = (df_clean.groupby("JobRole")["Burnout"].mean() * 100).sort_values(ascending=False)
for role, rate in br_role.items():
    print(f"        {role:<12}: {rate:.1f}%")

print("\n  [BQ3] Burnout rate per Gender:")
br_gender = df_clean.groupby("Gender")["Burnout"].mean() * 100
for g, rate in br_gender.items():
    print(f"        {g:<8}: {rate:.1f}%")

corr_hours = df_clean["WorkHoursPerWeek"].corr(df_clean["Burnout"])
print(f"\n  [BQ4] Korelasi WorkHoursPerWeek ↔ Burnout: {corr_hours:.4f}")
print(f"        → Korelasi {'positif' if corr_hours > 0 else 'negatif'} "
      f"({'lemah' if abs(corr_hours) < 0.3 else 'sedang' if abs(corr_hours) < 0.6 else 'kuat'})")

high_risk_burnout = df_clean[
    (df_clean["StressLevel"] >= 7) & (df_clean["WorkHoursPerWeek"] >= 50)
]["Burnout"].mean() * 100
normal_burnout = df_clean[
    (df_clean["StressLevel"] < 7) & (df_clean["WorkHoursPerWeek"] < 45)
]["Burnout"].mean() * 100
print(f"\n  [BQ5] Burnout rate (Stres≥7 & Jam≥50): {high_risk_burnout:.1f}%")
print(f"        Burnout rate (Stres<7 & Jam<45):  {normal_burnout:.1f}%")
print(f"        → Perbedaan: {high_risk_burnout - normal_burnout:.1f} percentage point")

corr_sat = df_clean["SatisfactionLevel"].corr(df_clean["Burnout"])
corr_stress = df_clean["StressLevel"].corr(df_clean["Burnout"])
print(f"\n  [BQ7] Korelasi SatisfactionLevel ↔ Burnout: {corr_sat:.4f}")
print(f"        Korelasi StressLevel ↔ Burnout:        {corr_stress:.4f}")

print("\n✅ Bagian 3 selesai: Business Questions didefinisikan & dijabarkan")


# =============================================================================
# BAGIAN 4 — EXPLORATORY DATA ANALYSIS (EDA)
# =============================================================================
print("\n" + "=" * 70)
print("  BAGIAN 4: EXPLORATORY DATA ANALYSIS (EDA)")
print("=" * 70)

print("""
  EDA bertujuan memahami distribusi, pola, dan hubungan antar variabel
  sebelum membangun model. Output EDA menjadi dasar untuk menentukan
  fitur penting dan strategi modeling.
""")

# 4a. Korelasi matrix
print("── 4a. KORELASI MATRIX ──")
num_df = df_clean.select_dtypes(include=np.number)
corr_matrix = num_df.corr()
print("\n  Korelasi antar fitur numerik:")
print(corr_matrix.round(3).to_string())

print("\n  Fitur dengan korelasi tertinggi terhadap Burnout:")
corr_burnout = corr_matrix["Burnout"].drop("Burnout").sort_values(key=abs, ascending=False)
for feat, val in corr_burnout.items():
    direction = "↑" if val > 0 else "↓"
    strength  = "Kuat" if abs(val) >= 0.4 else "Sedang" if abs(val) >= 0.2 else "Lemah"
    print(f"    {feat:<22}: {val:+.4f}  {direction}  ({strength})")

# 4b. Outlier detection (IQR)
print("\n── 4b. DETEKSI OUTLIER (Metode IQR) ──")
print("""
  Metode IQR (Interquartile Range): nilai dianggap outlier jika berada
  di luar rentang [Q1 - 1.5*IQR, Q3 + 1.5*IQR].
""")
outlier_cols = ["Age", "WorkHoursPerWeek", "StressLevel",
                "SatisfactionLevel", "Experience", "RemoteRatio"]
for col in outlier_cols:
    Q1  = df_clean[col].quantile(0.25)
    Q3  = df_clean[col].quantile(0.75)
    IQR = Q3 - Q1
    lo, hi = Q1 - 1.5*IQR, Q3 + 1.5*IQR
    n_out = ((df_clean[col] < lo) | (df_clean[col] > hi)).sum()
    pct   = n_out / len(df_clean) * 100
    print(f"    {col:<22}: {n_out:3} outlier ({pct:.1f}%)  |  batas [{lo:.1f}, {hi:.1f}]")

# 4c. Perbandingan statistik Burnout vs Tidak Burnout
print("\n── 4c. STATISTIK PERBANDINGAN: BURNOUT vs TIDAK BURNOUT ──")
print("""
  Kita bandingkan rata-rata fitur numerik antara kelompok Burnout=1
  dan Burnout=0 untuk mendapatkan insight awal tentang perbedaan pola.
""")
group_stats = df_clean.groupby("Burnout")[
    ["WorkHoursPerWeek", "StressLevel", "SatisfactionLevel", "Age", "RemoteRatio"]
].agg(["mean", "std"]).round(2)
print(group_stats.to_string())

print("\n  Interpretasi:")
for col in ["WorkHoursPerWeek", "StressLevel", "SatisfactionLevel"]:
    mean_0 = df_clean[df_clean["Burnout"]==0][col].mean()
    mean_1 = df_clean[df_clean["Burnout"]==1][col].mean()
    diff   = mean_1 - mean_0
    direction = "lebih tinggi" if diff > 0 else "lebih rendah"
    print(f"    {col}: karyawan burnout rata-rata {abs(diff):.2f} poin {direction}")

# 4d. Skewness & Kurtosis
print("\n── 4d. SKEWNESS & KURTOSIS ──")
print("""
  Skewness: mengukur asimetri distribusi (0 = simetris)
  Kurtosis: mengukur ketajaman puncak distribusi (0 = normal)
""")
for col in ["WorkHoursPerWeek", "StressLevel", "SatisfactionLevel",
            "Age", "Experience"]:
    skew = df_clean[col].skew()
    kurt = df_clean[col].kurtosis()
    print(f"    {col:<22}: skew={skew:+.3f}  kurtosis={kurt:+.3f}")

print("\n✅ Bagian 4 selesai: EDA Komprehensif")


# =============================================================================
# BAGIAN 5 — VISUALISASI & EXPLANATORY ANALYSIS
# =============================================================================
print("\n" + "=" * 70)
print("  BAGIAN 5: VISUALISASI & EXPLANATORY ANALYSIS")
print("=" * 70)

print("""
  Setiap visualisasi dipilih berdasarkan tujuan analitisnya:
  - Histogram + KDE → melihat distribusi data & perbedaan antar grup
  - Heatmap korelasi → memahami hubungan linear antar fitur secara sekaligus
  - Bar chart → membandingkan nilai antar kategori yang mudah dibaca
  - Boxplot → melihat median, IQR, dan outlier secara ringkas
  - Pie chart → proporsi komposisi total
  - Scatter plot → hubungan dua variabel + pewarnaan grup ketiga
""")

# ── Figur 1: Distribusi Fitur Utama ──────────────────────────────────────────
print("  Membuat Fig 1: Distribusi Fitur Utama...")
print("""
  [Fig 1 — PILIHAN VISUALISASI: Histogram + KDE]
  Alasan: Histogram memperlihatkan frekuensi nilai tiap fitur, sementara
  KDE (Kernel Density Estimate) memperhalus kurva distribusinya. Dengan
  pewarnaan berdasarkan status Burnout, kita bisa langsung melihat apakah
  ada perbedaan distribusi antara karyawan yang burnout dan tidak.
""")

features_plot = ["Age", "WorkHoursPerWeek", "StressLevel",
                 "SatisfactionLevel", "Experience", "RemoteRatio"]
fig1, axes = plt.subplots(2, 3, figsize=(18, 10))
fig1.suptitle(
    "Distribusi Fitur Utama Dataset Burnout Karyawan\n"
    "(Biru = Tidak Burnout, Merah = Burnout)",
    fontsize=15, fontweight="bold", y=1.01
)
for ax, col in zip(axes.flat, features_plot):
    sns.histplot(
        data=df_clean, x=col, hue="Burnout", bins=20, kde=True, ax=ax,
        palette={0: COLOR_NO, 1: COLOR_YES}
    )
    ax.set_title(f"Distribusi {col}", fontsize=12, fontweight="bold")
    ax.set_xlabel(col, fontsize=10)
    leg = ax.get_legend()
    if leg:
        leg.set_title("Status")
        for t, l in zip(leg.texts, ["Tidak Burnout", "Burnout"]):
            t.set_text(l)
plt.tight_layout()
fig1.savefig(f"{OUTPUT_DIR}/fig1_distribusi_fitur.png", dpi=130, bbox_inches="tight")
plt.close()
print("  ✓ fig1_distribusi_fitur.png tersimpan")

# ── Figur 2: Heatmap Korelasi ─────────────────────────────────────────────────
print("\n  Membuat Fig 2: Heatmap Korelasi...")
print("""
  [Fig 2 — PILIHAN VISUALISASI: Heatmap Korelasi]
  Alasan: Heatmap memungkinkan pembaca melihat korelasi SEMUA pasang fitur
  sekaligus dalam satu tampilan. Warna merah = korelasi positif kuat,
  biru = negatif kuat, putih = tidak ada korelasi.
  Sangat efisien untuk mengidentifikasi multikolinearitas antar fitur.
""")
fig2, ax = plt.subplots(figsize=(11, 8))
mask = np.triu(np.ones_like(corr_matrix, dtype=bool))
sns.heatmap(
    corr_matrix, mask=mask, annot=True, fmt=".2f",
    cmap="coolwarm", center=0, ax=ax,
    linewidths=0.5, annot_kws={"size": 9}
)
ax.set_title("Heatmap Korelasi Antar Fitur Numerik", fontsize=14, fontweight="bold")
plt.tight_layout()
fig2.savefig(f"{OUTPUT_DIR}/fig2_heatmap_korelasi.png", dpi=130, bbox_inches="tight")
plt.close()
print("  ✓ fig2_heatmap_korelasi.png tersimpan")

# ── Figur 3: Burnout per Kategori (BQ2, BQ3) ──────────────────────────────────
print("\n  Membuat Fig 3: Burnout Rate per Kategori...")
print("""
  [Fig 3 — PILIHAN VISUALISASI: Bar Chart Horizontal & Vertikal]
  Alasan: Bar chart ideal untuk membandingkan nilai antar kategori.
  Horizontal bar untuk JobRole (label panjang lebih mudah dibaca),
  vertikal untuk Gender (hanya 2 kategori, lebih kompak).
  Menjawab BQ2 (per JobRole) dan BQ3 (per Gender).
""")
fig3, axes = plt.subplots(1, 2, figsize=(16, 6))
fig3.suptitle("Burnout Rate per Kategori Karyawan (BQ2 & BQ3)",
              fontsize=14, fontweight="bold")

# BQ2 per JobRole
br_role_s = br_role.sort_values()
colors3a  = [PALETTE[i % len(PALETTE)] for i in range(len(br_role_s))]
bars3a = axes[0].barh(br_role_s.index, br_role_s.values, color=colors3a)
axes[0].set_xlabel("Burnout Rate (%)", fontsize=11)
axes[0].set_title("Burnout Rate per JobRole", fontsize=12, fontweight="bold")
for bar, val in zip(bars3a, br_role_s.values):
    axes[0].text(val + 0.1, bar.get_y() + bar.get_height()/2,
                 f"{val:.1f}%", va="center", fontsize=10)

# BQ3 per Gender
colors3b = [COLOR_NO, COLOR_YES][:len(br_gender)]
bars3b = axes[1].bar(br_gender.index, br_gender.values,
                     color=colors3b, edgecolor="black", width=0.5)
axes[1].set_ylabel("Burnout Rate (%)", fontsize=11)
axes[1].set_title("Burnout Rate per Gender", fontsize=12, fontweight="bold")
for bar, (g, val) in zip(bars3b, br_gender.items()):
    axes[1].text(bar.get_x() + bar.get_width()/2, val + 0.2,
                 f"{val:.1f}%", ha="center", fontsize=12, fontweight="bold")

plt.tight_layout()
fig3.savefig(f"{OUTPUT_DIR}/fig3_burnout_kategori.png", dpi=130, bbox_inches="tight")
plt.close()
print("  ✓ fig3_burnout_kategori.png tersimpan")

# ── Figur 4: Boxplot Perbandingan (BQ4, BQ7) ──────────────────────────────────
print("\n  Membuat Fig 4: Boxplot Perbandingan...")
print("""
  [Fig 4 — PILIHAN VISUALISASI: Boxplot]
  Alasan: Boxplot dalam satu grafik menampilkan median, Q1, Q3, dan outlier.
  Sangat baik untuk membandingkan distribusi dua grup sekaligus.
  Di sini kita bandingkan kelompok Burnout=0 vs Burnout=1 untuk melihat
  apakah ada perbedaan yang jelas pada fitur kunci. (Menjawab BQ4 & BQ7)
""")
df_box = df_clean.copy()
df_box["Status"] = df_box["Burnout"].map({0: "Tidak Burnout", 1: "Burnout"})

fig4, axes = plt.subplots(1, 3, figsize=(18, 6))
fig4.suptitle("Perbandingan Distribusi Fitur: Burnout vs Tidak Burnout (BQ4 & BQ7)",
              fontsize=14, fontweight="bold")

for ax, (col, title) in zip(axes, [
    ("WorkHoursPerWeek",  "Jam Kerja per Minggu"),
    ("StressLevel",        "Tingkat Stres (1–10)"),
    ("SatisfactionLevel",  "Kepuasan Kerja (1–5)"),
]):
    sns.boxplot(
        data=df_box, x="Status", y=col,
        palette={"Tidak Burnout": COLOR_NO, "Burnout": COLOR_YES}, ax=ax
    )
    ax.set_title(title, fontsize=12, fontweight="bold")
    ax.set_xlabel("")

    # Tambahkan annotation nilai median
    for i, grp in enumerate(["Tidak Burnout", "Burnout"]):
        med = df_box[df_box["Status"] == grp][col].median()
        ax.text(i, med, f" Med={med:.1f}", va="center",
                fontsize=9, color="white", fontweight="bold",
                bbox=dict(boxstyle="round,pad=0.2", facecolor="gray", alpha=0.7))

plt.tight_layout()
fig4.savefig(f"{OUTPUT_DIR}/fig4_boxplot_burnout.png", dpi=130, bbox_inches="tight")
plt.close()
print("  ✓ fig4_boxplot_burnout.png tersimpan")

# ── Figur 5: Distribusi Risk Level ────────────────────────────────────────────
print("\n  Membuat Fig 5: Distribusi Risk Level...")
print("""
  [Fig 5 — PILIHAN VISUALISASI: Pie Chart + Bar Chart]
  Alasan: Pie chart menunjukkan komposisi proporsi secara intuitif,
  sedangkan bar chart menambahkan nilai absolut yang lebih presisi.
  Kombinasi keduanya memberikan gambaran lengkap tentang distribusi
  tingkat risiko burnout di antara karyawan. (Menjawab BQ1 & BQ5)
""")
risk_counts = df_clean["RiskLevel"].value_counts()
order_risk  = ["Rendah", "Sedang", "Tinggi"]
colors_risk = ["#4CAF50", "#FF9800", "#F44336"]

fig5, axes = plt.subplots(1, 2, figsize=(14, 6))
fig5.suptitle("Distribusi Tingkat Risiko Burnout Karyawan (BQ1 & BQ5)",
              fontsize=14, fontweight="bold")

vals_risk = [risk_counts.get(r, 0) for r in order_risk]
wedges, texts, autotexts = axes[0].pie(
    vals_risk, labels=order_risk, colors=colors_risk,
    autopct="%1.1f%%", startangle=140,
    textprops={"fontsize": 12}, pctdistance=0.85,
    wedgeprops={"edgecolor": "white", "linewidth": 2}
)
for at in autotexts:
    at.set_fontweight("bold")
axes[0].set_title("Proporsi Risk Level", fontsize=12, fontweight="bold")

bars5 = axes[1].bar(order_risk, vals_risk, color=colors_risk, edgecolor="black")
axes[1].set_ylabel("Jumlah Karyawan", fontsize=11)
axes[1].set_title("Jumlah Karyawan per Risk Level", fontsize=12, fontweight="bold")
for bar, val in zip(bars5, vals_risk):
    axes[1].text(bar.get_x() + bar.get_width()/2, val + 10,
                 f"{val:,}\n({val/len(df_clean)*100:.1f}%)",
                 ha="center", fontsize=10, fontweight="bold")

plt.tight_layout()
fig5.savefig(f"{OUTPUT_DIR}/fig5_risk_level.png", dpi=130, bbox_inches="tight")
plt.close()
print("  ✓ fig5_risk_level.png tersimpan")

# ── Figur 6: Scatter Plot WorkHours vs Stress (BQ5) ──────────────────────────
print("\n  Membuat Fig 6: Scatter Plot WorkHours vs Stress...")
print("""
  [Fig 6 — PILIHAN VISUALISASI: Scatter Plot]
  Alasan: Scatter plot memperlihatkan hubungan dua variabel kontinyu
  secara bersamaan. Dengan mewarnai titik berdasarkan status Burnout,
  kita bisa melihat apakah karyawan burnout cenderung mengelompok
  di area jam kerja tinggi + stres tinggi. (Menjawab BQ5)
""")
fig6, axes = plt.subplots(1, 2, figsize=(16, 6))
fig6.suptitle("Hubungan Jam Kerja, Stres & Burnout (BQ5)",
              fontsize=14, fontweight="bold")

# Scatter utama
colors_scatter = df_clean["Burnout"].map({0: COLOR_NO, 1: COLOR_YES})
axes[0].scatter(df_clean["WorkHoursPerWeek"], df_clean["StressLevel"],
                c=colors_scatter, alpha=0.45, s=25, edgecolors="none")
axes[0].set_xlabel("Jam Kerja per Minggu", fontsize=11)
axes[0].set_ylabel("Tingkat Stres", fontsize=11)
axes[0].set_title("WorkHoursPerWeek vs StressLevel", fontsize=12, fontweight="bold")
legend_elem = [
    mpatches.Patch(color=COLOR_NO,  label="Tidak Burnout"),
    mpatches.Patch(color=COLOR_YES, label="Burnout"),
]
axes[0].legend(handles=legend_elem, fontsize=10)
# Garis batas high-risk
axes[0].axvline(50, color="gray", linestyle="--", linewidth=1, alpha=0.7, label="Batas 50 jam")
axes[0].axhline(7,  color="gray", linestyle=":",  linewidth=1, alpha=0.7, label="Batas Stres 7")

# Scatter Satisfaction vs Stress
axes[1].scatter(df_clean["SatisfactionLevel"], df_clean["StressLevel"],
                c=colors_scatter, alpha=0.45, s=25, edgecolors="none")
axes[1].set_xlabel("Kepuasan Kerja", fontsize=11)
axes[1].set_ylabel("Tingkat Stres", fontsize=11)
axes[1].set_title("SatisfactionLevel vs StressLevel", fontsize=12, fontweight="bold")
axes[1].legend(handles=legend_elem, fontsize=10)

plt.tight_layout()
fig6.savefig(f"{OUTPUT_DIR}/fig6_scatter_burnout.png", dpi=130, bbox_inches="tight")
plt.close()
print("  ✓ fig6_scatter_burnout.png tersimpan")

# ── Figur 7: Explanatory Analysis — Menjawab BQ secara komprehensif ──────────
print("\n  Membuat Fig 7: Explanatory Analysis (Ringkasan BQ)...")
print("""
  [Fig 7 — PILIHAN VISUALISASI: Multi-panel Explanatory]
  Alasan: Satu gambar besar yang merangkum temuan utama dari semua BQ.
  Ideal untuk presentasi kepada stakeholder non-teknis yang perlu
  melihat gambaran besar tanpa harus melihat setiap grafik satu per satu.
""")
fig7, axes = plt.subplots(2, 3, figsize=(20, 12))
fig7.suptitle(
    "Ringkasan Explanatory Analysis — Burnout Risk Prediction System\n"
    "Jawaban atas 7 Business Questions",
    fontsize=15, fontweight="bold", y=1.01
)

# Panel A: BQ1 — Proporsi Burnout Keseluruhan
ax = axes[0, 0]
counts_bq1 = [int(df_clean["Burnout"].sum()), int((df_clean["Burnout"]==0).sum())]
labels_bq1 = [f"Burnout\n({br_overall:.1f}%)", f"Tidak Burnout\n({100-br_overall:.1f}%)"]
ax.pie(counts_bq1, labels=labels_bq1, colors=[COLOR_YES, COLOR_NO],
       startangle=90, autopct="%1.1f%%", pctdistance=0.7,
       wedgeprops={"edgecolor": "white", "linewidth": 2})
ax.set_title("BQ1: Proporsi Karyawan Burnout", fontsize=11, fontweight="bold")

# Panel B: BQ2 — Burnout rate per JobRole
ax = axes[0, 1]
br_role_sorted = br_role.sort_values(ascending=True)
colors_b = sns.color_palette("husl", len(br_role_sorted))
ax.barh(br_role_sorted.index, br_role_sorted.values, color=colors_b)
ax.set_xlabel("Burnout Rate (%)", fontsize=10)
ax.set_title("BQ2: Burnout Rate per JobRole", fontsize=11, fontweight="bold")
for i, (role, val) in enumerate(br_role_sorted.items()):
    ax.text(val + 0.05, i, f"{val:.1f}%", va="center", fontsize=9)

# Panel C: BQ3 — Burnout per Gender
ax = axes[0, 2]
genders = br_gender.index.tolist()
rates_g = br_gender.values.tolist()
bars_g  = ax.bar(genders, rates_g, color=[COLOR_NO, COLOR_YES][:len(genders)],
                 edgecolor="black", width=0.5)
ax.set_ylabel("Burnout Rate (%)", fontsize=10)
ax.set_title("BQ3: Burnout Rate per Gender", fontsize=11, fontweight="bold")
for bar, val in zip(bars_g, rates_g):
    ax.text(bar.get_x() + bar.get_width()/2, val + 0.1,
            f"{val:.1f}%", ha="center", fontsize=11, fontweight="bold")

# Panel D: BQ4 — WorkHours vs Burnout (grouped bar)
ax = axes[1, 0]
bins_wh = [0, 40, 50, 100]
labels_wh = ["<40 jam", "40-50 jam", ">50 jam"]
df_clean["WorkGroup"] = pd.cut(df_clean["WorkHoursPerWeek"], bins=bins_wh, labels=labels_wh)
br_work = df_clean.groupby("WorkGroup", observed=True)["Burnout"].mean() * 100
bars_d = ax.bar(br_work.index, br_work.values,
                color=[PALETTE[0], PALETTE[3], PALETTE[1]], edgecolor="black")
ax.set_ylabel("Burnout Rate (%)", fontsize=10)
ax.set_title("BQ4: Burnout Rate per Kelompok Jam Kerja", fontsize=11, fontweight="bold")
for bar, val in zip(bars_d, br_work.values):
    ax.text(bar.get_x() + bar.get_width()/2, val + 0.1,
            f"{val:.1f}%", ha="center", fontsize=10, fontweight="bold")
df_clean = df_clean.drop(columns=["WorkGroup"])

# Panel E: BQ6 — Korelasi fitur terhadap Burnout
ax = axes[1, 1]
corr_sorted = corr_burnout.sort_values()
colors_e = [COLOR_YES if v > 0 else COLOR_NO for v in corr_sorted.values]
ax.barh(corr_sorted.index, corr_sorted.values, color=colors_e)
ax.axvline(0, color="black", linewidth=0.8)
ax.set_xlabel("Pearson Correlation", fontsize=10)
ax.set_title("BQ6: Korelasi Fitur terhadap Burnout", fontsize=11, fontweight="bold")
for i, (feat, val) in enumerate(corr_sorted.items()):
    ax.text(val + 0.002 if val >= 0 else val - 0.002, i,
            f"{val:+.3f}", va="center",
            ha="left" if val >= 0 else "right", fontsize=8)

# Panel F: BQ7 — Satisfaktion vs Stress (hexbin density)
ax = axes[1, 2]
hb = ax.hexbin(df_clean["SatisfactionLevel"], df_clean["StressLevel"],
               C=df_clean["Burnout"], gridsize=15,
               cmap="RdYlGn_r", reduce_C_function=np.mean)
fig7.colorbar(hb, ax=ax, label="Rata-rata Burnout Rate")
ax.set_xlabel("Kepuasan Kerja", fontsize=10)
ax.set_ylabel("Tingkat Stres", fontsize=10)
ax.set_title("BQ7: Kepuasan vs Stres → Burnout Rate\n(gelap = burnout tinggi)",
             fontsize=11, fontweight="bold")

plt.tight_layout()
fig7.savefig(f"{OUTPUT_DIR}/fig7_explanatory.png", dpi=130, bbox_inches="tight")
plt.close()
print("  ✓ fig7_explanatory.png tersimpan")

print("\n✅ Bagian 5 selesai: Visualisasi & Explanatory Analysis (7 gambar)")


# =============================================================================
# BAGIAN 6 — FEATURE ENGINEERING & DATA DICTIONARY
# =============================================================================
print("\n" + "=" * 70)
print("  BAGIAN 6: FEATURE ENGINEERING & DATA DICTIONARY")
print("=" * 70)

print("""
  Feature Engineering bertujuan menciptakan fitur-fitur baru yang lebih
  informatif dari fitur yang sudah ada. Fitur rekayasa yang baik dapat
  meningkatkan performa model secara signifikan karena:
  1. Menangkap interaksi antar fitur yang tidak terlihat secara linear
  2. Mengurangi noise dengan menggabungkan sinyal dari beberapa fitur
  3. Memberikan representasi domain knowledge dalam bentuk numerik
""")

df_model = df_clean.copy()

# Encoding kolom kategorikal
print("── ENCODING KATEGORIKAL ──")
le_gender = LabelEncoder()
le_role   = LabelEncoder()
df_model["Gender_enc"]  = le_gender.fit_transform(df_model["Gender"])
df_model["JobRole_enc"] = le_role.fit_transform(df_model["JobRole"])

print(f"  Gender encoding  : {dict(zip(le_gender.classes_, le_gender.transform(le_gender.classes_)))}")
print(f"  JobRole encoding : {dict(zip(le_role.classes_, le_role.transform(le_role.classes_)))}")
print("""
  Metode encoding yang dipilih: Label Encoding (bukan One-Hot)
  Alasan: Model tree-based (Random Forest, Gradient Boosting) dapat bekerja
  baik dengan label encoding. One-Hot Encoding akan menambah dimensi fitur
  secara tidak perlu untuk dataset ukuran ini.
""")

# Fitur Rekayasa
print("── FITUR REKAYASA ──")

# Fitur 1: StressWorkRatio
df_model["StressWorkRatio"] = df_model["StressLevel"] / (df_model["WorkHoursPerWeek"] + 1)
print("  ✓ StressWorkRatio = StressLevel / (WorkHoursPerWeek + 1)")
print("    → Mengukur intensitas stres per unit waktu kerja.")
print("      Karyawan yang stres tinggi dalam jam sedikit vs banyak berbeda risikonya.")

# Fitur 2: WorkLifeScore
df_model["WorkLifeScore"] = df_model["SatisfactionLevel"] * (1 - df_model["RemoteRatio"] / 100)
print("\n  ✓ WorkLifeScore = SatisfactionLevel * (1 - RemoteRatio/100)")
print("    → Mengukur keseimbangan kepuasan kerja dengan kehadiran fisik.")
print("      Karyawan dengan kepuasan rendah + sedikit fleksibilitas remote lebih rentan.")

# Fitur 3: HighRiskFlag
df_model["HighRiskFlag"] = (
    (df_model["StressLevel"] >= 7) & (df_model["WorkHoursPerWeek"] >= 50)
).astype(int)
print("\n  ✓ HighRiskFlag = 1 jika StressLevel ≥ 7 DAN WorkHoursPerWeek ≥ 50")
print("    → Flag biner yang menandai karyawan dalam kondisi 'double high-risk'.")
print(f"      Jumlah karyawan HighRiskFlag=1: {df_model['HighRiskFlag'].sum():,} ({df_model['HighRiskFlag'].mean()*100:.1f}%)")

# Fitur 4: SeniorEmployee
df_model["SeniorEmployee"] = (df_model["Experience"] >= 10).astype(int)
print("\n  ✓ SeniorEmployee = 1 jika Experience ≥ 10 tahun")
print("    → Karyawan senior mungkin memiliki pola burnout berbeda (coping mechanism lebih baik)")
print(f"      Jumlah SeniorEmployee=1: {df_model['SeniorEmployee'].sum():,} ({df_model['SeniorEmployee'].mean()*100:.1f}%)")

# Fitur 5: StressCategory
df_model["StressCategory"] = pd.cut(
    df_model["StressLevel"],
    bins=[0, 3, 6, 10],
    labels=[0, 1, 2]
).astype(int)
print("\n  ✓ StressCategory = 0 (Rendah: 1-3), 1 (Sedang: 4-6), 2 (Tinggi: 7-10)")
print("    → Mengkategorikan stres menjadi 3 kelas untuk menangkap efek non-linear.")

# Fitur 6: SatisfactionInverse
df_model["SatisfactionInverse"] = 5.0 - df_model["SatisfactionLevel"]
print("\n  ✓ SatisfactionInverse = 5 - SatisfactionLevel")
print("    → Mengubah kepuasan menjadi 'ketidakpuasan' agar berkorelasi positif dgn burnout.")

# Pilih fitur akhir untuk model
FEATURES = [
    "Age", "Experience", "WorkHoursPerWeek", "RemoteRatio",
    "SatisfactionLevel", "StressLevel",
    "Gender_enc", "JobRole_enc",
    "StressWorkRatio", "WorkLifeScore",
    "HighRiskFlag", "SeniorEmployee",
    "StressCategory", "SatisfactionInverse"
]
TARGET = "Burnout"

print(f"\n  Total fitur yang digunakan untuk model: {len(FEATURES)}")
print("  Daftar fitur:")
for i, f in enumerate(FEATURES, 1):
    print(f"    {i:2}. {f}")

# Data Dictionary
print("\n── DATA DICTIONARY ──")
data_dict_rows = [
    # Original features
    ("Age",                "int",                   "Original", "Usia karyawan dalam tahun (22–60)"),
    ("Gender",             "str (Male/Female)",      "Original", "Jenis kelamin karyawan"),
    ("JobRole",            "str",                    "Original", "Posisi jabatan: Analyst/Engineer/HR/Manager/Sales"),
    ("Experience",         "int",                    "Original", "Lama pengalaman kerja dalam tahun (0–39)"),
    ("WorkHoursPerWeek",   "int",                    "Original", "Rata-rata jam kerja per minggu"),
    ("RemoteRatio",        "int (%)",                "Original", "Persentase waktu kerja remote (0–100)"),
    ("SatisfactionLevel",  "float (1.0–5.0)",        "Original", "Skor kepuasan kerja (1=sangat tidak puas, 5=sangat puas)"),
    ("StressLevel",        "int (1–10)",             "Original", "Tingkat stres kerja (1=sangat rendah, 10=sangat tinggi)"),
    ("Burnout",            "int (0/1)",              "Target",   "Label target: 0=Tidak Burnout, 1=Burnout"),
    # Engineered features
    ("RiskLevel",          "str (Rendah/Sedang/Tinggi)", "Rekayasa", "Klasifikasi risiko multi-kelas berbasis aturan skor"),
    ("Gender_enc",         "int (0/1)",             "Rekayasa", "Encoding Label: Female=0, Male=1"),
    ("JobRole_enc",        "int (0–4)",             "Rekayasa", "Encoding Label untuk JobRole (0–4)"),
    ("StressWorkRatio",    "float",                  "Rekayasa", "StressLevel / (WorkHoursPerWeek+1): intensitas stres per jam kerja"),
    ("WorkLifeScore",      "float",                  "Rekayasa", "SatisfactionLevel × (1 – RemoteRatio/100): skor keseimbangan kerja-hidup"),
    ("HighRiskFlag",       "int (0/1)",              "Rekayasa", "1 jika StressLevel≥7 AND WorkHoursPerWeek≥50"),
    ("SeniorEmployee",     "int (0/1)",              "Rekayasa", "1 jika Experience≥10 tahun"),
    ("StressCategory",     "int (0/1/2)",            "Rekayasa", "Kategori stres: 0=Rendah, 1=Sedang, 2=Tinggi"),
    ("SatisfactionInverse","float",                  "Rekayasa", "5 - SatisfactionLevel: mengukur ketidakpuasan kerja"),
]

data_dict = pd.DataFrame(data_dict_rows,
    columns=["Kolom", "Tipe", "Jenis", "Deskripsi"])
print(data_dict.to_string(index=False))
data_dict.to_csv(f"{OUTPUT_DIR}/data_dictionary.csv", index=False)
print("\n  ✓ data_dictionary.csv tersimpan")

print("\n✅ Bagian 6 selesai: Feature Engineering & Data Dictionary")


# =============================================================================
# BAGIAN 7 — PERSIAPAN DATA UNTUK MODEL
# =============================================================================
print("\n" + "=" * 70)
print("  BAGIAN 7: PERSIAPAN DATA UNTUK MODEL")
print("=" * 70)

print("""
  Tahap ini mempersiapkan dataset agar siap diproses oleh model ML:
  1. Memisahkan fitur (X) dan target (y)
  2. Normalisasi/Scaling fitur numerik dengan StandardScaler
  3. Membagi data menjadi train set (80%) dan test set (20%)
     menggunakan stratified split untuk mempertahankan proporsi kelas
""")

X = df_model[FEATURES].copy()
y = df_model[TARGET].copy()

print(f"  Ukuran X (fitur): {X.shape}")
print(f"  Ukuran y (target): {y.shape}")
print(f"\n  Distribusi target dalam dataset penuh:")
for val in [0, 1]:
    cnt = (y == val).sum()
    print(f"    Burnout={val}: {cnt:,} ({cnt/len(y)*100:.1f}%)")

# Scaling
scaler   = StandardScaler()
X_scaled = scaler.fit_transform(X)
X_scaled_df = pd.DataFrame(X_scaled, columns=FEATURES)

print(f"\n  Scaling menggunakan StandardScaler:")
print("  → Setiap fitur akan memiliki mean=0 dan std=1")
print("  → Penting untuk Logistic Regression & model berbasis jarak")
print("  → Model tree-based (RF, GB) tidak sensitif terhadap scaling,")
print("    namun scaling dilakukan untuk konsistensi pipeline")

# Train-Test Split (Stratified)
X_train, X_test, y_train, y_test = train_test_split(
    X_scaled_df, y, test_size=0.2, random_state=42, stratify=y
)

print(f"\n  Pembagian data (stratified 80/20):")
print(f"    Train: {len(X_train):,} baris ({len(X_train)/len(X)*100:.0f}%)")
print(f"    Test : {len(X_test):,} baris  ({len(X_test)/len(X)*100:.0f}%)")
print(f"\n  Distribusi target di TRAIN set:")
for val in [0, 1]:
    cnt = (y_train == val).sum()
    print(f"    Burnout={val}: {cnt:,} ({cnt/len(y_train)*100:.1f}%)")
print(f"\n  Distribusi target di TEST set:")
for val in [0, 1]:
    cnt = (y_test == val).sum()
    print(f"    Burnout={val}: {cnt:,} ({cnt/len(y_test)*100:.1f}%)")
print("  → Stratified split memastikan proporsi kelas sama di train dan test ✓")

# Build & evaluate models
print("\n── MEMBANGUN DAN MENGEVALUASI MODEL ──")
print("""
  Empat model dievaluasi menggunakan 5-fold Stratified Cross Validation:
  1. Logistic Regression  — model linear sederhana, interpretatif
  2. Decision Tree         — model berbasis aturan, mudah divisualisasikan
  3. Random Forest         — ensemble trees, robust terhadap overfitting
  4. Gradient Boosting     — boosting sequential, umumnya performa terbaik
""")

models = {
    "Logistic Regression": LogisticRegression(
        max_iter=1000, random_state=42, class_weight="balanced"
    ),
    "Decision Tree": DecisionTreeClassifier(
        max_depth=5, random_state=42, class_weight="balanced"
    ),
    "Random Forest": RandomForestClassifier(
        n_estimators=100, random_state=42,
        class_weight="balanced", n_jobs=-1
    ),
    "Gradient Boosting": GradientBoostingClassifier(
        n_estimators=100, random_state=42
    ),
}

cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
results = {}

for name, model in models.items():
    model.fit(X_train, y_train)
    y_pred  = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]
    cv_f1   = cross_val_score(model, X_scaled_df, y, cv=cv, scoring="f1")

    results[name] = {
        "Accuracy" : accuracy_score(y_test, y_pred),
        "F1"       : f1_score(y_test, y_pred, zero_division=0),
        "Precision": precision_score(y_test, y_pred, zero_division=0),
        "Recall"   : recall_score(y_test, y_pred, zero_division=0),
        "AUC-ROC"  : roc_auc_score(y_test, y_proba),
        "CV_F1_mean": cv_f1.mean(),
        "CV_F1_std" : cv_f1.std(),
    }
    print(f"\n  ── {name} ──")
    print(f"     Accuracy    : {results[name]['Accuracy']:.4f}")
    print(f"     F1-Score    : {results[name]['F1']:.4f}")
    print(f"     Precision   : {results[name]['Precision']:.4f}")
    print(f"     Recall      : {results[name]['Recall']:.4f}")
    print(f"     AUC-ROC     : {results[name]['AUC-ROC']:.4f}")
    print(f"     CV F1 (5-fold): {cv_f1.mean():.4f} ± {cv_f1.std():.4f}")

results_df = pd.DataFrame(results).T.round(4)
print("\n── RANGKUMAN PERFORMA MODEL ──")
print(results_df[["Accuracy", "F1", "Precision", "Recall", "AUC-ROC",
                   "CV_F1_mean", "CV_F1_std"]].to_string())

best_name  = results_df["AUC-ROC"].idxmax()
best_model = models[best_name]
print(f"\n  🏆 Model terbaik (berdasarkan AUC-ROC): {best_name}")

y_pred_best = best_model.predict(X_test)
print(f"\n  Classification Report — {best_name}:")
print(classification_report(y_test, y_pred_best,
                             target_names=["Tidak Burnout", "Burnout"]))

print("\n✅ Bagian 7 selesai: Persiapan Data & Evaluasi Model")


# =============================================================================
# BAGIAN 8 — A/B TESTING
# =============================================================================
print("\n" + "=" * 70)
print("  BAGIAN 8: A/B TESTING")
print("=" * 70)

print("""
  A/B Testing dalam konteks ini digunakan untuk memvalidasi secara statistik
  apakah perbedaan yang kita amati (antar model atau antar kelompok karyawan)
  benar-benar bermakna atau hanya terjadi secara kebetulan.

  Metode: Two-Sample Independent t-test
  Hipotesis Null (H0): Tidak ada perbedaan yang signifikan
  Threshold: α = 0.05 (confidence level 95%)

  3 Eksperimen A/B Testing:
  ─────────────────────────
  Test 1: Logistic Regression (A) vs Random Forest (B)
          H0: Tidak ada perbedaan F1-Score
          H1: Random Forest memiliki F1-Score lebih tinggi

  Test 2: Random Forest (A) vs Gradient Boosting (B)
          H0: Tidak ada perbedaan F1-Score
          H1: Salah satu model lebih unggul secara signifikan

  Test 3: Burnout Rate — Karyawan jam kerja tinggi (≥50 jam) vs rendah (<40 jam)
          H0: Tidak ada perbedaan burnout rate
          H1: Jam kerja tinggi → burnout rate lebih tinggi secara signifikan
""")

# Hitung CV F1 scores per model untuk A/B test
cv_lr = cross_val_score(
    LogisticRegression(max_iter=1000, random_state=42, class_weight="balanced"),
    X_scaled_df, y, cv=cv, scoring="f1"
)
cv_rf = cross_val_score(
    RandomForestClassifier(n_estimators=100, random_state=42,
                           class_weight="balanced", n_jobs=-1),
    X_scaled_df, y, cv=cv, scoring="f1"
)
cv_gb = cross_val_score(
    GradientBoostingClassifier(n_estimators=100, random_state=42),
    X_scaled_df, y, cv=cv, scoring="f1"
)

print("  CV F1 Scores (5-fold) per Model:")
print(f"    Logistic Regression : {cv_lr.round(4).tolist()}")
print(f"    Random Forest       : {cv_rf.round(4).tolist()}")
print(f"    Gradient Boosting   : {cv_gb.round(4).tolist()}")
print(f"\n  Mean ± Std:")
print(f"    LR : {cv_lr.mean():.4f} ± {cv_lr.std():.4f}")
print(f"    RF : {cv_rf.mean():.4f} ± {cv_rf.std():.4f}")
print(f"    GB : {cv_gb.mean():.4f} ± {cv_gb.std():.4f}")

# Test 1
t1, p1 = stats.ttest_ind(cv_lr, cv_rf)
print(f"\n── A/B Test 1: Logistic Regression vs Random Forest ──")
print(f"   t-statistic : {t1:.4f}")
print(f"   p-value     : {p1:.6f}")
if p1 < 0.05:
    winner1 = "Random Forest" if cv_rf.mean() > cv_lr.mean() else "Logistic Regression"
    print(f"   Hasil       : ✅ TOLAK H0 — perbedaan signifikan (p < 0.05)")
    print(f"   Pemenang    : {winner1} (mean F1 lebih tinggi)")
else:
    print(f"   Hasil       : ❌ GAGAL TOLAK H0 — tidak ada perbedaan signifikan (p ≥ 0.05)")

# Test 2
t2, p2 = stats.ttest_ind(cv_rf, cv_gb)
print(f"\n── A/B Test 2: Random Forest vs Gradient Boosting ──")
print(f"   t-statistic : {t2:.4f}")
print(f"   p-value     : {p2:.6f}")
if p2 < 0.05:
    winner2 = "Gradient Boosting" if cv_gb.mean() > cv_rf.mean() else "Random Forest"
    print(f"   Hasil       : ✅ TOLAK H0 — perbedaan signifikan (p < 0.05)")
    print(f"   Pemenang    : {winner2}")
else:
    print(f"   Hasil       : ❌ GAGAL TOLAK H0 — tidak ada perbedaan signifikan")

# Test 3
high_grp = df_clean[df_clean["WorkHoursPerWeek"] >= 50]["Burnout"].values
low_grp  = df_clean[df_clean["WorkHoursPerWeek"] <  40]["Burnout"].values
t3, p3   = stats.ttest_ind(high_grp, low_grp)

print(f"\n── A/B Test 3: Burnout Rate — Jam Kerja Tinggi vs Rendah ──")
print(f"   Kelompok ≥50 jam: burnout rate {high_grp.mean()*100:.2f}%  (n={len(high_grp):,})")
print(f"   Kelompok <40 jam: burnout rate {low_grp.mean()*100:.2f}%  (n={len(low_grp):,})")
print(f"   t-statistic : {t3:.4f}")
print(f"   p-value     : {p3:.6f}")
if p3 < 0.05:
    print(f"   Hasil       : ✅ TOLAK H0 — jam kerja tinggi memiliki burnout rate")
    print(f"                 yang secara statistik berbeda signifikan (p < 0.05)")
    print(f"   Insight     : Kebijakan batas jam kerja perlu diimplementasikan!")
else:
    print(f"   Hasil       : ❌ GAGAL TOLAK H0 — tidak ada bukti signifikan")

# ── Figur 8: A/B Testing Visualisasi ─────────────────────────────────────────
print("\n  Membuat Fig 8: A/B Testing Visualisasi...")

fig8, axes = plt.subplots(1, 3, figsize=(18, 6))
fig8.suptitle("A/B Testing — Validasi Statistik Perbandingan Model & Faktor Burnout",
              fontsize=14, fontweight="bold")

# Panel A: Boxplot CV F1 per model
model_names_ab = ["Logistic\nRegression", "Random\nForest", "Gradient\nBoosting"]
scores_ab = [cv_lr, cv_rf, cv_gb]
bp = axes[0].boxplot(scores_ab, labels=model_names_ab, patch_artist=True,
                     boxprops=dict(alpha=0.7), medianprops=dict(linewidth=2))
for patch, color in zip(bp["boxes"], PALETTE[:3]):
    patch.set_facecolor(color)
axes[0].set_ylabel("F1 Score (CV 5-Fold)")
axes[0].set_title("Test 1 & 2: Distribusi CV F1 per Model\n"
                  f"LR vs RF: p={p1:.4f}  |  RF vs GB: p={p2:.4f}", fontsize=10)
axes[0].yaxis.grid(True, alpha=0.5)

# Panel B: Mean F1 dengan error bar
means = [s.mean() for s in scores_ab]
stds  = [s.std()  for s in scores_ab]
axes[1].bar(model_names_ab, means, yerr=stds,
            color=PALETTE[:3], capsize=7, edgecolor="black", error_kw={"linewidth": 2})
axes[1].set_ylabel("Mean F1 Score")
axes[1].set_title("Mean F1 ± Std Dev\n(Error bar = variasi antar fold)", fontsize=10)
axes[1].set_ylim(0, max(means) * 1.35)
for i, (m, s) in enumerate(zip(means, stds)):
    axes[1].text(i, m + s + 0.005, f"{m:.4f}", ha="center", fontsize=10, fontweight="bold")

# Panel C: Burnout rate per kelompok jam kerja
labels_c = [
    f"< 40 jam\n(n={len(low_grp):,})",
    f"≥ 50 jam\n(n={len(high_grp):,})"
]
rates_c = [low_grp.mean() * 100, high_grp.mean() * 100]
bars_c  = axes[2].bar(labels_c, rates_c,
                      color=[COLOR_NO, COLOR_YES], edgecolor="black")
axes[2].set_ylabel("Burnout Rate (%)")
sig_label = "✅ Signifikan (p < 0.05)" if p3 < 0.05 else "❌ Tidak Signifikan"
axes[2].set_title(f"Test 3: Burnout Rate per Kelompok Jam Kerja\n"
                  f"p-value = {p3:.4f} | {sig_label}", fontsize=10)
for bar, val in zip(bars_c, rates_c):
    axes[2].text(bar.get_x() + bar.get_width()/2, val + 0.1,
                 f"{val:.2f}%", ha="center", fontsize=12, fontweight="bold")

plt.tight_layout()
fig8.savefig(f"{OUTPUT_DIR}/fig8_ab_testing.png", dpi=130, bbox_inches="tight")
plt.close()
print("  ✓ fig8_ab_testing.png tersimpan")
print("\n✅ Bagian 8 selesai: A/B Testing")


# =============================================================================
# SIMPAN ARTIFACTS
# =============================================================================
print("\n" + "=" * 70)
print("  MENYIMPAN ARTIFACTS")
print("=" * 70)

model_artifacts = {
    "best_model"      : best_model,
    "best_model_name" : best_name,
    "scaler"          : scaler,
    "le_gender"       : le_gender,
    "le_role"         : le_role,
    "features"        : FEATURES,
    "results_df"      : results_df.to_dict(),
}

with open(f"{OUTPUT_DIR}/model_artifacts.pkl", "wb") as f:
    pickle.dump(model_artifacts, f)
print(f"  ✓ model_artifacts.pkl tersimpan")

df_clean.to_csv(f"{OUTPUT_DIR}/df_clean.csv", index=False)
print(f"  ✓ df_clean.csv tersimpan")

# =============================================================================
# RINGKASAN AKHIR
# =============================================================================
print("\n" + "=" * 70)
print("  ✅  PIPELINE DATA SCIENTIST SELESAI SELURUHNYA")
print("=" * 70)
print(f"""
  File Output yang Dihasilkan:
  ─────────────────────────────────────────────────────
  📊 fig1_distribusi_fitur.png    → Distribusi semua fitur (Bagian 5)
  🔥 fig2_heatmap_korelasi.png   → Heatmap korelasi (Bagian 5)
  📊 fig3_burnout_kategori.png   → Burnout per JobRole & Gender (BQ2, BQ3)
  📦 fig4_boxplot_burnout.png    → Boxplot perbandingan (BQ4, BQ7)
  🎯 fig5_risk_level.png         → Distribusi Risk Level (BQ1, BQ5)
  🔵 fig6_scatter_burnout.png    → Scatter WorkHours vs Stress (BQ5)
  📋 fig7_explanatory.png        → Ringkasan 7 Business Questions
  🧪 fig8_ab_testing.png         → Validasi statistik A/B Testing
  📄 data_dictionary.csv         → Kamus data lengkap (Bagian 6)
  🤖 model_artifacts.pkl         → Model + scaler + encoder tersimpan
  📋 df_clean.csv                → Dataset bersih siap pakai

  Langkah Selanjutnya:
  ─────────────────────────────────────────────────────
  1. Jalankan dashboard Streamlit:
     streamlit run dashboard_burnout.py

  2. Deploy ke Streamlit Cloud:
     a. Push semua file ke GitHub
     b. Buka streamlit.io/cloud
     c. Connect GitHub repo
     d. Set main file: dashboard_burnout.py

  3. Integrasi dengan tim AI Engineer:
     → model_artifacts.pkl siap digunakan untuk inference di FastAPI
""")
