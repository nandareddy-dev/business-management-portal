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
    <div className={`flex items-end gap-1.5 tabular-nums ${className}`} aria-live="off">
      <span className="text-4xl font-extrabold leading-none tracking-tight sm:text-5xl">{get('hour')}</span>
      <span className="mb-1 animate-pulse text-3xl font-bold leading-none text-indigo-300 sm:text-4xl">:</span>
      <span className="text-4xl font-extrabold leading-none tracking-tight sm:text-5xl">{get('minute')}</span>
      <span className="mb-1 ml-1 flex flex-col items-start gap-0.5 leading-none">
        <span className="text-sm font-bold text-indigo-200">{get('second')}</span>
        <span className="rounded-md bg-white/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white ring-1 ring-white/20">
          {get('dayPeriod')}
        </span>
      </span>
    </div>
  )
}