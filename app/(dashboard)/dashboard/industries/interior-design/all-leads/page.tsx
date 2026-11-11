'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Users, Search, X, Calendar, ChevronDown, ChevronRight } from 'lucide-react'
import { matchStage, getStageCounts, UNIQUE_STAGES, type CanonicalStage } from '@/lib/stage-utils'
import { fetchAllLeads } from '@/lib/fetch-all-leads'

interface Lead {
  id: string
  lead_name: string
  phone?: string | null
  pipeline_stage: string
  source?: string | null
  interest?: string | null
  budget?: string | number | null
  city?: string | null
  location?: string | null
  raw_field_data?: Record<string, unknown> | null
  property_type?: string | null
  created_at: string
  [key: string]: unknown
}

const GRADIENTS = [
  ['#7C3AED', '#4F46E5'], ['#0891B2', '#0E7490'], ['#059669', '#047857'],
  ['#D97706', '#B45309'], ['#DB2777', '#BE185D'], ['#7C3AED', '#6D28D9'],
]

const SOURCE_CONFIG: Record<string, { bg: string; color: string; icon: string }> = {
  Instagram:   { bg: '#FDF2F8', color: '#DB2777', icon: '📸' },
  Facebook:    { bg: '#EFF6FF', color: '#2563EB', icon: '📘' },
  WhatsApp:    { bg: '#F0FDF4', color: '#16A34A', icon: '💬' },
  Referral:    { bg: '#FFFBEB', color: '#D97706', icon: '🤝' },
  'Walk-in':   { bg: '#F5F3FF', color: '#7C3AED', icon: '🚶' },
  Google:      { bg: '#FEF2F2', color: '#DC2626', icon: '🔍' },
  Other:       { bg: '#F5F0E8', color: '#7A6E60', icon: '📌' },
}

const STAGE_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  'new':        { bg: '#F5F3FF', color: '#7C3AED', label: '🆕 New Leads' },
  'new-leads':  { bg: '#F5F3FF', color: '#7C3AED', label: '🆕 New Leads' },
  'followup':   { bg: '#FFFBEB', color: '#D97706', label: '🔄 Follow Up' },
  'follow-up':  { bg: '#FFFBEB', color: '#D97706', label: '🔄 Follow Up' },
  'rnr':        { bg: '#FEF2F2', color: '#DC2626', label: '📵 RNR' },
  'sitevisit':  { bg: '#ECFEFF', color: '#0891B2', label: '🏠 Site Visit' },
  'site-visit': { bg: '#ECFEFF', color: '#0891B2', label: '🏠 Site Visit' },
  'quotation':  { bg: '#FDF2F8', color: '#DB2777', label: '💰 Quotations' },
  'quotations': { bg: '#FDF2F8', color: '#DB2777', label: '💰 Quotations' },
  'won':        { bg: '#FFFBEB', color: '#B8860B', label: '🏆 Won' },
  'lost':       { bg: '#FEF2F2', color: '#DC2626', label: '❌ Lost' },
}

const STAGE_ORDER: Record<string, number> = {
  'calling': 1, 'followup': 2, 'follow-up': 2, 'rnr': 2,
  'sitevisit': 3, 'site-visit': 3,
  'quotation': 4, 'quotations': 4,
  'fresh-leads': 5, 'new': 6, 'new-leads': 6,
  'won': 7, 'lost': 8,
}

const INTEREST_CONFIG: Record<string, { bg: string; color: string }> = {
  High:   { bg: '#F0FDF4', color: '#16A34A' },
  Medium: { bg: '#FFFBEB', color: '#D97706' },
  Low:    { bg: '#FEF2F2', color: '#DC2626' },
}

const ini = (name: string) =>
  name?.split(' ').map((x: string) => x[0]).join('').slice(0, 2).toUpperCase() || '?'

// Location: uses the dedicated `location` column if present, otherwise falls
// back to the answer from the Facebook lead form (raw_field_data.location).
const getLocation = (l: Lead): string | null => {
  if (typeof l.location === 'string' && l.location.trim()) return l.location
  const v = l.raw_field_data?.location
  return typeof v === 'string' && v.trim() ? v.replace(/_/g, ' ') : null
}

const LEAD_BASE = '/dashboard/industries/interior-design/leads'

