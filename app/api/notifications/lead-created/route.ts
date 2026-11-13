
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    // Verify logged-in user
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { leadNames, companyId } = body

    if (!companyId || !leadNames) {
      return NextResponse.json(
        { error: 'companyId and leadNames are required' },
        { status: 400 }
      )
    }

    // Verify user's company
    const { data: currentProfile, error: currentProfileError } =
      await supabaseAdmin
        .from('profiles')
        .select('id, company_id')
        .eq('id', user.id)
        .single()

    if (
      currentProfileError ||
      !currentProfile ||
      currentProfile.company_id !== companyId
    ) {
      return NextResponse.json(
        { error: 'Company access denied' },
        { status: 403 }
      )
    }

    // Fetch all Admins and Employees
    const { data: profiles, error: profileError } =
      await supabaseAdmin
        .from('profiles')
        .select('id, role')
        .eq('company_id', companyId)
        .in('role', ['super_admin', 'tenant_admin', 'employee'])

    if (profileError) {
      console.error('Profile fetch error:', profileError)
      return NextResponse.json(
        { error: profileError.message },
        { status: 500 }
      )
    }

    if (!profiles?.length) {
      return NextResponse.json({
        success: true,
        count: 0,
        message: 'No notification recipients found',
      })
    }

    const names = Array.isArray(leadNames)
      ? leadNames.join(', ')
      : String(leadNames)

    const notificationRows = profiles.map((profile) => ({
      company_id: companyId,
      user_id: profile.id,
      type: 'lead_assigned',
      title: 'New Lead Added',
      message: `${names} - New lead added to GK CRM`,
      link: '/dashboard/industries/interior-design/new-leads',
      is_read: false,
    }))

    const { error: insertError } = await supabaseAdmin
      .from('notifications')
      .insert(notificationRows)

    if (insertError) {
      console.error('Notification insert error:', insertError)
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      count: notificationRows.length,
      message: 'Notifications sent successfully',
    })
  } catch (error) {
    console.error('Lead notification API error:', error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
