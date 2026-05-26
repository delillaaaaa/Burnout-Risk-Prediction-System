# =============================================================================
#  BURNOUT RISK PREDICTION SYSTEM — Streamlit Dashboard
#  Capstone Project Coding Camp 2026 | CC26-PSU335
#  Tema: Healthy Lives & Well-being
#
#  Cara Menjalankan:
#    streamlit run dashboard_burnout.py
#
#  Pastikan file berikut ada di folder yang sama:
#    - model_artifacts.pkl
#    - df_clean.csv
# =============================================================================

import streamlit as st
import pandas as pd
import numpy as np
import pickle
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import seaborn as sns
from scipy import stats
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import confusion_matrix
import os
import warnings
warnings.filterwarnings("ignore")

# ── Konfigurasi Halaman ───────────────────────────────────────────────────────
st.set_page_config(
    page_title="🔥 Burnout Risk Prediction System",
    page_icon="🔥",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── CSS Kustom ────────────────────────────────────────────────────────────────
st.markdown("""
<style>
/* Header styling */
.main-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 1.5rem 2rem;
    border-radius: 12px;
    color: white;
    margin-bottom: 1.5rem;
    text-align: center;
}
/* Metric cards */
.metric-card {
    background: white;
    border-radius: 10px;
    padding: 1rem;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    border-left: 4px solid #667eea;
}
/* Risk badges */
.risk-high   { background:#FF4444; color:white; padding:6px 14px;
               border-radius:20px; font-weight:bold; display:inline-block; }
.risk-medium { background:#FF8800; color:white; padding:6px 14px;
               border-radius:20px; font-weight:bold; display:inline-block; }
.risk-low    { background:#00AA44; color:white; padding:6px 14px;
               border-radius:20px; font-weight:bold; display:inline-block; }
/* Info box */
.info-box {
    background: #f0f4ff;
    border: 1px solid #c3d0ff;
    border-radius: 8px;
    padding: 1rem;
    margin: 0.5rem 0;
}
/* Sidebar */
section[data-testid="stSidebar"] { background: #1a1a2e; }
section[data-testid="stSidebar"] * { color: white !important; }
</style>
""", unsafe_allow_html=True)

# ── Konstanta Warna ───────────────────────────────────────────────────────────
COLOR_NO  = "#2196F3"
COLOR_YES = "#F44336"
PALETTE   = ["#2196F3", "#F44336", "#4CAF50", "#FF9800", "#9C27B0", "#00BCD4"]
sns.set_theme(style="whitegrid", font_scale=1.0)


# ── Fungsi Load Data & Artifacts ──────────────────────────────────────────────
@st.cache_resource(show_spinner="Memuat model...")
def load_artifacts():
    """Load model artifacts dari file pkl."""
    search_paths = [
        "model_artifacts.pkl",
        os.path.join(os.path.dirname(__file__), "model_artifacts.pkl"),
    ]
    for path in search_paths:
        if os.path.exists(path):
            with open(path, "rb") as f:
                return pickle.load(f)
    raise FileNotFoundError("model_artifacts.pkl tidak ditemukan! Jalankan burnout_analysis.py terlebih dahulu.")


@st.cache_data(show_spinner="Memuat dataset...")
def load_data():
    """Load dataset bersih."""
    search_paths = [
        "df_clean.csv",
        os.path.join(os.path.dirname(__file__), "df_clean.csv"),
    ]
    for path in search_paths:
        if os.path.exists(path):
            return pd.read_csv(path)
    raise FileNotFoundError("df_clean.csv tidak ditemukan! Jalankan burnout_analysis.py terlebih dahulu.")


# Load data
try:
    artifacts    = load_artifacts()
    df           = load_data()
    model        = artifacts["best_model"]
    scaler       = artifacts["scaler"]
    le_gender    = artifacts["le_gender"]
    le_role      = artifacts["le_role"]
    FEATURES     = artifacts["features"]
    model_name   = artifacts["best_model_name"]
    # Load results_df dengan penanganan format yang robust
    _raw = artifacts["results_df"]
    _df  = pd.DataFrame(_raw)
    # Jika kolom berisi nama model (bukan metrik), transpose
    _metric_cols = {"Accuracy", "F1", "Precision", "Recall", "AUC-ROC"}
    if not _metric_cols.intersection(set(_df.columns)):
        _df = _df.T
    results_df = _df
    DATA_LOADED  = True
except Exception as e:
    DATA_LOADED = False
    st.error(f"""
    ❌ **Gagal memuat data/model:** {e}

    **Solusi:** Jalankan script analisis terlebih dahulu:
    ```bash
    python burnout_analysis.py
    ```
    Kemudian pastikan `model_artifacts.pkl` dan `df_clean.csv` ada di folder yang sama.
    """)
    st.stop()


# ── Sidebar Navigasi ──────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("## 🔥 Burnout Risk\nPrediction System")
    st.markdown("---")
    st.markdown(f"**Model Aktif:** `{model_name}`")
    st.markdown(f"**Total Data:** {len(df):,} karyawan")
    st.markdown(f"**Burnout Rate:** {df['Burnout'].mean()*100:.1f}%")
    st.markdown("---")

    page = st.selectbox(
        "📌 Navigasi",
        [
        "🏠 Overview & Problem Statement",
        "📊 Exploratory Data Analysis",
        "💡 Explanatory Analysis (Business Q)",
        "😊 Kuesioner Kepuasan Kerja",
        "😰 Kuesioner Tingkat Stres",
        "🤖 Prediksi Individu",
        "⏰ Reminder Burnout Check",
        "📈 Performa Model",
        "🧪 A/B Testing",
        ],
        label_visibility="collapsed"
    )

    st.markdown("---")
    st.markdown("**Tim CC26-PSU335**")
    st.markdown("Coding Camp 2026 × DBS Foundation")
    st.caption("Tema: Healthy Lives & Well-being")


# =============================================================================
# HALAMAN 1: OVERVIEW & PROBLEM STATEMENT
# =============================================================================
if page == "🏠 Overview & Problem Statement":
    st.markdown("""
    <div class='main-header'>
        <h1>🔥 Burnout Risk Prediction System</h1>
        <p>Capstone Project | Coding Camp 2026 | CC26-PSU335</p>
        <p><em>Healthy Lives & Well-being</em></p>
    </div>
    """, unsafe_allow_html=True)

    # Problem Statement
    st.header("🔍 Problem Statement")
    col_prob1, col_prob2 = st.columns(2)

    with col_prob1:
        st.markdown("""
        **Masalah Utama:**
        Burnout karyawan adalah kondisi kelelahan fisik dan mental akibat stres
        kerja yang berkepanjangan dan tidak terdeteksi secara dini.

        **Dampak Burnout:**
        - 📉 Produktivitas turun 30–40%
        - 🚪 Turnover karyawan meningkat
        - 🧠 Kesehatan mental jangka panjang terganggu
        - 💸 Kerugian finansial perusahaan
        """)

    with col_prob2:
        st.markdown("""
        **Solusi yang Dikembangkan:**
        Membangun **Burnout Risk Prediction System** berbasis Machine Learning
        yang mengklasifikasikan risiko burnout menjadi **Rendah / Sedang / Tinggi**.

        **Faktor yang Dianalisis:**
        - ⏰ Beban kerja (WorkHoursPerWeek)
        - 😰 Tingkat stres (StressLevel)
        - 😊 Kepuasan kerja (SatisfactionLevel)
        - 🏠 Rasio kerja remote (RemoteRatio)
        - 👤 Profil demografis (Usia, Pengalaman, Jabatan)
        """)

    st.markdown("---")

    # KPI Cards
    st.subheader("📊 Ringkasan Dataset")
    col1, col2, col3, col4, col5 = st.columns(5)

    with col1:
        st.metric("👥 Total Karyawan", f"{len(df):,}")
    with col2:
        burnout_cnt = int(df["Burnout"].sum())
        st.metric("🔴 Karyawan Burnout", f"{burnout_cnt:,}",
                  delta=f"{burnout_cnt/len(df)*100:.1f}% dari total",
                  delta_color="inverse")
    with col3:
        st.metric("😰 Rata-rata Stres", f"{df['StressLevel'].mean():.2f}/10")
    with col4:
        st.metric("⏰ Rata-rata Jam Kerja", f"{df['WorkHoursPerWeek'].mean():.1f} jam/mg")
    with col5:
        st.metric("😊 Rata-rata Kepuasan", f"{df['SatisfactionLevel'].mean():.2f}/5")

    st.markdown("---")

    # Overview tabel & distribusi
    col_a, col_b = st.columns([3, 2])

    with col_a:
        st.subheader("📋 Preview Dataset (10 Baris Pertama)")
        st.dataframe(df.head(10), use_container_width=True, height=300)

    with col_b:
        st.subheader("🎯 Distribusi Risk Level")
        risk_counts = df["RiskLevel"].value_counts()
        fig_ov, ax_ov = plt.subplots(figsize=(5, 5))
        order_r  = ["Rendah", "Sedang", "Tinggi"]
        colors_r = ["#4CAF50", "#FF9800", "#F44336"]
        vals_r   = [risk_counts.get(r, 0) for r in order_r]
        wedges, _, autotexts = ax_ov.pie(
            vals_r, labels=order_r, colors=colors_r,
            autopct="%1.1f%%", startangle=140,
            wedgeprops={"edgecolor": "white", "linewidth": 2}
        )
        for at in autotexts:
            at.set_fontweight("bold")
        ax_ov.set_title("Proporsi Risiko Burnout", fontsize=12)
        st.pyplot(fig_ov)
        plt.close()

    # Data Dictionary
    st.subheader("📖 Data Dictionary")
    dict_data = {
        "Kolom": ["Age","Gender","JobRole","Experience","WorkHoursPerWeek",
                  "RemoteRatio","SatisfactionLevel","StressLevel","Burnout",
                  "RiskLevel","StressWorkRatio","WorkLifeScore","HighRiskFlag","SeniorEmployee"],
        "Tipe":  ["int","str","str","int","int",
                  "int (%)","float (1–5)","int (1–10)","int (0/1)",
                  "str","float","float","int (0/1)","int (0/1)"],
        "Deskripsi": [
            "Usia karyawan (22–60 tahun)",
            "Jenis kelamin: Male / Female",
            "Posisi jabatan: Analyst, Engineer, HR, Manager, Sales",
            "Lama pengalaman kerja (tahun)",
            "Rata-rata jam kerja per minggu",
            "Persentase waktu kerja remote (0–100%)",
            "Skor kepuasan kerja (1=sangat tidak puas, 5=sangat puas)",
            "Tingkat stres kerja (1=sangat rendah, 10=sangat tinggi)",
            "Label target: 0=Tidak Burnout, 1=Burnout",
            "Tingkat risiko: Rendah / Sedang / Tinggi",
            "StressLevel / (WorkHoursPerWeek+1): intensitas stres per jam",
            "SatisfactionLevel × (1 – RemoteRatio/100): skor keseimbangan",
            "1 jika StressLevel≥7 AND WorkHoursPerWeek≥50",
            "1 jika Experience≥10 tahun",
        ]
    }
    st.dataframe(pd.DataFrame(dict_data), use_container_width=True, hide_index=True)


# =============================================================================
# HALAMAN 2: EDA
# =============================================================================
elif page == "📊 Exploratory Data Analysis":
    st.title("📊 Exploratory Data Analysis")
    st.markdown("Memahami distribusi, pola, dan hubungan antar variabel dalam dataset.")
    st.markdown("---")

    tab1, tab2, tab3, tab4, tab5 = st.tabs([
        "📈 Distribusi Fitur",
        "🔥 Heatmap Korelasi",
        "📊 Burnout per Kategori",
        "📦 Boxplot Perbandingan",
        "📐 Statistik Deskriptif",
    ])

    with tab1:
        st.subheader("Distribusi Fitur Numerik berdasarkan Status Burnout")
        st.info("""
        **Mengapa Histogram + KDE?**
        Histogram menampilkan frekuensi nilai, sementara KDE (Kernel Density Estimate)
        memperhalus kurva untuk melihat bentuk distribusi. Pewarnaan berdasarkan status
        Burnout memungkinkan kita melihat apakah ada perbedaan distribusi antar kelompok.
        """)
        feat_sel = st.selectbox(
            "Pilih fitur untuk dieksplorasi:",
            ["WorkHoursPerWeek", "StressLevel", "SatisfactionLevel",
             "Age", "Experience", "RemoteRatio"]
        )
        df_plot = df.copy()
        df_plot["Status"] = df_plot["Burnout"].map({0: "Tidak Burnout", 1: "Burnout"})

        fig_t1, ax_t1 = plt.subplots(figsize=(11, 5))
        sns.histplot(
            data=df_plot, x=feat_sel, hue="Status", bins=25, kde=True,
            ax=ax_t1,
            palette={"Tidak Burnout": COLOR_NO, "Burnout": COLOR_YES}
        )
        ax_t1.set_title(f"Distribusi {feat_sel} berdasarkan Status Burnout",
                        fontsize=13, fontweight="bold")
        ax_t1.set_xlabel(feat_sel, fontsize=11)
        ax_t1.set_ylabel("Frekuensi", fontsize=11)
        st.pyplot(fig_t1)
        plt.close()

        col_s1, col_s2 = st.columns(2)
        with col_s1:
            st.markdown("**Tidak Burnout (=0)**")
            st.dataframe(df[df["Burnout"]==0][feat_sel].describe().round(3).to_frame().T,
                         hide_index=True, use_container_width=True)
        with col_s2:
            st.markdown("**Burnout (=1)**")
            st.dataframe(df[df["Burnout"]==1][feat_sel].describe().round(3).to_frame().T,
                         hide_index=True, use_container_width=True)

    with tab2:
        st.subheader("Heatmap Korelasi Antar Fitur Numerik")
        st.info("""
        **Mengapa Heatmap?**
        Heatmap memungkinkan kita melihat korelasi SEMUA pasang fitur sekaligus.
        Merah = korelasi positif kuat, Biru = korelasi negatif kuat, Putih = tidak ada korelasi.
        Berguna untuk mendeteksi multikolinearitas dan fitur yang berkorelasi tinggi dengan target.
        """)
        num_cols_eda = ["Age","Experience","WorkHoursPerWeek","RemoteRatio",
                        "SatisfactionLevel","StressLevel","Burnout"]
        corr = df[num_cols_eda].corr()

        fig_t2, ax_t2 = plt.subplots(figsize=(10, 7))
        mask = np.triu(np.ones_like(corr, dtype=bool))
        sns.heatmap(corr, mask=mask, annot=True, fmt=".2f",
                    cmap="coolwarm", center=0, ax=ax_t2,
                    linewidths=0.5, annot_kws={"size": 10})
        ax_t2.set_title("Heatmap Korelasi Antar Fitur Numerik",
                        fontsize=13, fontweight="bold")
        st.pyplot(fig_t2)
        plt.close()

        st.subheader("📊 Korelasi Terhadap Burnout (Diurutkan)")
        corr_b = corr["Burnout"].drop("Burnout").sort_values(key=abs, ascending=False)
        fig_corr, ax_corr = plt.subplots(figsize=(9, 4))
        colors_corr = [COLOR_YES if v > 0 else COLOR_NO for v in corr_b.values]
        ax_corr.barh(corr_b.index, corr_b.values, color=colors_corr)
        ax_corr.axvline(0, color="black", linewidth=0.8)
        ax_corr.set_xlabel("Pearson Correlation", fontsize=11)
        ax_corr.set_title("Korelasi Fitur terhadap Target (Burnout)", fontsize=12)
        st.pyplot(fig_corr)
        plt.close()

        st.markdown("**Interpretasi Korelasi:**")
        for feat, val in corr_b.items():
            direction = "↑ positif" if val > 0 else "↓ negatif"
            strength  = "🔴 Kuat" if abs(val) >= 0.4 else "🟡 Sedang" if abs(val) >= 0.2 else "🟢 Lemah"
            st.markdown(f"- **{feat}**: {val:+.4f} ({direction}) — {strength}")

    with tab3:
        st.subheader("Burnout Rate per Kategori")
        st.info("""
        **Mengapa Bar Chart?**
        Bar chart ideal untuk membandingkan nilai antar kategori. Mudah dibaca
        dan diinterpretasikan bahkan oleh non-teknis.
        """)
        cat_sel = st.selectbox("Pilih kategori:", ["JobRole", "Gender", "RiskLevel"])
        br_cat  = df.groupby(cat_sel)["Burnout"].mean() * 100

        fig_t3, ax_t3 = plt.subplots(figsize=(10, 5))
        palette_cat = sns.color_palette("husl", len(br_cat))
        bars_cat = ax_t3.bar(br_cat.index, br_cat.values,
                             color=palette_cat, edgecolor="black")
        ax_t3.set_ylabel("Burnout Rate (%)", fontsize=11)
        ax_t3.set_title(f"Burnout Rate per {cat_sel}", fontsize=13, fontweight="bold")
        for bar, val in zip(bars_cat, br_cat.values):
            ax_t3.text(bar.get_x() + bar.get_width()/2, val + 0.1,
                       f"{val:.1f}%", ha="center", fontsize=11, fontweight="bold")
        st.pyplot(fig_t3)
        plt.close()

        st.dataframe(
            br_cat.reset_index().rename(columns={"Burnout": "Burnout Rate (%)"}).round(2),
            use_container_width=True, hide_index=True
        )

    with tab4:
        st.subheader("Boxplot: Perbandingan Distribusi Burnout vs Tidak Burnout")
        st.info("""
        **Mengapa Boxplot?**
        Boxplot menampilkan median, Q1, Q3, dan outlier dalam satu grafik ringkas.
        Sangat efektif untuk membandingkan dua kelompok secara visual.
        """)
        box_feat = st.selectbox("Pilih fitur:",
                                ["WorkHoursPerWeek", "StressLevel",
                                 "SatisfactionLevel", "Age", "Experience"])
        df_box_st = df.copy()
        df_box_st["Status"] = df_box_st["Burnout"].map({0: "Tidak Burnout", 1: "Burnout"})

        fig_t4, ax_t4 = plt.subplots(figsize=(9, 5))
        sns.boxplot(data=df_box_st, x="Status", y=box_feat,
                    palette={"Tidak Burnout": COLOR_NO, "Burnout": COLOR_YES}, ax=ax_t4)
        ax_t4.set_title(f"Distribusi {box_feat}: Burnout vs Tidak Burnout",
                        fontsize=13, fontweight="bold")
        ax_t4.set_xlabel("")
        st.pyplot(fig_t4)
        plt.close()

        col_b1, col_b2, col_b3 = st.columns(3)
        mean_no  = df[df["Burnout"]==0][box_feat].mean()
        mean_yes = df[df["Burnout"]==1][box_feat].mean()
        diff     = mean_yes - mean_no
        with col_b1:
            st.metric("Rata-rata (Tidak Burnout)", f"{mean_no:.2f}")
        with col_b2:
            st.metric("Rata-rata (Burnout)", f"{mean_yes:.2f}")
        with col_b3:
            st.metric("Perbedaan", f"{diff:+.2f}",
                      delta_color="inverse" if diff > 0 else "normal")

    with tab5:
        st.subheader("Statistik Deskriptif Lengkap")
        num_cols_stat = ["Age","Experience","WorkHoursPerWeek","RemoteRatio",
                         "SatisfactionLevel","StressLevel"]
        st.dataframe(df[num_cols_stat].describe().round(3), use_container_width=True)

        st.subheader("Skewness & Kurtosis")
        skew_data = {
            "Fitur": num_cols_stat,
            "Skewness": [df[c].skew() for c in num_cols_stat],
            "Kurtosis": [df[c].kurtosis() for c in num_cols_stat],
        }
        df_skew = pd.DataFrame(skew_data).round(4)
        st.dataframe(df_skew, use_container_width=True, hide_index=True)
        st.caption("Skewness mendekati 0 = distribusi simetris | Kurtosis mendekati 0 = distribusi normal")


# =============================================================================
# HALAMAN 3: EXPLANATORY ANALYSIS
# =============================================================================
elif page == "💡 Explanatory Analysis (Business Q)":
    st.title("💡 Explanatory Analysis — Menjawab Business Questions")
    st.markdown("Analisis mendalam untuk menjawab 7 pertanyaan bisnis yang telah didefinisikan.")
    st.markdown("---")

    bq_tabs = st.tabs([
        "BQ1: Proporsi Burnout",
        "BQ2: per JobRole",
        "BQ3: per Gender",
        "BQ4: Beban Kerja",
        "BQ5: Kombinasi Risiko",
        "BQ6: Faktor Penting",
        "BQ7: Kepuasan & Stres",
    ])

    with bq_tabs[0]:
        st.subheader("BQ1: Seberapa besar proporsi karyawan yang mengalami burnout?")
        br = df["Burnout"].mean() * 100
        col1, col2 = st.columns([1, 2])
        with col1:
            st.metric("Burnout Rate", f"{br:.2f}%")
            st.metric("Karyawan Burnout", f"{int(df['Burnout'].sum()):,}")
            st.metric("Tidak Burnout", f"{int((df['Burnout']==0).sum()):,}")
            st.markdown(f"""
            **📌 Insight:**
            Dari {len(df):,} karyawan, hanya **{br:.1f}%** yang mengalami burnout.
            Dataset ini sangat tidak seimbang (imbalanced), yang merupakan
            kondisi wajar di dunia nyata. Ini menunjukkan bahwa burnout
            adalah kejadian yang relatif jarang namun berdampak besar.
            """)
        with col2:
            fig_bq1, ax_bq1 = plt.subplots(figsize=(6, 6))
            counts_bq1 = [int(df["Burnout"].sum()), int((df["Burnout"]==0).sum())]
            labels_bq1 = [f"Burnout\n({br:.1f}%)", f"Tidak Burnout\n({100-br:.1f}%)"]
            ax_bq1.pie(counts_bq1, labels=labels_bq1,
                       colors=[COLOR_YES, COLOR_NO],
                       autopct="%1.1f%%", startangle=90,
                       wedgeprops={"edgecolor": "white", "linewidth": 3},
                       pctdistance=0.7, textprops={"fontsize": 12})
            ax_bq1.set_title("Proporsi Karyawan Burnout vs Tidak Burnout",
                             fontsize=12, fontweight="bold")
            st.pyplot(fig_bq1)
            plt.close()

    with bq_tabs[1]:
        st.subheader("BQ2: Bagaimana distribusi burnout di antara berbagai peran pekerjaan?")
        br_role = (df.groupby("JobRole")["Burnout"].mean() * 100).sort_values(ascending=False)
        col1, col2 = st.columns([2, 1])
        with col1:
            fig_bq2, ax_bq2 = plt.subplots(figsize=(9, 5))
            palette_bq2 = sns.color_palette("husl", len(br_role))
            bars_bq2 = ax_bq2.bar(br_role.index, br_role.values,
                                  color=palette_bq2, edgecolor="black")
            ax_bq2.set_ylabel("Burnout Rate (%)", fontsize=11)
            ax_bq2.set_title("Burnout Rate per JobRole", fontsize=12, fontweight="bold")
            for bar, val in zip(bars_bq2, br_role.values):
                ax_bq2.text(bar.get_x() + bar.get_width()/2, val + 0.1,
                            f"{val:.1f}%", ha="center", fontsize=11, fontweight="bold")
            st.pyplot(fig_bq2)
            plt.close()
        with col2:
            st.dataframe(br_role.reset_index().rename(
                columns={"Burnout": "Burnout Rate (%)"}
            ).round(2), use_container_width=True, hide_index=True)
            top_role = br_role.index[0]
            st.markdown(f"""
            **📌 Insight:**
            - Role **{top_role}** memiliki burnout rate tertinggi.
            - Semua role memiliki burnout rate yang relatif serupa,
              mengindikasikan burnout adalah isu lintas jabatan.
            - HR dan perlu memperhatikan semua departemen secara merata.
            """)

    with bq_tabs[2]:
        st.subheader("BQ3: Apakah ada perbedaan tingkat burnout antara gender?")
        br_gender = df.groupby("Gender")["Burnout"].mean() * 100
        col1, col2 = st.columns([2, 1])
        with col1:
            fig_bq3, ax_bq3 = plt.subplots(figsize=(7, 5))
            bars_bq3 = ax_bq3.bar(br_gender.index, br_gender.values,
                                  color=[COLOR_NO, COLOR_YES][:len(br_gender)],
                                  edgecolor="black", width=0.5)
            ax_bq3.set_ylabel("Burnout Rate (%)", fontsize=11)
            ax_bq3.set_title("Burnout Rate per Gender", fontsize=12, fontweight="bold")
            for bar, val in zip(bars_bq3, br_gender.values):
                ax_bq3.text(bar.get_x() + bar.get_width()/2, val + 0.1,
                            f"{val:.1f}%", ha="center", fontsize=13, fontweight="bold")
            st.pyplot(fig_bq3)
            plt.close()
        with col2:
            for g, rate in br_gender.items():
                st.metric(f"Burnout Rate — {g}", f"{rate:.1f}%")
            diff_gender = abs(br_gender.max() - br_gender.min())
            st.markdown(f"""
            **📌 Insight:**
            Perbedaan burnout rate antar gender hanya **{diff_gender:.2f}%**.
            Ini mengindikasikan gender bukanlah faktor diskriminatif
            yang signifikan dalam risiko burnout. Intervensi HR sebaiknya
            tidak membedakan berdasarkan gender.
            """)

    with bq_tabs[3]:
        st.subheader("BQ4: Apakah beban kerja berkorelasi signifikan dengan burnout?")
        bins_wh   = [0, 35, 40, 45, 50, 55, 100]
        labels_wh = ["<35", "35-40", "40-45", "45-50", "50-55", ">55"]
        df_bq4 = df.copy()
        df_bq4["WorkGroup"] = pd.cut(df_bq4["WorkHoursPerWeek"], bins=bins_wh, labels=labels_wh)
        br_work = df_bq4.groupby("WorkGroup", observed=True)["Burnout"].mean() * 100
        count_work = df_bq4.groupby("WorkGroup", observed=True).size()

        fig_bq4, axes_bq4 = plt.subplots(1, 2, figsize=(14, 5))
        colors_bq4 = ["#4CAF50", "#4CAF50", "#FF9800", "#FF9800", "#F44336", "#F44336"]
        axes_bq4[0].bar(br_work.index, br_work.values, color=colors_bq4, edgecolor="black")
        axes_bq4[0].set_xlabel("Kelompok Jam Kerja per Minggu", fontsize=11)
        axes_bq4[0].set_ylabel("Burnout Rate (%)", fontsize=11)
        axes_bq4[0].set_title("Burnout Rate per Kelompok Jam Kerja", fontsize=12, fontweight="bold")
        for i, (_, val) in enumerate(br_work.items()):
            axes_bq4[0].text(i, val + 0.1, f"{val:.1f}%", ha="center", fontsize=10, fontweight="bold")

        # Scatter dengan regression line
        axes_bq4[1].scatter(df["WorkHoursPerWeek"], df["Burnout"],
                            alpha=0.2, c=COLOR_NO, s=20)
        z = np.polyfit(df["WorkHoursPerWeek"], df["Burnout"], 1)
        p = np.poly1d(z)
        x_line = np.linspace(df["WorkHoursPerWeek"].min(), df["WorkHoursPerWeek"].max(), 100)
        axes_bq4[1].plot(x_line, p(x_line), color=COLOR_YES, linewidth=2,
                         label=f"Trend (r={df['WorkHoursPerWeek'].corr(df['Burnout']):.3f})")
        axes_bq4[1].set_xlabel("Jam Kerja per Minggu", fontsize=11)
        axes_bq4[1].set_ylabel("Burnout (0/1)", fontsize=11)
        axes_bq4[1].set_title("Trend Burnout vs Jam Kerja", fontsize=12, fontweight="bold")
        axes_bq4[1].legend()

        st.pyplot(fig_bq4)
        plt.close()

        corr_w = df["WorkHoursPerWeek"].corr(df["Burnout"])
        st.info(f"""
        **📌 Insight:**
        Korelasi Pearson WorkHoursPerWeek ↔ Burnout = **{corr_w:.4f}**
        Meskipun korelasinya relatif lemah secara linear, pola dari grafik bar
        menunjukkan burnout rate **meningkat konsisten** seiring bertambahnya jam kerja.
        Ini mengindikasikan hubungan yang nyata namun tidak semata-mata linear.
        """)

    with bq_tabs[4]:
        st.subheader("BQ5: Bagaimana kombinasi stres tinggi + jam kerja panjang mempengaruhi risiko?")

        stress_thresh = st.slider("Batas StressLevel 'tinggi':", 5, 9, 7)
        hours_thresh  = st.slider("Batas WorkHours 'panjang' (jam/minggu):", 40, 60, 50)

        g_high = df[(df["StressLevel"] >= stress_thresh) &
                    (df["WorkHoursPerWeek"] >= hours_thresh)]["Burnout"].mean() * 100
        g_low  = df[(df["StressLevel"] <  stress_thresh) &
                    (df["WorkHoursPerWeek"] <  hours_thresh)]["Burnout"].mean() * 100

        col1, col2, col3 = st.columns(3)
        with col1:
            n_high = len(df[(df["StressLevel"] >= stress_thresh) & (df["WorkHoursPerWeek"] >= hours_thresh)])
            st.metric(f"Burnout Rate (Stres≥{stress_thresh} & Jam≥{hours_thresh})",
                      f"{g_high:.1f}%", delta=f"n={n_high:,}")
        with col2:
            n_low = len(df[(df["StressLevel"] < stress_thresh) & (df["WorkHoursPerWeek"] < hours_thresh)])
            st.metric(f"Burnout Rate (Stres<{stress_thresh} & Jam<{hours_thresh})",
                      f"{g_low:.1f}%", delta=f"n={n_low:,}")
        with col3:
            st.metric("Perbedaan", f"{g_high - g_low:+.1f}%",
                      delta_color="inverse")

        # Hexbin plot
        fig_bq5, ax_bq5 = plt.subplots(figsize=(9, 6))
        hb = ax_bq5.hexbin(df["WorkHoursPerWeek"], df["StressLevel"],
                           C=df["Burnout"], gridsize=15,
                           cmap="RdYlGn_r", reduce_C_function=np.mean)
        plt.colorbar(hb, ax=ax_bq5, label="Rata-rata Burnout Rate")
        ax_bq5.axvline(hours_thresh, color="white", linestyle="--", linewidth=1.5,
                       label=f"Batas {hours_thresh} jam")
        ax_bq5.axhline(stress_thresh, color="cyan", linestyle="--", linewidth=1.5,
                       label=f"Batas Stres {stress_thresh}")
        ax_bq5.set_xlabel("Jam Kerja per Minggu", fontsize=11)
        ax_bq5.set_ylabel("Tingkat Stres", fontsize=11)
        ax_bq5.set_title("Burnout Rate: Jam Kerja vs Stres\n(Merah = burnout rate tinggi)",
                         fontsize=12, fontweight="bold")
        ax_bq5.legend(fontsize=9)
        st.pyplot(fig_bq5)
        plt.close()

    with bq_tabs[5]:
        st.subheader("BQ6: Faktor apa yang paling berpengaruh terhadap prediksi burnout?")
        if hasattr(model, "feature_importances_"):
            feat_imp = pd.DataFrame({
                "Fitur": FEATURES,
                "Importance": model.feature_importances_
            }).sort_values("Importance", ascending=True)

            fig_bq6, ax_bq6 = plt.subplots(figsize=(10, 7))
            colors_fi = ["#F44336" if v >= feat_imp["Importance"].quantile(0.75)
                         else "#FF9800" if v >= feat_imp["Importance"].quantile(0.5)
                         else "#4CAF50"
                         for v in feat_imp["Importance"]]
            ax_bq6.barh(feat_imp["Fitur"], feat_imp["Importance"], color=colors_fi)
            ax_bq6.set_xlabel("Feature Importance Score", fontsize=11)
            ax_bq6.set_title(f"Feature Importance — {model_name}\n"
                             "(Merah=Tinggi, Orange=Sedang, Hijau=Rendah)",
                             fontsize=12, fontweight="bold")
            st.pyplot(fig_bq6)
            plt.close()

            top3 = feat_imp.tail(3)["Fitur"].tolist()[::-1]
            st.success(f"""
            **📌 Insight — Top 3 Faktor Terpenting:**
            1. **{top3[0]}** — Faktor paling dominan dalam memprediksi burnout
            2. **{top3[1]}** — Faktor kedua terpenting
            3. **{top3[2]}** — Faktor ketiga terpenting

            Temuan ini dapat memandu HR untuk memprioritaskan monitoring
            terhadap faktor-faktor ini pada karyawan.
            """)
        else:
            st.warning("Model saat ini tidak mendukung feature importance. Gunakan Random Forest atau Gradient Boosting.")

    with bq_tabs[6]:
        st.subheader("BQ7: Apakah kepuasan kerja rendah berkorelasi dengan stres & burnout tinggi?")

        fig_bq7, axes_bq7 = plt.subplots(1, 2, figsize=(14, 5))

        # Scatter: Satisfaction vs Stress
        df_bq7 = df.copy()
        df_bq7["Status"] = df_bq7["Burnout"].map({0: "Tidak Burnout", 1: "Burnout"})
        for status, color in [("Tidak Burnout", COLOR_NO), ("Burnout", COLOR_YES)]:
            mask = df_bq7["Status"] == status
            axes_bq7[0].scatter(df_bq7.loc[mask, "SatisfactionLevel"],
                                df_bq7.loc[mask, "StressLevel"],
                                c=color, alpha=0.4, s=20, label=status)
        axes_bq7[0].set_xlabel("Kepuasan Kerja", fontsize=11)
        axes_bq7[0].set_ylabel("Tingkat Stres", fontsize=11)
        axes_bq7[0].set_title("Kepuasan vs Stres per Status Burnout", fontsize=12)
        axes_bq7[0].legend()

        # Grouped bar: Burnout rate per kelompok kepuasan
        bins_sat  = [0, 2, 3.5, 5]
        labels_sat = ["Rendah (1–2)", "Sedang (2–3.5)", "Tinggi (3.5–5)"]
        df_bq7["SatGroup"] = pd.cut(df_bq7["SatisfactionLevel"], bins=bins_sat, labels=labels_sat)
        br_sat = df_bq7.groupby("SatGroup", observed=True)["Burnout"].mean() * 100

        colors_sat = [COLOR_YES, COLOR_NO, "#4CAF50"]
        bars_bq7 = axes_bq7[1].bar(br_sat.index, br_sat.values,
                                   color=colors_sat, edgecolor="black")
        axes_bq7[1].set_ylabel("Burnout Rate (%)", fontsize=11)
        axes_bq7[1].set_title("Burnout Rate per Kelompok Kepuasan Kerja", fontsize=12)
        for bar, val in zip(bars_bq7, br_sat.values):
            axes_bq7[1].text(bar.get_x() + bar.get_width()/2, val + 0.1,
                             f"{val:.1f}%", ha="center", fontsize=11, fontweight="bold")

        plt.tight_layout()
        st.pyplot(fig_bq7)
        plt.close()

        corr_s = df["SatisfactionLevel"].corr(df["Burnout"])
        corr_st = df["StressLevel"].corr(df["Burnout"])
        col1, col2 = st.columns(2)
        with col1:
            st.metric("Korelasi Kepuasan ↔ Burnout", f"{corr_s:.4f}")
        with col2:
            st.metric("Korelasi Stres ↔ Burnout", f"{corr_st:.4f}")
        st.info("""
        **📌 Insight:**
        Karyawan dengan kepuasan kerja rendah (1–2) memiliki burnout rate tertinggi.
        Stres berkorelasi positif dengan burnout, sementara kepuasan berkorelasi negatif.
        Ini mengkonfirmasi hipotesis: kepuasan rendah → stres tinggi → risiko burnout meningkat.
        HR sebaiknya fokus pada program peningkatan kepuasan kerja sebagai intervensi preventif.
        """)

# =============================================================================
# HALAMAN: KUESIONER KEPUASAN
# =============================================================================

elif page == "😊 Kuesioner Kepuasan Kerja":

    st.title("😊 Kuesioner Kepuasan Kerja")

    st.markdown("""
    Kuesioner ini membantu mengevaluasi tingkat kepuasan kerja karyawan
    berdasarkan lingkungan kerja, beban kerja, dan work-life balance.
    """)

    q1 = st.slider("Saya merasa nyaman dengan lingkungan kerja saya", 1, 5, 3)
    q2 = st.slider("Saya puas dengan workload saat ini", 1, 5, 3)
    q3 = st.slider("Saya memiliki work-life balance yang baik", 1, 5, 3)
    q4 = st.slider("Saya merasa diapresiasi perusahaan", 1, 5, 3)

    avg_score = (q1 + q2 + q3 + q4) / 4

    st.markdown("---")

    st.metric("😊 Satisfaction Score", f"{avg_score:.2f}/5")

    if avg_score >= 4:
        st.success("Kepuasan kerja sangat baik.")
    elif avg_score >= 3:
        st.warning("Kepuasan kerja cukup baik namun perlu perhatian.")
    else:
        st.error("Kepuasan kerja rendah dan perlu evaluasi.")
        
# =============================================================================
# HALAMAN: KUESIONER STRESS
# =============================================================================

elif page == "😰 Kuesioner Tingkat Stres":

    st.title("😰 Kuesioner Tingkat Stres")

    st.markdown("""
    Kuesioner ini membantu mengukur tingkat stres kerja karyawan.
    """)

    s1 = st.slider("Saya merasa kelelahan saat bekerja", 1, 5, 3)
    s2 = st.slider("Saya sulit fokus saat bekerja", 1, 5, 3)
    s3 = st.slider("Saya sering merasa tertekan oleh deadline", 1, 5, 3)
    s4 = st.slider("Saya merasa energi cepat habis saat bekerja", 1, 5, 3)

    stress_score = (s1 + s2 + s3 + s4) / 4

    st.markdown("---")

    st.metric("😰 Stress Score", f"{stress_score:.2f}/5")

    if stress_score >= 4:
        st.error("Tingkat stres tinggi.")
    elif stress_score >= 3:
        st.warning("Tingkat stres sedang.")
    else:
        st.success("Tingkat stres relatif rendah.")

# =============================================================================
# HALAMAN 4: PREDIKSI INDIVIDU
# =============================================================================
# =============================================================================
# HALAMAN: PREDIKSI BURNOUT
# =============================================================================

elif page == "🤖 Prediksi Individu":

    st.title("🤖 Prediksi Risiko Burnout Karyawan")

    st.markdown("""
    Sistem ini digunakan untuk memprediksi risiko burnout karyawan berdasarkan:
    
    - Profil karyawan
    - Kondisi kerja
    - Tingkat stres
    - Tingkat kepuasan kerja
    
    serta memberikan rekomendasi AI wellness secara otomatis.
    """)

    st.markdown("---")

    # =========================================================
    # FORM INPUT
    # =========================================================

    col_form1, col_form2 = st.columns(2)

    with col_form1:

        st.subheader("📋 Data Profil")

        age = st.slider(
            "🎂 Usia",
            22,
            60,
            30
        )

        gender = st.radio(
            "👤 Gender",
            ["Male", "Female"],
            horizontal=True
        )

        job_role = st.selectbox(
            "💼 Job Role",
            sorted(df["JobRole"].unique().tolist())
        )

        experience = st.slider(
            "🏢 Pengalaman Kerja (tahun)",
            0,
            39,
            5
        )

    with col_form2:

        st.subheader("⚙️ Kondisi Kerja")

        work_hours = st.slider(
            "⏰ Jam Kerja per Minggu",
            30,
            70,
            45
        )

        remote = st.slider(
            "🏠 Remote Ratio (%)",
            0,
            100,
            50
        )

        satisfaction = st.slider(
            "😊 Satisfaction Level",
            1.0,
            5.0,
            3.0,
            step=0.1
        )

        stress = st.slider(
            "😰 Stress Level",
            1,
            10,
            5
        )

    st.markdown("---")

    predict_btn = st.button(
        "🔍 Analisis Risiko Burnout",
        type="primary",
        use_container_width=True
    )

    # =========================================================
    # PROSES PREDIKSI
    # =========================================================

    if predict_btn:

        # =====================================================
        # FEATURE ENGINEERING
        # =====================================================

        gender_enc = le_gender.transform([gender])[0]
        role_enc = le_role.transform([job_role])[0]

        stress_ratio = stress / (work_hours + 1)

        wl_score = satisfaction * (1 - remote / 100)

        high_risk = int(
            stress >= 7 and work_hours >= 50
        )

        senior = int(experience >= 10)

        stress_cat = (
            0 if stress <= 3
            else (1 if stress <= 6 else 2)
        )

        sat_inv = 5.0 - satisfaction

        input_data = pd.DataFrame([[
            age,
            experience,
            work_hours,
            remote,
            satisfaction,
            stress,
            gender_enc,
            role_enc,
            stress_ratio,
            wl_score,
            high_risk,
            senior,
            stress_cat,
            sat_inv
        ]], columns=FEATURES)

        # =====================================================
        # HYBRID BURNOUT SCORING SYSTEM
        # =====================================================
        input_scaled = scaler.transform(input_data)
        prediction = model.predict(input_scaled)[0]

        score = 0

        # stress contribution
        score += stress * 4

        # work hours contribution
        score += (work_hours / 70) * 20

        # satisfaction inverse contribution
        score += ((5 - satisfaction) / 5) * 25

        # remote imbalance
        if remote <= 20:
            score += 10

        # senior pressure
        if experience >= 10:
            score += 5

        # dangerous combination
        if stress >= 8 and work_hours >= 55:
            score += 15

        # model adjustment
        if prediction == 1:
            score += 10

        # final normalization
        burnout_prob = min(max(score, 5), 95)
                
                

        # =====================================================
        # RISK CLASSIFICATION
        # =====================================================

        if burnout_prob >= 70:

            risk_status = "🔴 Risiko Tinggi"

            risk_color = "#ef4444"

            risk_desc = """
            Karyawan berpotensi mengalami burnout berat.
            Dibutuhkan intervensi segera dari HR atau manajemen.
            """

        elif burnout_prob >= 40:

            risk_status = "🟡 Risiko Sedang"

            risk_color = "#f59e0b"

            risk_desc = """
            Kondisi kerja perlu dimonitor secara berkala
            agar tidak berkembang menjadi burnout serius.
            """

        else:

            risk_status = "🟢 Risiko Rendah"

            risk_color = "#10b981"

            risk_desc = """
            Kondisi kerja relatif stabil dan sehat.
            Tetap lakukan monitoring preventif secara rutin.
            """

        # =====================================================
        # HASIL PREDIKSI
        # =====================================================

        st.markdown("---")

        st.subheader("📊 Hasil Analisis Burnout")

        col1, col2, col3 = st.columns(3)

        with col1:

            st.markdown(
                f"""
                <div style="
                    background:{risk_color};
                    padding:20px;
                    border-radius:12px;
                    text-align:center;
                    color:white;
                ">
                    <h2>{risk_status}</h2>
                </div>
                """,
                unsafe_allow_html=True
            )

        with col2:

            st.metric(
                "🔥 Probabilitas Burnout",
                f"{burnout_prob:.1f}%"
            )

            st.progress(
                min(burnout_prob / 100, 1.0)
            )

        with col3:

            st.metric(
                "😊 Satisfaction",
                f"{satisfaction:.1f}/5"
            )

            st.metric(
                "😰 Stress Level",
                f"{stress}/10"
            )

        st.info(risk_desc)

        # =====================================================
        # VISUALISASI GAUGE
        # =====================================================

        fig_gauge, ax_gauge = plt.subplots(
            figsize=(8, 2.5)
        )

        ax_gauge.barh(
            ["Burnout Risk"],
            [100],
            color="#e5e7eb"
        )

        ax_gauge.barh(
            ["Burnout Risk"],
            [burnout_prob],
            color=risk_color
        )

        ax_gauge.set_xlim(0, 100)

        ax_gauge.set_title(
            f"Burnout Probability: {burnout_prob:.1f}%"
        )

        st.pyplot(fig_gauge)

        plt.close()

        # =========================================================
        # AI WELLNESS RECOMMENDATION
        # =========================================================

        st.markdown("---")

        st.subheader("🤖 AI Wellness Recommendation")

        ai_recommendation = []

        # STRESS
        if stress >= 8:

            ai_recommendation.append(
                "Lakukan mindfulness atau breathing exercise 10–15 menit setiap hari."
            )

            ai_recommendation.append(
                "Kurangi multitasking berlebihan agar fokus kerja lebih stabil."
            )

        elif stress >= 6:

            ai_recommendation.append(
                "Cobalah mengatur ulang prioritas kerja agar tekanan kerja lebih terkontrol."
            )

        # WORK HOURS
        if work_hours >= 55:

            ai_recommendation.append(
                "Kurangi lembur dan prioritaskan work-life balance."
            )

            ai_recommendation.append(
                "Hindari bekerja tanpa jeda terlalu lama."
            )

        elif work_hours >= 50:

            ai_recommendation.append(
                "Pantau jam kerja mingguan agar tetap dalam batas sehat."
            )

        # SATISFACTION
        if satisfaction <= 2:

            ai_recommendation.append(
                "Diskusikan hambatan kerja dengan HR atau atasan."
            )

            ai_recommendation.append(
                "Cari aktivitas kerja yang meningkatkan engagement."
            )

        elif satisfaction <= 3:

            ai_recommendation.append(
                "Evaluasi faktor yang menyebabkan kepuasan kerja menurun."
            )

        # REMOTE
        if remote <= 20:

            ai_recommendation.append(
                "Hybrid working dapat membantu meningkatkan fleksibilitas kerja."
            )

        # HIGH RISK
        if burnout_prob >= 75:

            ai_recommendation.append(
                "Disarankan mengikuti counseling session profesional."
            )

            ai_recommendation.append(
                "Kurangi tekanan kerja sementara untuk pemulihan mental."
            )

        # DEFAULT
        default_tips = [
            "Pastikan tidur cukup minimal 7 jam setiap hari.",
            "Lakukan aktivitas fisik ringan secara rutin.",
            "Jaga pola makan dan hidrasi selama bekerja.",
        ]

        while len(ai_recommendation) < 3:

            ai_recommendation.append(
                default_tips[len(ai_recommendation) % len(default_tips)]
            )

        # tampilkan rekomendasi
        for i, rec in enumerate(ai_recommendation[:5], start=1):

            st.info(f"💡 Recommendation {i}: {rec}")

        # =====================================================
        # TAMPILKAN REKOMENDASI
        # =====================================================

        for rec in ai_recommendation:

            st.info(f"💡 {rec}")

        # =====================================================
        # WELLNESS SUMMARY
        # =====================================================

        st.markdown("---")

        st.subheader("📌 Wellness Summary")

        summary_text = f"""

        Berdasarkan hasil analisis sistem:

        - Risiko burnout: {risk_status}
        - Probabilitas burnout: {burnout_prob:.1f}%
        - Stress level: {stress}/10
        - Satisfaction level: {satisfaction:.1f}/5
        - Jam kerja: {work_hours} jam/minggu

        Sistem menyarankan monitoring kondisi kerja secara berkala
        untuk menjaga kesehatan mental dan produktivitas kerja.
        """

        st.success(summary_text)

# =============================================================================
# HALAMAN: REMINDER
# =============================================================================

elif page == "⏰ Reminder Burnout Check":

    st.title("⏰ Reminder Burnout Check")

    st.markdown("""
    Fitur ini membantu perusahaan mengingatkan karyawan
    untuk melakukan burnout self-check secara berkala.
    """)

    reminder_days = st.selectbox(
        "Pilih interval reminder:",
        ["Setiap 3 Hari", "Setiap 7 Hari", "Setiap 14 Hari", "Setiap 30 Hari"]
    )

    email = st.text_input("Masukkan email karyawan")

    if st.button("🔔 Aktifkan Reminder"):

        if email:

            st.success(f"""
            Reminder burnout check berhasil diaktifkan.

            📧 Email: {email}
            ⏰ Interval: {reminder_days}
            """)

        else:

            st.error("Masukkan email terlebih dahulu.")

# =============================================================================
# HALAMAN 5: PERFORMA MODEL
# =============================================================================
elif page == "📈 Performa Model":
    st.title("📈 Performa & Evaluasi Model Machine Learning")
    st.markdown("---")

    st.subheader(f"🏆 Model Terpilih: {model_name}")
    st.markdown(f"""
    Model dipilih berdasarkan **AUC-ROC tertinggi** karena pada dataset imbalanced,
    AUC-ROC lebih informatif dibandingkan hanya accuracy semata. AUC-ROC mengukur
    kemampuan model membedakan kelas positif dan negatif secara keseluruhan.
    """)

    # Tabel performa
    st.subheader("📊 Perbandingan Semua Model")
    display_cols = ["Accuracy", "F1", "Precision", "Recall", "AUC-ROC"]
    results_display = results_df[display_cols].copy()
    results_display = results_display.style.highlight_max(axis=0, color="#d4f0d4")
    st.dataframe(results_display, use_container_width=True)

    # Visualisasi perbandingan model
    col_v1, col_v2 = st.columns(2)

    with col_v1:
        st.subheader("📊 Visualisasi Metrik per Model")
        metrics_sel = st.multiselect(
            "Pilih metrik:",
            ["Accuracy", "F1", "Precision", "Recall", "AUC-ROC"],
            default=["Accuracy", "F1", "AUC-ROC"]
        )
        if metrics_sel:
            fig_perf, ax_perf = plt.subplots(figsize=(9, 5))
            x     = np.arange(len(metrics_sel))
            width = 0.18
            for i, (name, row) in enumerate(results_df.iterrows()):
                vals = [float(row[m]) for m in metrics_sel]
                ax_perf.bar(x + i*width, vals, width, label=name, color=PALETTE[i])
            ax_perf.set_xticks(x + width * 1.5)
            ax_perf.set_xticklabels(metrics_sel)
            ax_perf.set_ylim(0, 1.15)
            ax_perf.legend(fontsize=8)
            ax_perf.set_title("Perbandingan Metrik Model", fontsize=12, fontweight="bold")
            st.pyplot(fig_perf)
            plt.close()

    with col_v2:
        st.subheader("🎯 Feature Importance")
        if hasattr(model, "feature_importances_"):
            feat_imp = pd.DataFrame({
                "Fitur": FEATURES,
                "Importance": model.feature_importances_
            }).sort_values("Importance", ascending=True)

            fig_fi, ax_fi = plt.subplots(figsize=(9, 7))
            colors_fi = ["#F44336" if v >= feat_imp["Importance"].quantile(0.75)
                         else "#FF9800" if v >= feat_imp["Importance"].quantile(0.5)
                         else "#4CAF50"
                         for v in feat_imp["Importance"]]
            ax_fi.barh(feat_imp["Fitur"], feat_imp["Importance"], color=colors_fi)
            ax_fi.set_xlabel("Importance Score")
            ax_fi.set_title("Feature Importance Score", fontsize=12, fontweight="bold")
            legend_fi = [
                mpatches.Patch(color="#F44336", label="Tinggi (top 25%)"),
                mpatches.Patch(color="#FF9800", label="Sedang (50–75%)"),
                mpatches.Patch(color="#4CAF50", label="Rendah (bottom 50%)"),
            ]
            ax_fi.legend(handles=legend_fi, fontsize=9)
            st.pyplot(fig_fi)
            plt.close()

    # Interpretasi
    st.subheader("💡 Interpretasi Hasil")
    st.markdown("""
    **Insight dari hasil evaluasi model:**

    - Model tree-based (Random Forest, Gradient Boosting) mencapai performa
      sangat tinggi pada dataset ini, mengindikasikan pola burnout yang cukup
      jelas dan dapat diprediksi dari fitur yang tersedia.

    - **Logistic Regression** tetap memiliki AUC-ROC kompetitif dan lebih
      interpretatif — cocok untuk digunakan ketika transparansi model diperlukan
      oleh manajemen.

    - Fitur rekayasa seperti `StressWorkRatio` dan `HighRiskFlag` terbukti
      meningkatkan kualitas prediksi dengan menangkap interaksi antar fitur.

    - Pada implementasi nyata, disarankan menggunakan **Random Forest** atau
      **Gradient Boosting** untuk performa optimal dengan pemantauan berkala
      terhadap distribusi data baru (data drift monitoring).
    """)


# =============================================================================
# HALAMAN 6: A/B TESTING
# =============================================================================

elif page == "🧪 A/B Testing":

    st.title("🧪 A/B Testing — Validasi Statistik")

    st.markdown("""
    A/B Testing digunakan untuk memvalidasi secara statistik apakah
    perbedaan performa model dan kondisi burnout karyawan benar-benar
    signifikan secara statistik atau hanya kebetulan.
    
    **Metode:** Independent t-test  
    **Threshold Signifikansi:** α = 0.05
    """)

    st.markdown("---")

    # =========================================================================
    # COMPUTE CV SCORES
    # =========================================================================

    @st.cache_data(show_spinner="Menghitung Cross Validation...")
    def compute_cv_scores():

        from sklearn.model_selection import (
            cross_val_score,
            StratifiedKFold
        )

        from sklearn.linear_model import LogisticRegression

        from sklearn.ensemble import (
            RandomForestClassifier,
            GradientBoostingClassifier
        )

        from sklearn.preprocessing import StandardScaler
        from sklearn.preprocessing import LabelEncoder

        # =====================================================
        # COPY DATA
        # =====================================================

        df_m = df.copy()

        # =====================================================
        # ENCODING
        # =====================================================

        le_g = LabelEncoder()
        le_r = LabelEncoder()

        df_m["Gender_enc"] = le_g.fit_transform(
            df_m["Gender"]
        )

        df_m["JobRole_enc"] = le_r.fit_transform(
            df_m["JobRole"]
        )

        # =====================================================
        # FEATURE ENGINEERING
        # =====================================================

        df_m["StressWorkRatio"] = (
            df_m["StressLevel"]
            / (df_m["WorkHoursPerWeek"] + 1)
        )

        df_m["WorkLifeScore"] = (
            df_m["SatisfactionLevel"]
            * (1 - df_m["RemoteRatio"] / 100)
        )

        df_m["HighRiskFlag"] = (
            (
                (df_m["StressLevel"] >= 7)
                &
                (df_m["WorkHoursPerWeek"] >= 50)
            ).astype(int)
        )

        df_m["SeniorEmployee"] = (
            df_m["Experience"] >= 10
        ).astype(int)

        df_m["StressCategory"] = pd.cut(
            df_m["StressLevel"],
            bins=[0, 3, 6, 10],
            labels=[0, 1, 2]
        ).astype(int)

        df_m["SatisfactionInverse"] = (
            5.0 - df_m["SatisfactionLevel"]
        )

        # =====================================================
        # FEATURES
        # =====================================================

        FEATS = [
    "Age",
    "Experience",
    "WorkHoursPerWeek",
    "RemoteRatio",
    "SatisfactionLevel",
    "StressLevel",
    "Gender_enc",
    "JobRole_enc"
        ]

        X = df_m[FEATS]
        y = df_m["Burnout"]

        # =====================================================
        # SCALING
        # =====================================================

        scaler_ab = StandardScaler()

        X_scaled = X

        # =====================================================
        # CROSS VALIDATION
        # =====================================================

        cv_strategy = StratifiedKFold(
            n_splits=5,
            shuffle=True,
            random_state=42
        )

        # =====================================================
        # MODELS
        # =====================================================

        lr_model = LogisticRegression(
            max_iter=1000,
            random_state=42,
            class_weight="balanced"
        )

        rf_model = RandomForestClassifier(
            n_estimators=200,
            max_depth=8,
            min_samples_leaf=5,
            random_state=42,
            class_weight="balanced"
        )

        gb_model = GradientBoostingClassifier(
            n_estimators=100,
            random_state=42
        )

        # =====================================================
        # CV SCORES
        # =====================================================

        cv_lr = cross_val_score(
            lr_model,
            X_scaled,
            y,
            cv=cv_strategy,
            scoring="f1"
        )

        cv_rf = cross_val_score(
            rf_model,
            X_scaled,
            y,
            cv=cv_strategy,
            scoring="f1"
        )

        cv_gb = cross_val_score(
            gb_model,
            X_scaled,
            y,
            cv=cv_strategy,
            scoring="f1"
        )

        return cv_lr, cv_rf, cv_gb

    # =========================================================================
    # RUN CV
    # =========================================================================

    cv_lr, cv_rf, cv_gb = compute_cv_scores()

    # =========================================================================
    # TABS
    # =========================================================================

    tab1, tab2, tab3 = st.tabs([
        "📊 LR vs RF",
        "📈 RF vs GB",
        "🔥 Work Hours vs Burnout"
    ])

    # =========================================================================
    # TAB 1
    # =========================================================================

    with tab1:

        st.subheader(
            "A/B Test 1 — Logistic Regression vs Random Forest"
        )

        t1, p1 = stats.ttest_ind(
            cv_lr,
            cv_rf
        )

        col1, col2 = st.columns([1, 2])

        with col1:

            st.metric(
                "LR Mean F1",
                f"{cv_lr.mean():.4f}"
            )

            st.metric(
                "RF Mean F1",
                f"{cv_rf.mean():.4f}"
            )

            st.metric(
                "p-value",
                f"{p1:.8f}"
            )

            if p1 < 0.05:

                winner = (
                    "Random Forest"
                    if cv_rf.mean() > cv_lr.mean()
                    else "Logistic Regression"
                )

                st.error(
                    f"✅ Perbedaan signifikan\n\n🏆 Winner: {winner}"
                )

            else:

                st.success(
                    "❌ Tidak ada perbedaan signifikan"
                )

        with col2:

            fig1, ax1 = plt.subplots(
                figsize=(8, 5)
            )

            bp1 = ax1.boxplot(
                [cv_lr, cv_rf],
                labels=[
                    "Logistic\nRegression",
                    "Random\nForest"
                ],
                patch_artist=True
            )

            colors = ["#3b82f6", "#10b981"]

            for patch, color in zip(
                bp1["boxes"],
                colors
            ):
                patch.set_facecolor(color)
                patch.set_alpha(0.7)

            ax1.set_ylabel("F1 Score")
            ax1.set_title(
                f"LR vs RF\np-value = {p1:.4f}"
            )

            ax1.grid(alpha=0.3)

            st.pyplot(fig1)

            plt.close()

    # =========================================================================
    # TAB 2
    # =========================================================================

    with tab2:

        st.subheader(
            "A/B Test 2 — Random Forest vs Gradient Boosting"
        )

        t2, p2 = stats.ttest_ind(
            cv_rf,
            cv_gb
        )

        col1, col2 = st.columns([1, 2])

        with col1:

            st.metric(
                "RF Mean F1",
                f"{cv_rf.mean():.4f}"
            )

            st.metric(
                "GB Mean F1",
                f"{cv_gb.mean():.4f}"
            )

            st.metric(
                "p-value",
                f"{p2:.6f}"
            )

            if p2 < 0.05:

                winner2 = (
                    "Gradient Boosting"
                    if cv_gb.mean() > cv_rf.mean()
                    else "Random Forest"
                )

                st.error(
                    f"✅ Perbedaan signifikan\n\n🏆 Winner: {winner2}"
                )

            else:

                st.success(
                    "❌ Tidak ada perbedaan signifikan"
                )

        with col2:

            fig2, ax2 = plt.subplots(
                figsize=(8, 5)
            )

            bp2 = ax2.boxplot(
                [cv_rf, cv_gb],
                labels=[
                    "Random\nForest",
                    "Gradient\nBoosting"
                ],
                patch_artist=True
            )

            colors2 = ["#10b981", "#f59e0b"]

            for patch, color in zip(
                bp2["boxes"],
                colors2
            ):
                patch.set_facecolor(color)
                patch.set_alpha(0.7)

            ax2.set_ylabel("F1 Score")

            ax2.set_title(
                f"RF vs GB\np-value = {p2:.4f}"
            )

            ax2.grid(alpha=0.3)

            st.pyplot(fig2)

            plt.close()

    # =========================================================================
    # TAB 3
    # =========================================================================

    with tab3:

        st.subheader(
            "A/B Test 3 — Work Hours vs Burnout"
        )

        threshold_ab = st.slider(
            "Batas jam kerja tinggi",
            40,
            60,
            50
        )

        low_group = df[
            df["WorkHoursPerWeek"] < threshold_ab
        ]["Burnout"]

        high_group = df[
            df["WorkHoursPerWeek"] >= threshold_ab
        ]["Burnout"]

        t3, p3 = stats.ttest_ind(
            low_group,
            high_group
        )

        col1, col2 = st.columns([1, 2])

        with col1:

            low_rate = low_group.mean() * 100
            high_rate = high_group.mean() * 100

            st.metric(
                "Burnout Rate (Low Hours)",
                f"{low_rate:.2f}%"
            )

            st.metric(
                "Burnout Rate (High Hours)",
                f"{high_rate:.2f}%"
            )

            st.metric(
                "p-value",
                f"{p3:.6f}"
            )

            if p3 < 0.05:

                st.error(
                    "✅ Jam kerja tinggi berpengaruh signifikan terhadap burnout"
                )

            else:

                st.success(
                    "❌ Tidak ada pengaruh signifikan"
                )

        with col2:

            fig3, ax3 = plt.subplots(
                figsize=(8, 5)
            )

            labels = [
                f"< {threshold_ab} jam",
                f"≥ {threshold_ab} jam"
            ]

            rates = [
                low_rate,
                high_rate
            ]

            bars = ax3.bar(
                labels,
                rates,
                color=["#3b82f6", "#ef4444"]
            )

            for bar, val in zip(bars, rates):

                ax3.text(
                    bar.get_x() + bar.get_width()/2,
                    val + 0.5,
                    f"{val:.2f}%",
                    ha="center",
                    fontsize=11,
                    fontweight="bold"
                )

            ax3.set_ylabel("Burnout Rate (%)")

            ax3.set_title(
                f"Burnout Rate Comparison\np-value = {p3:.4f}"
            )

            ax3.grid(alpha=0.3)

            st.pyplot(fig3)

            plt.close()

# ── Footer ─────────────────────────────────────────────────────────────────────
st.markdown("---")
st.markdown(
    "<div style='text-align:center; color:gray; font-size:0.85em;'>"
    "🔥 Burnout Risk Prediction System | Capstone Project Coding Camp 2026 "
    "× DBS Foundation | CC26-PSU335 | Tema: Healthy Lives & Well-being"
    "</div>",
    unsafe_allow_html=True
)
