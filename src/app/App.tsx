import React, { useState, useEffect } from "react";
import type { ReactNode } from "react";
import axios from "axios";
import {
  Brain, Activity, Home, ClipboardList, Clock, User, LogOut,
  ChevronRight, ChevronLeft, ArrowRight, Heart, Zap, BookOpen,
  Star, AlertTriangle, CheckCircle2, TrendingUp, BarChart2,
  Sparkles, Target, Moon, Wind, Coffee, Shield,
} from "lucide-react";
import { supabase } from "../lib/supabase";

// ==================== API Clients ====================
const API_BASE = "http://localhost:5000/api";
const FASTAPI_URL = "https://apiburnout-production.up.railway.app/predict";

const apiClient = axios.create({ baseURL: API_BASE });

// Helper: Ambil token dari Supabase
const getToken = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
};

type Screen =
  | "landing" | "register" | "login" | "questionnaire"
  | "dashboard" | "assessment" | "loading" | "result" | "recommendation" | "history" | "profile";

interface AssessmentData {
  stress: number;
  workload: number;
  workLifeBalance: number;
  jobSatisfaction: number;
}

interface ProfileData {
  age: string;
  gender: string;
  role: string;
  experience: string;
  remoteRatio: string;
}

// Konversi ke format FastAPI (sesuai dengan model temanmu)
const mapToMLInput = (assessment: AssessmentData, profile: ProfileData) => {
  const ageNum = parseInt(profile.age) || 35;
  const expNum = parseInt(profile.experience) || 10;
  const remoteNum = parseInt(profile.remoteRatio) / 100 || 0.5;

  // Encoding gender
  let genderEnc = 2;
  if (profile.gender === "Female") genderEnc = 1;
  else if (profile.gender === "Male") genderEnc = 0;

  // Encoding job role (umum)
  let jobRoleEnc = 5;
  if (profile.role === "Manager") jobRoleEnc = 1;
  else if (profile.role === "Supervisor") jobRoleEnc = 2;
  else if (profile.role === "Staff") jobRoleEnc = 3;
  else if (profile.role === "Freelancer") jobRoleEnc = 4;

  const seniorEmployee = expNum > 10 ? 1 : 0;
  const stressLevelNum = assessment.stress * 10;
  const satisfactionLevelNum = assessment.jobSatisfaction * 20;
  const workLifeScoreNum = assessment.workLifeBalance * 20;
  const stressWorkRatio = assessment.stress / assessment.workload;
  const stressCategory = assessment.stress > 7 ? 2 : (assessment.stress > 4 ? 1 : 0);
  const satisfactionInverse = 100 - satisfactionLevelNum;

  return {
    Age: ageNum,
    Experience: expNum,
    Gender_enc: genderEnc,
    HighRiskFlag: 0,
    JobRole_enc: jobRoleEnc,
    RemoteRatio: remoteNum,
    SatisfactionLevel: satisfactionLevelNum,
    StressLevel: stressLevelNum,
    StressWorkRatio: stressWorkRatio,
    WorkLifeScore: workLifeScoreNum,
    SeniorEmployee: seniorEmployee,
    StressCategory: stressCategory,
    SatisfactionInverse: satisfactionInverse,
  };
};

// ─── Risk helpers ─────────────────────────────────────────────────────────────
function riskInfo(score: number) {
  if (score < 35)
    return {
      label: "Low Risk", color: "#10b981",
      bg: "bg-emerald-50", text: "text-emerald-600",
      badge: "bg-emerald-100 text-emerald-700", border: "border-emerald-200",
    };
  if (score < 65)
    return {
      label: "Moderate Risk", color: "#f59e0b",
      bg: "bg-amber-50", text: "text-amber-600",
      badge: "bg-amber-100 text-amber-700", border: "border-amber-200",
    };
  return {
    label: "High Risk", color: "#ef4444",
    bg: "bg-red-50", text: "text-red-600",
    badge: "bg-red-100 text-red-700", border: "border-red-200",
  };
}

