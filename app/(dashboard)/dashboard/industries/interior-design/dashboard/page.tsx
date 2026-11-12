import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  UserPlus, Phone, Calendar, MapPin, FileText, Trophy, XCircle, Lock,
  Users, Zap, TrendingUp, ArrowUpRight, ArrowDownRight, BarChart3, ClipboardList,
} from 'lucide-react'
import { TodayCallsSection } from '@/components/interior/today-calls-section'
import { fetchAllLeads } from '@/lib/fetch-all-leads'
import { subscriptionService } from '@/modules/subscription/service'

export const dynamic = 'force-dynamic'

interface Lead {
  id: string
  pipeline_stage?: string | null
  budget?: string | number | null
  created_at: string
  lead_name?: string | null
  phone?: string | null
  notes?: string | null
  source?: string | null
  city?: string | null
  [key: string]: unknown
}

interface Activity {
  id: string
  lead_id: string
  title?: string | null
  description?: string | null
  created_at: string
  user_id?: string | null
  user_name?: string | null
  [key: string]: unknown
}

interface ProfileRow {
  id: string
  full_name?: string | null
  email?: string | null
  role?: string | null
}

interface Cre {
  id: string
  name: string
}

// ─────────────────────────────────────────────────────────────
// Brand tokens — same cream / ink / gold palette as All Leads,
// so the dashboard no longer looks like a different product.
// ─────────────────────────────────────────────────────────────
const INK    = '#1C1712'
const GOLD   = '#B8860B'
const CREAM  = '#F5F0E8'
const MUTED  = '#9A8F82'
const BORDER = '#EDE7DB'
const CARD_SHADOW = '0 1px 2px rgba(28,23,18,0.04), 0 10px 24px rgba(28,23,18,0.05)'

const STAGES = [
  { key: 'new',       label: 'New Leads',  icon: UserPlus, color: '#7C3AED', bg: '#F5F3FF', href: '/dashboard/industries/interior-design/new-leads',  description: 'Fresh enquiries' },
  { key: 'followup',  label: 'Follow Up',  icon: Calendar, color: '#D97706', bg: '#FFF7ED', href: '/dashboard/industries/interior-design/follow-up',   description: 'Date confirmed' },
  { key: 'rnr',       label: 'RNR',        icon: Phone,    color: '#DC2626', bg: '#FEF2F2', href: '/dashboard/industries/interior-design/rnr',          description: 'Ring No Response' },
  { key: 'sitevisit', label: 'Site Visit', icon: MapPin,   color: '#0891B2', bg: '#ECFEFF', href: '/dashboard/industries/interior-design/site-visit',   description: 'Visit scheduled' },
  { key: 'quotation', label: 'Quotations', icon: FileText, color: '#DB2777', bg: '#FDF2F8', href: '/dashboard/industries/interior-design/quotations',   description: 'Quotation sent' },
  { key: 'won',       label: 'Won',        icon: Trophy,   color: '#059669', bg: '#ECFDF5', href: '/dashboard/industries/interior-design/won',          description: 'Deal closed 🎉' },
  { key: 'lost',      label: 'Lost',       icon: XCircle,  color: '#EF4444', bg: '#FEF2F2', href: '/dashboard/industries/interior-design/lost',         description: 'Not interested' },
]

// Other pages use both spellings ('follow-up' / 'followup', etc.). Normalise here so
// a lead saved with the hyphenated spelling is not silently dropped from the counts.
const STAGE_ALIAS: Record<string, string> = {
  'new-leads': 'new',
  'follow-up': 'followup',
  'site-visit': 'sitevisit',
  'quotations': 'quotation',
}

const DONUT_COLORS = ['#B8860B', '#7C3AED', '#059669', '#DB2777', '#0891B2']
const OTHER_COLOR = '#DDD5C4'

interface DonutItem { name: string; count: number; color: string }

function topNWithOther(map: Record<string, number>, n: number): DonutItem[] {
  const sorted = Object.entries(map).sort((a, b) => b[1] - a[1])
  const top = sorted.slice(0, n).map(([name, count], i) => ({ name, count, color: DONUT_COLORS[i % DONUT_COLORS.length] }))
  const otherCount = sorted.slice(n).reduce((s, [, c]) => s + c, 0)
  if (otherCount > 0) top.push({ name: 'Other', count: otherCount, color: OTHER_COLOR })
  return top
}

