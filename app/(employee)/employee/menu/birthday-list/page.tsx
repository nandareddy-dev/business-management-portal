import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Cake } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface EmployeeBirthday {
  id: string
  full_name: string
  designation?: string
  date_of_birth: string
}

// IST-safe "today" — avoids server-timezone dependent date math (previous
// pages in this project had the same UTC/IST drift issue).
function getISTDateParts(d: Date) {
  const istStr = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) // "YYYY-MM-DD"
  const [year, month, date] = istStr.split('-').map(Number)
  return { year, month: month - 1, date } // month is 0-indexed to match Date semantics
}

export default async function BirthdayListPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // SECURITY: resolve the caller's own company_id first, then scope the
  // employees query to it explicitly. Never query `employees` company-wide
  // without a company_id filter — RLS may not be the only thing standing
  // between tenants, and this keeps the query safe even if RLS has a gap.
  const { data: employeeRow, error: employeeErr } = await supabase
    .from('employees')
    .select('company_id')
    .eq('email', user.email!)
    .single()

  if (employeeErr || !employeeRow) redirect('/login')

  const { data: employees, error: employeesErr } = await supabase
    .from('employees')
    .select('id, full_name, designation, date_of_birth')
    .eq('company_id', employeeRow.company_id)
    .not('date_of_birth', 'is', null)
    .eq('is_active', true)

  const { year: todayYear, month: todayMonth, date: todayDate } = getISTDateParts(new Date())
  const today = new Date(todayYear, todayMonth, todayDate)

  // Sort by "days until next birthday" — ignoring year, wrapping to next year if already passed.
  const withNextOccurrence = (employees ?? []).map((e: EmployeeBirthday) => {
    const dob = new Date(e.date_of_birth)
    const month = dob.getMonth()
    const date = dob.getDate()
    let daysUntil = 0
    const thisYearBday = new Date(todayYear, month, date)
    if (thisYearBday < today) {
      const nextYearBday = new Date(todayYear + 1, month, date)
      daysUntil = Math.ceil((nextYearBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    } else {
      daysUntil = Math.ceil((thisYearBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    }
    return { ...e, month, date, daysUntil }
  })

  withNextOccurrence.sort((a, b) => a.daysUntil - b.daysUntil)

  const todayList = withNextOccurrence.filter(e => e.daysUntil === 0)
  const upcoming = withNextOccurrence.filter(e => e.daysUntil > 0)

  const fmtDate = (month: number, date: number) =>
    new Date(2000, month, date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })

  const initials = (name: string) =>
    name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto py-4 px-4">

        <Link href="/employee/menu" className="text-gray-400 text-xs flex items-center gap-1.5 mb-3 w-fit hover:text-gray-600 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to menu
        </Link>
        <h1 className="text-xl font-medium text-gray-900">Birthday list</h1>
        <p className="text-xs text-gray-400 mt-0.5 mb-5">Celebrate the team, one birthday at a time</p>

        {employeesErr && (
          <div className="mb-4 px-4 py-3 rounded-xl text-xs bg-rose-50 border border-rose-200 text-rose-600">
            ⚠ Couldn&apos;t load birthdays right now. Please refresh the page.
          </div>
        )}

        {todayList.length > 0 && (
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <Cake className="w-4 h-4 text-rose-500" />
              <p className="text-sm font-medium text-gray-500">Today</p>
            </div>
            <div className="space-y-2">
              {todayList.map((e) => (
                <div key={e.id} className="bg-rose-50 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-rose-100 flex items-center justify-center text-sm font-medium text-rose-700 flex-shrink-0">
                    {initials(e.full_name)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-rose-700">{e.full_name}</p>
                    <p className="text-xs text-rose-500">{e.designation ?? 'Employee'} · Happy birthday!</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 mb-3">
          <Cake className="w-4 h-4 text-gray-400" />
          <p className="text-sm font-medium text-gray-500">Upcoming</p>
        </div>

        {upcoming.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <p className="text-sm text-gray-400">No upcoming birthdays on file yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {upcoming.map((e, i) => (
              <div key={e.id} className={`flex items-center gap-3 px-4 py-3.5 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-xs font-medium text-purple-700 flex-shrink-0">
                  {initials(e.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{e.full_name}</p>
                  <p className="text-xs text-gray-400">{e.designation ?? 'Employee'}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-medium text-gray-700">{fmtDate(e.month, e.date)}</p>
                  <p className="text-[11px] text-gray-400">{e.daysUntil} {e.daysUntil === 1 ? 'day' : 'days'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="h-20" />
    </div>
  )
}