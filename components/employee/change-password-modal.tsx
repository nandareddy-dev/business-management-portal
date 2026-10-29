'use client'

import { useEffect, useState, type FormEvent } from 'react'
import {
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

/* -------------------------------------------------------------------------- */
/*  Password strength (visual hint only — validation rules are unchanged)      */
/* -------------------------------------------------------------------------- */

function getStrength(password: string) {
  if (!password) return { score: 0, label: '', text: 'text-slate-400', bar: 'bg-slate-200' }

  let score = 0
  if (password.length >= 6) score += 1
  if (password.length >= 10) score += 1
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1

  const levels = [
    { label: 'Too short', text: 'text-rose-600',    bar: 'bg-rose-500' },
    { label: 'Weak',      text: 'text-rose-600',    bar: 'bg-rose-500' },
    { label: 'Fair',      text: 'text-amber-600',   bar: 'bg-amber-500' },
    { label: 'Good',      text: 'text-blue-600',    bar: 'bg-blue-500' },
    { label: 'Strong',    text: 'text-emerald-600', bar: 'bg-emerald-500' },
  ]

  return { score, ...levels[score] }
}

/* -------------------------------------------------------------------------- */
/*  Password field                                                             */
/* -------------------------------------------------------------------------- */

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  autoFocus = false,
  autoComplete,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  autoFocus?: boolean
  autoComplete: string
}) {
  const [visible, setVisible] = useState(false)

  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</label>
      <div className="relative">
        <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-11 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100 sm:text-sm"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Modal                                                                      */
/* -------------------------------------------------------------------------- */

export function ChangePasswordModal() {
  const [open, setOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const reset = () => {
    setNewPassword('')
    setConfirmPassword('')
    setMessage(null)
  }

  const close = () => {
    setOpen(false)
    reset()
  }

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  const handleSubmit = async () => {
    setMessage(null)
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' })
      return
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' })
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setLoading(false)
    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Password updated successfully' })
      setTimeout(close, 1200)
    }
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!loading && newPassword && confirmPassword) handleSubmit()
  }

  const strength = getStrength(newPassword)
  const showMatch = confirmPassword.length > 0
  const matches = newPassword === confirmPassword

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => setOpen(true)}
        className="group flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-left transition hover:border-indigo-300 hover:bg-white hover:shadow-sm"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 text-amber-700">
          <KeyRound size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">Change password</p>
          <p className="text-xs text-slate-500">Set a new password for your account</p>
        </div>
        <ChevronRight size={18} className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-600" />
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-sm sm:items-center sm:px-4"
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Change password"
            className="relative isolate w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative overflow-hidden bg-slate-900 px-5 py-5 text-white">
              <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950" />
              <div
                className="pointer-events-none absolute inset-0 -z-10"
                style={{
                  backgroundImage: 'radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)',
                  backgroundSize: '18px 18px',
                }}
              />
              <div className="pointer-events-none absolute -right-10 -top-10 -z-10 h-36 w-36 rounded-full bg-indigo-500/30 blur-3xl" />

              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/25">
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold">Change password</h2>
                    <p className="text-xs text-slate-300">Keep your account secure</p>
                  </div>
                </div>

                <button
                  onClick={close}
                  aria-label="Close"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-slate-200 ring-1 ring-white/15 transition hover:bg-white/20"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={onSubmit} className="space-y-4 px-5 pb-6 pt-5">
              <PasswordField
                label="New password"
                value={newPassword}
                onChange={setNewPassword}
                placeholder="Enter new password"
                autoComplete="new-password"
                autoFocus
              />

              {/* Strength meter */}
              {newPassword && (
                <div>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          step <= strength.score ? strength.bar : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`mt-1.5 text-xs font-semibold ${strength.text}`}>{strength.label}</p>
                </div>
              )}

              <div>
                <PasswordField
                  label="Confirm password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                />

                {showMatch && (
                  <p
                    className={`mt-1.5 flex items-center gap-1.5 text-xs font-medium ${
                      matches ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {matches ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                    {matches ? 'Passwords match' : 'Passwords do not match yet'}
                  </p>
                )}
              </div>

              {message && (
                <div
                  className={`flex items-start gap-2 rounded-xl px-3.5 py-3 text-sm font-medium ring-1 ${
                    message.type === 'error'
                      ? 'bg-rose-50 text-rose-700 ring-rose-100'
                      : 'bg-emerald-50 text-emerald-700 ring-emerald-100'
                  }`}
                >
                  {message.type === 'error' ? (
                    <XCircle size={16} className="mt-0.5 shrink-0" />
                  ) : (
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                  )}
                  {message.text}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={close}
                  className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !newPassword || !confirmPassword}
                  className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 disabled:shadow-none"
                >
                  {loading ? 'Updating...' : 'Update password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}