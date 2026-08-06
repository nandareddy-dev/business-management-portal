import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { UserPlus, Phone, Calendar, MapPin, FileText, Trophy, XCircle, Lock } from 'lucide-react'
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

const STAGES = [
  { key: 'new',       label: 'New Leads',  icon: UserPlus, color: '#7C3AED', bg: '#F5F3FF', href: '/dashboard/industries/interior-design/new-leads',  description: 'Fresh enquiries' },
  { key: 'followup',  label: 'Follow Up',  icon: Calendar, color: '#D97706', bg: '#FFF7ED', href: '/dashboard/industries/interior-design/follow-up',   description: 'Date confirmed' },
  { key: 'rnr',       label: 'RNR',        icon: Phone,    color: '#DC2626', bg: '#FEF2F2', href: '/dashboard/industries/interior-design/rnr',          description: 'Ring No Response' },
  { key: 'sitevisit', label: 'Site Visit', icon: MapPin,   color: '#0891B2', bg: '#ECFEFF', href: '/dashboard/industries/interior-design/site-visit',   description: 'Visit scheduled' },
  { key: 'quotation', label: 'Quotations', icon: FileText, color: '#DB2777', bg: '#FDF2F8', href: '/dashboard/industries/interior-design/quotations',   description: 'Quotation sent' },
  { key: 'won',       label: 'Won',        icon: Trophy,   color: '#059669', bg: '#ECFDF5', href: '/dashboard/industries/interior-design/won',          description: 'Deal closed 🎉' },
  { key: 'lost',      label: 'Lost',       icon: XCircle,  color: '#EF4444', bg: '#FEF2F2', href: '/dashboard/industries/interior-design/lost',         description: 'Not interested' },
]

// Soft, light palette used across donut/legend charts.
const DONUT_COLORS = ['#7C6FF0', '#F5A623', '#34D399', '#F472B6', '#60A5FA']
const OTHER_COLOR = '#E2E5EC'

interface DonutItem { name: string; count: number; color: string }

function topNWithOther(map: Record<string, number>, n: number): DonutItem[] {
  const sorted = Object.entries(map).sort((a, b) => b[1] - a[1])
  const top = sorted.slice(0, n).map(([name, count], i) => ({ name, count, color: DONUT_COLORS[i % DONUT_COLORS.length] }))
  const otherCount = sorted.slice(n).reduce((s, [, c]) => s + c, 0)
  if (otherCount > 0) top.push({ name: 'Other', count: otherCount, color: OTHER_COLOR })
  return top
}

function conicGradient(items: DonutItem[]): string {
  const total = items.reduce((s, i) => s + i.count, 0) || 1
  let acc = 0
  const stops = items.map(i => {
    const start = (acc / total) * 360
    acc += i.count
    const end = (acc / total) * 360
    return `${i.color} ${start}deg ${end}deg`
  })
  return `conic-gradient(${stops.join(', ')})`
}