// Parses budget text robustly instead of naively concatenating digits.
// Handles: plain rupee numbers ("800000"), lakh/crore shorthand ("7.5 lacks", "5-8L"),
// and ranges ("10 to 15 lacks") — without mangling "10 to 15" into "1015".
function formatBudget(raw: string | number | null | undefined): string | null {
  if (!raw) return null
  let str = String(raw).trim()
  if (!str) return null

  // Indian-style thousands separators (e.g. "15,00,000") — strip so they don't
  // get mistaken for a range/list of separate numbers.
  str = str.replace(/(\d),(?=\d)/g, '$1')

  const hasCrore = /crore|\bcr\b/i.test(str)
  const hasLakh  = !hasCrore && /lakh|lac|\d\s*l\b/i.test(str)
  const multiplier = hasCrore ? 10000000 : hasLakh ? 100000 : 1

  const nums = (str.match(/\d+(\.\d+)?/g) || []).map(Number)
  if (nums.length === 0) return str // no digits at all — show the raw text as typed

  const fmt = (n: number) => '₹' + Math.round(n * multiplier).toLocaleString('en-IN')

  if (nums.length === 1) return fmt(nums[0])
  if (nums.length === 2) return `${fmt(nums[0])} – ${fmt(nums[1])}`
  return str // 3+ numbers is ambiguous — show raw text rather than guess wrong
}