// ─── Burnout Gauge ─────────────────────────────────────────────────────────────
function BurnoutGauge({ score, size = "md" }: { score: number; size?: "sm" | "md" | "lg" }) {
  const cx = 100, cy = 100, R = 78, sw = size === "lg" ? 20 : 16;
  const angle = ((180 + score * 1.8) * Math.PI) / 180;
  const ex = cx + R * Math.cos(angle);
  const ey = cy + R * Math.sin(angle);
  const la = score > 50 ? 1 : 0;
  const risk = riskInfo(score);
  const sizeClass = size === "lg" ? "w-72" : size === "sm" ? "w-44" : "w-60";

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 120" className={`${sizeClass} h-auto`}>
        <path
          d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
          fill="none" stroke="#e2e8f0" strokeWidth={sw} strokeLinecap="round"
        />
        {score > 0 && (
          <path
            d={`M ${cx - R} ${cy} A ${R} ${R} 0 ${la} 1 ${ex} ${ey}`}
            fill="none" stroke={risk.color} strokeWidth={sw} strokeLinecap="round"
          />
        )}
        <text
          x={cx} y={cy - 6} textAnchor="middle" fill="#0f172a"
          style={{ fontSize: 30, fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          {score}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="#94a3b8" style={{ fontSize: 11 }}>
          / 100
        </text>
      </svg>
      <span className={`font-bold mt-1 ${risk.text} ${size === "lg" ? "text-xl" : "text-base"}`}>
        {risk.label}
      </span>
    </div>
  );
}

// ─── Star Rating ──────────────────────────────────────────────────────────────
function StarRating({
  value, onChange, label,
}: { value: number; onChange: (v: number) => void; label: string }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="space-y-3">
      <p className="font-semibold text-slate-700">{label}</p>
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(i)}
            className="transition-transform hover:scale-110 active:scale-95"
          >
            <Star
              className={`w-10 h-10 transition-colors ${
                i <= (hover || value) ? "fill-amber-400 text-amber-400" : "text-slate-200"
              }`}
            />
          </button>
        ))}
        <span className="ml-1 text-sm font-bold text-slate-400">{value}/5</span>
      </div>
      <p className="text-xs text-slate-400">
        {value === 1 ? "Very poor" : value === 2 ? "Below average" : value === 3 ? "Average" : value === 4 ? "Good" : "Excellent"}
      </p>
    </div>
  );
}

// ─── Slider Input ─────────────────────────────────────────────────────────────
function SliderInput({
  label, value, onChange, lowLabel = "Low", highLabel = "High",
}: {
  label: string; value: number; onChange: (v: number) => void;
  lowLabel?: string; highLabel?: string;
}) {
  const pct = ((value - 1) / 9) * 100;
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="font-semibold text-slate-700">{label}</p>
        <span className="text-primary font-extrabold text-xl leading-none">
          {value}<span className="text-sm font-normal text-slate-400">/10</span>
        </span>
      </div>
      <input
        type="range" min={1} max={10} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        style={{
          background: `linear-gradient(to right, #0891b2 0%, #0891b2 ${pct}%, #e2e8f0 ${pct}%, #e2e8f0 100%)`,
        }}
      />
      <div className="flex justify-between text-xs text-slate-400">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}

// ─── Form Field ───────────────────────────────────────────────────────────────
function Field({
  label, type = "text", placeholder, value, onChange, options = []
}: {
  label: string; type?: string; placeholder?: string;
  value: string; onChange: (v: string) => void;
  options?: Array<{ value: string; label: string }>;
}) {
  if (type === "select" && options.length > 0) {
    return (
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-slate-700">{label}</label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-3 bg-slate-50 border border-border rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
        >
          <option value="">Select {label.toLowerCase()}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    );
  }
  
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 bg-slate-50 border border-border rounded-xl text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
      />
    </div>
  );
}

// ─── Auth Layout ──────────────────────────────────────────────────────────────
function AuthLayout({ children, title, subtitle }: { children: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-teal-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-cyan-200 mb-5">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800">{title}</h1>
          <p className="text-slate-500 text-sm mt-2">{subtitle}</p>
        </div>
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-100/80 p-8 border border-border">
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "assessment", label: "Assessment", icon: ClipboardList },
  { id: "history", label: "History", icon: Clock },
  { id: "profile", label: "Profile", icon: User },
];