// Simple donut chart: CSS conic-gradient ring with a white center hole, plus a
// colored-dot legend underneath. No client JS needed — pure server-rendered.
// Wrapped in a Link when `href` is given, so the whole card is clickable and
// opens the full (non-truncated) breakdown page. Sized responsively so two
// cards sit side-by-side even on narrow mobile screens.
function DonutCard({ title, subtitle, icon, items, href }: { title: string; subtitle: string; icon: string; items: DonutItem[]; href?: string }) {
  const total = items.reduce((s, i) => s + i.count, 0)
  const content = (
    <div className="card-hover rounded-2xl md:rounded-[20px] p-2.5 md:p-5 h-full" style={{ background: '#fff', boxShadow: '0 1px 2px rgba(16,24,40,0.04), 0 8px 24px rgba(16,24,40,0.05)' }}>
      <div className="flex items-center gap-1.5 md:gap-2.5 mb-2.5 md:mb-4">
        <div className="w-6 h-6 md:w-9 md:h-9 rounded-lg md:rounded-xl flex items-center justify-center text-xs md:text-base flex-shrink-0" style={{ background: '#F4F3FE' }}>{icon}</div>
        <div className="min-w-0">
          <p className="text-[10px] md:text-[13px] font-bold truncate" style={{ color: '#111827' }}>{title}</p>
          <p className="hidden md:block text-[10px]" style={{ color: '#9CA3AF' }}>{subtitle}</p>
        </div>
      </div>

      {total === 0 ? (
        <p className="text-[10px] md:text-xs" style={{ color: '#C4BAB0' }}>No data yet</p>
      ) : (
        <div className="flex flex-col md:flex-row items-center md:items-center gap-2.5 md:gap-5">
          <div className="relative flex-shrink-0 w-16 h-16 md:w-[108px] md:h-[108px]">
            <div className="w-full h-full rounded-full" style={{ background: conicGradient(items) }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="rounded-full flex flex-col items-center justify-center w-9 h-9 md:w-[66px] md:h-[66px]" style={{ background: '#fff' }}>
                <p className="text-[10px] md:text-base font-black" style={{ color: '#111827' }}>{total}</p>
                <p className="hidden md:block text-[8px] font-semibold uppercase tracking-wide" style={{ color: '#9CA3AF' }}>Leads</p>
              </div>
            </div>
          </div>
          <div className="flex-1 min-w-0 w-full space-y-1 md:space-y-2">
            {items.slice(0, 4).map(item => (
              <div key={item.name} className="flex items-center gap-1.5 md:gap-2">
                <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                <p className="text-[9px] md:text-[11px] font-medium truncate flex-1" style={{ color: '#4B5563' }}>{item.name}</p>
                <p className="text-[9px] md:text-[11px] font-bold flex-shrink-0" style={{ color: '#111827' }}>{total > 0 ? Math.round((item.count / total) * 100) : 0}%</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {href && (
        <p className="text-[8px] md:text-[9px] font-semibold mt-2.5 md:mt-4 pt-2 md:pt-3" style={{ color: '#7C6FF0', borderTop: '1px solid #F1F1F5' }}>
          View full →
        </p>
      )}
    </div>
  )
  return href ? <Link href={href} className="block h-full">{content}</Link> : content
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
    const s = l.pipeline_stage
    if (!s) return
    if (s === 'followup' && String(l.notes || '').startsWith('[RNR]')) {
      stageCounts['rnr'] = (stageCounts['rnr'] || 0) + 1
    } else if (stageCounts[s] !== undefined) {
      stageCounts[s]++
    }
  })

  const totalLeads  = allLeads?.length ?? 0
  const wonLeads    = stageCounts['won'] ?? 0
  const lostLeads   = stageCounts['lost'] ?? 0
  const activeLeads = totalLeads - wonLeads - lostLeads
  const todayStr    = new Date().toDateString()
  const todayLeads  = allLeads?.filter(l => new Date(l.created_at).toDateString() === todayStr).length ?? 0
  const winRate     = (wonLeads + lostLeads) > 0 ? Math.round((wonLeads / (wonLeads + lostLeads)) * 100) : 0

  // ── Source-wise & City-wise breakdown for donut charts (top 4 + Other) ──
  const sourceCountsMap: Record<string, number> = {}
  const cityCountsMap: Record<string, number> = {}
  allLeads?.forEach((l: Lead) => {
    const src = (l.source || '').trim() || 'Unknown'
    sourceCountsMap[src] = (sourceCountsMap[src] || 0) + 1
    const city = (l.city || '').trim() || 'Unknown'
    cityCountsMap[city] = (cityCountsMap[city] || 0) + 1
  })
  const sourceDonut = topNWithOther(sourceCountsMap, 4)
  const cityDonut   = topNWithOther(cityCountsMap, 4)

  // ── Simple 7-day trend (for the Professional+ snapshot chart) ──
  const trendDays: { label: string; count: number }[] = []
  if (hasAdvancedAnalytics && allLeads) {
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dayStr = d.toDateString()
      const count = allLeads.filter(l => new Date(l.created_at).toDateString() === dayStr).length
      trendDays.push({ label: d.toLocaleDateString('en-IN', { weekday: 'short' }), count })
    }
  }
  const trendMax = Math.max(1, ...trendDays.map(d => d.count))

  const leadIds = allLeads?.map((l: Lead) => l.id) ?? []

  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
  // eslint-disable-next-line react-hooks/purity -- server component — computed per request, not a client render purity concern
  const nowUTC    = Date.now()
  const istDateStr = new Date(nowUTC + IST_OFFSET_MS).toISOString().split('T')[0]
  const todayStart = new Date(`${istDateStr}T00:00:00+05:30`)
  const todayEnd   = new Date(`${istDateStr}T23:59:59+05:30`)

  let todayCalls: Activity[] = []

  if (leadIds.length > 0) {
    try {
      const SURL = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const SKEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

      // ⚠️ FIXED: company_id + industry filter now applied in the DB query itself via an
      // embedded join on `leads`. Previously this query had NO company filter — it pulled the
      // most-recent 500 'call' activities across ALL tenants, then filtered by leadIdSet in JS.
      // On a busy day, other companies' calls could push this company's earlier calls out of
      // that global top-500 window, silently undercounting today's calls.
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

  // ⚠️ ACCESS CONTROL: non-admin CRE staff must only ever see their own calls/performance,
  // never teammates'. Filter here (not just hide in the UI) so the data never even reaches
  // the client for a restricted user.
  const visibleTodayCalls = isAdminOrOwner ? todayCalls : todayCalls.filter(a => a.user_id === user.id)

  // ⚠️ FIXED (again): the CRE list must only include staff whose employee record has
  // designation = 'CRE' (e.g. "Hari Krishna CRE", "Thamalapakula Anusha") — not every profile
  // in the company. The earlier fix pulled ALL company profiles, which wrongly included the
  // MD, Web Developer, Digital Marketing, and Tele-calling roles alongside the actual CREs.
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

  return (
    <div style={{ background: '#F7F7FA', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) both; }
        .card-hover { transition: all 0.2s cubic-bezier(0.16,1,0.3,1); }
        .card-hover:hover { transform: translateY(-3px); box-shadow: 0 12px 28px rgba(16,24,40,0.08); }
        .scroll-hide { scrollbar-width: none; -ms-overflow-style: none; }
        .scroll-hide::-webkit-scrollbar { display: none; }
      `}</style>

      <div className="px-3 md:px-4 pt-3 pb-10 space-y-4 max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="fade-up">
          <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
            <p className="text-[10px] font-bold uppercase tracking-[4px]" style={{ color: '#8B5CF6' }}>Interior Design CRM</p>
            {isAdminOrOwner && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {hasAdvancedAnalytics ? (
                <Link href="/dashboard/industries/interior-design/analytics"
                  className="px-3 py-1.5 rounded-xl text-[11px] font-bold text-white transition-all hover:-translate-y-0.5 whitespace-nowrap"
                  style={{ background: 'linear-gradient(135deg,#7C6FF0,#6C5CE7)', boxShadow: '0 4px 14px rgba(124,111,240,0.32)' }}>
                  📊 Analytics
                </Link>
              ) : (
                <Link href="/dashboard/settings/company"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all hover:-translate-y-0.5 whitespace-nowrap"
                  style={{ background: '#F1F1F5', color: '#9CA3AF', border: '1px dashed #E2E5EC' }}>
                  <Lock size={11} /> Analytics
                </Link>
              )}
              <Link href="/dashboard/industries/interior-design/cre"
                className="px-3 py-1.5 rounded-xl text-[11px] font-bold text-white transition-all hover:-translate-y-0.5 whitespace-nowrap"
                style={{ background: '#111827', boxShadow: '0 4px 14px rgba(17,24,39,0.2)' }}>
                📋 CRE
              </Link>
            </div>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: '#111827' }}>Pipeline Dashboard</h1>
          <p className="text-xs sm:text-sm mt-0.5" style={{ color: '#9CA3AF' }}>
            Live overview · {new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
          </p>
        </div>

        {/* TOP STATS — always 4 across, compact sizing so it fits without scrolling on mobile */}
        <div className="grid grid-cols-4 gap-2 md:gap-3 fade-up">
          {[
            { label:'Total Leads', value:totalLeads,  color:'#7C6FF0', icon:'👥', bg:'#F4F3FE' },
            { label:'Active',      value:activeLeads, color:'#0EA5E9', icon:'⚡', bg:'#F0F9FF' },
            { label:'Won',         value:wonLeads,    color:'#10B981', icon:'🏆', bg:'#F0FDF9' },
            { label:'Today New',   value:todayLeads,  color:'#F5A623', icon:'📅', bg:'#FFF8ED' },
          ].map((s,i) => (
            <div key={i} className="card-hover rounded-2xl md:rounded-[20px] p-2.5 md:p-4 flex flex-col items-center text-center" style={{ background:'#fff', boxShadow:'0 1px 2px rgba(16,24,40,0.04), 0 8px 20px rgba(16,24,40,0.04)' }}>
              <div className="w-7 h-7 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center text-sm md:text-lg mb-1.5 md:mb-3" style={{ background:s.bg }}>{s.icon}</div>
              <p className="text-[8px] md:text-[10px] font-semibold leading-tight" style={{ color:'#9CA3AF' }}>{s.label}</p>
              <p className="text-base md:text-2xl font-black tracking-tight mt-0.5" style={{ color:'#111827' }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* STAGE WISE CARDS — always 4 across, compact on mobile */}
        <div className="fade-up">
          <p className="text-[10px] font-bold uppercase tracking-[3px] mb-3" style={{ color:'#9CA3AF' }}>Stage Wise Count</p>
          <div className="grid grid-cols-4 gap-2 md:gap-3">
            <Link href="/dashboard/industries/interior-design/all-leads">
              <div className="card-hover rounded-2xl md:rounded-[20px] p-2.5 md:p-4" style={{ background:'#fff', boxShadow:'0 1px 2px rgba(16,24,40,0.04), 0 8px 20px rgba(16,24,40,0.04)' }}>
                <div className="flex items-center justify-between mb-1.5 md:mb-3">
                  <div className="w-7 h-7 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center text-sm md:text-lg" style={{ background:'#F4F3FE' }}>👥</div>
                  <p className="text-sm md:text-xl font-black" style={{ color:'#111827' }}>{totalLeads}</p>
                </div>
                <p className="text-[10px] md:text-[13px] font-bold leading-tight" style={{ color:'#111827' }}>All Leads</p>
                <p className="hidden md:block text-[10px] mt-0.5" style={{ color:'#9CA3AF' }}>All stages combined</p>
              </div>
            </Link>
            {STAGES.map((stage) => {
              const Icon = stage.icon
              const count = stageCounts[stage.key] ?? 0
              return (
                <Link key={stage.key} href={stage.href}>
                  <div className="card-hover rounded-2xl md:rounded-[20px] p-2.5 md:p-4" style={{ background:'#fff', boxShadow:'0 1px 2px rgba(16,24,40,0.04), 0 8px 20px rgba(16,24,40,0.04)' }}>
                    <div className="flex items-center justify-between mb-1.5 md:mb-3">
                      <div className="w-7 h-7 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center" style={{ background:stage.bg }}>
                        <Icon className="w-3.5 h-3.5 md:w-5 md:h-5" style={{ color:stage.color }}/>
                      </div>
                      <p className="text-sm md:text-xl font-black" style={{ color:'#111827' }}>{count}</p>
                    </div>
                    <p className="text-[10px] md:text-[13px] font-bold leading-tight truncate" style={{ color:'#111827' }}>{stage.label}</p>
                    <p className="hidden md:block text-[10px] mt-0.5 truncate" style={{ color:'#9CA3AF' }}>{stage.description}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* LEAD BREAKDOWN — donut charts, always 2 across (even on mobile) */}
        <div className="fade-up">
          <p className="text-[10px] font-bold uppercase tracking-[3px] mb-3" style={{ color:'#9CA3AF' }}>Lead Breakdown</p>
          <div className="grid grid-cols-2 gap-2 md:gap-3">
            <DonutCard title="Leads by Source" subtitle="Where leads come from" icon="🎯" items={sourceDonut}
              href="/dashboard/industries/interior-design/leads-by-source" />
            <DonutCard title="Leads by City" subtitle="Where leads are located" icon="📍" items={cityDonut}
              href="/dashboard/industries/interior-design/leads-by-city" />
          </div>
        </div>

        {/* ADVANCED ANALYTICS SNAPSHOT — Professional & Business only */}
        {hasAdvancedAnalytics ? (
          <div className="fade-up">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold uppercase tracking-[3px]" style={{ color:'#9CA3AF' }}>Advanced Analytics</p>
              <span className="text-[8px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ background:'#F4F3FE', color:'#7C6FF0' }}>Professional</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Win rate — ring style */}
              <div className="card-hover rounded-[20px] p-5 flex items-center gap-4" style={{ background:'#fff', boxShadow:'0 1px 2px rgba(16,24,40,0.04), 0 8px 20px rgba(16,24,40,0.04)' }}>
                <div className="relative flex-shrink-0" style={{ width: 72, height: 72 }}>
                  <div className="w-full h-full rounded-full" style={{
                    background: `conic-gradient(#10B981 0deg ${winRate * 3.6}deg, #F0FDF9 ${winRate * 3.6}deg 360deg)`
                  }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="rounded-full flex items-center justify-center" style={{ width: 50, height: 50, background: '#fff' }}>
                      <p className="text-xs font-black" style={{ color:'#10B981' }}>{winRate}%</p>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold" style={{ color:'#9CA3AF' }}>Win Rate</p>
                  <p className="text-[13px] font-bold mt-0.5" style={{ color:'#111827' }}>{wonLeads} won</p>
                  <p className="text-[11px]" style={{ color:'#9CA3AF' }}>{lostLeads} lost</p>
                </div>
              </div>

              {/* 7-day lead trend */}
              <div className="md:col-span-2 card-hover rounded-[20px] p-5" style={{ background:'#fff', boxShadow:'0 1px 2px rgba(16,24,40,0.04), 0 8px 20px rgba(16,24,40,0.04)' }}>
                <p className="text-[10px] font-semibold mb-3" style={{ color:'#9CA3AF' }}>New Leads — Last 7 Days</p>
                <div className="flex items-end justify-between gap-2" style={{ height: 72 }}>
                  {trendDays.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                      <div className="w-full rounded-full" style={{
                        height: `${Math.max(6, (d.count / trendMax) * 56)}px`,
                        background: '#7C6FF0',
                      }} title={`${d.count} leads`} />
                      <p className="text-[9px] font-medium" style={{ color:'#9CA3AF' }}>{d.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="fade-up">
            <Link href="/dashboard/settings/company"
              className="flex items-center gap-3 rounded-[20px] p-4 transition-all hover:-translate-y-0.5"
              style={{ background:'#fff', border:'1px dashed #E2E5EC' }}>
              <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background:'#F4F3FE' }}>
                <Lock size={16} style={{ color:'#7C6FF0' }} />
              </span>
              <div>
                <p className="text-sm font-bold" style={{ color:'#111827' }}>Advanced analytics available on Professional</p>
                <p className="text-[11px]" style={{ color:'#9CA3AF' }}>Win rate, lead trends & real-time dashboard — upgrade to unlock.</p>
              </div>
            </Link>
          </div>
        )}

        {/* TEAM PERFORMANCE */}
        <div className="fade-up">
          <TodayCallsSection
            todayCalls={visibleTodayCalls}
            cres={cres}
            istDateStr={istDateStr}
            companyId={profile.company_id}
            isAdminOrOwner={isAdminOrOwner}
            currentUserId={user.id}
          />
        </div>

        <p className="text-center text-[10px] pb-2" style={{ color:'#C4BAB0' }}>
          Interior Design Pipeline · GK CRM · Live data
        </p>
      </div>
    </div>
  )
}