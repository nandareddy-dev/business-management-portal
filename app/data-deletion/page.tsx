
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Deletion Instructions | GK CRM",
  description:
    "Learn how to request deletion of your personal information from GK CRM.",
};

export default function DataDeletionPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-16 text-slate-800">
      <div className="mx-auto max-w-4xl">
        <div className="mb-10 text-center">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.25em] text-blue-700">
            GK CRM
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Data Deletion Instructions
          </h1>

          <p className="mt-4 text-slate-600">
            Your privacy matters to us. You can request deletion of
            your personal information stored in GK CRM.
          </p>
        </div>

        <section className="space-y-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          <div>
            <h2 className="mb-3 text-xl font-bold text-slate-900">
              1. About Data Deletion
            </h2>
            <p className="leading-7 text-slate-600">
              GK CRM is a customer relationship management platform.
              When you interact with a business using GK CRM, your
              information may be processed by that business through
              our platform.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-xl font-bold text-slate-900">
              2. How to Request Data Deletion
            </h2>
            <p className="mb-4 leading-7 text-slate-600">
              To request deletion of your personal information,
              please follow these steps:
            </p>

            <ol className="list-inside list-decimal space-y-3 leading-7 text-slate-600">
              <li>
                Send an email to our support email address.
              </li>
              <li>
                Use the subject line: Data Deletion Request.
              </li>
              <li>
                Mention your name and the phone number or email
                associated with your enquiry.
              </li>
              <li>
                Mention the business through which you submitted
                your information, if known.
              </li>
              <li>
                Our team will verify your request and contact you
                if additional information is required.
              </li>
            </ol>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50 p-6">
            <h2 className="mb-3 text-xl font-bold text-slate-900">
              3. Submit Your Deletion Request
            </h2>

            <p className="mb-5 leading-7 text-slate-600">
              Contact our support team to request deletion of your
              personal information.
            </p>

            <a
              href="mailto:gkhomeinteriorshyd@gmail.com?subject=Data%20Deletion%20Request"
              className="inline-flex rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white transition hover:bg-blue-800"
            >
              Request Data Deletion
            </a>

            <p className="mt-4 break-all text-sm text-slate-600">
              Email: gkhomeinteriorshyd@gmail.com
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-xl font-bold text-slate-900">
              4. Processing Your Request
            </h2>
            <p className="leading-7 text-slate-600">
              We will review and verify your request. Eligible
              personal information will be deleted from our systems
              within a reasonable period, subject to applicable legal
              obligations and legitimate record-retention requirements.
              We will inform you if any information cannot be deleted
              and explain the reason.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-xl font-bold text-slate-900">
              5. Facebook Data
            </h2>
            <p className="leading-7 text-slate-600">
              If your information was submitted through a Facebook
              Lead Ad, you can also contact us to request deletion
              of the lead information processed by GK CRM.
              You may manage or remove an app's access through your
              Facebook account settings as well.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-xl font-bold text-slate-900">
              6. Contact Us
            </h2>
            <p className="leading-7 text-slate-600">
              For questions about privacy or data deletion, contact:
            </p>
            <p className="mt-3 font-semibold text-slate-900">
              GK CRM Support
            </p>
            <a
              href="mailto:gkhomeinteriorshyd@gmail.com"
              className="text-blue-700 underline"
            >
              gkhomeinteriorshyd@gmail.com
            </a>
          </div>

          <div className="border-t border-slate-200 pt-6 text-sm text-slate-500">
            Last updated: November 3, 2026
          </div>
        </section>

        <footer className="mt-8 text-center text-sm text-slate-500">
          © 2026 GK CRM. All rights reserved.
        </footer>
      </div>
    </main>
  );
}
