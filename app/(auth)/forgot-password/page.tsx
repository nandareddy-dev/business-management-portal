'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const RESEND_COOLDOWN = 30 // seconds

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => setCooldown(c => c - 1), 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedEmail = email.trim()

    if (!trimmedEmail) { setError('Email required'); return }
    if (!EMAIL_REGEX.test(trimmedEmail)) { setError('Enter a valid email address'); return }
    if (cooldown > 0) return

    setLoading(true)
    setError('')

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { error: err } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setLoading(false)

    // Security: never reveal whether the email exists (avoids email enumeration).
    // Log the real error internally for debugging, but always show success to the user.
    if (err) {
      console.error('resetPasswordForEmail error:', err.message)
    }

    setSent(true)
    setCooldown(RESEND_COOLDOWN)
  }

  const handleResend = async () => {
    if (cooldown > 0 || loading) return
    setLoading(true)

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setLoading(false)
    if (err) console.error('resetPasswordForEmail error:', err.message)
    setCooldown(RESEND_COOLDOWN)
  }

  return (
    <div className="min-h-screen flex bg-[#F7F5F1]">

      {/* ── Left Side ── */}
      <div className="flex-1 flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-md">

          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-sm font-black text-white">G</div>
            <div>
              <p className="font-serif text-[16px] text-[#1C1712] tracking-wide">GK · CRM</p>
              <p className="text-[8px] text-[#B8860B] uppercase tracking-[2.5px] font-bold">Premium Suite</p>
            </div>
          </div>

          {sent ? (
            /* ── Success State ── */
            <div>
              <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center mb-6 text-3xl">📧</div>
              <h1 className="text-3xl font-bold text-[#1C1712] mb-2">Check Your Email</h1>
              <p className="text-[#7A6E60] mb-2">If an account exists for</p>
              <p className="font-semibold text-[#1C1712] mb-8">{email.trim()}</p>
              <p className="text-sm text-[#9A8F82] mb-6">
                you&apos;ll receive a password reset link shortly. Check your spam folder if it doesn&apos;t arrive in a few minutes.
              </p>

              <button
                onClick={handleResend}
                disabled={cooldown > 0 || loading}
                className="text-sm text-[#B8860B] hover:underline font-medium mb-4 block disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
              >
                {cooldown > 0 ? `Resend link in ${cooldown}s` : loading ? 'Sending...' : 'Resend link'}
              </button>

              <button
                onClick={() => { setSent(false); setEmail(''); setCooldown(0) }}
                className="text-sm text-[#B8860B] hover:underline font-medium mb-4 block"
              >
                ← Try a different email
              </button>
              <Link href="/login" className="text-sm text-[#7A6E60] hover:text-[#1C1712] font-medium">
                Back to Sign In
              </Link>
            </div>
          ) : (
            /* ── Form State ── */
            <div>
              <p className="text-sm font-bold text-[#B8860B] uppercase tracking-widest mb-3">ACCOUNT RECOVERY</p>
              <h1 className="text-3xl font-bold text-[#1C1712] mb-2">Forgot Password?</h1>
              <p className="text-[#7A6E60] mb-8">Enter your email and we&apos;ll send you a reset link.</p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-xs font-semibold text-[#7A6E60] uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError('') }}
                    placeholder="your@email.com"
                    className="w-full bg-white border border-[#E2D9C8] rounded-xl px-4 py-3 text-sm text-[#1C1712] outline-none focus:border-[#B8860B] transition-colors shadow-sm"
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-500 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#1C1712] hover:bg-[#2d2822] disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
                >
                  {loading ? 'Sending...' : 'Send Reset Link →'}
                </button>
              </form>

              <p className="text-center text-sm text-[#7A6E60] mt-6">
                Remember your password?{' '}
                <Link href="/login" className="text-[#B8860B] hover:underline font-semibold">
                  Sign In
                </Link>
              </p>
            </div>
          )}

        </div>
      </div>

      {/* ── Right Side — Dark Panel ── */}
      <div className="hidden lg:flex w-[45%] bg-[#1C1712] flex-col justify-between p-12 relative overflow-hidden">

        {/* Background glow */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-400 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-600 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        </div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-10">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-white text-xs font-semibold tracking-wide">LIVE & TRUSTED</span>
          </div>

          <h2 className="text-4xl font-bold text-white leading-tight mb-3">
            We&apos;ve got<br />you covered.
          </h2>
          <p className="text-[#B8860B] text-2xl font-semibold mb-4">Back in seconds.</p>
          <p className="text-white/50 text-sm leading-relaxed">
            Reset your password securely and get back to managing your leads and team.
          </p>
        </div>

        <div className="relative z-10 space-y-3">
          {[
            { icon: '🔐', title: 'Secure Reset', desc: 'One-time link expires in 1 hour' },
            { icon: '⚡', title: 'Instant Access', desc: 'Back to your dashboard quickly' },
            { icon: '🛡️', title: 'Your Data is Safe', desc: 'End-to-end encrypted accounts' },
          ].map(f => (
            <div key={f.title} className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-5 py-4">
              <span className="text-2xl">{f.icon}</span>
              <div>
                <p className="text-white text-sm font-semibold">{f.title}</p>
                <p className="text-white/40 text-xs">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="relative z-10 flex gap-8 pt-6 border-t border-white/10">
          <div>
            <p className="text-white text-xl font-bold">3,800+</p>
            <p className="text-white/40 text-xs uppercase tracking-wider">Companies</p>
          </div>
          <div>
            <p className="text-white text-xl font-bold">₹120Cr+</p>
            <p className="text-white/40 text-xs uppercase tracking-wider">Revenue</p>
          </div>
          <div>
            <p className="text-white text-xl font-bold">99.9%</p>
            <p className="text-white/40 text-xs uppercase tracking-wider">Uptime</p>
          </div>
        </div>

      </div>
    </div>
  )
}