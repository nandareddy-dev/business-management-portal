'use client'

import { useState, useMemo } from 'react'
import { Search, X, Calendar } from 'lucide-react'
import { LeadTable } from '@/components/interior/lead-table'

interface Lead { id: string; lead_name: string; phone?: string; email?: string; source?: string; budget?: string; city?: string; interest?: string; notes?: string; date?: string; created_at: string }

type StatFilter = 'total' | 'before' | 'after'

const isBeforeVisit = (l: Lead) => !!l.notes?.includes('[Quotation Before Visit]')
const isAfterVisit  = (l: Lead) => !!l.notes?.includes('[Quotation After Visit]')

export function QuotationsClient({ leads, count, totalBudget }: { leads: Lead[]; count: number; totalBudget: number }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [fromDate, setFromDate]       = useState('')
  const [toDate, setToDate]           = useState('')
  const [dateActive, setDateActive]   = useState(false)
  const [activeStatFilter, setActiveStatFilter] = useState<StatFilter>('total')

  const clearDate = () => { setFromDate(''); setToDate(''); setDateActive(false) }

  const dateFilteredLeads = useMemo(() => {
    return leads.filter(l => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!l.lead_name?.toLowerCase().includes(q) && !l.phone?.toLowerCase().includes(q)) return false
      }
      if (dateActive && (fromDate || toDate)) {
        const ld = new Date(l.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
        if (fromDate && ld < fromDate) return false
        if (toDate && ld > toDate) return false
      }
      return true
    })
  }, [leads, searchQuery, fromDate, toDate, dateActive])

  const beforeVisitLeads = dateFilteredLeads.filter(isBeforeVisit)
  const afterVisitLeads  = dateFilteredLeads.filter(isAfterVisit)

  const filteredLeads = useMemo(() => {
    if (activeStatFilter === 'before') return beforeVisitLeads
    if (activeStatFilter === 'after')  return afterVisitLeads
    return dateFilteredLeads
  }, [activeStatFilter, dateFilteredLeads, beforeVisitLeads, afterVisitLeads])

  const budgetDisplay = totalBudget >= 100000
    ? '₹' + (totalBudget / 100000).toFixed(1) + 'L'
    : totalBudget > 0 ? '₹' + totalBudget.toLocaleString('en-IN') : '—'

  const statsConfig = [
    { key: 'total' as const,  label: 'Total Quotes',      value: count,                  color: '#DB2777' },
    { key: 'total' as const,  label: 'Total Pipeline',    value: budgetDisplay,          color: '#B8860B', isPipeline: true },
    { key: 'before' as const, label: 'Before Site Visit', value: beforeVisitLeads.length, color: '#0891B2' },
    { key: 'after' as const,  label: 'After Site Visit',  value: afterVisitLeads.length,  color: '#7C3AED' },
  ]

  return (
    <div className="space-y-3">
      <div className="bg-white border border-[#E8E2D8] rounded-xl px-3 py-2 shadow-sm space-y-2">
        <div className="flex items-center gap-2 flex-wrap xl:flex-nowrap">
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
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-red-500 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors">
                <X size={10} /> Clear
              </button>
            )}
          </div>
        </div>
        {(searchQuery || dateActive) && (
          <div className="flex items-center gap-2 pt-0.5">
            <span className="text-[10px] font-bold text-[#9A8F82]">Showing</span>
            <span className="text-[10px] font-black text-[#1C1712]">{filteredLeads.length}</span>
            <span className="text-[10px] text-[#9A8F82]">of {count} leads</span>
            {searchQuery && <span className="text-[10px] bg-[#F5F0E8] text-[#7A6E60] px-2 py-0.5 rounded-full border border-[#E2D9C8]">🔍 &ldquo;{searchQuery}&rdquo;</span>}
            {dateActive && fromDate && <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">📅 {fromDate} → {toDate || 'today'}</span>}
          </div>
        )}
      </div>

      {/* Stats Cards — clickable filters */}
      <div className="grid grid-cols-4 gap-2">
        {statsConfig.map((s, i) => {
          const isActive = activeStatFilter === s.key && !s.isPipeline
          const clickable = !s.isPipeline
          return (
            <button
              key={i}
              onClick={() => clickable && setActiveStatFilter(s.key)}
              disabled={!clickable}
              className="bg-white rounded-xl px-3 py-2 flex items-center justify-between gap-2 shadow-sm transition-all text-left"
              style={{
                border: isActive ? `2px solid ${s.color}` : '1px solid #E8E2D8',
                background: isActive ? `${s.color}0D` : '#fff',
                cursor: clickable ? 'pointer' : 'default',
              }}
            >
              <p className="text-[10px] font-semibold leading-tight" style={{ color: isActive ? s.color : '#7A6E60' }}>{s.label}</p>
              <p className="font-black text-base" style={{ color: s.color }}>{s.value}</p>
            </button>
          )
        })}
      </div>

      <LeadTable
        leads={filteredLeads}
        count={filteredLeads.length}
        footerText="quotations"
        emptyIcon="💰"
        emptyText={
          activeStatFilter === 'before' ? 'No quotations sent before site visit' :
          activeStatFilter === 'after'  ? 'No quotations sent after site visit' :
          searchQuery || dateActive ? 'No leads match your filter' : 'No quotations yet'
        }
        columns={['#', 'Lead', 'Phone', 'Source', 'Interest', 'Budget', 'City', 'Notes', 'Date']}
      />
    </div>
  )
}