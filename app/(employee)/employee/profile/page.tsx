import type { ReactNode } from 'react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  BadgeCheck,
  Briefcase,
  Building,
  Calendar,
  Clock,
  CreditCard,
  Landmark,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  User,
  type LucideIcon,
} from 'lucide-react'
import { SalaryReveal } from '@/components/employee/salary-reveal'
import { ChangePasswordModal } from '@/components/employee/change-password-modal'

export const dynamic = 'force-dynamic'

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const formatDate = (value?: string | null) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const tenureLabel = (joinDate?: string | null) => {
  if (!joinDate) return null
  const start = new Date(joinDate)
  if (Number.isNaN(start.getTime())) return null

  const now = new Date()
  let months =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth())
  if (now.getDate() < start.getDate()) months -= 1
  if (months < 0) return null

  const years = Math.floor(months / 12)
  const rest = months % 12
  const parts: string[] = []
  if (years > 0) parts.push(`${years} yr${years > 1 ? 's' : ''}`)
  if (rest > 0) parts.push(`${rest} mo${rest > 1 ? 's' : ''}`)

  return parts.length ? parts.join(' ') : 'New joiner'
}

const show = (value: unknown) => {
  if (value === null || value === undefined) return '—'
  const text = String(value).trim()
  return text === '' ? '—' : text
}

/* -------------------------------------------------------------------------- */
/*  Presentational components                                                 */
/* -------------------------------------------------------------------------- */

function Chip({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-slate-100 ring-1 ring-white/15 sm:px-3 sm:text-xs">
      {icon}
      {children}
    </span>
  )
}

function SectionCard({
  title,
  icon: Icon,
  tone,
  children,
}: {
  title: string
  icon: LucideIcon
  tone: string
  children: ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>
          <Icon size={18} />
        </div>
        <h2 className="text-sm font-bold text-slate-900 sm:text-base">{title}</h2>
      </div>
      <div className="divide-y divide-slate-100">{children}</div>
    </section>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: LucideIcon
  label: string
  value: string
  mono?: boolean
}) {
  const empty = value === '—'

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-5">
      <span className="flex shrink-0 items-center gap-2 text-xs font-medium text-slate-500 sm:text-sm">
        <Icon size={15} className="text-slate-400" />
        {label}
      </span>
      <span
        title={value}
        className={`min-w-0 truncate text-right text-sm font-semibold ${
          empty ? 'text-slate-300' : 'text-slate-900'
        } ${mono ? 'font-mono tracking-tight' : ''}`}
      >
        {value}
      </span>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

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

  const initials =
    employee.full_name
      ?.split(' ')
      .map((n: string) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() ?? '?'

  const joinedOn = formatDate(employee.join_date)
  const tenure = tenureLabel(employee.join_date)

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50/70 via-slate-50 to-white px-4 py-6 pb-28 sm:px-8">
      <div className="mx-auto max-w-2xl">
        {/* Back link */}
        <Link
          href="/employee"
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600"
        >
          <ArrowLeft size={16} />
          Back to portal
        </Link>

        {/* Hero */}
        <section className="relative isolate mb-6 overflow-hidden rounded-3xl bg-slate-900 p-5 text-white shadow-xl sm:p-8">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950" />
          <div
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              backgroundImage:
                'radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)',
              backgroundSize: '18px 18px',
            }}
          />
          <div className="pointer-events-none absolute -right-20 -top-20 -z-10 h-64 w-64 rounded-full bg-indigo-500/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-6 -z-10 h-56 w-56 rounded-full bg-emerald-500/20 blur-3xl" />

          <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-300 sm:text-[11px] sm:tracking-[0.2em]">
            Employee Portal · My Profile
          </p>

          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-xl font-bold ring-1 ring-white/25 backdrop-blur sm:h-20 sm:w-20 sm:text-2xl">
              {initials}
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold sm:text-3xl">
                {employee.full_name}
              </h1>
              <p className="mt-0.5 truncate text-xs text-slate-300 sm:text-sm">
                {employee.designation ?? 'Employee'} · {employee.department ?? '—'}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Chip icon={<BadgeCheck size={14} />}>
              {employee.employee_code ?? employee.employee_id ?? 'N/A'}
            </Chip>

            {employee.is_active && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-200 ring-1 ring-emerald-300/30 sm:px-3 sm:text-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Active
              </span>
            )}

            {tenure && <Chip icon={<Clock size={14} />}>{tenure} with us</Chip>}
          </div>
        </section>

        <div className="space-y-5">
          {/* Personal information */}
          <SectionCard
            title="Personal information"
            icon={User}
            tone="bg-blue-50 text-blue-600"
          >
            <InfoRow icon={User} label="Full name" value={show(employee.full_name)} />
            <InfoRow icon={Mail} label="Email" value={show(employee.email)} />
            <InfoRow icon={Phone} label="Phone" value={show(employee.mobile)} />
          </SectionCard>

          {/* Employment details */}
          <SectionCard
            title="Employment details"
            icon={Briefcase}
            tone="bg-violet-50 text-violet-600"
          >
            <InfoRow icon={Building} label="Department" value={show(employee.department)} />
            <InfoRow icon={Briefcase} label="Designation" value={show(employee.designation)} />
            <InfoRow icon={Calendar} label="Join date" value={show(joinedOn)} />
          </SectionCard>

          {/* Bank, PF & ESIC details */}
          <SectionCard
            title="Bank, PF and ESIC details"
            icon={Landmark}
            tone="bg-amber-50 text-amber-600"
          >
            <InfoRow icon={Landmark} label="Bank name" value={show(employee.bank_name)} />
            <InfoRow icon={CreditCard} label="Account number" value={show(employee.bank_account_no)} mono />
            <InfoRow icon={Landmark} label="IFSC code" value={show(employee.ifsc_code)} mono />
            <InfoRow icon={ShieldCheck} label="PF number" value={show(employee.pf_number)} mono />
            <InfoRow icon={ShieldCheck} label="UAN number" value={show(employee.uan_number)} mono />
            <InfoRow icon={ShieldCheck} label="ESIC number" value={show(employee.esic_number)} mono />
          </SectionCard>

          {/* Salary — masked by default, eye-toggle to reveal */}
          {employee.salary && <SalaryReveal amount={Number(employee.salary)} />}

          {/* Security */}
          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <Lock size={18} />
              </div>
              <h2 className="text-sm font-bold text-slate-900 sm:text-base">Security</h2>
            </div>
            <ChangePasswordModal />
          </section>

          <Link
            href="/employee"
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3.5 text-sm font-medium text-slate-600 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600"
          >
            <ArrowLeft size={16} />
            Back to dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}