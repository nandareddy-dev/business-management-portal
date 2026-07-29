import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import BottomNav from '@/components/employee/bottom-nav'

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (!profile || profile.role !== 'employee') redirect('/dashboard')

  return (
    <>
      <div className="pb-16">{children}</div>
      <BottomNav />
    </>
  )
}