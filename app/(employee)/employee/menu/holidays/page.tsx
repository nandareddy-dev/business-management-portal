'use client'

import Link from 'next/link'
import { ArrowLeft, Sparkles, TreePine, CalendarX2, CalendarDays } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface Holiday {
  name: string
  date: string // YYYY-MM-DD
  note: string
  icon: LucideIcon
}

// Edit this list to add / remove holidays. Past dates are hidden automatically.
const HOLIDAYS: Holiday[] = [
  { name: 'Diwali',    date: '2026-11-08', note: 'Festival of lights',    icon: Sparkles },
  { name: 'Christmas', date: '2026-12-25', note: 'Christmas Day',         icon: TreePine },
]

// Timezone-safe YYYY-MM-DD for Asia/Kolkata
function toISTDateStr(d: Date) {
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

function parseParts(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return { y, m, d }
}

function daysUntil(dateStr: string) {
  const t = parseParts(dateStr)
  const n = parseParts(toISTDateStr(new Date()))
  const target = Date.UTC(t.y, t.m - 1, t.d)
  const today = Date.UTC(n.y, n.m - 1, n.d)
  return Math.round((target - today) / 86400000)
}

function countdownLabel(days: number) {
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return `${days} days to go`
}

function describe(dateStr: string) {
  const { y, m, d } = parseParts(dateStr)
  const utc = new Date(Date.UTC(y, m - 1, d))
  return {
    d,
    month: utc.toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' }),
    weekday: utc.toLocaleDateString('en-IN', { weekday: 'long', timeZone: 'UTC' }),
    full: utc.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }),
    isWeekend: [0, 6].includes(utc.getUTCDay()),
  }
}

export default function HolidaysPage() {
  const upcoming = HOLIDAYS
    .map(h => ({ ...h, days: daysUntil(h.date) }))
    .filter(h => h.days >= 0)
    .sort((a, b) => a.days - b.days)

  const next = upcoming[0]
  const later = upcoming.slice(1)
  const nextInfo = next ? describe(next.date) : null
  const NextIcon = next?.icon

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/70 via-slate-50 to-white px-4 pb-28 pt-5">
      <div className="mx-auto max-w-3xl">

        {/* ── HERO ── */}
        <header className="relative isolate mb-6 overflow-hidden rounded-3xl bg-slate-900 p-5 text-white shadow-xl sm:p-7">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950" />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              backgroundImage: 'radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)',
              backgroundSize: '18px 18px',
            }}
          />
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 -z-10 h-56 w-56 rounded-full bg-indigo-500/30 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-20 left-6 -z-10 h-48 w-48 rounded-full bg-emerald-500/20 blur-3xl" />

          <Link
            href="/employee/menu"
            className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-100 ring-1 ring-white/15 transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-400/40"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to menu
          </Link>

          <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-300">Employee Portal</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Holidays</h1>
          <p className="mt-1 text-sm text-slate-300">
            {upcoming.length > 0
              ? `${upcoming.length} upcoming ${upcoming.length === 1 ? 'holiday' : 'holidays'}`
              : 'Nothing scheduled'}
          </p>

          {/* Next holiday highlight */}
          {next && nextInfo && NextIcon && (
            <div className="mt-5 flex items-center gap-4 rounded-2xl bg-white/[0.08] p-4 ring-1 ring-white/15 backdrop-blur sm:gap-5 sm:p-5">
              <div className="flex h-20 w-20 flex-shrink-0 flex-col items-center justify-center rounded-2xl bg-white text-slate-900 shadow-lg">
                <span className="text-[11px] font-bold uppercase tracking-wide text-indigo-600">{nextInfo.month}</span>
                <span className="text-3xl font-extrabold leading-none tabular-nums">{nextInfo.d}</span>
              </div>

              <div className="min-w-0 flex-1">
                <span className="inline-flex items-center rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-200 ring-1 ring-emerald-300/30">
                  Next holiday
                </span>
                <h2 className="mt-1.5 truncate text-xl font-bold">{next.name}</h2>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-300">
                  <NextIcon className="h-3.5 w-3.5 text-indigo-300" />
                  <span className="truncate">{next.note}</span>
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {nextInfo.weekday}
                  {nextInfo.isWeekend && <span> · already a weekend off</span>}
                </p>
              </div>

              <div className="flex-shrink-0 text-right">
                <p className="text-3xl font-extrabold leading-none tabular-nums text-emerald-300">
                  {next.days <= 1 ? countdownLabel(next.days) : next.days}
                </p>
                {next.days > 1 && <p className="mt-1 text-xs text-slate-300">days to go</p>}
              </div>
            </div>
          )}
        </header>

        {/* ── BODY ── */}
        {upcoming.length === 0 ? (
          <div className="flex flex-col items-center rounded-3xl border border-dashed border-slate-300 bg-white py-14 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <CalendarX2 className="h-7 w-7" />
            </div>
            <p className="mt-5 text-lg font-bold text-slate-900">No upcoming holidays</p>
            <p className="mt-1 px-6 text-sm text-slate-500">New holidays will show up here once they are announced.</p>
          </div>
        ) : (
          later.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between px-1">
                <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <CalendarDays className="h-4 w-4 text-indigo-600" /> Coming up
                </h2>
                <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                  {later.length}
                </span>
              </div>

              <ul className="space-y-3">
                {later.map(h => {
                  const info = describe(h.date)
                  const Icon = h.icon
                  return (
                    <li
                      key={h.date}
                      className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:gap-5 sm:p-5"
                    >
                      {/* Date plate */}
                      <div className="flex h-16 w-16 flex-shrink-0 flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-200 sm:h-20 sm:w-20">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-indigo-100">{info.month}</span>
                        <span className="text-2xl font-extrabold leading-none tabular-nums sm:text-3xl">{info.d}</span>
                      </div>

                      {/* Details */}
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font-bold text-slate-900 sm:text-lg">{h.name}</h3>
                        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
                          <Icon className="h-3.5 w-3.5 flex-shrink-0 text-indigo-500" />
                          <span className="truncate">{h.note}</span>
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {info.full}
                          {info.isWeekend && <span> · already a weekend off</span>}
                        </p>
                      </div>

                      {/* Countdown */}
                      <div className="flex-shrink-0 rounded-2xl bg-slate-50 px-3 py-2 text-center ring-1 ring-slate-100">
                        <p className="text-2xl font-extrabold leading-none tabular-nums text-slate-900">
                          {h.days <= 1 ? countdownLabel(h.days) : h.days}
                        </p>
                        {h.days > 1 && <p className="mt-1 text-[11px] font-medium text-slate-400">days to go</p>}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        )}
      </div>
    </div>
  )
}