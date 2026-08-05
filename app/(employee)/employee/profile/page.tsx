import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, User, Mail, Phone, Building, Briefcase, Calendar, Wallet, Landmark, CreditCard, ShieldCheck } from 'lucide-react'
import ChangePasswordCard from '@/components/settings/ChangePasswordCard'

export const dynamic = 'force-dynamic'

export default async function EmployeeProfilePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: employee } = await supabase
    .from('employees')
    .select('*')
    .eq('email', user.email!)
    .single()

  if (!employee) redirect('/employee')

  const initials = employee.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '?'

  const mono = { fontFamily: 'ui-monospace, "JetBrains Mono", monospace' }
  const serif = { fontFamily: 'Georgia, serif' }

  return (
    <div className="min-h-screen bg-[#EFE9DD]">
      <div className="max-w-3xl mx-auto py-4 px-3 lg:py-6 lg:px-6">

        <div className="relative border border-[#B8860B]/35">
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#B8860B] pointer-events-none z-10" />
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#B8860B] pointer-events-none z-10" />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#B8860B] pointer-events-none z-10" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#B8860B] pointer-events-none z-10" />

          {/* Hero */}
          <div className="bg-[#1C1712] px-6 py-5 lg:px-8 relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.05]" style={{
              backgroundImage: 'linear-gradient(#B8860B 1px, transparent 1px), linear-gradient(90deg, #B8860B 1px, transparent 1px)',
              backgroundSize: '28px 28px'
            }} />
            <div className="relative">
              <Link href="/employee" className="text-white/40 text-[10px] tracking-[1.5px] uppercase flex items-center gap-1.5 mb-3 w-fit hover:text-[#D4A537] transition-colors" style={mono}>
                <ArrowLeft className="w-3 h-3" /> Back to portal
              </Link>
              <h1 className="text-[24px] text-white italic" style={{ fontFamily: 'Georgia, serif', fontWeight: 500 }}>My Profile</h1>
              <p className="text-[11px] text-white/40 mt-1 tracking-wide" style={mono}>PERSONAL & EMPLOYMENT DETAILS</p>
            </div>
          </div>

          {/* §1 — Identity */}
          <div className="bg-[#FAF7F2] border-t border-[#B8860B]/25 px-6 py-5 lg:px-8 flex items-center gap-4">
            <div className="w-16 h-16 border-2 border-[#B8860B]/40 flex items-center justify-center text-[24px] text-[#8B6914] flex-shrink-0" style={serif}>
              {initials}
            </div>
            <div>
              <h2 className="text-[19px] text-[#1C1712]" style={serif}>{employee.full_name}</h2>
              <p className="text-[12px] text-[#9A8F82] mt-0.5">
                {employee.designation ?? 'Employee'} · {employee.department ?? '—'}
              </p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-[10px] tracking-[1px] font-medium text-[#8B6914] border border-[#B8860B]/40 px-2 py-0.5 uppercase" style={mono}>
                  {employee.employee_code ?? employee.employee_id ?? 'N/A'}
                </span>
                {employee.is_active && (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-emerald-700 uppercase tracking-[1px]" style={mono}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* §2 — Personal Information */}
          <div className="bg-white border-t border-[#B8860B]/25">
            <p className="text-[9px] tracking-[3px] text-[#8B6914] font-semibold uppercase px-6 lg:px-8 pt-4 pb-1.5" style={mono}>§2 — Personal Information</p>
            {[
              { label: 'Full name', value: employee.full_name,   Icon: User },
              { label: 'Email',     value: employee.email,        Icon: Mail },
              { label: 'Phone',     value: employee.mobile ?? '—', Icon: Phone },
            ].map((item, i) => (
              <div key={item.label} className={`flex items-center justify-between px-6 lg:px-8 py-3 ${i > 0 ? 'border-t border-[#F0EAE0]' : ''}`}>
                <span className="text-[11px] text-[#9A8F82] flex items-center gap-1.5">
                  <item.Icon className="w-3.5 h-3.5" /> {item.label}
                </span>
                <span className="text-[13px] text-[#1C1712] max-w-[240px] text-right truncate" style={serif}>{item.value}</span>
              </div>
            ))}
          </div>

          {/* §3 — Employment Details */}
          <div className="bg-[#FAF7F2] border-t border-[#B8860B]/25">
            <p className="text-[9px] tracking-[3px] text-[#8B6914] font-semibold uppercase px-6 lg:px-8 pt-4 pb-1.5" style={mono}>§3 — Employment Details</p>
            {[
              { label: 'Department',  value: employee.department  ?? '—', Icon: Building },
              { label: 'Designation', value: employee.designation ?? '—', Icon: Briefcase },
              {
                label: 'Join date',
                value: employee.join_date
                  ? new Date(employee.join_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                  : '—',
                Icon: Calendar,
              },
            ].map((item, i) => (
              <div key={item.label} className={`flex items-center justify-between px-6 lg:px-8 py-3 ${i > 0 ? 'border-t border-[#F0EAE0]' : ''}`}>
                <span className="text-[11px] text-[#9A8F82] flex items-center gap-1.5">
                  <item.Icon className="w-3.5 h-3.5" /> {item.label}
                </span>
                <span className="text-[13px] text-[#1C1712]" style={serif}>{item.value}</span>
              </div>
            ))}
          </div>

          {/* §4 — Bank, PF & ESIC Details */}
          <div className="bg-white border-t border-[#B8860B]/25">
            <p className="text-[9px] tracking-[3px] text-[#8B6914] font-semibold uppercase px-6 lg:px-8 pt-4 pb-1.5" style={mono}>§4 — Bank, PF & ESIC Details</p>
            {[
              { label: 'Bank name',      value: employee.bank_name      ?? '—', Icon: Landmark },
              { label: 'Account number', value: employee.account_number ?? '—', Icon: CreditCard },
              { label: 'IFSC code',      value: employee.ifsc_code      ?? '—', Icon: Landmark },
              { label: 'PF number',      value: employee.pf_number      ?? '—', Icon: ShieldCheck },
              { label: 'UAN number',     value: employee.uan_number     ?? '—', Icon: ShieldCheck },
              { label: 'ESIC number',    value: employee.esic_number    ?? '—', Icon: ShieldCheck },
            ].map((item, i) => (
              <div key={item.label} className={`flex items-center justify-between px-6 lg:px-8 py-3 ${i > 0 ? 'border-t border-[#F0EAE0]' : ''}`}>
                <span className="text-[11px] text-[#9A8F82] flex items-center gap-1.5">
                  <item.Icon className="w-3.5 h-3.5" /> {item.label}
                </span>
                <span className="text-[13px] text-[#1C1712] max-w-[240px] text-right truncate" style={serif}>{item.value}</span>
              </div>
            ))}
          </div>

          {/* §5 — Salary */}
          {employee.salary && (
            <div className="bg-[#1C1712] border-t border-[#B8860B]/25 px-6 lg:px-8 py-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] tracking-[1.5px] text-white/40 uppercase mb-1" style={mono}>Monthly Salary</p>
                <p className="text-[22px] text-[#D4A537]" style={serif}>
                  ₹{Number(employee.salary).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="w-9 h-9 rounded-full border border-[#B8860B]/40 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-[#B8860B]" />
              </div>
            </div>
          )}

          {/* §6 — Change Password */}
          <div className="bg-white border-t border-[#B8860B]/25 px-6 py-5 lg:px-8">
            <p className="text-[9px] tracking-[3px] text-[#8B6914] font-semibold mb-3 uppercase" style={mono}>§6 — Security</p>
            <ChangePasswordCard />
          </div>

          {/* Back link */}
          <Link href="/employee"
            className="flex items-center justify-center gap-2 w-full py-3 border-t border-[#B8860B]/25 text-[11px] tracking-[2px] uppercase text-[#9A8F82] hover:text-[#1C1712] hover:bg-[#FAF7F2] transition-colors"
            style={mono}>
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>

        </div>
      </div>
    </div>
  )
}