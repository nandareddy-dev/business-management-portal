'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { X, ChevronDown, LogOut, Lock } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import { getStageCounts, type CanonicalStage } from '@/lib/stage-utils'
import { fetchAllLeads } from '@/lib/fetch-all-leads'

interface SidebarProps { isOpen: boolean; onClose: () => void }

const INDUSTRIES: Record<string, { label: string; icon: string; slug: string }> = {
  'interior-design': { label: 'Interior Design', icon: '🛋️', slug: 'interior-design' },
  'real-estate':     { label: 'Real Estate',     icon: '🏠', slug: 'real-estate' },
  'hospital':        { label: 'Hospital',         icon: '🏥', slug: 'hospital' },
  'b2b-business':    { label: 'B2B Business',    icon: '🤝', slug: 'b2b-business' },
  'clinics':         { label: 'Clinics',          icon: '🩺', slug: 'clinics' },
}

const SECTION_PERMISSION: Record<string, string> = {
  'PIPELINE':    'pipeline',
  'MY PIPELINE': 'pipeline',
  'PROJECTS':    'projects',
  'HR & ADMIN':  'hr',
  'FINANCE':     'finance',
  'SYSTEM':      'pipeline',
  'WORK':        'pipeline',
  'ACCOUNT':     'pipeline',
}

// ── Plan-feature gating ──────────────────────────────────────────────────
// Which subscription feature flag a sidebar section requires.
// Sections not listed here are available on every plan (Pipeline, Projects, Settings).
// Section-level lock — used for sections that are entirely gated (e.g. Finance).
const SECTION_PLAN_FEATURE: Record<string, 'hrms' | 'billing' | 'projects'> = {
  'PROJECTS': 'projects',
  'FINANCE':  'billing',
}

// Item-level lock — used within a section where some items are free on every plan
// (e.g. adding team members) and others need a higher plan (attendance, payslips).
// Keyed by the item's label since hrefs are industry-prefixed and vary.
const ITEM_PLAN_FEATURE: Record<string, 'hrms' | 'billing'> = {
  'Attendance':   'hrms',
  'Work Reports': 'hrms',
  'Pay Slips':    'hrms',
}

const PLAN_RANK: Record<string, number> = { starter: 1, professional: 2, business: 3, lifetime: 4 }

const FEATURE_MATRIX: Record<string, string[]> = {
  starter: [],
  professional: ['hrms', 'billing', 'realtime', 'projects'],
  business: ['hrms', 'billing', 'realtime', 'projects', 'api', 'branding'],
  lifetime: ['hrms', 'billing', 'realtime', 'projects', 'api', 'branding'],
}

