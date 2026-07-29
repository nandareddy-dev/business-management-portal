'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // pricing page నుండి వచ్చిన plan — /onboarding కి కూడా ఇదే carry అవ్వాలి
  const planId = searchParams.get('plan') || 'starter'

  // Always step 2 (details) → step 3 (confirm) — industry fixed as Interior Design
  const [step, setStep] = useState<2 | 3>(2)

  const [form, setForm] = useState({
    fullName: '', companyName: '', email: '',
    phone: '', password: '', confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [checkingEmail, setCheckingEmail] = useState(false)
  const [error, setError] = useState('')

  async function validateStep2() {
    if (!form.fullName)    { setError('Full name required'); return false }
    if (!form.companyName) { setError('Company name required'); return false }
    if (!form.email)       { setError('Email required'); return false }
    if (!form.password)    { setError('Password required'); return false }
    if (form.password.length < 6) { setError('Password min 6 characters'); return false }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return false }

    // Check if email already exists (super admin / admin / user)
    setCheckingEmail(true)
    try {
      const res = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email }),
      })

      if (!res.ok) {
        setError('Could not verify email right now. Please try again.')
        setCheckingEmail(false)
        return false
      }

      const data = await res.json()

      if (data.exists) {
        setError('This email is already registered. Please sign in instead.')
        setCheckingEmail(false)
        return false
      }
    } catch (err) {
      console.error('Email check failed:', err)
      setError('Could not verify email right now. Please try again.')
      setCheckingEmail(false)
      return false
    }

    setCheckingEmail(false)
    return true
  }

  const handleContinue = () => {
    setLoading(true)
    setError('')
    localStorage.setItem('gk_pending_signup', JSON.stringify({
      fullName: form.fullName,
      companyName: form.companyName,
      email: form.email,
      phone: form.phone,
      password: form.password,
      industries: ['interior-design'],
    }))
    localStorage.setItem('gk_signup_industries', JSON.stringify(['interior-design']))
    router.push(`/onboarding?plan=${planId}`)
    setLoading(false)
  }

  const inp = "w-full border-b-2 border-[#E2D9C8] bg-transparent px-0 py-2.5 text-sm text-[#1C1712] placeholder:text-[#C4BAB0] outline-none focus:border-[#B8860B] transition-colors"
  const lbl = "text-[10px] font-bold text-[#9A8F82] uppercase tracking-[2px] block mb-1"

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
        @keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes float1 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-20px)} }
        @keyframes float2 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
        @keyframes float3 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes spin-slow { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes pulse-dot { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.4);opacity:0.7} }
        .slide-up { animation: slideUp 0.5s cubic-bezier(0.22,1,0.36,1) forwards; }
        .right-panel-shape { clip-path: polygon(8% 0%, 100% 0%, 100% 100%, 0% 100%); }
      `}</style>

      <div className="min-h-screen flex" style={{ fontFamily: "'DM Sans', sans-serif", background: '#F5F0E8' }}>

        {/* LEFT PANEL */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 relative">

          {/* Logo */}
          <div className="absolute top-8 left-8 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black"
              style={{ background: 'linear-gradient(135deg, #1C1712, #2d2822)', color: '#F59E0B' }}>G</div>
            <div>
              <p className="text-base text-[#1C1712] leading-none" style={{ fontFamily: 'Playfair Display, serif' }}>GK · CRM</p>
              <p className="text-[8px] text-[#B8860B] uppercase tracking-[2px] font-semibold">Premium Suite</p>
            </div>
          </div>

          <div className="w-full max-w-[380px]">

            {/* Step dots */}
            <div className="flex items-center gap-2 mb-8">
              {[1, 2].map((n) => (
                <div key={n} className={`h-1 rounded-full transition-all duration-500 ${
                  n === (step - 1) ? 'w-8 bg-[#B8860B]' :
                  n < (step - 1) ? 'w-4 bg-emerald-500' : 'w-4 bg-[#E2D9C8]'
                }`} />
              ))}
              <span className="text-[10px] text-[#9A8F82] ml-1 font-medium">{step - 1}/2</span>
            </div>

            {/* STEP 2 — Details */}
            {step === 2 && (
              <div className="slide-up">
                <p className="text-[11px] font-bold text-[#B8860B] uppercase tracking-[3px] mb-2">Step 1 of 2</p>
                <h1 className="text-[32px] text-[#1C1712] leading-tight mb-1" style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700 }}>
                  Your details
                </h1>
                <p className="text-sm text-[#7A6E60] mb-6">Fill in your business information.</p>

                {/* Interior Design badge — fixed, not removable */}
                <div className="flex gap-2 mb-6">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                    style={{ background: '#9333EA12', border: '1px solid #9333EA30', color: '#9333EA' }}>
                    <span>🛋️</span><span>Interior Design</span>
                  </div>
                </div>

                <div className="space-y-5 mb-7">
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className={lbl}>Full Name *</label>
                      <input type="text" placeholder="Ghana Kumar" value={form.fullName}
                        onChange={e => setForm({...form, fullName: e.target.value})} className={inp} />
                    </div>
                    <div>
                      <label className={lbl}>Phone</label>
                      <input type="tel" placeholder="+91 98765 43210" value={form.phone}
                        onChange={e => setForm({...form, phone: e.target.value})} className={inp} />
                    </div>
                  </div>
                  <div>
                    <label className={lbl}>Company Name *</label>
                    <input type="text" placeholder="GK Home Interiors" value={form.companyName}
                      onChange={e => setForm({...form, companyName: e.target.value})} className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Email Address *</label>
                    <input type="email" placeholder="you@company.com" value={form.email}
                      onChange={e => setForm({...form, email: e.target.value})} className={inp} />
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className={lbl}>Password *</label>
                      <input type="password" placeholder="Min 6 chars" value={form.password}
                        onChange={e => setForm({...form, password: e.target.value})} className={inp} />
                    </div>
                    <div>
                      <label className={lbl}>Confirm *</label>
                      <input type="password" placeholder="Repeat" value={form.confirmPassword}
                        onChange={e => setForm({...form, confirmPassword: e.target.value})} className={inp} />
                    </div>
                  </div>
                </div>

                {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-xl mb-4">⚠ {error}</p>}

                <button
                  onClick={async () => { if (!(await validateStep2())) return; setError(''); setStep(3) }}
                  disabled={checkingEmail}
                  className="w-full py-4 rounded-2xl text-sm font-bold text-white relative overflow-hidden group transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100"
                  style={{ background: 'linear-gradient(135deg, #1C1712, #2d2822)', boxShadow: '0 8px 28px rgba(28,23,18,0.22)' }}>
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {checkingEmail
                      ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Checking email...</>
                      : 'Review & Confirm →'}
                  </span>
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: 'linear-gradient(135deg, #B8860B, #D97706)' }} />
                </button>

                <p className="text-center text-xs text-[#9A8F82] mt-5">
                  Have an account? <a href="/login" className="font-bold text-[#B8860B] hover:underline">Sign in</a>
                </p>
              </div>
            )}

            {/* STEP 3 — Confirm */}
            {step === 3 && (
              <div className="slide-up">
                <p className="text-[11px] font-bold text-[#B8860B] uppercase tracking-[3px] mb-2">Step 2 of 2</p>
                <h1 className="text-[32px] text-[#1C1712] leading-tight mb-1" style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700 }}>
                  Confirm details
                </h1>
                <p className="text-sm text-[#7A6E60] mb-6">Everything looks correct?</p>

                <div className="rounded-2xl p-5 mb-5" style={{ background: '#fff', border: '1px solid #E2D9C8' }}>
                  <div className="space-y-3">
                    {[
                      { label: 'Name',    value: form.fullName },
                      { label: 'Company', value: form.companyName },
                      { label: 'Email',   value: form.email },
                      { label: 'Phone',   value: form.phone || '—' },
                    ].map(row => (
                      <div key={row.label} className="flex justify-between items-center text-sm">
                        <span className="text-[#9A8F82]">{row.label}</span>
                        <span className="font-semibold text-[#1C1712]">{row.value}</span>
                      </div>
                    ))}
                    <div className="border-t border-[#E2D9C8] pt-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-[#9A8F82]">Industry</span>
                        <span className="text-xs px-2 py-0.5 rounded-lg font-medium"
                          style={{ background: '#9333EA15', color: '#9333EA' }}>
                          🛋️ Interior Design
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <button onClick={() => { setError(''); setStep(2) }}
                  className="w-full py-2 rounded-xl text-xs font-medium text-[#9A8F82] border border-[#E2D9C8] hover:bg-white transition-all mb-4">
                  ✎ Edit details
                </button>

                {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-xl mb-4">⚠ {error}</p>}

                <button onClick={handleContinue} disabled={loading}
                  className="w-full py-4 rounded-2xl text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #B8860B, #D97706)', boxShadow: '0 8px 28px rgba(184,134,11,0.3)' }}>
                  <span className="flex items-center justify-center gap-2">
                    {loading
                      ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>
                      : '✓ Confirm & Continue →'}
                  </span>
                </button>

                <p className="text-center text-xs text-[#9A8F82] mt-3">
                  Have an account? <a href="/login" className="font-bold text-[#B8860B] hover:underline">Sign in</a>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="hidden lg:flex lg:w-[480px] flex-shrink-0 right-panel-shape relative overflow-hidden"
          style={{ background: 'linear-gradient(160deg, #1C1712 0%, #2a1f14 40%, #1C1712 100%)' }}>
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full border border-[#B8860B]/10"
              style={{ animation: 'spin-slow 30s linear infinite' }} />
            <div className="absolute -top-10 -right-10 w-56 h-56 rounded-full border border-[#B8860B]/15"
              style={{ animation: 'spin-slow 20s linear infinite reverse' }} />
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="absolute rounded-full" style={{
                width: 3 + (i % 3), height: 3 + (i % 3),
                left: `${15 + (i % 4) * 22}%`, top: `${10 + Math.floor(i / 4) * 22}%`,
                background: '#B8860B', opacity: 0.1 + (i % 4) * 0.05,
                animation: `float${(i % 3) + 1} ${5 + i * 0.5}s ease-in-out infinite`,
                animationDelay: `${i * 0.2}s`,
              }} />
            ))}
          </div>
          <div className="relative z-10 flex flex-col justify-between p-12 w-full">
            <div>
              <div className="inline-flex items-center gap-2 border border-[#B8860B]/30 rounded-full px-3.5 py-1.5 mb-10"
                style={{ background: 'rgba(184,134,11,0.08)' }}>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ animation: 'pulse-dot 2s infinite' }} />
                <span className="text-[9px] font-bold text-[#B8860B] uppercase tracking-[3px]">Live & Trusted</span>
              </div>
              <h2 className="text-4xl text-white leading-tight mb-5" style={{ fontFamily: 'Playfair Display, serif' }}>
                Hello,<br /><em className="text-[#F59E0B] not-italic">Business Owner!</em>
              </h2>
              <p className="text-white/50 text-sm leading-relaxed max-w-xs mb-10">
                Join 3,800+ Indian businesses using GK CRM to manage leads, staff, billing and operations — all in one place.
              </p>
              <div className="space-y-4">
                {[
                  { icon: '🎯', title: 'Smart Lead Pipeline', desc: 'New → Called → Follow Up → Won' },
                  { icon: '📊', title: 'Real-time Analytics', desc: 'Live dashboard with insights' },
                  { icon: '👥', title: 'Team Management', desc: 'Role-based access control' },
                  { icon: '💳', title: 'Billing & Invoices', desc: 'Generate and track payments' },
                ].map((f, i) => (
                  <div key={f.title} className="flex items-center gap-4"
                    style={{ animation: 'slideUp 0.5s ease forwards', animationDelay: `${0.1 + i * 0.08}s`, opacity: 0 }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(184,134,11,0.2)' }}>
                      {f.icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white/90">{f.title}</p>
                      <p className="text-[11px] text-white/40">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-white/8 pt-8 mt-8">
              <div className="grid grid-cols-3 gap-6">
                {[{ v: '3,800+', l: 'Companies' }, { v: '₹120Cr+', l: 'Revenue' }, { v: '99.9%', l: 'Uptime' }].map(s => (
                  <div key={s.l}>
                    <p className="text-2xl text-white mb-0.5" style={{ fontFamily: 'Playfair Display, serif' }}>{s.v}</p>
                    <p className="text-[10px] text-white/30 uppercase tracking-wider">{s.l}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F0E8' }}>
        <div className="w-8 h-8 border-2 border-[#B8860B] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SignupForm />
    </Suspense>
  )
}