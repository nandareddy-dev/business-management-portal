import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FileText } from 'lucide-react'
import { QuotationsClient } from '@/components/interior/quotations-client'

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
  notes?: string
  created_at: string
}

export default async function QuotationsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single()
  if (!profile?.company_id) redirect('/login')

  const { data: leads, count } = await supabase
    .from('leads').select('*', { count: 'exact' })
    .eq('company_id', profile.company_id)
    .eq('industry', 'interior-design')
    .eq('pipeline_stage', 'quotation')
    .order('created_at', { ascending: false })

  // Budget is free text on some leads (e.g. Facebook forms save "above_₹20_lakhs"),
  // and Number() of that is NaN, which used to turn the whole total into NaN.
  // Only numeric budgets are summed; the rest count as 0.
  const totalBudget = (leads as Lead[] | null)?.reduce((s, l) => {
    const n = Number(l.budget || 0)
    return s + (Number.isFinite(n) ? n : 0)
  }, 0) ?? 0

  return (
    <div className="space-y-3 p-3 md:p-4" style={{ background: '#F5F0E8', minHeight: '100vh' }}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[3px] mb-0.5" style={{ color: '#B8860B' }}>Interior Design · Pipeline</p>
          <h1 className="text-lg font-black tracking-tight text-[#1C1712]">Quotations</h1>
          <p className="text-[11px] text-[#9A8F82] mt-0.5"><span className="font-bold text-[#1C1712]">{count ?? 0}</span> leads</p>
        </div>
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
          style={{
            background: 'linear-gradient(135deg, #FDF2F8, #FFF7FB)',
            color: '#DB2777',
            border: '1px solid #FBCFE8',
            boxShadow: '0 4px 14px rgba(219,39,119,0.10)',
          }}
        >
          <FileText className="w-3.5 h-3.5" />Quotation Stage
        </div>
      </div>
      <QuotationsClient leads={leads ?? []} count={count ?? 0} totalBudget={totalBudget} />
    </div>
  )
}