// ─────────────────────────────────────────────────────────────
// IST helpers. The server runs in UTC, so `toDateString()` on a lead's
// created_at put leads from 12:00 AM – 5:30 AM IST into the wrong day.
// Everything date-based now uses the IST calendar day, matching the calls query.
// ─────────────────────────────────────────────────────────────
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

function istDay(iso: string): string {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  return new Date(t + IST_OFFSET_MS).toISOString().slice(0, 10)
}

// SVG donut ring with gaps between segments. Server-rendered, no client JS.
function DonutCard({ title, subtitle, icon, items, href }: { title: string; subtitle: string; icon: string; items: DonutItem[]; href?: string }) {
  const total = items.reduce((s, i) => s + i.count, 0)
  const R = 38
  const C = 2 * Math.PI * R
  let offset = 0

  const content = (
    <div className="card-hover rounded-xl md:rounded-2xl p-2.5 md:p-3.5 h-full" style={{ background: '#fff', border: `1px solid ${BORDER}`, boxShadow: CARD_SHADOW }}>
      <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-2.5">
        <div className="w-6 h-6 md:w-7 md:h-7 rounded-lg flex items-center justify-center text-xs md:text-sm flex-shrink-0" style={{ background: '#FBF7EE', border: `1px solid ${BORDER}` }}>{icon}</div>
        <div className="min-w-0">
          <p className="text-[10px] md:text-xs font-bold truncate" style={{ color: INK }}>{title}</p>
          <p className="hidden md:block text-[9px]" style={{ color: MUTED }}>{subtitle}</p>
        </div>
      </div>

      {total === 0 ? (
        <p className="text-[10px] md:text-xs" style={{ color: '#C4BAB0' }}>No data yet</p>
      ) : (
        <div className="flex flex-col md:flex-row items-center gap-2 md:gap-3">
          <div className="relative flex-shrink-0 w-14 h-14 md:w-[76px] md:h-[76px]">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r={R} fill="none" stroke="#F3EEE2" strokeWidth="12" />
              {items.map(item => {
                const len = (item.count / total) * C
                const gap = items.length > 1 ? 1.5 : 0
                const dash = Math.max(0, len - gap)
                const el = (
                  <circle key={item.name} cx="50" cy="50" r={R} fill="none" stroke={item.color} strokeWidth="12"
                    strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={-offset}>
                    <title>{`${item.name}: ${item.count}`}</title>
                  </circle>
                )
                offset += len
                return el
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-[10px] md:text-sm font-black leading-none" style={{ color: INK }}>{total}</p>
              <p className="hidden md:block text-[7px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Leads</p>
            </div>
          </div>
          <div className="flex-1 min-w-0 w-full space-y-0.5 md:space-y-1">
            {items.slice(0, 5).map(item => (
              <div key={item.name} className="flex items-center gap-1.5 md:gap-2">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                <p className="text-[9px] md:text-[10px] font-medium truncate flex-1" style={{ color: '#5C5247' }}>{item.name}</p>
                <p className="hidden md:block text-[9px] flex-shrink-0" style={{ color: MUTED }}>{item.count}</p>
                <p className="text-[9px] md:text-[10px] font-bold flex-shrink-0 w-7 text-right" style={{ color: INK }}>{Math.round((item.count / total) * 100)}%</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {href && (
        <p className="text-[8px] md:text-[9px] font-bold mt-2 md:mt-2.5 pt-1.5 md:pt-2 flex items-center gap-1" style={{ color: GOLD, borderTop: `1px solid ${BORDER}` }}>
          View full <ArrowUpRight className="w-2.5 h-2.5 md:w-3 md:h-3" />
        </p>
      )}
    </div>
  )
  return href ? <Link href={href} className="block h-full">{content}</Link> : content
}

function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 mb-2">
      <span className="w-1 h-3 rounded-full flex-shrink-0" style={{ background: GOLD }} />
      <p className="text-[9px] font-black uppercase tracking-[2.5px] flex-shrink-0" style={{ color: '#7A6E60' }}>{children}</p>
      <span className="flex-1 h-px" style={{ background: BORDER }} />
      {right}
    </div>
  )
}

export default async function InteriorDesignDashboard() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('company_id, role, full_name, email').eq('id', user.id).single()
  if (!profile?.company_id) redirect('/login')

  // Only admins/owners can see the whole team's performance; regular CRE staff see only their own.
  const isAdminOrOwner = profile.role === 'admin' || profile.role === 'owner' || profile.role === 'tenant_admin' || profile.role === 'manager'

  // ── Plan-based dashboard tier ─────────────────────────────────────
  // Starter: basic stat cards + stage-wise pipeline only.
  // Professional/Business: same, plus an embedded analytics snapshot
  // and a working "Analytics" deep-link (uses the 'realtime' feature flag,
  // same one that unlocks the real-time dashboard on the pricing page).
  const hasAdvancedAnalytics = await subscriptionService.hasFeature(profile.company_id, 'realtime')

  // ── Leads data — shared helper, bypasses Supabase 1000-row cap ──
  const allLeads = await fetchAllLeads<Lead>(
    supabase,
    profile.company_id,
    'interior-design',
    'id, pipeline_stage, budget, created_at, lead_name, phone, notes, source, city'
  )

  const stageCounts: Record<string, number> = {}
  STAGES.forEach(s => { stageCounts[s.key] = 0 })
  allLeads?.forEach((l: Lead) => {
    const raw = l.pipeline_stage
    if (!raw) return
    const s = STAGE_ALIAS[raw] ?? raw
    if (s === 'followup' && String(l.notes || '').startsWith('[RNR]')) {
      stageCounts['rnr'] = (stageCounts['rnr'] || 0) + 1
    } else if (stageCounts[s] !== undefined) {
      stageCounts[s]++
    }
  })

  // ── IST clock (server runs in UTC) ──
  // eslint-disable-next-line react-hooks/purity -- server component — computed per request, not a client render purity concern
  const nowUTC     = Date.now()
  const istNow     = new Date(nowUTC + IST_OFFSET_MS)
  const istDateStr = istNow.toISOString().split('T')[0]
  const todayStart = new Date(`${istDateStr}T00:00:00+05:30`)
  const todayEnd   = new Date(`${istDateStr}T23:59:59+05:30`)
  const istHour    = istNow.getUTCHours()
  const greeting   = istHour < 12 ? 'Good morning' : istHour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName  = (profile.full_name || '').trim().split(' ')[0] || ''
  const todayLabel = istNow.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })

  const totalLeads  = allLeads?.length ?? 0
  const wonLeads    = stageCounts['won'] ?? 0
  const lostLeads   = stageCounts['lost'] ?? 0
  const activeLeads = totalLeads - wonLeads - lostLeads
  const winRate     = (wonLeads + lostLeads) > 0 ? Math.round((wonLeads / (wonLeads + lostLeads)) * 100) : 0

  // ── One pass: source, city, and leads-per-IST-day ──
  const sourceCountsMap: Record<string, number> = {}
  const cityCountsMap: Record<string, number> = {}
  const dayCounts: Record<string, number> = {}
  allLeads?.forEach((l: Lead) => {
    const src = (l.source || '').trim() || 'Unknown'
    sourceCountsMap[src] = (sourceCountsMap[src] || 0) + 1
    const city = (l.city || '').trim() || 'Unknown'
    cityCountsMap[city] = (cityCountsMap[city] || 0) + 1
    const d = istDay(l.created_at)
    if (d) dayCounts[d] = (dayCounts[d] || 0) + 1
  })
  const sourceDonut = topNWithOther(sourceCountsMap, 4)
  const cityDonut   = topNWithOther(cityCountsMap, 4)

  const dayKey = (daysAgo: number) => new Date(nowUTC + IST_OFFSET_MS - daysAgo * 86400000).toISOString().slice(0, 10)
  const todayLeads     = dayCounts[dayKey(0)] ?? 0
  const yesterdayLeads = dayCounts[dayKey(1)] ?? 0
  const todayDelta     = todayLeads - yesterdayLeads

  // ── 7-day trend (Professional+ snapshot) ──
  const trendDays: { label: string; count: number; isToday: boolean }[] = []
  for (let i = 6; i >= 0; i--) {
    const key = dayKey(i)
    trendDays.push({
      label: new Date(`${key}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'UTC' }),
      count: dayCounts[key] ?? 0,
      isToday: i === 0,
    })
  }
  const trendMax = Math.max(1, ...trendDays.map(d => d.count))
  const trendTotal = trendDays.reduce((s, d) => s + d.count, 0)

  const leadIds = allLeads?.map((l: Lead) => l.id) ?? []

  let todayCalls: Activity[] = []

  if (leadIds.length > 0) {
    try {
      const SURL = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const SKEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

      // company_id + industry filter applied in the DB query itself via an embedded join on
      // `leads`, so other tenants' calls can never push this company's calls out of the window.
      const url = `${SURL}/rest/v1/lead_activities?select=id,lead_id,title,description,created_at,user_id,leads!inner(company_id,industry)&type=eq.call&leads.company_id=eq.${profile.company_id}&leads.industry=eq.interior-design&created_at=gte.${encodeURIComponent(todayStart.toISOString())}&created_at=lte.${encodeURIComponent(todayEnd.toISOString())}&order=created_at.desc&limit=1000`

      const res = await fetch(url, {
        headers: { 'apikey': SKEY, 'Authorization': `Bearer ${SKEY}` },
        cache: 'no-store',
      })

      if (res.ok) {
        const todayActs: Activity[] = await res.json()

        if (todayActs.length > 0) {
          const uids = [...new Set(todayActs.map((a: Activity) => a.user_id).filter(Boolean))] as string[]
          const pm: Record<string, string> = {}
          if (uids.length > 0) {
            const profUrl = `${SURL}/rest/v1/profiles?id=in.(${uids.join(',')})&select=id,full_name,email`
            const profRes = await fetch(profUrl, {
              headers: { 'apikey': SKEY, 'Authorization': `Bearer ${SKEY}` },
              cache: 'no-store',
            })
            if (profRes.ok) {
              const profs: ProfileRow[] = await profRes.json()
              profs?.forEach((p: ProfileRow) => { pm[p.id] = p.full_name || p.email || 'Unknown' })
            }
          }
          todayCalls = todayActs.map((a: Activity) => ({
            ...a, user_name: a.user_id ? (pm[a.user_id] || 'Unknown') : null
          }))
        }
      } else {
        console.error('[Calls] REST error:', res.status, await res.text())
      }
    } catch (e) {
      console.error('[Calls] error:', e)
    }
  }

  // ACCESS CONTROL: non-admin CRE staff must only ever see their own calls/performance,
  // never teammates'. Filter here (not just hide in the UI) so the data never even reaches
  // the client for a restricted user.
  const visibleTodayCalls = isAdminOrOwner ? todayCalls : todayCalls.filter(a => a.user_id === user.id)

  // The CRE list must only include staff whose employee record has designation = 'CRE'
  // — not every profile in the company (MD, Web Developer, Digital Marketing, Tele-calling...).
  let cres: Cre[] = []
  if (isAdminOrOwner) {
    const { data: creEmployees } = await supabase
      .from('employees')
      .select('user_id, full_name, designation')
      .eq('company_id', profile.company_id)
      .ilike('designation', 'CRE')

    cres = (creEmployees ?? [])
      .filter((e: { user_id?: string | null }) => !!e.user_id)
      .map((e: { user_id?: string | null; full_name?: string | null }) => ({ id: e.user_id as string, name: e.full_name || 'Unknown' }))
      .sort((a: Cre, b: Cre) => a.name.localeCompare(b.name))
  } else {
    // Regular CRE staff: the only "team member" they can ever see is themselves.
    cres = [{ id: user.id, name: profile.full_name || profile.email || 'Me' }]
  }

  const heroKpis = [
    { label: 'Total Leads', value: totalLeads,  accent: '#C4B5FD', icon: Users },
    { label: 'Active',      value: activeLeads, accent: '#7DD3FC', icon: Zap },
    { label: 'Won',         value: wonLeads,    accent: '#6EE7B7', icon: Trophy },
    { label: 'Today New',   value: todayLeads,  accent: '#FCD34D', icon: Calendar },
  ]

  return (
    <div style={{ background: CREAM, minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)} }
        @keyframes growUp { from{transform:scaleY(0)}to{transform:scaleY(1)} }
        @keyframes growRight { from{transform:scaleX(0)}to{transform:scaleX(1)} }
        .fade-up { animation: fadeUp 0.45s cubic-bezier(0.16,1,0.3,1) both; }
        .d1 { animation-delay: 0.05s; } .d2 { animation-delay: 0.1s; } .d3 { animation-delay: 0.15s; } .d4 { animation-delay: 0.2s; }
        .bar-up { transform-origin: bottom; animation: growUp 0.6s cubic-bezier(0.16,1,0.3,1) both; }
        .bar-right { transform-origin: left; animation: growRight 0.7s cubic-bezier(0.16,1,0.3,1) both; }
        .card-hover { transition: transform 0.2s cubic-bezier(0.16,1,0.3,1), box-shadow 0.2s ease; }
        .card-hover:hover { transform: translateY(-3px); box-shadow: 0 14px 30px rgba(28,23,18,0.10); }
        @media (prefers-reduced-motion: reduce) {
          .fade-up, .bar-up, .bar-right { animation: none; }
          .card-hover, .card-hover:hover { transition: none; transform: none; }
        }
      `}</style>

      <div className="px-3 md:px-4 pt-3 pb-8 space-y-3 max-w-7xl mx-auto">

        {/* ── HERO ── */}
        <div className="fade-up relative overflow-hidden rounded-2xl p-3 md:p-4"
          style={{ background: 'linear-gradient(135deg,#1C1712 0%,#2B2219 55%,#3A2D1B 100%)', boxShadow: '0 18px 40px rgba(28,23,18,0.22)' }}>
          <div className="pointer-events-none absolute -top-24 -right-16 w-56 h-56 rounded-full" style={{ background: 'radial-gradient(circle,rgba(212,160,23,0.28),transparent 68%)' }} />
          <div className="pointer-events-none absolute -bottom-28 -left-10 w-48 h-48 rounded-full" style={{ background: 'radial-gradient(circle,rgba(124,58,237,0.18),transparent 70%)' }} />

          <div className="relative flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[3px] mb-1" style={{ color: '#D4A017' }}>Interior Design CRM</p>
              <h1 className="text-base sm:text-xl font-black tracking-tight text-white">
                {greeting}{firstName ? `, ${firstName}` : ''} 👋
              </h1>
              <p className="text-[11px] sm:text-xs mt-0.5 flex items-center gap-2" style={{ color: '#B8AE9E' }}>
                <span className="inline-flex items-center gap-1 px-1.5 py-px rounded-full text-[9px] font-black" style={{ background: 'rgba(16,185,129,0.15)', color: '#6EE7B7' }}><span className="relative flex w-1.5 h-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#34D399' }} /><span className="relative inline-flex rounded-full w-1.5 h-1.5" style={{ background: '#34D399' }} /></span>LIVE</span><span>Pipeline overview · {todayLabel}</span>
              </p>
            </div>

            {isAdminOrOwner && (
              <div className="flex items-center gap-2 flex-shrink-0">
                {hasAdvancedAnalytics ? (
                  <Link href="/dashboard/industries/interior-design/analytics"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black transition-all hover:-translate-y-0.5 whitespace-nowrap"
                    style={{ background: 'linear-gradient(135deg,#E3B341,#B8860B)', color: INK, boxShadow: '0 6px 18px rgba(184,134,11,0.38)' }}>
                    <BarChart3 size={12} /> Analytics
                  </Link>
                ) : (
                  <Link href="/dashboard/settings/company"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all hover:-translate-y-0.5 whitespace-nowrap"
                    style={{ background: 'rgba(255,255,255,0.06)', color: '#B8AE9E', border: '1px dashed rgba(255,255,255,0.22)' }}>
                    <Lock size={11} /> Analytics
                  </Link>
                )}
                <Link href="/dashboard/industries/interior-design/cre"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold text-white transition-all hover:-translate-y-0.5 whitespace-nowrap"
                  style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.16)' }}>
                  <ClipboardList size={12} /> CRE
                </Link>
              </div>
            )}
          </div>

          {/* KPI tiles — always 4 across, compact on mobile */}
          <div className="relative grid grid-cols-4 gap-2 mt-3">
            {heroKpis.map((k, i) => {
              const Icon = k.icon
              return (
                <div key={k.label} className={`fade-up d${i + 1} rounded-lg md:rounded-xl p-2 md:p-3`}
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}>
                  <div className="flex items-center justify-between mb-0.5 md:mb-1">
                    <p className="text-[8px] md:text-[9px] font-semibold uppercase tracking-wide leading-tight" style={{ color: '#B8AE9E' }}>{k.label}</p>
                    <Icon className="hidden md:block w-3.5 h-3.5" style={{ color: k.accent }} />
                  </div>
                  <p className="text-base md:text-xl font-black tracking-tight text-white leading-none">{k.value}</p>
                  {k.label === 'Today New' && (
                    <p className="hidden md:flex items-center gap-0.5 text-[9px] font-bold mt-1" style={{ color: todayDelta >= 0 ? '#6EE7B7' : '#FCA5A5' }}>
                      {todayDelta >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {todayDelta >= 0 ? '+' : ''}{todayDelta} vs yesterday
                    </p>
                  )}
                  {k.label === 'Won' && (
                    <p className="hidden md:block text-[9px] font-semibold mt-1" style={{ color: '#B8AE9E' }}>{winRate}% win rate</p>
                  )}
                  {k.label === 'Active' && (
                    <p className="hidden md:block text-[9px] font-semibold mt-1" style={{ color: '#B8AE9E' }}>in pipeline</p>
                  )}
                  {k.label === 'Total Leads' && (
                    <p className="hidden md:block text-[9px] font-semibold mt-1" style={{ color: '#B8AE9E' }}>all stages</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── STAGE CARDS ── */}
        <div className="fade-up d1">
          <SectionTitle>Pipeline</SectionTitle>

          <div className="grid grid-cols-4 lg:grid-cols-8 gap-1.5 md:gap-2">
            <Link href="/dashboard/industries/interior-design/all-leads">
              <div className="card-hover rounded-xl p-2 md:p-2.5 h-full" style={{ background: INK, boxShadow: '0 10px 24px rgba(28,23,18,0.22)' }}>
                <div className="flex items-center justify-between mb-1 md:mb-1.5">
                  <div className="w-6 h-6 md:w-7 md:h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.10)' }}>
                    <Users className="w-3 h-3 md:w-3.5 md:h-3.5" style={{ color: '#E3B341' }} />
                  </div>
                  <p className="text-sm md:text-base font-black text-white">{totalLeads}</p>
                </div>
                <p className="text-[10px] md:text-[11px] font-bold leading-tight text-white">All Leads</p>
                <p className="hidden md:flex items-center gap-1 text-[9px] mt-0.5" style={{ color: '#B8AE9E' }}>View everything <ArrowUpRight className="w-3 h-3" /></p>
              </div>
            </Link>
            {STAGES.map((stage) => {
              const Icon = stage.icon
              const count = stageCounts[stage.key] ?? 0
              const share = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0
              return (
                <Link key={stage.key} href={stage.href}>
                  <div className="card-hover rounded-xl p-2 md:p-2.5 h-full" style={{ background: '#fff', border: `1px solid ${BORDER}`, boxShadow: CARD_SHADOW }}>
                    <div className="flex items-center justify-between mb-1 md:mb-1.5">
                      <div className="w-6 h-6 md:w-7 md:h-7 rounded-lg flex items-center justify-center" style={{ background: stage.bg }}>
                        <Icon className="w-3 h-3 md:w-3.5 md:h-3.5" style={{ color: stage.color }} />
                      </div>
                      <p className="text-sm md:text-base font-black" style={{ color: INK }}>{count}</p>
                    </div>
                    <p className="text-[10px] md:text-[11px] font-bold leading-tight truncate" style={{ color: INK }}>{stage.label}</p>
                    <p className="hidden md:block text-[9px] mt-0.5 truncate" style={{ color: MUTED }}>{stage.description}</p>
                    <div className="mt-1.5 md:mt-2 h-[3px] rounded-full overflow-hidden" style={{ background: '#F3EEE2' }}>
                      <div className="bar-right h-full rounded-full" style={{ width: `${Math.max(count > 0 ? 4 : 0, share)}%`, background: stage.color }} />
                    </div>
                    <p className="hidden md:block text-[8px] font-semibold mt-0.5" style={{ color: MUTED }}>{share}% of leads</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* ── LEAD BREAKDOWN — always 2 across, even on mobile ── */}
        <div className="fade-up d2">
          <SectionTitle>Lead Breakdown</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            <DonutCard title="Leads by Source" subtitle="Where leads come from" icon="🎯" items={sourceDonut}
              href="/dashboard/industries/interior-design/leads-by-source" />
            <DonutCard title="Leads by City" subtitle="Where leads are located" icon="📍" items={cityDonut}
              href="/dashboard/industries/interior-design/leads-by-city" />
          </div>
        </div>

        {/* ── ADVANCED ANALYTICS SNAPSHOT — Professional & Business only ── */}
        {hasAdvancedAnalytics ? (
          <div className="fade-up d3">
            <SectionTitle right={
              <span className="text-[8px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: '#FBF3DC', color: GOLD, border: '1px solid #EFDDA8' }}>Professional</span>
            }>Advanced Analytics</SectionTitle>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {/* Win rate ring */}
              <div className="card-hover rounded-xl p-3 flex items-center gap-3" style={{ background: '#fff', border: `1px solid ${BORDER}`, boxShadow: CARD_SHADOW }}>
                <div className="relative flex-shrink-0" style={{ width: 60, height: 60 }}>
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#ECFDF5" strokeWidth="11" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#10B981" strokeWidth="11" strokeLinecap="round"
                      strokeDasharray={`${(winRate / 100) * 2 * Math.PI * 40} ${2 * Math.PI * 40}`} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-xs font-black" style={{ color: '#059669' }}>{winRate}%</p>
                  </div>
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>Win Rate</p>
                  <p className="text-xs font-black mt-0.5" style={{ color: INK }}>{wonLeads} won</p>
                  <p className="text-[10px]" style={{ color: MUTED }}>{lostLeads} lost</p>
                </div>
              </div>

              {/* 7-day trend */}
              <div className="md:col-span-2 card-hover rounded-xl p-3" style={{ background: '#fff', border: `1px solid ${BORDER}`, boxShadow: CARD_SHADOW }}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[9px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>New Leads — Last 7 Days</p>
                  <p className="flex items-center gap-1 text-[10px] font-black" style={{ color: INK }}>
                    <TrendingUp className="w-3 h-3" style={{ color: '#059669' }} /> {trendTotal} total
                  </p>
                </div>
                <div className="flex items-end justify-between gap-2" style={{ height: 72 }}>
                  {trendDays.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
                      <p className="text-[9px] font-black" style={{ color: d.isToday ? GOLD : '#5C5247' }}>{d.count}</p>
                      <div className="bar-up w-full rounded-t-lg rounded-b-md" title={`${d.count} leads`}
                        style={{
                          height: `${Math.max(4, (d.count / trendMax) * 38)}px`,
                          background: d.isToday ? 'linear-gradient(180deg,#E3B341,#B8860B)' : 'linear-gradient(180deg,#C9BFEF,#9B8CE8)',
                          animationDelay: `${i * 0.05}s`,
                        }} />
                      <p className="text-[8px] font-semibold" style={{ color: d.isToday ? GOLD : MUTED }}>{d.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="fade-up d3">
            <Link href="/dashboard/settings/company"
              className="flex items-center gap-2.5 rounded-xl p-3 transition-all hover:-translate-y-0.5"
              style={{ background: '#fff', border: `1px dashed #DCCFAE` }}>
              <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#FBF3DC' }}>
                <Lock size={14} style={{ color: GOLD }} />
              </span>
              <div>
                <p className="text-xs font-bold" style={{ color: INK }}>Advanced analytics available on Professional</p>
                <p className="text-[10px]" style={{ color: MUTED }}>Win rate, lead trends & real-time dashboard — upgrade to unlock.</p>
              </div>
            </Link>
          </div>
        )}

        {/* ── TEAM PERFORMANCE ── */}
        <div className="fade-up d4">
          <TodayCallsSection
            todayCalls={visibleTodayCalls}
            cres={cres}
            istDateStr={istDateStr}
            companyId={profile.company_id}
            isAdminOrOwner={isAdminOrOwner}
            currentUserId={user.id}
          />
        </div>

        <p className="text-center text-[9px] pb-1" style={{ color: '#B8AE9E' }}>
          Interior Design Pipeline · GK CRM · Live data
        </p>
      </div>
    </div>
  )
}