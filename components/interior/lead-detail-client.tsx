'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { ArrowLeft, Phone, Plus, Upload, FileText, X, ChevronDown, ChevronUp, Pencil, MapPin } from 'lucide-react'

const GRADIENTS = [
  ['#7C3AED', '#4F46E5'], ['#0891B2', '#0E7490'], ['#059669', '#047857'],
  ['#D97706', '#B45309'], ['#DB2777', '#BE185D'], ['#DC2626', '#B91C1C'],
]

const PIPELINE_STAGES = [
  { key: 'new',       label: 'New',        icon: '🆕', color: '#7C3AED' },
  { key: 'rnr',       label: 'RNR',        icon: '📵', color: '#DC2626' },
  { key: 'followup',  label: 'Follow Up',  icon: '🔄', color: '#D97706' },
  { key: 'sitevisit', label: 'Site Visit', icon: '🏠', color: '#0891B2' },
  { key: 'quotation', label: 'Quotation',  icon: '💰', color: '#DB2777' },
  { key: 'won',       label: 'Won',        icon: '🏆', color: '#059669' },
  { key: 'lost',      label: 'Lost',       icon: '❌', color: '#DC2626' },
]

const ACTIVITY_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
  created:      { icon: '✨', color: '#B8860B', bg: '#FFFBEB' },
  call:         { icon: '📞', color: '#7C3AED', bg: '#EDE9FE' },
  stage_change: { icon: '🔀', color: '#0891B2', bg: '#E0F2FE' },
  note:         { icon: '📝', color: '#64748B', bg: '#F1F5F9' },
  sitevisit:    { icon: '🏠', color: '#0891B2', bg: '#E0F2FE' },
  quotation:    { icon: '💰', color: '#DB2777', bg: '#FCE7F3' },
  followup:     { icon: '🔔', color: '#D97706', bg: '#FEF3C7' },
  won:          { icon: '🏆', color: '#059669', bg: '#D1FAE5' },
  rnr:          { icon: '📵', color: '#DC2626', bg: '#FEF2F2' },
  budget:       { icon: '💰', color: '#B8860B', bg: '#FFFBEB' },
}

const ini = (n: string) => n?.split(' ').map((x: string) => x[0]).join('').slice(0, 2).toUpperCase() || '?'
const fmtDate = (ds: string) => { if (!ds) return '—'; return new Date(ds).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) }
const fmtDateTime = (ds: string) => { if (!ds) return '—'; return new Date(ds).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) }
const timeAgo = (ds: string) => {
  // Normalize: if no timezone info, assume UTC (add Z)
  const normalized = ds && !ds.includes('+') && !ds.endsWith('Z') ? ds + 'Z' : ds
  const diff = Date.now() - new Date(normalized).getTime()
  const mins = Math.floor(diff/60000)
  const hrs = Math.floor(mins/60)
  const days = Math.floor(hrs/24)
  if (days>0) return `${days}d ago`
  if (hrs>0) return `${hrs}h ago`
  if (mins>0) return `${mins}m ago`
  return 'just now'
}
const getTomorrow = () => { const d = new Date(); d.setDate(d.getDate()+1); return d.toISOString().split('T')[0] }
const getNextHour = () => { const d = new Date(); d.setHours(d.getHours()+1,0,0,0); return `${String(d.getHours()).padStart(2,'0')}:00` }

interface LeadDetail {
  id: string
  lead_name?: string
  phone?: string
  pipeline_stage?: string
  source?: string
  budget?: string
  city?: string
  location?: string
  property_type?: string
  interest?: string
  notes?: string
  created_at?: string
  handover_date?: string | null
  followup_date?: string | null
  followup_note?: string | null
  sitevisit_date?: string | null
  sitevisit_status?: string | null
  sitevisit_type?: string | null
  sitevisit_note?: string | null
  quotation_date?: string | null
  quotation_amount?: number | string | null
  quotation_note?: string | null
  quotation_pdf_url?: string | null
  quotation_type?: string | null
  won_amount?: number | string | null
  won_date?: string | null
  won_note?: string | null
  [key: string]: unknown
}

interface LeadRevision {
  id?: string
  version?: number
  amount?: number | string
  created_at?: string
  note?: string | null
  pdf_url?: string | null
  [key: string]: unknown
}

interface LeadActivity {
  id: string
  type?: string
  title?: string
  description?: string
  user_name?: string
  created_at?: string
  [key: string]: unknown
}

const QuickTimes = ({ value, onChange, color }: { value: string; onChange: (t: string) => void; color: string }) => (
  <div className="flex gap-2 flex-wrap">
    {[{l:'9 AM',t:'09:00'},{l:'11 AM',t:'11:00'},{l:'2 PM',t:'14:00'},{l:'4 PM',t:'16:00'},{l:'6 PM',t:'18:00'}].map(slot => (
      <button key={slot.t} onClick={() => onChange(slot.t)} className="px-3 py-1.5 rounded-lg text-[10px] font-bold"
        style={{ background:value===slot.t?`${color}25`:'rgba(0,0,0,0.04)', color:value===slot.t?color:'#6B5E4E', border:`1px solid ${value===slot.t?color+'50':'rgba(184,134,11,0.15)'}` }}>
        {slot.l}
      </button>
    ))}
  </div>
)

