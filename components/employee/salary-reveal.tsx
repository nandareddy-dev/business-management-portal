'use client'

import { useState } from 'react'
import { Wallet, Mail, Check, EyeOff, ShieldCheck } from 'lucide-react'

export function SalaryReveal({ amount }: { amount: number }) {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const handleClick = async () => {
    if (sending || sent) return
    setSending(true)
    try {
      const res = await fetch('/api/employee/notify-salary-view', { method: 'POST' })
      if (res.ok) {
        setSent(true)
        setTimeout(() => setSent(false), 4000)
      }
    } catch (e) {
      console.error('Failed to send salary view notification:', e)
    } finally {
      setSending(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={sending}
      aria-live="polite"
      className="group relative isolate w-full overflow-hidden rounded-3xl bg-slate-900 p-5 text-left text-white shadow-xl transition hover:shadow-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300 disabled:cursor-wait"
    >
      {/* Background layers */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
      />
      <div aria-hidden className="pointer-events-none absolute -right-12 -top-12 -z-10 h-44 w-44 rounded-full bg-indigo-500/30 blur-3xl transition group-hover:bg-indigo-400/40" />
      <div
        aria-hidden
        className={`pointer-events-none absolute -bottom-16 left-4 -z-10 h-40 w-40 rounded-full blur-3xl transition ${
          sent ? 'bg-emerald-400/30' : 'bg-emerald-500/15'
        }`}
      />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-300">Monthly salary</p>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-200 ring-1 ring-white/15">
              <ShieldCheck className="h-3 w-3 text-emerald-300" /> Private
            </span>
          </div>

          <p className="flex items-center gap-2.5 text-3xl font-extrabold tabular-nums tracking-tight text-amber-300">
            <span aria-label="Salary hidden">₹••••••</span>
            <EyeOff className="h-5 w-5 text-white/30" />
          </p>

          <p
            className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 transition ${
              sent
                ? 'bg-emerald-400/15 text-emerald-200 ring-emerald-300/30'
                : 'bg-white/10 text-slate-200 ring-white/15'
            }`}
          >
            {sending ? (
              'Sending to your email...'
            ) : sent ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-300" /> Check your email
              </>
            ) : (
              <>
                <Mail className="h-3.5 w-3.5 text-indigo-300" /> Tap to receive by email
              </>
            )}
          </p>
        </div>

        {/* Action icon */}
        <div
          className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ring-1 backdrop-blur transition group-active:scale-95 ${
            sent ? 'bg-emerald-400/20 ring-emerald-300/40' : 'bg-white/10 ring-white/20 group-hover:bg-white/20'
          }`}
        >
          {sending ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-300 border-t-transparent" />
          ) : sent ? (
            <Mail className="h-5 w-5 text-emerald-300" />
          ) : (
            <Wallet className="h-5 w-5 text-amber-300" />
          )}
        </div>
      </div>
    </button>
  )
}