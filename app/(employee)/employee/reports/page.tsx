import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Clock3, Folder, MessageSquare, CheckCircle2, Hourglass, FileText,
} from 'lucide-react'
import { SubmitReportButton } from '@/components/employee/submit-report-button'
import { ReportsList, type Report } from '@/components/employee/reports-list'

export const dynamic = 'force-dynamic'

export default async function EmployeeReportsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: employee } = await supabase
    .from('employees')
    .select('id, full_name, company_id')
    .eq('email', user.email!)
    .single()
  if (!employee) redirect('/login')

  const today = new Date().toISOString().split('T')[0]

  const [{ data: todayReport }, { data: reports }] = await Promise.all([
    supabase.from('work_reports').select('*').eq('employee_id', employee.id).eq('report_date', today).maybeSingle(),
    supabase.from('work_reports').select('*').eq('employee_id', employee.id)
      .order('report_date', { ascending: false }).limit(30),
  ])

  const serif = { fontFamily: 'Georgia, serif' }
  const list = (reports as Report[] | null) ?? []

  const totalHours = list.reduce((sum, r) => sum + (Number(r.hours_spent) || 0), 0)
  const completedCount = list.filter(r => r.status === 'completed').length

  const stats = [
    { label: 'Reports',    value: String(list.length),          Icon: FileText,     tone: 'text-[#8B6914] bg-[#F3ECDB]' },
    { label: 'Hours logged', value: String(Number(totalHours.toFixed(1))), Icon: Hourglass, tone: 'text-amber-700 bg-amber-50' },
    { label: 'Completed',  value: String(completedCount),       Icon: CheckCircle2, tone: 'text-emerald-700 bg-emerald-50' },
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
                    Work reports
                  </h1>
                  <p className="mt-1 text-sm text-white/50">Your daily task submissions</p>
                </div>
                {!todayReport && (
                  <SubmitReportButton employeeId={employee.id} companyId={employee.company_id} />
                )}
              </div>
            </div>
          </div>

          {/* Today */}
          <section className="border-t border-[#B8860B]/25 bg-[#FAF7F2] px-6 py-6 lg:px-8">
            <h2 className="mb-4 text-lg text-[#1C1712]" style={serif}>Today</h2>

            {todayReport ? (
              <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
                <span aria-hidden className="absolute bottom-0 left-0 top-0 w-1.5 bg-emerald-500" />
                <div className="mb-3 flex items-center justify-between gap-3 pl-1">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Submitted today
                  </span>
                </div>
                <p className="pl-1 text-base leading-relaxed text-[#1C1712]" style={serif}>
                  {todayReport.task_description}
                </p>
                {(todayReport.project_name || todayReport.hours_spent) && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 pl-1">
                    {todayReport.project_name && (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs text-emerald-800 ring-1 ring-inset ring-emerald-200">
                        <Folder className="h-3.5 w-3.5" /> {todayReport.project_name}
                      </span>
                    )}
                    {todayReport.hours_spent && (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs text-emerald-800 ring-1 ring-inset ring-emerald-200">
                        <Clock3 className="h-3.5 w-3.5" /> {todayReport.hours_spent}h spent
                      </span>
                    )}
                  </div>
                )}
                {todayReport.manager_comment && (
                  <div className="mt-4 flex items-start gap-2 rounded-xl bg-blue-50 px-3 py-2.5 text-sm text-blue-700">
                    <MessageSquare className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <p><span className="font-medium">Manager:</span> {todayReport.manager_comment}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-2xl border border-dashed border-amber-300 bg-amber-50/60 px-4 py-4">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                  <Clock3 className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1C1712]">Today&apos;s report isn&apos;t submitted yet</p>
                  <p className="mt-0.5 text-sm text-[#7A6E60]">Use Submit report at the top to log what you worked on.</p>
                </div>
              </div>
            )}
          </section>

          {/* Stats */}
          {list.length > 0 && (
            <section className="border-t border-[#B8860B]/25 bg-white px-6 py-4 lg:px-8">
              <div className="grid grid-cols-3 gap-3">
                {stats.map(({ label, value, Icon, tone }) => (
                  <div key={label} className="flex items-center gap-2.5 rounded-xl bg-[#FAF7F2] px-3 py-2.5">
                    <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${tone}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-lg font-semibold leading-none tabular-nums text-[#1C1712]" style={serif}>{value}</p>
                      <p className="mt-1 truncate text-xs text-[#9A8F82]">{label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Recent reports: latest 5, search for the rest */}
          <ReportsList reports={list} />

        </div>
      </div>
    </div>
  )
}