export function LeadDetailClient({ lead: initialLead, activities: initialActivities, leadId }: {
  lead: LeadDetail; activities: LeadActivity[]; leadId: string
}) {
  const router = useRouter()
  const [lead, setLead] = useState(initialLead)
  const [activities, setActivities] = useState(initialActivities)
  const [savingStage, setSavingStage] = useState<string | null>(null)

  const [myEmployeeId, setMyEmployeeId] = useState<string | null>(null)
  const [myRole, setMyRole] = useState<string>('employee')

  const [showModal, setShowModal] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [noteType, setNoteType] = useState<'note'|'call'|'sitevisit'|'quotation'>('call')
  const [savingNote, setSavingNote] = useState(false)

  // ── Handover Date State ──
  const [showHandoverPopup, setShowHandoverPopup] = useState(false)
  const [handoverDate, setHandoverDate] = useState('')
  const [handoverNote, setHandoverNote] = useState('')
  const [savingHandover, setSavingHandover] = useState(false)

  // ── Budget Edit State (NEW) ──
  // Editing budget here updates `lead.budget` in local state, which is the SAME value
  // rendered by both the top badge pill and the "Budget" info card below — so a single
  // edit here keeps both displays in sync automatically, no separate sync logic needed.
  const [showBudgetPopup, setShowBudgetPopup] = useState(false)
  const [budgetInput, setBudgetInput] = useState('')
  const [savingBudget, setSavingBudget] = useState(false)

  // ── Location Edit State ──
  const [showLocationPopup, setShowLocationPopup] = useState(false)
  const [locationInput, setLocationInput] = useState(initialLead.location || initialLead.city || '')
  const [savingLocation, setSavingLocation] = useState(false)
  // ── Full Lead Details Editor ──
  const [showLeadEditPopup, setShowLeadEditPopup] = useState(false)
  const [savingLeadEdit, setSavingLeadEdit] = useState(false)
  const [leadEditForm, setLeadEditForm] = useState({
    lead_name: initialLead.lead_name || '',
    phone: initialLead.phone || '',
    city: initialLead.city || '',
    location: initialLead.location || '',
    property_type: initialLead.property_type || '',
    interest: initialLead.interest || '',
    budget: initialLead.budget || '',
    source: initialLead.source || '',
  })

  // ── RNR Popup State (NEW) ──
  const [showRnrPopup, setShowRnrPopup] = useState(false)
  const [rnrNote, setRnrNote] = useState('')
  const [rnrCallBackDate, setRnrCallBackDate] = useState(getTomorrow())
  const [rnrCallBackTime, setRnrCallBackTime] = useState(getNextHour())
  const [savingRnr, setSavingRnr] = useState(false)

  const [showFollowUpPopup, setShowFollowUpPopup] = useState(false)
  const [followUpDate, setFollowUpDate] = useState(getTomorrow())
  const [followUpTime, setFollowUpTime] = useState(getNextHour())
  const [followUpNote, setFollowUpNote] = useState('')
  const [savingFollowUp, setSavingFollowUp] = useState(false)

  const [showSiteVisitPopup, setShowSiteVisitPopup] = useState(false)
  const [svDate, setSvDate] = useState(getTomorrow())
  const [svTime, setSvTime] = useState('10:00')
  const [svType, setSvType] = useState<'before_quotation'|'after_quotation'>('before_quotation')
  const [svNote, setSvNote] = useState('')
  const [savingSV, setSavingSV] = useState(false)

  const [markingComplete, setMarkingComplete] = useState(false)

  const [showQuotationPopup, setShowQuotationPopup] = useState(false)
  const [qtDate, setQtDate] = useState(getTomorrow())
  const [qtTime, setQtTime] = useState('11:00')
  const [qtType, setQtType] = useState<'before_sitevisit'|'after_sitevisit'>('after_sitevisit')
  const [qtAmount, setQtAmount] = useState('')
  const [qtNote, setQtNote] = useState('')
  const [savingQT, setSavingQT] = useState(false)
  const [qtPdfFile, setQtPdfFile] = useState<File | null>(null)
  const [qtPdfUploading, setQtPdfUploading] = useState(false)
  const [qtPdfProgress, setQtPdfProgress] = useState(0)
  const pdfInputRef = useRef<HTMLInputElement>(null)

  const [showWonPopup, setShowWonPopup] = useState(false)
  const [wonAmount, setWonAmount] = useState('')
  const [wonNote, setWonNote] = useState('')
  const [savingWon, setSavingWon] = useState(false)

  const [revisions, setRevisions] = useState<LeadRevision[]>([])
  const [showRevisions, setShowRevisions] = useState(true)
  const [loadingRevisions, setLoadingRevisions] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const curStage = PIPELINE_STAGES.find(s => s.key === lead.pipeline_stage) ?? PIPELINE_STAGES[0]
  const g = GRADIENTS[lead.lead_name?.charCodeAt(0) % GRADIENTS.length] ?? GRADIENTS[0]

  const refreshActivities = async () => {
    const { data: acts } = await supabase.from('lead_activities').select('*').eq('lead_id', leadId).order('created_at', { ascending: false })
    setActivities(acts ?? [])
  }

  const loadRevisions = async () => {
    setLoadingRevisions(true)
    const { data } = await supabase.from('quotation_revisions').select('*').eq('lead_id', leadId).order('version', { ascending: false })
    setRevisions(data ?? [])
    setLoadingRevisions(false)
  }

  const loadEmployeeId = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profile?.role) setMyRole(profile.role)
    const { data } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', user.id)
      .single()
    setMyEmployeeId(data?.id ?? null)
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps -- intentional mount-time fetch; fn ref is stable in practice
  useEffect(() => { loadRevisions(); loadEmployeeId() }, [])

  // ── Stage Change ──
  const handleStageChange = async (stageKey: string) => {
    if (savingStage) return
    // ✅ RNR — show popup instead of direct save
    if (stageKey === 'rnr')       { setRnrNote(''); setRnrCallBackDate(getTomorrow()); setRnrCallBackTime(getNextHour()); setShowRnrPopup(true); return }
    if (stageKey === 'followup')  { setFollowUpDate(getTomorrow()); setFollowUpTime(getNextHour()); setFollowUpNote(''); setShowFollowUpPopup(true); return }
    if (stageKey === 'sitevisit') { setSvDate(getTomorrow()); setSvTime('10:00'); setSvType('before_quotation'); setSvNote(''); setShowSiteVisitPopup(true); return }
    if (stageKey === 'quotation') { setQtDate(getTomorrow()); setQtTime('11:00'); setQtType('after_sitevisit'); setQtAmount(''); setQtNote(''); setQtPdfFile(null); setShowQuotationPopup(true); return }
    if (stageKey === 'won')       { setWonAmount(String(lead.quotation_amount||'')); setWonNote(''); setShowWonPopup(true); return }

    setSavingStage(stageKey)
    const prev = lead.pipeline_stage
    const { data: { user } } = await supabase.auth.getUser()
    setLead((l: LeadDetail) => ({ ...l, pipeline_stage: stageKey }))
    await supabase.from('leads').update({ pipeline_stage: stageKey, assigned_to: myEmployeeId }).eq('id', leadId)
    try {
      const now = new Date().toISOString()
      const callDescMap: Record<string, string> = {
        lost: 'Called — Not interested / dropped',
      }
      const callDesc = callDescMap[stageKey]
      if (callDesc) {
        await supabase.from('lead_activities').insert({
          lead_id: leadId, type: 'call', title: '📞 Call Logged',
          description: callDesc, user_id: user?.id, created_at: now,
        })
      }
      await supabase.from('lead_activities').insert({
        lead_id: leadId, type: 'stage_change', title: 'Stage Updated',
        description: `${prev} → ${stageKey}`, stage_from: prev, stage_to: stageKey,
        user_id: user?.id, created_at: now,
      })
      await refreshActivities()
    } catch {}
    setSavingStage(null)
  }

  // ── Handover Date Save ──
  const handleSaveHandover = async () => {
    if (!handoverDate) return
    setSavingHandover(true)
    const { data: { user } } = await supabase.auth.getUser()
    try {
      const dt = new Date(`${handoverDate}T00:00:00`).toISOString()
      await supabase.from('leads').update({
        handover_date: dt,
        assigned_to: myEmployeeId,
      }).eq('id', leadId)
      setLead((l: LeadDetail) => ({ ...l, handover_date: dt }))
      await supabase.from('lead_activities').insert({
        lead_id: leadId, type: 'note', title: '📦 Handover Date Set',
        description: `Handover scheduled for ${fmtDate(dt)}${handoverNote.trim() ? ` — ${handoverNote.trim()}` : ''}`,
        user_id: user?.id, created_at: new Date().toISOString(),
      })
      await refreshActivities()
      setShowHandoverPopup(false)
      setHandoverNote('')
    } catch (e) { console.error(e) }
    setSavingHandover(false)
  }

  // ── Budget Edit Save (NEW) ──
  const handleSaveBudget = async () => {
    setSavingBudget(true)
    const { data: { user } } = await supabase.auth.getUser()
    const prevBudget = lead.budget
    const cleaned = budgetInput.trim() || null
    try {
      await supabase.from('leads').update({
        budget: cleaned,
        assigned_to: myEmployeeId,
      }).eq('id', leadId)
      // Updates local state — the top badge pill AND the "Budget" info card both
      // read lead.budget, so this single update reflects everywhere at once.
      setLead((l: LeadDetail) => ({ ...l, budget: cleaned || undefined }))
      await supabase.from('lead_activities').insert({
        lead_id: leadId, type: 'budget', title: '💰 Budget Updated',
        description: `${prevBudget || '—'} → ${cleaned || '—'}`,
        user_id: user?.id, created_at: new Date().toISOString(),
      })
      await refreshActivities()
      setShowBudgetPopup(false)
    } catch (e) { console.error(e) }
    setSavingBudget(false)
  }

  // ── Full Lead Details Save ──
  const openLeadEditPopup = () => {
    setLeadEditForm({
      lead_name: lead.lead_name || '',
      phone: lead.phone || '',
      city: lead.city || '',
      location: String(lead.location || ''),
      property_type: lead.property_type || '',
      interest: lead.interest || '',
      budget: lead.budget || '',
      source: lead.source || '',
    })
    setShowLeadEditPopup(true)
  }

  const handleSaveLeadDetails = async () => {
    if (!leadEditForm.lead_name.trim() || !leadEditForm.phone.trim()) return
    setSavingLeadEdit(true)
    const { data: { user } } = await supabase.auth.getUser()
    const updates = {
      lead_name: leadEditForm.lead_name.trim(),
      phone: leadEditForm.phone.trim(),
      city: leadEditForm.city.trim() || null,
      location: leadEditForm.location.trim() || null,
      property_type: leadEditForm.property_type.trim() || null,
      interest: leadEditForm.interest.trim() || null,
      budget: leadEditForm.budget.trim() || null,
      source: leadEditForm.source.trim() || null,
      assigned_to: myEmployeeId,
    }

    try {
      const { error } = await supabase.from('leads').update(updates).eq('id', leadId)
      if (error) throw error

      setLead((current: LeadDetail) => ({ ...current, ...updates }))
      await supabase.from('lead_activities').insert({
        lead_id: leadId,
        type: 'note',
        title: '✏️ Lead Details Updated',
        description: 'Lead name, phone, city, location and lead information updated',
        user_id: user?.id,
        created_at: new Date().toISOString(),
      })
      await refreshActivities()
      setShowLeadEditPopup(false)
    } catch (error) {
      console.error('Unable to update lead details:', error)
      alert('Unable to update lead details. Please check the fields and try again.')
    } finally {
      setSavingLeadEdit(false)
    }
  }

  // ── Location Edit Save ──
  const handleSaveLocation = async () => {
    const cleaned = locationInput.trim()
    if (!cleaned) return

    setSavingLocation(true)
    const { data: { user } } = await supabase.auth.getUser()
    const previousLocation = lead.location || lead.city || ''

    try {
      const { error } = await supabase.from('leads').update({
        location: cleaned,
        assigned_to: myEmployeeId,
      }).eq('id', leadId)

      if (error) throw error

      setLead((l: LeadDetail) => ({ ...l, location: cleaned }))
      await supabase.from('lead_activities').insert({
        lead_id: leadId,
        type: 'note',
        title: '📍 Location Updated',
        description: `${previousLocation || '—'} → ${cleaned}`,
        user_id: user?.id,
        created_at: new Date().toISOString(),
      })
      await refreshActivities()
      setShowLocationPopup(false)
    } catch (e) {
      console.error('Failed to update lead location:', e)
      alert('Location update failed. Please check that the leads table has a location column.')
    } finally {
      setSavingLocation(false)
    }
  }

  // ── RNR Save (NEW) ──
  const handleSaveRnr = async () => {
    setSavingRnr(true)
    const prev = lead.pipeline_stage
    const { data: { user } } = await supabase.auth.getUser()
    const callBackDt = rnrCallBackDate && rnrCallBackTime
      ? new Date(`${rnrCallBackDate}T${rnrCallBackTime}:00`).toISOString()
      : null
    try {
      await supabase.from('leads').update({
        pipeline_stage: 'rnr',
        assigned_to: myEmployeeId,
        rnr_callback_date: callBackDt ?? null,  // ✅ save callback date
      }).eq('id', leadId)
      setLead((l: LeadDetail) => ({ ...l, pipeline_stage: 'rnr', rnr_callback_date: callBackDt ?? null }))

      const nowRnr = new Date().toISOString()
      // Auto call log
      await supabase.from('lead_activities').insert({
        lead_id: leadId, type: 'call', title: '📞 Call Logged',
        description: `Called — Ring No Response${rnrNote.trim() ? ` · ${rnrNote.trim()}` : ''}`,
        user_id: user?.id, created_at: nowRnr,
      })
      // RNR activity
      await supabase.from('lead_activities').insert({
        lead_id: leadId, type: 'rnr', title: '📵 RNR Marked',
        description: [
          'Ring No Response',
          rnrNote.trim() ? rnrNote.trim() : null,
          callBackDt ? `🔁 Try again: ${fmtDateTime(callBackDt)}` : null,
        ].filter(Boolean).join(' · '),
        stage_from: prev, stage_to: 'rnr',
        user_id: user?.id, created_at: nowRnr,
      })
      if (prev !== 'rnr') {
        await supabase.from('lead_activities').insert({
          lead_id: leadId, type: 'stage_change', title: 'Stage Updated',
          description: `${prev} → rnr`, stage_from: prev, stage_to: 'rnr',
          user_id: user?.id, created_at: nowRnr,
        })
      }
      await refreshActivities()
      setShowRnrPopup(false)
    } catch (e) { console.error(e) }
    setSavingRnr(false)
  }

  // ── Follow Up ──
  const handleSaveFollowUp = async () => {
    if (!followUpDate || !followUpTime) return
    setSavingFollowUp(true)
    const prev = lead.pipeline_stage
    const { data: { user } } = await supabase.auth.getUser()
    const dt = new Date(`${followUpDate}T${followUpTime}:00`).toISOString()
    try {
      await supabase.from('leads').update({
        pipeline_stage: 'followup', followup_date: dt,
        followup_note: followUpNote.trim()||null,
        assigned_to: myEmployeeId,
      }).eq('id', leadId)
      setLead((l: LeadDetail) => ({ ...l, pipeline_stage: 'followup', followup_date: dt, followup_note: followUpNote.trim()||null }))
      const nowFU = new Date().toISOString()
      await supabase.from('lead_activities').insert({
        lead_id: leadId, type: 'call', title: '📞 Call Logged',
        description: `Called — Follow Up scheduled for ${fmtDateTime(dt)}`,
        user_id: user?.id, created_at: nowFU,
      })
      await supabase.from('lead_activities').insert({
        lead_id: leadId, type: 'followup', title: '🔔 Follow Up Scheduled',
        description: `📅 ${fmtDateTime(dt)}${followUpNote.trim()?` — ${followUpNote.trim()}`:''}`,
        stage_from: prev, stage_to: 'followup', user_id: user?.id, created_at: nowFU,
      })
      if (prev !== 'followup') await supabase.from('lead_activities').insert({
        lead_id: leadId, type: 'stage_change', title: 'Stage Updated',
        description: `${prev} → followup`, stage_from: prev, stage_to: 'followup',
        user_id: user?.id, created_at: nowFU,
      })
      await refreshActivities()
      setShowFollowUpPopup(false)
    } catch (e) { console.error(e) }
    setSavingFollowUp(false)
  }

  // ── Site Visit ──
  const handleSaveSiteVisit = async () => {
    if (!svDate || !svTime) return
    setSavingSV(true)
    const prev = lead.pipeline_stage
    const { data: { user } } = await supabase.auth.getUser()
    const dt = new Date(`${svDate}T${svTime}:00`).toISOString()
    try {
      await supabase.from('leads').update({
        pipeline_stage: 'sitevisit', sitevisit_date: dt,
        sitevisit_type: svType, sitevisit_note: svNote.trim()||null,
        sitevisit_status: 'scheduled',
        assigned_to: myEmployeeId,
      }).eq('id', leadId)
      setLead((l: LeadDetail) => ({ ...l, pipeline_stage: 'sitevisit', sitevisit_date: dt, sitevisit_type: svType, sitevisit_note: svNote.trim()||null, sitevisit_status: 'scheduled' }))
      const nowSV = new Date().toISOString()
      await supabase.from('lead_activities').insert({
        lead_id: leadId, type: 'call', title: '📞 Call Logged',
        description: `Called — Site Visit confirmed for ${fmtDateTime(dt)}`,
        user_id: user?.id, created_at: nowSV,
      })
      await supabase.from('lead_activities').insert({
        lead_id: leadId, type: 'sitevisit', title: '🏠 Site Visit Scheduled',
        description: `📅 ${fmtDateTime(dt)} · ${svType==='before_quotation'?'Before Quotation':'After Quotation'}${svNote.trim()?` — ${svNote.trim()}`:''}`,
        stage_from: prev, stage_to: 'sitevisit', user_id: user?.id, created_at: nowSV,
      })
      if (prev !== 'sitevisit') await supabase.from('lead_activities').insert({
        lead_id: leadId, type: 'stage_change', title: 'Stage Updated',
        description: `${prev} → sitevisit`, stage_from: prev, stage_to: 'sitevisit',
        user_id: user?.id, created_at: nowSV,
      })
      await refreshActivities()
      setShowSiteVisitPopup(false)
    } catch (e) { console.error(e) }
    setSavingSV(false)
  }

  const handleMarkVisitCompleted = async () => {
    setMarkingComplete(true)
    const { data: { user } } = await supabase.auth.getUser()
    try {
      await supabase.from('leads').update({ sitevisit_status: 'completed', assigned_to: myEmployeeId }).eq('id', leadId)
      setLead((l: LeadDetail) => ({ ...l, sitevisit_status: 'completed' }))
      await supabase.from('lead_activities').insert({
        lead_id: leadId, type: 'sitevisit', title: '✅ Site Visit Completed',
        description: `Visit marked completed on ${fmtDateTime(new Date().toISOString())}`,
        user_id: user?.id, created_at: new Date().toISOString(),
      })
      await refreshActivities()
    } catch (e) { console.error(e) }
    setMarkingComplete(false)
  }

  const uploadPdf = async (file: File): Promise<string | null> => {
    setQtPdfUploading(true); setQtPdfProgress(10)
    try {
      // eslint-disable-next-line react-hooks/purity -- unique filename generated inside an async upload handler, not render
      const fileName = `${leadId}_${Date.now()}.pdf`
      const { error } = await supabase.storage.from('quotations').upload(`quotations/${fileName}`, file, { upsert: true, contentType: 'application/pdf' })
      if (error) { setQtPdfUploading(false); return null }
      setQtPdfProgress(80)
      const { data: { publicUrl } } = supabase.storage.from('quotations').getPublicUrl(`quotations/${fileName}`)
      setQtPdfProgress(100); setQtPdfUploading(false)
      return publicUrl
    } catch { setQtPdfUploading(false); return null }
  }

  // ── Quotation ──
  const handleSaveQuotation = async () => {
    if (!qtDate || !qtTime) return
    setSavingQT(true)
    const prev = lead.pipeline_stage
    const { data: { user } } = await supabase.auth.getUser()
    const dt = new Date(`${qtDate}T${qtTime}:00`).toISOString()
    const qtTypeLabel = qtType === 'before_sitevisit' ? 'Before Site Visit' : 'After Site Visit'
    try {
      let pdfUrl: string | null = null
      if (qtPdfFile) pdfUrl = await uploadPdf(qtPdfFile)

      const { count } = await supabase.from('quotation_revisions').select('*', { count: 'exact', head: true }).eq('lead_id', leadId)
      const nextVersion = (count ?? 0) + 1

      await supabase.from('quotation_revisions').insert({
        lead_id: leadId, version: nextVersion,
        amount: qtAmount.trim()||null, pdf_url: pdfUrl,
        quotation_type: qtType, note: qtNote.trim()||null,
        user_id: user?.id, created_at: new Date().toISOString(),
      })

      await supabase.from('leads').update({
        pipeline_stage: 'quotation', quotation_date: dt,
        quotation_type: qtType, quotation_amount: qtAmount.trim()||null,
        quotation_note: qtNote.trim()||null,
        quotation_pdf_url: pdfUrl || lead.quotation_pdf_url,
        assigned_to: myEmployeeId,
      }).eq('id', leadId)

      setLead((l: LeadDetail) => ({ ...l, pipeline_stage: 'quotation', quotation_date: dt, quotation_type: qtType, quotation_amount: qtAmount.trim()||null, quotation_note: qtNote.trim()||null, quotation_pdf_url: pdfUrl || l.quotation_pdf_url }))

      const nowQT = new Date().toISOString()
      await supabase.from('lead_activities').insert({
        lead_id: leadId, type: 'call', title: '📞 Call Logged',
        description: `Called — Quotation discussed${qtAmount.trim()?` ₹${Number(qtAmount).toLocaleString('en-IN')}` : ''}`,
        user_id: user?.id, created_at: nowQT,
      })
      await supabase.from('lead_activities').insert({
        lead_id: leadId, type: 'quotation',
        title: `💰 Quotation v${nextVersion} ${nextVersion === 1 ? 'Sent' : 'Updated'}`,
        description: `${qtAmount.trim()?`₹${qtAmount.trim()} · `:''}${qtTypeLabel}${pdfUrl?' · 📄 PDF':''} ${qtNote.trim()?`— ${qtNote.trim()}`:''}`.trim(),
        stage_from: prev, stage_to: 'quotation', user_id: user?.id, created_at: nowQT,
      })
      if (prev !== 'quotation') await supabase.from('lead_activities').insert({
        lead_id: leadId, type: 'stage_change', title: 'Stage Updated',
        description: `${prev} → quotation`, stage_from: prev, stage_to: 'quotation',
        user_id: user?.id, created_at: nowQT,
      })

      await refreshActivities()
      await loadRevisions()
      setShowQuotationPopup(false)
      setQtPdfFile(null); setQtPdfProgress(0)
    } catch (e) { console.error(e) }
    setSavingQT(false)
  }

  // ── Won ──
  const handleSaveWon = async () => {
    setSavingWon(true)
    const prev = lead.pipeline_stage
    const { data: { user } } = await supabase.auth.getUser()
    try {
      await supabase.from('leads').update({
        pipeline_stage: 'won',
        won_amount: wonAmount.trim()||null,
        won_note: wonNote.trim()||null,
        won_date: new Date().toISOString(),
        assigned_to: myEmployeeId,
      }).eq('id', leadId)
      setLead((l: LeadDetail) => ({ ...l, pipeline_stage: 'won', won_amount: wonAmount.trim()||null, won_note: wonNote.trim()||null }))
      const nowWon = new Date().toISOString()
      await supabase.from('lead_activities').insert({
        lead_id: leadId, type: 'call', title: '📞 Call Logged',
        description: `Called — Deal closed!${wonAmount.trim()?` ₹${Number(wonAmount).toLocaleString('en-IN')}` : ''}`,
        user_id: user?.id, created_at: nowWon,
      })
      await supabase.from('lead_activities').insert({
        lead_id: leadId, type: 'won', title: '🏆 Deal Won!',
        description: `${wonAmount.trim()?`₹${Number(wonAmount).toLocaleString('en-IN')} · `:''}${wonNote.trim()||'Deal closed successfully'}`,
        stage_from: prev, stage_to: 'won', user_id: user?.id, created_at: nowWon,
      })
      if (prev !== 'won') await supabase.from('lead_activities').insert({
        lead_id: leadId, type: 'stage_change', title: 'Stage Updated',
        description: `${prev} → won`, stage_from: prev, stage_to: 'won',
        user_id: user?.id, created_at: nowWon,
      })
      await refreshActivities()
      setShowWonPopup(false)
    } catch (e) { console.error(e) }
    setSavingWon(false)
  }

  const handleSaveNote = async () => {
    if (!noteText.trim()) return
    setSavingNote(true)
    const { data: { user } } = await supabase.auth.getUser()
    try {
      await supabase.from('lead_activities').insert({
        lead_id: leadId, type: noteType,
        title: noteType==='note'?'Note added':noteType==='call'?'Call logged':noteType==='sitevisit'?'Site Visit':'Quotation',
        description: noteText.trim(), user_id: user?.id, created_at: new Date().toISOString(),
      })
      const leadUpdate: Record<string, unknown> = { assigned_to: myEmployeeId }
      if (noteType === 'note') leadUpdate.notes = noteText.trim()
      await supabase.from('leads').update(leadUpdate).eq('id', leadId)
      if (noteType === 'note') setLead((l: LeadDetail) => ({ ...l, notes: noteText.trim() }))
      await refreshActivities(); setNoteText(''); setShowModal(false)
    } catch (e) { console.error(e) }
    setSavingNote(false)
  }

  const STAGE_ORDER = ['new', 'rnr', 'followup', 'sitevisit', 'quotation', 'won', 'lost']
  const currentStageIdx = STAGE_ORDER.indexOf(lead.pipeline_stage)
  const isAdmin = ['admin', 'tenant_admin', 'manager'].includes(myRole)

  const isStageDisabled = (stageKey: string) => {
    // Admin — full freedom, any stage anytime
    if (isAdmin) return false
    // Employee — forward only, Lost always allowed
    const targetIdx = STAGE_ORDER.indexOf(stageKey)
    if (stageKey === 'lost') return false
    return targetIdx < currentStageIdx
  }


  return (
    <div style={{ background:'#F7F4EF', minHeight:'100vh', fontFamily:"'Inter', sans-serif" }}>
      <style>{`
        @keyframes fadeUp   { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
        @keyframes scaleIn  { from{opacity:0;transform:scale(0.93) translateY(14px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes popIn    { from{opacity:0;transform:scale(0.85)} to{opacity:1;transform:scale(1)} }
        .fu1 { animation: fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) 0.00s both }
        .fu2 { animation: fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) 0.07s both }
        .fu3 { animation: fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) 0.14s both }
        .fu4 { animation: fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) 0.21s both }
        .fu5 { animation: fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) 0.28s both }
        .scale-in { animation: scaleIn 0.32s cubic-bezier(0.16,1,0.3,1) both }
        .pop-in   { animation: popIn  0.28s cubic-bezier(0.34,1.56,0.64,1) both }
        .hvr { transition: all 0.18s ease }
        .hvr:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.09) !important }
        .stg { transition: all 0.18s ease }
        .stg:hover:not(:disabled) { transform: scale(1.04) }
        .act:hover { background: rgba(184,134,11,0.04) }
        .act { transition: background 0.15s }
        input[type="date"],input[type="time"] { color-scheme: light }
        .pdf-drop { transition: all 0.2s }
        .pdf-drop:hover { border-color:#F9A8D4!important; background:#FFF5F9!important }
        .rev-row:hover { background: rgba(219,39,119,0.03) }
        .rev-row { transition: background 0.15s }
        .no-scrollbar::-webkit-scrollbar { display: none }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none }
      `}</style>

      {/* ─── TOP BAR ─── */}
      <div className="fu1 sticky top-0 z-20 px-3 sm:px-4 py-3 flex items-center justify-between gap-2"
        style={{ background:'rgba(247,244,239,0.92)', backdropFilter:'blur(12px)', borderBottom:'1px solid rgba(0,0,0,0.06)' }}>
        <button onClick={() => router.back()}
          className="hvr flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-full text-sm font-semibold flex-shrink-0"
          style={{ background:'#fff', border:'1px solid rgba(0,0,0,0.08)', color:'#555', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
          <ArrowLeft className="w-3.5 h-3.5"/> <span className="hidden sm:inline">Back</span>
        </button>
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <button onClick={() => setShowHandoverPopup(true)}
            className="hvr flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold flex-shrink-0 whitespace-nowrap"
            style={{ background:'#fff', border:'1px solid rgba(8,145,178,0.3)', color:'#0891B2', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
            📦 <span className="hidden sm:inline">Handover Date</span><span className="sm:hidden">Handover</span>
          </button>
          <a href={`tel:${lead.phone}`}
            className="hvr flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 rounded-full text-sm font-black text-white flex-shrink-0"
            style={{ background:'linear-gradient(135deg,#22C55E,#16A34A)', boxShadow:'0 4px 14px rgba(34,197,94,0.35)' }}>
            <Phone className="w-3.5 h-3.5"/> Call
          </a>
        </div>
      </div>

      {/* ─── HERO CARD ─── */}
      <div className="px-4 pt-5 pb-3 fu2">
        <div className="rounded-3xl p-5 relative" style={{ background:'#fff', boxShadow:'0 4px 24px rgba(0,0,0,0.07)', border:'1px solid rgba(0,0,0,0.05)' }}>
          <button
            type="button"
            onClick={openLeadEditPopup}
            className="absolute top-4 right-4 z-10 inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold hvr"
            style={{ background:'#FFF7E6', color:'#B7791F', border:'1px solid #FDE2A7', boxShadow:'0 2px 8px rgba(184,134,11,0.10)' }}
            aria-label="Edit lead details"
          >
            <Pencil size={13}/> <span className="hidden sm:inline">Edit Details</span><span className="sm:hidden">Edit</span>
          </button>
          <div className="flex items-start gap-4 pr-16 sm:pr-20">
            {/* Avatar */}
            <div style={{ position:'relative', flexShrink:0 }}>
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-black text-white"
                style={{ background:`linear-gradient(135deg,${g[0]},${g[1]})`, boxShadow:`0 8px 24px ${g[0]}40` }}>
                {ini(lead.lead_name)}
              </div>
              <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-xl flex items-center justify-center text-sm border-2 border-white"
                style={{ background:curStage.color, boxShadow:`0 2px 8px ${curStage.color}50` }}>
                {curStage.icon}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-black mb-0.5" style={{ color:'#1A1612', letterSpacing:'-0.02em' }}>{lead.lead_name}</h1>
              <a href={`tel:${lead.phone}`} className="text-sm font-bold font-mono block mb-3"
                style={{ color:curStage.color }}>{lead.phone}</a>

              {/* All badges — single scrollable line */}
              <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-0.5">
                <span className="pop-in inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black flex-shrink-0"
                  style={{ background:`${curStage.color}18`, color:curStage.color, border:`1.5px solid ${curStage.color}35` }}>
                  {curStage.icon} {curStage.label}
                </span>
                {lead.source && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-bold flex-shrink-0"
                    style={{ background:'#F5F0E8', color:'#6B5E4E', border:'1px solid rgba(184,134,11,0.15)' }}>
                    📌 {lead.source}
                  </span>
                )}
                {/* Budget display — editing is available from the main Edit Details popup. */}
                <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-bold flex-shrink-0"
                  style={{ background:'#FFFBEB', color:'#B8860B', border:'1px solid #FDE68A' }}>
                  💰 {lead.budget || 'No budget'}
                </span>
                {lead.handover_date && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-bold flex-shrink-0"
                    style={{ background:'#ECFEFF', color:'#0891B2', border:'1px solid #A5F3FC' }}>
                    📦 {fmtDate(lead.handover_date)}
                  </span>
                )}
                {lead.followup_date && lead.pipeline_stage==='followup' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-bold flex-shrink-0"
                    style={{ background:'#FFFBEB', color:'#92400E', border:'1px solid #FDE68A' }}>
                    🔔 {fmtDateTime(lead.followup_date)}
                  </span>
                )}
                {lead.sitevisit_date && lead.pipeline_stage==='sitevisit' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-bold flex-shrink-0"
                    style={{ background:'#E0F2FE', color:'#0369A1', border:'1px solid #BAE6FD' }}>
                    🏠 {fmtDateTime(lead.sitevisit_date)}
                  </span>
                )}
                {lead.quotation_date && lead.pipeline_stage==='quotation' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-bold flex-shrink-0"
                    style={{ background:'#FDF2F8', color:'#9D174D', border:'1px solid #FBCFE8' }}>
                    💰 {revisions.length > 0 ? `v${revisions[0]?.version} · ` : ''}₹{lead.quotation_amount||'—'}
                  </span>
                )}
                <span className="text-[10px] ml-auto flex-shrink-0 pl-2" style={{ color:'#C4BAB0' }}>{fmtDate(lead.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Info row — horizontally scrollable on mobile, evenly spaced on desktop */}
          <div className="no-scrollbar flex items-center gap-2 mt-4 pt-4 overflow-x-auto sm:overflow-visible sm:justify-between"
            style={{ borderTop:'1px solid rgba(0,0,0,0.05)' }}>
            {[
              { icon:'🏙️', label:'City',        val:lead.city },
              { icon:'📍', label:'Location',    val:lead.location },
              { icon:'🏗️', label:'Property',    val:lead.property_type },
              { icon:'📅', label:'Added',       val:fmtDate(lead.created_at) },
              { icon:'💰', label:'Budget',      val:lead.budget },
              { icon:'💡', label:'Requirement', val:lead.interest },
            ].map((x,i) => (x.val || x.label === 'Location' || x.label === 'Budget') ? (
              <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-2xl flex-shrink-0 sm:flex-1 min-w-[128px] sm:min-w-0"
                style={{ background:'#F7F4EF' }}>
                <span className="text-sm flex-shrink-0">{x.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[8px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color:'#B8B0A0' }}>{x.label}</p>
                  <p className="text-xs font-black truncate" style={{ color: x.val ? '#1A1612' : '#C4BAB0' }}>{x.val || '—'}</p>
                </div>
              </div>
            ) : null)}
          </div>
        </div>
      </div>

      {/* ─── STAGE SELECTOR ─── */}
      <div className="px-4 pb-3 fu3">
        <div className="rounded-3xl p-4" style={{ background:'#fff', boxShadow:'0 4px 24px rgba(0,0,0,0.07)', border:'1px solid rgba(0,0,0,0.05)' }}>
          <p className="text-[9px] font-black uppercase tracking-[3px] mb-3" style={{ color:'#C4BAB0' }}>Move to Stage</p>
          <div className="no-scrollbar flex items-center gap-2 overflow-x-auto sm:overflow-visible pb-1 sm:pb-0">
            {PIPELINE_STAGES.map(stage => {
              const isActive  = lead.pipeline_stage === stage.key
              const isLoading = savingStage === stage.key
              const disabled  = !!savingStage || isStageDisabled(stage.key)
              const isPast    = isStageDisabled(stage.key) && !isActive
              return (
                <button key={stage.key}
                  onClick={() => !disabled && handleStageChange(stage.key)}
                  disabled={disabled}
                  className="stg flex items-center justify-center gap-1.5 py-2 px-3 rounded-2xl text-xs font-bold relative flex-shrink-0 sm:flex-1 min-w-[86px] sm:min-w-0"
                  style={{
                    background: isActive ? stage.color : isPast ? '#F0EDE8' : `${stage.color}10`,
                    color: isActive ? '#fff' : isPast ? '#C4BAB0' : stage.color,
                    border: `1.5px solid ${isActive ? stage.color : isPast ? 'transparent' : stage.color+'25'}`,
                    boxShadow: isActive ? `0 4px 16px ${stage.color}40` : 'none',
                    opacity: isPast ? 0.5 : 1,
                    cursor: isPast ? 'not-allowed' : 'pointer',
                  }}>
                  {isLoading
                    ? <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"/>
                    : isPast ? <span style={{ filter:'grayscale(1)' }}>{stage.icon}</span>
                    : stage.icon}
                  {stage.label}
                  {isActive && <span className="text-[10px] opacity-70">✓</span>}
                  {isPast && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px]"
                    style={{ background:'#E8E2D8', color:'#B8B0A0' }}>🔒</span>}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ─── CONTEXT CARDS ─── */}
      <div className="px-4 space-y-3 fu4">

        {/* Follow Up */}
        {lead.followup_date && lead.pipeline_stage==='followup' && (
          <div className="rounded-3xl p-4" style={{ background:'#FFFBEB', border:'1.5px solid #FDE68A', boxShadow:'0 4px 16px rgba(217,119,6,0.08)' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background:'#FEF3C7' }}>🔔</div>
                <p className="text-[9px] font-black uppercase tracking-[3px]" style={{ color:'#B45309' }}>Follow Up</p>
              </div>
              <button onClick={()=>{setFollowUpDate(new Date(lead.followup_date).toISOString().split('T')[0]);setFollowUpTime(new Date(lead.followup_date).toTimeString().slice(0,5));setFollowUpNote(lead.followup_note||'');setShowFollowUpPopup(true)}}
                className="text-[10px] font-bold px-3 py-1.5 rounded-full hvr"
                style={{ background:'#FEF3C7', color:'#92400E', border:'1px solid #FDE68A' }}>✏️ Edit</button>
            </div>
            <p className="text-base font-black" style={{ color:'#92400E' }}>{fmtDateTime(lead.followup_date)}</p>
            {lead.followup_note && <p className="text-xs mt-1" style={{ color:'#B45309' }}>{lead.followup_note}</p>}
          </div>
        )}

        {/* Site Visit */}
        {lead.sitevisit_date && lead.pipeline_stage==='sitevisit' && (
          <div className="rounded-3xl p-4"
            style={{ background:lead.sitevisit_status==='completed'?'#ECFDF5':'#F0F9FF', border:`1.5px solid ${lead.sitevisit_status==='completed'?'#6EE7B7':'#BAE6FD'}`, boxShadow:`0 4px 16px ${lead.sitevisit_status==='completed'?'rgba(5,150,105,0.08)':'rgba(8,145,178,0.08)'}` }}>
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background:lead.sitevisit_status==='completed'?'#A7F3D0':'#BAE6FD' }}>{lead.sitevisit_status==='completed'?'✅':'🏠'}</div>
                <p className="text-[9px] font-black uppercase tracking-[3px]" style={{ color:lead.sitevisit_status==='completed'?'#065F46':'#0369A1' }}>{lead.sitevisit_status==='completed'?'Visit Completed':'Site Visit'}</p>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background:lead.sitevisit_type==='before_quotation'?'#FEF3C7':'#FCE7F3', color:lead.sitevisit_type==='before_quotation'?'#92400E':'#9D174D' }}>{lead.sitevisit_type==='before_quotation'?'Before Qt':'After Qt'}</span>
              </div>
              <div className="flex gap-1.5">
                <button onClick={()=>{setSvDate(new Date(lead.sitevisit_date).toISOString().split('T')[0]);setSvTime(new Date(lead.sitevisit_date).toTimeString().slice(0,5));setSvType((lead.sitevisit_type as 'before_quotation'|'after_quotation')||'before_quotation');setSvNote(lead.sitevisit_note||'');setShowSiteVisitPopup(true)}}
                  className="text-[10px] font-bold px-2.5 py-1.5 rounded-full hvr" style={{ background:lead.sitevisit_status==='completed'?'#A7F3D0':'#BAE6FD', color:lead.sitevisit_status==='completed'?'#065F46':'#0369A1' }}>✏️</button>
                {lead.sitevisit_status !== 'completed' ? (
                  <button onClick={handleMarkVisitCompleted} disabled={markingComplete}
                    className="text-[10px] font-bold px-3 py-1.5 rounded-full hvr disabled:opacity-50"
                    style={{ background:'#059669', color:'#fff' }}>
                    {markingComplete?'⏳':'✅'} Done
                  </button>
                ) : (
                  <span className="text-[9px] font-bold px-2.5 py-1.5 rounded-full" style={{ background:'#D1FAE5', color:'#065F46' }}>✅ Completed</span>
                )}
              </div>
            </div>
            <p className="text-base font-black" style={{ color:lead.sitevisit_status==='completed'?'#065F46':'#0369A1' }}>{fmtDateTime(lead.sitevisit_date)}</p>
            {lead.sitevisit_note && <p className="text-xs mt-1" style={{ color:lead.sitevisit_status==='completed'?'#059669':'#0891B2' }}>{lead.sitevisit_note}</p>}
          </div>
        )}

        {/* Won */}
        {lead.pipeline_stage==='won' && (
          <div className="rounded-3xl p-5" style={{ background:'linear-gradient(135deg,#ECFDF5,#D1FAE5)', border:'2px solid #6EE7B7', boxShadow:'0 8px 28px rgba(5,150,105,0.15)' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background:'linear-gradient(135deg,#059669,#047857)', boxShadow:'0 6px 18px rgba(5,150,105,0.4)' }}>🏆</div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-[3px]" style={{ color:'#065F46' }}>Deal Won 🎉</p>
                {lead.won_amount && <p className="text-2xl font-black" style={{ color:'#059669' }}>₹ {Number(lead.won_amount).toLocaleString('en-IN')}</p>}
              </div>
              <button onClick={()=>{setWonAmount(String(lead.won_amount||''));setWonNote(lead.won_note||'');setShowWonPopup(true)}} className="ml-auto text-[10px] font-bold px-3 py-1.5 rounded-full hvr" style={{ background:'#A7F3D0', color:'#065F46' }}>✏️ Edit</button>
            </div>
            {lead.won_note && <p className="text-sm" style={{ color:'#047857' }}>{lead.won_note}</p>}
            {lead.won_date && <p className="text-[10px] mt-1" style={{ color:'#6EE7B7' }}>Closed {fmtDate(lead.won_date)}</p>}
          </div>
        )}

        {/* Quotation */}
        {lead.pipeline_stage==='quotation' && (
          <div className="rounded-3xl overflow-hidden" style={{ background:'#FDF2F8', border:'1.5px solid #FBCFE8', boxShadow:'0 4px 16px rgba(219,39,119,0.08)' }}>
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background:'#FCE7F3' }}>💰</div>
                  <p className="text-[9px] font-black uppercase tracking-[3px]" style={{ color:'#9D174D' }}>Quotation</p>
                  {revisions.length > 0 && <span className="text-[9px] font-black px-2 py-0.5 rounded-full text-white" style={{ background:'#9D174D' }}>v{revisions[0]?.version}</span>}
                </div>
                <button onClick={()=>{setQtDate(getTomorrow());setQtTime('11:00');setQtType((lead.quotation_type as 'before_sitevisit'|'after_sitevisit')||'after_sitevisit');setQtAmount('');setQtNote('');setQtPdfFile(null);setShowQuotationPopup(true)}}
                  className="text-[10px] font-bold px-3 py-1.5 rounded-full hvr" style={{ background:'#FCE7F3', color:'#9D174D', border:'1px solid #FBCFE8' }}>+ New Rev</button>
              </div>
              {lead.quotation_amount && <p className="text-2xl font-black" style={{ color:'#9D174D' }}>₹ {Number(lead.quotation_amount).toLocaleString('en-IN')}</p>}
              {lead.quotation_date && <p className="text-xs mt-0.5" style={{ color:'#DB2777' }}>{fmtDateTime(lead.quotation_date)}</p>}
              {lead.quotation_note && <p className="text-xs mt-1" style={{ color:'#DB2777' }}>{lead.quotation_note}</p>}
              {lead.quotation_pdf_url && (
                <a href={lead.quotation_pdf_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-3 px-3 py-2 rounded-2xl text-xs font-bold hvr"
                  style={{ background:'#FCE7F3', color:'#9D174D', border:'1px solid #FBCFE8' }}>
                  <FileText className="w-3.5 h-3.5"/> View PDF
                </a>
              )}
            </div>
            {revisions.length > 0 && (
              <div style={{ borderTop:'1px solid #FBCFE8' }}>
                <button onClick={() => setShowRevisions(!showRevisions)}
                  className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold"
                  style={{ color:'#9D174D', background:showRevisions?'#FCE7F3':'transparent' }}>
                  <span className="flex items-center gap-2">📋 History <span className="px-1.5 py-0.5 rounded-full text-[9px] text-white" style={{ background:'#9D174D' }}>{revisions.length}</span></span>
                  {showRevisions ? <ChevronUp className="w-3.5 h-3.5"/> : <ChevronDown className="w-3.5 h-3.5"/>}
                </button>
                {showRevisions && (
                  <div style={{ borderTop:'1px solid #FBCFE8' }}>
                    {loadingRevisions ? <div className="p-4 text-center text-xs" style={{ color:'#DB2777' }}>Loading...</div> : (
                      revisions.map((rev, i) => (
                        <div key={rev.id} className="rev-row px-4 py-3 flex items-center gap-3" style={{ borderBottom: i < revisions.length-1?'1px solid #FBCFE8':'none' }}>
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black flex-shrink-0" style={{ background:i===0?'#9D174D':'#FCE7F3', color:i===0?'white':'#9D174D' }}>v{rev.version}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              {rev.amount ? <p className="text-sm font-black" style={{ color:'#831843' }}>₹ {Number(rev.amount).toLocaleString('en-IN')}</p> : <p className="text-xs font-bold" style={{ color:'#DB2777' }}>No amount</p>}
                              {i===0 && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background:'#9D174D' }}>Latest</span>}
                              {i < revisions.length-1 && rev.amount && revisions[i+1]?.amount && (
                                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background:Number(rev.amount)<Number(revisions[i+1].amount)?'#FEF3C7':'#FCE7F3', color:Number(rev.amount)<Number(revisions[i+1].amount)?'#92400E':'#9D174D' }}>
                                  {Number(rev.amount)<Number(revisions[i+1].amount)?'↓':'↑'}₹{Math.abs(Number(rev.amount)-Number(revisions[i+1].amount)).toLocaleString('en-IN')}
                                </span>
                              )}
                            </div>
                            <p className="text-[9px]" style={{ color:'#DB2777' }}>{fmtDateTime(rev.created_at)}</p>
                            {rev.note && <p className="text-[9px] mt-0.5" style={{ color:'#DB2777' }}>{rev.note}</p>}
                          </div>
                          {rev.pdf_url && (
                            <a href={rev.pdf_url} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-xl flex items-center justify-center hvr flex-shrink-0" style={{ background:'#FCE7F3' }}>
                              <FileText className="w-3.5 h-3.5" style={{ color:'#9D174D' }}/>
                            </a>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── ACTIVITY TIMELINE ─── */}
        <div className="rounded-3xl overflow-hidden fu5" style={{ background:'#fff', border:'1px solid rgba(0,0,0,0.05)', boxShadow:'0 4px 20px rgba(0,0,0,0.06)' }}>
          <div className="px-4 py-4 flex items-center justify-between" style={{ borderBottom:'1px solid rgba(0,0,0,0.05)' }}>
            <div className="flex items-center gap-3">
              <p className="text-[9px] font-black uppercase tracking-[3px]" style={{ color:'#C4BAB0' }}>Activity</p>
              <span className="text-[10px] font-black px-2.5 py-1 rounded-full" style={{ background:'#F5F0E8', color:'#B8860B' }}>{activities.length}</span>
            </div>
            <button onClick={() => setShowModal(true)}
              className="hvr flex items-center gap-1.5 text-[11px] font-black px-4 py-2 rounded-full text-white"
              style={{ background:'linear-gradient(135deg,#B8860B,#D97706)', boxShadow:'0 3px 12px rgba(184,134,11,0.3)' }}>
              <Plus className="w-3 h-3"/> Add
            </button>
          </div>

          {activities.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-4xl mb-3">🗒️</div>
              <p className="text-sm font-bold" style={{ color:'#C4BAB0' }}>No activity yet</p>
            </div>
          ) : (
            <div>
              {activities.map((act: LeadActivity, i: number) => {
                const cfg = ACTIVITY_ICONS[act.type] || ACTIVITY_ICONS.note
                const isLast = i === activities.length - 1
                return (
                  <div key={act.id} className="act flex gap-3 px-4 py-3.5" style={{ borderBottom: isLast ? 'none' : '1px solid rgba(0,0,0,0.04)' }}>
                    {/* Icon + line */}
                    <div className="flex flex-col items-center gap-0 flex-shrink-0" style={{ width:36 }}>
                      <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-sm" style={{ background:cfg.bg, border:`1.5px solid ${cfg.color}20`, flexShrink:0 }}>
                        {cfg.icon}
                      </div>
                      {!isLast && <div className="w-px flex-1 mt-1" style={{ background:'rgba(0,0,0,0.06)', minHeight:8 }}/>}
                    </div>

                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex items-start justify-between gap-2 mb-0.5">
                        <p className="text-xs font-black" style={{ color:'#1A1612' }}>{act.title}</p>
                        <span className="text-[9px] font-bold flex-shrink-0 px-2 py-0.5 rounded-full" style={{ background:'#F5F0E8', color:'#A89880' }}>{timeAgo(act.created_at)}</span>
                      </div>
                      {act.description && <p className="text-[11px] leading-relaxed" style={{ color:'#6B5E4E' }}>{act.description}</p>}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {act.user_name && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background:'#EDE9FE', color:'#7C3AED' }}>👤 {act.user_name}</span>}
                        <span className="text-[9px]" style={{ color:'#D4CEC8' }}>{fmtDate(act.created_at)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <p className="text-center text-[10px] pb-4" style={{ color:'#D4CEC8' }}>GK CRM · Interior Design</p>
      </div>

      {/* ═══ FULL LEAD DETAILS EDIT POPUP ═══ */}
      {showLeadEditPopup && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-3 sm:p-4" style={{ animation:'fadeIn 0.2s ease' }}>
          <button type="button" className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={() => !savingLeadEdit && setShowLeadEditPopup(false)} aria-label="Close edit dialog"/>
          <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto scale-in"
            style={{ background:'#FFFDF8', border:'1.5px solid #F3E5C8', borderRadius:26, boxShadow:'0 32px 80px rgba(0,0,0,0.22)' }}>
            <div className="sticky top-0 z-10 px-5 py-4 flex items-center justify-between"
              style={{ background:'#FFFDF8', borderBottom:'1px solid #F0E7D8', borderTopLeftRadius:26, borderTopRightRadius:26 }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background:'#FFF2D8', color:'#B7791F' }}>
                  <Pencil size={18}/>
                </div>
                <div>
                  <p className="text-base font-black" style={{ color:'#1A1612' }}>Edit Lead Details</p>
                  <p className="text-[10px] font-medium" style={{ color:'#9A8974' }}>Update customer and project information</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowLeadEditPopup(false)} disabled={savingLeadEdit}
                className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background:'#F5F0E8', color:'#6B5E4E' }} aria-label="Close">
                <X size={17}/>
              </button>
            </div>

            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {([
                ['lead_name', 'Customer Name', 'Enter customer name'],
                ['phone', 'Phone Number', 'Enter phone number'],
                ['city', 'City', 'e.g. Hyderabad'],
                ['location', 'Location / Full Address', 'e.g. Kukatpally, KPHB, Hyderabad'],
                ['property_type', 'Property Type', 'e.g. 2 BHK'],
                ['interest', 'Requirement', 'e.g. Full Interior'],
                ['budget', 'Budget', 'e.g. ₹5–10 lakhs'],
                ['source', 'Lead Source', 'e.g. Facebook Meta'],
              ] as const).map(([key, label, placeholder]) => (
                <label key={key} className="block min-w-0">
                  <span className="text-[9px] font-black uppercase tracking-[2px] block mb-1.5" style={{ color:'#9A8974' }}>{label}</span>
                  <input
                    type="text"
                    value={leadEditForm[key]}
                    onChange={event => setLeadEditForm(current => ({ ...current, [key]: event.target.value }))}
                    placeholder={placeholder}
                    className="w-full min-w-0 px-3.5 py-3 rounded-xl text-sm font-semibold outline-none focus:ring-2"
                    style={{ background:'#FAF7F1', border:'1px solid #E9DFD0', color:'#1A1612' }}
                  />
                </label>
              ))}
            </div>

            <div className="px-5 pb-5 flex flex-col-reverse sm:flex-row justify-end gap-2">
              <button type="button" onClick={() => setShowLeadEditPopup(false)} disabled={savingLeadEdit}
                className="px-5 py-3 rounded-xl text-sm font-bold" style={{ background:'#F2EEE7', color:'#6B5E4E' }}>
                Cancel
              </button>
              <button type="button" onClick={handleSaveLeadDetails} disabled={savingLeadEdit || !leadEditForm.lead_name.trim() || !leadEditForm.phone.trim()}
                className="px-5 py-3 rounded-xl text-sm font-black text-white disabled:opacity-50"
                style={{ background:'linear-gradient(135deg,#D6A21E,#B7791F)', boxShadow:'0 5px 14px rgba(184,134,11,0.22)' }}>
                {savingLeadEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ BUDGET EDIT POPUP (NEW) ═══ */}
      {showBudgetPopup && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4" style={{ animation:'fadeIn 0.2s ease' }}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowBudgetPopup(false)}/>
          <div className="relative w-full max-w-sm scale-in"
            style={{ background:'#FFFDF8', border:'1.5px solid #FDE68A', borderRadius:28, boxShadow:'0 32px 80px rgba(184,134,11,0.2)' }}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom:'1px solid #FDE68A' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
                  style={{ background:'#FEF3C7', border:'1.5px solid #FDE68A' }}>💰</div>
                <div>
                  <p className="text-sm font-black" style={{ color:'#1C1712' }}>Edit Budget</p>
                  <p className="text-[10px] font-medium" style={{ color:'#B8860B' }}>{lead.lead_name}</p>
                </div>
              </div>
              <button onClick={() => setShowBudgetPopup(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hvr"
                style={{ background:'#FEF3C7', color:'#B8860B' }}>✕</button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-[9px] font-black uppercase tracking-[3px] block mb-1.5"
                  style={{ color:'#B8860B' }}>💰 Budget</label>
                <input type="text"
                  value={budgetInput}
                  onChange={e => setBudgetInput(e.target.value)}
                  placeholder="e.g. 750000 or ₹7.5L"
                  autoFocus
                  className="w-full px-4 py-3 rounded-2xl text-sm font-bold outline-none"
                  style={{ background:'#FEF3C7', border:'1.5px solid #FDE68A', color:'#1C1712' }}/>
                <p className="text-[10px] mt-1.5" style={{ color:'#B8860B' }}>
                  Tip: use a plain number (₹7,50,000) for the cleanest display — text like &quot;lacks&quot; or ranges still work but are shown as typed.
                </p>
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowBudgetPopup(false)}
                  className="flex-1 py-3 rounded-2xl text-sm font-bold"
                  style={{ background:'#FEF3C7', color:'#B8860B', border:'1px solid #FDE68A' }}>
                  Cancel
                </button>
                <button onClick={handleSaveBudget}
                  disabled={savingBudget}
                  className="flex-1 py-3 rounded-2xl text-sm font-black text-white disabled:opacity-40"
                  style={{ background:'linear-gradient(135deg,#B8860B,#D97706)', boxShadow:'0 6px 18px rgba(184,134,11,0.3)' }}>
                  {savingBudget ? '⏳ Saving...' : '💰 Save Budget'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ LOCATION EDIT POPUP ═══ */}
      {showLocationPopup && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4" style={{ animation:'fadeIn 0.2s ease' }}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !savingLocation && setShowLocationPopup(false)}/>
          <div className="relative w-full max-w-sm scale-in"
            style={{ background:'#F0FFFE', border:'1.5px solid #A5F3FC', borderRadius:28, boxShadow:'0 32px 80px rgba(8,145,178,0.2)' }}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom:'1px solid #A5F3FC' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                  style={{ background:'#CFFAFE', border:'1.5px solid #A5F3FC', color:'#0891B2' }}>
                  <MapPin size={19}/>
                </div>
                <div>
                  <p className="text-sm font-black" style={{ color:'#164E63' }}>Edit Location</p>
                  <p className="text-[10px] font-medium" style={{ color:'#0891B2' }}>{lead.lead_name}</p>
                </div>
              </div>
              <button onClick={() => setShowLocationPopup(false)} disabled={savingLocation}
                className="w-8 h-8 rounded-full flex items-center justify-center hvr"
                style={{ background:'#CFFAFE', color:'#0891B2' }} aria-label="Close location editor">
                <X size={16}/>
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-[9px] font-black uppercase tracking-[3px] block mb-1.5"
                  style={{ color:'#0891B2' }}>📍 Full Location</label>
                <input
                  type="text"
                  value={locationInput}
                  onChange={e => setLocationInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveLocation() }}
                  placeholder="e.g. Kukatpally, Hyderabad, Telangana"
                  autoFocus
                  className="w-full px-4 py-3 rounded-2xl text-sm font-bold outline-none"
                  style={{ background:'#ECFEFF', border:'1.5px solid #A5F3FC', color:'#164E63' }}
                />
                <p className="text-[10px] mt-1.5" style={{ color:'#0891B2' }}>
                  Add area, city and state for a more accurate customer location.
                </p>
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowLocationPopup(false)} disabled={savingLocation}
                  className="flex-1 py-3 rounded-2xl text-sm font-bold disabled:opacity-50"
                  style={{ background:'#CFFAFE', color:'#0E7490', border:'1px solid #A5F3FC' }}>
                  Cancel
                </button>
                <button onClick={handleSaveLocation}
                  disabled={savingLocation || !locationInput.trim()}
                  className="flex-1 py-3 rounded-2xl text-sm font-black text-white disabled:opacity-40"
                  style={{ background:'linear-gradient(135deg,#0891B2,#0E7490)', boxShadow:'0 6px 18px rgba(8,145,178,0.25)' }}>
                  {savingLocation ? '⏳ Saving...' : '📍 Save Location'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ HANDOVER DATE POPUP ═══ */}
      {showHandoverPopup && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4" style={{ animation:'fadeIn 0.2s ease' }}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowHandoverPopup(false)}/>
          <div className="relative w-full max-w-sm scale-in"
            style={{ background:'#F0FFFE', border:'1.5px solid #A5F3FC', borderRadius:28, boxShadow:'0 32px 80px rgba(8,145,178,0.2)' }}>
            {/* Header */}
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom:'1px solid #A5F3FC' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
                  style={{ background:'#CFFAFE', border:'1.5px solid #A5F3FC' }}>📦</div>
                <div>
                  <p className="text-sm font-black" style={{ color:'#164E63' }}>Set Handover Date</p>
                  <p className="text-[10px] font-medium" style={{ color:'#0891B2' }}>{lead.lead_name}</p>
                </div>
              </div>
              <button onClick={() => setShowHandoverPopup(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hvr"
                style={{ background:'#CFFAFE', color:'#0891B2' }}>✕</button>
            </div>

            <div className="p-5 space-y-4">
              {/* Date picker */}
              <div>
                <label className="text-[9px] font-black uppercase tracking-[3px] block mb-1.5"
                  style={{ color:'#0891B2' }}>📅 Handover Date</label>
                <input type="date"
                  value={handoverDate}
                  onChange={e => setHandoverDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl text-sm font-bold outline-none"
                  style={{ background:'#CFFAFE', border:'1.5px solid #A5F3FC', color:'#164E63' }}/>
              </div>

              {/* Note */}
              <div>
                <label className="text-[9px] font-black uppercase tracking-[3px] block mb-1.5"
                  style={{ color:'#0891B2' }}>📝 Note (Optional)</label>
                <textarea rows={2} value={handoverNote}
                  onChange={e => setHandoverNote(e.target.value)}
                  placeholder="E.g. Keys handover at site..."
                  className="w-full rounded-2xl px-4 py-2.5 text-sm outline-none resize-none"
                  style={{ background:'#CFFAFE', border:'1px solid #A5F3FC', color:'#164E63' }}
                  onFocus={e => (e.target.style.borderColor='#67E8F9')}
                  onBlur={e => (e.target.style.borderColor='#A5F3FC')}/>
              </div>

              {/* Preview */}
              {handoverDate && (
                <div className="px-4 py-3 rounded-2xl"
                  style={{ background:'#CFFAFE', border:'1px solid #A5F3FC' }}>
                  <p className="text-[9px] font-black uppercase tracking-[3px] mb-0.5" style={{ color:'#0891B2' }}>Handover On</p>
                  <p className="text-base font-black" style={{ color:'#164E63' }}>
                    {fmtDate(new Date(`${handoverDate}T00:00:00`).toISOString())}
                  </p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowHandoverPopup(false)}
                  className="flex-1 py-3 rounded-2xl text-sm font-bold"
                  style={{ background:'#CFFAFE', color:'#0891B2', border:'1px solid #A5F3FC' }}>
                  Cancel
                </button>
                <button onClick={handleSaveHandover}
                  disabled={!handoverDate || savingHandover}
                  className="flex-1 py-3 rounded-2xl text-sm font-black text-white disabled:opacity-40"
                  style={{ background:'linear-gradient(135deg,#0369A1,#0891B2)', boxShadow:'0 6px 18px rgba(8,145,178,0.3)' }}>
                  {savingHandover ? '⏳ Saving...' : '📦 Save Date'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ RNR POPUP ═══ */}
      {showRnrPopup && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4" style={{ animation:'fadeIn 0.2s ease' }}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowRnrPopup(false)}/>
          <div className="relative w-full max-w-sm scale-in" style={{ background:'#FFF5F5', border:'1.5px solid #FECACA', borderRadius:28, boxShadow:'0 32px 80px rgba(220,38,38,0.2)' }}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom:'1px solid #FECACA' }}>
              <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg" style={{ background:'#FEF2F2' }}>📵</div><div><p className="text-sm font-black" style={{ color:'#7F1D1D' }}>Mark RNR</p><p className="text-[10px]" style={{ color:'#DC2626' }}>{lead.lead_name}</p></div></div>
              <button onClick={() => setShowRnrPopup(false)} className="w-8 h-8 rounded-full flex items-center justify-center hvr" style={{ background:'#FEF2F2', color:'#DC2626' }}>✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-start gap-3 px-3 py-3 rounded-2xl" style={{ background:'#FEF2F2', border:'1px solid #FECACA' }}>
                <span>📞</span><p className="text-[11px]" style={{ color:'#991B1B' }}>Call will be logged automatically as <strong>Ring No Response</strong>.</p>
              </div>
              <div><p className="text-[9px] font-black uppercase tracking-[3px] mb-2" style={{ color:'#DC2626' }}>🔁 Try Again (Optional)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[9px] font-bold uppercase block mb-1.5" style={{ color:'#DC2626' }}>Date</label><input type="date" value={rnrCallBackDate} min={new Date().toISOString().split('T')[0]} onChange={e=>setRnrCallBackDate(e.target.value)} className="w-full px-3 py-2.5 rounded-2xl text-sm font-bold outline-none" style={{ background:'#FEF2F2', border:'1px solid #FECACA', color:'#7F1D1D' }}/></div>
                  <div><label className="text-[9px] font-bold uppercase block mb-1.5" style={{ color:'#DC2626' }}>Time</label><input type="time" value={rnrCallBackTime} onChange={e=>setRnrCallBackTime(e.target.value)} className="w-full px-3 py-2.5 rounded-2xl text-sm font-bold outline-none" style={{ background:'#FEF2F2', border:'1px solid #FECACA', color:'#7F1D1D' }}/></div>
                </div>
              </div>
              <div><p className="text-[9px] font-black uppercase tracking-[3px] mb-2" style={{ color:'#DC2626' }}>Quick Pick</p><QuickTimes value={rnrCallBackTime} onChange={setRnrCallBackTime} color="#DC2626"/></div>
              <div><label className="text-[9px] font-bold uppercase block mb-1.5" style={{ color:'#DC2626' }}>Note (Optional)</label><textarea rows={2} value={rnrNote} onChange={e=>setRnrNote(e.target.value)} placeholder="E.g. Called 3 times, busy tone..." className="w-full rounded-2xl px-3 py-2.5 text-sm outline-none resize-none" style={{ background:'#FEF2F2', border:'1px solid #FECACA', color:'#7F1D1D' }} onFocus={e=>(e.target.style.borderColor='#FCA5A5')} onBlur={e=>(e.target.style.borderColor='#FECACA')}/></div>
              {rnrCallBackDate && rnrCallBackTime && <div className="px-3 py-2.5 rounded-2xl" style={{ background:'#FEF2F2', border:'1px solid #FECACA' }}><p className="text-[9px] font-black uppercase tracking-[3px] mb-0.5" style={{ color:'#B91C1C' }}>Try Again At</p><p className="text-sm font-black" style={{ color:'#7F1D1D' }}>{fmtDateTime(new Date(`${rnrCallBackDate}T${rnrCallBackTime}:00`).toISOString())}</p></div>}
              <div className="flex gap-3"><button onClick={() => setShowRnrPopup(false)} className="flex-1 py-3 rounded-2xl text-sm font-bold" style={{ background:'#FEF2F2', color:'#DC2626', border:'1px solid #FECACA' }}>Cancel</button><button onClick={handleSaveRnr} disabled={savingRnr} className="flex-1 py-3 rounded-2xl text-sm font-black text-white disabled:opacity-40" style={{ background:'linear-gradient(135deg,#B91C1C,#DC2626)', boxShadow:'0 6px 20px rgba(220,38,38,0.3)' }}>{savingRnr?'⏳...':'📵 Mark RNR'}</button></div>
            </div>
          </div>
        </div>
      )}

      {/* FOLLOW UP */}
      {showFollowUpPopup && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4" style={{ animation:'fadeIn 0.2s ease' }}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowFollowUpPopup(false)}/>
          <div className="relative w-full max-w-sm scale-in" style={{ background:'#FFFDF8', border:'1.5px solid #FDE68A', borderRadius:28, boxShadow:'0 32px 80px rgba(184,134,11,0.2)' }}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom:'1px solid #FDE68A' }}>
              <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg" style={{ background:'#FEF3C7' }}>🔔</div><div><p className="text-sm font-black" style={{ color:'#1C1712' }}>Schedule Follow Up</p><p className="text-[10px]" style={{ color:'#9A8F82' }}>{lead.lead_name}</p></div></div>
              <button onClick={() => setShowFollowUpPopup(false)} className="w-8 h-8 rounded-full flex items-center justify-center hvr" style={{ background:'#F5F0E8', color:'#6B5E4E' }}>✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3"><div><label className="text-[9px] font-bold uppercase block mb-1.5" style={{ color:'#9A8F82' }}>Date</label><input type="date" value={followUpDate} min={new Date().toISOString().split('T')[0]} onChange={e=>setFollowUpDate(e.target.value)} className="w-full px-3 py-2.5 rounded-2xl text-sm font-bold outline-none" style={{ background:'#FFFBEB', border:'1px solid #FDE68A', color:'#92400E' }}/></div><div><label className="text-[9px] font-bold uppercase block mb-1.5" style={{ color:'#9A8F82' }}>Time</label><input type="time" value={followUpTime} onChange={e=>setFollowUpTime(e.target.value)} className="w-full px-3 py-2.5 rounded-2xl text-sm font-bold outline-none" style={{ background:'#FFFBEB', border:'1px solid #FDE68A', color:'#92400E' }}/></div></div>
              <div><p className="text-[9px] font-black uppercase tracking-[3px] mb-2" style={{ color:'#9A8F82' }}>Quick Pick</p><QuickTimes value={followUpTime} onChange={setFollowUpTime} color="#D97706"/></div>
              <div><label className="text-[9px] font-bold uppercase block mb-1.5" style={{ color:'#9A8F82' }}>Note</label><textarea rows={2} value={followUpNote} onChange={e=>setFollowUpNote(e.target.value)} placeholder="E.g. Client busy, call after 5 PM..." className="w-full rounded-2xl px-3 py-2.5 text-sm outline-none resize-none" style={{ background:'#F5F0E8', border:'1px solid rgba(184,134,11,0.2)', color:'#1C1712' }} onFocus={e=>(e.target.style.borderColor='#FDE68A')} onBlur={e=>(e.target.style.borderColor='rgba(184,134,11,0.2)')}/></div>
              {followUpDate&&followUpTime&&<div className="px-3 py-2.5 rounded-2xl" style={{ background:'#FEF3C7', border:'1px solid #FDE68A' }}><p className="text-[9px] font-black uppercase tracking-[3px] mb-0.5" style={{ color:'#B45309' }}>Scheduled For</p><p className="text-sm font-black" style={{ color:'#92400E' }}>{fmtDateTime(new Date(`${followUpDate}T${followUpTime}:00`).toISOString())}</p></div>}
              <div className="flex gap-3"><button onClick={() => setShowFollowUpPopup(false)} className="flex-1 py-3 rounded-2xl text-sm font-bold" style={{ background:'#F5F0E8', color:'#6B5E4E' }}>Cancel</button><button onClick={handleSaveFollowUp} disabled={!followUpDate||!followUpTime||savingFollowUp} className="flex-1 py-3 rounded-2xl text-sm font-black text-white disabled:opacity-40" style={{ background:'linear-gradient(135deg,#B45309,#D97706)', boxShadow:'0 6px 18px rgba(184,134,11,0.3)' }}>{savingFollowUp?'⏳...':'🔔 Schedule'}</button></div>
            </div>
          </div>
        </div>
      )}

      {/* SITE VISIT */}
      {showSiteVisitPopup && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4" style={{ animation:'fadeIn 0.2s ease' }}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowSiteVisitPopup(false)}/>
          <div className="relative w-full max-w-sm scale-in" style={{ background:'#F0F9FF', border:'1.5px solid #BAE6FD', borderRadius:28, boxShadow:'0 32px 80px rgba(8,145,178,0.18)' }}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom:'1px solid #BAE6FD' }}>
              <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg" style={{ background:'#E0F2FE' }}>🏠</div><div><p className="text-sm font-black" style={{ color:'#0C4A6E' }}>Schedule Site Visit</p><p className="text-[10px]" style={{ color:'#0891B2' }}>{lead.lead_name}</p></div></div>
              <button onClick={() => setShowSiteVisitPopup(false)} className="w-8 h-8 rounded-full flex items-center justify-center hvr" style={{ background:'#E0F2FE', color:'#0891B2' }}>✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div><p className="text-[9px] font-black uppercase tracking-[3px] mb-2" style={{ color:'#0891B2' }}>Visit Type</p><div className="grid grid-cols-2 gap-2">{([{v:'before_quotation',label:'📋 Before',sub:'Quotation',bg:'#FEF3C7',color:'#92400E',border:'#FDE68A'},{v:'after_quotation',label:'✅ After',sub:'Quotation',bg:'#FCE7F3',color:'#9D174D',border:'#FBCFE8'}] as const).map(opt=>(<button key={opt.v} onClick={()=>setSvType(opt.v as 'before_quotation'|'after_quotation')} className="py-3 px-2 rounded-2xl text-xs font-bold text-center transition-all" style={{ background:svType===opt.v?opt.bg:'#E0F2FE', color:svType===opt.v?opt.color:'#0369A1', border:`2px solid ${svType===opt.v?opt.border:'#BAE6FD'}` }}>{opt.label}<br/><span className="text-[9px] opacity-70">{opt.sub}</span></button>))}</div></div>
              <div className="grid grid-cols-2 gap-3"><div><label className="text-[9px] font-bold uppercase block mb-1.5" style={{ color:'#0891B2' }}>Date</label><input type="date" value={svDate} min={new Date().toISOString().split('T')[0]} onChange={e=>setSvDate(e.target.value)} className="w-full px-3 py-2.5 rounded-2xl text-sm font-bold outline-none" style={{ background:'#E0F2FE', border:'1px solid #BAE6FD', color:'#0369A1' }}/></div><div><label className="text-[9px] font-bold uppercase block mb-1.5" style={{ color:'#0891B2' }}>Time</label><input type="time" value={svTime} onChange={e=>setSvTime(e.target.value)} className="w-full px-3 py-2.5 rounded-2xl text-sm font-bold outline-none" style={{ background:'#E0F2FE', border:'1px solid #BAE6FD', color:'#0369A1' }}/></div></div>
              <div><p className="text-[9px] font-black uppercase tracking-[3px] mb-2" style={{ color:'#0891B2' }}>Quick Pick</p><QuickTimes value={svTime} onChange={setSvTime} color="#0891B2"/></div>
              <div><label className="text-[9px] font-bold uppercase block mb-1.5" style={{ color:'#0891B2' }}>Note</label><textarea rows={2} value={svNote} onChange={e=>setSvNote(e.target.value)} placeholder="Client available after 11 AM..." className="w-full rounded-2xl px-3 py-2.5 text-sm outline-none resize-none" style={{ background:'#E0F2FE', border:'1px solid #BAE6FD', color:'#0C4A6E' }} onFocus={e=>(e.target.style.borderColor='#7DD3FC')} onBlur={e=>(e.target.style.borderColor='#BAE6FD')}/></div>
              <div className="flex gap-3"><button onClick={() => setShowSiteVisitPopup(false)} className="flex-1 py-3 rounded-2xl text-sm font-bold" style={{ background:'#E0F2FE', color:'#0891B2', border:'1px solid #BAE6FD' }}>Cancel</button><button onClick={handleSaveSiteVisit} disabled={!svDate||!svTime||savingSV} className="flex-1 py-3 rounded-2xl text-sm font-black text-white disabled:opacity-40" style={{ background:'linear-gradient(135deg,#0369A1,#0891B2)', boxShadow:'0 6px 18px rgba(8,145,178,0.3)' }}>{savingSV?'⏳...':'🏠 Schedule'}</button></div>
            </div>
          </div>
        </div>
      )}

      {/* QUOTATION */}
      {showQuotationPopup && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4" style={{ animation:'fadeIn 0.2s ease' }}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowQuotationPopup(false)}/>
          <div className="relative w-full max-w-sm scale-in" style={{ background:'#FFF5F9', border:'1.5px solid #FBCFE8', borderRadius:28, boxShadow:'0 32px 80px rgba(219,39,119,0.15)', maxHeight:'90vh', overflowY:'auto' }}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom:'1px solid #FBCFE8' }}>
              <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg" style={{ background:'#FCE7F3' }}>💰</div><div><p className="text-sm font-black" style={{ color:'#831843' }}>{revisions.length > 0 ? `New Revision (v${revisions[0]?.version + 1})` : 'Send Quotation (v1)'}</p><p className="text-[10px]" style={{ color:'#DB2777' }}>{lead.lead_name}</p></div></div>
              <button onClick={() => setShowQuotationPopup(false)} className="w-8 h-8 rounded-full flex items-center justify-center hvr" style={{ background:'#FCE7F3', color:'#DB2777' }}>✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div><p className="text-[9px] font-black uppercase tracking-[3px] mb-2" style={{ color:'#DB2777' }}>Type</p><div className="grid grid-cols-2 gap-2">{([{v:'before_sitevisit',label:'📋 Before',sub:'Site Visit',bg:'#E0F2FE',color:'#0369A1',border:'#BAE6FD'},{v:'after_sitevisit',label:'🏠 After',sub:'Site Visit',bg:'#FEF3C7',color:'#92400E',border:'#FDE68A'}] as const).map(opt=>(<button key={opt.v} onClick={()=>setQtType(opt.v as 'before_sitevisit'|'after_sitevisit')} className="py-3 px-2 rounded-2xl text-xs font-bold text-center transition-all" style={{ background:qtType===opt.v?opt.bg:'#FCE7F3', color:qtType===opt.v?opt.color:'#DB2777', border:`2px solid ${qtType===opt.v?opt.border:'#FBCFE8'}` }}>{opt.label}<br/><span className="text-[9px] opacity-70">{opt.sub}</span></button>))}</div></div>
              {revisions.length > 0 && revisions[0]?.amount && (<div className="px-3 py-2 rounded-2xl flex items-center justify-between" style={{ background:'rgba(219,39,119,0.06)', border:'1px solid #FBCFE8' }}><p className="text-[9px] font-bold" style={{ color:'#DB2777' }}>Previous (v{revisions[0].version})</p><p className="text-sm font-black" style={{ color:'#9D174D' }}>₹ {Number(revisions[0].amount).toLocaleString('en-IN')}</p></div>)}
              <div><label className="text-[9px] font-bold uppercase block mb-1.5" style={{ color:'#DB2777' }}>Amount</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black" style={{ color:'#DB2777' }}>₹</span><input type="number" value={qtAmount} onChange={e=>setQtAmount(e.target.value)} placeholder="450000" className="w-full pl-7 pr-3 py-2.5 rounded-2xl text-sm font-bold outline-none" style={{ background:'#FCE7F3', border:'1px solid #FBCFE8', color:'#831843' }}/></div>{qtAmount && revisions[0]?.amount && (<p className="text-[10px] mt-1 font-bold" style={{ color: Number(qtAmount) < Number(revisions[0].amount) ? '#059669' : '#DC2626' }}>{Number(qtAmount) < Number(revisions[0].amount) ? '↓ Reduced' : '↑ Increased'} by ₹{Math.abs(Number(qtAmount)-Number(revisions[0].amount)).toLocaleString('en-IN')}</p>)}</div>
              <div className="grid grid-cols-2 gap-3"><div><label className="text-[9px] font-bold uppercase block mb-1.5" style={{ color:'#DB2777' }}>Date</label><input type="date" value={qtDate} min={new Date().toISOString().split('T')[0]} onChange={e=>setQtDate(e.target.value)} className="w-full px-3 py-2.5 rounded-2xl text-sm font-bold outline-none" style={{ background:'#FCE7F3', border:'1px solid #FBCFE8', color:'#831843' }}/></div><div><label className="text-[9px] font-bold uppercase block mb-1.5" style={{ color:'#DB2777' }}>Time</label><input type="time" value={qtTime} onChange={e=>setQtTime(e.target.value)} className="w-full px-3 py-2.5 rounded-2xl text-sm font-bold outline-none" style={{ background:'#FCE7F3', border:'1px solid #FBCFE8', color:'#831843' }}/></div></div>
              <div><p className="text-[9px] font-black uppercase tracking-[3px] mb-2" style={{ color:'#DB2777' }}>Quick Pick</p><QuickTimes value={qtTime} onChange={setQtTime} color="#DB2777"/></div>
              <div><label className="text-[9px] font-bold uppercase block mb-1.5" style={{ color:'#DB2777' }}>Note</label><textarea rows={2} value={qtNote} onChange={e=>setQtNote(e.target.value)} placeholder="E.g. Revised after negotiation..." className="w-full rounded-2xl px-3 py-2.5 text-sm outline-none resize-none" style={{ background:'#FCE7F3', border:'1px solid #FBCFE8', color:'#831843' }} onFocus={e=>(e.target.style.borderColor='#F9A8D4')} onBlur={e=>(e.target.style.borderColor='#FBCFE8')}/></div>
              <div><label className="text-[9px] font-bold uppercase block mb-1.5" style={{ color:'#DB2777' }}>PDF (optional)</label>
                {!qtPdfFile ? (
                  <div className="pdf-drop rounded-2xl border-2 border-dashed p-4 text-center cursor-pointer" style={{ borderColor:'#FBCFE8', background:'#FFF5F9' }} onClick={()=>pdfInputRef.current?.click()} onDragOver={e=>{e.preventDefault();(e.currentTarget as HTMLElement).style.borderColor='#F9A8D4'}} onDragLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor='#FBCFE8'}} onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f&&f.type==='application/pdf')setQtPdfFile(f)}}>
                    <Upload className="w-5 h-5 mx-auto mb-1.5" style={{ color:'#FBCFE8' }}/><p className="text-xs font-bold" style={{ color:'#DB2777' }}>Click or drag PDF</p>
                  </div>
                ) : (
                  <div className="rounded-2xl p-3 flex items-center gap-3" style={{ background:'#FCE7F3', border:'1px solid #FBCFE8' }}>
                    <FileText className="w-4 h-4 flex-shrink-0" style={{ color:'#DB2777' }}/>
                    <div className="flex-1 min-w-0"><p className="text-xs font-bold truncate" style={{ color:'#831843' }}>{qtPdfFile.name}</p>{qtPdfUploading&&<div className="mt-1 h-1 rounded-full overflow-hidden" style={{ background:'#FBCFE8' }}><div className="h-full rounded-full" style={{ width:`${qtPdfProgress}%`, background:'#DB2777' }}/></div>}</div>
                    <button onClick={()=>setQtPdfFile(null)} className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background:'#FFF5F9', color:'#DB2777' }}><X className="w-3 h-3"/></button>
                  </div>
                )}
                <input ref={pdfInputRef} type="file" accept="application/pdf" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)setQtPdfFile(f);e.target.value=''}}/>
              </div>
              <div className="flex gap-3"><button onClick={() => setShowQuotationPopup(false)} className="flex-1 py-3 rounded-2xl text-sm font-bold" style={{ background:'#FCE7F3', color:'#DB2777', border:'1px solid #FBCFE8' }}>Cancel</button><button onClick={handleSaveQuotation} disabled={!qtDate||!qtTime||savingQT||qtPdfUploading} className="flex-1 py-3 rounded-2xl text-sm font-black text-white disabled:opacity-40" style={{ background:'linear-gradient(135deg,#9D174D,#DB2777)', boxShadow:'0 6px 18px rgba(219,39,119,0.3)' }}>{qtPdfUploading?`⬆️ ${qtPdfProgress}%`:savingQT?'⏳...':revisions.length>0?`💰 Save v${revisions[0]?.version+1}`:'💰 Send v1'}</button></div>
            </div>
          </div>
        </div>
      )}

      {/* WON */}
      {showWonPopup && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4" style={{ animation:'fadeIn 0.2s ease' }}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowWonPopup(false)}/>
          <div className="relative w-full max-w-sm scale-in" style={{ background:'linear-gradient(160deg,#ECFDF5,#F0FDF4)', border:'2px solid #6EE7B7', borderRadius:28, boxShadow:'0 32px 80px rgba(5,150,105,0.2)' }}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom:'1px solid #A7F3D0' }}>
              <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl" style={{ background:'linear-gradient(135deg,#059669,#047857)', boxShadow:'0 4px 14px rgba(5,150,105,0.4)' }}>🏆</div><div><p className="text-sm font-black" style={{ color:'#064E3B' }}>Mark as Won</p><p className="text-[10px]" style={{ color:'#059669' }}>{lead.lead_name}</p></div></div>
              <button onClick={() => setShowWonPopup(false)} className="w-8 h-8 rounded-full flex items-center justify-center hvr" style={{ background:'#A7F3D0', color:'#059669' }}>✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="rounded-2xl py-3.5 text-center" style={{ background:'linear-gradient(135deg,#059669,#047857)', boxShadow:'0 4px 16px rgba(5,150,105,0.35)' }}><p className="text-white font-black">🎉 Congratulations! 🎉</p><p className="text-green-200 text-xs mt-0.5">Deal Closed Successfully</p></div>
              <div><label className="text-[9px] font-bold uppercase block mb-1.5" style={{ color:'#059669' }}>Final Amount</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 font-black" style={{ color:'#059669' }}>₹</span><input type="number" value={wonAmount} onChange={e=>setWonAmount(e.target.value)} placeholder={String(lead.quotation_amount||'Enter amount')} className="w-full pl-7 pr-3 py-3 rounded-2xl text-base font-black outline-none" style={{ background:'#D1FAE5', border:'2px solid #6EE7B7', color:'#064E3B' }}/></div></div>
              <div><label className="text-[9px] font-bold uppercase block mb-1.5" style={{ color:'#059669' }}>Closing Note</label><textarea rows={3} value={wonNote} onChange={e=>setWonNote(e.target.value)} placeholder="E.g. Client happy, signed agreement..." className="w-full rounded-2xl px-3 py-2.5 text-sm outline-none resize-none" style={{ background:'#D1FAE5', border:'1px solid #A7F3D0', color:'#064E3B' }}/></div>
              {wonAmount && (<div className="px-4 py-3 rounded-2xl" style={{ background:'#D1FAE5', border:'1px solid #6EE7B7' }}><p className="text-[9px] font-black uppercase tracking-[3px] mb-1" style={{ color:'#059669' }}>Deal Summary</p><p className="text-lg font-black" style={{ color:'#064E3B' }}>₹ {Number(wonAmount).toLocaleString('en-IN')}</p>{lead.quotation_amount&&<p className="text-[10px]" style={{ color:'#059669' }}>Quoted: ₹{Number(lead.quotation_amount).toLocaleString('en-IN')}</p>}</div>)}
              <div className="flex gap-3"><button onClick={() => setShowWonPopup(false)} className="flex-1 py-3 rounded-2xl text-sm font-bold" style={{ background:'#D1FAE5', color:'#059669', border:'1px solid #A7F3D0' }}>Cancel</button><button onClick={handleSaveWon} disabled={savingWon} className="flex-1 py-3 rounded-2xl text-sm font-black text-white disabled:opacity-40" style={{ background:'linear-gradient(135deg,#047857,#059669)', boxShadow:'0 6px 18px rgba(5,150,105,0.35)' }}>{savingWon?'⏳...':'🏆 Mark as Won!'}</button></div>
            </div>
          </div>
        </div>
      )}

      {/* LOG ACTIVITY */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4" style={{ animation:'fadeIn 0.2s ease' }}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)}/>
          <div className="relative w-full max-w-md scale-in" style={{ background:'#FFFDF8', border:'1.5px solid rgba(184,134,11,0.2)', borderRadius:28, boxShadow:'0 32px 80px rgba(0,0,0,0.12)' }}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom:'1px solid rgba(184,134,11,0.1)' }}>
              <p className="font-black text-sm" style={{ color:'#1C1712' }}>Log Activity</p>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full flex items-center justify-center hvr" style={{ background:'#F5F0E8', color:'#6B5E4E' }}>✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-4 gap-2">
                {([{id:'call',label:'📞 Call',color:'#7C3AED'},{id:'note',label:'📝 Note',color:'#64748B'},{id:'sitevisit',label:'🏠 Visit',color:'#0891B2'},{id:'quotation',label:'💰 Quote',color:'#DB2777'}] as const).map(t=>(
                  <button key={t.id} onClick={()=>setNoteType(t.id)}
                    className="py-2.5 px-1 rounded-2xl text-[10px] font-bold text-center transition-all hover:scale-105"
                    style={{ background:noteType===t.id?`${t.color}15`:'#F5F0E8', color:noteType===t.id?t.color:'#6B5E4E', border:`1.5px solid ${noteType===t.id?t.color+'50':'transparent'}` }}>
                    {t.label}
                  </button>
                ))}
              </div>
              <textarea rows={4} value={noteText} onChange={e=>setNoteText(e.target.value)} placeholder={noteType==='call'?'Call summary...':noteType==='quotation'?'Quotation details...':noteType==='sitevisit'?'Site visit notes...':'Add a note...'} autoFocus
                className="w-full rounded-2xl px-4 py-3 text-sm outline-none resize-none"
                style={{ background:'#F5F0E8', border:'1px solid rgba(184,134,11,0.2)', color:'#1C1712' }}
                onFocus={e=>(e.target.style.borderColor='#FDE68A')} onBlur={e=>(e.target.style.borderColor='rgba(184,134,11,0.2)')}/>
              <div className="flex gap-3">
                <button onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-2xl text-sm font-bold" style={{ background:'#F5F0E8', color:'#6B5E4E' }}>Cancel</button>
                <button onClick={handleSaveNote} disabled={!noteText.trim()||savingNote}
                  className="flex-1 py-3 rounded-2xl text-sm font-black text-white disabled:opacity-40"
                  style={{ background:'linear-gradient(135deg,#B8860B,#D97706)', boxShadow:noteText.trim()?'0 6px 18px rgba(184,134,11,0.3)':'none' }}>
                  {savingNote?'⏳...':'+ Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}