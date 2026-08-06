'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronDown, Phone, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { fetchAllLeads } from '@/lib/fetch-all-leads'

interface Lead {
  id: string
  lead_name?: string | null
  phone?: string | null
  city?: string | null
  source?: string | null
  pipeline_stage?: string | null
  created_at: string
}

const ROW_COLORS = ['#7C6FF0', '#F5A623', '#34D399', '#F472B6', '#60A5FA', '#A78BFA', '#FB923C', '#2DD4BF', '#F87171', '#818CF8']

const initials = (name: string) => name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'

export default function LeadsBySourcePage() {
  const [loading, setLoading] = useState(true)
  const [leads, setLeads] = useState<Lead[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [phoneQuery, setPhoneQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single()
      if (!profile?.company_id) { setLoading(false); return }
      const all = await fetchAllLeads<Lead>(
        supabase, profile.company_id, 'interior-design',
        'id, lead_name, phone, city, source, pipeline_stage, created_at'
      )
      setLeads(all ?? [])
      setLoading(false)
    }
    load()
  }, [])

  // Apply phone-number search + date range before grouping, so both the
  // donut-style rows and the expanded lead lists reflect the filtered set.
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      if (phoneQuery.trim()) {
        const digits = phoneQuery.replace(/\D/g, '')
        const leadDigits = (l.phone || '').replace(/\D/g, '')
        if (digits && !leadDigits.includes(digits)) return false
      }
      if (dateFrom) {
        const d = new Date(l.created_at)
        if (d < new Date(dateFrom)) return false
      }
      if (dateTo) {
        const d = new Date(l.created_at)
        const to = new Date(dateTo)
        to.setHours(23, 59, 59, 999)
        if (d > to) return false
      }
      return true
    })
  }, [leads, phoneQuery, dateFrom, dateTo])

  const grouped: Record<string, Lead[]> = {}
  filteredLeads.forEach(l => {
    const src = (l.source || '').trim() || 'Unknown'
    if (!grouped[src]) grouped[src] = []
    grouped[src].push(l)
  })

  const total = filteredLeads.length
  const rows = Object.entries(grouped)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([name, arr], i) => ({ name, leads: arr, count: arr.length, color: ROW_COLORS[i % ROW_COLORS.length] }))
  const maxCount = Math.max(1, ...rows.map(r => r.count))
  const isFiltered = phoneQuery.trim() !== '' || dateFrom !== '' || dateTo !== ''

  return (
    <div style={{ background: '#F7F7FA', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      <div className="max-w-4xl mx-auto px-4 py-6">

        <Link href="/dashboard/industries/interior-design/dashboard"
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold mb-4"
          style={{ color: '#9CA3AF' }}>
          <ArrowLeft size={12} /> Back to Dashboard
        </Link>

        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: '#F4F3FE' }}>🎯</div>
            <div>
              <h1 className="text-xl font-black" style={{ color: '#111827' }}>Leads by Source</h1>
              <p className="text-xs" style={{ color: '#9CA3AF' }}>
                {loading ? 'Loading…' : `${total} lead${total !== 1 ? 's' : ''}${isFiltered ? ' (filtered)' : ''} across ${rows.length} source${rows.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>

          {/* Filters — phone search + date range */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
              <input type="text" placeholder="Search phone…" value={phoneQuery}
                onChange={e => setPhoneQuery(e.target.value)}
                className="pl-8 pr-3 py-2 rounded-xl text-xs outline-none w-[150px]"
                style={{ background: '#fff', border: '1px solid #E2E5EC', color: '#111827' }} />
            </div>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="px-2.5 py-2 rounded-xl text-xs outline-none"
              style={{ background: '#fff', border: '1px solid #E2E5EC', color: '#111827' }} />
            <span className="text-[10px]" style={{ color: '#9CA3AF' }}>to</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="px-2.5 py-2 rounded-xl text-xs outline-none"
              style={{ background: '#fff', border: '1px solid #E2E5EC', color: '#111827' }} />
            {isFiltered && (
              <button onClick={() => { setPhoneQuery(''); setDateFrom(''); setDateTo('') }}
                className="px-2.5 py-2 rounded-xl text-[11px] font-semibold"
                style={{ background: '#FEF2F2', color: '#DC2626' }}>
                Clear
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="rounded-[20px] p-10 text-center" style={{ background: '#fff' }}>
            <div className="w-6 h-6 mx-auto border-2 rounded-full animate-spin" style={{ borderColor: '#E2E5EC', borderTopColor: '#7C6FF0' }} />
          </div>
        ) : (
          <div className="rounded-[20px] p-2" style={{ background: '#fff', boxShadow: '0 1px 2px rgba(16,24,40,0.04), 0 8px 24px rgba(16,24,40,0.05)' }}>
            {rows.length === 0 ? (
              <p className="text-sm text-center py-10" style={{ color: '#C4BAB0' }}>No leads match this filter</p>
            ) : (
              rows.map((r, i) => {
                const isOpen = expanded === r.name
                return (
                  <div key={r.name} style={{ borderBottom: i < rows.length - 1 ? '1px solid #F5F5F8' : 'none' }}>
                    <button onClick={() => setExpanded(isOpen ? null : r.name)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#FAFAFC] transition-colors rounded-xl">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
                        style={{ background: r.color }}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-[13px] font-semibold truncate pr-2" style={{ color: '#111827' }}>{r.name}</p>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-[10px]" style={{ color: '#9CA3AF' }}>{total > 0 ? Math.round((r.count / total) * 100) : 0}%</span>
                            <span className="text-sm font-black" style={{ color: r.color }}>{r.count}</span>
                            <ChevronDown size={13} style={{ color: '#C4C4C4', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#F1F1F5' }}>
                          <div className="h-full rounded-full" style={{ width: `${(r.count / maxCount) * 100}%`, background: r.color, minWidth: '6px' }} />
                        </div>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-3 max-h-96 overflow-y-auto" style={{ background: '#FAFAFC' }}>
                        {r.leads.map(lead => (
                          <div key={lead.id} className="flex items-center gap-3 py-2.5" style={{ borderBottom: '1px solid #F1F1F5' }}>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
                              style={{ background: r.color }}>
                              {initials(lead.lead_name || '?')}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] font-semibold truncate" style={{ color: '#111827' }}>{lead.lead_name || 'Unnamed'}</p>
                              <p className="text-[10px] font-mono" style={{ color: '#7C6FF0' }}>{lead.phone || '—'}</p>
                              <p className="text-[10px]" style={{ color: '#9CA3AF' }}>{lead.city || '—'} {lead.pipeline_stage ? `· ${lead.pipeline_stage}` : ''}</p>
                            </div>
                            {lead.phone && (
                              <a href={`tel:${lead.phone}`}
                                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ background: '#ECFDF5' }}>
                                <Phone size={12} style={{ color: '#059669' }} />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

      </div>
    </div>
  )
}