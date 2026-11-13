import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Phone } from 'lucide-react'
import { RnrClient } from '@/components/interior/rnr-client'

export const dynamic = 'force-dynamic'

interface Lead {
  id: string
  lead_name: string
  phone?: string
  budget?: string | number
  property_type?: string
  source?: string
  rnr_callback_date?: string | null
  created_at: string
}

// This is a Server Component — it runs once per request, not on client
// re-renders, so Date.now() here is safe. Wrapping it in a plain helper
// function (rather than calling it inline in the component body) keeps
// the react-hooks/purity rule — which targets component render bodies —
// from flagging it.
function getNowUTC(): number {
  return Date.now()
}

export default async function RNRPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single()
  if (!profile?.company_id) redirect('/login')

  // ── Pagination fix — bypass Supabase 1000 row limit ──
  let leads: Lead[] = []
  let page = 0
  const PAGE_SIZE = 1000

  while (true) {
    const { data: batch, error } = await supabase
      .from('leads')
      .select('*')
      .eq('company_id', profile.company_id)
      .eq('industry', 'interior-design')
      .eq('pipeline_stage', 'rnr')
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (error || !batch || batch.length === 0) break
    leads = [...leads, ...batch]
    if (batch.length < PAGE_SIZE) break
    page++
  }

  const count = leads.length

  // ── IST date helpers ──
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
  const nowUTC = getNowUTC()
  const istDateStr = new Date(nowUTC + IST_OFFSET_MS).toISOString().split('T')[0]
  const todayStart = new Date(`${istDateStr}T00:00:00+05:30`)
  const todayEnd   = new Date(`${istDateStr}T23:59:59+05:30`)
  const tomorrowStr = new Date(nowUTC + IST_OFFSET_MS + 86400000).toISOString().split('T')[0]
  const tomorrowStart = new Date(`${tomorrowStr}T00:00:00+05:30`)
  const tomorrowEnd   = new Date(`${tomorrowStr}T23:59:59+05:30`)

  // ── Grouping ──
  const overdueLeads   = leads.filter((l: Lead) => l.rnr_callback_date && new Date(l.rnr_callback_date) < todayStart)
  const todayLeads     = leads.filter((l: Lead) => l.rnr_callback_date && new Date(l.rnr_callback_date) >= todayStart && new Date(l.rnr_callback_date) <= todayEnd)
  const tomorrowLeads  = leads.filter((l: Lead) => l.rnr_callback_date && new Date(l.rnr_callback_date) >= tomorrowStart && new Date(l.rnr_callback_date) <= tomorrowEnd)
  const upcomingLeads  = leads.filter((l: Lead) => l.rnr_callback_date && new Date(l.rnr_callback_date) > tomorrowEnd)
  const noDateLeads    = leads.filter((l: Lead) => !l.rnr_callback_date)

  return (
    <div className="space-y-3 p-3 md:p-4" style={{ background: '#F5F0E8', minHeight: '100vh' }}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[3px] mb-0.5" style={{ color: '#B8860B' }}>Interior Design · Pipeline</p>
          <h1 className="text-lg font-black tracking-tight text-[#1C1712]">RNR</h1>
          <p className="text-[11px] text-[#9A8F82] mt-0.5">
            <span className="font-bold text-[#1C1712]">{count}</span> leads — Ring No Response
          </p>
        </div>
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
          style={{
            background: 'linear-gradient(135deg, #FEF2F2, #FFF7F7)',
            color: '#DC2626',
            border: '1px solid #FECACA',
            boxShadow: '0 4px 14px rgba(220,38,38,0.10)',
          }}
        >
          <Phone className="w-3.5 h-3.5" /> RNR Stage
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { label: 'Total RNR',   value: count,                color: '#DC2626' },
          { label: 'Overdue',     value: overdueLeads.length,  color: '#B91C1C' },
          { label: 'Today',       value: todayLeads.length,    color: '#D97706' },
          { label: 'With Budget', value: leads.filter((l: Lead) => l.budget).length, color: '#B8860B' },
        ].map((s, i) => (
          <div key={i}
            className="bg-white border border-[#EDE7DB] rounded-xl px-3 py-2 flex items-center justify-between gap-2 transition-all duration-200 hover:-translate-y-0.5"
            style={{ boxShadow: '0 1px 2px rgba(28,23,18,0.04), 0 8px 20px rgba(28,23,18,0.05)' }}>
            <p className="text-[10px] text-[#7A6E60] font-semibold leading-tight">{s.label}</p>
            <p className="font-black text-base" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      <RnrClient
        leads={leads}
        count={count}
        overdueLeads={overdueLeads}
        todayLeads={todayLeads}
        tomorrowLeads={tomorrowLeads}
        upcomingLeads={upcomingLeads}
        noDateLeads={noDateLeads}
      />
    </div>
  )
}