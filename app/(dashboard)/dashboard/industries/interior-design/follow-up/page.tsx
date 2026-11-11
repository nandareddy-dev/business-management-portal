import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Calendar } from 'lucide-react'
import { FollowUpClient } from '@/components/interior/followup-client'
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
  company_id: string
  industry: string
  raw_field_data?: Record<string, unknown> | null
}

interface LeadWithDate extends Lead {
  date: string | null
  location: string | null
}

// Location comes from the Facebook lead form answer (raw_field_data.location).
// Manual leads have no raw_field_data, so they show "—" in the table.
const getLocation = (l: Lead): string | null => {
  const v = l.raw_field_data?.location
  return typeof v === 'string' && v.trim() ? v.replace(/_/g, ' ') : null
}

interface Activity {
  id: string
  lead_id: string
  description: string
  type: string
  created_at: string
}

// Extract date from description like "📅 04 Jul 2026, 11:00 am"
const extractDateFromDescription = (desc: string): string | null => {
  if (!desc) return null
  const match = desc.match(/(\d{2}\s+\w+\s+\d{4}),?\s+(\d{1,2}:\d{2}\s+[ap]m)/i)
  if (match) {
    return `${match[1]}, ${match[2]}`
  }
  return null
}

// Parse "04 Jul 2026, 11:00 am" to ISO format
const parseFollowUpDateString = (dateStr: string): string | null => {
  if (!dateStr) return null
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return null
    return d.toISOString()
  } catch {
    return null
  }
}

export default async function FollowUpPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) redirect('/login')

  // Paginated fetch — bypasses Supabase's default 1000-row cap
  // (confirmed via SQL: total leads = 1079, not 1000).
  const allLeads = await fetchAllLeads<Lead>(
    supabase,
    profile.company_id,
    'interior-design',
    'id, lead_name, phone, email, source, budget, city, interest, notes, created_at, pipeline_stage, property_type, company_id, industry, raw_field_data'
  )

  // ── THE FIX ──
  // pipeline_stage is the source of truth for "is this lead in Follow Up",
  // same as Sidebar badge and All-Leads pill. Previously this page only
  // showed leads that ALSO had a parseable date from lead_activities,
  // which silently dropped every Follow Up lead that had no logged
  // activity yet (74 of 86, in Ganesh's case).
  const followUpLeads = allLeads.filter(l => matchStage(l, 'followup'))

  // Fetch follow-up activities (type: 'followup') to attach dates where available.
  const { data: activities } = await supabase
    .from('lead_activities')
    .select('id, lead_id, description, type, created_at')
    .eq('type', 'followup')
    .order('created_at', { ascending: false })

  const leadActivityMap = new Map<string, string>()
  ;(activities as Activity[] | null)?.forEach((a) => {
    if (!leadActivityMap.has(a.lead_id)) {
      const dateStr = extractDateFromDescription(a.description)
      if (dateStr) {
        const isoDate = parseFollowUpDateString(dateStr)
        if (isoDate) leadActivityMap.set(a.lead_id, isoDate)
      }
    }
  })

  // Enrich ALL Follow Up leads with a date where we have one — leads
  // without a logged date keep date: null and show up in the
  // "No Date Set" section inside FollowUpClient instead of vanishing.
  const leadsWithDates: LeadWithDate[] = followUpLeads
    .map((l): LeadWithDate => ({
      ...l,
      date: leadActivityMap.get(l.id) || null,
      location: getLocation(l),
    }))
    .sort((a, b) => {
      if (!a.date && !b.date) return 0
      if (!a.date) return 1
      if (!b.date) return -1
      return new Date(a.date).getTime() - new Date(b.date).getTime()
    })

  return (
    <div className="space-y-5 p-4 md:p-6" style={{ background: '#F5F0E8', minHeight: '100vh' }}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[4px] mb-1" style={{ color: '#B8860B' }}>Interior Design · Pipeline</p>
          <h1 className="text-2xl font-bold tracking-tight text-[#1C1712]">Follow Up</h1>
          <p className="text-sm text-[#9A8F82] mt-0.5">
            <span className="font-bold text-[#1C1712]">{leadsWithDates.length}</span> leads in Follow Up stage
          </p>
        </div>
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap"
          style={{
            background: 'linear-gradient(135deg, #FFFBEB, #FFF6DC)',
            color: '#D97706',
            border: '1px solid #FDE68A',
            boxShadow: '0 4px 14px rgba(217,119,6,0.10)',
          }}
        >
          <Calendar className="w-4 h-4" /> Follow Up
        </div>
      </div>

      <FollowUpClient leads={leadsWithDates} count={leadsWithDates.length} />
    </div>
  )
}