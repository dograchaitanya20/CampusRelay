import React from 'react';
import { Link } from 'react-router-dom';
import { Package, Zap, Shield, Star, ArrowRight, CheckCircle } from 'lucide-react';

const FEATURES = [
  { icon:'📦', title:'Post in 30 Seconds',      desc:'Select your delivery app, set a commission, and carriers near the gate instantly see your request.' },
  { icon:'⚡', title:'First-Come First-Served',  desc:'Day scholars compete in real-time. First to accept gets the job — no waiting, no haggling.' },
  { icon:'🔑', title:'Two-Factor OTP Security',  desc:'A unique OTP at pickup and delivery ensures your parcel changes hands securely every single time.' },
  { icon:'📍', title:'Live GPS Tracking',        desc:'Watch your carrier move in real-time from gate to hostel. Get alerts at every checkpoint.' },
  { icon:'💰', title:'Instant Wallet Payments',  desc:'Commission locked in escrow on posting, released to carrier automatically on delivery confirmation.' },
  { icon:'⭐', title:'Dual Trust Ratings',        desc:'Both parties rate each other after every delivery. High ratings unlock better matches.' },
];

const HOW = [
  { emoji:'📱', step:'01', title:'Sign Up & Verify',    desc:'Upload your college ID and selfie. AI verifies your identity in under 2 minutes.' },
  { emoji:'📦', step:'02', title:'Post a Request',      desc:'Your Zomato order is on the way? Post a request with commission ₹30+ before it arrives.' },
  { emoji:'🛵', step:'03', title:'Carrier Accepts',     desc:'A day scholar near the gate taps Accept. FCFS — first one wins the delivery.' },
  { emoji:'🔑', step:'04', title:'OTP Handoff',         desc:'Two OTPs: one at gate pickup, one at hostel delivery. Your parcel is safe the whole way.' },
  { emoji:'✅', step:'05', title:'Rate & Relax',         desc:'Both parties rate each other. Your carrier gets paid, you get your parcel. Done.' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand rounded-xl flex items-center justify-center text-lg">📦</div>
            <span className="text-xl font-black text-campus-dark">Campus<span className="text-brand">Relay</span></span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-semibold text-muted hover:text-campus-dark transition-colors">Sign In</Link>
            <Link to="/register" className="btn-primary text-sm py-2 px-4">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-campus-dark relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-brand/15" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-white/5" />
          <div className="absolute top-1/2 left-1/4 w-2 h-2 rounded-full bg-brand/40" />
          <div className="absolute top-1/3 right-1/3 w-3 h-3 rounded-full bg-white/10" />
        </div>
        <div className="max-w-6xl mx-auto px-4 py-24 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-8">
              <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
              <span className="text-white/70 text-sm font-medium">Now live on campus</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-[1.05] tracking-tight">
              Your parcel,<br />
              <span className="text-brand">delivered to</span><br />
              your hostel.
            </h1>
            <p className="text-white/50 text-xl mb-10 max-w-xl mx-auto leading-relaxed">
              Stop walking to the gate. Hostel students post requests, day scholars earn by picking up. Everyone wins.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/register" className="btn-primary text-base py-3.5 px-8 flex items-center justify-center gap-2">
                Start for Free <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/login" className="text-white/70 font-semibold text-base py-3.5 px-8 rounded-xl border border-white/20 hover:bg-white/10 transition-colors text-center">
                Already a member? Sign in
              </Link>
            </div>
            <div className="flex items-center justify-center gap-6 mt-10 text-white/40 text-sm font-medium">
              {['Free to join','OTP secured','AI verified','Instant payouts'].map(t => (
                <div key={t} className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-success" /> {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-b border-gray-100 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[['₹30+','Minimum earning per delivery'],['< 2 min','FCFS matching speed'],['100%','OTP-secured handoffs'],['⭐ 4.8','Avg platform rating']].map(([v,l])=>(
            <div key={l}>
              <p className="text-3xl font-black text-campus-dark">{v}</p>
              <p className="text-sm text-muted mt-1">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-24 max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black text-campus-dark mb-4">Everything you need.<br/>Nothing you don't.</h2>
          <p className="text-muted text-lg max-w-xl mx-auto">Built for the realities of campus life — real-time, secure, and stupidly simple.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(f => (
            <div key={f.title} className="bg-gray-50 rounded-3xl p-6 border border-gray-100 hover:border-brand/30 hover:shadow-lg transition-all duration-200">
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-lg font-black text-campus-dark mb-2">{f.title}</h3>
              <p className="text-muted text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-campus-dark mb-4">How it works</h2>
            <p className="text-muted text-lg">From order notification to hostel door in under 20 minutes.</p>
          </div>
          <div className="grid md:grid-cols-5 gap-4">
            {HOW.map((h, i) => (
              <div key={h.step} className="relative">
                <div className="bg-white rounded-3xl p-5 border border-gray-100 h-full">
                  <div className="text-3xl mb-3">{h.emoji}</div>
                  <p className="text-xs font-black text-brand mb-1">STEP {h.step}</p>
                  <h3 className="font-black text-campus-dark mb-2 text-sm">{h.title}</h3>
                  <p className="text-muted text-xs leading-relaxed">{h.desc}</p>
                </div>
                {i < HOW.length - 1 && (
                  <div className="hidden md:block absolute top-8 -right-2 z-10 text-gray-300 font-black">→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dual CTA */}
      <section className="py-24 max-w-6xl mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-5">
          <div className="bg-campus-dark rounded-3xl p-8 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-brand/20" />
            <div className="relative z-10">
              <div className="text-4xl mb-4">🏠</div>
              <h3 className="text-2xl font-black text-white mb-2">Hostel Student?</h3>
              <p className="text-white/50 text-sm mb-5 leading-relaxed">Never walk to the gate again. Post your delivery request and get it at your door for ₹30–₹50.</p>
              <ul className="space-y-1.5 mb-6">
                {['Post in under 30 seconds','Real-time carrier tracking','OTP-secured delivery','Auto refund if cancelled'].map(i=>(
                  <li key={i} className="flex items-center gap-2 text-white/60 text-sm">
                    <CheckCircle className="w-3.5 h-3.5 text-success flex-shrink-0"/>{i}
                  </li>
                ))}
              </ul>
              <Link to="/register" className="btn-primary inline-flex items-center gap-2">Get Deliveries →</Link>
            </div>
          </div>
          <div className="bg-orange-50 border-2 border-brand/30 rounded-3xl p-8 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-brand/10" />
            <div className="relative z-10">
              <div className="text-4xl mb-4">🛵</div>
              <h3 className="text-2xl font-black text-campus-dark mb-2">Day Scholar?</h3>
              <p className="text-muted text-sm mb-5 leading-relaxed">You're already coming through the gate. Earn ₹30–₹100 per delivery on your way in — no extra effort.</p>
              <ul className="space-y-1.5 mb-6">
                {['₹30 minimum per pickup','Commission rises if not claimed','Instant wallet payout','Withdraw to UPI daily'].map(i=>(
                  <li key={i} className="flex items-center gap-2 text-muted text-sm">
                    <CheckCircle className="w-3.5 h-3.5 text-success flex-shrink-0"/>{i}
                  </li>
                ))}
              </ul>
              <Link to="/register" className="btn-primary inline-flex items-center gap-2">Start Earning →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-brand rounded-lg flex items-center justify-center text-sm">📦</div>
            <span className="font-black text-campus-dark">CampusRelay</span>
          </div>
          <p className="text-sm text-muted">© 2024 CampusRelay. Built for campus students, by campus students.</p>
          <div className="flex gap-4 text-sm text-muted">
            <Link to="/login"    className="hover:text-campus-dark transition-colors">Sign In</Link>
            <Link to="/register" className="hover:text-campus-dark transition-colors">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
