import type { ReactNode } from 'react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowUpRight,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Coffee,
  LayoutDashboard,
  LogIn,
  LogOut,
  MapPin,
  Palmtree,
  Timer,
  type LucideIcon,
} from 'lucide-react'
import { AttendanceMarkButton } from '@/components/employee/attendance-mark-button'
import { PunchCard } from '@/components/employee/punch-card'
import { HomeTabs } from '@/components/employee/home-tabs'

export const dynamic = 'force-dynamic'

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const TZ = 'Asia/Kolkata'
const WORKDAY_MINUTES = 8 * 60

function getGreeting() {
  const hour = Number(
    new Intl.DateTimeFormat('en-IN', { hour: 'numeric', hourCycle: 'h23', timeZone: TZ }).format(new Date())
  )
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

const fmtTime = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: TZ })
    : null

function workedMinutes(checkIn?: string, checkOut?: string) {
  if (!checkIn) return 0
  const end = checkOut ? new Date(checkOut) : new Date()
  const diff = end.getTime() - new Date(checkIn).getTime()
  return diff > 0 ? Math.floor(diff / 60000) : 0
}

const fmtDuration = (minutes: number) => `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`

/* -------------------------------------------------------------------------- */
/*  Presentational components                                                 */
/* -------------------------------------------------------------------------- */

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5 ${className}`}>
      {children}
    </section>
  )
}

function CardTitle({
  icon: Icon,
  tone,
  title,
  right,
}: {
  icon: LucideIcon
  tone: string
  title: string
  right?: ReactNode
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>
          <Icon size={18} />
        </div>
        <h2 className="text-sm font-bold text-slate-900 sm:text-base">{title}</h2>
      </div>
      {right}
    </div>
  )
}

function OverviewTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon
  label: string
  value: string
  tone: string
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-3 ring-1 sm:p-4 ${tone}`}>
      <Icon size={18} className="mb-2 opacity-80" />
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70 sm:text-[11px]">{label}</p>
      <p className="mt-0.5 text-sm font-bold capitalize leading-tight sm:text-base">{value}</p>
    </div>
  )
}

