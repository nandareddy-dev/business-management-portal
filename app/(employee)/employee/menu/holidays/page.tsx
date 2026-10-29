'use client'

import Link from 'next/link'
import { ArrowLeft, Sparkles, TreePine, CalendarX2 } from 'lucide-react'
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

export default function HolidaysPage() {
  const upcoming = HOLIDAYS
    .map(h => ({ ...h, days: daysUntil(h.date) }))
    .filter(h => h.days >= 0)
    .sort((a, b) => a.days - b.days)

  return (
    <div className="min-h-screen bg-[#EEE8DF] px-4 pb-28 pt-6">
      <div className="relative mx-auto max-w-3xl border border-[#D9C9A3] bg-[#FAF7F1]">
        {/* Gold corner brackets */}
        <span aria-hidden className="pointer-events-none absolute -left-px -top-px z-10 h-4 w-4 border-l-[3px] border-t-[3px] border-[#B8860B]" />
        <span aria-hidden className="pointer-events-none absolute -right-px -top-px z-10 h-4 w-4 border-r-[3px] border-t-[3px] border-[#B8860B]" />
        <span aria-hidden className="pointer-events-none absolute -bottom-px -left-px z-10 h-4 w-4 border-b-[3px] border-l-[3px] border-[#B8860B]" />
        <span aria-hidden className="pointer-events-none absolute -bottom-px -right-px z-10 h-4 w-4 border-b-[3px] border-r-[3px] border-[#B8860B]" />

        {/* Header */}
        <header
          className="border-b border-[#B8860B]/60 bg-[#1A1410] px-8 pb-7 pt-8"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        >
          <Link
            href="/employee/menu"
            className="inline-flex items-center gap-2 font-mono text-xs tracking-[0.2em] text-[#8F8576] transition hover:text-[#E8C872] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8860B]"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> BACK TO MENU
          </Link>
          <h1 className="mt-4 font-serif text-4xl italic text-white">Holidays</h1>
          <p className="mt-1 text-sm text-[#A39886]">
            {upcoming.length > 0
              ? `${upcoming.length} upcoming ${upcoming.length === 1 ? 'holiday' : 'holidays'}`
              : 'Nothing scheduled'}
          </p>
        </header>

        {/* Body */}
        <div className="px-6 py-8 sm:px-8">
          {upcoming.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#D9C9A3] bg-white text-[#B8860B]">
                <CalendarX2 className="h-7 w-7" />
              </div>
              <p className="mt-5 font-serif text-xl text-[#1A1410]">No upcoming holidays</p>
              <p className="mt-1 text-sm text-[#9A8F82]">New holidays will show up here once they are announced.</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {upcoming.map((h, i) => {
                const { y, m, d } = parseParts(h.date)
                const utc = new Date(Date.UTC(y, m - 1, d))
                const month = utc.toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' })
                const weekday = utc.toLocaleDateString('en-IN', { weekday: 'long', timeZone: 'UTC' })
                const isNext = i === 0
                const isWeekend = [0, 6].includes(utc.getUTCDay())
                const Icon = h.icon
                return (
                  <li
                    key={h.date}
                    className={`flex items-center gap-4 border p-4 sm:gap-5 sm:p-5 ${
                      isNext
                        ? 'border-[#B8860B] bg-white shadow-[0_10px_30px_-18px_rgba(184,134,11,0.7)]'
                        : 'border-[#E4DAC4] bg-white/70'
                    }`}
                  >
                    {/* Date plate */}
                    <div
                      className={`flex h-20 w-20 flex-shrink-0 flex-col items-center justify-center ${
                        isNext ? 'bg-[#1A1410] text-white' : 'bg-[#F1EADB] text-[#1A1410]'
                      }`}
                    >
                      <span className={`text-xs ${isNext ? 'text-[#E8C872]' : 'text-[#8A7A55]'}`}>{month}</span>
                      <span className="font-serif text-3xl font-semibold leading-none">{d}</span>
                    </div>

                    {/* Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-serif text-xl text-[#1A1410]">{h.name}</h2>
                        {isNext && (
                          <span className="rounded-full bg-[#B8860B] px-2.5 py-0.5 text-xs font-medium text-white">
                            Next holiday
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 flex items-center gap-1.5 text-sm text-[#7A6E60]">
                        <Icon className="h-3.5 w-3.5 text-[#B8860B]" />
                        {h.note}
                      </p>
                      <p className="mt-1 text-sm text-[#9A8F82]">
                        {weekday}
                        {isWeekend && <span> · already a weekend off</span>}
                      </p>
                    </div>

                    {/* Countdown */}
                    <div className="flex-shrink-0 text-right">
                      <p className={`font-serif text-3xl font-semibold leading-none tabular-nums ${isNext ? 'text-[#B8860B]' : 'text-[#1A1410]'}`}>
                        {h.days <= 1 ? countdownLabel(h.days) : h.days}
                      </p>
                      {h.days > 1 && <p className="mt-1 text-xs text-[#9A8F82]">days to go</p>}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}