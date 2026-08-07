import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Update role, designation, department, permissions, or active status
export async function PATCH(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params
    const body = await req.json()
    const { role, designation, department, permissions, isActive, fullName } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Update profiles table (role, name)
    if (role !== undefined || fullName !== undefined) {
      const profileUpdate: Record<string, any> = {}
      if (role !== undefined) profileUpdate.role = role
      if (fullName !== undefined) profileUpdate.full_name = fullName

      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update(profileUpdate)
        .eq('id', userId)

      if (profileError) {
        return NextResponse.json({ error: 'Profile update failed: ' + profileError.message }, { status: 400 })
      }
    }

    // Update employees table (designation, department, permissions, active status)
    const employeeUpdate: Record<string, any> = {}
    if (designation !== undefined) employeeUpdate.designation = designation
    if (department !== undefined) employeeUpdate.department = department
    if (permissions !== undefined) employeeUpdate.permissions = permissions
    if (isActive !== undefined) employeeUpdate.is_active = isActive
    if (fullName !== undefined) employeeUpdate.full_name = fullName

    if (Object.keys(employeeUpdate).length > 0) {
      const { error: employeeError } = await supabaseAdmin
        .from('employees')
        .update(employeeUpdate)
        .eq('user_id', userId)

      if (employeeError) {
        return NextResponse.json({ error: 'Employee update failed: ' + employeeError.message }, { status: 400 })
      }
    }

    // If deactivating, also ban the auth user so they can't log in
    if (isActive === false) {
      await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: '876000h' }) // ~100 years
    } else if (isActive === true) {
      await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: 'none' })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Staff update error:', err)
    return NextResponse.json({ error: err.message || 'Something went wrong' }, { status: 500 })
  }
}

// Permanently delete a user (auth + profile + employee rows)
export async function DELETE(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    await supabaseAdmin.from('employees').delete().eq('user_id', userId)
    await supabaseAdmin.from('profiles').delete().eq('id', userId)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authError) {
      return NextResponse.json({ error: 'Auth deletion failed: ' + authError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Staff delete error:', err)
    return NextResponse.json({ error: err.message || 'Something went wrong' }, { status: 500 })
  }
}