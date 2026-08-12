import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import nodemailer from 'nodemailer'

// Sends the logged-in employee an email with their salary, via Hostinger SMTP.
// Add these to .env.local:
//   SMTP_HOST=smtp.hostinger.com
//   SMTP_PORT=465
//   SMTP_USER=supportcrm@gkdigitalsolutions.in
//   SMTP_PASS=your_mailbox_password
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? 'smtp.hostinger.com',
  port: Number(process.env.SMTP_PORT ?? 465),
  secure: true, // true for port 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('full_name, salary')
      .eq('email', user.email)
      .single()

    if (empError || !employee) {
      // This log is the key diagnostic — if you see this for a specific
      // user, their auth email doesn't match employees.email exactly
      // (case, whitespace, or missing record). The email still sends
      // below, but with placeholder salary text.
      console.error(`[salary-email] Employee lookup failed for ${user.email}:`, empError)
    }

    const now = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    })

    const salaryDisplay = employee?.salary
      ? `₹${Number(employee.salary).toLocaleString('en-IN')}`
      : 'Not set — contact HR'

    const info = await transporter.sendMail({
      from: `"GK CRM" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: 'Your monthly salary details',
      html: `
        <p>Hi ${employee?.full_name ?? ''},</p>
        <p>Your monthly salary is: <strong>${salaryDisplay}</strong></p>
        <p style="color:#888;font-size:12px;">Requested from the GK CRM employee portal at ${now}. If this wasn't you, please contact HR immediately.</p>
      `,
    })

    // This confirms Hostinger SMTP accepted the mail for delivery.
    // If this log appears but the employee still says "no mail received",
    // the issue is on the receiving side (spam filter, wrong inbox) —
    // not in this code.
    console.log(`[salary-email] Sent to ${user.email}, messageId: ${info.messageId}`)

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[salary-email] Send failed:', e)
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 })
  }
}