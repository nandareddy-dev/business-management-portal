import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ApplyLeaveButton } from '@/components/employee/apply-leave-button'

export const dynamic = 'force-dynamic'

const statusStyle: Record<string, string> = {
  pending:  'text-amber-700',
  approved: 'text-emerald-700',
  rejected: 'text-rose-600',
}

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
      <div className="min-h-screen bg-[#EFE9DD] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <p className="text-[#1C1712] text-sm font-medium mb-1">Couldn&apos;t load your leave details</p>
          <p className="text-[#9A8F82] text-xs mb-4">Something went wrong fetching your employee record. Please try again.</p>
          <Link href="/employee" className="text-[#B8860B] text-xs font-semibold hover:underline">
            ← Back to portal
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

  const mono = { fontFamily: 'ui-monospace, "JetBrains Mono", monospace' }
  const serif = { fontFamily: 'Georgia, serif' }
  const ringR = 22
  const ringC = 2 * Math.PI * ringR
  const dateTz = { timeZone: 'Asia/Kolkata' } as const

  const leaves = balance ? [
    { type: 'CL', full: 'Casual', total: balance.cl_total, used: balance.cl_used, stroke: '#B8860B' },
    { type: 'SL', full: 'Sick',   total: balance.sl_total, used: balance.sl_used, stroke: '#8B6914' },
    { type: 'EL', full: 'Earned', total: balance.el_total, used: balance.el_used, stroke: '#6B5410' },
  ] : []

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
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="text-[24px] text-white italic" style={{ fontFamily: 'Georgia, serif', fontWeight: 500 }}>Leave Management</h1>
                  <p className="text-[11px] text-white/40 mt-1 tracking-wide" style={mono}>TRACK & APPLY FOR LEAVES</p>
                </div>
                <ApplyLeaveButton employeeId={employee.id} companyId={employee.company_id} balance={balance} />
              </div>
            </div>
          </div>

          {dataLoadFailed && (
            <div className="bg-rose-50 border-t border-rose-200 px-6 py-3 lg:px-8">
              <p className="text-[11px] text-rose-600">
                ⚠ Some leave data couldn&apos;t be loaded right now. Please refresh the page — if this keeps happening, contact admin.
              </p>
            </div>
          )}

          {/* §1 — Leave Ledger */}
          {balance && (
            <div className="bg-[#FAF7F2] border-t border-[#B8860B]/25 px-6 py-5 lg:px-8">
              <p className="text-[9px] tracking-[3px] text-[#8B6914] font-semibold mb-4 uppercase" style={mono}>
                §1 — Leave Ledger — {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric', ...dateTz })}
              </p>
              <div className="grid grid-cols-3 lg:max-w-md">
                {leaves.map((l, i) => {
                  const remaining = l.total - l.used
                  const pctRaw = l.total > 0 ? remaining / l.total : 0
                  const pctClamped = Math.max(0, Math.min(1, pctRaw))
                  const offset = ringC * (1 - pctClamped)
                  const isNegative = remaining < 0
                  return (
                    <div key={l.type} className={`text-center ${i > 0 ? 'border-l border-[#E2D9C8]' : ''}`}>
                      <div className="relative w-14 h-14 mx-auto mb-2">
                        <svg className="w-14 h-14 -rotate-90" viewBox="0 0 52 52">
                          <circle cx="26" cy="26" r={ringR} fill="none" stroke="#E2D9C8" strokeWidth="2.5" />
                          <circle cx="26" cy="26" r={ringR} fill="none" stroke={isNegative ? '#DC2626' : l.stroke} strokeWidth="2.5"
                            strokeDasharray={ringC} strokeDashoffset={isNegative ? 0 : offset} strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className={`text-base ${isNegative ? 'text-rose-600' : 'text-[#1C1712]'}`} style={serif}>{remaining}</span>
                        </div>
                      </div>
                      <p className="text-[10px] tracking-[1px] text-[#8B6914] font-medium uppercase">{l.type}</p>
                      <p className="text-[10px] text-[#9A8F82]">{l.full}</p>
                      <p className={`text-[10px] mt-0.5 ${isNegative ? 'text-rose-600 font-medium' : 'text-[#9A8F82]'}`}>{l.used}/{l.total} used</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* §2 — Summary */}
          {apps.length > 0 && (
            <div className="bg-white border-t border-[#B8860B]/25 px-6 py-4 lg:px-8">
              <p className="text-[9px] tracking-[3px] text-[#8B6914] font-semibold mb-3 uppercase" style={mono}>§2 — Summary</p>
              <div className="grid grid-cols-3">
                {[
                  { label: 'Pending',  value: pendingCount,  color: 'text-amber-700' },
                  { label: 'Approved', value: approvedCount, color: 'text-emerald-700' },
                  { label: 'Rejected', value: rejectedCount, color: 'text-rose-600' },
                ].map((s, i) => (
                  <div key={s.label} className={`text-center ${i > 0 ? 'border-l border-[#E2D9C8]' : ''}`}>
                    <p className={`text-xl ${s.color}`} style={serif}>{s.value}</p>
                    <p className="text-[9px] tracking-[1px] text-[#9A8F82] uppercase mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* §3 — Leave History */}
          <div className="bg-[#FAF7F2] border-t border-[#B8860B]/25">
            <div className="flex items-center justify-between px-6 lg:px-8 pt-4 pb-1.5">
              <p className="text-[9px] tracking-[3px] text-[#8B6914] font-semibold uppercase" style={mono}>§3 — Leave History</p>
              <p className="text-[10px] text-[#9A8F82]">{apps.length} applications</p>
            </div>

            <div>
              {apps.map((a, idx) => {
                const color = statusStyle[a.status] ?? 'text-[#9A8F82]'
                const days = a.days ?? 0
                return (
                  <div key={a.id} className={`px-6 lg:px-8 py-3.5 flex items-start justify-between gap-3 ${idx > 0 ? 'border-t border-[#F0EAE0]' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] font-medium text-[#B8860B] tracking-wide uppercase" style={mono}>{a.leave_type}</span>
                        <span className="text-[#D0C9BE] text-[10px]">·</span>
                        <span className="text-[10px] text-[#9A8F82]">{days} day{days > 1 ? 's' : ''}</span>
                      </div>
                      <p className="text-[14px] text-[#1C1712]" style={serif}>
                        {new Date(a.from_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', ...dateTz })}
                        {a.from_date !== a.to_date && (
                          <> – {new Date(a.to_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', ...dateTz })}</>
                        )}
                        <span className="text-[#9A8F82]"> {new Date(a.from_date).toLocaleDateString('en-IN', { year: 'numeric', ...dateTz })}</span>
                      </p>
                      {a.reason && (
                        <p className="text-[11px] text-[#9A8F82] mt-0.5 truncate">{a.reason}</p>
                      )}
                      {a.manager_comment && (
                        <p className="text-[11px] text-blue-600 mt-1">💬 {a.manager_comment}</p>
                      )}
                    </div>
                    <span className={`text-[11px] font-medium capitalize flex-shrink-0 mt-0.5 ${color}`}>{a.status}</span>
                  </div>
                )
              })}

              {!apps.length && (
                <div className="py-10 text-center px-6">
                  <p className="text-[#9A8F82] text-sm">No leave applications yet</p>
                  <p className="text-[#B8B0A0] text-xs mt-1">Apply for your first leave above</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}