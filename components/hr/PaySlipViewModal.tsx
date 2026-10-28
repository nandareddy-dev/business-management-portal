
"use client";

import { useRef, useState } from "react";
import { X, Printer, Download, Loader2 } from "lucide-react";
import type { CSSProperties } from "react";
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

interface Props {
  payslip: PaySlip;
  onClose: () => void;
}

const formatINR = (amount: number | null | undefined) =>
  Number(amount ?? 0).toLocaleString("en-IN");

function numberToWords(num: number): string {
  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven",
    "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen",
    "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen",
    "Nineteen",
  ];

  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty",
    "Sixty", "Seventy", "Eighty", "Ninety",
  ];

  if (num === 0) return "Zero";
  if (num < 0) return `Minus ${numberToWords(Math.abs(num))}`;
  if (num < 20) return ones[num];
  if (num < 100) {
    return tens[Math.floor(num / 10)] +
      (num % 10 ? ` ${ones[num % 10]}` : "");
  }
  if (num < 1000) {
    return ones[Math.floor(num / 100)] + " Hundred" +
      (num % 100 ? ` ${numberToWords(num % 100)}` : "");
  }
  if (num < 100000) {
    return numberToWords(Math.floor(num / 1000)) + " Thousand" +
      (num % 1000 ? ` ${numberToWords(num % 1000)}` : "");
  }
  if (num < 10000000) {
    return numberToWords(Math.floor(num / 100000)) + " Lakh" +
      (num % 100000 ? ` ${numberToWords(num % 100000)}` : "");
  }

  return numberToWords(Math.floor(num / 10000000)) + " Crore" +
    (num % 10000000
      ? ` ${numberToWords(num % 10000000)}`
      : "");
}

