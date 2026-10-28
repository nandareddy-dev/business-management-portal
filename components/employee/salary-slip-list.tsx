
"use client";

import { useState } from "react";
import { FileText, ChevronRight } from "lucide-react";
import PaySlipViewModal from "@/components/hr/PaySlipViewModal";
import type { PaySlip } from "@/app/(dashboard)/hr/payslips/page";

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

const money = (value: number | null | undefined) =>
  `₹${Number(value ?? 0).toLocaleString("en-IN")}`;

export default function SalarySlipList({
  slips,
}: {
  slips: PaySlip[];
}) {
  const [selectedSlip, setSelectedSlip] = useState<PaySlip | null>(null);

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Monthly Salary History
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Select a month to view your salary details and download your payslip.
          </p>
        </div>

        {slips.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <FileText size={26} />
            </div>

            <h3 className="mt-4 font-semibold text-slate-900">
              No Salary Slips Available
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Your published monthly salary slips will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {slips.map((slip) => {
              const monthName =
                MONTHS[Number(slip.month) - 1] ?? `Month ${slip.month}`;

              return (
                <button
                  key={slip.id}
                  type="button"
                  onClick={() => setSelectedSlip(slip)}
                  aria-label={`View ${monthName} ${slip.year} salary slip`}
                  className="group flex w-full flex-col gap-4 p-5 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 transition-colors group-hover:bg-blue-100">
                      <FileText size={24} />
                    </div>

                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-900">
                        {monthName} {slip.year}
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        Salary Slip · Published
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Gross: {money(slip.gross_salary)}
                        {" · "}
                        Deductions: {money(slip.total_deductions)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="sm:text-right">
                      <p className="text-xs text-slate-500">Net Salary</p>

                      <p className="text-xl font-bold text-emerald-700">
                        {money(slip.net_salary)}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {slip.net_salary_in_words || ""}
                      </p>
                    </div>

                    <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-blue-700">
                      View Slip
                      <ChevronRight
                        size={18}
                        className="transition-transform group-hover:translate-x-0.5"
                      />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {selectedSlip && (
        <PaySlipViewModal
          payslip={selectedSlip}
          onClose={() => setSelectedSlip(null)}
        />
      )}
    </>
  );
}
