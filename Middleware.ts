import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const CRM_MODULES = ['pipeline', 'projects', 'hr', 'finance']

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value
        },

        set(name, value, options) {
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },

        remove(name, options) {
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // ─────────────────────────────────────────────────────────────
  // Get authenticated user
  // ─────────────────────────────────────────────────────────────

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // ─────────────────────────────────────────────────────────────
  // Public pages
  // ─────────────────────────────────────────────────────────────

  const publicPaths = [
    '/login',
    '/signup',
    '/onboarding',
    '/access-denied',
  ]

  if (!user) {
    if (publicPaths.some((p) => path.startsWith(p))) {
      return response
    }

    if (path.startsWith('/subscription/renew')) {
      return response
    }

    return NextResponse.redirect(
      new URL('/login', request.url)
    )
  }

  // ─────────────────────────────────────────────────────────────
  // Get user profile
  // ─────────────────────────────────────────────────────────────

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  const role = profile?.role
  const companyId = profile?.company_id

  // ─────────────────────────────────────────────────────────────
  // EMPLOYEE ACCESS CONTROL
  //
  // Employee record is NOT deleted.
  //
  // status = TRUE
  //   → Employee page allowed
  //
  // status = FALSE
  //   → Employee page BLOCKED
  //   → CRM pages BLOCKED
  //   → Access Denied page shown
  // ─────────────────────────────────────────────────────────────

  if (role === 'employee') {
    const isEmployeePage =
      path === '/employee' ||
      path.startsWith('/employee/')

    const isCRMPath =
      path.startsWith('/dashboard') ||
      path.startsWith('/crm') ||
      path.startsWith('/billing') ||
      path.startsWith('/hr') ||
      path.startsWith('/reports') ||
      path.startsWith('/settings')

    // ─────────────────────────────────────────────────────────
    // Get employee record
    // ─────────────────────────────────────────────────────────

    const { data: employee } = await supabase
      .from('employees')
      .select('status, permissions')
      .eq('user_id', user.id)
      .maybeSingle()

    // ─────────────────────────────────────────────────────────
    // INACTIVE / DISABLED EMPLOYEE
    //
    // Employee page also blocked now.
    // ─────────────────────────────────────────────────────────

    if (
      isEmployeePage ||
      isCRMPath
    ) {
      if (!employee || employee.status !== true) {
        return NextResponse.redirect(
          new URL('/access-denied', request.url)
        )
      }
    }

    // ─────────────────────────────────────────────────────────
    // CRM PERMISSION CHECK
    //
    // Active employee can enter CRM only if they
    // have at least one CRM module permission.
    // ─────────────────────────────────────────────────────────

    if (isCRMPath) {
      const hasCRMAccess =
        Array.isArray(employee?.permissions) &&
        employee.permissions.some(
          (permission: string) =>
            CRM_MODULES.includes(permission)
        )

      if (!hasCRMAccess) {
        return NextResponse.redirect(
          new URL('/access-denied', request.url)
        )
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Super Admin → /admin/*
  // ─────────────────────────────────────────────────────────────

  if (
    role === 'super_admin' &&
    path.startsWith('/dashboard')
  ) {
    return NextResponse.redirect(
      new URL('/admin/dashboard', request.url)
    )
  }

  // ─────────────────────────────────────────────────────────────
  // Lifetime subscription
  //
  // Lifetime users cannot access subscription pages.
  // ─────────────────────────────────────────────────────────────

  if (
    path.startsWith('/subscription') &&
    companyId
  ) {
    const { data: company } = await supabase
      .from('companies')
      .select('plan')
      .eq('id', companyId)
      .single()

    if (company?.plan === 'lifetime') {
      return NextResponse.redirect(
        new URL(
          '/dashboard/industries/interior-design',
          request.url
        )
      )
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Dashboard / CRM paths
  // ─────────────────────────────────────────────────────────────

  const isDashboardPath =
    path.startsWith('/dashboard') ||
    path.startsWith('/crm') ||
    path.startsWith('/billing') ||
    path.startsWith('/hr') ||
    path.startsWith('/reports') ||
    path.startsWith('/settings')

  if (isDashboardPath && companyId) {
    const { data: company } = await supabase
      .from('companies')
      .select('plan')
      .eq('id', companyId)
      .single()

    // ─────────────────────────────────────────────────────────
    // Lifetime → no trial expiry check
    // ─────────────────────────────────────────────────────────

    if (company?.plan === 'lifetime') {
      return response
    }

    // ─────────────────────────────────────────────────────────
    // Get latest subscription
    // ─────────────────────────────────────────────────────────

    const { data: subscription } = await supabase
      .from('company_subscriptions')
      .select('status, trial_ends_at')
      .eq('company_id', companyId)
      .order('created_at', {
        ascending: false,
      })
      .limit(1)
      .single()

    if (subscription) {
      const isTrial =
        subscription.status === 'trial'

      const trialEnded =
        subscription.trial_ends_at
          ? new Date(subscription.trial_ends_at) <
            new Date()
          : false

      // ─────────────────────────────────────────────────────────
      // Trial expired
      // ─────────────────────────────────────────────────────────

      if (isTrial && trialEnded) {
        return NextResponse.redirect(
          new URL(
            '/subscription/renew',
            request.url
          )
        )
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Allow request
  // ─────────────────────────────────────────────────────────────

  return response
}

// ─────────────────────────────────────────────────────────────
// Middleware matcher
// ─────────────────────────────────────────────────────────────

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/crm/:path*',
    '/billing/:path*',
    '/hr/:path*',
    '/reports/:path*',
    '/settings/:path*',
    '/employee/:path*',
    '/admin/:path*',
    '/login',
    '/signup',
    '/subscription/:path*',
    '/access-denied',
  ],
}