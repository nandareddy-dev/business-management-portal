'use client'

import { useState } from 'react'
import { Wallet, Mail, Check } from 'lucide-react'

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
      className="w-full bg-gray-900 rounded-2xl px-5 py-4 flex items-center justify-between text-left hover:bg-gray-800 transition-colors"
    >
      <div>
        <p className="text-[10px] tracking-wide text-white/40 uppercase mb-1">Monthly salary</p>
        <p className="text-xl font-medium text-amber-400 tabular-nums">₹••••••</p>
        <p className="text-[10px] text-white/40 mt-1 flex items-center gap-1">
          {sending
            ? 'Sending to your email...'
            : sent
              ? <><Check className="w-3 h-3 text-emerald-400" /> Check your email</>
              : 'Tap to receive by email'}
        </p>
      </div>
      <div className="w-9 h-9 rounded-full border border-white/15 flex items-center justify-center">
        {sending ? (
          <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        ) : sent ? (
          <Mail className="w-4 h-4 text-emerald-400" />
        ) : (
          <Wallet className="w-4 h-4 text-amber-400" />
        )}
      </div>
    </button>
  )
}