import type { ComponentProps, ReactNode } from "react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  Briefcase,
  CalendarDays,
  FileText,
  MapPin,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import SalarySlipList from "@/components/employee/salary-slip-list";

export const dynamic = "force-dynamic";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

// Prop type comes straight from the list component, so they never drift apart.
type SalarySlipItem = ComponentProps<typeof SalarySlipList>["slips"][number];
type SupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

type EmployeeRecord = {
  id: string;
  full_name: string | null;
  employee_code: string | null;
  designation?: string | null;
  department?: string | null;
  join_date?: string | null;
  bank_name?: string | null;
  bank_account_no?: string | null;
  pan_number?: string | null;
  pf_number?: string | null;
  uan_number?: string | null;
};

type SalarySlipRecord = {
  id: string;
  company_id: string;
  employee_id: string;
  month: number;
  year: number;
  effective_work_days: number | null;
  lop_days: number | null;
  basic_full: number | null;
  hra_full: number | null;
  special_allowance_full: number | null;
  incentive_full: number | null;
  basic_actual: number | null;
  hra_actual: number | null;
  special_allowance_actual: number | null;
  incentive_actual: number | null;
  pf_deduction: number | null;
  emi_deduction: number | null;
  total_deductions: number | null;
  gross_salary: number | null;
  net_salary: number | null;
  net_salary_in_words: string | null;
  status: string;
  auto_generated: boolean;
  created_at: string;
  updated_at: string;
  emi_remaining_after: number | null;
};

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const SLIP_COLUMNS = `
  id, company_id, employee_id, month, year,
  effective_work_days, lop_days,
  basic_full, hra_full, special_allowance_full, incentive_full,
  basic_actual, hra_actual, special_allowance_actual, incentive_actual,
  pf_deduction, emi_deduction, total_deductions,
  gross_salary, net_salary, net_salary_in_words,
  status, auto_generated, created_at, updated_at, emi_remaining_after
`;

const formatINR = (amount: number | null | undefined) =>
  `₹${Number(amount ?? 0).toLocaleString("en-IN")}`;

const monthName = (month: number) => MONTHS[month - 1] ?? String(month);

const getInitials = (name: string | null | undefined) =>
  (name ?? "Employee")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "E";

/* -------------------------------------------------------------------------- */
/*  Data access                                                               */
/* -------------------------------------------------------------------------- */

async function getEmployeeByEmail(supabase: SupabaseClient, email: string) {
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("email", email)
    .single();

  if (error || !data) {
    console.error("Employee fetch failed:", error?.message);
    return null;
  }

  return data as unknown as EmployeeRecord;
}

async function getPublishedSlips(supabase: SupabaseClient, employeeId: string) {
  const { data, error } = await supabase
    .from("payslips")
    .select(SLIP_COLUMNS)
    .eq("employee_id", employeeId)
    .eq("status", "published")
    .order("year", { ascending: false })
    .order("month", { ascending: false });

  if (error) {
    console.error("Salary slips fetch failed:", error.message);
    return null;
  }

  return (data ?? []) as unknown as SalarySlipRecord[];
}

function toListItems(
  records: SalarySlipRecord[],
  employee: EmployeeRecord
): SalarySlipItem[] {
  return records.map(
    (slip) =>
      ({
        ...slip,
        employee_name: employee.full_name ?? "Employee",
        employee_no: employee.employee_code ?? "-",
        employee_designation: employee.designation ?? "Employee",
        employee_department: employee.department ?? "-",
        joining_date: employee.join_date ?? "",
        bank_name: employee.bank_name ?? "",
        bank_account_no: employee.bank_account_no ?? "",
        pan_number: employee.pan_number ?? "",
        pf_no: employee.pf_number ?? "",
        pf_uan: employee.uan_number ?? "",
        location: "Hyderabad",
      }) as SalarySlipItem
  );
}

/* -------------------------------------------------------------------------- */
/*  Presentational components                                                 */
/* -------------------------------------------------------------------------- */

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50/70 via-slate-50 to-white px-4 py-6 pb-28 sm:px-8">
      <div className="mx-auto max-w-5xl">{children}</div>
    </main>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <Shell>
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-700">
        {message}
      </div>
    </Shell>
  );
}

function BackLink() {
  return (
    <Link
      href="/employee/menu"
      className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600"
    >
      <ArrowLeft size={16} />
      Back to Menu
    </Link>
  );
}

function Chip({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-slate-100 sm:px-3 sm:text-xs ring-1 ring-white/15">
      {icon}
      {children}
    </span>
  );
}

