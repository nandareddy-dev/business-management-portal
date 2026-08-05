'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, RefreshCw, Users, X, Phone, ArrowRight } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

const ini = (n: string) => n?.split(' ').map((x: string) => x[0]).join('').slice(0, 2).toUpperCase() || '?'

interface Call { id: string; lead_id: string; description?: string | null; created_at: string; user_id?: string | null; user_name?: string | null }
interface CRE  { id: string; name: string }
interface SD   { count: number; calls: number }
interface PerfData {
  name: string; totalLeads: number
  freshTotal: number; freshCalls: number
  followupTotal: number; followupCalls: number; followupFuDone: number
  verified: number; uncalledFresh: number; noFollowup: number; pending: number
  freshStages: Record<string, SD>; followupStages: Record<string, SD>
  freshOutcomes: Record<string, number>; followupOutcomes: Record<string, number>
  fuCompletionMap: Record<string, number>
  freshVisitDone: number; freshVisitsCreated: number; freshQuotations: number
  followupVisitDone: number; followupVisitsCreated: number; followupQuotations: number
}

const STAGE_PAIRS: (string | null)[][] = [
  ['rnr', 'not_interested'],
  ['going_followup', 'visit_scheduled'],
  ['visit_completed', 'quotation'],
  ['closing', 'won'],
  ['lost', null],
]

const SLABEL: Record<string, string> = {
  rnr: 'RNR', not_interested: 'NOT INTERESTED', going_followup: 'GOING FOLLOWUP',
  visit_scheduled: 'VISIT SCHEDULED', visit_completed: 'VISIT COMPLETED',
  quotation: 'QUOTATION', closing: 'CLOSING', won: 'WON', lost: 'LOST'
}

// Map stage key → pipeline_stage
const STAGE_TO_PIPELINE: Record<string, { stage: string }> = {
  rnr:             { stage: 'rnr' },
  not_interested:  { stage: 'lost' },
  going_followup:  { stage: 'followup' },
  visit_scheduled: { stage: 'sitevisit' },
  visit_completed: { stage: 'sitevisit' },
  quotation:       { stage: 'quotation' },
  closing:         { stage: 'won' },
  won:             { stage: 'won' },
  lost:            { stage: 'lost' },
}

const AVATAR_COLORS = [
  ['#7C3AED','#4F46E5'],['#0891B2','#0E7490'],['#059669','#047857'],
  ['#D97706','#B45309'],['#DB2777','#BE185D'],['#DC2626','#B91C1C'],
]
function getColors(name: string) {
  return AVATAR_COLORS[name?.charCodeAt(0) % AVATAR_COLORS.length] ?? AVATAR_COLORS[0]
}

interface ModalLead {
  id: string
  lead_name: string
  phone?: string
  city?: string
  budget?: string | number
}

