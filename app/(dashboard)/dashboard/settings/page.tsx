'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const GRADIENTS = [
  ['#7C3AED', '#4F46E5'], ['#0891B2', '#0E7490'], ['#059669', '#047857'],
  ['#D97706', '#B45309'], ['#DB2777', '#BE185D'], ['#7C3AED', '#6D28D9'],
]

const ROLE_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  admin:        { bg: '#FFFBEB', color: '#B45309', label: '👑 Admin' },
  tenant_admin: { bg: '#FFFBEB', color: '#B45309', label: '👑 Admin' },
  manager:      { bg: '#F5F3FF', color: '#7C3AED', label: '🎯 Manager' },
  employee:     { bg: '#EFF6FF', color: '#2563EB', label: '👤 Staff' },
  super_admin:  { bg: '#FEF2F2', color: '#DC2626', label: '⚡ Super' },
}

const ini = (name: string) => name?.split(' ').map((x: string) => x[0]).join('').slice(0, 2).toUpperCase() || '?'

function useCountUp(target: number, duration = 700) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    let start: number | null = null
    let raf: number
    const step = (ts: number) => {
      if (start === null) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return value
}

function StatCard({ label, value, color, icon, delay, sub }: {
  label: string; value: number; color: string; icon: string; delay: number; sub?: string
}) {
  const count = useCountUp(value)
  return (
    <div
      className="stat-card relative overflow-hidden bg-white border border-[#E8E2D8] rounded-2xl px-5 py-4 flex items-center justify-between fade-in"
      style={{
        animationDelay: `${delay}s`,
        boxShadow: '0 1px 2px rgba(28,23,18,0.03), 0 4px 14px rgba(28,23,18,0.05)',
      }}>
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${color}, ${color}00)` }} />
      <div>
        <p className="text-[10px] text-[#9A8F82] font-semibold uppercase tracking-wide mb-1">{label}</p>
        <p className="text-[28px] font-black tabular-nums leading-none" style={{ color }}>{count}</p>
        {sub && <p className="text-[10px] text-[#B8B0A0] mt-1.5">{sub}</p>}
      </div>
      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg flex-shrink-0 icon-pulse"
        style={{ background: `${color}12` }}>
        {icon}
      </div>
    </div>
  )
}

interface User {
  id: string
  full_name?: string
  email?: string
  role?: string
  created_at: string
  designation?: string
  department?: string
  permissions?: string[]
  is_active?: boolean
  employee_code?: string
}

export default function UsersSettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'staff'>('all')
  const [, setCompanyId] = useState<string | null>(null)
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase
          .from('profiles').select('company_id').eq('id', user.id).single()
        if (!profile?.company_id) return
        setCompanyId(profile.company_id)

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email, role, created_at')
          .eq('company_id', profile.company_id)
          .order('created_at', { ascending: true })

        const { data: employees } = await supabase
          .from('employees')
          .select('user_id, designation, department, permissions, is_active, employee_code')
          .eq('company_id', profile.company_id)

        const empMap: Record<string, { designation?: string; department?: string; permissions?: string[]; is_active?: boolean; employee_code?: string }> = {}
        employees?.forEach(e => { empMap[e.user_id] = e })

        const merged = (profiles || []).map(p => ({
          ...p,
          ...(empMap[p.id] || {}),
        }))

        setUsers(merged)
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const goToUser = (id: string) => {
    router.push(`/dashboard/settings/users/${id}`)
  }

  const admins = users.filter(u => ['admin', 'tenant_admin', 'manager'].includes(u.role))
  const staff = users.filter(u => u.role === 'employee')

  const roleFiltered = roleFilter === 'all' ? users : roleFilter === 'admin' ? admins : staff

  const filtered = roleFiltered.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.role?.toLowerCase().includes(search.toLowerCase())
  )

  const copyEmail = (e: React.MouseEvent, email: string) => {
    e.stopPropagation()
    navigator.clipboard?.writeText(email)
    setCopiedEmail(email)
    setTimeout(() => setCopiedEmail(null), 1500)
  }

  const adminPct = users.length ? Math.round((admins.length / users.length) * 100) : 0
  const staffPct = 100 - adminPct

  if (loading) return (
    <main className="flex-1 p-4 md:p-8" style={{ background: '#F5F0E8', minHeight: '100vh' }}>
      <div className="space-y-5">
        <div className="skeleton h-9 w-52 rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[0,1,2].map(i => <div key={i} className="skeleton h-[76px] rounded-2xl" />)}
        </div>
        <div className="skeleton h-[480px] rounded-2xl" />
      </div>
      <style>{`
        .skeleton {
          background: linear-gradient(90deg, #EDE8DC 25%, #F5F0E8 50%, #EDE8DC 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s ease infinite;
        }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}</style>
    </main>
  )

  return (
    <main className="flex-1 p-4 md:p-8" style={{ background: '#F5F0E8', minHeight: '100vh' }}>
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; filter: blur(3px); transform: translateY(10px); }
          to { opacity: 1; filter: blur(0); transform: translateY(0); }
        }
        .fade-in { animation: fadeSlideUp 0.5s cubic-bezier(0.16,1,0.3,1) both; }
        .row-hover { transition: background 0.18s ease, transform 0.18s ease; }
        .row-hover:hover { transform: translateX(2px); }
        .stat-card { transition: transform 0.22s cubic-bezier(0.16,1,0.3,1), box-shadow 0.22s ease; }
        .stat-card:hover { transform: translateY(-3px); box-shadow: 0 18px 36px rgba(28,23,18,0.10) !important; }
        .avatar-ring { transition: box-shadow 0.2s ease, transform 0.2s cubic-bezier(0.34,1.56,0.64,1); }
        .row-hover:hover .avatar-ring { transform: scale(1.08) rotate(-2deg); }
        .icon-pulse { transition: transform 0.3s ease; }
        .stat-card:hover .icon-pulse { transform: scale(1.15); }
        .email-copy { cursor: pointer; transition: color 0.15s ease; }
        .email-copy:hover { color: #B8860B !important; }
        .search-focus { transition: all 0.2s ease; }
        .search-focus:focus { transform: scale(1.008); }
        .access-card { transition: transform 0.22s cubic-bezier(0.16,1,0.3,1), box-shadow 0.22s ease; }
        .access-card:hover { transform: translateY(-3px); box-shadow: 0 12px 24px rgba(28,23,18,0.08); }
        .access-bar { transition: width 0.8s cubic-bezier(0.16,1,0.3,1) 0.4s; animation: barGrow 0.8s cubic-bezier(0.16,1,0.3,1) 0.4s both; }
        .sticky-head { position: sticky; top: 0; z-index: 5; backdrop-filter: blur(8px); }
        .seg-btn { transition: all 0.2s cubic-bezier(0.16,1,0.3,1); }
        .bar-fill { transition: width 0.8s cubic-bezier(0.16,1,0.3,1); }
      `}</style>

      <div className="max-w-[1400px] mx-auto space-y-6">

        {/* ── Hero Header ── */}
        <div className="fade-in flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div>
            <p className="text-[10px] font-bold text-[#B8860B] uppercase tracking-[4px] mb-1.5">Settings</p>
            <h1 className="text-[32px] font-bold text-[#1C1712] leading-tight">Users & Access</h1>
            <p className="text-sm text-[#9A8F82] mt-1.5">All users in your company portal, at a glance.</p>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/dashboard/settings/users/invite')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white flex-shrink-0"
              style={{ background: '#1C1712', boxShadow: '0 4px 14px rgba(28,23,18,0.25)' }}>
              ➕ Add Staff
            </button>

            {/* Role distribution bar */}
            {users.length > 0 && (
              <div className="bg-white border border-[#E8E2D8] rounded-2xl px-5 py-3.5 min-w-[260px]"
                style={{ boxShadow: '0 1px 2px rgba(28,23,18,0.03), 0 4px 14px rgba(28,23,18,0.05)' }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[9px] font-bold text-[#9A8F82] uppercase tracking-wide">Team Composition</p>
                  <p className="text-[9px] font-bold text-[#C4BAB0]">{users.length} total</p>
                </div>
                <div className="h-2 rounded-full overflow-hidden flex bg-[#F0EBE0]">
                  <div className="bar-fill h-full" style={{ width: `${adminPct}%`, background: '#B8860B' }} />
                  <div className="bar-fill h-full" style={{ width: `${staffPct}%`, background: '#2563EB' }} />
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <span className="flex items-center gap-1.5 text-[10px] text-[#7A6E60]">
                    <span className="w-2 h-2 rounded-full" style={{ background: '#B8860B' }} /> Admins {adminPct}%
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] text-[#7A6E60]">
                    <span className="w-2 h-2 rounded-full" style={{ background: '#2563EB' }} /> Staff {staffPct}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Total Users" value={users.length} color="#7C3AED" icon="👥" delay={0.05} sub="Across your company" />
          <StatCard label="Admins" value={admins.length} color="#B8860B" icon="👑" delay={0.09} sub="Full & managerial access" />
          <StatCard label="Staff" value={staff.length} color="#2563EB" icon="👤" delay={0.13} sub="Permission-based access" />
        </div>

        {/* ── Users Table ── */}
        <div className="bg-white border border-[#E8E2D8] rounded-2xl overflow-hidden fade-in"
          style={{ animationDelay: '0.18s', boxShadow: '0 1px 2px rgba(28,23,18,0.03), 0 10px 28px rgba(28,23,18,0.06)' }}>

          {/* Toolbar */}
          <div className="px-5 py-4 border-b border-[#F0EBE0] flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4" style={{ background: '#FEFCF9' }}>
            <div className="relative flex-1 max-w-xs">
              <input type="text" placeholder="Search users..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="search-focus w-full rounded-xl pl-8 pr-8 py-2.5 text-xs text-[#1C1712] placeholder:text-[#C4BAB0] outline-none bg-[#F7F5F1] border border-[#E8E2D8] focus:border-[#B8860B] focus:shadow-[0_0_0_3px_rgba(184,134,11,0.12)]" />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9A8F82] text-xs">🔍</span>
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9A8F82] hover:text-red-500 text-xs transition-colors">✕</button>
              )}
            </div>

            {/* Segmented role filter */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#F0EBE0] w-fit">
              {[
                { key: 'all', label: 'All' },
                { key: 'admin', label: 'Admins' },
                { key: 'staff', label: 'Staff' },
              ].map(opt => (
                <button key={opt.key} onClick={() => setRoleFilter(opt.key as 'all' | 'admin' | 'staff')}
                  className="seg-btn text-[10px] font-bold px-3 py-1.5 rounded-lg"
                  style={{
                    background: roleFilter === opt.key ? '#1C1712' : 'transparent',
                    color: roleFilter === opt.key ? '#fff' : '#9A8F82',
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>

            <p className="text-[10px] text-[#9A8F82] sm:ml-auto">
              <span className="font-bold text-[#1C1712] tabular-nums">{filtered.length}</span> of {users.length} users
            </p>
          </div>

          {/* Table — desktop */}
          <div className="hidden md:block overflow-x-auto max-h-[600px] overflow-y-auto"
            onScroll={(e) => setScrolled((e.target as HTMLDivElement).scrollTop > 4)}>
            <table className="w-full">
              <thead>
                <tr className="sticky-head" style={{ background: scrolled ? 'rgba(250,250,248,0.92)' : '#FAFAF8', borderBottom: '1px solid #F0EBE0', boxShadow: scrolled ? '0 2px 8px rgba(28,23,18,0.06)' : 'none', transition: 'box-shadow 0.2s ease' }}>
                  {['#', 'User', 'Email', 'Role', 'Dept / Designation', 'Access', 'Joined'].map(h => (
                    <th key={h} className="text-left text-[9px] font-black text-[#9A8F82] uppercase tracking-[2px] px-4 py-3.5 whitespace-nowrap first:pl-5 last:pr-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => {
                  const g = GRADIENTS[i % GRADIENTS.length]
                  const roleCfg = ROLE_CONFIG[u.role] ?? { bg: '#F5F0E8', color: '#7A6E60', label: u.role }
                  const perms: string[] = u.permissions || []
                  return (
                    <tr key={u.id}
                      onClick={() => goToUser(u.id)}
                      className="row-hover border-b border-[#F7F5F1] last:border-0 hover:bg-[#FDFAF8] cursor-pointer"
                      style={{ animation: `fadeSlideUp 0.4s cubic-bezier(0.16,1,0.3,1) both`, animationDelay: `${0.22 + i * 0.03}s` }}>
                      <td className="pl-5 pr-2 py-4">
                        <span className="text-[10px] font-bold text-[#C4BAB0]">{i + 1}</span>
                      </td>
                      <td className="pl-2 pr-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="avatar-ring w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-black text-white flex-shrink-0"
                            style={{ background: `linear-gradient(135deg, ${g[0]}, ${g[1]})`, boxShadow: `0 3px 10px ${g[0]}40` }}>
                            {ini(u.full_name || u.email)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#1C1712]">{u.full_name || '—'}</p>
                            {u.employee_code && (
                              <p className="text-[9px] text-[#B8B0A0] font-mono">{u.employee_code}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="email-copy text-xs text-[#7A6E60] truncate max-w-[200px]" onClick={(e) => copyEmail(e, u.email!)}>
                          {copiedEmail === u.email ? '✓ Copied!' : u.email}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full"
                          style={{ background: roleCfg.bg, color: roleCfg.color, border: `1px solid ${roleCfg.color}30` }}>
                          {roleCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          {u.designation && <p className="text-xs font-medium text-[#1C1712]">{u.designation}</p>}
                          {u.department && <p className="text-[10px] text-[#9A8F82]">{u.department}</p>}
                          {!u.designation && !u.department && <span className="text-[#C4BAB0]">—</span>}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {perms.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {perms.map(p => {
                              const pColors: Record<string, string> = {
                                pipeline: '#7C3AED', projects: '#EA580C',
                                hr: '#0284C7', finance: '#16A34A',
                              }
                              return (
                                <span key={p} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white"
                                  style={{ background: pColors[p] || '#9A8F82' }}>
                                  {p}
                                </span>
                              )
                            })}
                          </div>
                        ) : (
                          <span className="text-[10px] text-[#B8B0A0] px-2 py-0.5 rounded-full bg-[#F5F0E8]">Full</span>
                        )}
                      </td>
                      <td className="px-4 py-4 pr-5">
                        <p className="text-[10px] text-[#B8B0A0] whitespace-nowrap">
                          {new Date(u.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                        </p>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-[#F0EBE0]">
            {filtered.map((u, i) => {
              const g = GRADIENTS[i % GRADIENTS.length]
              const roleCfg = ROLE_CONFIG[u.role] ?? { bg: '#F5F0E8', color: '#7A6E60', label: u.role }
              const perms: string[] = u.permissions || []
              return (
                <div key={u.id}
                  onClick={() => goToUser(u.id)}
                  className="row-hover px-4 py-4 hover:bg-[#FDFAF8] cursor-pointer"
                  style={{ animation: `fadeSlideUp 0.4s cubic-bezier(0.16,1,0.3,1) both`, animationDelay: `${0.22 + i * 0.03}s` }}>
                  <div className="flex items-start gap-3">
                    <div className="avatar-ring w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${g[0]}, ${g[1]})`, boxShadow: `0 3px 10px ${g[0]}35` }}>
                      {ini(u.full_name || u.email)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-[#1C1712] truncate">{u.full_name || '—'}</p>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: roleCfg.bg, color: roleCfg.color }}>
                          {roleCfg.label}
                        </span>
                      </div>
                      <p className="email-copy text-xs text-[#9A8F82] mt-0.5 truncate" onClick={(e) => copyEmail(e, u.email!)}>
                        {copiedEmail === u.email ? '✓ Copied!' : u.email}
                      </p>
                      {(u.designation || u.department) && (
                        <p className="text-[10px] text-[#B8B0A0] mt-1">{u.designation} {u.department ? `· ${u.department}` : ''}</p>
                      )}
                      {perms.length > 0 && (
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {perms.map(p => (
                            <span key={p} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white"
                              style={{ background: { pipeline: '#7C3AED', projects: '#EA580C', hr: '#0284C7', finance: '#16A34A' }[p] || '#9A8F82' }}>
                              {p}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Empty state */}
          {filtered.length === 0 && (
            <div className="text-center py-20 fade-in">
              <p className="text-4xl mb-3">👥</p>
              <p className="text-sm font-bold text-[#1C1712]">{search ? 'No results found' : 'No users yet'}</p>
              <p className="text-xs text-[#9A8F82] mt-1">{search ? 'Try a different search' : 'Add employees from HR section'}</p>
            </div>
          )}

          {/* Footer */}
          <div className="px-5 py-3.5 border-t border-[#F0EBE0] flex items-center justify-between"
            style={{ background: '#FAFAF8' }}>
            <p className="text-[10px] text-[#9A8F82]">
              <span className="font-bold text-[#1C1712]">{users.length}</span> total users
            </p>
            <p className="text-[10px] text-[#B8B0A0]">
              Click a row to edit
            </p>
          </div>
        </div>

        {/* ── Info box ── */}
        <div className="bg-white border border-[#E8E2D8] rounded-2xl p-6 fade-in"
          style={{ animationDelay: '0.3s', boxShadow: '0 2px 8px rgba(28,23,18,0.04)' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-black text-[#9A8F82] uppercase tracking-[2px]">Access Levels</p>
            <p className="text-[10px] text-[#C4BAB0]">Roles across your team</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { key: 'admin', icon: '👑', label: 'Admin', color: '#B45309', bg: '#FFFBEB', desc: 'Full access to all modules', count: users.filter(u => ['admin','tenant_admin'].includes(u.role)).length },
              { key: 'manager', icon: '🎯', label: 'Manager', color: '#7C3AED', bg: '#F5F3FF', desc: 'Pipeline + Reports access', count: users.filter(u => u.role === 'manager').length },
              { key: 'employee', icon: '👤', label: 'Staff', color: '#2563EB', bg: '#EFF6FF', desc: 'Based on permissions set', count: users.filter(u => u.role === 'employee').length },
              { key: 'super_admin', icon: '⚡', label: 'Super', color: '#DC2626', bg: '#FEF2F2', desc: 'Platform-wide oversight', count: users.filter(u => u.role === 'super_admin').length },
            ].map((role, idx) => (
              <div key={role.key}
                className="access-card relative overflow-hidden rounded-xl p-4 fade-in"
                style={{ background: role.bg, border: `1px solid ${role.color}22`, animationDelay: `${0.35 + idx * 0.05}s` }}>
                <div className="flex items-start justify-between mb-2.5">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                    style={{ background: '#fff', boxShadow: `0 2px 6px ${role.color}25` }}>
                    {role.icon}
                  </div>
                  <span className="text-lg font-black tabular-nums" style={{ color: role.color, opacity: 0.85 }}>
                    {role.count}
                  </span>
                </div>
                <p className="text-xs font-bold mb-1" style={{ color: role.color }}>{role.label}</p>
                <p className="text-[10px] text-[#8A7F70] leading-relaxed">{role.desc}</p>
                <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: `${role.color}25` }}>
                  <div className="h-full access-bar" style={{ width: users.length ? `${(role.count / users.length) * 100}%` : '0%', background: role.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </main>
  )
}