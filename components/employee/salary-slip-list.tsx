"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Download,
  EyeOff,
  FileText,
  Search,
  X,
} from "lucide-react";
import PaySlipViewModal from "@/components/hr/PaySlipViewModal";
import type { PaySlip } from "@/app/(dashboard)/hr/payslips/page";

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

// Optional breakdown fields — read safely so this file never breaks on type drift.
type SlipDetails = PaySlip &
  Partial<
    Record<
      | "basic_actual"
      | "hra_actual"
      | "special_allowance_actual"
      | "incentive_actual"
      | "effective_work_days"
      | "lop_days",
      number | null
    >
  >;

const money = (value: number | null | undefined) =>
  `₹${Number(value ?? 0).toLocaleString("en-IN")}`;

const monthName = (month: number) =>
  MONTHS[Number(month) - 1] ?? `Month ${month}`;

const monthShort = (month: number) =>
  (MONTHS[Number(month) - 1] ?? "—").slice(0, 3).toUpperCase();

const num = (value: number | null | undefined) => Number(value ?? 0);

/** "jun", "june 2026", "2026", "06-2026" ... all find the right slip. */
function matchesQuery(slip: PaySlip, query: string) {
  const tokens = query
    .toLowerCase()
    .split(/[\s,/-]+/)
    .filter(Boolean);

  if (tokens.length === 0) return true;

  const month = Number(slip.month);
  const haystack = [
    monthName(month).toLowerCase(),
    String(slip.year),
    String(month).padStart(2, "0"),
  ].join(" ");

  return tokens.every((token) => haystack.includes(token));
}

/* -------------------------------------------------------------------------- */
/*  Visuals                                                                   */
/* -------------------------------------------------------------------------- */

