import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function getAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase server environment variables are missing')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization')
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice(7)
      : null

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const leadNames = Array.isArray(body?.leadNames)
      ? body.leadNames
          .filter((name: unknown): name is string => typeof name === 'string')
          .map((name: string) => name.trim())
          .filter(Boolean)
          .slice(0, 200)
      : []

    if (leadNames.length === 0) {
      return NextResponse.json(
        { error: 'At least one lead name is required' },
        { status: 400 }
      )
    }

    const supabaseAdmin = getAdminClient()

    // Verify the user's access token; never trust a user ID supplied by the browser.
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, company_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.company_id) {
      console.error('Lead notification profile lookup failed:', profileError)
      return NextResponse.json(
        { error: 'User company could not be verified' },
        { status: 403 }
      )
    }

    // companyId from the browser is only a consistency check, never the source
    // of authorization. The trusted company ID comes from the verified profile.
    if (body?.companyId && body.companyId !== profile.company_id) {
      return NextResponse.json(
        { error: 'Company mismatch' },
        { status: 403 }
      )
    }

    const companyId = profile.company_id

    const [
      { data: admins, error: adminsError },
      { data: employees, error: employeesError },
    ] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('company_id', companyId)
        .in('role', ['super_admin', 'tenant_admin', 'admin']),
      supabaseAdmin
        .from('employees')
        .select('user_id')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .not('user_id', 'is', null),
    ])

    if (adminsError) {
      console.error('Lead notification admin lookup failed:', adminsError)
    }

    if (employeesError) {
      console.error('Lead notification employee lookup failed:', employeesError)
    }

    // Always include the authenticated user so the person adding the lead
    // also receives the in-app notification.
    const recipientIds = Array.from(
      new Set(
        [
          user.id,
          ...(admins || []).map((admin) => admin.id),
          ...(employees || []).map((employee) => employee.user_id),
        ].filter((id): id is string => typeof id === 'string' && id.length > 0)
      )
    )

    const notificationRows = recipientIds.flatMap((userId) =>
      leadNames.map((leadName) => ({
        company_id: companyId,
        user_id: userId,
        type: 'lead_assigned',
        title: 'New lead added',
        message: `${leadName} was added to the CRM.`,
        link: '/dashboard/industries/interior-design/new-leads',
      }))
    )

    const { error: insertError } = await supabaseAdmin
      .from('notifications')
      .insert(notificationRows)

    if (insertError) {
      console.error('Lead notifications insert failed:', insertError)
      return NextResponse.json(
        { error: 'Could not create in-app notifications' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      notifiedUsers: recipientIds.length,
      notificationsCreated: notificationRows.length,
    })
  } catch (error) {
    console.error('Lead notification API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
