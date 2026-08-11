import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, ArrowUpRight, LogOut, MapPin, CheckCircle2, Clock3 } from 'lucide-react'
import { AttendanceMarkButton } from '@/components/employee/attendance-mark-button'
import { PunchCard } from '@/components/employee/punch-card'
import { HomeTabs } from '@/components/employee/home-tabs'

export const dynamic = 'force-dynamic'

interface Employee {
  id: string
  user_id?: string
  email?: string
  full_name?: string
  employee_code?: string
  employee_id?: string
  designation?: string
  department?: string
  permissions?: string[]
  photo_url?: string
}

interface Attendance {
  id: string
  check_in?: string
  check_out?: string
  check_in_address?: string
  check_out_address?: string
  status?: string
}

interface LeaveBalance {
  cl_total: number; cl_used: number
  sl_total: number; sl_used: number
  el_total: number; el_used: number
}

interface ActiveBreak {
  id: string
  break_type: string
  start_time: string
}

export default async function EmployeePortalPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let employee: Employee | null = null

  const { data: empByUserId } = await supabase
    .from('employees').select('*').eq('user_id', user.id).maybeSingle()

  if (empByUserId) {
    employee = empByUserId
  } else {
    const { data: empByEmail } = await supabase
      .from('employees').select('*').eq('email', user.email!).maybeSingle()
    if (empByEmail) {
      employee = empByEmail
      await supabase.from('employees').update({ user_id: user.id }).eq('id', empByEmail.id)
    }
  }

  if (!employee) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (profile?.role === 'employee') {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-8 max-w-sm w-full text-center shadow-sm">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Employee Profile Not Found</h2>
            <p className="text-sm text-gray-500 mb-4">Your account exists but employee profile is missing. Contact your admin.</p>
            <p className="text-xs text-gray-400">Email: {user.email}</p>
          </div>
        </div>
      )
    }
    redirect('/login')
  }

  const today = new Date().toISOString().split('T')[0]

  const [
    { data: todayAttendance },
    { data: leaveBalance },
    { data: pendingLeaves },
    { data: todayReport },
    { data: activeBreak },
  ] = await Promise.all([
    supabase.from('attendance').select('*').eq('employee_id', employee.id).eq('attendance_date', today).maybeSingle() as unknown as Promise<{ data: Attendance | null }>,
    supabase.from('leave_balances').select('*').eq('employee_id', employee.id).eq('year', new Date().getFullYear()).eq('month', new Date().getMonth() + 1).maybeSingle() as unknown as Promise<{ data: LeaveBalance | null }>,
    supabase.from('leave_applications').select('*').eq('employee_id', employee.id).eq('status', 'pending'),
    supabase.from('work_reports').select('*').eq('employee_id', employee.id).eq('report_date', today).maybeSingle(),
    supabase.from('breaks').select('id, break_type, start_time').eq('employee_id', employee.id).eq('break_date', today).is('end_time', null).maybeSingle() as unknown as Promise<{ data: ActiveBreak | null }>,
  ])

  const VALID_MODULES = ['pipeline', 'projects', 'hr', 'finance']
  const hasCRMAccess = Array.isArray(employee.permissions) &&
    employee.permissions.some((p: string) => VALID_MODULES.includes(p))

  const isCheckedIn  = !!todayAttendance?.check_in
  const isCheckedOut = !!todayAttendance?.check_out
  const checkInAddress  = todayAttendance?.check_in_address ?? null
  const checkOutAddress = todayAttendance?.check_out_address ?? null

  function calcWorkingHrs(checkIn?: string, checkOut?: string) {
    if (!checkIn) return '00:00'
    const end = checkOut ? new Date(checkOut) : new Date()
    const diffMs = end.getTime() - new Date(checkIn).getTime()
    if (diffMs <= 0) return '00:00'
    const h = Math.floor(diffMs / 3600000), m = Math.floor((diffMs % 3600000) / 60000)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  // Colorful leave-type tiles instead of rings
  const leaves = leaveBalance ? [
    { type: 'CL', label: 'Casual', total: leaveBalance.cl_total, used: leaveBalance.cl_used, bg: 'bg-purple-50', text: 'text-purple-700', sub: 'text-purple-500' },
    { type: 'SL', label: 'Sick',   total: leaveBalance.sl_total, used: leaveBalance.sl_used, bg: 'bg-blue-50',   text: 'text-blue-700',   sub: 'text-blue-500' },
    { type: 'EL', label: 'Earned', total: leaveBalance.el_total, used: leaveBalance.el_used, bg: 'bg-emerald-50', text: 'text-emerald-700', sub: 'text-emerald-500' },
  ] : []

  return (
    <div className="min-h-screen bg-gray-50 overflow-y-auto">
      <div className="max-w-2xl mx-auto w-full px-4 py-4">

        {/* ── PUNCH CARD (photo, breaks, punch in/out/working hrs) ── */}
        <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100">
          <PunchCard
            employeeId={employee.id}
            fullName={employee.full_name}
            designation={employee.designation}
            photoUrl={employee.photo_url}
            checkIn={todayAttendance?.check_in}
            checkOut={todayAttendance?.check_out}
            workingHrs={calcWorkingHrs(todayAttendance?.check_in, todayAttendance?.check_out)}
            activeBreak={activeBreak}
          />

          {/* ── TABS: Communication / Offers / Life at GK ── */}
          <HomeTabs />
        </div>

        <div className="mt-4 space-y-4">

          {/* ── MARK ATTENDANCE ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-sm font-medium text-gray-500 mb-3">Attendance</p>
            {(checkInAddress || checkOutAddress) && (
              <div className="flex flex-wrap gap-x-6 gap-y-1 mb-3">
                {checkInAddress && (
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-600" /> In: {checkInAddress}
                  </p>
                )}
                {checkOutAddress && (
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-rose-500" /> Out: {checkOutAddress}
                  </p>
                )}
              </div>
            )}
            <AttendanceMarkButton
              employeeId={employee.id}
              isCheckedIn={isCheckedIn}
              isCheckedOut={isCheckedOut}
              attendanceId={todayAttendance?.id ?? null}
              checkInTimeISO={todayAttendance?.check_in ?? null}
              checkOutTimeISO={todayAttendance?.check_out ?? null}
            />
          </div>

          {/* ── TODAY STATUS (colorful pair) ── */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`rounded-2xl p-4 ${todayAttendance ? 'bg-emerald-50' : 'bg-gray-100'}`}>
              <p className={`text-xs mb-1 ${todayAttendance ? 'text-emerald-600' : 'text-gray-400'}`}>
                {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
              </p>
              <p className={`text-sm font-medium capitalize flex items-center gap-1.5 ${todayAttendance ? 'text-emerald-700' : 'text-gray-500'}`}>
                <CheckCircle2 className="w-4 h-4" />
                {todayAttendance ? todayAttendance.status : 'Not marked'}
              </p>
            </div>
            <div className={`rounded-2xl p-4 ${todayReport ? 'bg-blue-50' : 'bg-amber-50'}`}>
              <p className={`text-xs mb-1 ${todayReport ? 'text-blue-600' : 'text-amber-600'}`}>Work report</p>
              <p className={`text-sm font-medium flex items-center gap-1.5 ${todayReport ? 'text-blue-700' : 'text-amber-700'}`}>
                <Clock3 className="w-4 h-4" />
                {todayReport ? 'Submitted' : 'Pending'}
              </p>
            </div>
          </div>

          {/* ── LEAVE LEDGER (colorful tiles) ── */}
          {leaveBalance && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-baseline justify-between mb-3">
                <p className="text-sm font-medium text-gray-500">
                  Leave ledger — {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                </p>
                {((pendingLeaves?.length) ?? 0) > 0 && (
                  <p className="text-xs text-amber-600 font-medium">{pendingLeaves?.length} pending</p>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {leaves.map((l) => {
                  const remaining = l.total - l.used
                  const isNegative = remaining < 0
                  return (
                    <div key={l.type} className={`rounded-xl p-3 text-center ${isNegative ? 'bg-rose-50' : l.bg}`}>
                      <p className={`text-lg font-semibold ${isNegative ? 'text-rose-700' : l.text}`}>{remaining}</p>
                      <p className={`text-xs font-medium mt-0.5 ${isNegative ? 'text-rose-600' : l.text}`}>{l.type}</p>
                      <p className={`text-[11px] ${isNegative ? 'text-rose-500' : l.sub}`}>{l.used}/{l.total} used</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── CRM PORTAL + SIGN OUT ── */}
          <div className="space-y-2">
            {hasCRMAccess && (
              <Link href="/dashboard"
                className="flex items-center gap-3 px-4 py-3.5 bg-blue-600 hover:bg-blue-700 rounded-2xl transition-colors">
                <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
                  <LayoutDashboard className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">CRM Portal</p>
                  <p className="text-xs text-blue-100 truncate">Go to business dashboard</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-blue-100 flex-shrink-0" />
              </Link>
            )}

            <form action="/api/auth/signout" method="POST">
              <button type="submit"
                className="w-full py-3 rounded-2xl border border-gray-200 text-sm text-rose-600 hover:bg-rose-50 transition-colors flex items-center justify-center gap-2">
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </form>
          </div>
        </div>
      </div>
      <div className="h-20" />
    </div>
  )
}