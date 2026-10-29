import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Clock3, CheckCircle2, XCircle, MessageSquare, AlertTriangle, CalendarDays, Wallet,
} from 'lucide-react'
import { ApplyLeaveButton } from '@/components/employee/apply-leave-button'

export const dynamic = 'force-dynamic'

const STATUS_UI: Record<string, { pill: string; bar: string; Icon: typeof Clock3 }> = {
  pending:  { pill: 'bg-amber-50 text-amber-700 ring-amber-200',       bar: 'bg-amber-500',   Icon: Clock3 },
  approved: { pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200', bar: 'bg-emerald-500', Icon: CheckCircle2 },
  rejected: { pill: 'bg-rose-50 text-rose-700 ring-rose-200',          bar: 'bg-rose-500',    Icon: XCircle },
}
const STATUS_FALLBACK = { pill: 'bg-stone-100 text-stone-500 ring-stone-200', bar: 'bg-stone-300', Icon: Clock3 }

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
      <div className="flex min-h-screen items-center justify-center bg-[#EFE9DD] px-4">
        <div className="max-w-sm rounded-3xl border border-[#E6DECF] bg-white p-7 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-500">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <p className="mb-1 text-base font-semibold text-[#1C1712]">Couldn&apos;t load your leave details</p>
          <p className="mb-5 text-sm text-[#9A8F82]">Something went wrong fetching your employee record. Please try again.</p>
          <Link
            href="/employee"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#1C1712] px-4 py-2 text-xs font-medium text-white transition hover:bg-black"
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

  const serif = { fontFamily: 'Georgia, serif' }
  const ringR = 22
  const ringC = 2 * Math.PI * ringR
  const dateTz = { timeZone: 'Asia/Kolkata' } as const

  const leaves = balance ? [
    { type: 'CL', full: 'Casual leave', total: balance.cl_total, used: balance.cl_used, stroke: '#B8860B' },
    { type: 'SL', full: 'Sick leave',   total: balance.sl_total, used: balance.sl_used, stroke: '#9A7412' },
    { type: 'EL', full: 'Earned leave', total: balance.el_total, used: balance.el_used, stroke: '#7A5C10' },
  ] : []

  const summary = [
    { label: 'Pending',  value: pendingCount,  dot: 'bg-amber-500',   text: 'text-amber-700' },
    { label: 'Approved', value: approvedCount, dot: 'bg-emerald-500', text: 'text-emerald-700' },
    { label: 'Rejected', value: rejectedCount, dot: 'bg-rose-500',    text: 'text-rose-600' },
  ]

  return (
    <div className="min-h-screen bg-[#EFE9DD]">
      <div className="mx-auto max-w-3xl px-3 py-4 pb-28 lg:px-6 lg:py-6">

        <div className="relative border border-[#B8860B]/35">
          <div className="pointer-events-none absolute left-0 top-0 z-10 h-3 w-3 border-l-2 border-t-2 border-[#B8860B]" />
          <div className="pointer-events-none absolute right-0 top-0 z-10 h-3 w-3 border-r-2 border-t-2 border-[#B8860B]" />
          <div className="pointer-events-none absolute bottom-0 left-0 z-10 h-3 w-3 border-b-2 border-l-2 border-[#B8860B]" />
          <div className="pointer-events-none absolute bottom-0 right-0 z-10 h-3 w-3 border-b-2 border-r-2 border-[#B8860B]" />

          {/* Hero */}
          <div className="relative overflow-hidden bg-[#1C1712] px-6 py-6 lg:px-8">
            <div className="absolute inset-0 opacity-[0.05]" style={{
              backgroundImage: 'linear-gradient(#B8860B 1px, transparent 1px), linear-gradient(90deg, #B8860B 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }} />
            <div aria-hidden className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-[#B8860B]/25 blur-3xl" />
            <div className="relative">
              <Link
                href="/employee"
                className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 transition hover:border-[#D4A537]/50 hover:text-[#D4A537]"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to portal
              </Link>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-[28px] italic leading-tight text-white" style={{ ...serif, fontWeight: 500 }}>
                    Leave management
                  </h1>
                  <p className="mt-1 text-sm text-white/50">Track your balance and apply for leave</p>
                </div>
                <ApplyLeaveButton employeeId={employee.id} companyId={employee.company_id} balance={balance} />
              </div>
            </div>
          </div>

          {dataLoadFailed && (
            <div role="alert" className="flex items-start gap-2 border-t border-rose-200 bg-rose-50 px-6 py-3 text-sm text-rose-700 lg:px-8">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p>Some leave data couldn&apos;t be loaded right now. Please refresh the page. If this keeps happening, contact admin.</p>
            </div>
          )}

          {/* Leave balance */}
          <section className="border-t border-[#B8860B]/25 bg-[#FAF7F2] px-6 py-6 lg:px-8">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg text-[#1C1712]" style={serif}>Leave balance</h2>
              <span className="rounded-full bg-[#B8860B]/10 px-3 py-1 text-xs font-medium text-[#8B6914]">
                {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric', ...dateTz })}
              </span>
            </div>

            {balance ? (
              <div className="grid grid-cols-3 gap-3">
                {leaves.map((l) => {
                  const remaining = l.total - l.used
                  const pctRaw = l.total > 0 ? remaining / l.total : 0
                  const pctClamped = Math.max(0, Math.min(1, pctRaw))
                  const offset = ringC * (1 - pctClamped)
                  const isNegative = remaining < 0
                  return (
                    <div
                      key={l.type}
                      className={`rounded-2xl border bg-white p-3 text-center shadow-sm sm:p-4 ${
                        isNegative ? 'border-rose-200' : 'border-[#E6DECF]'
                      }`}
                    >
                      <div className="relative mx-auto mb-3 h-[72px] w-[72px] sm:h-20 sm:w-20">
                        <svg aria-hidden className="h-full w-full -rotate-90" viewBox="0 0 52 52">
                          <circle cx="26" cy="26" r={ringR} fill="none" stroke="#EDE5D4" strokeWidth="3.5" />
                          <circle
                            cx="26" cy="26" r={ringR} fill="none"
                            stroke={isNegative ? '#DC2626' : l.stroke} strokeWidth="3.5"
                            strokeDasharray={ringC} strokeDashoffset={isNegative ? 0 : offset} strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className={`text-2xl font-semibold ${isNegative ? 'text-rose-600' : 'text-[#1C1712]'}`} style={serif}>
                            {remaining}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-[#1C1712]">{l.full}</p>
                      <p className={`mt-0.5 text-xs ${isNegative ? 'font-medium text-rose-600' : 'text-[#9A8F82]'}`}>
                        {l.used} of {l.total} used
                      </p>
                      <span className="mt-2 inline-block rounded-md bg-[#F3ECDB] px-2 py-0.5 text-[11px] font-semibold text-[#8B6914]">
                        {l.type}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-2xl border border-dashed border-[#DDD5C4] bg-white/60 px-4 py-4 text-sm text-[#9A8F82]">
                <Wallet className="h-4 w-4 flex-shrink-0" />
                No leave balance has been set for this month yet.
              </div>
            )}
          </section>

          {/* Summary */}
          {apps.length > 0 && (
            <section className="border-t border-[#B8860B]/25 bg-white px-6 py-4 lg:px-8">
              <div className="grid grid-cols-3 gap-3">
                {summary.map((s) => (
                  <div key={s.label} className="flex items-center justify-center gap-2.5 rounded-xl bg-[#FAF7F2] px-2 py-2.5">
                    <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                    <span className={`text-xl font-semibold tabular-nums ${s.text}`} style={serif}>{s.value}</span>
                    <span className="text-xs text-[#9A8F82]">{s.label}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Leave history */}
          <section className="border-t border-[#B8860B]/25 bg-[#FAF7F2] px-6 py-6 lg:px-8">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg text-[#1C1712]" style={serif}>Leave history</h2>
              <span className="text-xs text-[#9A8F82]">
                {apps.length} {apps.length === 1 ? 'application' : 'applications'}
              </span>
            </div>

            {apps.length > 0 ? (
              <ul className="space-y-3">
                {apps.map((a) => {
                  const ui = STATUS_UI[a.status] ?? STATUS_FALLBACK
                  const StatusIcon = ui.Icon
                  const days = a.days ?? 0
                  return (
                    <li key={a.id} className="relative overflow-hidden rounded-2xl border border-[#E6DECF] bg-white p-4 pl-5 shadow-sm">
                      <span aria-hidden className={`absolute bottom-0 left-0 top-0 w-1.5 ${ui.bar}`} />

                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="mb-1.5 flex flex-wrap items-center gap-2">
                            {a.leave_type && (
                              <span className="rounded-md bg-[#F3ECDB] px-2 py-0.5 text-[11px] font-semibold capitalize text-[#8B6914]">
                                {a.leave_type}
                              </span>
                            )}
                            <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600">
                              {days} day{days > 1 ? 's' : ''}
                            </span>
                          </div>
                          <p className="flex flex-wrap items-baseline gap-x-1.5 text-base text-[#1C1712]" style={serif}>
                            <CalendarDays className="h-4 w-4 flex-shrink-0 self-center text-[#B8860B]" />
                            <span>
                              {new Date(a.from_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', ...dateTz })}
                              {a.from_date !== a.to_date && (
                                <> – {new Date(a.to_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', ...dateTz })}</>
                              )}
                            </span>
                            <span className="text-sm text-[#9A8F82]">
                              {new Date(a.from_date).toLocaleDateString('en-IN', { year: 'numeric', ...dateTz })}
                            </span>
                          </p>
                        </div>

                        <span className={`inline-flex flex-shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 ring-inset ${ui.pill}`}>
                          <StatusIcon className="h-3.5 w-3.5" /> {a.status}
                        </span>
                      </div>

                      {a.reason && (
                        <p className="mt-2.5 line-clamp-2 text-sm text-[#7A6E60]">{a.reason}</p>
                      )}

                      {a.manager_comment && (
                        <div className="mt-3 flex items-start gap-2 rounded-xl bg-blue-50 px-3 py-2.5 text-sm text-blue-700">
                          <MessageSquare className="mt-0.5 h-4 w-4 flex-shrink-0" />
                          <p><span className="font-medium">Manager:</span> {a.manager_comment}</p>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="flex flex-col items-center rounded-2xl border border-dashed border-[#DDD5C4] bg-white/60 px-6 py-10 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-[#E6DECF] bg-white text-[#B8860B]">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium text-[#1C1712]">No leave applications yet</p>
                <p className="mt-1 text-sm text-[#9A8F82]">Use Apply leave at the top to request your first one.</p>
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  )
}