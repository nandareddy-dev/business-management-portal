'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, Building2, TrendingUp, CreditCard,
  Settings, LogOut, ChevronLeft, ChevronRight,
  Shield, Menu, X, Activity, Users, BarChart3, Key,
  Database, Headphones, Mail, MessageSquare
} from 'lucide-react'

const NAV = [
  { href: '/admin/dashboard',        icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/tenants',          icon: Building2,       label: 'Tenants' },
  { href: '/admin/users',            icon: Users,           label: 'Users' },
  { href: '/admin/audit-logs',       icon: Activity,        label: 'Audit Logs' },
  { href: '/admin/analytics',        icon: BarChart3,       label: 'Analytics' },
  { href: '/admin/revenue',          icon: TrendingUp,      label: 'Revenue' },
  { href: '/admin/subscriptions',    icon: CreditCard,      label: 'Subscriptions' },
  { href: '/admin/api-keys',         icon: Key,             label: 'API Keys' },
  { href: '/admin/system-monitor',   icon: Database,        label: 'System Monitor' },
  { href: '/admin/backup',           icon: Database,        label: 'Backup' },
  { href: '/admin/support-tickets',  icon: Headphones,      label: 'Support' },
  { href: '/admin/support-inquiries', icon: MessageSquare,  label: 'Web Inquiries' },
  { href: '/admin/email-templates',  icon: Mail,            label: 'Email' },
  { href: '/admin/settings',         icon: Settings,        label: 'Settings' },
]

function SidebarContent({ mobile = false, collapsed, pathname, setCollapsed }: {
  mobile?: boolean
  collapsed: boolean
  pathname: string
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>
}) {
  return (
    <div className={`
      flex flex-col h-full
      ${mobile ? 'w-72' : collapsed ? 'w-[72px]' : 'w-60'}
      transition-all duration-300 ease-in-out
    `}>
      {/* Logo */}
      <div className={`
        flex items-center gap-3 px-4 py-5 border-b border-black/8
        ${collapsed && !mobile ? 'justify-center px-0' : ''}
      `}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/20">
          <Shield size={18} className="text-white" />
        </div>
        {(!collapsed || mobile) && (
          <div>
            <p className="text-sm font-bold text-[#1C1712] tracking-tight leading-none">GK · CRM</p>
            <p className="text-[10px] text-amber-600 font-semibold tracking-widest uppercase mt-0.5">Super Admin</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {!collapsed || mobile ? (
          <p className="text-[9px] font-bold text-black/30 uppercase tracking-widest px-3 mb-3">Navigation</p>
        ) : <div className="mb-3 h-4" />}

        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`
                group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-150 relative
                ${collapsed && !mobile ? 'justify-center px-0 w-full' : ''}
                ${active
                  ? 'bg-amber-500/15 text-amber-700'
                  : 'text-black/50 hover:text-black/80 hover:bg-black/5'
                }
              `}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-amber-600 rounded-r-full" />
              )}
              <Icon size={17} className={`flex-shrink-0 ${active ? 'text-amber-600' : ''}`} />
              {(!collapsed || mobile) && (
                <span className="text-sm font-medium">{label}</span>
              )}

              {/* Tooltip on collapsed desktop */}
              {collapsed && !mobile && (
                <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-[#1C1712] border border-black/20 rounded-lg text-xs font-medium text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl">
                  {label}
                </div>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-2 pb-4 space-y-0.5 border-t border-black/8 pt-3">
        {/* Collapse toggle — desktop only */}
        {!mobile && (
          <button
            onClick={() => setCollapsed(p => !p)}
            className={`
              w-full flex items-center gap-3 rounded-xl px-3 py-2.5
              text-black/40 hover:text-black/70 hover:bg-black/5 transition-all
              ${collapsed ? 'justify-center px-0' : ''}
            `}
          >
            {collapsed
              ? <ChevronRight size={16} />
              : <><ChevronLeft size={16} /><span className="text-xs font-medium">Collapse</span></>
            }
          </button>
        )}

        <form action="/api/auth/signout" method="POST">
          <button
            type="submit"
            className={`
              w-full flex items-center gap-3 rounded-xl px-3 py-2.5
              text-black/40 hover:text-red-600 hover:bg-red-100/30 transition-all group
              ${collapsed && !mobile ? 'justify-center px-0' : ''}
            `}
          >
            <LogOut size={16} className="flex-shrink-0" />
            {(!collapsed || mobile) && <span className="text-xs font-medium">Sign out</span>}
            {collapsed && !mobile && (
              <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-[#1C1712] border border-black/20 rounded-lg text-xs font-medium text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl">
                Sign out
              </div>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function AdminSidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close mobile drawer on route change
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional mount/route-driven sync, not a render-time side effect
  useEffect(() => { setMobileOpen(false) }, [pathname])

  // Close on resize to desktop
  useEffect(() => {
    const fn = () => { if (window.innerWidth >= 1024) setMobileOpen(false) }
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])


  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 w-9 h-9 rounded-xl bg-[#F5F0E8] border border-black/15 flex items-center justify-center text-black/60 hover:text-black shadow-lg"
      >
        <Menu size={18} />
      </button>

      {/* Mobile overlay + drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <div className="relative flex flex-col bg-[#F5F0E8] border-r border-black/8 shadow-2xl animate-slide-in-left">
            {/* Close btn */}
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 w-7 h-7 rounded-lg bg-black/10 flex items-center justify-center text-black/40 hover:text-black"
            >
              <X size={14} />
            </button>
            <SidebarContent mobile collapsed={collapsed} pathname={pathname} setCollapsed={setCollapsed} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className={`
        hidden lg:flex flex-col h-full
        bg-[#F5F0E8] border-r border-black/8
        ${collapsed ? 'w-[72px]' : 'w-60'}
        transition-all duration-300 ease-in-out flex-shrink-0
      `}>
        <SidebarContent collapsed={collapsed} pathname={pathname} setCollapsed={setCollapsed} />
      </aside>
    </>
  )
}