import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MapPin } from 'lucide-react'
import { SiteVisitClient } from '@/components/interior/site-visit-client'
import { matchStage } from '@/lib/stage-utils'
import { fetchAllLeads } from '@/lib/fetch-all-leads'

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
  notes?: string | null
  created_at: string
  pipeline_stage?: string | null
  property_type?: string
  sitevisit_date?: string | null
  sitevisit_status?: string | null
  sitevisit_type?: string | null
  sitevisit_note?: string | null
  company_id: string
  industry: string
}

interface LeadWithDate extends Lead {
  date: string | null
}

export default async function SiteVisitPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) redirect('/login')

  // Paginated fetch — bypasses Supabase's default 1000-row cap.
  const allLeads = await fetchAllLeads<Lead>(
    supabase,
    profile.company_id,
    'interior-design',
    'id, lead_name, phone, email, source, budget, city, interest, notes, created_at, pipeline_stage, property_type, sitevisit_date, sitevisit_status, sitevisit_type, sitevisit_note, company_id, industry'
  )

  // pipeline_stage is the source of truth — same pattern as Follow Up page.
  const siteVisitLeads = allLeads.filter(l => matchStage(l, 'sitevisit'))

  // Reuse `date` field for LeadTable/bucket logic, sourced from sitevisit_date directly.
  const leadsWithDates: LeadWithDate[] = siteVisitLeads
    .map((l): LeadWithDate => ({
      ...l,
      date: l.sitevisit_date || null,
    }))
    .sort((a, b) => {
      if (!a.date && !b.date) return 0
      if (!a.date) return 1
      if (!b.date) return -1
      return new Date(a.date).getTime() - new Date(b.date).getTime()
    })

  return (
    <div className="space-y-3 p-3 md:p-4" style={{ background: '#F5F0E8', minHeight: '100vh' }}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[3px] mb-0.5" style={{ color: '#B8860B' }}>Interior Design · Pipeline</p>
          <h1 className="text-lg font-black tracking-tight text-[#1C1712]">Site Visit</h1>
          <p className="text-[11px] text-[#9A8F82] mt-0.5">
            <span className="font-bold text-[#1C1712]">{leadsWithDates.length}</span> leads in Site Visit stage
          </p>
        </div>
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap"
          style={{
            background: 'linear-gradient(135deg, #ECFEFF, #F3FEFF)',
            color: '#0891B2',
            border: '1px solid #A5F3FC',
            boxShadow: '0 4px 14px rgba(8,145,178,0.10)',
          }}
        >
          <MapPin className="w-3.5 h-3.5" /> Site Visit Stage
        </div>
      </div>

      <SiteVisitClient leads={leadsWithDates} count={leadsWithDates.length} />
    </div>
  )
}