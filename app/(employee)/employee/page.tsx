import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Calendar, FileText, Clock, User, LayoutDashboard, ArrowUpRight, LogOut, MapPin } from 'lucide-react'
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
        <div className="min-h-screen bg-[#F7F5F1] flex items-center justify-center px-4">
          <div className="bg-white border border-[#E2D9C8] rounded-2xl p-8 max-w-sm w-full text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-lg font-bold text-[#1C1712] mb-2">Employee Profile Not Found</h2>
            <p className="text-sm text-[#7A6E60] mb-4">Your account exists but employee profile is missing. Contact your admin.</p>
            <p className="text-xs text-[#9A8F82]">Email: {user.email}</p>
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

  const ringR = 22
  const ringC = 2 * Math.PI * ringR

  const leaves = leaveBalance ? [
    { type: 'CL', label: 'Casual', total: leaveBalance.cl_total, used: leaveBalance.cl_used, stroke: '#B8860B' },
    { type: 'SL', label: 'Sick',   total: leaveBalance.sl_total, used: leaveBalance.sl_used, stroke: '#8B6914' },
    { type: 'EL', label: 'Earned', total: leaveBalance.el_total, used: leaveBalance.el_used, stroke: '#6B5410' },
  ] : []

  const quickActions = [
    { label: 'My attendance', sub: 'View history',     icon: Clock,     href: '/employee/attendance' },
    { label: 'Apply leave',   sub: 'Request time off',  icon: Calendar,  href: '/employee/leave' },
    { label: 'Work report',   sub: 'Submit today',      icon: FileText,  href: '/employee/reports' },
    { label: 'My profile',    sub: 'View details',      icon: User,      href: '/employee/profile' },
  ]

  const mono = { fontFamily: 'ui-monospace, "JetBrains Mono", monospace' }

  return (
    <div className="min-h-screen bg-[#EFE9DD] overflow-y-auto">
      <div className="max-w-6xl mx-auto w-full px-3 py-3 lg:px-6 lg:py-4">

        <div className="relative border border-[#B8860B]/35">
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#B8860B] pointer-events-none z-10" />
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#B8860B] pointer-events-none z-10" />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#B8860B] pointer-events-none z-10" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#B8860B] pointer-events-none z-10" />

          {/* ── PUNCH CARD (photo, breaks, punch in/out/working hrs) ── */}
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

          {/* ── TABS: Communication / Offers / Life at Cogent ── */}
          <HomeTabs />

          <div className="lg:grid lg:grid-cols-[1fr_300px]">
            <div className="lg:border-r lg:border-[#B8860B]/25">

              {/* ── MARK ATTENDANCE (actual check-in mechanism) ── */}
              <div className="bg-[#FAF7F2] px-6 py-4 lg:px-8 lg:py-4 border-t border-[#B8860B]/25">
                <p className="text-[9px] tracking-[3px] text-[#8B6914] font-semibold mb-3 uppercase" style={mono}>
                  §1 — Mark Attendance
                </p>
                {(checkInAddress || checkOutAddress) && (
                  <div className="flex flex-wrap gap-x-6 gap-y-1 mb-3 lg:max-w-md">
                    {checkInAddress && (
                      <p className="text-[11px] text-[#9A8F82] flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-emerald-600" /> In: {checkInAddress}
                      </p>
                    )}
                    {checkOutAddress && (
                      <p className="text-[11px] text-[#9A8F82] flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-rose-500" /> Out: {checkOutAddress}
                      </p>
                    )}
                  </div>
                )}
                <div className="lg:max-w-md">
                  <AttendanceMarkButton
                    employeeId={employee.id}
                    isCheckedIn={isCheckedIn}
                    isCheckedOut={isCheckedOut}
                    attendanceId={todayAttendance?.id ?? null}
                    checkInTimeISO={todayAttendance?.check_in ?? null}
                    checkOutTimeISO={todayAttendance?.check_out ?? null}
                  />
                </div>
              </div>

              {/* ── TODAY STATUS ── */}
              <div className="bg-white px-6 py-4 lg:px-8 lg:py-4 border-t border-[#B8860B]/25">
                <p className="text-[9px] tracking-[3px] text-[#8B6914] font-semibold mb-3 uppercase" style={mono}>
                  §2 — {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
                <div className="grid grid-cols-2 lg:max-w-md">
                  <div className="pr-5 border-r border-[#E2D9C8]">
                    <p className="text-[10px] tracking-[1.5px] text-[#9A8F82] uppercase mb-1">Attendance</p>
                    <p className={`text-base capitalize ${todayAttendance ? 'text-emerald-700' : 'text-[#9A8F82]'}`} style={{ fontFamily: 'Georgia, serif' }}>
                      {todayAttendance ? todayAttendance.status : 'Not marked'}
                    </p>
                  </div>
                  <div className="pl-5">
                    <p className="text-[10px] tracking-[1.5px] text-[#9A8F82] uppercase mb-1">Work Report</p>
                    <p className={`text-base ${todayReport ? 'text-blue-700' : 'text-[#9A8F82]'}`} style={{ fontFamily: 'Georgia, serif' }}>
                      {todayReport ? 'Submitted' : 'Pending'}
                    </p>
                  </div>
                </div>
              </div>

              {/* ── LEAVE LEDGER ── */}
              {leaveBalance && (
                <div className="bg-[#FAF7F2] px-6 py-4 lg:px-8 lg:py-4 border-t border-[#B8860B]/25">
                  <div className="flex items-baseline justify-between mb-3">
                    <p className="text-[9px] tracking-[3px] text-[#8B6914] font-semibold uppercase" style={mono}>
                      §3 — Leave Ledger — {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                    </p>
                    {((pendingLeaves?.length) ?? 0) > 0 && (
                      <p className="text-[10px] text-amber-700 font-medium">{pendingLeaves?.length} pending</p>
                    )}
                  </div>
                  <div className="grid grid-cols-3 lg:max-w-md">
                    {leaves.map((l, i) => {
                      const remaining = l.total - l.used
                      const pctRaw = l.total > 0 ? remaining / l.total : 0
                      const pctClamped = Math.max(0, Math.min(1, pctRaw))
                      const offset = ringC * (1 - pctClamped)
                      const isNegative = remaining < 0
                      return (
                        <div key={l.type} className={`text-center ${i > 0 ? 'border-l border-[#E2D9C8]' : ''}`}>
                          <div className="relative w-11 h-11 mx-auto mb-1">
                            <svg className="w-11 h-11 -rotate-90" viewBox="0 0 52 52">
                              <circle cx="26" cy="26" r={ringR} fill="none" stroke="#E2D9C8" strokeWidth="2.5" />
                              <circle cx="26" cy="26" r={ringR} fill="none" stroke={isNegative ? '#DC2626' : l.stroke} strokeWidth="2.5"
                                strokeDasharray={ringC} strokeDashoffset={isNegative ? 0 : offset} strokeLinecap="round"
                                style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className={`text-sm font-medium ${isNegative ? 'text-rose-600' : 'text-[#1C1712]'}`} style={{ fontFamily: 'Georgia, serif' }}>{remaining}</span>
                            </div>
                          </div>
                          <p className="text-[9px] tracking-[1px] text-[#8B6914] font-medium uppercase">{l.type}</p>
                          <p className={`text-[9px] ${isNegative ? 'text-rose-600 font-medium' : 'text-[#9A8F82]'}`}>{l.used}/{l.total} used</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ══ SIDE COLUMN ══ */}
            <div className="flex flex-col">
              <div className="bg-white border-t border-[#B8860B]/25 flex-1">
                <p className="text-[9px] tracking-[3px] text-[#8B6914] font-semibold uppercase px-6 lg:px-5 pt-4 pb-1.5" style={mono}>
                  §4 — Quick Actions
                </p>
                {quickActions.map((a, i) => {
                  const Icon = a.icon
                  return (
                    <Link key={a.href} href={a.href}
                      className={`group flex items-center gap-3 px-6 lg:px-5 py-2.5 hover:bg-[#FAF7F2] transition-colors ${i > 0 ? 'border-t border-[#F0EAE0]' : ''}`}>
                      <div className="w-7 h-7 rounded-full border border-[#B8860B]/40 flex items-center justify-center flex-shrink-0 group-hover:border-[#B8860B] group-hover:bg-[#B8860B]/5 transition-colors">
                        <Icon className="w-3.5 h-3.5 text-[#8B6914]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-[#1C1712] truncate" style={{ fontFamily: 'Georgia, serif' }}>{a.label}</p>
                        <p className="text-[10px] text-[#9A8F82] truncate">{a.sub}</p>
                      </div>
                      <ArrowUpRight className="w-3.5 h-3.5 text-[#B8860B]/40 group-hover:text-[#B8860B] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all flex-shrink-0" />
                    </Link>
                  )
                })}
              </div>

              {hasCRMAccess && (
                <Link href="/dashboard"
                  className="flex items-center gap-3 px-6 lg:px-5 py-3 bg-[#1C1712] border-t border-[#B8860B]/25 hover:bg-[#252019] transition-colors">
                  <div className="w-7 h-7 rounded-full border border-[#B8860B]/40 flex items-center justify-center flex-shrink-0">
                    <LayoutDashboard className="w-3.5 h-3.5 text-[#B8860B]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-white" style={{ fontFamily: 'Georgia, serif' }}>CRM Portal</p>
                    <p className="text-[10px] text-white/35 truncate">Go to business dashboard</p>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#B8860B]/60 flex-shrink-0" />
                </Link>
              )}

              <form action="/api/auth/signout" method="POST" className="border-t border-[#B8860B]/25 flex-shrink-0">
                <button type="submit"
                  className="w-full py-2.5 text-[10px] tracking-[2px] uppercase text-[#9A8F82] hover:text-[#1C1712] hover:bg-[#FAF7F2] transition-colors flex items-center justify-center gap-2"
                  style={mono}>
                  <LogOut className="w-3.5 h-3.5" /> Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
      <div className="h-20" />
    </div>
  )
}