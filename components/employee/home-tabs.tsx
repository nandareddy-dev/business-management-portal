'use client'

import { useState } from 'react'
import {
  Cake,
  CalendarDays,
  ClipboardList,
  Megaphone,
  Quote,
  ShieldCheck,
  Sparkles,
  Trophy,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

type TabKey = 'communication' | 'life'

interface Announcement {
  icon: LucideIcon
  category: string
  title: string
  body: string
  time: string
  urgent?: boolean
}

// Static content — move to a Supabase table (announcements) later if you want these admin-editable.
const ANNOUNCEMENTS: Announcement[] = [
  {
    icon: CalendarDays,
    category: 'Holiday',
    title: 'Diwali holiday notice',
    body: 'Office will be closed for Diwali. HR will confirm the exact dates and the day regular work resumes.',
    time: '2h ago',
    urgent: true,
  },
  {
    icon: Wallet,
    category: 'Payroll',
    title: 'Salary slips are live',
    body: 'Your latest salary slip is now available. Open Menu → Salary Slips to view or search any month.',
    time: '1d ago',
  },
  {
    icon: ClipboardList,
    category: 'Reminder',
    title: 'Submit your daily work report',
    body: 'Please submit your work report before you check out each day so attendance and reports stay in sync.',
    time: '2d ago',
  },
  {
    icon: ShieldCheck,
    category: 'Policy',
    title: 'Geofence check-in is mandatory',
    body: 'Check-in is allowed only within 200m of the office location. Enable location access on your phone.',
    time: '3d ago',
  },
]

const QUOTE_OF_THE_DAY = "Great work isn't done alone. It's built one small win at a time, together."

export function HomeTabs() {
  const [tab, setTab] = useState<TabKey>('communication')

  const tabs: { key: TabKey; label: string; icon: LucideIcon; count?: number }[] = [
    { key: 'communication', label: 'Communication', icon: Megaphone, count: ANNOUNCEMENTS.length },
    { key: 'life', label: 'Life at GK', icon: Sparkles },
  ]

  return (
    <div className="bg-white px-3 pb-3 pt-2.5 sm:px-4">
      {/* Segmented tabs */}
      <div role="tablist" className="mb-2.5 grid grid-cols-2 gap-0.5 rounded-xl bg-slate-100 p-0.5">
        {tabs.map((t) => {
          const active = tab === t.key
          const Icon = t.icon

          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition sm:text-xs ${
                active
                  ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={13} className={active ? 'text-indigo-600' : 'text-slate-400'} />
              <span className="truncate">{t.label}</span>
              {t.count !== undefined && t.count > 0 && (
                <span
                  className={`rounded-full px-1.5 text-[9px] font-bold ${
                    active ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {tab === 'communication' && (
        <div className="space-y-1.5">
          {ANNOUNCEMENTS.length === 0 ? (
            <EmptyState label="No communication yet" />
          ) : (
            ANNOUNCEMENTS.map((a, i) => {
              const Icon = a.icon

              return (
                <div
                  key={i}
                  className={`flex gap-2.5 rounded-xl p-2.5 ring-1 ${
                    a.urgent ? 'bg-rose-50/70 ring-rose-100' : 'bg-slate-50 ring-slate-100'
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      a.urgent ? 'bg-rose-100 text-rose-600' : 'bg-white text-indigo-500 ring-1 ring-slate-200'
                    }`}
                  >
                    <Icon size={15} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex items-center justify-between gap-2">
                      <span
                        className={`rounded-full px-1.5 py-px text-[9px] font-bold uppercase tracking-wide ${
                          a.urgent ? 'bg-rose-100 text-rose-700' : 'bg-indigo-50 text-indigo-700'
                        }`}
                      >
                        {a.category}
                      </span>
                      <span className="shrink-0 text-[10px] font-medium text-slate-400">{a.time}</span>
                    </div>

                    <p className="text-xs font-semibold text-slate-900">{a.title}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{a.body}</p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {tab === 'life' && (
        <div className="space-y-2">
          <div className="relative isolate overflow-hidden rounded-xl bg-slate-900 p-3 text-white">
            <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-indigo-600 via-blue-700 to-slate-900" />
            <Quote size={40} className="pointer-events-none absolute -right-2 -top-2 -z-10 text-white/10" />

            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-indigo-200">Quote of the day</p>
            <p className="mt-1.5 text-xs font-medium italic leading-snug">
              &ldquo;{QUOTE_OF_THE_DAY}&rdquo;
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-gradient-to-b from-pink-50 to-white p-3 text-center ring-1 ring-pink-100">
              <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-pink-100 text-pink-600">
                <Cake size={16} />
              </div>
              <p className="mt-1.5 text-[11px] font-bold text-pink-800">Team birthday</p>
              <p className="text-[10px] text-pink-600/80">Check calendar</p>
            </div>

            <div className="rounded-xl bg-gradient-to-b from-amber-50 to-white p-3 text-center ring-1 ring-amber-100">
              <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                <Trophy size={16} />
              </div>
              <p className="mt-1.5 text-[11px] font-bold text-amber-800">Top performer</p>
              <p className="text-[10px] text-amber-600/80">This week</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 py-6 text-center">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-0.5 text-[11px] text-slate-400">Check back soon</p>
    </div>
  )
}