export default function AllLeadsPage() {
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<CanonicalStage | null>(null)

  // ── Search ──
  const [searchQuery, setSearchQuery] = useState('')

  // ── Date range ──
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [dateActive, setDateActive] = useState(false)
  const [sourceDropdownOpen, setSourceDropdownOpen] = useState(false)
  const [stageDropdownOpen, setStageDropdownOpen] = useState(false)
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const fetchLeads = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single()
    if (!profile?.company_id) return
    // Paginated fetch — bypasses Supabase's default 1000-row cap.
    // Confirmed via SQL: actual lead count is 1079, not 1000. A plain
    // .select('*') was silently truncating results here.
    const data = await fetchAllLeads(supabase, profile.company_id, 'interior-design', '*, notes') as Lead[] | null
    const sorted = [...(data ?? [])].sort((a, b) =>
      (STAGE_ORDER[a.pipeline_stage] ?? 99) - (STAGE_ORDER[b.pipeline_stage] ?? 99)
    )
    setLeads(sorted)
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps -- intentional mount-time fetch; fn ref is stable in practice
  useEffect(() => { fetchLeads() }, [])

  useEffect(() => {
    const handleClickOutside = () => { setSourceDropdownOpen(false); setStageDropdownOpen(false); setDateDropdownOpen(false) }
    if (sourceDropdownOpen || stageDropdownOpen || dateDropdownOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [sourceDropdownOpen, stageDropdownOpen, dateDropdownOpen])

  const clearDate = () => {
    setFromDate('')
    setToDate('')
    setDateActive(false)
  }

  // ── Combined filter ──
  const filteredLeads = useMemo(() => {
    let result = activeFilter ? leads.filter(l => matchStage(l, activeFilter)) : leads

    // Date range filter
    if (dateActive && (fromDate || toDate)) {
      result = result.filter(l => {
        const leadDate = l.created_at?.split('T')[0] ?? ''
        if (fromDate && leadDate < fromDate) return false
        if (toDate && leadDate > toDate) return false
        return true
      })
    }

    // Search filter — name + phone
    const q = searchQuery.trim().toLowerCase()
    if (q) {
      result = result.filter(l => {
        const name  = (l.lead_name || '').toLowerCase()
        const phone = (l.phone || '').replace(/\D/g, '')
        const qDigits = q.replace(/\D/g, '')
        return name.includes(q) || (qDigits.length >= 3 && phone.includes(qDigits))
      })
    }

    return result
  }, [leads, activeFilter, searchQuery, fromDate, toDate, dateActive])

  // Single pass, shared with Sidebar — guarantees identical numbers everywhere.
  const stageCounts = useMemo(() => getStageCounts(leads), [leads])
  const getCount = (key: CanonicalStage) => stageCounts[key]

  const totalLeads  = leads.length
  const wonCount    = stageCounts.won
  const activeCount = totalLeads - wonCount - stageCounts.lost
  const convRate    = totalLeads > 0 ? ((wonCount / totalLeads) * 100).toFixed(1) : '0'

  // Source breakdown — same pattern as Lost / Won / Quotations pages, computed
  // over whatever is currently filtered so it reflects the visible set.
  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    filteredLeads.forEach(l => {
      const src = l.source || 'Other'
      counts[src] = (counts[src] || 0) + 1
    })
    return counts
  }, [filteredLeads])

  const dateLabel = fromDate || toDate
    ? `${fromDate ? new Date(fromDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '…'} – ${toDate ? new Date(toDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '…'}`
    : 'Date Range'

  return (
    <div className="space-y-5 p-4 md:p-6" style={{ background: '#F5F0E8', minHeight: '100vh' }}>

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[4px] mb-1" style={{ color: '#B8860B' }}>Interior Design · Pipeline</p>
          <h1 className="text-2xl font-bold text-[#1C1712] tracking-tight">All Leads</h1>
        </div>
        <div
          className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-shadow"
          style={{
            background: 'linear-gradient(135deg, #F5F3FF, #EFEAFF)',
            color: '#7C3AED',
            border: '1px solid #DDD6FE',
            boxShadow: '0 4px 14px rgba(124,58,237,0.10)',
          }}
        >
          <Users className="w-4 h-4" />All Stages
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Leads', value: String(totalLeads),  color: '#7C3AED', icon: '👥' },
          { label: 'Active',      value: String(activeCount), color: '#2563EB', icon: '⚡' },
          { label: 'Won',         value: String(wonCount),    color: '#B8860B', icon: '🏆' },
          { label: 'Conversion',  value: convRate + '%',      color: '#059669', icon: '📈' },
        ].map((s, i) => (
          <div
            key={i}
            className="relative overflow-hidden bg-white border border-[#EDE7DB] rounded-2xl p-4 transition-all duration-200 hover:-translate-y-0.5"
            style={{ boxShadow: '0 1px 2px rgba(28,23,18,0.04), 0 8px 20px rgba(28,23,18,0.05)' }}
          >
            <div
              className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-[0.06]"
              style={{ background: s.color }}
            />
            <div className="relative flex items-center justify-between mb-2">
              <p className="text-[9px] font-bold text-[#9A8F82] uppercase tracking-wider">{s.label}</p>
              <span className="text-base">{s.icon}</span>
            </div>
            <p className="relative text-2xl font-black tracking-tight" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Search + Date Range Bar ── */}
      <div
        className="bg-white/90 backdrop-blur border border-[#EDE7DB] rounded-2xl p-3 space-y-3"
        style={{ boxShadow: '0 1px 2px rgba(28,23,18,0.04), 0 10px 24px rgba(28,23,18,0.05)' }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 sm:flex-wrap">

          {/* Stage + Source row on mobile — side by side, each takes half width */}
          <div className="flex items-center gap-2.5 sm:contents">

            {/* Stage Filter Dropdown — collapses "All / Follow Up / RNR / ..." into one control */}
            <div className="relative flex-1 sm:flex-initial sm:inline-block min-w-0" onClick={e => e.stopPropagation()}>
              <button onClick={() => setStageDropdownOpen(o => !o)}
                className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-2 sm:gap-2.5 pl-3.5 sm:pl-4 pr-3 py-2.5 rounded-xl text-xs font-black transition-all duration-200 sm:hover:-translate-y-0.5"
                style={{
                  background: activeFilter ? STAGE_CONFIG[activeFilter].color : '#1C1712',
                  color: '#fff',
                  boxShadow: activeFilter ? `0 4px 14px ${STAGE_CONFIG[activeFilter].color}45` : '0 4px 14px rgba(28,23,18,0.22)',
                }}>
                <span className="flex items-center gap-2 min-w-0">
                  <span className="tracking-wide truncate">{activeFilter ? STAGE_CONFIG[activeFilter].label : '👥 All Leads'}</span>
                  <span className="flex items-center justify-center rounded-full text-[10px] font-black leading-none flex-shrink-0"
                    style={{ background: 'rgba(255,255,255,0.22)', minWidth: 24, height: 22, padding: '0 6px' }}>
                    {activeFilter ? getCount(activeFilter) : totalLeads}
                  </span>
                </span>
                <ChevronDown size={12} className="flex-shrink-0 transition-transform duration-200" style={{ transform: stageDropdownOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
              </button>

              {stageDropdownOpen && (
                <div className="absolute z-30 mt-2 w-64 max-w-[85vw] rounded-2xl bg-white border border-[#EDE7DB] overflow-hidden"
                  style={{ boxShadow: '0 12px 32px rgba(28,23,18,0.14)' }}>
                  <button onClick={() => { setActiveFilter(null); setStageDropdownOpen(false) }}
                    className="w-full flex items-center justify-between px-4 py-3 transition-colors hover:bg-[#FAFAF8]"
                    style={{ borderBottom: '1px solid #F0EBE0', background: !activeFilter ? '#F5F0E8' : 'transparent' }}>
                    <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: '#1C1712' }}>
                      <span className="text-base leading-none">👥</span>
                      <span className="tracking-wide">All Leads</span>
                    </span>
                    <span className="flex items-center justify-center rounded-full text-[10px] font-black text-white leading-none"
                      style={{ background: 'linear-gradient(135deg, #1C1712, #3a3128)', minWidth: 24, height: 22, padding: '0 6px' }}>
                      {totalLeads}
                    </span>
                  </button>
                  {UNIQUE_STAGES.map(({ key, label }, idx) => {
                    const cnt = getCount(key)
                    if (!cnt) return null
                    const cfg = STAGE_CONFIG[key]
                    const isActive = activeFilter === key
                    return (
                      <button key={key} onClick={() => { setActiveFilter(isActive ? null : key); setStageDropdownOpen(false) }}
                        className="w-full flex items-center justify-between px-4 py-3 transition-colors hover:bg-[#FAFAF8]"
                        style={{
                          borderBottom: idx < UNIQUE_STAGES.length - 1 ? '1px solid #F0EBE0' : 'none',
                          background: isActive ? cfg.bg : 'transparent',
                        }}>
                        <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: cfg.color }}>
                          <span className="tracking-wide">{label}</span>
                        </span>
                        <span className="flex items-center justify-center rounded-full text-[10px] font-black text-white leading-none"
                          style={{
                            background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}CC)`,
                            minWidth: 24, height: 22, padding: '0 6px',
                            boxShadow: `0 2px 6px ${cfg.color}50`,
                          }}>
                          {cnt}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Source breakdown — collapsed into a dropdown so it scales cleanly with many sources */}
            {Object.keys(sourceCounts).length > 0 && (
              <div className="relative flex-1 sm:flex-initial sm:inline-block min-w-0" onClick={e => e.stopPropagation()}>
                <button onClick={() => setSourceDropdownOpen(o => !o)}
                  className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-2 sm:gap-2.5 pl-3.5 sm:pl-4 pr-3 py-2.5 rounded-xl text-xs font-black transition-all duration-200 sm:hover:-translate-y-0.5"
                  style={{ background: '#1C1712', color: '#fff', boxShadow: '0 4px 14px rgba(28,23,18,0.22)' }}>
                  <span className="flex items-center gap-2">
                    <span className="tracking-wide">📊 Sources</span>
                    <span className="flex items-center justify-center rounded-full text-[10px] font-black leading-none"
                      style={{ background: 'rgba(255,255,255,0.2)', minWidth: 22, height: 22, padding: '0 6px' }}>
                      {Object.keys(sourceCounts).length}
                    </span>
                  </span>
                  <ChevronDown size={12} className="flex-shrink-0 transition-transform duration-200" style={{ transform: sourceDropdownOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
                </button>

                {sourceDropdownOpen && (
                  <div className="absolute z-30 mt-2 w-72 max-w-[85vw] rounded-2xl bg-white border border-[#EDE7DB] overflow-hidden right-0 sm:right-auto"
                    style={{ boxShadow: '0 12px 32px rgba(28,23,18,0.14)' }}>
                    {Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]).map(([src, cnt], idx, arr) => {
                      const cfg = SOURCE_CONFIG[src] ?? SOURCE_CONFIG['Other']
                      return (
                        <div key={src}
                          className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-[#FAFAF8]"
                          style={{ borderBottom: idx < arr.length - 1 ? '1px solid #F0EBE0' : 'none' }}>
                          <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: cfg.color }}>
                            <span className="text-base leading-none">{cfg.icon}</span>
                            <span className="tracking-wide">{src}</span>
                          </span>
                          <span className="flex items-center justify-center rounded-full text-[10px] font-black text-white leading-none"
                            style={{
                              background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}CC)`,
                              minWidth: 24, height: 22, padding: '0 6px',
                              boxShadow: `0 2px 6px ${cfg.color}50`,
                            }}>
                            {cnt}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Search — full width on mobile */}
          <div className="flex items-center gap-2 px-3 py-2.5 sm:py-2 rounded-xl border border-[#E2D9C8] bg-[#FAFAF8] focus-within:border-[#B8860B] focus-within:shadow-[0_0_0_3px_rgba(184,134,11,0.10)] transition-all w-full sm:w-64 sm:flex-shrink-0">
            <Search size={14} className="text-[#9A8F82] flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name or phone..."
              className="flex-1 text-sm bg-transparent outline-none text-[#1C1712] placeholder:text-[#B8B0A0] min-w-0"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}
                className="w-5 h-5 rounded-full bg-[#E2D9C8] flex items-center justify-center flex-shrink-0 hover:bg-[#D0C8B8] transition-colors">
                <X size={10} className="text-[#7A6E60]" />
              </button>
            )}
          </div>

          {/* Date — collapsed dropdown on mobile to avoid raw native date inputs cramping the row; full inline pickers on desktop */}
          <div className="relative sm:ml-auto sm:flex-shrink-0" onClick={e => e.stopPropagation()}>
            {/* Mobile: single button opening a popover */}
            <button onClick={() => setDateDropdownOpen(o => !o)}
              className="sm:hidden w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all"
              style={{
                background: dateActive ? '#FFFBEB' : '#FAFAF8',
                color: dateActive ? '#B8860B' : '#7A6E60',
                border: `1px solid ${dateActive ? '#FDE68A' : '#E2D9C8'}`,
              }}>
              <span className="flex items-center gap-2 min-w-0">
                <Calendar size={13} className="flex-shrink-0" />
                <span className="truncate">{dateLabel}</span>
              </span>
              <span className="flex items-center gap-1.5 flex-shrink-0">
                {dateActive && (
                  <span onClick={(e) => { e.stopPropagation(); clearDate() }}
                    className="w-4 h-4 rounded-full bg-red-100 flex items-center justify-center">
                    <X size={9} className="text-red-500" />
                  </span>
                )}
                <ChevronDown size={12} style={{ transform: dateDropdownOpen ? 'rotate(180deg)' : 'rotate(0)' }} className="transition-transform duration-200" />
              </span>
            </button>

            {dateDropdownOpen && (
              <div className="sm:hidden absolute z-30 mt-2 right-0 left-0 rounded-2xl bg-white border border-[#EDE7DB] p-4 space-y-3"
                style={{ boxShadow: '0 12px 32px rgba(28,23,18,0.14)' }}>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider text-[#9A8F82] block mb-1.5">From</label>
                  <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setDateActive(true) }}
                    className="w-full text-sm rounded-xl px-3 py-2.5 border border-[#E2D9C8] bg-[#FAFAF8] text-[#1C1712] outline-none focus:border-[#B8860B] font-semibold" />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider text-[#9A8F82] block mb-1.5">To</label>
                  <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setDateActive(true) }}
                    className="w-full text-sm rounded-xl px-3 py-2.5 border border-[#E2D9C8] bg-[#FAFAF8] text-[#1C1712] outline-none focus:border-[#B8860B] font-semibold" />
                </div>
                <div className="flex gap-2 pt-1">
                  {dateActive && (
                    <button onClick={() => { clearDate(); setDateDropdownOpen(false) }}
                      className="flex-1 py-2 rounded-xl text-xs font-bold text-red-500 bg-red-50 border border-red-200">
                      Clear
                    </button>
                  )}
                  <button onClick={() => setDateDropdownOpen(false)}
                    className="flex-1 py-2 rounded-xl text-xs font-bold text-white" style={{ background: '#1C1712' }}>
                    Done
                  </button>
                </div>
              </div>
            )}

            {/* Desktop: inline pickers, unchanged */}
            <div className="hidden sm:flex items-center gap-2 flex-wrap flex-shrink-0">
              <Calendar size={13} className="text-[#9A8F82] flex-shrink-0" />
              <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setDateActive(true) }}
                className="text-xs rounded-xl px-3 py-1.5 border border-[#E2D9C8] bg-white text-[#1C1712] outline-none focus:border-[#B8860B] focus:shadow-[0_0_0_3px_rgba(184,134,11,0.10)] font-semibold transition-all" />
              <span className="text-xs text-[#9A8F82] font-semibold">to</span>
              <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setDateActive(true) }}
                className="text-xs rounded-xl px-3 py-1.5 border border-[#E2D9C8] bg-white text-[#1C1712] outline-none focus:border-[#B8860B] focus:shadow-[0_0_0_3px_rgba(184,134,11,0.10)] font-semibold transition-all" />
              {dateActive && (
                <button onClick={clearDate}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-red-500 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors">
                  <X size={10} /> Clear
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div
          className="bg-white border border-[#EDE7DB] rounded-2xl py-20 text-center"
          style={{ boxShadow: '0 1px 2px rgba(28,23,18,0.04), 0 10px 24px rgba(28,23,18,0.05)' }}
        >
          <div className="w-8 h-8 border-2 border-[#B8860B] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[#9A8F82] text-sm">Loading leads...</p>
        </div>
      ) : !filteredLeads.length ? (
        <div
          className="bg-white border border-[#EDE7DB] rounded-2xl py-20 text-center"
          style={{ boxShadow: '0 1px 2px rgba(28,23,18,0.04), 0 10px 24px rgba(28,23,18,0.05)' }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, #FBF7EE, #F5F0E8)', border: '1px solid #E2D9C8', boxShadow: '0 6px 16px rgba(184,134,11,0.10)' }}
          >
            {searchQuery ? <Search className="w-7 h-7 text-[#B8860B]" /> : <Users className="w-7 h-7 text-[#B8860B]" />}
          </div>
          <p className="text-[#1C1712] font-bold">
            {searchQuery ? `No results for "${searchQuery}"` : 'No leads found'}
          </p>
          <p className="text-[#9A8F82] text-xs mt-1">
            {searchQuery ? 'Try a different name or phone number' : dateActive ? 'Try a different date range' : 'Add leads to get started'}
          </p>
        </div>
      ) : (
        <div
          className="bg-white border border-[#EDE7DB] rounded-2xl overflow-hidden"
          style={{ boxShadow: '0 1px 2px rgba(28,23,18,0.04), 0 12px 28px rgba(28,23,18,0.06)' }}
        >
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: '#FAFAF8', borderBottom: '1px solid #F0EBE0' }}>
                  {['#', 'Lead', 'Phone', 'Stage', 'Source', 'Interest', 'Budget', 'City', 'Location', 'Date'].map(h => (
                    <th key={h} className="text-left text-[9px] font-black text-[#9A8F82] uppercase tracking-[2px] px-4 py-3 whitespace-nowrap first:pl-5 last:pr-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((l: Lead, i: number) => {
                  const g   = GRADIENTS[i % GRADIENTS.length]
                  const src = SOURCE_CONFIG[l.source ?? ''] ?? SOURCE_CONFIG['Other']
                  const stg = STAGE_CONFIG[l.pipeline_stage] ?? { bg: '#F5F0E8', color: '#7A6E60', label: l.pipeline_stage ?? '—' }
                  const int = INTEREST_CONFIG[l.interest ?? ''] ?? { bg: '#F5F0E8', color: '#7A6E60' }
                  const budget = formatBudget(l.budget)
                  return (
                    <tr key={l.id}
                      onClick={() => router.push(`${LEAD_BASE}/${l.id}`)}
                      className="border-b border-[#F7F5F1] last:border-0 hover:bg-[#FDFAF8] transition-colors cursor-pointer group">
                      <td className="pl-5 pr-2 py-3.5"><span className="text-[10px] font-bold text-[#C4BAB0]">{i + 1}</span></td>
                      <td className="pl-2 pr-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-black text-white flex-shrink-0 transition-transform group-hover:scale-105"
                            style={{ background: `linear-gradient(135deg, ${g[0]}, ${g[1]})`, boxShadow: `0 3px 10px ${g[0]}40` }}>
                            {ini(l.lead_name)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#1C1712]">{l.lead_name}</p>
                            {l.property_type && <p className="text-[10px] text-[#B8B0A0]">{l.property_type}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5"><p className="text-sm font-mono text-[#1C1712]">{l.phone ?? '—'}</p></td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full"
                          style={{ background: stg.bg, color: stg.color, border: `1px solid ${stg.color}30` }}>{stg.label}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        {l.source
                          ? <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full"
                              style={{ background: src.bg, color: src.color, border: `1px solid ${src.color}30` }}>{src.icon} {l.source}</span>
                          : <span className="text-[#C4BAB0]">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        {l.interest
                          ? <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full"
                              style={{ background: int.bg, color: int.color, border: `1px solid ${int.color}30` }}>
                              {l.interest === 'High' ? '🔥' : l.interest === 'Medium' ? '⚡' : '❄️'} {l.interest}</span>
                          : <span className="text-[#C4BAB0]">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        {budget ? <p className="text-sm font-bold" style={{ color: '#B8860B' }}>{budget}</p> : <span className="text-[#C4BAB0]">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        {l.city ? <span className="text-[10px] text-[#7A6E60]">📍 {l.city}</span> : <span className="text-[#C4BAB0]">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        {getLocation(l) ? <span className="text-[10px] text-[#7A6E60]">🗺️ {getLocation(l)}</span> : <span className="text-[#C4BAB0]">—</span>}
                      </td>
                      <td className="px-4 py-3.5 pr-5">
                        <p className="text-[10px] text-[#B8B0A0] whitespace-nowrap">
                          {new Date(l.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards — premium card feel: avatar ring, right-aligned budget, chevron affordance */}
          <div className="md:hidden divide-y divide-[#F0EBE0]">
            {filteredLeads.map((l: Lead, i: number) => {
              const g   = GRADIENTS[i % GRADIENTS.length]
              const src = SOURCE_CONFIG[l.source ?? ''] ?? SOURCE_CONFIG['Other']
              const stg = STAGE_CONFIG[l.pipeline_stage] ?? { bg: '#F5F0E8', color: '#7A6E60', label: l.pipeline_stage ?? '—' }
              const int = INTEREST_CONFIG[l.interest ?? ''] ?? { bg: '#F5F0E8', color: '#7A6E60' }
              const budget = formatBudget(l.budget)
              return (
                <div key={l.id}
                  onClick={() => router.push(`${LEAD_BASE}/${l.id}`)}
                  className="px-4 py-4 active:bg-[#FAFAF8] transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-[11px] font-black text-white flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${g[0]}, ${g[1]})`, boxShadow: `0 3px 10px ${g[0]}40` }}>
                      {ini(l.lead_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-bold text-[#1C1712] truncate">{l.lead_name}</p>
                        {budget && <p className="text-xs font-black flex-shrink-0" style={{ color: '#B8860B' }}>{budget}</p>}
                      </div>
                      <p className="text-xs text-[#9A8F82] mt-0.5">{l.phone ?? '—'}</p>
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: stg.bg, color: stg.color }}>{stg.label}</span>
                        {l.interest && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: int.bg, color: int.color }}>{l.interest === 'High' ? '🔥' : l.interest === 'Medium' ? '⚡' : '❄️'} {l.interest}</span>}
                        {l.source && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: src.bg, color: src.color }}>{src.icon} {l.source}</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        {l.city && <span className="text-[9px] text-[#7A6E60]">📍 {l.city}</span>}
                        {getLocation(l) && <span className="text-[9px] text-[#7A6E60]">🗺️ {getLocation(l)}</span>}
                        <span className="text-[9px] text-[#B8B0A0]">
                          {new Date(l.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-[#D4CEC8] flex-shrink-0" />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="px-5 py-3 border-t border-[#F0EBE0] flex items-center justify-between" style={{ background: '#FAFAF8' }}>
            <p className="text-[10px] text-[#9A8F82]">
              Showing <span className="font-bold text-[#1C1712]">{filteredLeads.length}</span> of {totalLeads} leads
            </p>
            <p className="text-[10px] text-[#B8B0A0]">Interior Design · GK CRM</p>
          </div>
        </div>
      )}
    </div>
  )
}