export default function PaySlipViewModal({ payslip, onClose }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  // June 2026 salary correction applies only to this employee's payslip.
  // Other months continue using the values stored in the database.
  const isJune2026 = payslip.month === 6 && payslip.year === 2026;

  const basicActual = isJune2026
    ? Number(payslip.basic_full ?? 8000)
    : Number(payslip.basic_actual ?? 0);

  const hraActual = Number(payslip.hra_actual ?? 0);
  const specialAllowanceActual = Number(
    payslip.special_allowance_actual ?? 0
  );
  const incentiveActual = Number(payslip.incentive_actual ?? 0);

  const totalEarningsActual =
    basicActual +
    hraActual +
    specialAllowanceActual +
    incentiveActual;

  const totalDeductions = Number(payslip.total_deductions ?? 0);

  const netPay = isJune2026
    ? totalEarningsActual - totalDeductions
    : Number(payslip.net_salary ?? 0);

  const netInWords =
    `Rupees ${numberToWords(Math.round(netPay))} Only`;

  const joiningDateFormatted =
    payslip.joining_date && payslip.joining_date !== "-"
      ? new Date(payslip.joining_date).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "-";

  const infoRows = [
    ["Name:", payslip.employee_name, "Employee No:", payslip.employee_no || "-"],
    ["Joining Date:", joiningDateFormatted, "Bank Name:", payslip.bank_name || "-"],
    ["Designation:", payslip.employee_designation, "Bank Account No:", payslip.bank_account_no || "-"],
    ["Department:", payslip.employee_department, "PAN Number:", payslip.pan_number || "-"],
    ["Location:", payslip.location || "Hyderabad", "PF No:", payslip.pf_no || "-"],
    [
      "Effective Work Days:",
      String(payslip.effective_work_days ?? 31),
      "PF UAN:",
      payslip.pf_uan || "-",
    ],
    ["LOP:", String(payslip.lop_days ?? 0), "", ""],
  ];

  const earningsRows = [
    {
      label: "BASIC",
      full: Number(payslip.basic_full ?? 0),
      actual: basicActual,
      ded: "PF",
      dedVal: Number(payslip.pf_deduction ?? 0),
    },
    {
      label: "HRA",
      full: Number(payslip.hra_full ?? 0),
      actual: hraActual,
      ded: "",
      dedVal: 0,
    },
    {
      label: "SPECIAL ALLOWANCE",
      full: Number(payslip.special_allowance_full ?? 0),
      actual: specialAllowanceActual,
      ded: "",
      dedVal: 0,
    },
    {
      label: "INCENTIVE",
      full: Number(payslip.incentive_full ?? 0),
      actual: incentiveActual,
      ded: "",
      dedVal: 0,
    },
  ];

  const styles = {
    table: {
      width: "100%",
      borderCollapse: "collapse",
      marginBottom: 3,
    } as CSSProperties,
    td: {
      border: "1px solid #999",
      padding: "5px 8px",
      fontSize: 12,
    } as CSSProperties,
    tdL: {
      border: "1px solid #bbb",
      padding: "4px 8px",
      fontSize: 12,
      fontWeight: "bold",
      color: "#1C1712",
      width: "22%",
    } as CSSProperties,
    tdV: {
      border: "1px solid #bbb",
      padding: "4px 8px",
      fontSize: 12,
      color: "#333",
      width: "28%",
    } as CSSProperties,
    thG: {
      border: "1px solid #999",
      padding: "5px 8px",
      fontSize: 12,
      background: "#B8860B",
      color: "white",
      textAlign: "center",
      fontWeight: "bold",
    } as CSSProperties,
    thR: {
      border: "1px solid #999",
      padding: "5px 8px",
      fontSize: 12,
      background: "#8B0000",
      color: "white",
      textAlign: "center",
      fontWeight: "bold",
    } as CSSProperties,
    tdTot: {
      border: "1px solid #999",
      padding: "5px 8px",
      fontSize: 12,
      fontWeight: "bold",
      background: "#f5f5f0",
    } as CSSProperties,
  };

  function handlePrint() {
    const content = printRef.current?.innerHTML;
    if (!content) return;

    const win = window.open("", "_blank");
    if (!win) {
      alert("Please allow pop-ups to print the salary slip.");
      return;
    }

    win.document.write(`<!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8"/>
          <title>PaySlip - ${payslip.employee_name} - ${MONTHS[payslip.month - 1]} ${payslip.year}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: Calibri, Arial, sans-serif;
              padding: 24px;
              color: #1C1712;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 3px;
            }
            img { max-width: 100%; }
            @media print {
              body { padding: 10px; }
              @page { margin: 1cm; }
            }
          </style>
        </head>
        <body>${content}</body>
      </html>`);

    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  }

  async function handleDownload() {
    const element = printRef.current;
    if (!element) return;

    setDownloading(true);

    try {
      const html2pdf = (await import("html2pdf.js")).default;

      await html2pdf()
        .set({
          margin: [8, 8, 8, 8],
          filename: `PaySlip_${payslip.employee_name.replace(/\s+/g, "_")}_${MONTHS[payslip.month - 1]}_${payslip.year}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
          },
          jsPDF: {
            unit: "mm",
            format: "a4",
            orientation: "portrait",
          },
        })
        .from(element)
        .save();
    } catch (error) {
      console.error("Salary slip PDF generation failed:", error);
      alert("PDF download failed. Please use the Print option.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[95vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl">
        {/* Toolbar */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#E8E0D0] px-6 py-4">
          <div>
            <h2 className="text-sm font-bold text-[#1C1712]">
              {payslip.employee_name} — {MONTHS[payslip.month - 1]}{" "}
              {payslip.year}
            </h2>
            <p className="mt-0.5 text-xs text-[#9A8B7A]">
              {payslip.employee_designation}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg border border-[#E8E0D0] px-3 py-1.5 text-xs font-medium text-[#6B5E4E] transition-colors hover:bg-[#F5F0E8]"
            >
              <Printer size={13} />
              Print
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-1.5 rounded-lg bg-[#B8860B] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#9A7209] disabled:opacity-60"
            >
              {downloading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Download size={13} />
              )}
              {downloading ? "Generating..." : "Download PDF"}
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close salary slip"
              className="rounded-lg p-1.5 text-[#6B5E4E] hover:bg-[#F5F0E8]"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Payslip preview and PDF content */}
        <div className="flex-1 overflow-y-auto bg-gray-100 p-4 sm:p-8">
          <div
            ref={printRef}
            style={{
              width: "100%",
              maxWidth: 700,
              margin: "0 auto",
              background: "white",
              fontFamily: "'Calibri', Arial, sans-serif",
              fontSize: 12,
              color: "#1C1712",
              padding: 0,
            }}
          >
            {/* Company header */}
            <table style={styles.table}>
              <tbody>
                <tr>
                  <td style={{ ...styles.td, padding: "12px 16px" }}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "100px 1fr 100px",
                        alignItems: "center",
                        gap: 8,
                        padding: "16px 8px",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/GK_LOGO.png"
                        alt="GK Logo"
                        style={{ width: 80, height: "auto" }}
                      />

                      <div style={{ textAlign: "center" }}>
                        <h2
                          style={{
                            margin: 0,
                            fontWeight: 700,
                            fontSize: 22,
                          }}
                        >
                          GKA1 ENTERPRISES PRIVATE LIMITED
                        </h2>

                        <p
                          style={{
                            margin: "4px 0 0",
                            fontSize: 12,
                            fontStyle: "italic",
                            color: "#374151",
                          }}
                        >
                          301/4, 4th Floor, Alluri Trade Centre, KPHB Rd,
                          Bhagya Nagar Colony, Hyderabad, Telangana 500072
                        </p>
                      </div>

                      <div />
                    </div>

                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: "bold",
                        textAlign: "center",
                        marginTop: 10,
                        background: "#f5f5f0",
                        padding: 5,
                        border: "1px solid #ccc",
                      }}
                    >
                      Payslip for the month of {MONTHS[payslip.month - 1]}{" "}
                      {payslip.year}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Employee information */}
            <table style={styles.table}>
              <tbody>
                {infoRows.map((row, index) => (
                  <tr key={index}>
                    <td style={styles.tdL}>{row[0]}</td>
                    <td style={styles.tdV}>{row[1]}</td>
                    <td style={styles.tdL}>{row[2]}</td>
                    <td style={styles.tdV}>{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Earnings and deductions */}
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.thG}>Earnings</th>
                  <th style={styles.thG}>Full</th>
                  <th style={styles.thG}>Actual</th>
                  <th style={styles.thR}>Deductions</th>
                  <th style={styles.thR}>Actual</th>
                </tr>
              </thead>

              <tbody>
                {earningsRows.map((row, index) => (
                  <tr key={row.label}>
                    <td style={styles.td}>{row.label}</td>

                    <td style={{ ...styles.td, textAlign: "right" }}>
                      {formatINR(row.full)}
                    </td>

                    <td style={{ ...styles.td, textAlign: "right" }}>
                      {formatINR(row.actual)}
                    </td>

                    <td style={styles.td}>{row.ded}</td>

                    <td style={{ ...styles.td, textAlign: "right" }}>
                      {index === 0 ? formatINR(row.dedVal) : ""}
                    </td>
                  </tr>
                ))}

                <tr>
                  <td colSpan={2} style={styles.tdTot}>
                    Total Earnings: INR.
                  </td>

                  <td style={{ ...styles.tdTot, textAlign: "right" }}>
                    {formatINR(totalEarningsActual)}
                  </td>

                  <td style={styles.tdTot}>
                    Total Deductions: INR.
                  </td>

                  <td style={{ ...styles.tdTot, textAlign: "right" }}>
                    {formatINR(totalDeductions)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Net pay */}
            <table style={styles.table}>
              <tbody>
                <tr>
                  <td
                    style={{
                      ...styles.td,
                      background: "#1C1712",
                      color: "#B8860B",
                      fontWeight: "bold",
                      fontSize: 13,
                      textAlign: "center",
                      padding: 10,
                    }}
                  >
                    Net Pay for the month (Total Earnings - Total Deductions):
                    &nbsp;
                    <span style={{ fontSize: 16 }}>
                      {formatINR(netPay)}
                    </span>
                  </td>
                </tr>

                <tr>
                  <td
                    style={{
                      ...styles.td,
                      fontStyle: "italic",
                      textAlign: "center",
                      color: "#444",
                      fontSize: 11,
                      padding: 6,
                    }}
                  >
                    ({netInWords})
                  </td>
                </tr>

                <tr>
                  <td
                    style={{
                      border: "none",
                      padding: "10px 0 0",
                      fontSize: 10,
                      fontStyle: "italic",
                      textAlign: "center",
                      color: "#888",
                    }}
                  >
                    This is a system generated payslip and does not require
                    signature.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
