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

    // Correct column names matching the actual employees table schema —
    // office_name does not exist, using designation instead.
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('full_name, salary, employee_code, designation')
      .eq('email', user.email)
      .single()

    if (empError || !employee) {
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

    const employeeIdDisplay = employee?.employee_code ?? 'N/A'
    const designationDisplay = employee?.designation ?? 'N/A'

    const info = await transporter.sendMail({
      from: `"GK CRM" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: 'Your monthly salary details',
      html: `
        <p>Hi ${employee?.full_name ?? ''},</p>
        <table style="border-collapse:collapse;margin:12px 0;">
          <tr>
            <td style="padding:4px 12px 4px 0;color:#666;">Employee ID:</td>
            <td style="padding:4px 0;font-weight:600;">${employeeIdDisplay}</td>
          </tr>
          <tr>
            <td style="padding:4px 12px 4px 0;color:#666;">Email:</td>
            <td style="padding:4px 0;font-weight:600;">${user.email}</td>
          </tr>
          <tr>
            <td style="padding:4px 12px 4px 0;color:#666;">Designation:</td>
            <td style="padding:4px 0;font-weight:600;">${designationDisplay}</td>
          </tr>
          <tr>
            <td style="padding:4px 12px 4px 0;color:#666;">Monthly Salary:</td>
            <td style="padding:4px 0;font-weight:600;">${salaryDisplay}</td>
          </tr>
        </table>
        <p style="color:#888;font-size:12px;">Requested from the GK CRM employee portal at ${now}. If this wasn't you, please contact HR immediately.</p>
      `,
    })

    console.log(`[salary-email] Sent to ${user.email}, messageId: ${info.messageId}`)

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[salary-email] Send failed:', e)
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 })
  }
}