function Hero({
  employee,
  latest,
  previous,
}: {
  employee: EmployeeRecord;
  latest?: SalarySlipRecord;
  previous?: SalarySlipRecord;
}) {
  const delta =
    latest && previous
      ? Number(latest.net_salary ?? 0) - Number(previous.net_salary ?? 0)
      : null;

  return (
    <section className="relative isolate mb-6 overflow-hidden rounded-3xl bg-slate-900 p-5 text-white shadow-xl sm:p-8">
      {/* Background layers (kept separate so the gradient is never overridden) */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950" />
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      />
      <div className="pointer-events-none absolute -right-20 -top-20 -z-10 h-64 w-64 rounded-full bg-indigo-500/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-6 -z-10 h-56 w-56 rounded-full bg-emerald-500/20 blur-3xl" />

      <div className="relative grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
        {/* Profile */}
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-lg font-bold sm:h-16 sm:w-16 sm:text-xl ring-1 ring-white/25 backdrop-blur">
            {getInitials(employee.full_name)}
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-300 sm:text-[11px] sm:tracking-[0.2em]">
              Employee Portal · Salary Slips
            </p>
            <h1 className="mt-1 truncate text-xl font-bold sm:text-3xl">
              {employee.full_name ?? "Employee"}
            </h1>

            <div className="mt-3 flex flex-wrap gap-2">
              <Chip icon={<BadgeCheck size={14} />}>
                {employee.employee_code ?? "No code"}
              </Chip>
              <Chip icon={<Briefcase size={14} />}>
                {employee.designation ?? "Employee"}
              </Chip>
              <Chip icon={<MapPin size={14} />}>Hyderabad</Chip>
            </div>
          </div>
        </div>

        {/* Latest net salary glass card */}
        {latest && (
          <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/20 backdrop-blur sm:p-5 md:min-w-[250px]">
            <p className="text-xs font-medium uppercase tracking-widest text-emerald-300">
              {monthName(latest.month)} {latest.year}
            </p>
            <p className="mt-1 text-3xl font-extrabold tracking-tight">
              {formatINR(latest.net_salary)}
            </p>
            <p className="text-xs text-slate-300">Net salary credited</p>

            {delta !== null && (
              <span
                className={`mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  delta >= 0
                    ? "bg-emerald-400/20 text-emerald-200"
                    : "bg-rose-400/20 text-rose-200"
                }`}
              >
                {delta >= 0 ? (
                  <TrendingUp size={13} />
                ) : (
                  <TrendingDown size={13} />
                )}
                {delta === 0
                  ? "Same as last month"
                  : `${formatINR(Math.abs(delta))} vs last month`}
              </span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
  accent: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm sm:p-4">
      <div className={`absolute inset-x-0 top-0 h-1 ${accent}`} />
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <p className="text-[10px] font-semibold uppercase tracking-wide sm:text-[11px]">
          {label}
        </p>
      </div>
      <p className="mt-2 break-words text-lg font-bold text-slate-900 sm:text-2xl">
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default async function SalarySlipsPage() {
  const supabase = await createServerSupabaseClient();

  // 1. Verify the logged-in user.
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  if (!user.email) {
    return (
      <ErrorState message="Your account email is unavailable. Please contact HR." />
    );
  }

  // 2. Employee profile.
  const employee = await getEmployeeByEmail(supabase, user.email);

  if (!employee) {
    return (
      <ErrorState message="Employee profile not found. Please contact HR." />
    );
  }

  // 3. Published payslips for this employee only.
  const records = await getPublishedSlips(supabase, employee.id);

  if (!records) {
    return (
      <ErrorState message="Unable to load salary slips. Please try again later." />
    );
  }

  const slips = toListItems(records, employee);
  const latest = records[0];
  const previous = records[1];

  const totalEarned = records.reduce(
    (sum, slip) => sum + Number(slip.net_salary ?? 0),
    0
  );
  const average = records.length ? Math.round(totalEarned / records.length) : 0;

  return (
    <Shell>
      <BackLink />
      <Hero employee={employee} latest={latest} previous={previous} />

      <section className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          accent="bg-blue-500"
          icon={<FileText size={15} />}
          label="Published slips"
          value={String(records.length)}
        />
        <StatCard
          accent="bg-emerald-500"
          icon={<Wallet size={15} />}
          label="Latest net"
          value={latest ? formatINR(latest.net_salary) : "—"}
          hint={latest ? `${monthName(latest.month)} ${latest.year}` : undefined}
        />
        <StatCard
          accent="bg-violet-500"
          icon={<CalendarDays size={15} />}
          label="Total earned"
          value={formatINR(totalEarned)}
          hint="All published slips"
        />
        <StatCard
          accent="bg-amber-500"
          icon={<TrendingUp size={15} />}
          label="Monthly average"
          value={formatINR(average)}
          hint="Net salary"
        />
      </section>

      <SalarySlipList slips={slips} />
    </Shell>
  );
}