
import { createBrowserClient } from '@supabase/ssr'

export interface Notification {
  id: string
  company_id: string
  user_id: string
  type: string
  title: string
  message: string
  link: string | null
  is_read: boolean
  created_at: string
}

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Get authenticated user
async function getCurrentUser() {
  const supabase = getSupabase()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) throw error

  if (!user) {
    throw new Error('User not authenticated')
  }

  return { supabase, user }
}

// Get latest notifications
export async function getNotifications(
  limit = 20
): Promise<Notification[]> {
  const { supabase, user } = await getCurrentUser()

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error

  return (data ?? []) as Notification[]
}

// Get unread notification count
export async function getUnreadCount(): Promise<number> {
  const { supabase, user } = await getCurrentUser()

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  if (error) throw error

  return count ?? 0
}

// Mark one notification as read
export async function markAsRead(
  notificationId: string
): Promise<void> {
  const { supabase, user } = await getCurrentUser()

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('user_id', user.id)

  if (error) throw error
}

// Mark all notifications as read
export async function markAllAsRead(): Promise<void> {
  const { supabase, user } = await getCurrentUser()

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  if (error) throw error
}

// Permanently delete all notifications for current user
export async function deleteAllNotifications(): Promise<void> {
  const { supabase, user } = await getCurrentUser()

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', user.id)

  if (error) {
    console.error('Failed to delete notifications:', error)
    throw error
  }
}
