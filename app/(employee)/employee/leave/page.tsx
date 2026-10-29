import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Clock3, CheckCircle2, XCircle, MessageSquare, AlertTriangle, CalendarDays, Wallet, Palmtree,
} from 'lucide-react'
import { ApplyLeaveButton } from '@/components/employee/apply-leave-button'

export const dynamic = 'force-dynamic'

const STATUS_UI: Record<string, { pill: string; bar: string; Icon: typeof Clock3 }> = {
  pending:  { pill: 'bg-amber-50 text-amber-700 ring-amber-200',       bar: 'bg-amber-500',   Icon: Clock3 },
  approved: { pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200', bar: 'bg-emerald-500', Icon: CheckCircle2 },
  rejected: { pill: 'bg-rose-50 text-rose-700 ring-rose-200',          bar: 'bg-rose-500',    Icon: XCircle },
}
const STATUS_FALLBACK = { pill: 'bg-slate-100 text-slate-500 ring-slate-200', bar: 'bg-slate-300', Icon: Clock3 }

// Leave type badge colours (applications)
const TYPE_BADGE: Record<string, string> = {
  CL: 'bg-purple-50 text-purple-700 ring-purple-200',
  SL: 'bg-blue-50 text-blue-700 ring-blue-200',
  EL: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
}
const TYPE_BADGE_FALLBACK = 'bg-indigo-50 text-indigo-700 ring-indigo-200'

interface LeaveApplication {
  id: string
  status: string
  leave_type?: string
  from_date: string
  to_date: string
  days?: number
  reason?: string
  manager_comment?: string
}

export default async function EmployeeLeavePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: employee, error: employeeErr } = await supabase
    .from('employees')
    .select('id, full_name, company_id')
    .eq('email', user.email!)
    .single()

  // Only redirect to login when the employee genuinely doesn't exist.
  // A transient fetch error shouldn't kick out a legitimately logged-in user.
  if (employeeErr) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-indigo-50/70 via-slate-50 to-white px-4">
        <div className="max-w-sm rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <p className="mb-1 text-base font-bold text-slate-900">Couldn&apos;t load your leave details</p>
          <p className="mb-5 text-sm text-slate-500">Something went wrong fetching your employee record. Please try again.</p>
          <Link
            href="/employee"
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-200 transition hover:from-indigo-700 hover:to-blue-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to portal
          </Link>
        </div>
      </div>
    )
  }
  if (!employee) redirect('/login')

  const [{ data: balance, error: balanceErr }, { data: applications, error: applicationsErr }] = await Promise.all([
    // FIX: filter by month too — leave_balances now has one row per (employee, year, month),
    // so filtering by year alone can match multiple rows and break .single().
    supabase.from('leave_balances').select('*')
      .eq('employee_id', employee.id)
      .eq('year', new Date().getFullYear())
      .eq('month', new Date().getMonth() + 1)
      .maybeSingle(),
    supabase.from('leave_applications').select('*').eq('employee_id', employee.id).order('created_at', { ascending: false }),
  ])

  const dataLoadFailed = Boolean(balanceErr || applicationsErr)

  const apps = (applications as LeaveApplication[] | null) ?? []
  const pendingCount  = apps.filter((a) => a.status === 'pending').length
  const approvedCount = apps.filter((a) => a.status === 'approved').length
  const rejectedCount = apps.filter((a) => a.status === 'rejected').length

  const ringR = 22
  const ringC = 2 * Math.PI * ringR
  const dateTz = { timeZone: 'Asia/Kolkata' } as const

  const leaves = balance ? [
    { type: 'CL', full: 'Casual leave', total: balance.cl_total, used: balance.cl_used, stroke: '#a855f7', tile: 'from-purple-50 to-white ring-purple-100', badge: 'bg-purple-100 text-purple-700' },
    { type: 'SL', full: 'Sick leave',   total: balance.sl_total, used: balance.sl_used, stroke: '#3b82f6', tile: 'from-blue-50 to-white ring-blue-100',     badge: 'bg-blue-100 text-blue-700' },
    { type: 'EL', full: 'Earned leave', total: balance.el_total, used: balance.el_used, stroke: '#10b981', tile: 'from-emerald-50 to-white ring-emerald-100', badge: 'bg-emerald-100 text-emerald-700' },
  ] : []

  const totalAvailable = leaves.reduce((sum, l) => sum + Math.max(0, l.total - l.used), 0)

  const summary = [
    { label: 'Pending',  value: pendingCount,  Icon: Clock3,       tone: 'bg-amber-50 text-amber-700 ring-amber-100' },
    { label: 'Approved', value: approvedCount, Icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
    { label: 'Rejected', value: rejectedCount, Icon: XCircle,      tone: 'bg-rose-50 text-rose-700 ring-rose-100' },
  ]

  const monthLabel = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric', ...dateTz })

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/70 via-slate-50 to-white">
      <div className="mx-auto max-w-3xl px-4 py-5 pb-28 lg:px-6 lg:py-6">

        {/* ── HERO ── */}
        <section className="relative isolate mb-5 overflow-hidden rounded-3xl bg-slate-900 p-5 text-white shadow-xl sm:p-7">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950" />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              backgroundImage: 'radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)',
              backgroundSize: '18px 18px',
            }}
          />
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 -z-10 h-56 w-56 rounded-full bg-indigo-500/30 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-20 left-6 -z-10 h-48 w-48 rounded-full bg-emerald-500/20 blur-3xl" />

          <Link
            href="/employee"
            className="mb-5 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-100 ring-1 ring-white/15 transition hover:bg-white/20"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to portal
          </Link>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-300">Employee Portal</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Leave management</h1>
              <p className="mt-1 text-sm text-slate-300">Track your balance and apply for leave</p>
            </div>
            <ApplyLeaveButton employeeId={employee.id} companyId={employee.company_id} balance={balance} />
          </div>

          {balance && (
            <div className="mt-5 flex items-center gap-4 rounded-2xl bg-white/[0.07] p-4 ring-1 ring-white/10 backdrop-blur">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
                <Palmtree className="h-6 w-6 text-emerald-300" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">{monthLabel}</p>
                <p className="mt-0.5 text-2xl font-extrabold tabular-nums">
                  {totalAvailable} <span className="text-sm font-semibold text-slate-300">days available</span>
                </p>
              </div>
            </div>
          )}
        </section>

        {dataLoadFailed && (
          <div role="alert" className="mb-5 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>Some leave data couldn&apos;t be loaded right now. Please refresh the page. If this keeps happening, contact admin.</p>
          </div>
        )}

        {/* ── LEAVE BALANCE ── */}
        <section className="mb-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <Wallet className="h-[18px] w-[18px]" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 sm:text-base">Leave balance</h2>
            </div>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">{monthLabel}</span>
          </div>

          {balance ? (
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              {leaves.map((l) => {
                const remaining = l.total - l.used
                const pctRaw = l.total > 0 ? remaining / l.total : 0
                const pctClamped = Math.max(0, Math.min(1, pctRaw))
                const offset = ringC * (1 - pctClamped)
                const isNegative = remaining < 0
                return (
                  <div
                    key={l.type}
                    className={`rounded-2xl bg-gradient-to-b p-3 text-center ring-1 sm:p-4 ${
                      isNegative ? 'from-rose-50 to-white ring-rose-100' : l.tile
                    }`}
                  >
                    <div className="relative mx-auto mb-3 h-[72px] w-[72px] sm:h-20 sm:w-20">
                      <svg aria-hidden className="h-full w-full -rotate-90" viewBox="0 0 52 52">
                        <circle cx="26" cy="26" r={ringR} fill="none" stroke="#E2E8F0" strokeWidth="3.5" />
                        <circle
                          cx="26" cy="26" r={ringR} fill="none"
                          stroke={isNegative ? '#e11d48' : l.stroke} strokeWidth="3.5"
                          strokeDasharray={ringC} strokeDashoffset={isNegative ? 0 : offset} strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`text-2xl font-extrabold tabular-nums ${isNegative ? 'text-rose-600' : 'text-slate-900'}`}>
                          {remaining}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs font-bold text-slate-800 sm:text-sm">{l.full}</p>
                    <p className={`mt-0.5 text-[11px] sm:text-xs ${isNegative ? 'font-semibold text-rose-600' : 'text-slate-500'}`}>
                      {l.used} of {l.total} used
                    </p>
                    <span className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${isNegative ? 'bg-rose-100 text-rose-700' : l.badge}`}>
                      {l.type}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
              <Wallet className="h-4 w-4 flex-shrink-0" />
              No leave balance has been set for this month yet.
            </div>
          )}
        </section>

        {/* ── SUMMARY ── */}
        {apps.length > 0 && (
          <section className="mb-5 grid grid-cols-3 gap-2.5 sm:gap-3">
            {summary.map((s) => (
              <div key={s.label} className={`rounded-2xl p-3 ring-1 sm:p-4 ${s.tone}`}>
                <s.Icon className="mb-2 h-[18px] w-[18px] opacity-80" />
                <p className="text-2xl font-extrabold tabular-nums leading-none">{s.value}</p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide opacity-70">{s.label}</p>
              </div>
            ))}
          </section>
        )}

        {/* ── LEAVE HISTORY ── */}
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <CalendarDays className="h-[18px] w-[18px]" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 sm:text-base">Leave history</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
              {apps.length} {apps.length === 1 ? 'application' : 'applications'}
            </span>
          </div>

          {apps.length > 0 ? (
            <ul className="space-y-3">
              {apps.map((a) => {
                const ui = STATUS_UI[a.status] ?? STATUS_FALLBACK
                const StatusIcon = ui.Icon
                const days = a.days ?? 0
                const typeBadge = (a.leave_type && TYPE_BADGE[a.leave_type.toUpperCase()]) || TYPE_BADGE_FALLBACK
                return (
                  <li key={a.id} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60 p-4 pl-5 transition hover:bg-white hover:shadow-sm">
                    <span aria-hidden className={`absolute bottom-0 left-0 top-0 w-1.5 ${ui.bar}`} />

                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          {a.leave_type && (
                            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ring-1 ring-inset ${typeBadge}`}>
                              {a.leave_type}
                            </span>
                          )}
                          <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">
                            {days} day{days > 1 ? 's' : ''}
                          </span>
                        </div>

                        <p className="flex flex-wrap items-baseline gap-x-1.5 text-base font-bold text-slate-900">
                          <CalendarDays className="h-4 w-4 flex-shrink-0 self-center text-indigo-500" />
                          <span>
                            {new Date(a.from_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', ...dateTz })}
                            {a.from_date !== a.to_date && (
                              <> – {new Date(a.to_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', ...dateTz })}</>
                            )}
                          </span>
                          <span className="text-sm font-medium text-slate-400">
                            {new Date(a.from_date).toLocaleDateString('en-IN', { year: 'numeric', ...dateTz })}
                          </span>
                        </p>
                      </div>

                      <span className={`inline-flex flex-shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${ui.pill}`}>
                        <StatusIcon className="h-3.5 w-3.5" /> {a.status}
                      </span>
                    </div>

                    {a.reason && (
                      <p className="mt-3 line-clamp-2 rounded-xl bg-white px-3 py-2 text-sm text-slate-600 ring-1 ring-slate-100">{a.reason}</p>
                    )}

                    {a.manager_comment && (
                      <div className="mt-3 flex items-start gap-2 rounded-xl bg-blue-50 px-3 py-2.5 text-sm text-blue-700 ring-1 ring-blue-100">
                        <MessageSquare className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        <p><span className="font-semibold">Manager:</span> {a.manager_comment}</p>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <CalendarDays className="h-5 w-5" />
              </div>
              <p className="text-sm font-bold text-slate-900">No leave applications yet</p>
              <p className="mt-1 text-sm text-slate-500">Use Apply leave at the top to request your first one.</p>
            </div>
          )}
        </section>

      </div>
    </div>
  )
}