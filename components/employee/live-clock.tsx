'use client'

import { useEffect, useState } from 'react'

const TZ = 'Asia/Kolkata'

/** Ticking IST clock (hydration-safe: renders placeholders until mounted). */
export function LiveClock({ className = '' }: { className?: string }) {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const parts = now
    ? new Intl.DateTimeFormat('en-IN', {
        timeZone: TZ,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }).formatToParts(now)
    : []

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '--'

  return (
    <div className={`flex items-end gap-1 tabular-nums ${className}`} aria-live="off">
      <span className="text-2xl font-extrabold leading-none tracking-tight sm:text-3xl">{get('hour')}</span>
      <span className="mb-0.5 animate-pulse text-xl font-bold leading-none text-indigo-300 sm:text-2xl">:</span>
      <span className="text-2xl font-extrabold leading-none tracking-tight sm:text-3xl">{get('minute')}</span>
      <span className="mb-0.5 ml-0.5 flex flex-col items-start gap-0.5 leading-none">
        <span className="text-[11px] font-bold text-indigo-200">{get('second')}</span>
        <span className="rounded bg-white/15 px-1 py-px text-[9px] font-bold uppercase tracking-wider text-white ring-1 ring-white/20">
          {get('dayPeriod')}
        </span>
      </span>
    </div>
  )
}