'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, Menu, Mail } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import { SupportTicketModal } from '@/components/support/SupportTicketModal'

interface Notification {
  id: string
  title: string
  message: string
  link: string | null
  time: string
  read: boolean
  type: string
}

// Shape of the raw row coming back from the `notifications` table via the
// Supabase realtime payload — used to replace an `any` cast.
interface NotificationRow {
  id: string
  title: string
  message: string
  link: string | null
  is_read: boolean
  type: string
  created_at: string
}

interface HeaderProps {
  onMenuClick: () => void
  title?: string
  subtitle?: string
  userName: string
  userEmail: string
  userRole: string
}

export function Header({
  onMenuClick,
  title = 'Dashboard',
  subtitle = 'Overview',
  userName,
  userEmail,
  userRole: userRoleProp,
}: HeaderProps) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [showSupportModal, setShowSupportModal] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [realtimeStatus, setRealtimeStatus] = useState<string>('connecting')
  const [today, setToday] = useState('')
  const notifRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  const userInitials = (() => {
    const parts = (userName || '').trim().split(' ')
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return parts[0]?.slice(0, 2).toUpperCase() || 'GK'
  })()

  const userRole: 'admin' | 'user' = ['admin', 'tenant_admin', 'manager'].includes(userRoleProp)
    ? 'admin'
    : 'user'

  // ✅ Fix: useEffect lo set cheyyi — hydration mismatch avoid avutundi
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional mount/route-driven sync, not a render-time side effect
    setToday(new Date().toLocaleDateString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
    }))
  }, [])

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

  // Real-persisted notifications: fetch on mount + realtime subscribe to `notifications` table
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Initial fetch from DB (survives refresh, works across devices)
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      if (!error && data) {
        setNotifications(
          data.map((n) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            link: n.link,
            read: n.is_read,
            type: n.type,
            time: formatTime(n.created_at),
          }))
        )
      }

      // Guard against React Strict Mode double-invoking this effect in dev,
      // which would otherwise try to .on() an already-subscribed channel.
      const existing = supabase.getChannels().find(
        (c) => c.topic === `realtime:notifications-${user.id}`
      )
      if (existing) {
        await supabase.removeChannel(existing)
      }

      channel = supabase
        .channel(`notifications-${user.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          (payload) => {
            const n = payload.new as NotificationRow
            setNotifications(prev => [{
              id: n.id,
              title: n.title,
              message: n.message,
              link: n.link,
              read: n.is_read,
              type: n.type,
              time: formatTime(n.created_at),
            }, ...prev.slice(0, 19)])
          }
        )
        .subscribe((status) => setRealtimeStatus(status))
    }

    init()

    return () => { if (channel) supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: fetch fn is stable-in-practice, only rerun on listed deps
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
  }

  const markOneRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
  }

  const clearAll = () => {
    // UI-only clear (keeps DB history). If you want a hard delete, swap this for a delete call.
    setNotifications([])
  }

  const handleLogout = async () => { await supabase.auth.signOut(); window.location.href = '/login' }

  const getGradient = (initials: string) => {
    const g = ['from-violet-500 to-purple-700', 'from-blue-500 to-cyan-700', 'from-emerald-500 to-teal-700', 'from-amber-500 to-orange-600', 'from-pink-500 to-rose-700', 'from-indigo-500 to-blue-700']
    return g[(initials || 'GK').charCodeAt(0) % g.length]
  }

  const roleStyle = userRole === 'admin'
    ? { bg: 'bg-[#B8860B]/15', text: 'text-[#F5C518]', label: '✦ Admin' }
    : { bg: 'bg-blue-500/15', text: 'text-blue-300', label: '👤 User' }

  // type -> visual style. Falls back to 'system' style for any unmapped type.
  const notifTypeStyle: Record<string, string> = {
    lead_assigned: 'bg-blue-50',
    payment_received: 'bg-emerald-50',
    quotation_approved: 'bg-emerald-50',
    leave_request: 'bg-amber-50',
    leave_approved: 'bg-amber-50',
    system: 'bg-[#F5F0E8]',
  }
  const notifTypeIcon: Record<string, string> = {
    lead_assigned: '🎯',
    payment_received: '💰',
    quotation_approved: '✅',
    leave_request: '📝',
    leave_approved: '✅',
    system: '⚙️',
  }
  const styleFor = (type: string) => notifTypeStyle[type] || notifTypeStyle.system
  const iconFor = (type: string) => notifTypeIcon[type] || notifTypeIcon.system

  const menuItems = userRole === 'admin'
    ? [
        { icon: '👤', label: 'My Profile', href: '/dashboard/settings' },
        { icon: '🏢', label: 'Company Setup', href: '/dashboard/settings/company' },
      ]
    : [
        { icon: '👤', label: 'My Account', href: '/dashboard/settings' },
      ]

  return (
    <header className="h-16 bg-white border-b border-[#E8E2D8] flex items-center px-3 sm:px-5 gap-2 sm:gap-4 sticky top-0 z-30">

      <button className="lg:hidden p-2.5 -ml-1 rounded-lg hover:bg-[#F5F0E8] transition-colors flex-shrink-0" onClick={onMenuClick} aria-label="Open menu">
        <Menu size={20} className="text-[#1C1712]" />
      </button>

      <div className="flex-1 min-w-0">
        <h1 className="font-serif text-base sm:text-lg text-[#1C1712] truncate">
          {title} <span className="font-sans text-sm text-[#9A8F82] font-normal">/ {subtitle}</span>
        </h1>
      </div>

      {today && <span className="hidden lg:block text-xs text-[#9A8F82] whitespace-nowrap">{today}</span>}

      <div title={`Realtime: ${realtimeStatus}`}
        className={`hidden lg:block w-2 h-2 rounded-full flex-shrink-0 ${
          realtimeStatus === 'SUBSCRIBED' ? 'bg-emerald-400' :
          realtimeStatus === 'CLOSED' || realtimeStatus === 'CHANNEL_ERROR' ? 'bg-red-400' :
          'bg-amber-400 animate-pulse'
        }`}
      />

      {/* Email Support — now opens in-app ticket modal instead of mailto: */}
      <button onClick={() => setShowSupportModal(true)} title="Contact support"
        className="w-10 h-10 rounded-xl border border-[#E8E2D8] bg-[#F7F5F1] flex items-center justify-center text-[#7A6E60] hover:bg-[#F0EBE0] hover:border-[#B8860B] transition-all flex-shrink-0">
        <Mail size={15} />
      </button>

      {/* Notifications */}
      <div className="relative" ref={notifRef}>
        <button onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false) }} aria-label="Notifications"
          className="relative w-10 h-10 rounded-xl border border-[#E8E2D8] bg-[#F7F5F1] flex items-center justify-center text-[#7A6E60] hover:bg-[#F0EBE0] hover:border-[#B8860B] transition-all flex-shrink-0">
          <Bell size={15} />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-[#B8860B] rounded-full flex items-center justify-center text-[9px] font-bold text-white px-1 shadow-[0_2px_8px_rgba(184,134,11,0.5)]">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {notifOpen && (
          <div className="absolute right-0 top-12 w-[calc(100vw-1.5rem)] max-w-80 rounded-2xl overflow-hidden z-50"
            style={{ background: '#FEFCF8', border: '1px solid #E2D9C8', boxShadow: '0 24px 60px rgba(28,23,18,0.18)' }}>

            <div className="flex items-center justify-between px-4 py-3.5"
              style={{ borderBottom: '1px solid #F0EBE0', background: 'linear-gradient(135deg, #FFFBEF, #FEFCF8)' }}>
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs flex-shrink-0"
                  style={{ background: '#FFF3D6', border: '1px solid #F5DFA0' }}>🔔</span>
                <p className="font-serif text-sm text-[#1C1712]">Notifications</p>
                {unreadCount > 0 && (
                  <span className="text-white text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#B8860B' }}>{unreadCount} new</span>
                )}
              </div>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-[11px] text-[#B8860B] hover:underline font-semibold flex-shrink-0">Mark all read</button>
              )}
            </div>

            {realtimeStatus !== 'SUBSCRIBED' && (
              <div className={`px-4 py-2 text-[10px] font-medium flex items-center gap-1.5 ${realtimeStatus === 'CHANNEL_ERROR' || realtimeStatus === 'CLOSED' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'}`}>
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${realtimeStatus === 'CHANNEL_ERROR' || realtimeStatus === 'CLOSED' ? 'bg-red-500' : 'bg-amber-500 animate-pulse'}`} />
                {realtimeStatus === 'CHANNEL_ERROR' ? 'Realtime disconnected' :
                 realtimeStatus === 'CLOSED' ? 'Realtime closed. Please refresh.' :
                 'Connecting to realtime...'}
              </div>
            )}

            <div className="max-h-72 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-3xl"
                    style={{ background: 'radial-gradient(circle, #FFF3D6, #FFFBEF)', border: '1px solid #F5DFA0' }}>🔔</div>
                  <p className="text-sm font-bold text-[#1C1712]">No notifications yet</p>
                  <p className="text-xs text-[#9A8F82] mt-1">New leads will appear here</p>
                </div>
              ) : notifications.map(notif => (
                <div key={notif.id}
                  onClick={() => {
                    if (!notif.read) markOneRead(notif.id)
                    if (notif.link) window.location.href = notif.link
                  }}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-[#F0EBE0] last:border-0 cursor-pointer hover:bg-[#FFFBEF] transition-colors ${!notif.read ? 'bg-[#FFFBEF]' : ''}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm flex-shrink-0 ${styleFor(notif.type)}`}
                    style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    {iconFor(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs leading-snug ${!notif.read ? 'font-semibold text-[#1C1712]' : 'text-[#7A6E60]'}`}>{notif.title}</p>
                    <p className="text-[11px] text-[#9A8F82] leading-snug mt-0.5 line-clamp-2">{notif.message}</p>
                    <p className="text-[10px] text-[#B8B0A0] mt-0.5">{notif.time}</p>
                  </div>
                  {!notif.read && <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: '#B8860B' }} />}
                </div>
              ))}
            </div>

            <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderTop: '1px solid #F0EBE0', background: '#FFFBEF' }}>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${realtimeStatus === 'SUBSCRIBED' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                <p className="text-[10px] font-medium text-[#9A8F82]">{realtimeStatus === 'SUBSCRIBED' ? 'Live — auto updates' : 'Connecting...'}</p>
              </div>
              {notifications.length > 0 && (
                <button onClick={clearAll} className="text-[10px] font-medium text-[#9A8F82] hover:text-red-500 transition-colors">Clear all</button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* User Profile */}
      <div className="relative" ref={profileRef}>
        <button onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false) }}
          className="flex items-center gap-2.5 hover:opacity-80 transition-opacity flex-shrink-0">
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getGradient(userInitials)} flex items-center justify-center text-sm font-bold text-white shadow-sm`}>
            {userInitials}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold text-[#1C1712] leading-tight">{userName.split(' ')[0]}</p>
            <p className={`text-[10px] leading-tight font-semibold ${userRole === 'admin' ? 'text-[#B8860B]' : 'text-blue-600'}`}>
              {userRole === 'admin' ? '✦ Admin' : '👤 User'}
            </p>
          </div>
        </button>

        {profileOpen && (
          <div className="absolute right-0 top-12 w-[calc(100vw-1.5rem)] max-w-64 rounded-2xl overflow-hidden z-50"
            style={{ border: '1px solid #E2D9C8', boxShadow: '0 24px 60px rgba(28,23,18,0.22)' }}>

            <div className="relative px-4 py-4"
              style={{ background: 'linear-gradient(135deg, #1C1712 0%, #2d2218 100%)' }}>
              <div className="absolute inset-0 opacity-25 pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle at 25% 75%, #B8860B, transparent 60%)' }} />
              <div className="relative flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getGradient(userInitials)} flex items-center justify-center text-lg font-bold text-white flex-shrink-0`}
                  style={{ boxShadow: '0 6px 16px rgba(0,0,0,0.35)' }}>
                  {userInitials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{userName}</p>
                  <p className="text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.55)' }}>{userEmail}</p>
                  <span className={`inline-flex items-center gap-1 mt-1.5 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${roleStyle.bg} ${roleStyle.text}`}>
                    {roleStyle.label}
                  </span>
                </div>
              </div>
            </div>

            <div className="py-1.5" style={{ background: '#FEFCF8' }}>
              {menuItems.map(item => (
                <a key={item.label} href={item.href} onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#1C1712] hover:bg-[#F5F0E8] transition-colors">
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0" style={{ background: '#F5F0E8', border: '1px solid #EDE8DC' }}>{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </a>
              ))}
            </div>
            <div className="py-1.5" style={{ background: '#FEFCF8', borderTop: '1px solid #F0EBE0' }}>
              <button onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors w-full">
                <span className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0 bg-red-50">🚪</span>
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Support ticket modal — replaces the old mailto: link */}
      {showSupportModal && (
        <SupportTicketModal onClose={() => setShowSupportModal(false)} />
      )}
    </header>
  )
}