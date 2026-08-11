import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, User, Mail, Phone, Building, Briefcase, Calendar, Landmark, CreditCard, ShieldCheck } from 'lucide-react'
import { SalaryReveal } from '@/components/employee/salary-reveal'
import { ChangePasswordModal } from '@/components/employee/change-password-modal'

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto py-4 px-4">

        <Link href="/employee" className="text-gray-400 text-xs flex items-center gap-1.5 mb-3 w-fit hover:text-gray-600 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to portal
        </Link>
        <h1 className="text-xl font-medium text-gray-900">My profile</h1>
        <p className="text-xs text-gray-400 mt-0.5 mb-5">Personal and employment details</p>

        <div className="space-y-4">

          {/* Identity */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center text-lg font-medium text-blue-700 flex-shrink-0">
              {initials}
            </div>
            <div>
              <h2 className="text-base font-medium text-gray-900">{employee.full_name}</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {employee.designation ?? 'Employee'} · {employee.department ?? '—'}
              </p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {employee.employee_code ?? employee.employee_id ?? 'N/A'}
                </span>
                {employee.is_active && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Personal information */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-sm font-medium text-gray-500 px-4 pt-4 pb-1.5">Personal information</p>
            {[
              { label: 'Full name', value: employee.full_name,   Icon: User },
              { label: 'Email',     value: employee.email,        Icon: Mail },
              { label: 'Phone',     value: employee.mobile ?? '—', Icon: Phone },
            ].map((item, i) => (
              <div key={item.label} className={`flex items-center justify-between px-4 py-3 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                <span className="text-xs text-gray-400 flex items-center gap-1.5">
                  <item.Icon className="w-3.5 h-3.5" /> {item.label}
                </span>
                <span className="text-sm text-gray-900 max-w-[220px] text-right truncate">{item.value}</span>
              </div>
            ))}
          </div>

          {/* Employment details */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-sm font-medium text-gray-500 px-4 pt-4 pb-1.5">Employment details</p>
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
              <div key={item.label} className={`flex items-center justify-between px-4 py-3 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                <span className="text-xs text-gray-400 flex items-center gap-1.5">
                  <item.Icon className="w-3.5 h-3.5" /> {item.label}
                </span>
                <span className="text-sm text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>

          {/* Bank, PF & ESIC details */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-sm font-medium text-gray-500 px-4 pt-4 pb-1.5">Bank, PF and ESIC details</p>
            {[
              { label: 'Bank name',      value: employee.bank_name      ?? '—', Icon: Landmark },
              { label: 'Account number', value: employee.account_number ?? '—', Icon: CreditCard },
              { label: 'IFSC code',      value: employee.ifsc_code      ?? '—', Icon: Landmark },
              { label: 'PF number',      value: employee.pf_number      ?? '—', Icon: ShieldCheck },
              { label: 'UAN number',     value: employee.uan_number     ?? '—', Icon: ShieldCheck },
              { label: 'ESIC number',    value: employee.esic_number    ?? '—', Icon: ShieldCheck },
            ].map((item, i) => (
              <div key={item.label} className={`flex items-center justify-between px-4 py-3 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                <span className="text-xs text-gray-400 flex items-center gap-1.5">
                  <item.Icon className="w-3.5 h-3.5" /> {item.label}
                </span>
                <span className="text-sm text-gray-900 max-w-[220px] text-right truncate">{item.value}</span>
              </div>
            ))}
          </div>

          {/* Salary — masked by default, eye-toggle to reveal */}
          {employee.salary && (
            <SalaryReveal amount={Number(employee.salary)} />
          )}

          {/* Security */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-sm font-medium text-gray-500 mb-3">Security</p>
            <ChangePasswordModal />
          </div>

          <Link href="/employee"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border border-gray-200 text-sm text-gray-500 hover:bg-white hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to dashboard
          </Link>

        </div>
      </div>
      <div className="h-20" />
    </div>
  )
}