// ── Leads Modal ──
function LeadsModal({
  title, color, leads, loading, onClose
}: {
  title: string; color: string; leads: ModalLead[]; loading: boolean; onClose: () => void
}) {
  const router = useRouter()
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
      style={{ animation:'fadeIn 0.2s ease' }}>
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative w-full max-w-md rounded-3xl overflow-hidden"
        style={{ background:'#fff', border:`1.5px solid ${color}30`, boxShadow:'0 32px 80px rgba(0,0,0,0.15)', maxHeight:'85vh', display:'flex', flexDirection:'column' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom:`1px solid ${color}20`, background:`${color}08` }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black text-white"
              style={{ background:color }}>
              {leads.length}
            </div>
            <p className="text-sm font-black" style={{ color:'#1C1712' }}>{title}</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background:'#F5F0E8', color:'#6B5E4E' }}>
            <X size={14}/>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <div className="w-7 h-7 rounded-full border-2 border-slate-200 border-t-slate-500 animate-spin"/>
              <p className="text-xs" style={{ color:'#94A3B8' }}>Loading leads...</p>
            </div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16">
              <div className="text-3xl">🔍</div>
              <p className="text-sm font-bold" style={{ color:'#C4BAB0' }}>No leads found</p>
            </div>
          ) : (
            <div>
              {leads.map((lead: ModalLead, i: number) => {
                const [c1, c2] = getColors(lead.lead_name || '?')
                return (
                  <div key={lead.id}
                    className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors"
                    style={{ borderBottom: i < leads.length - 1 ? '1px solid #F5F0E8' : 'none' }}
                    onClick={() => { onClose(); router.push(`/dashboard/industries/interior-design/leads/${lead.id}`) }}>
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                      style={{ background:`linear-gradient(135deg,${c1},${c2})` }}>
                      {ini(lead.lead_name || '?')}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color:'#1C1712' }}>{lead.lead_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] font-mono" style={{ color:'#9A8F82' }}>{lead.phone}</p>
                        {lead.city && <p className="text-[10px]" style={{ color:'#C4BAB0' }}>📍 {lead.city}</p>}
                        {lead.budget && <p className="text-[10px]" style={{ color:'#B8860B' }}>💰 {lead.budget}</p>}
                      </div>
                    </div>
                    {/* Call + Arrow */}
                    <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <a href={`tel:${lead.phone}`}
                        className="w-8 h-8 rounded-xl flex items-center justify-center"
                        style={{ background:'#ECFDF5', border:'1px solid #A7F3D0' }}>
                        <Phone size={13} style={{ color:'#059669' }}/>
                      </a>
                      <ArrowRight size={13} style={{ color:'#C4BAB0' }}/>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {leads.length > 0 && !loading && (
          <div className="px-4 py-2.5 flex-shrink-0 text-center"
            style={{ borderTop:'1px solid #F5F0E8', background:'#FAFAF8' }}>
            <p className="text-[10px]" style={{ color:'#C4BAB0' }}>{leads.length} leads · tap to open</p>
          </div>
        )}
      </div>
    </div>
  )
}

function StageGrid({
  data, color, onCellClick,
}: {
  data: Record<string, SD>; color: string;
  onCellClick?: (stageKey: string) => void
}) {
  return (
    <div className="rounded-xl overflow-hidden mb-3" style={{ border: `1px solid ${color}25` }}>
      {STAGE_PAIRS.map((pair, pi) => (
        <div key={pi} className="grid grid-cols-2"
          style={{ borderBottom: pi < STAGE_PAIRS.length - 1 ? `1px solid ${color}15` : 'none' }}>
          {pair.map((key, ki) => {
            if (!key) return <div key={ki} style={{ borderLeft: ki === 1 ? `1px solid ${color}15` : 'none' }} />
            const d = data[key] || { count: 0, calls: 0 }
            const clickable = d.count > 0 && !!onCellClick
            return (
              <div key={key}
                onClick={() => clickable && onCellClick!(key)}
                className="px-3 py-2.5 transition-colors"
                style={{
                  borderLeft: ki === 1 ? `1px solid ${color}15` : 'none',
                  cursor: clickable ? 'pointer' : 'default',
                  background: 'transparent',
                }}
                onMouseEnter={e => { if (clickable) (e.currentTarget as HTMLElement).style.background = `${color}08` }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                <div className="flex items-start justify-between gap-1">
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-semibold tracking-wide leading-tight"
                      style={{ color: d.count > 0 ? color : '#C4C4C4' }}>{SLABEL[key]}</p>
                    {d.calls > 0 && <p className="text-[8px] mt-0.5" style={{ color: '#B0B0B0' }}>{d.calls} calls</p>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-lg font-bold"
                      style={{ color: d.count > 0 ? color : '#DEDEDE', lineHeight: 1.1 }}>{d.count}</span>
                    {clickable && (
                      <span className="text-[10px] opacity-50" style={{ color }}>›</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function SectionHeader({
  emoji, label, count, sub, accentColor, bgColor, borderColor, textColor,
}: {
  emoji: string; label: string; count: number; sub: string
  accentColor: string; bgColor: string; borderColor: string; textColor: string
}) {
  return (
    <div className="px-3 py-2.5 flex items-center justify-between"
      style={{ background: bgColor, borderBottom: `1px solid ${borderColor}`, borderLeft: `3px solid ${accentColor}` }}>
      <div className="flex items-center gap-1.5">
        <span className="text-sm">{emoji}</span>
        <p className="text-[11px] font-semibold" style={{ color: textColor }}>{label}</p>
      </div>
      <div className="text-right">
        <p className="text-xl font-bold leading-none" style={{ color: accentColor }}>{count}</p>
        <p className="text-[9px] mt-0.5" style={{ color: accentColor, opacity: 0.6 }}>{sub}</p>
      </div>
    </div>
  )
}

function ExecGrid({ items }: { items: [string, number][] }) {
  return (
    <div className="py-2.5 pb-3" style={{ borderTop: '1px solid #F1F5F9' }}>
      <p className="text-[8px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#94A3B8' }}>Execution</p>
      <div className="grid grid-cols-3 gap-1.5">
        {items.map(([label, val]) => (
          <div key={label} className="rounded-xl p-2 text-center" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <p className="text-[8px] mb-0.5 leading-tight" style={{ color: '#94A3B8' }}>{label}</p>
            <p className="text-base font-bold" style={{ color: '#0F172A' }}>{val}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function OutcomePills({ outcomes, bg, border, color }: {
  outcomes: Record<string, number>; bg: string; border: string; color: string
}) {
  if (!Object.keys(outcomes).length) return null
  return (
    <div className="py-2" style={{ borderTop: '1px solid #F1F5F9' }}>
      <p className="text-[9px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#64748B' }}>Call outcomes</p>
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(outcomes).map(([o, c]) => (
          <span key={o} className="px-2.5 py-1 rounded-full text-[9px] font-semibold"
            style={{ background: bg, border: `1px solid ${border}`, color }}>{o} {c}</span>
        ))}
      </div>
    </div>
  )
}

function PerfHeader({
  name, perf, perfLoading, onClose, onRefresh, onViewHistory, showClose,
}: {
  name: string; perf: PerfData | null; perfLoading: boolean
  onClose: () => void; onRefresh: () => void; onViewHistory: () => void; showClose: boolean
}) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #E2E8F0', background: '#fff' }}>
      <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid #F1F5F9' }}>
        {showClose && (
          <button onClick={onClose} className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs"
            style={{ border: '1px solid #E2E8F0', color: '#94A3B8', background: 'transparent', cursor: 'pointer' }}>✕</button>
        )}
        <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white"
          style={{ background: '#1C1712' }}>{ini(name)}</div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold truncate" style={{ color: '#0F172A' }}>{name}</p>
          <p className="text-[10px] mt-0.5" style={{ color: '#94A3B8' }}>
            {perf ? `${perf.freshCalls + perf.followupCalls} calls · Uncalled: ${perf.uncalledFresh}` : perfLoading ? 'Loading...' : '—'}
          </p>
        </div>
        <button onClick={onViewHistory}
          className="flex-shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 whitespace-nowrap"
          style={{ border: '1px solid #DDD6FE', background: '#F5F3FF', color: '#6D28D9', cursor: 'pointer' }}>
          Full History →
        </button>
        <button onClick={onRefresh} className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ border: '1px solid #E2E8F0', background: 'transparent', cursor: 'pointer' }}>
          <RefreshCw size={11} style={{ color: '#94A3B8' }} className={perfLoading ? 'animate-spin' : ''} />
        </button>
      </div>
      <div className="px-4 py-3 flex flex-wrap gap-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-full" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
          <span className="text-base font-bold leading-none" style={{ color: '#16A34A' }}>{perfLoading ? '—' : (perf?.freshTotal ?? '—')}</span>
          <span className="text-[10px]" style={{ color: '#15803D' }}>Fresh</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-full" style={{ background: '#F5F3FF', border: '1px solid #DDD6FE' }}>
          <span className="text-base font-bold leading-none" style={{ color: '#7C3AED' }}>{perfLoading ? '—' : (perf?.followupTotal ?? '—')}</span>
          <span className="text-[10px]" style={{ color: '#6D28D9' }}>Follow-up</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-full" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
          <span className="text-base font-bold leading-none" style={{ color: '#0F172A' }}>{perfLoading ? '—' : (perf?.verified ?? '—')}</span>
          <span className="text-[10px]" style={{ color: '#64748B' }}>Verified</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-full" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
          <span className="text-base font-bold leading-none" style={{ color: '#0F172A' }}>{perfLoading ? '—' : (perf?.totalLeads ?? '—')}</span>
          <span className="text-[10px]" style={{ color: '#64748B' }}>Worked</span>
        </div>
        {(perf?.noFollowup ?? 0) > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-full" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
            <span className="text-[11px]" style={{ color: '#D97706' }}>⚠</span>
            <span className="text-base font-bold leading-none" style={{ color: '#D97706' }}>{perf!.noFollowup}</span>
            <span className="text-[10px]" style={{ color: '#B45309' }}>no-fu</span>
          </div>
        )}
      </div>
    </div>
  )
}

export function TodayCallsSection({
  todayCalls, cres, istDateStr, companyId, isAdminOrOwner, currentUserId,
}: {
  todayCalls: Call[]; cres: CRE[]
  istDateStr: string; companyId: string
  isAdminOrOwner: boolean; currentUserId: string
}) {
  const router = useRouter()
  const [selectedCRE, setSelectedCRE] = useState(isAdminOrOwner ? 'all' : currentUserId)
  const [open, setOpen]               = useState(false)
  const [perf, setPerf]               = useState<PerfData | null>(null)
  const [perfLoading, setPerfLoading] = useState(false)
  const [expandedCRE, setExpandedCRE] = useState<string | null>(isAdminOrOwner ? null : currentUserId)

  // Modal state
  const [modalOpen, setModalOpen]     = useState(false)
  const [modalTitle, setModalTitle]   = useState('')
  const [modalColor, setModalColor]   = useState('#7C3AED')
  const [modalLeads, setModalLeads]   = useState<ModalLead[]>([])
  const [modalLoading, setModalLoading] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const selectedName = isAdminOrOwner
    ? (selectedCRE === 'all' ? 'Total CRE' : cres.find(c => c.id === selectedCRE)?.name || 'Total CRE')
    : (cres.find(c => c.id === currentUserId)?.name || 'Me')
  const totalCount = todayCalls.length

  // Declared before the mount-effect below that calls it, so there's no
  // temporal-dead-zone / declared-before-use concern for the linter.
  const loadPerf = async (creId: string, creName: string) => {
    setPerfLoading(true)
    try {
      const res = await fetch(`/api/cre-performance?creId=${creId}&istDate=${istDateStr}&companyId=${companyId}`)
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      setPerf({ name: creName, ...data })
    } catch (e) { console.error('[Perf]', e) }
    finally { setPerfLoading(false) }
  }

  // Non-admins have no dropdown to click (they only ever see themselves) — load their own
  // performance automatically on mount instead of requiring an interaction.
  useEffect(() => {
    if (!isAdminOrOwner) {
      loadPerf(currentUserId, selectedName)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminOrOwner, currentUserId])

  const handleStageClick = async (stageKey: string, accentColor: string) => {
    if (!expandedCRE) return
    const mapping = STAGE_TO_PIPELINE[stageKey]
    if (!mapping) return

    const label = SLABEL[stageKey] || stageKey
    setModalTitle(`${label}`)
    setModalColor(accentColor)
    setModalLeads([])
    setModalLoading(true)
    setModalOpen(true)

    try {
      // ✅ TODAY's calls only — with IST date filter
      const todayStart = new Date(`${istDateStr}T00:00:00+05:30`).toISOString()
      const todayEnd   = new Date(`${istDateStr}T23:59:59+05:30`).toISOString()

      const { data: todayActs } = await supabase
        .from('lead_activities')
        .select('lead_id')
        .eq('user_id', expandedCRE)
        .eq('type', 'call')
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd)

      const calledLeadIds = [...new Set((todayActs ?? []).map((a: { lead_id: string }) => a.lead_id))]

      if (calledLeadIds.length === 0) {
        setModalLeads([])
        setModalLoading(false)
        return
      }

      const query = supabase
        .from('leads')
        .select('id, lead_name, phone, city, budget, pipeline_stage, sitevisit_status, created_at')
        .eq('company_id', companyId)
        .eq('pipeline_stage', mapping.stage)
        .in('id', calledLeadIds)  // ✅ only today's called leads
        .order('created_at', { ascending: false })

      const { data: leads } = await query
      setModalLeads(leads ?? [])
    } catch (e) {
      console.error('[StageClick]', e)
      setModalLeads([])
    }
    setModalLoading(false)
  }

  const selectCRE = (id: string) => {
    setOpen(false)
    setSelectedCRE(id)
    if (id === 'all') { setPerf(null); setExpandedCRE(null); return }
    const name = cres.find(c => c.id === id)?.name || ''
    setExpandedCRE(id)
    loadPerf(id, name)
  }

  const handleClose   = () => {
    if (isAdminOrOwner) { setExpandedCRE(null); setSelectedCRE('all'); setPerf(null) }
    // non-admins always stay on their own view — nothing to close back to
  }
  const handleRefresh = () => { if (perf && expandedCRE) loadPerf(expandedCRE, perf.name) }
  const handleViewHistory = () => {
    if (!expandedCRE) return
    router.push(`/dashboard/industries/interior-design/cre?cre_id=${expandedCRE}`)
  }

  return (
    <div className="space-y-3">

      {/* ── Leads Modal ── */}
      {modalOpen && (
        <LeadsModal
          title={modalTitle}
          color={modalColor}
          leads={modalLeads}
          loading={modalLoading}
          onClose={() => setModalOpen(false)}
        />
      )}

      {/* ── 1. TEAM SELECTOR — admins/owners only. Non-admins have nothing to select, since
             they can only ever see their own performance. ── */}
      <div className="rounded-2xl" style={{ background: '#fff', border: '1px solid #E8E2D8' }}>
        <div className="px-4 py-3 flex items-center justify-between">
          <p className="text-xs font-semibold" style={{ color: '#1C1712' }}>
            {isAdminOrOwner ? 'Team performance' : 'My performance'}
          </p>
          {isAdminOrOwner ? (
          <div style={{ position: 'relative' }}>
            <button type="button" onClick={() => setOpen(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 14px', borderRadius: 12, background: '#1C1712',
                border: '1px solid rgba(184,134,11,0.3)', color: '#fff',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', position: 'relative', zIndex: 10,
              }}>
              <Users size={13} color="#fff" />
              <span style={{ maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedName}</span>
              <ChevronDown size={12} color="#fff" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>

            {open && (
              <>
                <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 998 }} />
                <div style={{
                  position: 'absolute', right: 0, top: '100%', marginTop: 6,
                  background: '#fff', border: '1px solid #E8E2D8', borderRadius: 16,
                  overflow: 'hidden', minWidth: 180, boxShadow: '0 12px 32px rgba(0,0,0,0.12)', zIndex: 999,
                }}>
                  <button type="button" onClick={() => selectCRE('all')}
                    style={{
                      width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: selectedCRE === 'all' ? '#FFFBEB' : 'transparent', borderBottom: '1px solid #F0EBE0',
                      color: selectedCRE === 'all' ? '#B8860B' : '#1C1712', fontSize: 12, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
                    }}>
                    <span>Total CRE</span>
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: '#FEF3C7', color: '#B8860B' }}>{totalCount}</span>
                  </button>
                  {cres.map((cre, i) => {
                    const cnt = todayCalls.filter(c => c.user_id === cre.id).length
                    return (
                      <div key={cre.id} style={{
                        display: 'flex', alignItems: 'center',
                        borderBottom: i < cres.length - 1 ? '1px solid #F0EBE0' : 'none',
                        background: selectedCRE === cre.id ? '#FFFBEB' : 'transparent',
                      }}>
                        <button type="button" onClick={() => selectCRE(cre.id)}
                          style={{
                            flex: 1, padding: '10px 8px 10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            background: 'transparent', border: 'none',
                            color: selectedCRE === cre.id ? '#B8860B' : '#1C1712', fontSize: 12, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
                          }}>
                          <span style={{ maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cre.name}</span>
                          <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 20, marginLeft: 8, background: cnt > 0 ? '#FEF3C7' : '#F5F0E8', color: cnt > 0 ? '#B8860B' : '#9A8F82' }}>{cnt}</span>
                        </button>
                        <button type="button"
                          title="View full history"
                          onClick={() => { setOpen(false); router.push(`/dashboard/industries/interior-design/cre?cre_id=${cre.id}`) }}
                          style={{
                            flexShrink: 0, width: 26, height: 26, marginRight: 8, borderRadius: 8,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'transparent', border: 'none', color: '#B0A798', cursor: 'pointer', fontSize: 13,
                          }}>›</button>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
          ) : (
            <span className="px-3 py-1.5 rounded-xl text-xs font-bold" style={{ background: '#F5F0E8', color: '#6B5E4E' }}>
              {selectedName}
            </span>
          )}
        </div>
      </div>

      {/* ── 2. PERFORMANCE PANEL ── */}
      {expandedCRE && (
        <div className="space-y-3">
          <PerfHeader
            name={selectedName} perf={perf} perfLoading={perfLoading}
            onClose={handleClose} onRefresh={handleRefresh} onViewHistory={handleViewHistory}
            showClose={isAdminOrOwner}
          />

          {perfLoading ? (
            <div className="rounded-2xl py-12 flex flex-col items-center gap-2"
              style={{ border: '1px solid #E2E8F0', background: '#fff' }}>
              <div className="w-7 h-7 rounded-full border-2 border-slate-200 border-t-slate-500 animate-spin" />
              <p className="text-xs" style={{ color: '#94A3B8' }}>Loading performance data...</p>
            </div>
          ) : perf ? (
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #E2E8F0', background: '#fff' }}>

              {/* Summary bar */}
              <div className="px-3 py-2 flex items-center justify-center gap-2 text-[11px] flex-wrap"
                style={{ background: '#F8FAFC', borderBottom: '1px solid #F1F5F9', color: '#64748B' }}>
                <span className="px-2 py-0.5 rounded-full font-semibold" style={{ background: '#DCFCE7', color: '#15803D' }}>Fresh {perf.freshTotal}</span>
                <span>+</span>
                <span className="px-2 py-0.5 rounded-full font-semibold" style={{ background: '#EDE9FE', color: '#6D28D9' }}>FU {perf.followupTotal}</span>
                <span>=</span>
                <span className="font-semibold" style={{ color: '#0F172A' }}>{perf.totalLeads} total</span>
                <span style={{ color: '#CBD5E1' }}>·</span>
                <span>{perf.freshCalls + perf.followupCalls} calls · {perf.followupFuDone} fu</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">

                {/* FRESH */}
                <div>
                  <SectionHeader
                    emoji="🆕" label="Fresh leads" count={perf.freshTotal} sub={`${perf.freshCalls} calls`}
                    accentColor="#16A34A" bgColor="#F0FDF4" borderColor="#DCFCE7" textColor="#14532D"
                  />
                  <div className="px-3 pt-2">
                    <StageGrid
                      data={perf.freshStages}
                      color="#DC2626"
                      onCellClick={(key) => handleStageClick(key, '#DC2626')}
                    />
                    <OutcomePills outcomes={perf.freshOutcomes} bg="#F0FDF4" border="#BBF7D0" color="#14532D" />
                    <ExecGrid items={[['Visit done', perf.freshVisitDone], ['Visits created', perf.freshVisitsCreated], ['Quotations sent', perf.freshQuotations]]} />
                  </div>
                </div>

                {/* FOLLOWUP */}
                <div>
                  <SectionHeader
                    emoji="🔄" label="Follow-up leads" count={perf.followupTotal} sub={`${perf.followupFuDone} fu · ${perf.followupCalls} calls`}
                    accentColor="#7C3AED" bgColor="#F5F3FF" borderColor="#EDE9FE" textColor="#4C1D95"
                  />
                  <div className="px-3 pt-2">
                    <StageGrid
                      data={perf.followupStages}
                      color="#7C3AED"
                      onCellClick={(key) => handleStageClick(key, '#7C3AED')}
                    />
                    <OutcomePills outcomes={perf.followupOutcomes} bg="#F5F3FF" border="#DDD6FE" color="#4C1D95" />

                    {Object.keys(perf.fuCompletionMap).length > 0 && (
                      <div className="py-2" style={{ borderTop: '1px solid #F1F5F9' }}>
                        <p className="text-[9px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#64748B' }}>Follow-up completions</p>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(perf.fuCompletionMap).map(([o, c]) => (
                            <span key={o} className="px-2.5 py-1 rounded-full text-[9px] font-semibold"
                              style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E3A8A' }}>{o} {c}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    <ExecGrid items={[['Visit done', perf.followupVisitDone], ['Visits created', perf.followupVisitsCreated], ['Quotations sent', perf.followupQuotations]]} />

                    {perf.pending > 0 && (
                      <div className="mb-3 p-3 rounded-xl flex items-center justify-between"
                        style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                        <div className="flex-1 min-w-0 pr-3">
                          <p className="text-[11px] font-semibold" style={{ color: '#92400E' }}>⏰ Pending follow-ups</p>
                          <p className="text-[9px] mt-0.5" style={{ color: '#B45309' }}>Scheduled but not yet completed</p>
                        </div>
                        <p className="text-2xl font-bold flex-shrink-0" style={{ color: '#D97706' }}>{perf.pending}</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}