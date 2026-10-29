import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { QrCode } from 'lucide-react'
import { ComingSoon } from '@/components/employee/coming-soon'

export const dynamic = 'force-dynamic'

export default async function QrCodePage() {
  // Primary auth gate is middleware on /employee/*. This check is a
  // consistency + defense-in-depth measure matching the other employee sub-pages.
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <ComingSoon
      title="QR-Code"
      subtitle="Employee services"
      icon={QrCode}
      message="This section is being built. Check back soon."
    />
  )
}