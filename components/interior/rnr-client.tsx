'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Phone } from 'lucide-react'

const fmtDate = (ds: string) => {
  if (!ds) return '—'
  return new Date(ds).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const ini = (n: string) => n?.split(' ').map((x: string) => x[0]).join('').slice(0, 2).toUpperCase() || '?'

const AVATAR_COLORS = [
  ['#7C3AED','#4F46E5'], ['#0891B2','#0E7490'], ['#059669','#047857'],
  ['#D97706','#B45309'], ['#DB2777','#BE185D'], ['#DC2626','#B91C1C'],
]

function getColors(name: string) {
  return AVATAR_COLORS[name?.charCodeAt(0) % AVATAR_COLORS.length] ?? AVATAR_COLORS[0]
}

interface RnrLead {
  id: string
  lead_name: string
  phone?: string
  budget?: string | number
  property_type?: string
  source?: string
  rnr_callback_date?: string | null
  created_at: string
}

interface Props {
  leads: RnrLead[]
  count: number
  overdueLeads: RnrLead[]
  todayLeads: RnrLead[]
  tomorrowLeads: RnrLead[]
  upcomingLeads: RnrLead[]
  noDateLeads: RnrLead[]
}

type QuickFilter = 'all' | 'today' | 'tomorrow' | 'overdue'

export function RnrClient({
  leads, count,
  overdueLeads, todayLeads, tomorrowLeads, upcomingLeads, noDateLeads
}: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all')

  const filtered = useMemo(() => {
    let base = leads

    // Quick filter
    if (quickFilter === 'overdue')  base = overdueLeads
    if (quickFilter === 'today')    base = todayLeads
    if (quickFilter === 'tomorrow') base = tomorrowLeads

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      base = base.filter((l: RnrLead) =>
        l.lead_name?.toLowerCase().includes(q) || l.phone?.includes(q)
      )
    }

    // Date range (on created_at)
    if (dateFrom) base = base.filter((l: RnrLead) => new Date(l.created_at) >= new Date(dateFrom + 'T00:00:00'))
    if (dateTo)   base = base.filter((l: RnrLead) => new Date(l.created_at) <= new Date(dateTo + 'T23:59:59'))

    return base
  }, [leads, search, dateFrom, dateTo, quickFilter, overdueLeads, todayLeads, tomorrowLeads])

  // When filtered — show flat list; when 'all' and no search — show grouped
  const isGrouped = quickFilter === 'all' && !search.trim() && !dateFrom && !dateTo

  return (
    <div className="space-y-3">
      {/* Quick filters + Search + Date — all on one line */}
      <div className="bg-white rounded-xl px-3 py-2 border border-[#E8E2D8]">
        <div className="flex items-center gap-2 flex-wrap xl:flex-nowrap">

          <span className="text-[9px] font-bold uppercase tracking-wider text-[#9A8F82] flex-shrink-0">Quick:</span>
          {([
            { key: 'all',      label: '📋 All',      count: count },
            { key: 'overdue',  label: '⏰ Overdue',  count: overdueLeads.length },
            { key: 'today',    label: '📅 Today',    count: todayLeads.length },
            { key: 'tomorrow', label: '🔜 Tomorrow', count: tomorrowLeads.length },
          ] as { key: QuickFilter; label: string; count: number }[]).map(f => (
            <button key={f.key} onClick={() => setQuickFilter(f.key)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all flex-shrink-0 whitespace-nowrap"
              style={{
                background: quickFilter === f.key ? (f.key === 'overdue' ? '#FEF2F2' : f.key === 'today' ? '#FFFBEB' : '#F5F3FF') : '#F5F0E8',
                color: quickFilter === f.key ? (f.key === 'overdue' ? '#DC2626' : f.key === 'today' ? '#D97706' : '#7C3AED') : '#6B5E4E',
                border: `1px solid ${quickFilter === f.key ? (f.key === 'overdue' ? '#FECACA' : f.key === 'today' ? '#FDE68A' : '#DDD6FE') : 'rgba(184,134,11,0.15)'}`,
              }}>
              {f.label}
              {f.count > 0 && (
                <span className="px-1.5 py-px rounded-full text-[8px] font-black"
                  style={{ background: quickFilter === f.key ? 'rgba(255,255,255,0.28)' : '#E8E2D8', color: quickFilter === f.key ? '#fff' : '#6B5E4E' }}>
                  {f.count}
                </span>
              )}
            </button>
          ))}

          <div className="relative flex-1 min-w-[140px]">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9A8F82]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or phone..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs outline-none border"
              style={{ background: '#F5F0E8', borderColor: 'rgba(184,134,11,0.2)', color: '#1C1712' }}
            />
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="w-[128px] px-2 py-1.5 rounded-lg text-[11px] outline-none border"
              style={{ background: '#F5F0E8', borderColor: 'rgba(184,134,11,0.2)', color: '#1C1712' }}/>
            <span className="text-[10px] text-[#9A8F82]">to</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="w-[128px] px-2 py-1.5 rounded-lg text-[11px] outline-none border"
              style={{ background: '#F5F0E8', borderColor: 'rgba(184,134,11,0.2)', color: '#1C1712' }}/>
          </div>

        </div>
      </div>

      {/* Content */}
      {isGrouped ? (
        <GroupedView
          overdueLeads={overdueLeads}
          todayLeads={todayLeads}
          tomorrowLeads={tomorrowLeads}
          upcomingLeads={upcomingLeads}
          noDateLeads={noDateLeads}
          router={router}
        />
      ) : (
        <LeadTable leads={filtered} label="Results" color="#DC2626" router={router} showEmpty />
      )}
    </div>
  )
}

