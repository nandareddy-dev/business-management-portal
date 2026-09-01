'use client'

import Link from 'next/link'
import { ShieldX, ArrowLeft } from 'lucide-react'

export default function AccessDeniedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F0E8] px-6">
      <div className="w-full max-w-md text-center">

        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
          <ShieldX size={42} className="text-red-600" />
        </div>

        <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-[#B8860B]">
          GK · CRM
        </p>

        <h1 className="text-4xl font-black text-[#1C1712]">
          Access Denied
        </h1>

        <p className="mt-4 text-sm leading-6 text-[#7A6E60]">
          You don&apos;t have permission to access the CRM portal.
          Please contact your administrator if you believe this is a mistake.
        </p>

        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          <strong>Access restricted</strong>
          <br />
          Your employee account is inactive or CRM permissions
          have not been granted.
        </div>

        <Link
          href="/employee"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#1C1712] px-6 py-3 text-sm font-bold text-white transition hover:opacity-90"
        >
          <ArrowLeft size={17} />
          Back to Employee Portal
        </Link>

      </div>
    </div>
  )
}