function Donut({ percent }: { percent: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const dash = (Math.min(100, Math.max(0, percent)) / 100) * circumference;

  return (
    <div className="relative h-32 w-32 shrink-0 sm:h-36 sm:w-36">
      <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          strokeWidth="14"
          className="stroke-rose-100"
        />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          className="stroke-emerald-500"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold text-slate-900">
          {Math.round(percent)}%
        </span>
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
          Take-home
        </span>
      </div>
    </div>
  );
}

function Composition({ slip }: { slip: SlipDetails }) {
  const parts = [
    { label: "Basic", value: num(slip.basic_actual), color: "bg-blue-500" },
    { label: "HRA", value: num(slip.hra_actual), color: "bg-violet-500" },
    {
      label: "Special allowance",
      value: num(slip.special_allowance_actual),
      color: "bg-amber-500",
    },
    {
      label: "Incentive",
      value: num(slip.incentive_actual),
      color: "bg-emerald-500",
    },
  ].filter((part) => part.value > 0);

  const total = parts.reduce((sum, part) => sum + part.value, 0);

  if (total === 0) return null;

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Earnings breakdown
      </p>

      <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
        {parts.map((part) => (
          <div
            key={part.label}
            className={part.color}
            style={{ width: `${(part.value / total) * 100}%` }}
            title={`${part.label}: ${money(part.value)}`}
          />
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {parts.map((part) => (
          <span
            key={part.label}
            className="inline-flex items-center gap-1.5 text-xs text-slate-600"
          >
            <span className={`h-2.5 w-2.5 rounded-full ${part.color}`} />
            {part.label}
            <span className="font-semibold text-slate-900">
              {money(part.value)}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Latest (featured) slip                                                    */
/* -------------------------------------------------------------------------- */

function FeaturedSlip({
  slip,
  onOpen,
}: {
  slip: PaySlip;
  onOpen: (slip: PaySlip) => void;
}) {
  const details = slip as SlipDetails;
  const gross = num(slip.gross_salary);
  const net = num(slip.net_salary);
  const deductions = num(slip.total_deductions);
  const share = gross > 0 ? (net / gross) * 100 : 100;

  return (
    <article className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-400" />

      <div className="p-4 sm:p-7">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow sm:h-14 sm:w-14">
              <span className="text-[10px] font-semibold tracking-widest opacity-80">
                {monthShort(slip.month)}
              </span>
              <span className="text-sm font-bold leading-none">{slip.year}</span>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600">
                Latest salary slip
              </p>
              <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                {monthName(slip.month)} {slip.year}
              </h3>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <CheckCircle2 size={14} />
            Published
          </span>
        </div>

        <div className="grid items-center gap-6 md:grid-cols-[auto_1fr]">
          <div className="mx-auto">
            <Donut percent={share} />
          </div>

          <div className="space-y-5">
            <div className="text-center md:text-left">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Net salary
              </p>
              <p className="text-3xl font-extrabold tracking-tight text-emerald-700 sm:text-4xl">
                {money(net)}
              </p>
              {slip.net_salary_in_words && (
                <p className="mt-0.5 text-xs text-slate-500">
                  {slip.net_salary_in_words}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Metric label="Gross" value={money(gross)} />
              <Metric label="Deductions" value={money(deductions)} />
              <Metric
                label="Working days"
                value={String(num(details.effective_work_days))}
              />
              <Metric label="LOP days" value={String(num(details.lop_days))} />
            </div>

            <Composition slip={details} />
          </div>
        </div>

        <button
          type="button"
          onClick={() => onOpen(slip)}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 sm:w-auto"
        >
          <Download size={16} />
          View &amp; download slip
        </button>
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Search-result row                                                         */
/* -------------------------------------------------------------------------- */

function ResultRow({
  slip,
  onOpen,
}: {
  slip: PaySlip;
  onOpen: (slip: PaySlip) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(slip)}
      aria-label={`View ${monthName(slip.month)} ${slip.year} salary slip`}
      className="group flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left sm:gap-4 sm:p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white sm:h-14 sm:w-14">
        <span className="text-[10px] font-semibold tracking-widest opacity-80">
          {monthShort(slip.month)}
        </span>
        <span className="text-sm font-bold leading-none">{slip.year}</span>
      </div>

      <div className="min-w-0 flex-1">
        <h4 className="font-semibold text-slate-900">
          {monthName(slip.month)} {slip.year}
        </h4>
        <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
          Gross {money(slip.gross_salary)} · Deductions{" "}
          {money(slip.total_deductions)}
        </p>
      </div>

      <div className="text-right">
        <p className="text-[11px] uppercase tracking-wide text-slate-400">
          Net
        </p>
        <p className="text-base font-bold text-emerald-700 sm:text-lg">
          {money(slip.net_salary)}
        </p>
      </div>

      <ChevronRight
        size={20}
        className="hidden shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-600 sm:block"
      />
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  List                                                                      */
/* -------------------------------------------------------------------------- */

export default function SalarySlipList({ slips }: { slips: PaySlip[] }) {
  const [selectedSlip, setSelectedSlip] = useState<PaySlip | null>(null);
  const [query, setQuery] = useState("");

  const trimmed = query.trim();
  const latest = slips[0];
  const hiddenCount = Math.max(0, slips.length - 1);

  const results = useMemo(
    () => (trimmed ? slips.filter((slip) => matchesQuery(slip, trimmed)) : []),
    [slips, trimmed]
  );

  return (
    <>
      <section>
        {/* Header + search */}
        <div className="mb-4">
          <h2 className="text-base font-bold text-slate-900 sm:text-lg">
            Monthly Salary History
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Your latest slip is shown below. Search a month to open any older
            slip.
          </p>
        </div>

        {slips.length > 0 && (
          <div className="relative mb-5">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search month or year — e.g. June 2026"
              aria-label="Search salary slips by month"
              className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-11 pr-11 text-base text-slate-900 sm:text-sm shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}

        {slips.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
              <FileText size={26} />
            </div>
            <h3 className="mt-4 font-semibold text-slate-900">
              No Salary Slips Available
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Your published monthly salary slips will appear here.
            </p>
          </div>
        ) : trimmed ? (
          /* ---------------- Search results ---------------- */
          results.length > 0 ? (
            <div>
              <p className="mb-3 text-sm text-slate-500">
                {results.length} slip{results.length > 1 ? "s" : ""} found for{" "}
                <span className="font-semibold text-slate-900">
                  “{trimmed}”
                </span>
              </p>

              <div className="space-y-3">
                {results.map((slip) => (
                  <ResultRow
                    key={slip.id}
                    slip={slip}
                    onOpen={setSelectedSlip}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <Search size={22} />
              </div>
              <h3 className="mt-3 font-semibold text-slate-900">
                No slip found for “{trimmed}”
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Try a month name like “June” or a month with year like “June
                2026”.
              </p>
            </div>
          )
        ) : (
          /* ---------------- Latest slip only ---------------- */
          <div className="space-y-4">
            <FeaturedSlip slip={latest} onOpen={setSelectedSlip} />

            {hiddenCount > 0 && (
              <div className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white/70 px-4 py-3 text-sm text-slate-500">
                <EyeOff size={18} className="shrink-0 text-slate-400" />
                <p>
                  <span className="font-semibold text-slate-700">
                    {hiddenCount} older slip{hiddenCount > 1 ? "s" : ""}
                  </span>{" "}
                  hidden. Search a month above to view it.
                </p>
              </div>
            )}
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