function GroupedView({ overdueLeads, todayLeads, tomorrowLeads, upcomingLeads, noDateLeads, router }: {
  overdueLeads: RnrLead[]; todayLeads: RnrLead[]; tomorrowLeads: RnrLead[];
  upcomingLeads: RnrLead[]; noDateLeads: RnrLead[]; router: ReturnType<typeof useRouter>
}) {
  return (
    <div className="space-y-3">
      {overdueLeads.length > 0 && (
        <LeadTable
          leads={overdueLeads}
          label="Overdue"
          icon="⏰"
          color="#DC2626"
          headerBg="#FEF2F2"
          headerBorder="#FECACA"
          router={router}
          footerNote={`${overdueLeads.length} overdue callback${overdueLeads.length > 1 ? 's' : ''}`}
        />
      )}
      {todayLeads.length > 0 && (
        <LeadTable
          leads={todayLeads}
          label="Today"
          icon="📅"
          color="#D97706"
          headerBg="#FFFBEB"
          headerBorder="#FDE68A"
          router={router}
          footerNote={`${todayLeads.length} callback${todayLeads.length > 1 ? 's' : ''} today`}
        />
      )}
      {tomorrowLeads.length > 0 && (
        <LeadTable
          leads={tomorrowLeads}
          label="Tomorrow"
          icon="🔜"
          color="#7C3AED"
          headerBg="#F5F3FF"
          headerBorder="#DDD6FE"
          router={router}
          footerNote={`${tomorrowLeads.length} callback${tomorrowLeads.length > 1 ? 's' : ''} tomorrow`}
        />
      )}
      {upcomingLeads.length > 0 && (
        <LeadTable
          leads={upcomingLeads}
          label="Upcoming"
          icon="📆"
          color="#0891B2"
          headerBg="#ECFEFF"
          headerBorder="#A5F3FC"
          router={router}
          footerNote={`${upcomingLeads.length} upcoming`}
        />
      )}
      {noDateLeads.length > 0 && (
        <LeadTable
          leads={noDateLeads}
          label="No Date Set"
          icon="❓"
          color="#9A8F82"
          headerBg="#F5F0E8"
          headerBorder="#E2D9C8"
          router={router}
          footerNote={`${noDateLeads.length} leads — no callback scheduled`}
        />
      )}
    </div>
  )
}

