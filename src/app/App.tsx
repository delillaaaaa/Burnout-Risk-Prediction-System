import React from 'react';
import { useState, useEffect } from "react";
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
  | "dashboard" | "assessment" | "loading" | "result" | "recommendation";

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
  hoursPerWeek: string;
  remoteRatio: string;
}

// Konversi ke format FastAPI (PascalCase)
const mapToMLInput = (assessment: AssessmentData, profile: ProfileData) => {
  const ageNum = parseInt(profile.age) || 35;
  const expNum = parseInt(profile.experience) || 10;
  const hoursNum = parseInt(profile.hoursPerWeek) || 45;
  const remoteNum = parseInt(profile.remoteRatio) / 100 || 0.5;

  let genderStr = "Not specified";
  if (profile.gender === "Female") genderStr = "Female";
  else if (profile.gender === "Male") genderStr = "Male";

  let jobRoleStr = "Other Healthcare Worker";
  if (profile.role === "Physician / Doctor") jobRoleStr = "Physician / Doctor";
  else if (profile.role === "Nurse / Nurse Practitioner") jobRoleStr = "Nurse / Nurse Practitioner";
  else if (profile.role === "Surgeon") jobRoleStr = "Surgeon";
  else if (profile.role === "Psychologist / Therapist") jobRoleStr = "Psychologist / Therapist";

  const satisfactionLevel = assessment.jobSatisfaction * 20;
  const stressLevel = assessment.stress * 10;

  return {
    Age: ageNum,
    Gender: genderStr,
    JobRole: jobRoleStr,
    Experience: expNum,
    WorkHoursPerWeek: hoursNum,
    RemoteRatio: remoteNum,
    SatisfactionLevel: satisfactionLevel,
    StressLevel: stressLevel,
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
  label, type = "text", placeholder, value, onChange,
}: {
  label: string; type?: string; placeholder?: string;
  value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      <input
        type={type} placeholder={placeholder} value={value}
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

// ─── History Data ─────────────────────────────────────────────────────────────
const HISTORY_DATA = [
  { date: "May 8, 2026", score: 72, label: "High Risk" },
  { date: "Apr 22, 2026", score: 58, label: "Moderate Risk" },
  { date: "Apr 5, 2026", score: 41, label: "Moderate Risk" },
  { date: "Mar 20, 2026", score: 28, label: "Low Risk" },
];

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 1: Landing Page (SAMA PERSIS DENGAN ASLI)
// ─────────────────────────────────────────────────────────────────────────────
function LandingPage({ navigate }: { navigate: (s: Screen) => void }) {
  const features = [
    { icon: Brain, title: "AI-Powered Analysis", desc: "Advanced ML models trained on 50K+ healthcare professional profiles detect burnout patterns weeks before crisis." },
    { icon: Activity, title: "Real-time Monitoring", desc: "Continuous tracking of mental and physical wellbeing metrics with personalized trend dashboards." },
    { icon: Shield, title: "Clinically Validated", desc: "Built on evidence-based assessments developed in partnership with leading occupational psychologists." },
    { icon: Heart, title: "Personalized Care Plans", desc: "Receive actionable, tailored recommendations based on your unique stress profile, role, and work patterns." },
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
            <p className="text-lg text-slate-500 leading-relaxed max-w-lg">BurnoutAI uses machine learning to analyze your stress patterns and predict burnout risk — empowering healthcare professionals to take proactive care of their mental wellbeing.</p>
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
          {[{ v: "50K+", l: "Healthcare Workers" }, { v: "94%", l: "Prediction Accuracy" }, { v: "3.2M", l: "Assessments Completed" }, { v: "67%", l: "Burnout Reduction Rate" }].map(({ v, l }) => (<div key={l}><div className="text-3xl font-extrabold text-primary">{v}</div><div className="text-sm text-slate-500 mt-1">{l}</div></div>))}
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
          <p className="text-cyan-100 text-lg">Join thousands of healthcare professionals who trust BurnoutAI to protect their mental health.</p>
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
        <Field label="Full Name" placeholder="Dr. Sarah Chen" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <Field label="Email Address" type="email" placeholder="you@hospital.com" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
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
        <Field label="Email Address" type="email" placeholder="you@hospital.com" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
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
// SCREEN 4: General Questionnaire (3-step) - SAMA PERSIS DENGAN ASLI
// ─────────────────────────────────────────────────────────────────────────────
function QuestionnairePage({ navigate, onSave }: { navigate: (s: Screen) => void; onSave: (data: ProfileData) => void }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<ProfileData>({
    age: "", gender: "", role: "", experience: "", hoursPerWeek: "", remoteRatio: "40",
  });
  const STEPS = ["Basic Profile", "Work Config", "Review"];
  const totalSteps = 3;
  const selectClass = "w-full px-4 py-3 bg-slate-50 border border-border rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all";

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
                <div className="space-y-1.