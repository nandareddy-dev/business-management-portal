
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, Check, CheckCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  is_read: boolean
  created_at: string
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const userIdRef = useRef<string | null>(null)

  // Load notifications belonging only to the signed-in user.
  const loadNotifications = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('notifications')
      .select('id, type, title, message, link, is_read, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Failed to load notifications:', error)
      return
    }

    const rows = (data ?? []) as Notification[]

    setNotifications(rows)
    setUnreadCount(rows.filter((item) => !item.is_read).length)
  }, [])

  // Initial load and Realtime subscription.
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null
    let active = true

    async function initialize() {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()

        if (!active) return

        if (error || !user) {
          setLoading(false)
          return
        }

        userIdRef.current = user.id

        await loadNotifications(user.id)

        if (!active) return

        channel = supabase
          .channel(`notification-center-${user.id}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              if (!active) return

              const newNotification = payload.new as Notification

              setNotifications((previous) => {
                if (previous.some((item) => item.id === newNotification.id)) {
                  return previous
                }

                return [newNotification, ...previous].slice(0, 20)
              })

              setUnreadCount((previous) =>
                previous + (newNotification.is_read ? 0 : 1)
              )

              // Browser notification while the CRM is open.
              if (
                typeof window !== 'undefined' &&
                'Notification' in window &&
                window.Notification.permission === 'granted'
              ) {
                const browserNotification = new window.Notification(
                  newNotification.title,
                  {
                    body: newNotification.message,
                    icon: '/favicon.ico',
                    tag: newNotification.id,
                  }
                )

                browserNotification.onclick = () => {
                  window.focus()

                  if (newNotification.link) {
                    window.location.assign(newNotification.link)
                  }

                  browserNotification.close()
                }
              }
            }
          )
          .subscribe((status) => {
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              console.error('Notification Realtime status:', status)
            }
          })
      } catch (error) {
        console.error('Notification initialization failed:', error)
      } finally {
        if (active) setLoading(false)
      }
    }

    void initialize()

    return () => {
      active = false

      if (channel) {
        void supabase.removeChannel(channel)
      }
    }
  }, [loadNotifications])

  // Close dropdown when clicking outside.
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Request browser notification permission after user interaction.
  async function handleToggle() {
    setIsOpen((previous) => !previous)

    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      window.Notification.permission === 'default'
    ) {
      try {
        await window.Notification.requestPermission()
      } catch (error) {
        console.error('Browser notification permission failed:', error)
      }
    }
  }

  // Mark one notification as read.
  async function handleMarkAsRead(id: string) {
    const userId = userIdRef.current
    if (!userId) return

    const selected = notifications.find((item) => item.id === id)

    if (!selected || selected.is_read) return

    setNotifications((previous) =>
      previous.map((item) =>
        item.id === id ? { ...item, is_read: true } : item
      )
    )

    setUnreadCount((previous) => Math.max(0, previous - 1))

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('Failed to mark notification as read:', error)
      await loadNotifications(userId)
    }
  }

  // Mark all notifications as read.
  async function handleMarkAllAsRead() {
    const userId = userIdRef.current
    if (!userId) return

    const previousNotifications = notifications

    setNotifications((previous) =>
      previous.map((item) => ({ ...item, is_read: true }))
    )
    setUnreadCount(0)

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (error) {
      console.error('Failed to mark all notifications as read:', error)
      setNotifications(previousNotifications)
      setUnreadCount(
        previousNotifications.filter((item) => !item.is_read).length
      )
    }
  }

  // Relative time.
  function timeAgo(dateString: string) {
    const difference = Math.max(
      0,
      Date.now() - new Date(dateString).getTime()
    )

    const minutes = Math.floor(difference / 60000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`

    const hours = Math.floor(minutes / 60)

    if (hours < 24) return `${hours}h ago`

    const days = Math.floor(hours / 24)

    return `${days}d ago`
  }

  function handleNotificationClick(notification: Notification) {
    if (!notification.is_read) {
      void handleMarkAsRead(notification.id)
    }

    setIsOpen(false)

    if (notification.link) {
      window.location.assign(notification.link)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => void handleToggle()}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <Bell className="w-5 h-5 text-gray-600" />

        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-semibold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-[min(20rem,calc(100vw-2rem))] bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-[28rem] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-600" />

              <h3 className="font-semibold text-sm text-gray-900">
                Notifications
              </h3>

              {unreadCount > 0 && (
                <span className="text-[10px] bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 font-semibold">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void handleMarkAllAsRead()}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <div className="text-3xl mb-3">🔔</div>

                <p className="text-sm font-semibold text-gray-800">
                  No notifications yet
                </p>

                <p className="text-xs text-gray-400 mt-1">
                  New leads will appear here
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                    !notification.is_read ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleNotificationClick(notification)
                      }
                      className="flex-1 min-w-0 text-left"
                    >
                      <p className="text-sm font-medium text-gray-900 hover:text-amber-700">
                        {notification.title}
                      </p>

                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {notification.message}
                      </p>

                      <p className="text-[11px] text-gray-400 mt-1">
                        {timeAgo(notification.created_at)}
                      </p>
                    </button>

                    {!notification.is_read && (
                      <button
                        type="button"
                        onClick={() =>
                          void handleMarkAsRead(notification.id)
                        }
                        className="p-1.5 hover:bg-gray-200 rounded-full shrink-0"
                        aria-label="Mark as read"
                        title="Mark as read"
                      >
                        <Check className="w-3.5 h-3.5 text-gray-500" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[10px] text-gray-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Live updates
            </span>

            <span className="text-[10px] text-gray-400">
              Latest 20 notifications
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