function TimelineItem({
  icon: Icon,
  title,
  time,
  note,
  dot,
  last = false,
}: {
  icon: LucideIcon
  title: string
  time: string | null
  note?: string | null
  dot: string | null
  last?: boolean
}) {
  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      {!last && <span className="absolute left-4 top-9 h-[calc(100%-2rem)] w-px -translate-x-1/2 bg-slate-200" />}

      <span
        className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          dot ?? 'bg-slate-100 text-slate-400'
        }`}
      >
        <Icon size={15} />
      </span>

      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          <span className={`text-sm font-bold ${time ? 'text-slate-900' : 'text-slate-300'}`}>{time ?? '--:--'}</span>
        </div>

        {note && (
          <p className="mt-1 flex items-start gap-1 text-xs leading-snug text-slate-500">
            <MapPin size={12} className="mt-0.5 shrink-0 text-slate-400" />
            <span className="break-words">{note}</span>
          </p>
        )}
      </div>
    </li>
  )
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

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
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-indigo-50/70 via-slate-50 to-white px-4">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-lg">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-2xl">⚠️</div>
            <h2 className="mb-2 text-lg font-bold text-slate-900">Employee Profile Not Found</h2>
            <p className="mb-4 text-sm text-slate-500">
              Your account exists but employee profile is missing. Contact your admin.
            </p>
            <p className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">Email: {user.email}</p>
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

  // Leave-type tiles with usage bars
  const leaves = leaveBalance ? [
    { type: 'CL', label: 'Casual', total: leaveBalance.cl_total, used: leaveBalance.cl_used, tile: 'from-purple-50 to-white ring-purple-100', text: 'text-purple-700', bar: 'bg-purple-500', track: 'bg-purple-100' },
    { type: 'SL', label: 'Sick',   total: leaveBalance.sl_total, used: leaveBalance.sl_used, tile: 'from-blue-50 to-white ring-blue-100',     text: 'text-blue-700',   bar: 'bg-blue-500',   track: 'bg-blue-100' },
    { type: 'EL', label: 'Earned', total: leaveBalance.el_total, used: leaveBalance.el_used, tile: 'from-emerald-50 to-white ring-emerald-100', text: 'text-emerald-700', bar: 'bg-emerald-500', track: 'bg-emerald-100' },
  ] : []

  // Derived values for the day view
  const minutes = workedMinutes(todayAttendance?.check_in, todayAttendance?.check_out)
  const progress = Math.min(100, (minutes / WORKDAY_MINUTES) * 100)
  const pendingCount = pendingLeaves?.length ?? 0
  const firstName = employee.full_name?.split(' ')[0] ?? 'there'

  const dayState = isCheckedOut ? 'Day completed' : isCheckedIn ? 'Checked in' : 'Not punched in'
  const dayStateTone = isCheckedOut
    ? 'bg-slate-100 text-slate-600'
    : isCheckedIn
      ? 'bg-emerald-50 text-emerald-700'
      : 'bg-amber-50 text-amber-700'

  const todayLabel = new Date().toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: TZ,
  })

  return (
    <div className="min-h-screen overflow-y-auto bg-gradient-to-b from-indigo-50/70 via-slate-50 to-white">
      <div className="mx-auto w-full max-w-2xl px-4 py-5">

        {/* ── GREETING ── */}
        <header className="mb-5 flex items-end justify-between gap-3 px-1">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-500">{getGreeting()} 👋</p>
            <h1 className="truncate bg-gradient-to-r from-slate-900 via-indigo-800 to-blue-700 bg-clip-text text-2xl font-extrabold tracking-tight text-transparent sm:text-3xl">
              {firstName}
            </h1>
          </div>

          <span className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm">
            {todayLabel}
          </span>
        </header>

        {/* ── PUNCH CARD (photo, breaks, punch in/out/working hrs) + TABS ── */}
        <div className="overflow-hidden rounded-3xl border border-slate-200/80 shadow-lg shadow-indigo-100/60">
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

          <HomeTabs />
        </div>

        <div className="mt-5 space-y-5">

          {/* ── TODAY OVERVIEW ── */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            <OverviewTile
              icon={CheckCircle2}
              label="Attendance"
              value={todayAttendance ? (todayAttendance.status ?? 'Marked') : 'Not marked'}
              tone={todayAttendance ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' : 'bg-slate-100 text-slate-500 ring-slate-200'}
            />
            <OverviewTile
              icon={ClipboardList}
              label="Work report"
              value={todayReport ? 'Submitted' : 'Pending'}
              tone={todayReport ? 'bg-blue-50 text-blue-700 ring-blue-100' : 'bg-amber-50 text-amber-700 ring-amber-100'}
            />
            <OverviewTile
              icon={Palmtree}
              label="Leaves"
              value={pendingCount > 0 ? `${pendingCount} pending` : 'None pending'}
              tone={pendingCount > 0 ? 'bg-violet-50 text-violet-700 ring-violet-100' : 'bg-slate-100 text-slate-500 ring-slate-200'}
            />
          </div>

          {/* ── TODAY'S TIMELINE ── */}
          <Card>
            <CardTitle
              icon={Timer}
              tone="bg-indigo-50 text-indigo-600"
              title="Today's progress"
              right={
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${dayStateTone}`}>{dayState}</span>
              }
            />

            <div className="mb-5">
              <div className="mb-1.5 flex items-baseline justify-between">
                <p className="text-2xl font-extrabold tracking-tight text-slate-900">{fmtDuration(minutes)}</p>
                <p className="text-xs font-medium text-slate-400">of 8h target · {Math.round(progress)}%</p>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-400 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <ol>
              <TimelineItem
                icon={LogIn}
                title="Check in"
                time={fmtTime(todayAttendance?.check_in)}
                note={checkInAddress}
                dot={isCheckedIn ? 'bg-emerald-100 text-emerald-700' : null}
              />

              {activeBreak && (
                <TimelineItem
                  icon={Coffee}
                  title={`On break · ${activeBreak.break_type}`}
                  time={fmtTime(activeBreak.start_time)}
                  dot="bg-amber-100 text-amber-700"
                />
              )}

              <TimelineItem
                icon={LogOut}
                title="Check out"
                time={fmtTime(todayAttendance?.check_out)}
                note={checkOutAddress}
                dot={isCheckedOut ? 'bg-rose-100 text-rose-600' : null}
                last
              />
            </ol>
          </Card>

          {/* ── MARK ATTENDANCE ── */}
          <Card>
            <CardTitle icon={CalendarCheck} tone="bg-emerald-50 text-emerald-600" title="Mark attendance" />
            <AttendanceMarkButton
              employeeId={employee.id}
              isCheckedIn={isCheckedIn}
              isCheckedOut={isCheckedOut}
              attendanceId={todayAttendance?.id ?? null}
              checkInTimeISO={todayAttendance?.check_in ?? null}
              checkOutTimeISO={todayAttendance?.check_out ?? null}
            />
          </Card>

          {/* ── LEAVE LEDGER ── */}
          {leaveBalance && (
            <Card>
              <CardTitle
                icon={Palmtree}
                tone="bg-purple-50 text-purple-600"
                title={`Leave ledger — ${new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: TZ })}`}
                right={
                  pendingCount > 0 ? (
                    <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                      {pendingCount} pending
                    </span>
                  ) : undefined
                }
              />

              <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                {leaves.map((l) => {
                  const remaining = l.total - l.used
                  const isNegative = remaining < 0
                  const usedPct = l.total > 0 ? Math.min(100, (l.used / l.total) * 100) : isNegative ? 100 : 0

                  return (
                    <div
                      key={l.type}
                      className={`rounded-2xl bg-gradient-to-b p-3 text-center ring-1 ${
                        isNegative ? 'from-rose-50 to-white ring-rose-100' : l.tile
                      }`}
                    >
                      <p className={`text-2xl font-extrabold ${isNegative ? 'text-rose-700' : l.text}`}>{remaining}</p>
                      <p className={`text-xs font-bold ${isNegative ? 'text-rose-600' : l.text}`}>{l.type}</p>
                      <p className="text-[10px] text-slate-400">{l.label}</p>

                      <div className={`mt-2 h-1.5 w-full overflow-hidden rounded-full ${isNegative ? 'bg-rose-100' : l.track}`}>
                        <div
                          className={`h-full rounded-full ${isNegative ? 'bg-rose-500' : l.bar}`}
                          style={{ width: `${usedPct}%` }}
                        />
                      </div>
                      <p className="mt-1.5 text-[11px] font-medium text-slate-500">{l.used}/{l.total} used</p>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {/* ── CRM PORTAL + SIGN OUT ── */}
          <div className="space-y-3">
            {hasCRMAccess && (
              <Link
                href="/dashboard"
                className="group relative isolate flex items-center gap-3 overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-blue-600 to-blue-700 px-4 py-4 shadow-lg shadow-blue-200 transition hover:shadow-xl"
              >
                <div className="pointer-events-none absolute -right-8 -top-10 -z-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
                  <LayoutDashboard className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white">CRM Portal</p>
                  <p className="truncate text-xs text-blue-100">Go to business dashboard</p>
                </div>
                <ArrowUpRight className="h-5 w-5 shrink-0 text-blue-100 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            )}

            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-100 bg-white py-3.5 text-sm font-semibold text-rose-600 shadow-sm transition hover:bg-rose-50"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </form>
          </div>
        </div>
      </div>
      <div className="h-24" />
    </div>
  )
}