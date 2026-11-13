'use client'

import { useState, useMemo } from 'react'
import { Search, X, Calendar, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { LeadTable } from '@/components/interior/lead-table'

interface Lead {
  id: string
  lead_name: string
  phone?: string
  email?: string
  source?: string
  budget?: string
  city?: string
  interest?: string
  notes?: string
  date?: string
  sitevisit_date?: string
  sitevisit_status?: string
  created_at: string
  property_type?: string
}

// IST date utilities
const todayIST = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
const getDateIST = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}
const getWeekEndDate = () => {
  const d = new Date()
  const daysUntilSunday = (7 - d.getDay()) % 7 || 7
  d.setDate(d.getDate() + daysUntilSunday - 1)
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

const parseVisitDate = (dateStr?: string) => {
  if (!dateStr) return null
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return null
    d.setHours(0, 0, 0, 0)
    return d
  } catch {
    return null
  }
}

const parseFilterDate = (dateStr: string) => {
  if (!dateStr) return null
  const [year, month, day] = dateStr.split('-')
  const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 0, 0, 0, 0)
  if (isNaN(d.getTime())) return null
  return d
}

type StatFilter = 'total' | 'overdue' | 'today' | 'remaining' | 'completed'

export function SiteVisitClient({ leads, count }: { leads: Lead[]; count: number }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [dateActive, setDateActive] = useState(false)
  const [activeStatFilter, setActiveStatFilter] = useState<StatFilter>('total')

  const clearDate = () => { setFromDate(''); setToDate(''); setDateActive(false) }

  const applyQuickDate = (type: 'today' | 'tomorrow' | 'week') => {
    const today = todayIST()
    if (type === 'today') { setFromDate(today); setToDate(today) }
    else if (type === 'tomorrow') { const tm = getDateIST(1); setFromDate(tm); setToDate(tm) }
    else if (type === 'week') { setFromDate(today); setToDate(getWeekEndDate()) }
    setDateActive(true)
  }

  const effectiveToDate = useMemo(() => {
    if (fromDate && !toDate && dateActive) return fromDate
    return toDate
  }, [fromDate, toDate, dateActive])

  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!l.lead_name?.toLowerCase().includes(q) && !l.phone?.toLowerCase().includes(q)) return false
      }
      if (dateActive && (fromDate || effectiveToDate)) {
        const leadDate = parseVisitDate(l.date)
        if (!leadDate) return false
        const startDate = parseFilterDate(fromDate)
        const endDate = parseFilterDate(effectiveToDate)
        if (startDate && endDate) { if (leadDate < startDate || leadDate > endDate) return false }
        else if (startDate && !endDate) { if (leadDate.getTime() !== startDate.getTime()) return false }
        else if (!startDate && endDate) { if (leadDate.getTime() !== endDate.getTime()) return false }
      }
      return true
    })
  }, [leads, searchQuery, fromDate, effectiveToDate, dateActive])

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)

  const isCompleted = (l: Lead) => l.sitevisit_status === 'completed'

  const completedLeads = filteredLeads.filter(isCompleted)
  const pendingLeads = filteredLeads.filter(l => !isCompleted(l))

  const overdueLeads = pendingLeads.filter(l => { const d = parseVisitDate(l.date); return d && d < today })
  const todayLeads = pendingLeads.filter(l => { const d = parseVisitDate(l.date); return d && d.getTime() === today.getTime() })
  const tomorrowLeads = pendingLeads.filter(l => { const d = parseVisitDate(l.date); return d && d.getTime() === tomorrow.getTime() })
  const upcomingLeads = pendingLeads.filter(l => { const d = parseVisitDate(l.date); return d && d > tomorrow })
  const noDateLeads = pendingLeads.filter(l => !l.date || !parseVisitDate(l.date))

  const tableCols = ['#', 'Lead', 'Phone', 'Source', 'Budget', 'City', 'Site Visit Date']

  return (
    <div className="space-y-3">
      {/* Filter Bar */}
      <div className="bg-white border border-[#E8E2D8] rounded-xl px-3 py-2 shadow-sm space-y-2">
        {/* One line: Quick chips + Search + Date range */}
        <div className="flex items-center gap-2 flex-wrap xl:flex-nowrap">
          <span className="text-[9px] font-bold text-[#9A8F82] uppercase flex-shrink-0">Quick:</span>
          <button onClick={() => applyQuickDate('today')}
            className="text-[10px] font-bold px-2.5 py-1 rounded-full transition-all flex-shrink-0 whitespace-nowrap"
            style={{ background: dateActive && fromDate === todayIST() && effectiveToDate === todayIST() ? '#16A34A' : '#F0FDF4',
              color: dateActive && fromDate === todayIST() && effectiveToDate === todayIST() ? '#fff' : '#16A34A', border: '1px solid #86EFAC' }}>
            📅 Today
          </button>
          <button onClick={() => applyQuickDate('tomorrow')}
            className="text-[10px] font-bold px-2.5 py-1 rounded-full transition-all flex-shrink-0 whitespace-nowrap"
            style={{ background: dateActive && fromDate === getDateIST(1) && effectiveToDate === getDateIST(1) ? '#D97706' : '#FFFBEB',
              color: dateActive && fromDate === getDateIST(1) && effectiveToDate === getDateIST(1) ? '#fff' : '#D97706', border: '1px solid #FDE68A' }}>
            🔜 Tomorrow
          </button>
          <button onClick={() => applyQuickDate('week')}
            className="text-[10px] font-bold px-2.5 py-1 rounded-full transition-all flex-shrink-0 whitespace-nowrap"
            style={{ background: dateActive && fromDate === todayIST() && effectiveToDate === getWeekEndDate() ? '#7C3AED' : '#F5F3FF',
              color: dateActive && fromDate === todayIST() && effectiveToDate === getWeekEndDate() ? '#fff' : '#7C3AED', border: '1px solid #DDD6FE' }}>
            📆 This Week
          </button>

          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[#E2D9C8] bg-[#FAFAF8] focus-within:border-[#B8860B] transition-colors flex-1 min-w-[140px]">
            <Search size={13} className="text-[#9A8F82] flex-shrink-0" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name or phone..."
              className="flex-1 text-xs bg-transparent outline-none text-[#1C1712] placeholder:text-[#B8B0A0]" />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}
                className="w-4 h-4 rounded-full bg-[#E2D9C8] flex items-center justify-center flex-shrink-0 hover:bg-[#D0C8B8] transition-colors">
                <X size={10} className="text-[#7A6E60]" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto">
            <Calendar size={12} className="text-[#9A8F82] flex-shrink-0" />
            <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setDateActive(true) }}
              className="w-[128px] text-[11px] rounded-lg px-2 py-1 border border-[#E2D9C8] bg-white text-[#1C1712] outline-none focus:border-[#B8860B] font-semibold" />
            <span className="text-[10px] text-[#9A8F82] font-semibold">to</span>
            <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setDateActive(true) }}
              className="w-[128px] text-[11px] rounded-lg px-2 py-1 border border-[#E2D9C8] bg-white text-[#1C1712] outline-none focus:border-[#B8860B] font-semibold" />
            {dateActive && (
              <button onClick={clearDate}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-red-500 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors">
                <X size={10} /> Clear
              </button>
            )}
          </div>
        </div>

        {(searchQuery || dateActive) && (
          <div className="flex items-center gap-2 pt-0.5 flex-wrap text-[9px]">
            <span className="font-bold text-[#9A8F82]">Showing</span>
            <span className="font-black text-[#1C1712]">{filteredLeads.length}</span>
            <span className="text-[#9A8F82]">of {count} leads</span>
            {searchQuery && <span className="bg-[#F5F0E8] text-[#7A6E60] px-2 py-0.5 rounded-full border border-[#E2D9C8]">🔍 &quot;{searchQuery}&quot;</span>}
            {dateActive && fromDate && <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">📅 {fromDate} {effectiveToDate && fromDate !== effectiveToDate ? `→ ${effectiveToDate}` : ''}</span>}
          </div>
        )}
      </div>

      {/* Stats Cards — clickable filters */}
      <div className="grid grid-cols-5 gap-2">
        {[
          { key: 'total' as const,     label: 'Total',     value: filteredLeads.length,   color: '#0891B2', icon: '🏠' },
          { key: 'overdue' as const,   label: 'Overdue',   value: overdueLeads.length,    color: '#DC2626', icon: '⚠️' },
          { key: 'today' as const,     label: 'Today',     value: todayLeads.length,      color: '#16A34A', icon: '📅' },
          { key: 'remaining' as const, label: 'Remaining', value: pendingLeads.length,    color: '#EA580C', icon: '⏳' },
          { key: 'completed' as const, label: 'Completed', value: completedLeads.length,  color: '#059669', icon: '✅' },
        ].map((s, i) => {
          const isActive = activeStatFilter === s.key
          return (
            <button
              key={i}
              onClick={() => setActiveStatFilter(s.key)}
              className="bg-white rounded-xl px-3 py-2 flex items-center justify-between gap-2 shadow-sm transition-all text-left"
              style={{
                border: isActive ? `2px solid ${s.color}` : '1px solid #E8E2D8',
                background: isActive ? `${s.color}0D` : '#fff',
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs">{s.icon}</span>
                <p className="text-[10px] font-semibold leading-tight" style={{ color: isActive ? s.color : '#7A6E60' }}>{s.label}</p>
              </div>
              <p className="text-base font-black" style={{ color: s.color }}>{s.value}</p>
            </button>
          )
        })}
      </div>

      {/* Alerts */}
      {overdueLeads.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
          <AlertTriangle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
          <p className="text-xs font-bold text-red-700">
            {overdueLeads.length} site visit{overdueLeads.length > 1 ? 's' : ''} overdue — please follow up
          </p>
        </div>
      )}
      {todayLeads.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
          <Clock className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
          <p className="text-xs font-bold text-green-700">
            {todayLeads.length} site visit{todayLeads.length > 1 ? 's' : ''} scheduled for today
          </p>
        </div>
      )}

      {/* Results */}
      {filteredLeads.length === 0 ? (
        <div className="bg-white border border-[#E8E2D8] rounded-xl py-12 text-center shadow-sm">
          <div className="w-12 h-12 bg-[#F5F0E8] border border-[#E2D9C8] rounded-xl flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">🏠</span>
          </div>
          <p className="text-[#1C1712] font-bold text-sm">
            {searchQuery || dateActive ? 'No leads match your filter' : 'No site visits yet'}
          </p>
          <p className="text-[#9A8F82] text-xs mt-1">
            {searchQuery || dateActive ? 'Try adjusting your search or date range' : 'Leads move here when a site visit is scheduled'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {(activeStatFilter === 'total' || activeStatFilter === 'remaining' || activeStatFilter === 'overdue') && overdueLeads.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-1.5 px-1">
                <span className="text-xs">⚠️</span>
                <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: '#DC2626' }}>Overdue</p>
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white" style={{ background: '#DC2626' }}>{overdueLeads.length}</span>
              </div>
              <LeadTable leads={overdueLeads} count={overdueLeads.length} footerText="overdue visits" columns={tableCols} emptyIcon="⚠️" emptyText="" />
            </div>
          )}

          {(activeStatFilter === 'total' || activeStatFilter === 'remaining' || activeStatFilter === 'today') && todayLeads.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-1.5 px-1">
                <span className="text-xs">📅</span>
                <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: '#16A34A' }}>Today</p>
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white" style={{ background: '#16A34A' }}>{todayLeads.length}</span>
              </div>
              <LeadTable leads={todayLeads} count={todayLeads.length} footerText="today" columns={tableCols} emptyIcon="📅" emptyText="" />
            </div>
          )}

          {(activeStatFilter === 'total' || activeStatFilter === 'remaining') && tomorrowLeads.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-1.5 px-1">
                <span className="text-xs">🔜</span>
                <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: '#D97706' }}>Tomorrow</p>
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white" style={{ background: '#D97706' }}>{tomorrowLeads.length}</span>
              </div>
              <LeadTable leads={tomorrowLeads} count={tomorrowLeads.length} footerText="tomorrow" columns={tableCols} emptyIcon="🔜" emptyText="" />
            </div>
          )}

          {(activeStatFilter === 'total' || activeStatFilter === 'remaining') && upcomingLeads.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-1.5 px-1">
                <span className="text-xs">📆</span>
                <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: '#7C3AED' }}>Upcoming</p>
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white" style={{ background: '#7C3AED' }}>{upcomingLeads.length}</span>
              </div>
              <LeadTable leads={upcomingLeads} count={upcomingLeads.length} footerText="upcoming" columns={tableCols} emptyIcon="📆" emptyText="" />
            </div>
          )}

          {(activeStatFilter === 'total' || activeStatFilter === 'remaining') && noDateLeads.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-1.5 px-1">
                <span className="text-xs">❓</span>
                <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: '#7A6E60' }}>No Date Set</p>
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white" style={{ background: '#7A6E60' }}>{noDateLeads.length}</span>
              </div>
              <LeadTable leads={noDateLeads} count={noDateLeads.length} footerText="no date" columns={tableCols} emptyIcon="❓" emptyText="" />
            </div>
          )}

          {(activeStatFilter === 'total' || activeStatFilter === 'completed') && completedLeads.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-1.5 px-1">
                <CheckCircle2 className="w-3 h-3" style={{ color: '#059669' }} />
                <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: '#059669' }}>Completed</p>
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white" style={{ background: '#059669' }}>{completedLeads.length}</span>
              </div>
              <LeadTable leads={completedLeads} count={completedLeads.length} footerText="completed" columns={tableCols} emptyIcon="✅" emptyText="" />
            </div>
          )}

          {activeStatFilter !== 'total' && (
            (activeStatFilter === 'overdue' && overdueLeads.length === 0) ||
            (activeStatFilter === 'today' && todayLeads.length === 0) ||
            (activeStatFilter === 'remaining' && pendingLeads.length === 0) ||
            (activeStatFilter === 'completed' && completedLeads.length === 0)
          ) && (
            <div className="bg-white border border-[#E8E2D8] rounded-xl py-10 text-center shadow-sm">
              <p className="text-[#9A8F82] text-xs">No leads in this category right now</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}