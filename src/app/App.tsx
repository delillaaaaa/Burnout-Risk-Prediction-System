import React, { useState, useEffect } from 'react'
import type { ReactNode } from "react";
import {
  Brain, Activity, Home, ClipboardList, Clock, User, LogOut,
  ChevronRight, ChevronLeft, ArrowRight, Heart, Zap, BookOpen,
  Star, AlertTriangle, CheckCircle2, TrendingUp, BarChart2,
  Sparkles, Target, Moon, Wind, Coffee, Shield,
} from "lucide-react";

// ==================== API Import ====================
import { predictBurnout } from "../services/api.ts";
import type { PredictResponse } from "../services/api.ts";

// ==================== Types ====================
type Screen =
  | "landing" | "register" | "login" | "questionnaire"
  | "dashboard" | "assessment" | "loading" | "result" | "recommendation"
  | "history" | "profile";;

interface AssessmentData {
  stressLevel: number;
  satisfactionLevel: number;
  workHoursPerWeek: number;
  remoteRatio: number;
}

interface ProfileData {
  age: string;
  gender: string;
  role: string;
  experience: string;
  hoursPerWeek: string;
  remoteRatio: string;
}

// ==================== ML Input Mapper ====================
const mapToMLInput = (assessment: AssessmentData, profile: ProfileData) => {
  return {
    Age: parseInt(profile.age) || 35,
    Gender: profile.gender,
    JobRole: profile.role,
    Experience: parseInt(profile.experience) || 0,
    WorkHoursPerWeek: assessment.workHoursPerWeek,
    RemoteRatio: assessment.remoteRatio,
    SatisfactionLevel: assessment.satisfactionLevel,
    StressLevel: assessment.stressLevel,
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
  const risk = riskInfo(score);
  const sizeClass = size === "lg" ? "w-72" : size === "sm" ? "w-44" : "w-60";
  const R = 70;
  const circumference = Math.PI * R; // setengah lingkaran
  const progress = (Math.min(score, 100) / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 110" className={`${sizeClass} h-auto`}>
        {/* Track */}
        <path
          d={`M 15 100 A ${R} ${R} 0 0 1 185 100`}
          fill="none" stroke="#e2e8f0" strokeWidth="16" strokeLinecap="round"
        />
        {/* Progress */}
        <path
          d={`M 15 100 A ${R} ${R} 0 0 1 185 100`}
          fill="none"
          stroke={risk.color}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
          strokeDashoffset="0"
        />
        {/* Score */}
        <text
          x="100" y="88" textAnchor="middle" fill="#0f172a"
          style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          {score}
        </text>
        <text x="100" y="105" textAnchor="middle" fill="#94a3b8" style={{ fontSize: 11 }}>
          / 100
        </text>
      </svg>
      <span className={`font-bold -mt-1 ${risk.text} ${size === "lg" ? "text-xl" : "text-base"}`}>
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
// SCREEN 1: Landing Page
// ─────────────────────────────────────────────────────────────────────────────
function LandingPage({ navigate }: { navigate: (s: Screen) => void }) {
  const features = [
    {
      icon: Brain, title: "AI-Powered Analysis",
      desc: "Advanced ML models trained on 50K+ healthcare professional profiles detect burnout patterns weeks before crisis.",
    },
    {
      icon: Activity, title: "Real-time Monitoring",
      desc: "Continuous tracking of mental and physical wellbeing metrics with personalized trend dashboards.",
    },
    {
      icon: Shield, title: "Clinically Validated",
      desc: "Built on evidence-based assessments developed in partnership with leading occupational psychologists.",
    },
    {
      icon: Heart, title: "Personalized Care Plans",
      desc: "Receive actionable, tailored recommendations based on your unique stress profile, role, and work patterns.",
    },
  ];

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-slate-800" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              BurnoutAI
            </span>
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
            <p className="text-lg text-slate-500 leading-relaxed max-w-lg">
              BurnoutAI uses machine learning to analyze your stress patterns and predict burnout risk —
              empowering healthcare professionals to take proactive care of their mental wellbeing.
            </p>
            <div className="flex flex-wrap gap-4">
              <button onClick={() => navigate("register")} className="px-8 py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-cyan-700 shadow-lg shadow-cyan-200 flex items-center gap-2 text-sm">
                Start Free Assessment <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={() => navigate("login")} className="px-8 py-3.5 bg-white text-slate-700 font-bold rounded-xl hover:bg-slate-50 border border-border shadow-sm text-sm">
                Sign In
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-6 text-sm text-slate-500">
              {["Free to use", "No credit card", "Clinically validated"].map((item) => (
                <div key={item} className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" />{item}</div>
              ))}
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
          {[{ v: "50K+", l: "Healthcare Workers" }, { v: "94%", l: "Prediction Accuracy" }, { v: "3.2M", l: "Assessments Completed" }, { v: "67%", l: "Burnout Reduction Rate" }].map(({ v, l }) => (
            <div key={l}><div className="text-3xl font-extrabold text-primary">{v}</div><div className="text-sm text-slate-500 mt-1">{l}</div></div>
          ))}
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
// SCREEN 2: Register Page
// ─────────────────────────────────────────────────────────────────────────────
function RegisterPage({ navigate, setUserName }: { navigate: (s: Screen) => void; setUserName: (n: string) => void }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.name.trim()) setUserName(form.name.trim());
    navigate("questionnaire");
  };
  return (
    <AuthLayout title="Create your account" subtitle="Start your burnout prevention journey today">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="Full Name" placeholder="Dr. Sarah Chen" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <Field label="Email Address" type="email" placeholder="you@hospital.com" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
        <Field label="Password" type="password" placeholder="Create a strong password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
        <button type="submit" className="w-full py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-cyan-700 shadow-lg shadow-cyan-100">Create Account</button>
        <p className="text-center text-sm text-slate-500">Already have an account? <button type="button" onClick={() => navigate("login")} className="text-primary font-bold hover:underline">Sign in</button></p>
      </form>
    </AuthLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 3: Login Page
// ─────────────────────────────────────────────────────────────────────────────
function LoginPage({ navigate }: { navigate: (s: Screen) => void }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); navigate("dashboard"); };
  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your BurnoutAI account">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="Email Address" type="email" placeholder="you@hospital.com" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
        <Field label="Password" type="password" placeholder="Enter your password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
        <button type="submit" className="w-full py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-cyan-700 shadow-lg shadow-cyan-100">Sign In</button>
        <p className="text-center text-sm text-slate-500">Don't have an account? <button type="button" onClick={() => navigate("register")} className="text-primary font-bold hover:underline">Register free</button></p>
      </form>
    </AuthLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 4: General Questionnaire (3-step)
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
                <div className="space-y-1.5"><label className="text-sm font-semibold text-slate-700">Gender</label><select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className={selectClass}><option value="">Select...</option><option>Male</option><option>Female</option></select></div>
              </div>
              <div className="space-y-1.5"><label className="text-sm font-semibold text-slate-700">Job Role</label><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={selectClass}>
                <option value="">Select your role...</option><option>Analyst</option>
                <option>Engineer</option>
                <option>HR</option>
                <option>Manager</option>
                <option>Sales</option>
                </select></div>
              <div className="space-y-1.5"><label className="text-sm font-semibold text-slate-700" typeof='number'>Years of Experience</label><input type="number" placeholder="e.g. 5" value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} className={selectClass} /></div>
            </div>
          )}
          
          {step === 2 && (
            <div className="space-y-7">
              <div><h2 className="text-lg font-bold text-slate-800">Work Configuration</h2><p className="text-sm text-slate-400 mt-0.5">Help us understand your work environment</p></div>
              <Field label="Work Hours Per Week" type="number" placeholder="e.g. 45" value={form.hoursPerWeek} onChange={(v) => setForm({ ...form, hoursPerWeek: v })} />
              <div className="space-y-3">
                <div className="flex justify-between items-center"><label className="text-sm font-semibold text-slate-700">Remote Work Ratio</label><span className="text-primary font-extrabold">{form.remoteRatio}%</span></div>
                <input type="range" min={0} max={100} value={form.remoteRatio} onChange={(e) => setForm({ ...form, remoteRatio: e.target.value })} className="w-full" style={{ background: `linear-gradient(to right, #0891b2 0%, #0891b2 ${form.remoteRatio}%, #e2e8f0 ${form.remoteRatio}%, #e2e8f0 100%)` }} />
                <div className="flex justify-between text-xs text-slate-400"><span>On-site only</span><span>Fully remote</span></div>
                <p className="text-xs text-slate-400 italic">Optional — helps calibrate environment-related burnout factors</p>
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-5">
              <div><h2 className="text-lg font-bold text-slate-800">Review Your Profile</h2><p className="text-sm text-slate-400 mt-0.5">Confirm your details before saving</p></div>
              <div className="bg-slate-50 rounded-2xl p-4 space-y-0">
                {[{ label: "Age", value: form.age || "—" }, { label: "Gender", value: form.gender || "—" }, { label: "Job Role", value: form.role || "—" }, { label: "Experience", value: form.experience || "—" }, { label: "Work Hours/Week", value: form.hoursPerWeek ? `${form.hoursPerWeek} hrs` : "—" }, { label: "Remote Work Ratio", value: `${form.remoteRatio}%` }].map(({ label, value }) => (
                  <div key={label} className="flex justify-between py-3 border-b border-border last:border-0"><span className="text-sm text-slate-500">{label}</span><span className="text-sm font-bold text-slate-700">{value}</span></div>
                ))}
              </div>
              <p className="text-xs text-slate-400 text-center">You can update these details anytime in your Profile settings.</p>
            </div>
          )}
          <div className="flex gap-3 mt-8">
            {step > 1 && <button onClick={() => setStep(step - 1)} className="flex-1 py-3 border border-border text-slate-600 font-semibold rounded-xl hover:bg-slate-50 flex items-center justify-center gap-2"><ChevronLeft className="w-4 h-4" /> Back</button>}
            {step < totalSteps
              ? <button onClick={() => setStep(step + 1)} className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-cyan-700 shadow-lg shadow-cyan-100 flex items-center justify-center gap-2">Continue <ChevronRight className="w-4 h-4" /></button>
              : <button onClick={() => { onSave(form); navigate("dashboard"); }} className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 shadow-lg shadow-emerald-100 flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4" /> Save Profile &amp; Continue</button>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: Profile Page (Editable)
// ─────────────────────────────────────────────────────────────────────────────
function ProfilePage({ navigate, profile, onSave }: {
  navigate: (s: Screen) => void;
  profile: ProfileData;
  onSave: (data: ProfileData) => void;
}) {
  const [form, setForm] = useState<ProfileData>(profile);
  const selectClass = "w-full px-4 py-3 bg-slate-50 border border-border rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all";

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar active="profile" navigate={navigate} />
      <main className="flex-1 p-8 overflow-auto flex items-start justify-center">
        <div className="w-full max-w-xl space-y-6">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">My Profile</h1>
            <p className="text-slate-500 text-sm mt-1">Update your personal and work information</p>
          </div>

          {/* Current Saved Data */}
          <div className="bg-slate-50 rounded-2xl border border-border p-5">
            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-3">Current Saved Data</p>
            {[
              { label: "Age", value: profile.age || "—" },
              { label: "Gender", value: profile.gender || "—" },
              { label: "Job Role", value: profile.role || "—" },
              { label: "Experience", value: profile.experience ? `${profile.experience} years` : "—" },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between py-2.5 border-b border-border last:border-0">
                <span className="text-sm text-slate-500">{label}</span>
                <span className="text-sm font-bold text-slate-700">{value}</span>
              </div>
            ))}
          </div>

          {/* Edit Form */}
          <div className="bg-white rounded-2xl border border-border shadow-sm p-8 space-y-5">
            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Edit Profile</p>

            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Age"
                type="number"
                placeholder="e.g. 34"
                value={form.age}
                onChange={(v) => setForm({ ...form, age: v })}
              />
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Gender</label>
                <select
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  className={selectClass}
                >
                  <option value="">Select...</option>
                  <option>Male</option>
                  <option>Female</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Job Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className={selectClass}
              >
                <option value="">Select your role...</option>
                <option>Analyst</option>
                <option>Engineer</option>
                <option>HR</option>
                <option>Manager</option>
                <option>Sales</option>
              </select>
            </div>

            <Field
              label="Years of Experience"
              type="number"
              placeholder="e.g. 5"
              value={form.experience}
              onChange={(v) => setForm({ ...form, experience: v })}
            />

            <button
              onClick={() => { onSave(form); navigate("dashboard"); }}
              className="w-full py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-cyan-700 shadow-lg shadow-cyan-100 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" /> Save Changes
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 5: Dashboard
// ─────────────────────────────────────────────────────────────────────────────
function DashboardPage({ navigate, userName, burnoutScore, aiRecommendations }: {
  navigate: (s: Screen) => void;
  userName: string;
  burnoutScore: number;
  aiRecommendations?: string[];
}) {
  const risk = riskInfo(burnoutScore);
  const hasResult = burnoutScore > 0;
  const firstName = userName.split(" ")[0];

  const displayTips = aiRecommendations && aiRecommendations.length > 0
    ? aiRecommendations.slice(0, 3)
    : [
        "Schedule two 10-minute mindfulness breaks between shifts this week.",
        "Reduce overtime hours — patterns show elevated risk at 50+ hour weeks.",
        "Connect with a peer support colleague before end of this week.",
      ];

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar active="dashboard" navigate={navigate} />
      <main className="flex-1 p-8 overflow-auto">
        <div className="flex items-center justify-between mb-8">
          <div><h1 className="text-2xl font-extrabold text-slate-800">Good morning, {firstName} 👋</h1><p className="text-slate-500 text-sm mt-1">Friday, May 29, 2026</p></div>
          <button onClick={() => navigate("assessment")} className="px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-cyan-700 shadow-sm shadow-cyan-200 flex items-center gap-2"><ClipboardList className="w-4 h-4" /> Start Assessment</button>
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white rounded-2xl border border-border p-6 shadow-sm flex flex-col items-center text-center space-y-4">
            <div className="flex items-center gap-2 w-full"><Activity className="w-5 h-5 text-primary" /><span className="font-bold text-slate-700 text-sm">Latest Burnout Score</span></div>
            {hasResult ? (
              <>
                <BurnoutGauge score={burnoutScore} size="md" />
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${risk.badge}`}>{risk.label}</span>
                <p className="text-xs text-slate-400">Last assessed today</p>
                <button onClick={() => navigate("result")} className="w-full py-2.5 border border-border text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50">View Full Report</button>
              </>
            ) : (
              <div className="py-8 space-y-3"><div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto"><Activity className="w-8 h-8 text-slate-300" /></div><p className="text-slate-400 text-sm">No assessment completed yet</p><button onClick={() => navigate("assessment")} className="px-5 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:bg-cyan-700">Take First Assessment</button></div>
            )}
          </div>
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-3 gap-4">
              {[{ label: "Stress Level", value: "7.2/10", icon: Zap, color: "text-amber-500", bg: "bg-amber-50" }, { label: "Assessments", value: "4 total", icon: ClipboardList, color: "text-primary", bg: "bg-sky-50" }, { label: "Wellbeing Trend", value: "↓ 12 pts", icon: TrendingUp, color: "text-red-500", bg: "bg-red-50" }].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="bg-white rounded-2xl border border-border p-5 shadow-sm"><div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}><Icon className={`w-5 h-5 ${color}`} /></div><div className="text-xl font-extrabold text-slate-800">{value}</div><div className="text-xs text-slate-400 mt-0.5">{label}</div></div>
              ))}
            </div>
            <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl border border-emerald-100 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                  <span className="font-bold text-slate-800 text-sm">
                    AI Recommendations {aiRecommendations && aiRecommendations.length > 0 && <span className="text-xs font-normal text-emerald-500 ml-1">• from your assessment</span>}
                  </span>
                </div>
                <button onClick={() => navigate("recommendation")} className="text-xs font-bold text-emerald-600 hover:underline">View all →</button>
              </div>
              <div className="space-y-3">
                {displayTips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"><CheckCircle2 className="w-3 h-3 text-white" /></div>
                    <p className="text-sm text-slate-600">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6 bg-white rounded-2xl border border-border shadow-sm p-6">
          <div className="flex items-center justify-between mb-5"><div className="flex items-center gap-2"><Clock className="w-5 h-5 text-primary" /><span className="font-bold text-slate-700 text-sm">Assessment History</span></div><button className="text-xs font-bold text-primary hover:underline">View all</button></div>
          <div className="space-y-1">{HISTORY_DATA.map(({ date, score, label }) => { const r = riskInfo(score); return (
            <div key={date} className="flex items-center justify-between py-3 border-b border-border last:border-0 hover:bg-slate-50 rounded-xl px-2 -mx-2 transition-colors cursor-pointer">
              <div className="flex items-center gap-3"><div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0"><BarChart2 className="w-4 h-4 text-slate-500" /></div><div><div className="text-sm font-semibold text-slate-700">{date}</div><div className="text-xs text-slate-400">Burnout Assessment</div></div></div>
              <div className="flex items-center gap-3"><span className="text-sm font-extrabold text-slate-700">{score}</span><span className={`text-xs font-bold px-2.5 py-1 rounded-full ${r.badge}`}>{label}</span><ChevronRight className="w-4 h-4 text-slate-300" /></div>
            </div>
          )})}</div>
        </div>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 6: Burnout Assessment Form
// ─────────────────────────────────────────────────────────────────────────────
function AssessmentPage({ navigate, onSubmit, profile }: {
  navigate: (s: Screen) => void;
  onSubmit: (assessment: AssessmentData, profile: ProfileData) => void;
  profile: ProfileData;
}) {
  const [form, setForm] = useState<AssessmentData>({
    stressLevel: 5,
    satisfactionLevel: 3,
    workHoursPerWeek: 45,
    remoteRatio: 40,
  });

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar active="assessment" navigate={navigate} />
      <main className="flex-1 p-8 overflow-auto flex items-start justify-center">
        <div className="w-full max-w-2xl">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-1">
              <button onClick={() => navigate("dashboard")} className="text-slate-400 hover:text-slate-600">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h1 className="text-2xl font-extrabold text-slate-800">Burnout Assessment</h1>
            </div>
            <p className="text-slate-500 text-sm ml-7">Fill in your current work condition</p>
          </div>

          <div className="bg-white rounded-2xl border border-border shadow-sm p-8 space-y-8">
            {/* Work Hours */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <p className="font-semibold text-slate-700">Work Hours Per Week</p>
                <span className="text-primary font-extrabold text-xl">
                  {form.workHoursPerWeek}<span className="text-sm font-normal text-slate-400"> hrs</span>
                </span>
              </div>
              <input
                type="range" min={30} max={70} value={form.workHoursPerWeek}
                onChange={(e) => setForm({ ...form, workHoursPerWeek: Number(e.target.value) })}
                className="w-full"
                style={{ background: `linear-gradient(to right, #0891b2 0%, #0891b2 ${((form.workHoursPerWeek - 30) / 40) * 100}%, #e2e8f0 ${((form.workHoursPerWeek - 30) / 40) * 100}%, #e2e8f0 100%)` }}
              />
              <div className="flex justify-between text-xs text-slate-400">
                <span>30 hrs</span><span>70 hrs</span>
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Remote Ratio */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <p className="font-semibold text-slate-700">Remote Work Ratio</p>
                <span className="text-primary font-extrabold text-xl">
                  {form.remoteRatio}<span className="text-sm font-normal text-slate-400">%</span>
                </span>
              </div>
              <input
                type="range" min={0} max={100} value={form.remoteRatio}
                onChange={(e) => setForm({ ...form, remoteRatio: Number(e.target.value) })}
                className="w-full"
                style={{ background: `linear-gradient(to right, #0891b2 0%, #0891b2 ${form.remoteRatio}%, #e2e8f0 ${form.remoteRatio}%, #e2e8f0 100%)` }}
              />
              <div className="flex justify-between text-xs text-slate-400">
                <span>On-site only</span><span>Fully remote</span>
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Stress Level */}
            <SliderInput
              label="Stress Level"
              value={form.stressLevel}
              onChange={(v) => setForm({ ...form, stressLevel: v })}
              lowLabel="Calm & relaxed"
              highLabel="Extremely stressed"
            />

            <div className="border-t border-border" />

            {/* Satisfaction Level */}
            <StarRating
              label="Job Satisfaction"
              value={form.satisfactionLevel}
              onChange={(v) => setForm({ ...form, satisfactionLevel: v })}
            />

            <div className="flex gap-3 pt-2 border-t border-border">
              <button
                onClick={() => navigate("dashboard")}
                className="flex-1 py-3 border border-border text-slate-600 font-semibold rounded-xl hover:bg-slate-50 flex items-center justify-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" /> Cancel
              </button>
              <button
                onClick={() => onSubmit(form, profile)}
                className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 shadow-lg shadow-emerald-100 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" /> Submit Assessment
              </button>
            </div>
          </div>

          {/* Hint ke profile */}
          <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-border flex items-center justify-between">
            <p className="text-xs text-slate-500">Want to update Age, Gender, Job Role, or Experience?</p>
            <button
              onClick={() => navigate("profile" as Screen)}
              className="text-xs font-bold text-primary hover:underline"
            >
              Edit Profile →
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 6: Assessment History
// ─────────────────────────────────────────────────────────────────────────────
function HistoryPage({ navigate }: { navigate: (s: Screen) => void }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar active="history" navigate={navigate} />
      <main className="flex-1 p-8 overflow-auto">
        <h1 className="text-2xl font-extrabold text-slate-800 mb-6">Assessment History</h1>
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
          <div className="space-y-1">
            {HISTORY_DATA.map(({ date, score, label }) => {
              const r = riskInfo(score);
              return (
                <div key={date} className="flex items-center justify-between py-3 border-b border-border last:border-0 hover:bg-slate-50 rounded-xl px-2 -mx-2 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <BarChart2 className="w-4 h-4 text-slate-500" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-700">{date}</div>
                      <div className="text-xs text-slate-400">Burnout Assessment</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-extrabold text-slate-700">{score}</span>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${r.badge}`}>{label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 7: AI Prediction Loading
// ─────────────────────────────────────────────────────────────────────────────
function LoadingPage() {
  const [progress, setProgress] = useState(0);
  const [msgIdx, setMsgIdx] = useState(0);
  const messages = ["Initializing AI analysis engine...", "Processing stress response indicators...", "Analyzing workload and capacity patterns...", "Evaluating work-life balance data...", "Cross-referencing 50+ clinical risk factors...", "Generating personalized risk profile...", "Compiling your burnout assessment report..."];
  useEffect(() => {
    const progInterval = setInterval(() => setProgress(p => Math.min(p + Math.random() * 11 + 4, 96)), 350);
    const msgInterval = setInterval(() => setMsgIdx(i => (i + 1) % messages.length), 650);
    return () => { clearInterval(progInterval); clearInterval(msgInterval); };
  }, []);
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-teal-50 flex items-center justify-center p-6">
      <div className="text-center space-y-10 max-w-sm w-full">
        <div className="relative w-52 h-52 mx-auto"><div className="absolute inset-0 bg-cyan-100 rounded-full opacity-50 animate-pulse" /><div className="absolute inset-5 bg-teal-100 rounded-full opacity-60 animate-pulse [animation-delay:0.3s]" /><div className="absolute inset-10 bg-sky-50 rounded-full opacity-80 animate-pulse [animation-delay:0.6s]" /><div className="absolute inset-0 flex items-center justify-center"><div className="w-28 h-28 bg-white rounded-3xl shadow-2xl shadow-cyan-100 flex items-center justify-center border border-border"><Brain className="w-14 h-14 text-primary animate-pulse" /></div></div><div className="absolute inset-0 animate-spin [animation-duration:3s]"><div className="absolute top-1 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-primary rounded-full shadow-md shadow-cyan-300" /></div><div className="absolute inset-0 animate-spin [animation-duration:2.2s] [animation-direction:reverse]"><div className="absolute bottom-2 right-6 w-2.5 h-2.5 bg-emerald-400 rounded-full shadow-md shadow-emerald-200" /></div><div className="absolute inset-0 animate-spin [animation-duration:4s]"><div className="absolute top-1/3 right-0 w-2 h-2 bg-amber-400 rounded-full" /></div></div>
        <div className="space-y-3"><h2 className="text-2xl font-extrabold text-slate-800">Analyzing Your Burnout Risk</h2><p className="text-slate-500 text-sm min-h-[20px] transition-all">{messages[msgIdx]}</p></div>
        <div className="space-y-3 w-full"><div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-primary via-teal-400 to-emerald-400 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} /></div><div className="text-sm font-extrabold text-primary">{Math.round(progress)}%</div></div>
        <p className="text-xs text-slate-400 leading-relaxed">Our AI is cross-referencing your responses against 50+ clinical indicators to provide your personalized burnout risk assessment.</p>
        <div className="flex justify-center gap-6 text-xs text-slate-400"><div className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-emerald-500" /> Secure &amp; Private</div><div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Clinically Validated</div></div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 8: Prediction Result Page
// ─────────────────────────────────────────────────────────────────────────────
function ResultPage({ navigate, burnoutScore, probabilityPercent, riskLevelFromApi, lastAssessment, aiRecommendations }: {
  navigate: (s: Screen) => void;
  burnoutScore: number;
  probabilityPercent?: string;
  riskLevelFromApi?: string;
  lastAssessment?: AssessmentData;
  aiRecommendations?: string[];
}) {

const risk = riskInfo(burnoutScore);
const insights = aiRecommendations && aiRecommendations.length > 0
  ? aiRecommendations.slice(0, 3)
  : ["No insights available. Please complete an assessment first."];
  const breakdown = lastAssessment ? [
  { label: "Stress Level", score: lastAssessment.stressLevel * 10 },
  { label: "Job Satisfaction", score: lastAssessment.satisfactionLevel * 20 },
  { label: "Work Hours Intensity", score: Math.round(((lastAssessment.workHoursPerWeek - 30) / 40) * 100) },
  { label: "Remote Ratio", score: lastAssessment.remoteRatio },
] : [];

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar active="dashboard" navigate={navigate} />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-800">Your Assessment Results</h1>
              <p className="text-slate-500 text-sm mt-1">Assessed on {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
            </div>
            <button onClick={() => navigate("assessment")} className="px-4 py-2 border border-border text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 flex items-center gap-2"><ClipboardList className="w-4 h-4" /> Retake</button>
          </div>

          {/* Score Card — tampilkan data dari API */}
          <div className={`${risk.bg} rounded-2xl border ${risk.border} p-8`}>
            <div className="flex flex-col md:flex-row items-center gap-8">
              <BurnoutGauge score={burnoutScore} size="lg" />
              <div className="space-y-4 text-center md:text-left">
                <div>
                  <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Risk Assessment</p>
                  <h2 className={`text-3xl font-extrabold mt-1 ${risk.text}`}>
                    {riskLevelFromApi || risk.label}
                  </h2>
                  {probabilityPercent && (
                    <p className="text-sm font-semibold text-slate-500 mt-1">
                      Burnout Probability: <span className={`font-extrabold ${risk.text}`}>{probabilityPercent}</span>
                    </p>
                  )}
                </div>
                <p className="text-slate-600 text-sm leading-relaxed max-w-xs">
                  {burnoutScore >= 65
                    ? "Our AI model has identified critical burnout markers. Immediate action and professional support are strongly recommended."
                    : burnoutScore >= 35
                    ? "Elevated burnout risk detected. Proactive steps now can prevent further escalation and protect your wellbeing."
                    : "Your risk profile looks healthy. Continue your current habits and monitor monthly to stay on track."}
                </p>
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => navigate("recommendation")} className="px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-cyan-700 shadow-sm shadow-cyan-200 flex items-center gap-2"><Sparkles className="w-4 h-4" /> View Recommendations</button>
                  <button onClick={() => navigate("dashboard")} className="px-5 py-2.5 border border-border bg-white text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 flex items-center gap-2"><Home className="w-4 h-4" /> Dashboard</button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-border p-6 shadow-sm space-y-4"><h3 className="font-bold text-slate-800">Key Insights</h3><div className="space-y-3">{insights.map((insight, i) => (<div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl"><div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${risk.bg}`}><AlertTriangle className={`w-3.5 h-3.5 ${risk.text}`} /></div><p className="text-sm text-slate-600">{insight}</p></div>))}</div></div>
          <div className="bg-white rounded-2xl border border-border p-6 shadow-sm space-y-5"><h3 className="font-bold text-slate-800">Score Breakdown</h3><div className="space-y-4">{breakdown.map(({ label, score }) => { const r = riskInfo(score); return (<div key={label} className="space-y-1.5"><div className="flex justify-between text-sm"><span className="text-slate-600 font-medium">{label}</span><span className={`font-extrabold ${r.text}`}>{score}</span></div><div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${score}%`, background: r.color }} /></div></div>); })}</div></div>
          <div className="bg-white rounded-2xl border border-border p-6 shadow-sm space-y-4"><h3 className="font-bold text-slate-800">Score History</h3><div className="space-y-2">{HISTORY_DATA.slice(0, 3).map(({ date, score, label }) => { const r = riskInfo(score); return (<div key={date} className="flex items-center gap-4 py-2"><span className="text-xs text-slate-400 w-28 flex-shrink-0">{date}</span><div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${score}%`, background: r.color }} /></div><span className={`text-sm font-extrabold w-8 text-right ${r.text}`}>{score}</span></div>); })}</div></div>
          <div className="flex gap-3 pb-4">
            <button onClick={() => navigate("assessment")} className="flex-1 py-3 border border-border bg-white text-slate-600 font-semibold rounded-xl hover:bg-slate-50 flex items-center justify-center gap-2"><ClipboardList className="w-4 h-4" /> Retake Assessment</button>
            <button onClick={() => navigate("recommendation")} className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-cyan-700 shadow-lg shadow-cyan-100 flex items-center justify-center gap-2"><Sparkles className="w-4 h-4" /> Full Recommendations</button>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 9: Recommendation Detail Page
// ─────────────────────────────────────────────────────────────────────────────
function RecommendationPage({ navigate, burnoutScore, aiRecommendations, hrRecommendation }: {
  navigate: (s: Screen) => void;
  burnoutScore: number;
  aiRecommendations?: string[];
  hrRecommendation?: string;
}) {
  const risk = riskInfo(burnoutScore);
  const categories = [
    { icon: Wind, title: "Mindfulness & Stress Relief", color: "bg-sky-100 text-sky-600", border: "border-sky-100", tips: ["Practice 10-minute guided breathing before each shift to measurably lower cortisol.", "Use a mindfulness app (Calm, Headspace) during lunch — even 7 minutes creates recovery.", "Set a screen-free boundary for the first 30 minutes after waking each morning."] },
    { icon: Heart, title: "Physical Recovery", color: "bg-rose-100 text-rose-500", border: "border-rose-100", tips: ["Prioritize 7–8 hours of sleep — even one night of disrupted sleep raises burnout risk by 30%.", "Incorporate 20 minutes of moderate exercise 4x per week to boost endorphin production.", "Hydrate consistently — dehydration amplifies cognitive fatigue by up to 20%."] },
    { icon: Coffee, title: "Work-Life Boundaries", color: "bg-amber-100 text-amber-600", border: "border-amber-100", tips: ["Cap weekly hours at 50 for the next 30 days — this single change yields measurable relief.", "Protect at least one complete rest day per week: no on-call, no emails, no exceptions.", "Delegate non-critical tasks this week and communicate your capacity limits clearly."] },
    { icon: BookOpen, title: "Mental Wellness", color: "bg-violet-100 text-violet-600", border: "border-violet-100", tips: ["Connect with a peer support buddy for a weekly 15-minute wellbeing check-in.", "Consider short-term counseling via your Employee Assistance Program — it is free and confidential.", "Journal for 5 minutes daily: write three things that went well in each shift."] },
    { icon: Target, title: "Professional Purpose", color: "bg-emerald-100 text-emerald-600", border: "border-emerald-100", tips: ["Decline meeting requests outside core hours to protect your deep-focus time.", "Attend one professional development activity this month to renew your sense of purpose.", "Identify and articulate your top three values at work — clarity reduces emotional exhaustion."] }
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar active="dashboard" navigate={navigate} />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-800">Personalized Recommendations</h1>
              <p className="text-slate-500 text-sm mt-1">Tailored to your burnout risk profile</p>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-bold ${risk.badge}`}>Score: {burnoutScore} — {risk.label}</span>
          </div>

          <div className="bg-gradient-to-r from-primary to-teal-500 rounded-2xl p-6 text-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center"><Sparkles className="w-5 h-5 text-white" /></div>
              <div><h2 className="font-extrabold text-lg">Your AI Wellness Plan</h2><p className="text-cyan-200 text-xs">Personalized intervention recommendations</p></div>
            </div>
            <p className="text-cyan-100 text-sm leading-relaxed">Based on your assessment, our model identified elevated stress and boundary management as your primary risk factors. These evidence-based recommendations are ordered by expected impact on your specific burnout profile.</p>
          </div>

          {/* ─── AI Recommendations dari FastAPI ─── */}
          {aiRecommendations && aiRecommendations.length > 0 && (
            <div className="bg-white rounded-2xl border border-cyan-100 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-cyan-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">AI Wellness Recommendations</h3>
                  <p className="text-xs text-slate-400">Generated from your assessment data</p>
                </div>
              </div>
              <div className="space-y-3">
                {aiRecommendations.map((tip, i) => (
                  <div key={i} className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                    <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-primary text-xs font-extrabold">{i + 1}</span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>
              {hrRecommendation && (
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                  <p className="text-xs font-bold text-amber-700 mb-1">💼 HR Recommendation</p>
                  <p className="text-sm text-amber-800">{hrRecommendation}</p>
                </div>
              )}
            </div>
          )}

          {/* ─── General Categories ─── */}
          <div className="space-y-5">
            {categories.map(({ icon: Icon, title, color, border, tips }, catIdx) => (
              <div key={title} className={`bg-white rounded-2xl border ${border} shadow-sm p-6 space-y-4`}>
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 ${color} rounded-xl flex items-center justify-center flex-shrink-0`}><Icon className="w-5 h-5" /></div>
                  <div><h3 className="font-bold text-slate-800">{title}</h3><p className="text-xs text-slate-400">Priority {catIdx + 1}</p></div>
                </div>
                <div className="space-y-3">
                  {tips.map((tip, i) => (
                    <div key={i} className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                      <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"><span className="text-primary text-xs font-extrabold">{i + 1}</span></div>
                      <p className="text-sm text-slate-600 leading-relaxed">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[{ icon: "🧘", title: "Breathwork", desc: "4-7-8 breathing technique — 3 cycles before shifts" }, { icon: "🌿", title: "Nature Time", desc: "15 min outdoors daily reduces cortisol by 21%" }, { icon: "💬", title: "Talk It Out", desc: "Peer conversations reduce emotional exhaustion" }, { icon: "📵", title: "Digital Detox", desc: "No work apps after 8pm on non-call nights" }].map(({ icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl border border-border p-5 shadow-sm"><div className="text-2xl mb-2">{icon}</div><h4 className="font-bold text-slate-700 text-sm">{title}</h4><p className="text-xs text-slate-400 mt-1 leading-relaxed">{desc}</p></div>
            ))}
          </div>

          <div className="bg-gradient-to-br from-teal-50 to-sky-50 border border-teal-100 rounded-2xl p-8 text-center space-y-3">
            <Moon className="w-9 h-9 text-teal-500 mx-auto" />
            <p className="text-slate-700 font-medium italic text-lg leading-relaxed">"You cannot pour from an empty cup.<br />Take care of yourself first."</p>
            <p className="text-slate-400 text-xs font-medium">BurnoutAI Wellness Reminder</p>
          </div>

          <div className="flex gap-3 pb-6">
            <button onClick={() => navigate("result")} className="flex-1 py-3 border border-border bg-white text-slate-600 font-semibold rounded-xl hover:bg-slate-50 flex items-center justify-center gap-2"><ChevronLeft className="w-4 h-4" /> Back to Results</button>
            <button onClick={() => navigate("dashboard")} className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-cyan-700 shadow-lg shadow-cyan-100 flex items-center justify-center gap-2"><Home className="w-4 h-4" /> Back to Dashboard</button>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [userName, setUserName] = useState("Dr. Sarah Chen");
  const [profile, setProfile] = useState<ProfileData>({
    age: "30",
    gender: "Male",
    role: "Analyst",
    experience: "5",
    hoursPerWeek: "45",
    remoteRatio: "40",
  });
  const [burnoutScore, setBurnoutScore] = useState(0);
  const [apiResult, setApiResult] = useState<PredictResponse["data"] | null>(null);

  const [lastAssessment, setLastAssessment] = useState<AssessmentData | null>(null);

  const navigate = (s: Screen) => { setScreen(s); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const handleProfileSave = (data: ProfileData) => {
    setProfile(data);
    navigate("dashboard");
  };

  const handleAssessmentSubmit = async (assessment: AssessmentData, profileData: ProfileData) => {
    navigate("loading");
    setLastAssessment(assessment); // ← TAMBAH
    try {
      const mlInput = mapToMLInput(assessment, profileData);
      const response = await predictBurnout(mlInput);

      if (!response.success) throw new Error("API returned unsuccessful response");

      const result = response.data;
      const riskToScore: Record<string, number> = {
        "Rendah": 20,
        "Sedang": 50,
        "Tinggi": 80,
      };
      const score = riskToScore[result.risk_level] ?? Math.round(result.burnout_probability * 100);

      setApiResult(result);
      setBurnoutScore(score);
      console.log("semua keys:", Object.keys(result));
      console.log("full result:", JSON.stringify(result, null, 2));

      setTimeout(() => navigate("result"), 3000);
    } catch (error: any) {
      console.error("Prediction error:", error);
      console.error("Response detail:", JSON.stringify(error?.response?.data, null, 2));
      navigate("assessment");
      alert("Gagal menghubungi server prediksi. Periksa koneksi atau coba lagi.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {screen === "landing" && <LandingPage navigate={navigate} />}
      {screen === "register" && <RegisterPage navigate={navigate} setUserName={setUserName} />}
      {screen === "login" && <LoginPage navigate={navigate} />}
      {screen === "questionnaire" && <QuestionnairePage navigate={navigate} onSave={handleProfileSave} />}
      {screen === "dashboard" && (
        <DashboardPage
          navigate={navigate}
          userName={userName}
          burnoutScore={burnoutScore}
          aiRecommendations={apiResult?.ai_wellness_recommendations}
        />
      )}
      {screen === "assessment" && (
        <AssessmentPage navigate={navigate} onSubmit={handleAssessmentSubmit} profile={profile} />
      )}
      {screen === "loading" && <LoadingPage />}
      {screen === "result" && (
        <ResultPage
          navigate={navigate}
          burnoutScore={burnoutScore}
          probabilityPercent={apiResult?.burnout_probability_percent}
          riskLevelFromApi={apiResult?.risk_level}
          lastAssessment={lastAssessment ?? undefined}
          aiRecommendations={apiResult?.ai_wellness_recommendations}
        />
      )}
      {screen === "recommendation" && (
        <RecommendationPage
          navigate={navigate}
          burnoutScore={burnoutScore}
          aiRecommendations={apiResult?.ai_wellness_recommendations}
          hrRecommendation={apiResult?.hr_recommendation}
        />
      )}
      {screen === "history" && <HistoryPage navigate={navigate} />}
      {screen === "profile" && (
        <ProfilePage
          navigate={navigate}
          profile={profile}
          onSave={(data) => { setProfile(data); }}
        />
      )}
      
    </div>
  );
}