function LeadTable({
  leads, label, icon, color, headerBg, headerBorder, router, footerNote, showEmpty
}: {
  leads: RnrLead[]; label: string; icon?: string; color: string;
  headerBg?: string; headerBorder?: string; router: ReturnType<typeof useRouter>;
  footerNote?: string; showEmpty?: boolean
}) {
  if (!showEmpty && leads.length === 0) return null
  if (showEmpty && leads.length === 0) return (
    <div className="bg-white rounded-xl border border-[#E8E2D8] p-6 text-center">
      <p className="text-2xl mb-1.5">🔍</p>
      <p className="text-xs font-bold text-[#9A8F82]">No leads found</p>
    </div>
  )

  return (
    <div className="bg-white rounded-xl border border-[#E8E2D8] overflow-hidden shadow-sm">
      {/* Section header */}
      <div className="px-3 py-2 flex items-center gap-2"
        style={{ background: headerBg ?? '#FEF2F2', borderBottom: `1px solid ${headerBorder ?? '#FECACA'}` }}>
        {icon && <span className="text-xs">{icon}</span>}
        <p className="text-[9px] font-black uppercase tracking-[2.5px]" style={{ color }}>
          {label}
        </p>
        <span className="px-1.5 py-px rounded-full text-[8px] font-black text-white ml-1"
          style={{ background: color }}>{leads.length}</span>
      </div>

      {/* Table header */}
      <div className="hidden md:grid grid-cols-[28px_1fr_150px_130px_90px_110px_44px] gap-2 px-3 py-1.5 border-b border-[#F0EBE0]">
        {['#', 'LEAD', 'PHONE', 'SOURCE', 'BUDGET', 'CALLBACK', 'CALL'].map(h => (
          <p key={h} className="text-[8px] font-bold uppercase tracking-wider text-[#9A8F82]">{h}</p>
        ))}
      </div>

      {/* Rows */}
      {leads.map((lead: RnrLead, i: number) => {
        const [c1, c2] = getColors(lead.lead_name)
        const isOverdue = lead.rnr_callback_date && new Date(lead.rnr_callback_date) < new Date()
        return (
          <div
            key={lead.id}
            onClick={() => router.push(`/dashboard/industries/interior-design/leads/${lead.id}`)}
            className="grid md:grid-cols-[28px_1fr_150px_130px_90px_110px_44px] gap-2 px-3 py-2 cursor-pointer hover:bg-[#FFFDF8] transition-colors items-center"
            style={{ borderBottom: i < leads.length - 1 ? '1px solid #F5F0E8' : 'none' }}
          >
            {/* # */}
            <p className="text-[10px] text-[#C4BAB0] font-bold hidden md:block">{i + 1}</p>

            {/* Lead */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
                style={{ background: `linear-gradient(135deg,${c1},${c2})` }}>
                {ini(lead.lead_name)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#1C1712] truncate">{lead.lead_name}</p>
                {lead.property_type && (
                  <p className="text-[9px] text-[#9A8F82] truncate">{lead.property_type}</p>
                )}
              </div>
            </div>

            {/* Phone */}
            <p className="text-xs font-mono text-[#6B5E4E] hidden md:block">{lead.phone || '—'}</p>

            {/* Source */}
            <div className="hidden md:block">
              {lead.source ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
                  style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }}>
                  📌 {lead.source}
                </span>
              ) : <span className="text-[#C4BAB0]">—</span>}
            </div>

            {/* Budget */}
            <div className="hidden md:block">
              {lead.budget ? (
                <span className="text-xs font-bold" style={{ color: '#B8860B' }}>₹{lead.budget}</span>
              ) : <span className="text-[#C4BAB0]">—</span>}
            </div>

            {/* Callback date */}
            <div className="hidden md:block">
              {lead.rnr_callback_date ? (
                <span className="text-[10px] font-bold" style={{ color: isOverdue ? '#DC2626' : '#6B5E4E' }}>
                  {isOverdue && '⚠️ '}{fmtDate(lead.rnr_callback_date)}
                </span>
              ) : (
                <span className="text-[10px] text-[#C4BAB0]">No date</span>
              )}
            </div>

            {/* Call button */}
            <div className="hidden md:flex justify-end" onClick={e => e.stopPropagation()}>
              <a href={`tel:${lead.phone}`}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:scale-110 transition-all"
                style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
                <Phone className="w-3.5 h-3.5" style={{ color: '#059669' }}/>
              </a>
            </div>

            {/* Mobile: phone + call row */}
            <div className="md:hidden col-span-full flex items-center justify-between mt-1">
              <p className="text-xs font-mono text-[#6B5E4E]">{lead.phone || '—'}</p>
              <div className="flex items-center gap-2">
                {lead.budget && (
                  <span className="text-xs font-bold" style={{ color: '#B8860B' }}>₹{lead.budget}</span>
                )}
                {lead.rnr_callback_date && (
                  <span className="text-[10px] font-bold" style={{ color: isOverdue ? '#DC2626' : '#6B5E4E' }}>
                    {isOverdue ? '⚠️ ' : '🔁 '}{fmtDate(lead.rnr_callback_date)}
                  </span>
                )}
                <a href={`tel:${lead.phone}`} onClick={e => e.stopPropagation()}
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
                  <Phone className="w-3.5 h-3.5" style={{ color: '#059669' }}/>
                </a>
              </div>
            </div>
          </div>
        )
      })}

      {/* Footer */}
      {footerNote && (
        <div className="px-3 py-1.5 flex items-center justify-between"
          style={{ borderTop: '1px solid #F5F0E8', background: '#FAFAF8' }}>
          <p className="text-[9px] text-[#9A8F82]">{footerNote}</p>
          <p className="text-[9px] text-[#C4BAB0]">Interior Design · GK CRM</p>
        </div>
      )}
    </div>
  )
}