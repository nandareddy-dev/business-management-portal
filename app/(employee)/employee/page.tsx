import type { CSSProperties, ReactNode } from 'react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowUpRight,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Palmtree,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { AttendanceMarkButton } from '@/components/employee/attendance-mark-button'
import { PunchCard } from '@/components/employee/punch-card'
import { HomeTabs } from '@/components/employee/home-tabs'
import { WorkReportButton } from '@/components/employee/work-report-button'
import { LiveClock } from '@/components/employee/live-clock'
import { CountUp } from '@/components/employee/count-up'

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

function getGreeting() {
  const hour = Number(
    new Intl.DateTimeFormat('en-IN', { hour: 'numeric', hourCycle: 'h23', timeZone: TZ }).format(new Date())
  )
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function workedMinutes(checkIn?: string, checkOut?: string) {
  if (!checkIn) return 0
  const end = checkOut ? new Date(checkOut) : new Date()
  const diff = end.getTime() - new Date(checkIn).getTime()
  return diff > 0 ? Math.floor(diff / 60000) : 0
}

const fmtDuration = (minutes: number) => `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`

/* -------------------------------------------------------------------------- */
/*  Animations (CSS only, respects prefers-reduced-motion)                    */
/* -------------------------------------------------------------------------- */

const ANIMATIONS = `
@keyframes hp-rise   { from { opacity: 0; transform: translateY(22px) scale(.98) } to { opacity: 1; transform: none } }
@keyframes hp-pop    { 0% { opacity: 0; transform: scale(.7) } 70% { transform: scale(1.06) } 100% { opacity: 1; transform: scale(1) } }
@keyframes hp-float  { 0%,100% { transform: translate3d(0,0,0) scale(1) } 50% { transform: translate3d(24px,-30px,0) scale(1.12) } }
@keyframes hp-float2 { 0%,100% { transform: translate3d(0,0,0) scale(1) } 50% { transform: translate3d(-30px,24px,0) scale(1.15) } }
@keyframes hp-gradient { 0% { background-position: 0% 50% } 100% { background-position: 200% 50% } }
@keyframes hp-wave   { 0%,60%,100% { transform: rotate(0) } 10%,30% { transform: rotate(16deg) } 20%,40% { transform: rotate(-10deg) } 50% { transform: rotate(8deg) } }
@keyframes hp-ring   { from { stroke-dashoffset: var(--c) } to { stroke-dashoffset: var(--o) } }
@keyframes hp-grow   { from { transform: scaleX(0) } to { transform: scaleX(1) } }
@keyframes hp-line   { from { transform: scaleY(0) } to { transform: scaleY(1) } }
@keyframes hp-shine  { 0% { transform: translateX(-130%) skewX(-18deg) } 60%,100% { transform: translateX(330%) skewX(-18deg) } }
@keyframes hp-ping   { 0% { transform: scale(1); opacity: .7 } 80%,100% { transform: scale(2.3); opacity: 0 } }
@keyframes hp-bob    { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-3px) } }
@keyframes hp-spin   { to { transform: rotate(360deg) } }
@keyframes hp-twinkle { 0%,100% { opacity: .15; transform: scale(.6) } 50% { opacity: 1; transform: scale(1.5) } }
@keyframes hp-border { 0% { background-position: 0% 50% } 100% { background-position: 300% 50% } }

.hp-rise   { animation: hp-rise .7s cubic-bezier(.2,.8,.2,1) backwards }
.hp-pop    { animation: hp-pop .55s cubic-bezier(.2,.9,.3,1.2) backwards }
.hp-orb1   { animation: hp-float 14s ease-in-out infinite }
.hp-orb2   { animation: hp-float2 17s ease-in-out infinite }
.hp-orb3   { animation: hp-float 20s ease-in-out infinite reverse }
.hp-name   { background-size: 200% 100%; animation: hp-gradient 6s linear infinite }
.hp-wave   { display: inline-block; transform-origin: 70% 70%; animation: hp-wave 2.8s ease-in-out 1s infinite }
.hp-ring   { stroke-dasharray: var(--c); stroke-dashoffset: var(--c); animation: hp-ring 1.4s cubic-bezier(.3,.7,.2,1) .35s forwards }
.hp-grow   { transform-origin: left; transform: scaleX(0); animation: hp-grow 1.1s cubic-bezier(.3,.7,.2,1) .5s forwards }
.hp-line   { transform-origin: top; transform: scaleY(0); animation: hp-line .6s ease-out .6s forwards }
.hp-shine::after { content: ''; position: absolute; inset: 0; width: 35%; background: linear-gradient(90deg, transparent, rgba(255,255,255,.35), transparent); animation: hp-shine 3.6s ease-in-out infinite; pointer-events: none }
.hp-ping   { animation: hp-ping 1.6s cubic-bezier(0,0,.2,1) infinite }
.hp-bob    { animation: hp-bob 2.6s ease-in-out infinite }
.hp-frame  { background-size: 300% 100%; animation: hp-border 7s linear infinite }
.hp-spin   { animation: hp-spin 18s linear infinite }
.hp-twinkle { animation: hp-twinkle 3s ease-in-out infinite }
.hp-card   { transition: box-shadow .35s, border-color .35s }
.hp-card:hover { border-color: rgb(199 210 254); box-shadow: 0 20px 40px -20px rgb(79 70 229 / .35) }
.hp-lift   { transition: transform .35s cubic-bezier(.2,.8,.2,1), box-shadow .35s }
.hp-lift:hover { transform: translateY(-4px); box-shadow: 0 16px 32px -14px rgb(79 70 229 / .35) }
.hp-lift:active { transform: scale(.97) }

@media (prefers-reduced-motion: reduce) {
  .hp-rise, .hp-pop { animation: none }
  .hp-grow, .hp-line { animation: none; transform: none }
  .hp-ring { animation: none; stroke-dashoffset: var(--o) }
  .hp-orb1, .hp-orb2, .hp-orb3, .hp-name, .hp-wave, .hp-shine::after, .hp-ping, .hp-bob, .hp-frame, .hp-spin, .hp-twinkle { animation: none }
}
`

/** Staggered entrance delay helper */
const delay = (i: number): CSSProperties => ({ animationDelay: `${i * 90}ms` })

/* -------------------------------------------------------------------------- */
/*  Presentational components                                                 */
/* -------------------------------------------------------------------------- */

function Card({ children, className = '', style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <section
      style={style}
      className={`hp-rise hp-card relative overflow-hidden rounded-xl border border-slate-200/80 bg-white/90 p-2.5 shadow-sm backdrop-blur sm:p-3 ${className}`}
    >
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
    <div className="mb-2 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <div className={`hp-bob flex h-6 w-6 items-center justify-center rounded-md ${tone}`}>
          <Icon size={13} />
        </div>
        <h2 className="text-[11px] font-bold text-slate-900 sm:text-xs">{title}</h2>
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
  index,
}: {
  icon: LucideIcon
  label: string
  value: string
  tone: string
  index: number
}) {
  return (
    <div
      style={delay(index + 3)}
      className={`hp-pop hp-lift group relative overflow-hidden rounded-lg p-2 shadow shadow-slate-300/40 ring-1 sm:p-2.5 ${tone}`}
    >
      <div aria-hidden className="pointer-events-none absolute -right-5 -top-5 h-16 w-16 rounded-full bg-current opacity-[0.07] transition-transform duration-500 group-hover:scale-150" />
      <Icon size={13} className="mb-0.5 opacity-80 transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-125" />
      <p className="text-[8px] font-semibold uppercase tracking-wide opacity-70 sm:text-[9px]">{label}</p>
      <p className="mt-0.5 text-[11px] font-bold capitalize leading-tight sm:text-xs">{value}</p>
    </div>
  )
}

const LEAVE_STROKE: Record<string, string> = {
  CL: 'stroke-purple-500',
  SL: 'stroke-blue-500',
  EL: 'stroke-emerald-500',
}

/** Small ring showing the REMAINING share of a leave type; draws itself on load */
function LeaveRing({
  type, label, total, used, text, tile, index,
}: {
  type: string; label: string; total: number; used: number; text: string; tile: string; index: number
}) {
  const remaining = total - used
  const negative = remaining < 0
  const R = 30
  const C = 2 * Math.PI * R
  const remPct = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0
  const offset = C * (1 - (negative ? 1 : remPct))

  return (
    <div
      style={delay(9 + index)}
      className={`hp-pop hp-lift group relative overflow-hidden rounded-lg bg-gradient-to-b p-1.5 text-center ring-1 ${
        negative ? 'from-rose-50 to-white ring-rose-100' : tile
      }`}
    >
      <div className="relative mx-auto h-14 w-14 sm:h-16 sm:w-16">
        <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
          <circle cx="40" cy="40" r={R} fill="none" strokeWidth="8" className={negative ? 'stroke-rose-100' : 'stroke-white'} />
          <circle
            cx="40" cy="40" r={R} fill="none" strokeWidth="8" strokeLinecap="round"
            className={`hp-ring ${negative ? 'stroke-rose-500' : LEAVE_STROKE[type] ?? 'stroke-indigo-500'}`}
            style={{ '--c': C, '--o': offset, animationDelay: `${450 + index * 150}ms` } as CSSProperties}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <CountUp to={remaining} delay={500 + index * 150} className={`text-base font-extrabold leading-none sm:text-lg ${negative ? 'text-rose-700' : text}`} />
          <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">left</span>
        </div>
      </div>

      <p className={`mt-1 text-[10px] font-bold ${negative ? 'text-rose-600' : text}`}>{type} · {label}</p>
      <p className="text-[9px] font-medium text-slate-500">{used}/{total} used</p>
    </div>
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

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date()) // yyyy-mm-dd in IST

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
  const pendingCount = pendingLeaves?.length ?? 0
  const firstName = employee.full_name?.split(' ')[0] ?? 'there'

  const dayState = isCheckedOut ? 'Day completed' : isCheckedIn ? 'Checked in' : 'Not punched in'

  const todayLabel = new Date().toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: TZ,
  })

  return (
    <div className="relative isolate overflow-clip bg-gradient-to-b from-indigo-50/70 via-slate-50 to-white">
      <style>{ANIMATIONS}</style>

      {/* ambient floating colour orbs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="hp-orb1 absolute -left-24 top-10 h-72 w-72 rounded-full bg-indigo-300/30 blur-3xl" />
        <div className="hp-orb2 absolute -right-20 top-[24rem] h-72 w-72 rounded-full bg-blue-300/30 blur-3xl" />
        <div className="hp-orb3 absolute -left-10 top-[44rem] h-64 w-64 rounded-full bg-emerald-200/30 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: 'radial-gradient(rgba(99,102,241,0.10) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        />
      </div>

      <div className="mx-auto w-full max-w-7xl px-2.5 pb-6 pt-2.5 sm:px-4 lg:px-6 lg:pt-4">

        {/* ── HERO ── */}
        <header
          style={delay(0)}
          className="hp-rise relative isolate overflow-hidden rounded-xl bg-slate-900 px-3.5 pb-11 pt-3 text-white shadow-lg shadow-indigo-300/40 sm:px-5 sm:pb-12 sm:pt-4"
        >
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950" />
          {/* aurora blobs */}
          <div aria-hidden className="hp-orb1 pointer-events-none absolute -right-20 -top-24 -z-10 h-80 w-80 rounded-full bg-indigo-500/40 blur-3xl" />
          <div aria-hidden className="hp-orb2 pointer-events-none absolute -bottom-28 left-10 -z-10 h-72 w-72 rounded-full bg-emerald-500/25 blur-3xl" />
          <div aria-hidden className="hp-orb3 pointer-events-none absolute left-1/2 top-0 -z-10 h-56 w-56 rounded-full bg-blue-500/30 blur-3xl" />
          {/* dot grid */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
            style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.09) 1px, transparent 1px)', backgroundSize: '20px 20px' }}
          />
          {/* rotating sheen ring */}
          <svg aria-hidden viewBox="0 0 200 200" className="hp-spin pointer-events-none absolute -right-10 -top-10 -z-10 h-56 w-56 text-white/10 sm:h-72 sm:w-72">
            <circle cx="100" cy="100" r="96" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 8" />
            <circle cx="100" cy="100" r="74" fill="none" stroke="currentColor" strokeWidth="1" />
            <circle cx="100" cy="4" r="4" fill="#a5b4fc" />
            <circle cx="174" cy="100" r="3" fill="#6ee7b7" />
          </svg>
          {/* twinkling stars */}
          {[
            ['12%', '22%', '0s'], ['28%', '70%', '.8s'], ['46%', '18%', '1.6s'],
            ['62%', '60%', '.4s'], ['78%', '30%', '2.2s'], ['90%', '72%', '1.2s'],
          ].map(([left, top, d]) => (
            <span
              key={`${left}-${top}`}
              aria-hidden
              className="hp-twinkle pointer-events-none absolute -z-10 h-1 w-1 rounded-full bg-white"
              style={{ left, top, animationDelay: d }}
            />
          ))}

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[11px] font-medium text-indigo-200">
                {getGreeting()} <span className="hp-wave">👋</span>
              </p>
              <h1 className="hp-name mt-0.5 truncate bg-gradient-to-r from-white via-indigo-200 to-emerald-200 bg-clip-text text-xl font-extrabold tracking-tight text-transparent sm:text-2xl">
                {firstName}
              </h1>

              <div className="mt-1.5 flex flex-wrap items-center gap-1">
                <span className="rounded-full bg-white/10 px-2 py-px text-[10px] font-semibold text-slate-100 ring-1 ring-white/15 backdrop-blur">
                  {employee.designation ?? 'Employee'}
                </span>
                {employee.department && (
                  <span className="rounded-full bg-white/10 px-2 py-px text-[10px] font-semibold text-slate-100 ring-1 ring-white/15 backdrop-blur">
                    {employee.department}
                  </span>
                )}
                <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-px text-[10px] font-semibold text-slate-100 ring-1 ring-white/15 backdrop-blur">
                  <span className="relative flex h-2 w-2">
                    {isCheckedIn && !isCheckedOut && <span className="hp-ping absolute inset-0 rounded-full bg-emerald-400" />}
                    <span className={`relative h-2 w-2 rounded-full ${isCheckedOut ? 'bg-slate-400' : isCheckedIn ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  </span>
                  {dayState}
                </span>
              </div>
            </div>

            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-100 ring-1 ring-white/15 backdrop-blur">
              <Sparkles className="h-2.5 w-2.5 text-indigo-300" />
              {todayLabel}
            </span>
          </div>
        </header>

        {/* ── TODAY OVERVIEW (floats over the hero edge) ── */}
        <div className="relative z-10 -mt-7 mb-2 grid grid-cols-3 gap-1.5 px-2.5 sm:-mt-8 sm:gap-2 sm:px-5">
          <OverviewTile
            index={0}
            icon={CheckCircle2}
            label="Attendance"
            value={todayAttendance ? (todayAttendance.status ?? 'Marked') : 'Not marked'}
            tone={todayAttendance ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' : 'bg-slate-100 text-slate-500 ring-slate-200'}
          />
          <OverviewTile
            index={1}
            icon={ClipboardList}
            label="Work report"
            value={todayReport ? 'Submitted' : 'Pending'}
            tone={todayReport ? 'bg-blue-50 text-blue-700 ring-blue-100' : 'bg-amber-50 text-amber-700 ring-amber-100'}
          />
          <OverviewTile
            index={2}
            icon={Palmtree}
            label="Leaves"
            value={pendingCount > 0 ? `${pendingCount} pending` : 'None pending'}
            tone={pendingCount > 0 ? 'bg-violet-50 text-violet-700 ring-violet-100' : 'bg-slate-100 text-slate-500 ring-slate-200'}
          />
        </div>

        {/* ── RESPONSIVE LAYOUT: 1 column on mobile (custom order), 2 columns on desktop ── */}
        <div className="grid gap-2 lg:grid-cols-12 lg:items-start lg:gap-3">

          {/* ═════════════ LEFT COLUMN ═════════════ */}
          <div className="contents lg:col-span-5 lg:block lg:space-y-2">
          {/* ── PUNCH CARD + TABS (animated gradient frame) ── */}
          <div style={delay(1)} className="hp-rise order-1 lg:order-none">
           <div className="hp-frame rounded-[14px] bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-400 bg-[length:300%_100%] p-[1.5px] shadow-md shadow-indigo-200/60">
            <div className="overflow-hidden rounded-xl bg-white">
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
           </div>
          </div>

          {hasCRMAccess && (
              <Link
                href="/dashboard"
                style={delay(11)}
                className="order-6 lg:order-none hp-rise hp-shine hp-lift group relative isolate flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-blue-700 px-2.5 py-2 shadow shadow-blue-200"
              >
                <div className="pointer-events-none absolute -right-8 -top-10 -z-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/25 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110">
                  <LayoutDashboard className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-white">CRM Portal</p>
                  <p className="truncate text-[10px] text-blue-100">Go to business dashboard</p>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-blue-100 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            )}
          </div>

          {/* ═════════════ RIGHT COLUMN ═════════════ */}
          <div className="contents lg:col-span-7 lg:block lg:space-y-2">

            {/* ── MARK ATTENDANCE (live clock hero) ── */}
            <section
              style={delay(3)}
              className="hp-rise hp-card order-2 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow shadow-indigo-100/50 lg:order-none"
            >
              <div className="relative isolate overflow-hidden bg-slate-900 px-3.5 pb-3 pt-3 text-white sm:px-4">
                <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950" />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 -z-10"
                  style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '18px 18px' }}
                />
                <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 -z-10 h-56 w-56 rounded-full bg-indigo-500/30 blur-3xl" />
                <div aria-hidden className="pointer-events-none absolute -bottom-20 left-8 -z-10 h-44 w-44 rounded-full bg-emerald-500/20 blur-3xl" />
                {/* decorative rotating dial */}
                <svg aria-hidden viewBox="0 0 120 120" className="hp-spin pointer-events-none absolute -right-6 top-1/2 -z-10 h-36 w-36 -translate-y-1/2 text-white/15 sm:h-44 sm:w-44">
                  <circle cx="60" cy="60" r="56" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 6" />
                  <circle cx="60" cy="60" r="44" fill="none" stroke="currentColor" strokeWidth="1" />
                  <circle cx="60" cy="8" r="3" fill="#a5b4fc" />
                </svg>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/10 ring-1 ring-white/20 backdrop-blur">
                      <CalendarCheck className="h-3.5 w-3.5 text-indigo-200" />
                    </span>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-300">Mark attendance</p>
                      <p className="text-xs font-medium text-slate-300">{todayLabel}</p>
                    </div>
                  </div>

                  <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold ring-1 ring-white/20 backdrop-blur">
                    <span className="relative flex h-2 w-2">
                      {isCheckedIn && !isCheckedOut && <span className="hp-ping absolute inset-0 rounded-full bg-emerald-400" />}
                      <span className={`relative h-2 w-2 rounded-full ${isCheckedOut ? 'bg-slate-400' : isCheckedIn ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                    </span>
                    {dayState}
                  </span>
                </div>

                <div className="mt-2 flex items-end justify-between gap-3">
                  <LiveClock />
                  <div className="hidden text-right sm:block">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Worked</p>
                    <p className="text-sm font-bold text-white">{fmtDuration(minutes)}</p>
                  </div>
                </div>
              </div>

              <div className="p-2.5 sm:p-3">
                <AttendanceMarkButton
                  employeeId={employee.id}
                  isCheckedIn={isCheckedIn}
                  isCheckedOut={isCheckedOut}
                  attendanceId={todayAttendance?.id ?? null}
                  checkInTimeISO={todayAttendance?.check_in ?? null}
                  checkOutTimeISO={todayAttendance?.check_out ?? null}
                />
              </div>
            </section>

            {/* ── DAILY WORK REPORT (opens popup) ── */}
            <div style={delay(4)} className="hp-rise hp-lift order-3 rounded-xl lg:order-none">
              <WorkReportButton
                employeeId={employee.id}
                reportDate={today}
                existing={todayReport}
              />
            </div>

            {/* ── LEAVE LEDGER ── */}
            {leaveBalance && (
              <Card style={delay(6)} className="order-5 lg:order-none">
                <div aria-hidden className="pointer-events-none absolute -left-16 -top-16 h-44 w-44 rounded-full bg-purple-200/40 blur-3xl" />

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

                {/* total available summary */}
                <div className="relative mb-2 flex items-center justify-between gap-3 rounded-lg bg-gradient-to-r from-indigo-50 via-white to-purple-50 p-2 ring-1 ring-indigo-100">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total available</p>
                    <p className="text-lg font-extrabold tracking-tight text-slate-900">
                      <CountUp to={leaves.reduce((sum, l) => sum + (l.total - l.used), 0)} delay={500} />
                      <span className="ml-1 text-xs font-semibold text-slate-400">days</span>
                    </p>
                  </div>
                  <div className="flex h-1.5 w-1/2 max-w-[8rem] overflow-hidden rounded-full bg-slate-100">
                    {leaves.map((l, i) => {
                      const rem = Math.max(0, l.total - l.used)
                      const all = leaves.reduce((s, x) => s + Math.max(0, x.total - x.used), 0) || 1
                      return (
                        <div
                          key={l.type}
                          className={`hp-grow h-full ${l.bar}`}
                          style={{ width: `${(rem / all) * 100}%`, animationDelay: `${500 + i * 120}ms` }}
                        />
                      )
                    })}
                  </div>
                </div>

                <div className="relative grid grid-cols-3 gap-1.5">
                  {leaves.map((l, i) => (
                    <LeaveRing
                      key={l.type}
                      index={i}
                      type={l.type}
                      label={l.label}
                      total={l.total}
                      used={l.used}
                      text={l.text}
                      tile={l.tile}
                    />
                  ))}
                </div>
              </Card>
            )}

            {/* ── SIGN OUT ── */}
            <form action="/api/auth/signout" method="POST" style={delay(8)} className="hp-rise order-7 lg:order-none">
              <button
                type="submit"
                className="group relative flex w-full items-center justify-between overflow-hidden rounded-lg border border-rose-100 bg-white px-2.5 py-2 text-[11px] font-semibold text-rose-600 shadow-sm transition hover:border-rose-200 hover:shadow-md active:scale-[0.98]"
              >
                <span aria-hidden className="absolute inset-0 -translate-x-full bg-gradient-to-r from-rose-50 to-rose-100/70 transition-transform duration-500 group-hover:translate-x-0" />
                <span className="relative flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-rose-50 ring-1 ring-rose-100 transition group-hover:bg-white group-hover:-rotate-6">
                    <LogOut className="h-3 w-3" />
                  </span>
                  <span className="text-left">
                    <span className="block leading-tight">Sign out</span>
                    <span className="block text-[9px] font-normal text-rose-400">End your session securely</span>
                  </span>
                </span>
                <ArrowUpRight className="relative h-4 w-4 text-rose-300 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-rose-500" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}