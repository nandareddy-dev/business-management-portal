'use client'

import { useState, useMemo } from 'react'
import { Search, X, Calendar } from 'lucide-react'
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
  created_at: string
  property_type?: string
  location?: string | null
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

// Safe date parser - returns date at midnight IST
const parseFollowUpDate = (dateStr?: string) => {
  if (!dateStr) return null
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return null
    // Normalize to midnight for date-only comparison
    d.setHours(0, 0, 0, 0)
    return d
  } catch {
    return null
  }
}

// Parse YYYY-MM-DD input to Date at midnight
const parseFilterDate = (dateStr: string) => {
  if (!dateStr) return null
  const [year, month, day] = dateStr.split('-')
  const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 0, 0, 0, 0)
  if (isNaN(d.getTime())) return null
  return d
}

export function FollowUpClient({ leads, count }: { leads: Lead[]; count: number }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [dateActive, setDateActive] = useState(false)

  const clearDate = () => { setFromDate(''); setToDate(''); setDateActive(false) }

  // Quick date presets
  const applyQuickDate = (type: 'today' | 'tomorrow' | 'week') => {
    const today = todayIST()
    if (type === 'today') {
      setFromDate(today)
      setToDate(today)
    } else if (type === 'tomorrow') {
      const tm = getDateIST(1)
      setFromDate(tm)
      setToDate(tm)
    } else if (type === 'week') {
      setFromDate(today)
      setToDate(getWeekEndDate())
    }
    setDateActive(true)
  }

  // Auto-sync: if only fromDate set, use it as toDate too (single day view)
  const effectiveToDate = useMemo(() => {
    if (fromDate && !toDate && dateActive) {
      return fromDate
    }
    return toDate
  }, [fromDate, toDate, dateActive])

  // Advanced date range filtering - INCLUSIVE on both ends
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!l.lead_name?.toLowerCase().includes(q) && !l.phone?.toLowerCase().includes(q)) return false
      }

      // Date range filter - INCLUSIVE
      if (dateActive && (fromDate || effectiveToDate)) {
        const leadDate = parseFollowUpDate(l.date)
        if (!leadDate) return false // Exclude leads without dates

        const startDate = parseFilterDate(fromDate)
        const endDate = parseFilterDate(effectiveToDate)

        // Both dates exist - range check (inclusive)
        if (startDate && endDate) {
          if (leadDate < startDate || leadDate > endDate) return false
        }
        // Only start date
        else if (startDate && !endDate) {
          if (leadDate.getTime() !== startDate.getTime()) return false
        }
        // Only end date
        else if (!startDate && endDate) {
          if (leadDate.getTime() !== endDate.getTime()) return false
        }
      }

      return true
    })
  }, [leads, searchQuery, fromDate, effectiveToDate, dateActive])

  // Safe date comparison for categorization
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)

  const overdueLeads = filteredLeads.filter(l => {
    const d = parseFollowUpDate(l.date)
    return d && d < today
  })

  const todayLeads = filteredLeads.filter(l => {
    const d = parseFollowUpDate(l.date)
    return d && d.getTime() === today.getTime()
  })

  const tomorrowLeads = filteredLeads.filter(l => {
    const d = parseFollowUpDate(l.date)
    return d && d.getTime() === tomorrow.getTime()
  })

  const upcomingLeads = filteredLeads.filter(l => {
    const d = parseFollowUpDate(l.date)
    return d && d > tomorrow
  })

  const noDateLeads = filteredLeads.filter(l => !l.date || !parseFollowUpDate(l.date))

  // Format stats for display
  const statsConfig = [
    { label: 'Total',    value: filteredLeads.length, color: '#7C3AED', icon: '📋' },
    { label: 'Overdue',  value: overdueLeads.length,  color: '#DC2626', icon: '⚠️' },
    { label: 'Today',    value: todayLeads.length,    color: '#16A34A', icon: '📅' },
    { label: 'Tomorrow', value: tomorrowLeads.length, color: '#D97706', icon: '🔜' },
  ]

  return (
    <div className="space-y-3">
      {/* Filter Bar */}
      <div className="bg-white border border-[#E8E2D8] rounded-xl px-3 py-2 shadow-sm space-y-2">
        
        {/* Row 1: Quick Buttons + Search + Date Inputs — all on one line */}
        <div className="flex items-center gap-2 flex-wrap xl:flex-nowrap">

          {/* Quick Date Buttons */}
          <span className="text-[9px] font-bold text-[#9A8F82] uppercase flex-shrink-0">Quick:</span>

          <button 
            onClick={() => applyQuickDate('today')}
            className="text-[10px] font-bold px-2.5 py-1 rounded-full transition-all flex-shrink-0 whitespace-nowrap"
            style={{ 
              background: dateActive && fromDate === todayIST() && effectiveToDate === todayIST() ? '#16A34A' : '#F0FDF4',
              color: dateActive && fromDate === todayIST() && effectiveToDate === todayIST() ? '#fff' : '#16A34A',
              border: '1px solid #86EFAC'
            }}
          >
            📅 Today
          </button>

          <button 
            onClick={() => applyQuickDate('tomorrow')}
            className="text-[10px] font-bold px-2.5 py-1 rounded-full transition-all flex-shrink-0 whitespace-nowrap"
            style={{ 
              background: dateActive && fromDate === getDateIST(1) && effectiveToDate === getDateIST(1) ? '#D97706' : '#FFFBEB',
              color: dateActive && fromDate === getDateIST(1) && effectiveToDate === getDateIST(1) ? '#fff' : '#D97706',
              border: '1px solid #FDE68A'
            }}
          >
            🔜 Tomorrow
          </button>

          <button 
            onClick={() => applyQuickDate('week')}
            className="text-[10px] font-bold px-2.5 py-1 rounded-full transition-all flex-shrink-0 whitespace-nowrap"
            style={{ 
              background: dateActive && fromDate === todayIST() && effectiveToDate === getWeekEndDate() ? '#7C3AED' : '#F5F3FF',
              color: dateActive && fromDate === todayIST() && effectiveToDate === getWeekEndDate() ? '#fff' : '#7C3AED',
              border: '1px solid #DDD6FE'
            }}
          >
            📆 This Week
          </button>

          {/* Search Bar */}
          <div className="flex flex-1 items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[#E2D9C8] bg-[#FAFAF8] focus-within:border-[#B8860B] transition-colors min-w-[140px]">
            <Search size={13} className="text-[#9A8F82] flex-shrink-0" />
            <input 
              type="text" 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name or phone..."
              className="flex-1 min-w-0 text-xs bg-transparent outline-none text-[#1C1712] placeholder:text-[#B8B0A0]" 
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="w-5 h-5 rounded-full bg-[#E2D9C8] flex items-center justify-center flex-shrink-0 hover:bg-[#D0C8B8] transition-colors"
              >
                <X size={10} className="text-[#7A6E60]" />
              </button>
            )}
          </div>

          {/* Date Range Inputs — pushed right on wide screens */}
          <div className="flex items-center gap-1.5 flex-wrap xl:flex-nowrap flex-shrink-0 ml-auto">
            <Calendar size={12} className="text-[#9A8F82] flex-shrink-0" />
            <input 
              type="date" 
              value={fromDate} 
              onChange={e => { setFromDate(e.target.value); setDateActive(true) }}
              placeholder="From"
              className="w-[124px] text-[11px] rounded-lg px-2 py-1 border border-[#E2D9C8] bg-white text-[#1C1712] outline-none focus:border-[#B8860B] font-semibold" 
            />
            <span className="text-[10px] text-[#9A8F82] font-semibold">to</span>
            <input 
              type="date" 
              value={toDate} 
              onChange={e => { setToDate(e.target.value); setDateActive(true) }}
              placeholder="To"
              className="w-[124px] text-[11px] rounded-lg px-2 py-1 border border-[#E2D9C8] bg-white text-[#1C1712] outline-none focus:border-[#B8860B] font-semibold" 
            />
            {dateActive && (
              <button 
                onClick={clearDate}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-red-500 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors"
              >
                <X size={10} /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Row 3: Filter Summary */}
        {(searchQuery || dateActive) && (
          <div className="flex items-center gap-2 pt-0.5 flex-wrap text-[9px]">
            <span className="font-bold text-[#9A8F82]">Showing</span>
            <span className="font-black text-[#1C1712]">{filteredLeads.length}</span>
            <span className="text-[#9A8F82]">of {count} leads</span>
            {searchQuery && (
              <span className="bg-[#F5F0E8] text-[#7A6E60] px-2 py-0.5 rounded-full border border-[#E2D9C8]">
                🔍 &quot;{searchQuery}&quot;
              </span>
            )}
            {dateActive && fromDate && (
              <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                📅 {fromDate} {effectiveToDate && fromDate !== effectiveToDate ? `→ ${effectiveToDate}` : ''}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {statsConfig.map((s, i) => (
          <div key={i} className="bg-white border border-[#E8E2D8] rounded-xl px-3 py-2 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-sm">{s.icon}</span>
              <p className="text-[10px] text-[#7A6E60] font-semibold">{s.label}</p>
            </div>
            <p className="text-base font-black" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Results Section */}
      {filteredLeads.length === 0 ? (
        <div className="bg-white border border-[#E8E2D8] rounded-xl py-12 text-center shadow-sm">
          <div className="w-12 h-12 bg-[#F5F0E8] border border-[#E2D9C8] rounded-xl flex items-center justify-center mx-auto mb-3">
            <Calendar className="w-6 h-6 text-[#B8860B]" />
          </div>
          <p className="text-[#1C1712] font-bold text-sm">
            {searchQuery || dateActive ? 'No leads match your filter' : 'No follow-up leads'}
          </p>
          <p className="text-[#9A8F82] text-xs mt-1">
            {searchQuery || dateActive 
              ? 'Try adjusting your search or date range' 
              : 'Leads move here when follow-up date is set'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {overdueLeads.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-1.5 px-1">
                <span className="text-xs">⚠️</span>
                <p className="text-[10px] font-black uppercase tracking-[2px]" style={{ color: '#DC2626' }}>Overdue</p>
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white" style={{ background: '#DC2626' }}>
                  {overdueLeads.length}
                </span>
              </div>
              <LeadTable 
                leads={overdueLeads} 
                count={overdueLeads.length} 
                footerText="overdue leads" 
                columns={['#', 'Lead', 'Phone', 'Source', 'Budget', 'Follow-up Date']} 
                emptyIcon="⚠️" 
                emptyText="" 
              />
            </div>
          )}

          {todayLeads.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-1.5 px-1">
                <span className="text-xs">📅</span>
                <p className="text-[10px] font-black uppercase tracking-[2px]" style={{ color: '#16A34A' }}>Today</p>
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white" style={{ background: '#16A34A' }}>
                  {todayLeads.length}
                </span>
              </div>
              <LeadTable 
                leads={todayLeads} 
                count={todayLeads.length} 
                footerText="today" 
                columns={['#', 'Lead', 'Phone', 'Source', 'Budget', 'Follow-up Date']} 
                emptyIcon="📅" 
                emptyText="" 
              />
            </div>
          )}

          {tomorrowLeads.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-1.5 px-1">
                <span className="text-xs">🔜</span>
                <p className="text-[10px] font-black uppercase tracking-[2px]" style={{ color: '#D97706' }}>Tomorrow</p>
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white" style={{ background: '#D97706' }}>
                  {tomorrowLeads.length}
                </span>
              </div>
              <LeadTable 
                leads={tomorrowLeads} 
                count={tomorrowLeads.length} 
                footerText="tomorrow" 
                columns={['#', 'Lead', 'Phone', 'Source', 'Budget', 'Follow-up Date']} 
                emptyIcon="🔜" 
                emptyText="" 
              />
            </div>
          )}

          {upcomingLeads.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-1.5 px-1">
                <span className="text-xs">📆</span>
                <p className="text-[10px] font-black uppercase tracking-[2px]" style={{ color: '#7C3AED' }}>Upcoming</p>
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white" style={{ background: '#7C3AED' }}>
                  {upcomingLeads.length}
                </span>
              </div>
              <LeadTable 
                leads={upcomingLeads} 
                count={upcomingLeads.length} 
                footerText="upcoming" 
                columns={['#', 'Lead', 'Phone', 'Source', 'Budget', 'Follow-up Date']} 
                emptyIcon="📆" 
                emptyText="" 
              />
            </div>
          )}

          {noDateLeads.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-1.5 px-1">
                <span className="text-xs">❓</span>
                <p className="text-[10px] font-black uppercase tracking-[2px]" style={{ color: '#7A6E60' }}>No Date Set</p>
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white" style={{ background: '#7A6E60' }}>
                  {noDateLeads.length}
                </span>
              </div>
              <LeadTable 
                leads={noDateLeads} 
                count={noDateLeads.length} 
                footerText="no date" 
                columns={['#', 'Lead', 'Phone', 'Source', 'Budget', 'Follow-up Date']} 
                emptyIcon="❓" 
                emptyText="" 
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}