function buildNavGroups(industrySlug: string) {
  const IND = `/dashboard/industries/${industrySlug}`

  const adminNavGroups = [
    {
      section: 'PIPELINE', icon: '🎯',
      items: [
        { label: 'Dashboard',     icon: '📊', href: `${IND}/dashboard`  },
        { label: 'All Leads',     icon: '👥', href: `${IND}/all-leads`  },
        { label: 'New Leads',     icon: '🆕', href: `${IND}/new-leads`  },
        { label: 'Follow Up',     icon: '🔄', href: `${IND}/follow-up`  },
        { label: 'RNR',           icon: '📵', href: `${IND}/rnr`        },
        { label: 'Site Visit',    icon: '🏠', href: `${IND}/site-visit` },
        { label: 'Quotations',    icon: '💰', href: `${IND}/quotations` },
        { label: 'Won / Closing', icon: '🏆', href: `${IND}/won`        },
        { label: 'Lost',          icon: '❌', href: `${IND}/lost`       },
        { label: 'Handover',      icon: '📦', href: `${IND}/handover`   },
      ],
    },
    {
      section: 'PROJECTS', icon: '🏗️',
      items: [
        { label: 'All Projects', icon: '🏗️', href: `${IND}/projects`  },
        { label: 'Clients',    icon: '👥', href: `${IND}/projects/clients`   },
        { label: 'Designs',    icon: '🎨', href: `${IND}/projects/designs`   },
        { label: 'Materials',  icon: '📦', href: `${IND}/projects/materials` },
        { label: 'Quotations', icon: '📋', href: `${IND}/finance/quotations` },
      ],
    },
    {
      section: 'HR & ADMIN', icon: '👔',
      items: [
        { label: 'Team Members', icon: '👥', href: '/hr/employees'    },
        { label: 'Attendance',   icon: '📅', href: '/hr/attendance'   },
        { label: 'Work Reports', icon: '📝', href: '/hr/work-reports' },
        { label: 'Pay Slips',    icon: '💵', href: '/hr/payslips'     },
      ],
    },
    {
      section: 'FINANCE', icon: '💳',
      items: [
        { label: 'Overview',    icon: '📊', href: `${IND}/finance`              },
        { label: 'Quotations',  icon: '📋', href: `${IND}/finance/quotations`   },
        { label: 'Invoices',    icon: '🧾', href: `${IND}/finance/invoices`     },
        { label: 'Payments',    icon: '💳', href: `${IND}/finance/payments`     },
        { label: 'Expenses',    icon: '💸', href: `${IND}/finance/expenses`     },
      ],
    },
    {
      section: 'SYSTEM', icon: '⚙️',
      items: [
        { label: 'Settings',         icon: '⚙️', href: '/dashboard/settings'         },
        { label: 'Company Settings', icon: '🏢', href: '/dashboard/settings/company' },
      ],
    },
  ]

  const employeeNavGroups = [
    {
      section: 'MY PIPELINE', icon: '🎯',
      items: [
        { label: 'Dashboard',  icon: '📊', href: `${IND}/dashboard`  },
        { label: 'All Leads',  icon: '👥', href: `${IND}/all-leads`  },
        { label: 'New Leads',  icon: '🆕', href: `${IND}/new-leads`  },
        { label: 'Follow Up',  icon: '🔄', href: `${IND}/follow-up`  },
        { label: 'RNR',        icon: '📵', href: `${IND}/rnr`        },
        { label: 'Site Visit', icon: '🏠', href: `${IND}/site-visit` },
        { label: 'Quotations', icon: '💰', href: `${IND}/quotations` },
        { label: 'Won',        icon: '🏆', href: `${IND}/won`        },
        { label: 'Lost',       icon: '❌', href: `${IND}/lost`       },
        { label: 'Handover',   icon: '📦', href: `${IND}/handover`   },
      ],
    },
    {
      section: 'PROJECTS', icon: '🏗️',
      items: [
        { label: 'My Projects', icon: '🏗️', href: `${IND}/projects` },
        { label: 'Clients',    icon: '👥', href: `${IND}/projects/clients`   },
        { label: 'Quotations', icon: '📋', href: `${IND}/finance/quotations` },
      ],
    },
    {
      section: 'HR & ADMIN', icon: '👔',
      items: [
        { label: 'Attendance',   icon: '📅', href: '/hr/attendance'   },
        { label: 'Work Reports', icon: '📝', href: '/hr/work-reports' },
        { label: 'My Pay Slips', icon: '💵', href: '/hr/payslips/my'  },
      ],
    },
    {
      section: 'FINANCE', icon: '💳',
      items: [
        { label: 'Overview',   icon: '📊', href: `${IND}/finance`            },
        { label: 'Invoices',   icon: '🧾', href: `${IND}/finance/invoices`   },
        { label: 'Payments',   icon: '💳', href: `${IND}/finance/payments`   },
      ],
    },
    {
      section: 'ACCOUNT', icon: '🔑',
      items: [
        { label: 'My Account', icon: '👤', href: '/employee/profile' },
      ],
    },
  ]

  return { adminNavGroups, employeeNavGroups, IND }
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const industryFromUrl = Object.keys(INDUSTRIES).find(slug =>
    pathname.includes(`/dashboard/industries/${slug}`)
  )

  const [currentIndustrySlug, setCurrentIndustrySlug] = useState(industryFromUrl || 'interior-design')

  useEffect(() => {
    if (industryFromUrl) {
      localStorage.setItem('gk-active-industry', industryFromUrl)
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional sync
      // with the URL's industry segment when navigating between industries.
      setCurrentIndustrySlug(industryFromUrl)
    } else {
      const saved = localStorage.getItem('gk-active-industry')
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional
      // restore of last-selected industry from localStorage on mount.
      if (saved && INDUSTRIES[saved]) setCurrentIndustrySlug(saved)
    }
  }, [pathname, industryFromUrl])

  const currentIndustry = INDUSTRIES[currentIndustrySlug]
  // NOTE: buildNavGroups also returns `IND` (the industry-prefixed base path) but this
  // component doesn't need it directly — hrefs are already built into adminNavGroups /
  // employeeNavGroups — so it's intentionally left out of the destructure.
  const { adminNavGroups, employeeNavGroups } = useMemo(() => buildNavGroups(currentIndustrySlug), [currentIndustrySlug])

  const [role, setRole] = useState<'admin' | 'employee'>('employee')
  const [userName, setUserName] = useState('User')
  const [userInitials, setUserInitials] = useState('U')
  const [userCompany, setUserCompany] = useState('GK Digital')
  const [activeIndustries, setActiveIndustries] = useState<string[]>([])
  const [stageCounts, setStageCounts] = useState<Record<CanonicalStage, number>>({
    new: 0, followup: 0, rnr: 0, sitevisit: 0, quotation: 0, won: 0, lost: 0,
  })
  const [totalLeads, setTotalLeads] = useState(0)
  const [handoverCount, setHandoverCount] = useState(0)
  const [industryDropdownOpen, setIndustryDropdownOpen] = useState(false)
  const [empPermissions, setEmpPermissions] = useState<string[]>(['pipeline'])
  // Plan-based feature flags for this company (e.g. ['hrms','billing','realtime'])
  const [planFeatures, setPlanFeatures] = useState<string[]>([])
  const [planFeaturesLoaded, setPlanFeaturesLoaded] = useState(false)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    'PIPELINE': true, 'MY PIPELINE': true, 'PROJECTS': false,
    'HR & ADMIN': false, 'FINANCE': false, 'SYSTEM': false, 'ACCOUNT': true,
  })

  // Cached company_id so the realtime listener doesn't re-fetch auth/profile on every single event
  const companyIdRef = useRef<string | null>(null)
  const refreshDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (isOpen && typeof window !== 'undefined' && window.innerWidth < 1024) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const refreshStageCounts = async (companyId: string) => {
    try {
      const leads = await fetchAllLeads(supabase, companyId, 'interior-design', 'pipeline_stage, notes')
      if (!leads) return
      setStageCounts(getStageCounts(leads))
      setTotalLeads(leads.length)

      const { count } = await supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('industry', 'interior-design')
        .not('handover_date', 'is', null)
      setHandoverCount(count ?? 0)
    } catch (err) {
      // Transient network/Supabase blips shouldn't crash the sidebar — just skip this refresh,
      // the next realtime event or page load will pick up the correct counts.
      console.warn('Sidebar stage-count refresh skipped:', err)
    }
  }

  // Fetch this company's subscription plan and resolve which features are unlocked.
  // Uses the highest plan across all subscribed industries (company-wide modules
  // like HRMS/Billing shouldn't be locked just because one industry is on Starter).
  const refreshPlanFeatures = async (companyId: string) => {
    try {
      const { data: sub } = await supabase
        .from('company_subscriptions')
        .select('plan_config')
        .eq('company_id', companyId)
        .maybeSingle()

      const config = sub?.plan_config as Record<string, string> | null
      if (!config || Object.keys(config).length === 0) {
        setPlanFeatures([])
        setPlanFeaturesLoaded(true)
        return
      }

      const plans = Object.values(config)
      const highest = plans.reduce((best, p) => ((PLAN_RANK[p] ?? 0) > (PLAN_RANK[best] ?? 0) ? p : best), plans[0])
      setPlanFeatures(FEATURE_MATRIX[highest] ?? [])
      setPlanFeaturesLoaded(true)
    } catch (err) {
      console.warn('Sidebar plan-feature refresh skipped:', err)
      setPlanFeaturesLoaded(true)
    }
  }

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: profile } = await supabase
          .from('profiles').select('full_name, role, company_id').eq('id', user.id).single()
        if (profile) {
          const isAdmin = ['admin', 'tenant_admin', 'manager'].includes(profile.role)
          setRole(isAdmin ? 'admin' : 'employee')
          if (profile.full_name) {
            setUserName(profile.full_name)
            const parts = profile.full_name.trim().split(' ')
            setUserInitials(parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : parts[0].slice(0, 2).toUpperCase())
          }
          if (profile.company_id) {
            companyIdRef.current = profile.company_id
            const { data: company } = await supabase.from('companies').select('name').eq('id', profile.company_id).single()
            if (company?.name) setUserCompany(company.name)
            const { data: ci } = await supabase.from('company_industries').select('industries(slug)').eq('company_id', profile.company_id).eq('is_active', true)
            if (ci) {
              setActiveIndustries(
                (ci as unknown as { industries: { slug: string } | null }[])
                  .map((c) => c.industries?.slug)
                  .filter((s): s is string => Boolean(s))
              )
            }

            await refreshStageCounts(profile.company_id)
            await refreshPlanFeatures(profile.company_id)
          }
          if (!isAdmin) {
            const { data: empData } = await supabase.from('employees').select('permissions').eq('user_id', user.id).maybeSingle()
            if (empData?.permissions && Array.isArray(empData.permissions)) {
              setEmpPermissions(empData.permissions)
            } else {
              const { data: empByEmail } = await supabase.from('employees').select('permissions').eq('email', user.email!).maybeSingle()
              if (empByEmail?.permissions && Array.isArray(empByEmail.permissions)) setEmpPermissions(empByEmail.permissions)
            }
          }
        }
      } catch (err) { console.error('Sidebar init:', err) }
    }
    init()
  }, [pathname])

  // Realtime listener — debounced + error-safe.
  // Bulk DB changes (CSV imports, SQL cleanups, multi-row deletes) fire this callback once
  // PER ROW CHANGE. Without debouncing, that means N parallel auth/profile/count fetches at once,
  // which is what was causing "Failed to fetch" crashes during bulk operations.
  useEffect(() => {
    const channel = supabase.channel(`sidebar-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current)
        refreshDebounceRef.current = setTimeout(async () => {
          try {
            // Reuse cached company_id if we already have it — avoids an auth.getUser()
            // round-trip (the exact call that was failing) on every burst of events.
            let companyId = companyIdRef.current
            if (!companyId) {
              const { data: { user } } = await supabase.auth.getUser()
              if (!user) return
              const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single()
              if (!profile?.company_id) return
              companyId = profile.company_id
              companyIdRef.current = companyId
            }
            await refreshStageCounts(companyId)
          } catch (err) {
            // Network/auth fetch failures (e.g. transient Supabase outages, or a burst of
            // bulk DB edits) should never crash the sidebar — just skip this refresh cycle.
            console.warn('Sidebar realtime refresh skipped:', err)
          }
        }, 800) // wait for a burst of changes to settle before refreshing once
      }).subscribe()

    return () => {
      if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current)
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = () => setIndustryDropdownOpen(false)
    if (industryDropdownOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [industryDropdownOpen])

  const handleLogout = async () => { await supabase.auth.signOut(); window.location.href = '/login' }

  const navGroups = useMemo(() => {
    if (role === 'admin') return adminNavGroups
    return employeeNavGroups.filter(group => {
      if (group.section === 'ACCOUNT') return true
      const requiredPerm = SECTION_PERMISSION[group.section]
      if (!requiredPerm) return false
      return empPermissions.includes(requiredPerm)
    })
  }, [role, adminNavGroups, employeeNavGroups, empPermissions])

  // Whether an entire section is locked by the company's current plan (e.g. Finance).
  // Returns false while plan data is still loading, to avoid a locked-then-unlocked flash.
  const isSectionLocked = (section: string) => {
    if (!planFeaturesLoaded) return false
    const requiredFeature = SECTION_PLAN_FEATURE[section]
    if (!requiredFeature) return false
    return !planFeatures.includes(requiredFeature)
  }

  // Whether a single item within an otherwise-unlocked section is locked
  // (e.g. Attendance/Pay Slips inside HR & ADMIN, while Team Members stays free).
  const isItemLocked = (label: string) => {
    if (!planFeaturesLoaded) return false
    const requiredFeature = ITEM_PLAN_FEATURE[label]
    if (!requiredFeature) return false
    return !planFeatures.includes(requiredFeature)
  }

  const getBadge = (href: string) => {
    const IND_BASE = `/dashboard/industries/${currentIndustrySlug}`
    if (href === `${IND_BASE}/handover`) {
      return handoverCount ? String(handoverCount) : null
    }
    const stageMap: Record<string, CanonicalStage | '__total__'> = {
      [`${IND_BASE}/new-leads`]:  'new',
      [`${IND_BASE}/follow-up`]:  'followup',
      [`${IND_BASE}/rnr`]:        'rnr',
      [`${IND_BASE}/site-visit`]: 'sitevisit',
      [`${IND_BASE}/quotations`]: 'quotation',
      [`${IND_BASE}/won`]:        'won',
      [`${IND_BASE}/lost`]:       'lost',
      [`${IND_BASE}/all-leads`]:  '__total__',
    }
    const stageKey = stageMap[href]
    if (!stageKey) return null
    const c = stageKey === '__total__' ? totalLeads : stageCounts[stageKey]
    return c ? String(c) : null
  }

  const isActive = (href: string) => {
    if (href === `/dashboard/industries/${currentIndustrySlug}`) return pathname === href
    return pathname.startsWith(href)
  }

  const handleIndustrySwitch = (slug: string) => {
    localStorage.setItem('gk-active-industry', slug)
    setCurrentIndustrySlug(slug)
  }

  const toggleSection = (section: string) => setOpenSections(prev => ({ ...prev, [section]: !prev[section] }))

  const AVATAR_COLORS = [
    { from: '#7C3AED', to: '#4F46E5' },
    { from: '#0891B2', to: '#0E7490' },
    { from: '#059669', to: '#047857' },
    { from: '#D97706', to: '#B45309' },
    { from: '#DB2777', to: '#BE185D' },
  ]
  const avatarColor = AVATAR_COLORS[userInitials.charCodeAt(0) % AVATAR_COLORS.length]

  const PERM_LABELS: Record<string, { label: string; color: string; bg: string }> = {
    pipeline: { label: 'Pipeline', color: '#7C3AED', bg: '#F5F3FF' },
    projects: { label: 'Projects', color: '#EA580C', bg: '#FFF7ED' },
    hr:       { label: 'HR',       color: '#0284C7', bg: '#EFF6FF' },
    finance:  { label: 'Finance',  color: '#16A34A', bg: '#F0FDF4' },
  }

  const getBadgeStyle = (href: string, active: boolean): React.CSSProperties => {
    if (active) return { background: 'rgba(255,255,255,0.22)', color: '#fff' }
    if (href.includes('/follow-up')) return { background: '#FEF3C7', color: '#B45309' }
    if (href.includes('/rnr'))       return { background: '#FEE2E2', color: '#DC2626' }
    if (href.includes('/won'))       return { background: '#DCFCE7', color: '#15803D' }
    if (href.includes('/lost'))      return { background: '#FEE2E2', color: '#DC2626' }
    if (href.includes('/handover'))  return { background: '#ECFEFF', color: '#0891B2' }
    return { background: '#F0F0EE', color: '#888' }
  }

  return (
    <>
      {isOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 40, backdropFilter: 'blur(4px)' }}
          className="lg:hidden" onClick={onClose} />
      )}

      <aside style={{
        position: 'fixed', top: 0, left: 0, height: '100%', width: 236, maxWidth: '82vw', zIndex: 50,
        display: 'flex', flexDirection: 'column',
        background: '#FFFFFF', borderRight: '1px solid #EBEBEB',
        boxShadow: '4px 0 24px rgba(0,0,0,0.06)',
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
        fontFamily: "'Inter', sans-serif",
        paddingTop: 'env(safe-area-inset-top)',
      }}>

        {/* LOGO */}
        <div style={{ padding: '20px 16px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 12, background: 'linear-gradient(135deg,#F5C518,#E0A800)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 900, color: '#1C1C1E', boxShadow: '0 4px 12px rgba(245,197,24,0.4)' }}>G</div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#1C1C1E', margin: 0, letterSpacing: -0.3 }}>GK · CRM</p>
              <p style={{ fontSize: 9, fontWeight: 400, color: '#F5C518', textTransform: 'uppercase', letterSpacing: 2, margin: 0 }}>Premium Suite</p>
            </div>
          </div>
          {/* Cancel/Close button — now visible on desktop too, not just mobile */}
          <button onClick={onClose} title="Close sidebar"
            style={{ width: 36, height: 36, borderRadius: 10, background: '#F5F5F3', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#888' }}>
            <X size={16} />
          </button>
        </div>

        {/* INDUSTRY CHIP */}
        <div style={{ padding: '0 12px 14px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#F9F9F7', border: '1px solid #EBEBEB', borderRadius: 16, padding: '10px 12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ width: 32, height: 32, background: '#fff', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, border: '1px solid #F0F0EE', flexShrink: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              {currentIndustry.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 9, color: '#22C55E', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, margin: 0 }}>{currentIndustry.label}</p>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#1C1C1E', margin: '2px 0 0' }}>
                {role === 'admin' ? '👑 Admin Portal' : '👤 User Portal'}
              </p>
            </div>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 6px rgba(34,197,94,0.5)', flexShrink: 0 }} />
          </div>

          {activeIndustries.length > 1 && (
            <div style={{ position: 'relative', marginTop: 8 }} onClick={e => e.stopPropagation()}>
              <button onClick={() => setIndustryDropdownOpen(prev => !prev)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, background: '#F5F5F3', border: '1px solid #EBEBEB', borderRadius: 12, padding: '11px 12px', fontSize: 11, fontWeight: 600, color: '#1C1C1E', cursor: 'pointer' }}>
                <span style={{ fontSize: 13 }}>{currentIndustry.icon}</span>
                <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentIndustry.label}</span>
                <ChevronDown size={11} style={{ color: '#AAA', transform: industryDropdownOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
              </button>
              {industryDropdownOpen && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#fff', border: '1px solid #EBEBEB', borderRadius: 14, boxShadow: '0 8px 24px rgba(0,0,0,0.10)', zIndex: 50, overflow: 'hidden' }}>
                  {activeIndustries.map(slug => {
                    const ind = INDUSTRIES[slug]; if (!ind) return null
                    const isCurrent = slug === currentIndustrySlug
                    return (
                      <Link key={slug} href={`/dashboard/industries/${slug}/dashboard`}
                        onClick={() => { handleIndustrySwitch(slug); setIndustryDropdownOpen(false) }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', fontSize: 11, fontWeight: 600, background: isCurrent ? '#1C1C1E' : 'transparent', color: isCurrent ? '#fff' : '#666', textDecoration: 'none' }}>
                        <span style={{ fontSize: 14 }}>{ind.icon}</span>
                        <span style={{ flex: 1 }}>{ind.label}</span>
                        {isCurrent && <span style={{ fontSize: 8, background: 'rgba(255,255,255,0.18)', padding: '2px 8px', borderRadius: 20, fontWeight: 800, letterSpacing: 1 }}>ACTIVE</span>}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ height: 1, background: 'linear-gradient(90deg,transparent,#EBEBEB,transparent)', margin: '0 12px', flexShrink: 0 }} />

        {/* NAV */}
        <nav style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: 2 }} className="scroll-hide">

          {role === 'employee' && empPermissions.length > 0 && (
            <div style={{ padding: '4px 6px 10px' }}>
              <p style={{ fontSize: 8, fontWeight: 800, color: '#BBB', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>Your Access</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {empPermissions.map(pId => {
                  const p = PERM_LABELS[pId]; if (!p) return null
                  return <span key={pId} style={{ fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: p.bg, color: p.color }}>{p.label}</span>
                })}
              </div>
            </div>
          )}

          {navGroups.map((group) => {
            const isOpen_ = openSections[group.section] ?? true
            const hasActive = group.items.some(item => isActive(item.href))
            const locked = role === 'admin' && isSectionLocked(group.section)
            return (
              <div key={group.section} style={{ marginBottom: 2 }}>
                <button onClick={() => toggleSection(group.section)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 10px', borderRadius: 12, border: 'none', background: hasActive ? '#F5F5F3' : 'transparent', cursor: 'pointer' }}>
                  <span style={{ fontSize: 13, opacity: locked ? 0.5 : 1 }}>{group.icon}</span>
                  <span style={{ flex: 1, textAlign: 'left', fontSize: 9, fontWeight: 800, color: '#BBB', textTransform: 'uppercase', letterSpacing: 2 }}>{group.section}</span>
                  {locked && (
                    <span style={{ fontSize: 8, fontWeight: 800, padding: '2px 7px', borderRadius: 20, background: '#FEF3C7', color: '#B45309', display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                      <Lock size={8} /> Upgrade
                    </span>
                  )}
                  <ChevronDown size={11} style={{ color: '#CCC', transform: isOpen_ ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s', flexShrink: 0 }} />
                </button>

                <div style={{ overflow: 'hidden', maxHeight: isOpen_ ? 600 : 0, opacity: isOpen_ ? 1 : 0, transition: 'max-height 0.22s ease, opacity 0.18s ease' }}>
                  <div style={{ paddingTop: 2, paddingLeft: 4, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {locked ? (
                      // Whole section gated (e.g. Finance on Starter) — single upgrade prompt
                      // instead of dead-end nav items.
                      <Link href="/dashboard/settings/company" onClick={onClose}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 9, padding: '11px 10px', borderRadius: 12,
                          background: '#FFFBEB', border: '1px dashed #FCD34D',
                          color: '#B45309', fontWeight: 600, fontSize: 11, textDecoration: 'none',
                        }}>
                        <Lock size={12} />
                        <span>Available on Professional plan — Upgrade to unlock</span>
                      </Link>
                    ) : (
                      group.items.map((item) => {
                        const itemLocked = role === 'admin' && isItemLocked(item.label)
                        if (itemLocked) {
                          return (
                            <Link key={item.label} href="/dashboard/settings/company" onClick={onClose}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 9, padding: '11px 10px', borderRadius: 12,
                                background: 'transparent', color: '#BBB', fontWeight: 500, fontSize: 12, textDecoration: 'none',
                              }}>
                              <span style={{ fontSize: 13, lineHeight: 1, flexShrink: 0, opacity: 0.5 }}>{item.icon}</span>
                              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                              <Lock size={10} style={{ flexShrink: 0 }} />
                            </Link>
                          )
                        }
                        const active = isActive(item.href)
                        const badge = getBadge(item.href)
                        return (
                          <Link key={item.label} href={item.href} onClick={onClose}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 9, padding: '11px 10px', borderRadius: 12,
                              background: active ? '#1C1C1E' : 'transparent',
                              color: active ? '#fff' : '#555',
                              fontWeight: active ? 700 : 500,
                              fontSize: 12, textDecoration: 'none',
                              boxShadow: active ? '0 2px 10px rgba(0,0,0,0.12)' : 'none',
                            }}
                            onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#F5F5F3' }}
                            onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                            <span style={{ fontSize: 13, lineHeight: 1, flexShrink: 0 }}>{item.icon}</span>
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                            {badge && (
                              <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 20, flexShrink: 0, ...getBadgeStyle(item.href, active) }}>
                                {badge}
                              </span>
                            )}
                          </Link>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </nav>

        <div style={{ height: 1, background: 'linear-gradient(90deg,transparent,#EBEBEB,transparent)', margin: '0 12px', flexShrink: 0 }} />

        {/* USER FOOTER */}
        <div style={{ padding: '12px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#F9F9F7', border: '1px solid #EBEBEB', borderRadius: 16, padding: '10px 12px' }}>
            <div style={{ width: 34, height: 34, borderRadius: 12, background: `linear-gradient(135deg,${avatarColor.from},${avatarColor.to})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
              {userInitials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#1C1C1E', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName.split(' ')[0]}</p>
                <span style={{ fontSize: 8, fontWeight: 800, padding: '2px 6px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0, background: role === 'admin' ? '#FEF9C3' : '#EFF6FF', color: role === 'admin' ? '#B45309' : '#2563EB' }}>
                  {role === 'admin' ? 'Admin' : 'Staff'}
                </span>
              </div>
              <p style={{ fontSize: 10, color: '#BBB', margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userCompany}</p>
            </div>
            <button onClick={handleLogout}
              style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid #EBEBEB', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#BBB', flexShrink: 0 }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FEF2F2'; (e.currentTarget as HTMLElement).style.color = '#EF4444' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fff'; (e.currentTarget as HTMLElement).style.color = '#BBB' }}>
              <LogOut size={14} />
            </button>
          </div>
        </div>

      </aside>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        .scroll-hide { scrollbar-width: none; }
        .scroll-hide::-webkit-scrollbar { display: none; }
        @media (min-width: 1024px) { .lg\\:hidden { display: none !important; } }
      `}</style>
    </>
  )
}