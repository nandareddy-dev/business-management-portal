import type { ComponentProps } from "react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, Wallet } from "lucide-react";
import SalarySlipList from "@/components/employee/salary-slip-list";

export const dynamic = "force-dynamic";

// Prop type is taken directly from the component, so page and component never go out of sync.
type SalarySlipItem = ComponentProps<typeof SalarySlipList>["slips"][number];

type EmployeeRecord = {
  id: string;
  full_name: string | null;
  employee_code: string | null;
  designation?: string | null;
  department?: string | null;
  join_date?: string | null;
  bank_name?: string | null;
  account_number?: string | null;
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

const formatINR = (amount: number | null | undefined) =>
  `₹${Number(amount ?? 0).toLocaleString("en-IN")}`;

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
      <main className="min-h-screen bg-slate-50 p-6">
        <p className="text-red-600">
          Your account email is unavailable. Please contact HR.
        </p>
      </main>
    );
  }

  // 2. Find the employee profile.
  const { data: employeeData, error: employeeError } = await supabase
    .from("employees")
    .select("*")
    .eq("email", user.email)
    .single();

  if (employeeError || !employeeData) {
    console.error("Employee fetch failed:", employeeError?.message);

    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <p className="text-red-600">
          Employee profile not found. Please contact HR.
        </p>
      </main>
    );
  }

  const employee = employeeData as unknown as EmployeeRecord;

  // 3. Fetch only this employee's published payslips.
  const { data: slipsData, error: slipsError } = await supabase
    .from("payslips")
    .select(`
      id,
      company_id,
      employee_id,
      month,
      year,
      effective_work_days,
      lop_days,
      basic_full,
      hra_full,
      special_allowance_full,
      incentive_full,
      basic_actual,
      hra_actual,
      special_allowance_actual,
      incentive_actual,
      pf_deduction,
      emi_deduction,
      total_deductions,
      gross_salary,
      net_salary,
      net_salary_in_words,
      status,
      auto_generated,
      created_at,
      updated_at,
      emi_remaining_after
    `)
    .eq("employee_id", employee.id)
    .eq("status", "published")
    .order("year", { ascending: false })
    .order("month", { ascending: false });

  if (slipsError) {
    console.error("Salary slips fetch failed:", slipsError.message);

    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <p className="text-red-600">
          Unable to load salary slips. Please try again later.
        </p>
      </main>
    );
  }

  const slips: SalarySlipItem[] = (
    (slipsData ?? []) as unknown as SalarySlipRecord[]
  ).map(
    (slip) =>
      ({
        ...slip,
        employee_name: employee.full_name ?? "Employee",
        employee_no: employee.employee_code ?? "-",
        employee_designation: employee.designation ?? "Employee",
        employee_department: employee.department ?? "-",
        joining_date: employee.join_date ?? "",
        bank_name: employee.bank_name ?? "",
        bank_account_no: employee.account_number ?? "",
        pan_number: employee.pan_number ?? "",
        pf_no: employee.pf_number ?? "",
        pf_uan: employee.uan_number ?? "",
        location: "Hyderabad",
      }) as SalarySlipItem
  );

  const latestSlip = slips[0];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 pb-24 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/employee/menu"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-blue-600"
        >
          <ArrowLeft size={16} />
          Back to Menu
        </Link>

        <section className="mb-8 rounded-2xl bg-gradient-to-r from-slate-900 to-blue-900 p-6 text-white sm:p-8">
          <p className="text-sm font-medium text-blue-200">
            Employee Portal
          </p>

          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
            Salary Slips
          </h1>

          <p className="mt-2 text-sm text-slate-300">
            {employee.full_name ?? "Employee"} ·{" "}
            {employee.employee_code ?? "Employee"}
          </p>

          <p className="mt-2 text-sm text-slate-300">
            View your published monthly salary details and download your
            salary slip.
          </p>
        </section>

        <section className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
                <FileText size={22} />
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Published Salary Slips
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {slips.length}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
                <Wallet size={22} />
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Latest Net Salary
                </p>

                <p className="text-2xl font-bold text-emerald-700">
                  {latestSlip ? formatINR(latestSlip.net_salary) : "—"}
                </p>

                {latestSlip && (
                  <p className="mt-1 text-xs text-slate-500">
                    {MONTHS[latestSlip.month - 1] ?? latestSlip.month}{" "}
                    {latestSlip.year}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        <SalarySlipList slips={slips} />
      </div>
    </main>
  );
}