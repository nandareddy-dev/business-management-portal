'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts'
import { RefreshCw, ArrowLeft, X } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

const COLORS = ['#B8860B', '#1C1712', '#D4A843', '#6B4F2A', '#E8C97A', '#4A3520', '#C9A227', '#8B6914']

const ACTIVITY_LABELS: Record<string, string> = {
  stage_change: 'Stage Changes',
  followup: 'Follow Ups',
  quotation: 'Quotations',
  call: 'Calls',
  note: 'Notes',
  sitevisit: 'Site Visits',
  won: 'Won',
}

const ACTIVITY_COLORS: Record<string, string> = {
  stage_change: '#0891B2',
  followup: '#F59E0B',
  quotation: '#DB2777',
  call: '#7C3AED',
  note: '#64748B',
  sitevisit: '#0E7490',
  won: '#10B981',
}

// IST "today" as YYYY-MM-DD — using plain new Date().toISOString() would give the
// UTC date, which drifts a day behind India during early-morning IST hours
// (00:00–05:29 IST is still "yesterday" in UTC). Matches the Dashboard's IST logic.
function istTodayStr(): string {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
  return new Date(Date.now() + IST_OFFSET_MS).toISOString().split('T')[0]
}

type Lead = {
  id: string
  source?: string | null
  city?: string | null
  company_id?: string | null
  industry?: string | null
}

// NOTE: no more nested `leads` field here — we stopped relying on the
// `leads!inner(...)` join (see fetchAll below) because it silently drops
// activity rows whenever the RLS policy on `leads` hides the parent lead
// from the viewer (e.g. an admin viewing a CRE whose leads aren't visible
// to the admin under the current `leads` RLS policy). That was the actual
// cause of "No activities logged" even though the rows existed in the DB.
type LeadActivity = {
  id: string
  type?: string | null
  user_id?: string | null
  lead_id?: string | null
  created_at?: string | null
}

type Profile = {
  id: string
  full_name?: string | null
  email?: string | null
}

