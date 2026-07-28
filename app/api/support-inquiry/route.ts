// app/api/support-inquiry/route.ts
// Handles the landing page "Support" form submission.
// Accepts messages from ANY email — but tags whether the sender is a
// registered CRM user (is_customer) so admin can see the distinction.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, message } = body

    // Basic validation
    if (!name || !email || !message) {
      return NextResponse.json(
        { success: false, error: 'Name, email and message are required' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // ── Check if this email belongs to a signed-up CRM user ──
    // This is now informational only — it does NOT block the submission.
    const { data: userExists, error: checkError } = await supabaseAdmin.rpc(
      'check_user_email_exists',
      { check_email: email.trim().toLowerCase() }
    )

    if (checkError) {
      // Don't block the submission if this check fails — just log it
      console.error('Email check error (non-blocking):', checkError)
    }

    // Insert into Supabase — everyone gets through, tagged with is_customer
    const { error } = await supabaseAdmin.from('support_inquiries').insert({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      message: message.trim(),
      status: 'new',
      is_customer: Boolean(userExists),
      created_at: new Date().toISOString(),
    })

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to save inquiry' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Support inquiry error:', err)
    return NextResponse.json(
      { success: false, error: 'Something went wrong' },
      { status: 500 }
    )
  }
}