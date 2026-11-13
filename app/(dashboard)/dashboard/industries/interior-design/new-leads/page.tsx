import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AddLeadButton } from '@/components/interior/add-lead-button'
import { NewLeadsTable } from '@/components/interior/new-leads-table'

export const dynamic = 'force-dynamic'

interface Lead {
  id: string
  lead_name: string
  phone?: string
  email?: string
  source?: string
  budget?: string
  city?: string
  interest?: string
  created_at: string
}

// IST calendar day. The server runs in UTC, so toDateString() put leads from
// 12:00 AM – 5:30 AM IST into the wrong day for "Added Today".
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
const istDay = (iso: string): string => {
  const t = new Date(iso).getTime()
  return Number.isNaN(t) ? '' : new Date(t + IST_OFFSET_MS).toISOString().slice(0, 10)
}

export default async function NewLeadsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('company_id').eq('id', user.id).single()
  if (!profile?.company_id) redirect('/login')

  const { data: leads, count } = await supabase
    .from('leads')
    .select('*', { count: 'exact' })
    .eq('company_id', profile.company_id)
    .eq('industry', 'interior-design')
    .eq('pipeline_stage', 'new')
    .order('created_at', { ascending: false })

  const todayIst = new Date(new Date().getTime() + IST_OFFSET_MS).toISOString().slice(0, 10)
  const todayCount = leads?.filter((l: { created_at: string }) => istDay(l.created_at) === todayIst).length ?? 0
  const withBudget = (leads as Lead[] | null)?.filter((l) => l.budget).length ?? 0

  return (
    <div className="space-y-3 p-3 md:p-4" style={{ background: '#F5F0E8', minHeight: '100vh' }}>

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[3px] mb-0.5" style={{ color: '#B8860B' }}>
            Interior Design · Pipeline
          </p>
          <h1 className="text-lg font-black tracking-tight text-[#1C1712]">New Leads</h1>
          <p className="text-[11px] text-[#9A8F82] mt-0.5">
            <span className="font-bold text-[#1C1712]">{count ?? 0}</span> total leads
          </p>
        </div>
        <AddLeadButton />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Total New Leads', value: count ?? 0,  color: '#7C3AED' },
          { label: 'Added Today',     value: todayCount,  color: '#B8860B' },
          { label: 'With Budget',     value: withBudget,  color: '#059669' },
        ].map((s, i) => (
          <div key={i}
            className="bg-white border border-[#EDE7DB] rounded-xl px-3 py-2 flex items-center justify-between gap-2 transition-all duration-200 hover:-translate-y-0.5"
            style={{ boxShadow: '0 1px 2px rgba(28,23,18,0.04), 0 8px 20px rgba(28,23,18,0.05)' }}>
            <p className="text-[10px] text-[#7A6E60] font-semibold leading-tight">{s.label}</p>
            <p className="text-base font-black" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table with panel */}
      <NewLeadsTable leads={leads ?? []} count={count ?? 0} />
    </div>
  )
}