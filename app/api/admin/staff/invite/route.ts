import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// ⚠️ Service Role Key — NEVER expose to client. Server-side only.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      fullName, email, password, role, designation,
      department, permissions, companyId, employeeCode,
    } = body

    if (!fullName || !email || !password || !companyId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 1. Create the auth user (auto-confirmed, no email verification needed)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: role || 'employee' },
    })

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message || 'Failed to create user' }, { status: 400 })
    }

    const userId = authData.user.id

    // 2. Create the profiles row — scoped to this company
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: userId,
      full_name: fullName,
      email,
      role: role || 'employee',
      company_id: companyId,
    })

    if (profileError) {
      // Rollback: remove the auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: 'Profile creation failed: ' + profileError.message }, { status: 400 })
    }

    // 2.5. Auto-generate employee code if not explicitly provided
    let finalEmployeeCode = employeeCode || null

    if (!finalEmployeeCode) {
      try {
        const { data: companyData } = await supabaseAdmin
          .from('companies')
          .select('name')
          .eq('id', companyId)
          .single()

        const companyNameLower = (companyData?.name || '').toLowerCase()
        const companyPrefix = companyNameLower.includes('interior') ? 'GKH'
          : companyNameLower.includes('digital') ? 'GKD'
          : 'GK'

        const deptPrefix = (department || 'STF').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'STF'

        const { count } = await supabaseAdmin
          .from('employees')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .ilike('employee_code', `${companyPrefix}-${deptPrefix}-%`)

        const nextNumber = String((count || 0) + 1).padStart(3, '0')
        finalEmployeeCode = `${companyPrefix}-${deptPrefix}-${nextNumber}`
      } catch (codeGenErr) {
        console.error('Employee code generation failed, proceeding without it:', codeGenErr)
        finalEmployeeCode = null
      }
    }

    // 3. Create the employees row — this is what was missing for existing staff
    const { error: employeeError } = await supabaseAdmin.from('employees').insert({
      user_id: userId,
      company_id: companyId,
      full_name: fullName,
      designation: designation || null,
      department: department || null,
      permissions: permissions || [],
      is_active: true,
      employee_code: finalEmployeeCode,
    })

    if (employeeError) {
      return NextResponse.json({ error: 'Employee record failed: ' + employeeError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, userId, employeeCode: finalEmployeeCode })
  } catch (err: any) {
    console.error('Staff invite error:', err)
    return NextResponse.json({ error: err.message || 'Something went wrong' }, { status: 500 })
  }
}