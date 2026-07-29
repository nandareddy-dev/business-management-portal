'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // 1. Sign in
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) { setError(authError.message); setLoading(false); return }

    const userId = authData.user?.id
    if (!userId) { setError('Login failed'); setLoading(false); return }

    // 2. Profile fetch
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', userId)
      .maybeSingle()

    if (profileErr) {
      setError('Profile not found. Contact admin.')
      setLoading(false)
      return
    }

    // 3. Employee redirect
    if (profile?.role === 'employee') {
      window.location.href = '/employee'
      return
    }

    // 4. Super admin redirect
    if (profile?.role === 'super_admin') {
      window.location.href = '/admin/dashboard'
      return
    }

    // 5. No company_id — dashboard fallback
    if (!profile?.company_id) {
      window.location.href = '/dashboard'
      return
    }

    // 6. Get company's active industries
    const { data: companyIndustries, error: ciErr } = await supabase
      .from('company_industries')
      .select(`plan, is_active, industries(slug, name)`)
      .eq('company_id', profile.company_id)
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (ciErr) {
      console.error('company_industries fetch error:', ciErr)
      window.location.href = '/dashboard'
      return
    }

    // 7. ✅ Always redirect to /dashboard — overall summary page
    if (!companyIndustries || companyIndustries.length === 0) {
      window.location.href = '/onboarding'
      return
    }

    // Single ya multiple — always /dashboard ki
    window.location.href = '/dashboard'
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#F5F0E8' }}>

      {/* LEFT PANEL */}
      <div className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-24 py-12">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white"
            style={{ background: 'linear-gradient(135deg, #B8860B, #D97706)' }}>G</div>
          <div>
            <p className="font-bold text-sm" style={{ color: '#1C1712' }}>GK · CRM</p>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#B8860B' }}>Premium Suite</p>
          </div>
        </div>

        <div className="max-w-sm w-full">
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#B8860B' }}>Welcome Back</p>
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#1C1712' }}>Sign in to your<br />account</h1>
          <p className="text-sm mb-8" style={{ color: '#9A8F82' }}>Enter your credentials to access your dashboard.</p>

          <form onSubmit={handleLogin} className="space-y-4">

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#7A6E60' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3.5 rounded-xl text-sm outline-none transition-all"
                style={{ background: 'white', border: '1.5px solid #E8E2D8', color: '#1C1712' }}
                onFocus={e => e.target.style.borderColor = '#B8860B'}
                onBlur={e => e.target.style.borderColor = '#E8E2D8'}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-widest" style={{ color: '#7A6E60' }}>Password</label>
                <a href="/forgot-password" className="text-xs font-medium hover:underline" style={{ color: '#B8860B' }}>Forgot password?</a>
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3.5 rounded-xl text-sm outline-none transition-all"
                style={{ background: 'white', border: '1.5px solid #E8E2D8', color: '#1C1712' }}
                onFocus={e => e.target.style.borderColor = '#B8860B'}
                onBlur={e => e.target.style.borderColor = '#E8E2D8'}
              />
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl text-sm"
                style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}>
                ⚠ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl text-sm font-black text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 mt-2"
              style={{ background: '#1C1712', boxShadow: '0 8px 24px rgba(28,23,18,0.2)' }}>
              {loading ? '⏳ Signing in...' : 'Sign In →'}
            </button>

          </form>

          <p className="text-center text-sm mt-6" style={{ color: '#9A8F82' }}>
            Don&apos;t have an account?{' '}
            <a href="/#pricing" className="font-bold hover:underline" style={{ color: '#1C1712' }}>Sign Up Free</a>
          </p>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="hidden lg:flex w-[480px] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #1C1712 0%, #2d2218 60%, #1a150f 100%)' }}>

        <div className="absolute inset-0 pointer-events-none opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle, #B8860B 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(ellipse at 60% 40%, rgba(184,134,11,0.15), transparent 65%)' }} />

        <div className="relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold"
            style={{ borderColor: 'rgba(184,134,11,0.3)', color: '#B8860B', background: 'rgba(184,134,11,0.08)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE & TRUSTED
          </div>
        </div>

        <div className="relative space-y-8">
          <div>
            <h2 className="text-4xl font-bold text-white leading-tight mb-2">Welcome<br />back!</h2>
            <p style={{ color: '#B8860B' }} className="text-3xl font-bold">Good to see you.</p>
            <p className="text-sm mt-4" style={{ color: '#9A8F82' }}>
              Your leads, pipeline and team are waiting. Let&apos;s close some deals today.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { icon: '🎯', title: 'Smart Lead Pipeline',  sub: 'New → Called → Follow Up → Won' },
              { icon: '📊', title: 'Real-time Analytics', sub: 'Live dashboard with insights' },
              { icon: '👥', title: 'Team Management',     sub: 'Role-based access control' },
              { icon: '💳', title: 'Billing & Invoices',  sub: 'Generate and track payments' },
            ].map(f => (
              <div key={f.title} className="flex items-center gap-4 p-3.5 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                  style={{ background: 'rgba(184,134,11,0.15)' }}>{f.icon}</div>
                <div>
                  <p className="text-sm font-bold text-white">{f.title}</p>
                  <p className="text-xs" style={{ color: '#6B6159' }}>{f.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative grid grid-cols-3 gap-4 pt-8 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {[
            { v: '3,800+', l: 'COMPANIES' },
            { v: '₹120Cr+', l: 'REVENUE' },
            { v: '99.9%', l: 'UPTIME' },
          ].map(s => (
            <div key={s.l}>
              <p className="text-xl font-bold text-white">{s.v}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: '#5A5248' }}>{s.l}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}