export default function CREDashboardPage() {
  const supabase = useMemo(
    () => createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ),
    []
  )

  const searchParams = useSearchParams()
  const creIdParam = searchParams.get('cre_id') // when set, page shows ONE CRE's full history
  const fetchIdRef = useRef(0)

  const [leads, setLeads]   = useState<Lead[]>([])
  const [activities, setActivities]   = useState<LeadActivity[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdminOrOwner, setIsAdminOrOwner] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const today = istTodayStr()
  const [dateFrom, setDateFrom] = useState(() => creIdParam ? '2020-01-01' : today)
  const [dateTo, setDateTo]     = useState(today)

  // ⚠️ FIXED: dates the user is actively editing (via the two <input type="date">
  // fields) no longer trigger an automatic fetch on every change — typing/picking
  // a date only updates these draft values. A fetch only fires when "Apply" is
  // clicked (or on initial mount), so there's no race between a half-typed date
  // and the query, and the count on screen always matches the range actually applied.
  const [appliedFrom, setAppliedFrom] = useState(dateFrom)
  const [appliedTo, setAppliedTo]     = useState(dateTo)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const requestId = ++fetchIdRef.current // tags this request so a late-arriving older one can be ignored
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }
    const { data: profile } = await supabase.from('profiles').select('company_id, role').eq('id', user.id).single()
    if (!profile?.company_id) {
      setLoading(false)
      return
    }

    // ⚠️ FIXED: DB actually stores 'tenant_admin' / 'super_admin' as the admin roles
    // (confirmed via profiles table + the leads RLS policy, which checks
    // `p.role = ANY (ARRAY['tenant_admin','super_admin'])`). This code was checking
    // for 'admin' / 'owner', which never matched — so isAdminOrOwner was always false
    // for real admins like Hari, effectiveCreId silently fell back to the viewer's own
    // id instead of the requested cre_id, and the page showed "My" (the viewer's own,
    // empty) history instead of the selected CRE's history.
    const viewerIsAdminOrOwner = profile.role === 'tenant_admin' || profile.role === 'super_admin'
    setIsAdminOrOwner(viewerIsAdminOrOwner)
    setCurrentUserId(user.id)

    const [leadsRes, profilesRes, activitiesRes] = await Promise.all([
      supabase.from('leads').select('id, source, city, company_id, industry')
        .eq('company_id', profile.company_id)
        .eq('industry', 'interior-design')
        .order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name, email')
        .eq('company_id', profile.company_id),
      // ⚠️ FIXED: previously this used `.select('*, leads!inner(company_id, industry, city, source)')`
      // with `.eq('leads.company_id', ...)` / `.eq('leads.industry', ...)` filters. Because it's an
      // INNER JOIN, any activity whose parent `leads` row was invisible under RLS to the current
      // viewer (e.g. an admin looking at a CRE's history, if the `leads` RLS policy scopes rows to
      // `owner_id = auth.uid()`) got silently dropped — even though the activity row itself existed
      // and was visible. That's what caused "No activities logged" for the CRE dashboard.
      // Fix: fetch lead_activities directly (no join), scoped only by date range + user, then
      // cross-reference against the already-fetched `leads` list (above) in JS to enforce
      // company/industry scoping and to pull in city/source for the charts below.
      supabase
        .from('lead_activities')
        .select('*')
        // ⚠️ IST offset explicit here — without it Postgres treats this as UTC,
        // shifting the "today" window ~5.5hrs off from the Dashboard's IST-based count.
        .gte('created_at', `${appliedFrom}T00:00:00+05:30`)
        .lte('created_at', `${appliedTo}T23:59:59+05:30`)
        .order('created_at', { ascending: false })
        .limit(5000),
    ])

    if (requestId !== fetchIdRef.current) return // a newer request already started — drop this stale one

    const fetchedLeads = (leadsRes.data ?? []) as Lead[]
    setLeads(fetchedLeads)
    setProfiles((profilesRes.data ?? []) as Profile[])

    // Scope activities to this company/industry via the leads we already fetched
    // (instead of relying on a join that can be blocked by leads RLS).
    const leadIds = new Set(fetchedLeads.map(l => l.id))
    const scopedByCompany = ((activitiesRes.data ?? []) as LeadActivity[])
      .filter(a => a.lead_id && leadIds.has(a.lead_id))
    setActivities(scopedByCompany)
    setLoading(false)
  }, [appliedFrom, appliedTo, supabase])

  // Fetches on mount, and again whenever the APPLIED range changes (i.e. after
  // clicking Apply) — never on every keystroke in the date inputs.
  useEffect(() => {
    void Promise.resolve().then(fetchAll)
  }, [fetchAll])

  const handleApply = () => {
    setAppliedFrom(dateFrom)
    setAppliedTo(dateTo)
  }

  // ⚠️ ACCESS CONTROL: whatever is in the URL, a non-admin can only ever see their own data.
  // This is the actual enforcement point — the URL param alone must never grant visibility.
  const effectiveCreId = isAdminOrOwner ? creIdParam : currentUserId

  // Lookup map for city/source per lead (used since activities no longer carry a nested `leads` object)
  const leadById = useMemo(() => {
    const m: Record<string, Lead> = {}
    leads.forEach(l => { m[l.id] = l })
    return m
  }, [leads])

  // ── Filter down to a single CRE's activities when effectiveCreId is present ──
  const scopedActivities = useMemo(
    () => effectiveCreId ? activities.filter(a => a.user_id === effectiveCreId) : activities,
    [activities, effectiveCreId]
  )

  const creName = useMemo(() => {
    if (!effectiveCreId) return null
    const p = profiles.find(pr => pr.id === effectiveCreId)
    return p?.full_name || p?.email || 'Unknown CRE'
  }, [effectiveCreId, profiles])

  // ── Calculations (all driven off scopedActivities) ──

  // 1. Activity type breakdown
  const activityCounts: Record<string, number> = {}
  scopedActivities.forEach(activity => {
    const type = activity.type || 'unknown'
    activityCounts[type] = (activityCounts[type] || 0) + 1
  })
  const activityData = Object.entries(activityCounts).map(([key, value]) => ({
    name: ACTIVITY_LABELS[key] || key, value, key,
  }))

  // 2. User-wise breakdown (single row when scoped to one CRE)
  const profileMap: Record<string, string> = {}
  profiles.forEach(p => { profileMap[p.id] = p.full_name || p.email || p.id })

  const userActivityMap: Record<string, Record<string, number>> = {}
  scopedActivities.forEach(activity => {
    const uid = activity.user_id || 'unknown'
    if (!userActivityMap[uid]) userActivityMap[uid] = {}
    const type = activity.type || 'unknown'
    userActivityMap[uid][type] = (userActivityMap[uid][type] || 0) + 1
    userActivityMap[uid]['total'] = (userActivityMap[uid]['total'] || 0) + 1
  })
  const userTableData = Object.entries(userActivityMap).map(([uid, counts]) => ({
    name: profileMap[uid] || uid.slice(0, 8) + '...',
    total: counts['total'] || 0,
    stage_change: counts['stage_change'] || 0,
    followup: counts['followup'] || 0,
    quotation: counts['quotation'] || 0,
    call: counts['call'] || 0,
    note: counts['note'] || 0,
    sitevisit: counts['sitevisit'] || 0,
  })).sort((a, b) => b.total - a.total)

  // 3. Source distribution — leads aren't tied to a CRE directly, so only show company-wide (hidden when scoped)
  const sourceCounts: Record<string, number> = {}
  leads.forEach(l => { const s = l.source || 'Unknown'; sourceCounts[s] = (sourceCounts[s] || 0) + 1 })
  const sourceData = Object.entries(sourceCounts).map(([name, value]) => ({ name, value }))

  // 4. City-wise activities (looked up via leadById now, since activities no longer carry nested leads data)
  const cityActivityCounts: Record<string, number> = {}
  scopedActivities.forEach(activity => {
    const city = (activity.lead_id && leadById[activity.lead_id]?.city) || 'Unknown'
    cityActivityCounts[city] = (cityActivityCounts[city] || 0) + 1
  })
  const cityData = Object.entries(cityActivityCounts)
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count).slice(0, 10)

  // Summary
  const totalActivities  = scopedActivities.length
  const totalCalls       = activityCounts.call || 0 // same definition as Dashboard's "Total CRE" count
  const totalFollowups   = activityCounts.followup || 0
  const totalQuotations  = activityCounts.quotation || 0
  const totalStageMoves  = activityCounts.stage_change || 0

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ background: '#F5F0E8' }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/industries/interior-design/dashboard"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all hover:-translate-y-0.5"
            style={{ background: 'white', color: '#7A6E60', border: '1px solid #E8E2D8', boxShadow: '0 2px 8px rgba(28,23,18,0.04)' }}>
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[3px]" style={{ color: '#B8860B' }}>Interior Design</p>
            {effectiveCreId ? (
              <>
                <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1C1712' }}>
                  {isAdminOrOwner ? (creName || 'Loading...') : 'My'} — Full History
                </h1>
                <p className="text-sm" style={{ color: '#6B4F2A' }}>Individual CRE activity history & performance</p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1C1712' }}>CRE Dashboard</h1>
                <p className="text-sm" style={{ color: '#6B4F2A' }}>Lead activity tracking and performance analytics</p>
              </>
            )}
          </div>
        </div>
        {/* Only admins/owners can clear the filter to see the whole team — a non-admin has
            nothing to "clear" to, since they can only ever see their own data. */}
        {isAdminOrOwner && creIdParam && (
          <Link href="/dashboard/industries/interior-design/cre"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:-translate-y-0.5"
            style={{ background: '#FFFBEB', color: '#B8860B', border: '1px solid #FDE68A' }}>
            <X className="w-3.5 h-3.5" /> Clear filter · View all CREs
          </Link>
        )}
      </div>

      {/* Date Filter */}
      <div className="bg-white/90 backdrop-blur rounded-2xl p-4 mb-5 flex flex-wrap gap-3 items-center border border-[#EDE7DB]"
        style={{ boxShadow: '0 1px 2px rgba(28,23,18,0.04), 0 10px 24px rgba(28,23,18,0.05)' }}>
        <span className="font-bold text-sm" style={{ color: '#1C1712' }}>Date Range:</span>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="border rounded-xl px-3 py-2 text-sm outline-none transition-all focus:shadow-[0_0_0_3px_rgba(184,134,11,0.10)]"
          style={{ borderColor: '#B8860B', background: '#F7F5F1' }} />
        <span style={{ color: '#9A8F82' }}>to</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="border rounded-xl px-3 py-2 text-sm outline-none transition-all focus:shadow-[0_0_0_3px_rgba(184,134,11,0.10)]"
          style={{ borderColor: '#B8860B', background: '#F7F5F1' }} />
        <button onClick={handleApply}
          className="px-4 py-2 rounded-xl text-sm font-black text-white flex items-center gap-2 transition-all hover:scale-105"
          style={{ background: 'linear-gradient(135deg, #B8860B, #D97706)', boxShadow: '0 4px 12px rgba(184,134,11,0.35)' }}>
          <RefreshCw size={14} /> Apply
        </button>
        {effectiveCreId && isAdminOrOwner && (
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: '#F5F3FF', color: '#7C3AED' }}>
            Filtered to: {creName || '...'}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-[#B8860B] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
            {[
              { label: 'Total Activities', value: totalActivities, color: '#B8860B', icon: '📋' },
              { label: 'Calls',            value: totalCalls,      color: '#7C3AED', icon: '📞' },
              { label: 'Follow Ups',       value: totalFollowups,  color: '#D97706', icon: '🔔' },
              { label: 'Quotations',       value: totalQuotations, color: '#DB2777', icon: '💰' },
              { label: 'Stage Changes',    value: totalStageMoves, color: '#0891B2', icon: '🔀' },
            ].map((s, i) => (
              <div key={i}
                className="relative overflow-hidden bg-white rounded-2xl p-4 border border-[#EDE7DB] transition-all duration-200 hover:-translate-y-0.5"
                style={{ boxShadow: '0 1px 2px rgba(28,23,18,0.04), 0 8px 20px rgba(28,23,18,0.05)' }}>
                <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-[0.06]" style={{ background: s.color }} />
                <div className="relative flex items-center justify-between mb-2">
                  <p className="text-[9px] font-bold text-[#9A8F82] uppercase tracking-wider">{s.label}</p>
                  <span className="text-base">{s.icon}</span>
                </div>
                <p className="relative text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Row 1: Activity Pie + City Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <div className="bg-white rounded-2xl p-5 border border-[#EDE7DB]" style={{ boxShadow: '0 1px 2px rgba(28,23,18,0.04), 0 10px 24px rgba(28,23,18,0.05)' }}>
              <h2 className="text-sm font-black mb-4" style={{ color: '#1C1712' }}>📊 Activity Type Breakdown</h2>
              {activityData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={activityData} cx="40%" cy="50%" innerRadius={65} outerRadius={100} dataKey="value">
                      {activityData.map((e, i) => <Cell key={i} fill={ACTIVITY_COLORS[e.key] || COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend layout="vertical" align="right" verticalAlign="middle" iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-[#9A8F82]">No activities logged</div>
              )}
            </div>

            <div className="bg-white rounded-2xl p-5 border border-[#EDE7DB]" style={{ boxShadow: '0 1px 2px rgba(28,23,18,0.04), 0 10px 24px rgba(28,23,18,0.05)' }}>
              <h2 className="text-sm font-black mb-4" style={{ color: '#1C1712' }}>🏙️ Activities by City</h2>
              {cityData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={cityData} margin={{ bottom: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0EBE0" />
                    <XAxis dataKey="city" angle={-40} textAnchor="end" tick={{ fontSize: 9, fill: '#9A8F82' }} />
                    <YAxis tick={{ fontSize: 9, fill: '#9A8F82' }} />
                    <Tooltip />
                    <Bar dataKey="count" name="Activities" fill="#B8860B" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-[#9A8F82]">No data</div>
              )}
            </div>
          </div>

          {/* User Performance Table — single row when scoped to one CRE */}
          <div className="bg-white rounded-2xl p-5 border border-[#EDE7DB] mb-5" style={{ boxShadow: '0 1px 2px rgba(28,23,18,0.04), 0 10px 24px rgba(28,23,18,0.05)' }}>
            <h2 className="text-sm font-black mb-4" style={{ color: '#1C1712' }}>
              👤 {effectiveCreId ? 'CRE Performance Detail' : 'CRE User-wise Performance'}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: '#F5F0E8' }}>
                    {['CRE Name','Total','Stage Changes','Follow Ups','Quotations','Calls','Notes','Site Visits'].map(h => (
                      <th key={h} className="text-left py-2.5 px-3 text-[9px] font-black uppercase tracking-wider" style={{ color: '#9A8F82' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {userTableData.map((row, i) => (
                    <tr key={i} className="border-t border-[#F0EBE0] hover:bg-[#FDFAF8] transition-colors">
                      <td className="py-2.5 px-3 font-bold text-[#1C1712]">
                        {isAdminOrOwner && !effectiveCreId ? (
                          <Link href={`/dashboard/industries/interior-design/cre?cre_id=${Object.keys(userActivityMap)[i]}`}
                            className="hover:underline" style={{ color: '#1C1712' }}>
                            {row.name}
                          </Link>
                        ) : row.name}
                      </td>
                      <td className="py-2.5 px-3 font-black" style={{ color: '#B8860B' }}>{row.total}</td>
                      <td className="py-2.5 px-3 font-bold text-cyan-600">{row.stage_change}</td>
                      <td className="py-2.5 px-3 font-bold text-amber-600">{row.followup}</td>
                      <td className="py-2.5 px-3 font-bold text-pink-600">{row.quotation}</td>
                      <td className="py-2.5 px-3 text-purple-500">{row.call}</td>
                      <td className="py-2.5 px-3 text-gray-500">{row.note}</td>
                      <td className="py-2.5 px-3 text-blue-500">{row.sitevisit}</td>
                    </tr>
                  ))}
                  {userTableData.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-8 text-[#9A8F82]">No activities logged yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Source Distribution — company-wide only, hidden when scoped to one CRE (leads aren't tied to a single CRE) */}
          {!effectiveCreId && (
            <div className="bg-white rounded-2xl p-5 border border-[#EDE7DB]" style={{ boxShadow: '0 1px 2px rgba(28,23,18,0.04), 0 10px 24px rgba(28,23,18,0.05)' }}>
              <h2 className="text-sm font-black mb-4" style={{ color: '#1C1712' }}>📍 Lead Sources Distribution</h2>
              {sourceData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={sourceData} cx="40%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value">
                      {sourceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend layout="vertical" align="right" verticalAlign="middle" iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-40 flex items-center justify-center text-[#9A8F82]">No data</div>
              )}
            </div>
          )}

          <div className="text-center py-4 mt-4">
            <p className="text-[10px] text-[#C4BAB0]">GK CRM · CRE Dashboard · Interior Design</p>
          </div>
        </>
      )}
    </div>
  )
}