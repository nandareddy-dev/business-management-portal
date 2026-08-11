'use client'

import { useState } from 'react'
import { Gift, Target, HeartHandshake, Cake, Trophy, Quote } from 'lucide-react'

type TabKey = 'communication' | 'offers' | 'life'

interface Announcement {
  title: string
  body: string
  time: string
  urgent?: boolean
}

interface Offer {
  icon: typeof Gift
  title: string
  body: string
  color: 'emerald' | 'purple' | 'amber'
}

// Static content — move to a Supabase table (announcements / offers) later if you want these admin-editable.
const ANNOUNCEMENTS: Announcement[] = [
  { title: 'Independence Day holiday', body: 'Office closed on 15th Aug. Regular working resumes 17th.', time: '2h ago', urgent: true },
  { title: 'Weekly team sync', body: 'Friday 4pm, conference room. All CREs required.', time: '1d ago' },
  { title: 'New attendance policy', body: 'Geofence check-in now mandatory within 200m of office.', time: '3d ago' },
]

const OFFERS: Offer[] = [
  { icon: Gift, title: 'Referral bonus', body: '₹5,000 for every successful hire referral. Valid till Aug 31.', color: 'emerald' },
  { icon: Target, title: 'Performance incentive', body: 'Hit monthly target, get 10% bonus on base salary.', color: 'purple' },
  { icon: HeartHandshake, title: 'Health checkup', body: 'Free annual health checkup at partner clinic — book via HR.', color: 'amber' },
]

const QUOTE_OF_THE_DAY = "Great work isn't done alone. It's built one small win at a time, together."

const colorMap = {
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', title: 'text-emerald-700', body: 'text-emerald-600' },
  purple:  { bg: 'bg-purple-50',  icon: 'text-purple-600',  title: 'text-purple-700',  body: 'text-purple-600' },
  amber:   { bg: 'bg-amber-50',   icon: 'text-amber-600',   title: 'text-amber-700',   body: 'text-amber-600' },
}

export function HomeTabs() {
  const [tab, setTab] = useState<TabKey>('communication')

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'communication', label: 'Communication' },
    { key: 'offers', label: 'Offers' },
    { key: 'life', label: 'Life at GK' },
  ]

  return (
    <div className="bg-white">
      <div className="flex gap-6 px-6 border-b border-gray-100">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`py-3 text-sm transition-colors border-b-2 ${
              tab === t.key
                ? 'border-blue-600 text-gray-900 font-medium'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-6 py-4">
        {tab === 'communication' && (
          <div className="divide-y divide-gray-100">
            {ANNOUNCEMENTS.length === 0 ? (
              <EmptyState label="No communication yet" />
            ) : (
              ANNOUNCEMENTS.map((a, i) => (
                <div key={i} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${a.urgent ? 'bg-rose-500' : 'bg-gray-300'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline gap-2">
                      <p className="text-sm font-medium text-gray-900">{a.title}</p>
                      <span className="text-xs text-gray-400 flex-shrink-0">{a.time}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{a.body}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'offers' && (
          <div className="space-y-3">
            {OFFERS.length === 0 ? (
              <EmptyState label="No offers yet" />
            ) : (
              OFFERS.map((o, i) => {
                const c = colorMap[o.color]
                const Icon = o.icon
                return (
                  <div key={i} className={`rounded-xl p-3.5 ${c.bg}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Icon className={`w-4 h-4 ${c.icon}`} />
                      <p className={`text-sm font-medium ${c.title}`}>{o.title}</p>
                    </div>
                    <p className={`text-xs ${c.body}`}>{o.body}</p>
                  </div>
                )
              })
            )}
          </div>
        )}

        {tab === 'life' && (
          <div className="space-y-3">
            <div className="rounded-xl p-4 bg-blue-50">
              <div className="flex items-start gap-2">
                <Quote className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-blue-700 italic leading-relaxed">&ldquo;{QUOTE_OF_THE_DAY}&rdquo;</p>
                  <p className="text-xs text-blue-500 mt-1.5">Quote of the day</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl p-3.5 bg-emerald-50 text-center">
                <Cake className="w-5 h-5 text-emerald-600 mx-auto" />
                <p className="text-xs font-medium text-emerald-700 mt-1.5">Team birthday</p>
                <p className="text-[11px] text-emerald-500">Check calendar</p>
              </div>
              <div className="rounded-xl p-3.5 bg-purple-50 text-center">
                <Trophy className="w-5 h-5 text-purple-600 mx-auto" />
                <p className="text-xs font-medium text-purple-700 mt-1.5">Top performer</p>
                <p className="text-[11px] text-purple-500">This week</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="py-10 text-center">
      <p className="text-sm text-gray-400">{label}</p>
      <p className="text-xs text-gray-300 mt-1">Check back soon</p>
    </div>
  )
}