function Sidebar({ active, navigate }: { active: string; navigate: (s: Screen) => void }) {
  return (
    <aside className="w-64 bg-white border-r border-border flex flex-col min-h-screen flex-shrink-0">
      <div className="px-6 py-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-sm shadow-cyan-200">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-extrabold text-slate-800 leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              BurnoutAI
            </div>
            <div className="text-xs text-slate-400 leading-tight">Health Platform</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-5 space-y-1">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => navigate(id as Screen)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              active === id
                ? "bg-primary text-white shadow-sm shadow-cyan-200"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            }`}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {label}
          </button>
        ))}
      </nav>
      <div className="px-3 py-4 border-t border-border">
        <button
          onClick={() => navigate("landing")}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 1: Landing Page
// ─────────────────────────────────────────────────────────────────────────────
function LandingPage({ navigate }: { navigate: (s: Screen) => void }) {
  const features = [
    { icon: Brain, title: "AI-Powered Analysis", desc: "Advanced ML models trained on 50K+ professional profiles detect burnout patterns weeks before crisis." },
    { icon: Activity, title: "Real-time Monitoring", desc: "Continuous tracking of mental and physical wellbeing metrics with personalized trend dashboards." },
    { icon: Shield, title: "Clinically Validated", desc: "Built on evidence-based assessments developed in partnership with leading occupational psychologists." },
    { icon: Heart, title: "Personalized Care Plans", desc: "Receive actionable, tailored recommendations based on your unique stress profile and work patterns." },
  ];

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center"><Brain className="w-4 h-4 text-white" /></div>
            <span className="font-extrabold text-slate-800" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>BurnoutAI</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("login")} className="px-5 py-2 text-sm font-semibold text-slate-600 hover:text-primary">Login</button>
            <button onClick={() => navigate("register")} className="px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-cyan-700 shadow-sm shadow-cyan-200">Get Started</button>
          </div>
        </div>
      </nav>
      <section className="pt-28 pb-20 px-6 bg-gradient-to-br from-sky-50 via-white to-teal-50/60">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 bg-cyan-50 border border-cyan-100 text-cyan-700 text-xs font-bold px-4 py-2 rounded-full uppercase tracking-wide">
              <Sparkles className="w-3.5 h-3.5" /> AI-Powered Burnout Prevention
            </div>
            <h1 className="text-5xl lg:text-6xl font-extrabold text-slate-900 leading-[1.1]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Detect & Prevent<br /><span className="text-primary">Burnout</span> Before<br />It Happens
            </h1>
            <p className="text-lg text-slate-500 leading-relaxed max-w-lg">BurnoutAI uses machine learning to analyze your stress patterns and predict burnout risk — empowering professionals to take proactive care of their mental wellbeing.</p>
            <div className="flex flex-wrap gap-4">
              <button onClick={() => navigate("register")} className="px-8 py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-cyan-700 shadow-lg shadow-cyan-200 flex items-center gap-2 text-sm">Start Free Assessment <ArrowRight className="w-4 h-4" /></button>
              <button onClick={() => navigate("login")} className="px-8 py-3.5 bg-white text-slate-700 font-bold rounded-xl hover:bg-slate-50 border border-border shadow-sm text-sm">Sign In</button>
            </div>
            <div className="flex flex-wrap items-center gap-6 text-sm text-slate-500">
              {["Free to use", "No credit card", "Clinically validated"].map((item) => (<div key={item} className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" />{item}</div>))}
            </div>
          </div>
          <div className="relative flex justify-center items-center">
            <div className="relative w-[400px] h-[400px]">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-100/70 to-teal-100/70 rounded-full" />
              <div className="absolute inset-6 border-2 border-cyan-200/60 rounded-full" />
              <div className="absolute inset-12 border border-teal-200/40 rounded-full" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-white rounded-3xl p-7 shadow-2xl shadow-cyan-100 text-center space-y-4 w-52">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary to-teal-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-cyan-200"><Brain className="w-9 h-9 text-white" /></div>
                  <div><div className="text-4xl font-extrabold text-slate-800">72<span className="text-base font-normal text-slate-400">%</span></div><div className="text-xs text-slate-500 mt-1">Burnout Risk Detected</div></div>
                  <div className="w-full bg-slate-100 rounded-full h-2"><div className="bg-amber-400 h-2 rounded-full" style={{ width: "72%" }} /></div>
                  <div className="bg-amber-50 text-amber-600 text-xs font-bold px-3 py-1.5 rounded-full border border-amber-100">Moderate Risk</div>
                </div>
              </div>
              <div className="absolute top-8 -left-6 bg-white rounded-2xl px-4 py-2.5 shadow-lg text-sm font-semibold text-slate-700 flex items-center gap-2 border border-border"><Heart className="w-4 h-4 text-red-400" /> Wellbeing Score</div>
              <div className="absolute bottom-12 -right-8 bg-white rounded-2xl px-4 py-2.5 shadow-lg text-sm font-semibold text-slate-700 flex items-center gap-2 border border-border"><TrendingUp className="w-4 h-4 text-emerald-500" /> Improving</div>
              <div className="absolute top-1/2 -right-10 -translate-y-1/2 bg-emerald-500 rounded-2xl px-3.5 py-2 shadow-lg text-white text-xs font-bold">AI Active</div>
              <div className="absolute top-1/2 -left-8 -translate-y-1/2 bg-primary rounded-2xl px-3.5 py-2 shadow-lg text-white text-xs font-bold">Real-time</div>
            </div>
          </div>
        </div>
      </section>
      <section className="py-10 border-y border-border bg-white">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[{ v: "50K+", l: "Professionals" }, { v: "94%", l: "Prediction Accuracy" }, { v: "3.2M", l: "Assessments Completed" }, { v: "67%", l: "Burnout Reduction Rate" }].map(({ v, l }) => (<div key={l}><div className="text-3xl font-extrabold text-primary">{v}</div><div className="text-sm text-slate-500 mt-1">{l}</div></div>))}
        </div>
      </section>
      <section className="py-24 px-6 bg-gradient-to-b from-white to-sky-50/80">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16"><h2 className="text-4xl font-extrabold text-slate-900">Everything you need to <span className="text-primary">prevent burnout</span></h2><p className="text-lg text-slate-500 max-w-2xl mx-auto">Our platform combines clinical expertise with AI to give you the most accurate burnout risk assessment available.</p></div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl p-6 border border-border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all space-y-4 group">
                <div className="w-12 h-12 bg-cyan-50 group-hover:bg-primary rounded-xl flex items-center justify-center transition-colors"><Icon className="w-6 h-6 text-primary group-hover:text-white transition-colors" /></div>
                <h3 className="font-bold text-slate-800">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16"><h2 className="text-4xl font-extrabold text-slate-900">How it works</h2></div>
          <div className="grid md:grid-cols-3 gap-8">
            {[{ step: "01", icon: ClipboardList, title: "Take the Assessment", desc: "Answer a short, research-backed questionnaire about your work environment and mental state." },
              { step: "02", icon: Brain, title: "AI Analyzes Your Data", desc: "Our model processes 50+ clinical indicators to build your personalized burnout risk profile." },
              { step: "03", icon: Sparkles, title: "Get Your Action Plan", desc: "Receive targeted, evidence-based recommendations to protect your wellbeing immediately." }].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="relative text-center space-y-4 p-6">
                <div className="text-6xl font-extrabold text-slate-100">{step}</div>
                <div className="w-14 h-14 bg-gradient-to-br from-primary to-teal-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-cyan-100 -mt-6"><Icon className="w-7 h-7 text-white" /></div>
                <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="py-24 px-6 bg-gradient-to-br from-primary to-teal-600">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-4xl font-extrabold text-white">Ready to take control of your wellbeing?</h2>
          <p className="text-cyan-100 text-lg">Join thousands of professionals who trust BurnoutAI to protect their mental health.</p>
          <button onClick={() => navigate("register")} className="px-10 py-4 bg-white text-primary font-bold rounded-xl hover:bg-cyan-50 transition-colors shadow-xl text-lg">Start Your Free Assessment</button>
        </div>
      </section>
      <footer className="py-8 border-t border-border bg-white">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2"><div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center"><Brain className="w-3.5 h-3.5 text-white" /></div><span className="font-bold text-slate-700 text-sm">BurnoutAI</span></div>
          <span className="text-sm text-slate-400">© 2026 BurnoutAI Health Technologies. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 2: Register Page (dengan Supabase Auth)
// ─────────────────────────────────────────────────────────────────────────────
function RegisterPage({ navigate, setUserName }: { navigate: (s: Screen) => void; setUserName: (n: string) => void }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { full_name: form.name } }
      });
      if (error) throw error;
      if (form.name.trim()) setUserName(form.name.trim());
      navigate("questionnaire");
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <AuthLayout title="Create your account" subtitle="Start your burnout prevention journey today">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="Full Name" placeholder="John Doe" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <Field label="Email Address" type="email" placeholder="you@example.com" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
        <Field label="Password" type="password" placeholder="Create a strong password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
        <button type="submit" disabled={loading} className="w-full py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-cyan-700 shadow-lg shadow-cyan-100 disabled:opacity-50">
          {loading ? "Creating account..." : "Create Account"}
        </button>
        <p className="text-center text-sm text-slate-500">Already have an account? <button type="button" onClick={() => navigate("login")} className="text-primary font-bold hover:underline">Sign in</button></p>
      </form>
    </AuthLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 3: Login Page (dengan Supabase Auth)
// ─────────────────────────────────────────────────────────────────────────────
function LoginPage({ navigate }: { navigate: (s: Screen) => void }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });
      if (error) throw error;
      navigate("dashboard");
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your BurnoutAI account">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="Email Address" type="email" placeholder="you@example.com" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
        <Field label="Password" type="password" placeholder="Enter your password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
        <button type="submit" disabled={loading} className="w-full py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-cyan-700 shadow-lg shadow-cyan-100 disabled:opacity-50">
          {loading ? "Signing in..." : "Sign In"}
        </button>
        <p className="text-center text-sm text-slate-500">Don't have an account? <button type="button" onClick={() => navigate("register")} className="text-primary font-bold hover:underline">Register free</button></p>
      </form>
    </AuthLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 4: General Questionnaire
// ─────────────────────────────────────────────────────────────────────────────
function QuestionnairePage({ navigate, onSave }: { navigate: (s: Screen) => void; onSave: (data: ProfileData) => void }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<ProfileData>({
    age: "", gender: "", role: "", experience: "", remoteRatio: "40",
  });
  const STEPS = ["Basic Profile", "Work Config", "Review"];
  const totalSteps = 3;

  const roleOptions = [
    { value: "Manager", label: "Manager" },
    { value: "Supervisor", label: "Supervisor" },
    { value: "Staff", label: "Staff" },
    { value: "Freelancer", label: "Freelancer" },
    { value: "Entrepreneur", label: "Entrepreneur" },
    { value: "Student", label: "Student" },
    { value: "Other", label: "Other" },
  ];

  const genderOptions = [
    { value: "Male", label: "Male" },
    { value: "Female", label: "Female" },
    { value: "Prefer not to say", label: "Prefer not to say" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-teal-50 flex items-center justify-center p-6">
      <div className="w-full max-w-xl">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mx-auto shadow-lg shadow-cyan-200 mb-4"><Brain className="w-6 h-6 text-white" /></div>
          <h1 className="text-2xl font-extrabold text-slate-800">General Profile Setup</h1>
          <p className="text-slate-500 text-sm mt-1.5">Help us personalize your burnout risk model</p>
        </div>
        <div className="flex items-center mb-8 px-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center" style={{ flex: i < STEPS.length - 1 ? "1" : "0 0 auto" }}>
              <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${i + 1 < step ? "bg-emerald-500 text-white" : i + 1 === step ? "bg-primary text-white shadow-md shadow-cyan-200" : "bg-slate-100 text-slate-400"}`}>
                  {i + 1 < step ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
                </div>
                <span className={`text-xs font-semibold whitespace-nowrap ${i + 1 === step ? "text-primary" : "text-slate-400"}`}>{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-3 mb-5 rounded-full ${i + 1 < step ? "bg-emerald-400" : "bg-slate-200"}`} />}
            </div>
          ))}
        </div>
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-100/80 border border-border p-8">
          {step === 1 && (
            <div className="space-y-5">
              <div><h2 className="text-lg font-bold text-slate-800">Basic Profile</h2><p className="text-sm text-slate-400 mt-0.5">Tell us a bit about yourself</p></div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Age" type="number" placeholder="e.g. 34" value={form.age} onChange={(v) => setForm({ ...form, age: v })} />
                <Field label="Gender" type="select" value={form.gender} onChange={(v) => setForm({ ...form, gender: v })} options={genderOptions} />
                <div className="col-span-2">
                  <Field label="Job Role" type="select" value={form.role} onChange={(v) => setForm({ ...form, role: v })} options={roleOptions} />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <button onClick={() => setStep(2)} className="px-6 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-cyan-700 flex items-center gap-2">
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          
          {step === 2 && (
            <div className="space-y-5">
              <div><h2 className="text-lg font-bold text-slate-800">Work Configuration</h2><p className="text-sm text-slate-400 mt-0.5">Your current work environment</p></div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Experience (years)" type="number" placeholder="e.g. 8" value={form.experience} onChange={(v) => setForm({ ...form, experience: v })} />
                <Field label="Remote Work Ratio (%)" type="number" placeholder="e.g. 40" value={form.remoteRatio} onChange={(v) => setForm({ ...form, remoteRatio: v })} />
              </div>
              <div className="flex justify-between pt-4">
                <button onClick={() => setStep(1)} className="px-6 py-2.5 border border-border text-slate-600 font-semibold rounded-xl hover:bg-slate-50 flex items-center gap-2">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={() => setStep(3)} className="px-6 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-cyan-700 flex items-center gap-2">
                  Review <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          
          {step === 3 && (
            <div className="space-y-5">
              <div><h2 className="text-lg font-bold text-slate-800">Review Your Profile</h2><p className="text-sm text-slate-400 mt-0.5">Please confirm your information</p></div>
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl">
                <div className="flex justify-between"><span className="text-slate-500">Age:</span><span className="font-semibold">{form.age || "-"}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Gender:</span><span className="font-semibold">{form.gender || "-"}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Job Role:</span><span className="font-semibold">{form.role || "-"}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Experience:</span><span className="font-semibold">{form.experience || "-"} years</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Remote Ratio:</span><span className="font-semibold">{form.remoteRatio || "-"}%</span></div>
              </div>
              <div className="flex justify-between pt-4">
                <button onClick={() => setStep(2)} className="px-6 py-2.5 border border-border text-slate-600 font-semibold rounded-xl hover:bg-slate-50 flex items-center gap-2">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={() => { onSave(form); navigate("assessment"); }} className="px-6 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-cyan-700">
                  Continue to Assessment
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 5: Dashboard
// ─────────────────────────────────────────────────────────────────────────────
function DashboardPage({ navigate, userName, burnoutScore }: { navigate: (s: Screen) => void; userName: string; burnoutScore: number }) {
  const risk = riskInfo(burnoutScore);
  const firstName = userName.split(" ")[0] || "User";
  const hasResult = burnoutScore > 0;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar active="dashboard" navigate={navigate} />
      <main className="flex-1 p-8 overflow-auto">
        <div className="flex items-center justify-between mb-8">
          <div><h1 className="text-2xl font-extrabold text-slate-800">Good morning, {firstName} 👋</h1><p className="text-slate-500 text-sm mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p></div>
          <button onClick={() => navigate("assessment")} className="px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-cyan-700 shadow-sm shadow-cyan-200 flex items-center gap-2"><ClipboardList className="w-4 h-4" /> Start Assessment</button>
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white rounded-2xl border border-border p-6 shadow-sm flex flex-col items-center text-center space-y-4">
            <div className="flex items-center gap-2 w-full"><Activity className="w-5 h-5 text-primary" /><span className="font-bold text-slate-700 text-sm">Latest Burnout Score</span></div>
            {hasResult ? (
              <>
                <BurnoutGauge score={burnoutScore} size="md" />
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${risk.badge}`}>{risk.label}</span>
                <p className="text-xs text-slate-400">Last assessed: {new Date().toLocaleDateString()}</p>
                <button onClick={() => navigate("result")} className="w-full py-2.5 border border-border text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50">View Full Report</button>
              </>
            ) : (
              <div className="py-8 space-y-3"><div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto"><Activity className="w-8 h-8 text-slate-300" /></div><p className="text-slate-400 text-sm">No assessment completed yet</p><button onClick={() => navigate("assessment")} className="px-5 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:bg-cyan-700">Take First Assessment</button></div>
            )}
          </div>
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-3 gap-4">
              {[{ label: "Stress Level", value: "N/A", icon: Zap, color: "text-amber-500", bg: "bg-amber-50" }, { label: "Assessments", value: "0 total", icon: ClipboardList, color: "text-primary", bg: "bg-sky-50" }, { label: "Wellbeing Trend", value: "N/A", icon: TrendingUp, color: "text-slate-500", bg: "bg-slate-50" }].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="bg-white rounded-2xl border border-border p-5 shadow-sm"><div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}><Icon className={`w-5 h-5 ${color}`} /></div><div className="text-xl font-extrabold text-slate-800">{value}</div><div className="text-xs text-slate-400 mt-0.5">{label}</div></div>
              ))}
            </div>
            <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl border border-emerald-100 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-emerald-600" /><span className="font-bold text-slate-800 text-sm">AI Recommendations</span></div><button onClick={() => navigate("recommendation")} className="text-xs font-bold text-emerald-600 hover:underline">View all →</button></div>
              <div className="space-y-3">{["Schedule mindfulness breaks between tasks this week.", "Monitor your workload patterns.", "Connect with a support colleague this week."].map((tip, i) => (<div key={i} className="flex items-start gap-3"><div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"><CheckCircle2 className="w-3 h-3 text-white" /></div><p className="text-sm text-slate-600">{tip}</p></div>))}</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 6: Assessment Page
// ─────────────────────────────────────────────────────────────────────────────
function AssessmentPage({ navigate, onSubmit, profile }: { navigate: (s: Screen) => void; onSubmit: (assessment: AssessmentData, profile: ProfileData) => Promise<void>; profile: ProfileData }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<AssessmentData>({
    stress: 5,
    workload: 6,
    workLifeBalance: 3,
    jobSatisfaction: 3,
  });
  const totalSteps = 2;
  const pct = (step / totalSteps) * 100;

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onSubmit(form, profile);
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar active="assessment" navigate={navigate} />
      <main className="flex-1 p-8 overflow-auto flex items-start justify-center">
        <div className="w-full max-w-2xl">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-1">
              <button onClick={() => navigate("dashboard")} className="text-slate-400 hover:text-slate-600"><ChevronLeft className="w-5 h-5" /></button>
              <h1 className="text-2xl font-extrabold text-slate-800">Burnout Assessment</h1>
            </div>
            <p className="text-slate-500 text-sm ml-7">Step {step} of {totalSteps} — Answer honestly for the most accurate results</p>
          </div>
          <div className="mb-8 space-y-2">
            <div className="flex justify-between text-xs font-semibold text-slate-400">
              <span>{step === 1 ? "Workload & Stress" : "Satisfaction & Balance"}</span>
              <span className="text-primary">{Math.round(pct)}% complete</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-teal-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-border shadow-sm p-8 space-y-8">
            {step === 1 && (
              <div className="space-y-8">
                <div className="space-y-1"><span className="text-xs font-extrabold text-primary uppercase tracking-widest">Section 1</span><h2 className="text-xl font-extrabold text-slate-800">How are you feeling about your workload?</h2><p className="text-sm text-slate-500">Rate your current experience from 1 (very low) to 10 (extremely high)</p></div>
                <SliderInput label="Stress Level" value={form.stress} onChange={(v) => setForm({ ...form, stress: v })} lowLabel="Calm & relaxed" highLabel="Extremely stressed" />
                <div className="border-t border-border" />
                <SliderInput label="Workload Level" value={form.workload} onChange={(v) => setForm({ ...form, workload: v })} lowLabel="Manageable" highLabel="Overwhelming" />
              </div>
            )}
            {step === 2 && (
              <div className="space-y-8">
                <div className="space-y-1"><span className="text-xs font-extrabold text-primary uppercase tracking-widest">Section 2</span><h2 className="text-xl font-extrabold text-slate-800">How satisfied are you with your work experience?</h2><p className="text-sm text-slate-500">Rate from 1 star (very poor) to 5 stars (excellent)</p></div>
                <StarRating label="Work-Life Balance" value={form.workLifeBalance} onChange={(v) => setForm({ ...form, workLifeBalance: v })} />
                <div className="border-t border-border" />
                <StarRating label="Job Satisfaction" value={form.jobSatisfaction} onChange={(v) => setForm({ ...form, jobSatisfaction: v })} />
              </div>
            )}
            <div className="flex gap-3 pt-2 border-t border-border">
              {step > 1 ? (
                <button onClick={() => setStep(step - 1)} className="flex-1 py-3 border border-border text-slate-600 font-semibold rounded-xl hover:bg-slate-50 flex items-center justify-center gap-2"><ChevronLeft className="w-4 h-4" /> Previous</button>
              ) : (
                <button onClick={() => navigate("dashboard")} className="flex-1 py-3 border border-border text-slate-600 font-semibold rounded-xl hover:bg-slate-50 flex items-center justify-center gap-2">Cancel</button>
              )}
              {step < totalSteps ? (
                <button onClick={() => setStep(step + 1)} className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-cyan-700 shadow-lg shadow-cyan-100 flex items-center justify-center gap-2">Next <ChevronRight className="w-4 h-4" /></button>
              ) : (
                <button onClick={handleSubmit} disabled={loading} className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading ? "Processing..." : <><Sparkles className="w-4 h-4" /> Submit Assessment</>}
                </button>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-400 text-center mt-5">Your responses are private and used only to generate your personal burnout risk report.</p>
        </div>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 7: Loading Page
// ─────────────────────────────────────────────────────────────────────────────
function LoadingPage() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => Math.min(prev + Math.random() * 20, 95));
    }, 300);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-teal-50 flex items-center justify-center p-6">
      <div className="text-center space-y-8">
        <div className="relative w-32 h-32 mx-auto">
          <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
          <div className="absolute inset-4 bg-primary/40 rounded-full animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center"><Brain className="w-16 h-16 text-primary animate-bounce" /></div>
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Analyzing Your Responses</h2>
        <div className="w-64 h-2 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} /></div>
        <p className="text-slate-500">Our AI is processing your burnout risk assessment...</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 8: Result Page
// ─────────────────────────────────────────────────────────────────────────────
function ResultPage({ navigate, burnoutScore, riskLevel }: { navigate: (s: Screen) => void; burnoutScore: number; riskLevel: string }) {
  const risk = riskInfo(burnoutScore);
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar active="dashboard" navigate={navigate} />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h1 className="text-3xl font-bold text-slate-800">Your Burnout Risk Assessment</h1>
          <BurnoutGauge score={burnoutScore} size="lg" />
          <div className={`text-xl font-bold ${risk.text}`}>{risk.label}</div>
          <p className="text-slate-600">Your burnout score is {burnoutScore} out of 100.</p>
          <div className="flex gap-4">
            <button onClick={() => navigate("dashboard")} className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-cyan-700">Back to Dashboard</button>
            <button onClick={() => navigate("recommendation")} className="flex-1 py-3 border border-border text-slate-600 font-semibold rounded-xl hover:bg-slate-50">View Recommendations</button>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 9: Recommendation Page
// ─────────────────────────────────────────────────────────────────────────────
function RecommendationPage({ navigate, burnoutScore }: { navigate: (s: Screen) => void; burnoutScore: number }) {
  const risk = riskInfo(burnoutScore);
  const recommendations = burnoutScore >= 65 
    ? ["Schedule a wellness check-in with HR", "Take at least one full day off this week", "Limit overtime hours", "Practice mindfulness daily"]
    : burnoutScore >= 35 
    ? ["Take short breaks between tasks", "Set boundaries for work hours", "Connect with colleagues", "Get adequate sleep"]
    : ["Maintain your current wellness practices", "Take regular breaks", "Stay connected with support systems", "Monitor your stress levels"];

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar active="dashboard" navigate={navigate} />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-2xl mx-auto space-y-6">
          <h1 className="text-3xl font-bold text-slate-800">Your Personalized Recommendations</h1>
          <div className={`p-6 rounded-2xl border ${risk.border} ${risk.bg}`}>
            <h2 className={`text-xl font-bold ${risk.text}`}>Based on your {risk.label} risk level:</h2>
            <ul className="mt-4 space-y-2">
              {recommendations.map((rec, i) => (<li key={i} className="flex items-start gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" /><span className="text-slate-700">{rec}</span></li>))}
            </ul>
          </div>
          <div className="flex gap-4">
            <button onClick={() => navigate("result")} className="flex-1 py-3 border border-border text-slate-600 font-semibold rounded-xl hover:bg-slate-50">Back to Results</button>
            <button onClick={() => navigate("dashboard")} className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-cyan-700">Back to Dashboard</button>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("landing");
  const [userName, setUserName] = useState<string>("");
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [burnoutScore, setBurnoutScore] = useState<number>(0);
  const [riskLevel, setRiskLevel] = useState<string>("");

  const handleAssessmentSubmit = async (assessment: AssessmentData, profile: ProfileData) => {
    try {
      const mlInput = mapToMLInput(assessment, profile);
      console.log('Sending to FastAPI:', mlInput);
      
      const response = await axios.post(FASTAPI_URL, mlInput, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      const { burnout_score, risk_level } = response.data;
      console.log('Prediction result:', burnout_score, risk_level);
      
      setBurnoutScore(burnout_score);
      setRiskLevel(risk_level);
      
      // Simpan ke backend Express
      const token = await getToken();
      await apiClient.post('/assessment', {
        user_name: userName || "User",
        score: burnout_score,
        risk_level: risk_level,
        date: new Date().toISOString()
      }, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      
      setCurrentScreen("loading");
      setTimeout(() => setCurrentScreen("result"), 2000);
    } catch (error) {
      console.error('Assessment error:', error);
      alert(`Failed to predict or save: ${error.response?.data?.detail || error.message}`);
    }
  };

  return (
    <>
      {currentScreen === "landing" && <LandingPage navigate={setCurrentScreen} />}
      {currentScreen === "register" && <RegisterPage navigate={setCurrentScreen} setUserName={setUserName} />}
      {currentScreen === "login" && <LoginPage navigate={setCurrentScreen} />}
      {currentScreen === "questionnaire" && <QuestionnairePage navigate={setCurrentScreen} onSave={setProfileData} />}
      {currentScreen === "dashboard" && <DashboardPage navigate={setCurrentScreen} userName={userName} burnoutScore={burnoutScore} />}
      {currentScreen === "assessment" && profileData && <AssessmentPage navigate={setCurrentScreen} onSubmit={handleAssessmentSubmit} profile={profileData} />}
      {currentScreen === "loading" && <LoadingPage />}
      {currentScreen === "result" && <ResultPage navigate={setCurrentScreen} burnoutScore={burnoutScore} riskLevel={riskLevel} />}
      {currentScreen === "recommendation" && <RecommendationPage navigate={setCurrentScreen} burnoutScore={burnoutScore} />}
      {currentScreen === "history" && (
        <div className="flex"><Sidebar active="history" navigate={setCurrentScreen} /><main className="flex-1 p-8"><h1 className="text-2xl font-bold">History</h1><p>Coming soon...</p></main></div>
      )}
      {currentScreen === "profile" && (
        <div className="flex"><Sidebar active="profile" navigate={setCurrentScreen} /><main className="flex-1 p-8"><h1 className="text-2xl font-bold">Profile</h1><p>Coming soon...</p></main></div>
      )}
    </>
  );
}