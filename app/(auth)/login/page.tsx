'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { Eye, EyeOff } from 'lucide-react'

function friendlyAuthError(message: string): string {
  const msg = message.toLowerCase()

  if (
    msg.includes('invalid login credentials') ||
    msg.includes('invalid credentials') ||
    msg.includes('invalid email or password')
  ) {
    return 'Incorrect email or password.'
  }

  if (msg.includes('email not confirmed')) {
    return 'Please verify your email before signing in.'
  }

  if (
    msg.includes('too many requests') ||
    msg.includes('rate limit')
  ) {
    return 'Too many attempts. Please try again in a bit.'
  }

  if (msg.includes('user not found')) {
    return 'Incorrect email or password.'
  }

  return 'Something went wrong signing in. Please try again.'
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  )

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    // Prevent duplicate clicks
    if (loading) return

    setLoading(true)
    setError('')

    try {
      const trimmedEmail = email.trim()

      // Basic validation
      if (!trimmedEmail) {
        setError('Please enter your email address.')
        return
      }

      if (!password) {
        setError('Please enter your password.')
        return
      }

      // ─────────────────────────────────────────────
      // 1. Sign in with Supabase
      // ─────────────────────────────────────────────
      const {
        data: authData,
        error: authError,
      } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      })

      // Wrong password / email
      if (authError) {
        setError(friendlyAuthError(authError.message))
        return
      }

      const userId = authData.user?.id

      if (!userId) {
        setError('Login failed. Please try again.')
        return
      }

      // ─────────────────────────────────────────────
      // 2. Get user profile
      // ─────────────────────────────────────────────
      const {
        data: profile,
        error: profileErr,
      } = await supabase
        .from('profiles')
        .select('company_id, role')
        .eq('id', userId)
        .maybeSingle()

      if (profileErr) {
        console.error('Profile fetch error:', profileErr)
        setError('Profile not found. Contact admin.')
        return
      }

      // ─────────────────────────────────────────────
      // 3. Employee
      //
      // Employee always goes to Employee Portal.
      //
      // CRM access is controlled by middleware:
      //   status = true
      //   + CRM permission
      //
      // Inactive employee will see Access Denied
      // when trying to enter CRM.
      // ─────────────────────────────────────────────
      if (profile?.role === 'employee') {
        window.location.href = '/employee'
        return
      }

      // ─────────────────────────────────────────────
      // 4. Super admin
      // ─────────────────────────────────────────────
      if (profile?.role === 'super_admin') {
        window.location.href = '/admin/dashboard'
        return
      }

      // ─────────────────────────────────────────────
      // 5. No company ID
      // ─────────────────────────────────────────────
      if (!profile?.company_id) {
        window.location.href = '/dashboard'
        return
      }

      // ─────────────────────────────────────────────
      // 6. Get company's active industries
      // ─────────────────────────────────────────────
      const {
        data: companyIndustries,
        error: ciErr,
      } = await supabase
        .from('company_industries')
        .select(`
          plan,
          is_active,
          industries(slug, name)
        `)
        .eq('company_id', profile.company_id)
        .eq('is_active', true)
        .order('created_at', { ascending: true })

      if (ciErr) {
        console.error(
          'company_industries fetch error:',
          ciErr
        )

        window.location.href = '/dashboard'
        return
      }

      // ─────────────────────────────────────────────
      // 7. No active industry
      // ─────────────────────────────────────────────
      if (!companyIndustries || companyIndustries.length === 0) {
        window.location.href = '/onboarding'
        return
      }

      // ─────────────────────────────────────────────
      // 8. Always go to dashboard
      // ─────────────────────────────────────────────
      window.location.href = '/dashboard'
    } catch (err) {
      console.error('Unexpected login error:', err)

      setError(
        'Something went wrong. Please check your connection and try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex"
      style={{ background: '#F5F0E8' }}
    >
      {/* LEFT PANEL */}
      <div className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-24 py-12">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-12">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white"
            style={{
              background:
                'linear-gradient(135deg, #B8860B, #D97706)',
            }}
          >
            G
          </div>

          <div>
            <p
              className="font-bold text-sm"
              style={{ color: '#1C1712' }}
            >
              GK · CRM
            </p>

            <p
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: '#B8860B' }}
            >
              Premium Suite
            </p>
          </div>
        </div>

        <div className="max-w-sm w-full">
          <p
            className="text-xs font-bold uppercase tracking-widest mb-2"
            style={{ color: '#B8860B' }}
          >
            Welcome Back
          </p>

          <h1
            className="text-3xl font-bold mb-2"
            style={{ color: '#1C1712' }}
          >
            Sign in to your
            <br />
            account
          </h1>

          <p
            className="text-sm mb-8"
            style={{ color: '#9A8F82' }}
          >
            Enter your credentials to access your dashboard.
          </p>

          <form
            onSubmit={handleLogin}
            className="space-y-4"
          >
            {/* EMAIL */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-bold uppercase tracking-widest mb-2"
                style={{ color: '#7A6E60' }}
              >
                Email
              </label>

              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (error) setError('')
                }}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3.5 rounded-xl text-sm outline-none transition-all"
                style={{
                  background: 'white',
                  border: '1.5px solid #E8E2D8',
                  color: '#1C1712',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#B8860B'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#E8E2D8'
                }}
              />
            </div>

            {/* PASSWORD */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="password"
                  className="text-xs font-bold uppercase tracking-widest"
                  style={{ color: '#7A6E60' }}
                >
                  Password
                </label>

                <Link
                  href="/forgot-password"
                  className="text-xs font-medium hover:underline"
                  style={{ color: '#B8860B' }}
                >
                  Forgot password?
                </Link>
              </div>

              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (error) setError('')
                  }}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3.5 pr-12 rounded-xl text-sm outline-none transition-all"
                  style={{
                    background: 'white',
                    border: '1.5px solid #E8E2D8',
                    color: '#1C1712',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#B8860B'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E8E2D8'
                  }}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((prev) => !prev)
                  }
                  tabIndex={-1}
                  aria-label={
                    showPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9A8F82] hover:text-[#1C1712] transition-colors"
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            {/* ERROR */}
            {error && (
              <div
                role="alert"
                aria-live="polite"
                className="px-4 py-3 rounded-xl text-sm font-medium"
                style={{
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  color: '#DC2626',
                }}
              >
                ⚠ {error}
              </div>
            )}

            {/* SIGN IN */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl text-sm font-black text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 mt-2"
              style={{
                background: '#1C1712',
                boxShadow:
                  '0 8px 24px rgba(28,23,18,0.2)',
              }}
            >
              {loading
                ? '⏳ Signing in...'
                : 'Sign In →'}
            </button>
          </form>

          <p
            className="text-center text-sm mt-6"
            style={{ color: '#9A8F82' }}
          >
            Don&apos;t have an account?{' '}

            <Link
              href="/#pricing"
              className="font-bold hover:underline"
              style={{ color: '#1C1712' }}
            >
              Sign Up Free
            </Link>
          </p>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div
        className="hidden lg:flex w-[480px] flex-col justify-between p-12 relative overflow-hidden"
        style={{
          background:
            'linear-gradient(160deg, #1C1712 0%, #2d2218 60%, #1a150f 100%)',
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle, #B8860B 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(ellipse at 60% 40%, rgba(184,134,11,0.15), transparent 65%)',
          }}
        />

        <div className="relative">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold"
            style={{
              borderColor: 'rgba(184,134,11,0.3)',
              color: '#B8860B',
              background: 'rgba(184,134,11,0.08)',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE & TRUSTED
          </div>
        </div>

        <div className="relative space-y-8">
          <div>
            <h2 className="text-4xl font-bold text-white leading-tight mb-2">
              Welcome
              <br />
              back!
            </h2>

            <p
              style={{ color: '#B8860B' }}
              className="text-3xl font-bold"
            >
              Good to see you.
            </p>

            <p
              className="text-sm mt-4"
              style={{ color: '#9A8F82' }}
            >
              Your leads, pipeline and team are waiting.
              Let&apos;s close some deals today.
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                icon: '🎯',
                title: 'Smart Lead Pipeline',
                sub: 'New → Called → Follow Up → Won',
              },
              {
                icon: '📊',
                title: 'Real-time Analytics',
                sub: 'Live dashboard with insights',
              },
              {
                icon: '👥',
                title: 'Team Management',
                sub: 'Role-based access control',
              },
              {
                icon: '💳',
                title: 'Billing & Invoices',
                sub: 'Generate and track payments',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="flex items-center gap-4 p-3.5 rounded-xl"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border:
                    '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                  style={{
                    background:
                      'rgba(184,134,11,0.15)',
                  }}
                >
                  {feature.icon}
                </div>

                <div>
                  <p className="text-sm font-bold text-white">
                    {feature.title}
                  </p>

                  <p
                    className="text-xs"
                    style={{ color: '#6B6159' }}
                  >
                    {feature.sub}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          className="relative grid grid-cols-3 gap-4 pt-8 border-t"
          style={{
            borderColor: 'rgba(255,255,255,0.06)',
          }}
        >
          {[
            { v: '3,800+', l: 'COMPANIES' },
            { v: '₹120Cr+', l: 'REVENUE' },
            { v: '99.9%', l: 'UPTIME' },
          ].map((stat) => (
            <div key={stat.l}>
              <p className="text-xl font-bold text-white">
                {stat.v}
              </p>

              <p
                className="text-[10px] font-bold uppercase tracking-widest mt-0.5"
                style={{ color: '#5A5248' }}
              >
                {stat.l}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}