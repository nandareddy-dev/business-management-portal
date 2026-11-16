'use client'

import { LogIn, LogOut, RefreshCw, Timer, type LucideIcon } from 'lucide-react'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { BreaksWidget } from './breaks-widget'

interface PunchCardProps {
  employeeId: string
  fullName?: string
  designation?: string
  photoUrl?: string | null
  checkIn?: string | null
  checkOut?: string | null
  workingHrs: string
  activeBreak: { id: string; break_type: string; start_time: string } | null
}

const WORKDAY_MINUTES = 8 * 60

function PunchTile({
  icon: Icon,
  label,
  value,
  iconTone,
  highlight = false,
}: {
  icon: LucideIcon
  label: string
  value: string
  iconTone: string
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-xl px-1.5 py-2 text-center ring-1 backdrop-blur sm:px-2 ${
        highlight ? 'bg-white/15 ring-white/30' : 'bg-white/[0.07] ring-white/10'
      }`}
    >
      <Icon size={12} className={`mx-auto mb-1 ${iconTone}`} />
      <p className="text-sm font-bold tabular-nums tracking-tight text-white sm:text-base">{value}</p>
      <p className="mt-0.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-slate-300 sm:text-[9px]">
        {label}
      </p>
    </div>
  )
}

export function PunchCard({
  employeeId,
  fullName,
  designation,
  photoUrl,
  checkIn,
  checkOut,
  workingHrs,
  activeBreak,
}: PunchCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [spinning, setSpinning] = useState(false)

  const initials = fullName?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() ?? '?'

  const fmtTime = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '--:--'

  const handleRefresh = () => {
    setSpinning(true)
    startTransition(() => router.refresh())
    setTimeout(() => setSpinning(false), 600)
  }

  // Status: red = not checked in / checked out, yellow = on break, green = actively working
  const isCheckedIn = !!checkIn
  const isCheckedOut = !!checkOut
  const onBreak = !!activeBreak

  const status = !isCheckedIn || isCheckedOut
    ? { color: '#f87171', bg: 'rgba(248,113,113,0.14)', border: 'rgba(248,113,113,0.4)', label: isCheckedOut ? 'Checked out' : 'Not checked in' }
    : onBreak
      ? { color: '#facc15', bg: 'rgba(250,204,21,0.14)', border: 'rgba(250,204,21,0.4)', label: 'On break' }
      : { color: '#4ade80', bg: 'rgba(74,222,128,0.14)', border: 'rgba(74,222,128,0.4)', label: 'Working' }

  // Progress towards an 8-hour workday, parsed from the "HH:MM" string
  const [h, m] = workingHrs.split(':').map(Number)
  const workedMinutes = (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0)
  const progress = Math.min(100, (workedMinutes / WORKDAY_MINUTES) * 100)

  return (
    <div className="relative isolate overflow-hidden bg-slate-900 px-3 py-3 text-white sm:px-4 sm:py-3.5">
      {/* Background layers */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950" />
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
      />
      <div className="pointer-events-none absolute -right-14 -top-14 -z-10 h-40 w-40 rounded-full bg-indigo-500/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 left-4 -z-10 h-32 w-32 rounded-full bg-emerald-500/20 blur-3xl" />

      {/* Header: identity + status */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2.5">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={fullName}
              className="h-9 w-9 shrink-0 rounded-xl object-cover ring-2 ring-white/30"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-sm font-bold ring-1 ring-white/25 backdrop-blur">
              {initials}
            </div>
          )}

          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight">{fullName}</p>
            <p className="truncate text-[11px] text-slate-300">{designation ?? 'Employee'}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-1.5 sm:flex-nowrap sm:justify-end">
          <span
            title={status.label}
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold"
            style={{ backgroundColor: status.bg, border: `1px solid ${status.border}`, color: status.color }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: status.color, boxShadow: `0 0 6px ${status.color}` }}
            />
            {status.label}
          </span>
          <BreaksWidget employeeId={employeeId} activeBreak={activeBreak} />
        </div>
      </div>

      {/* Punch tiles */}
      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between px-0.5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-indigo-300">Today&apos;s punch</p>
          <button
            onClick={handleRefresh}
            disabled={isPending}
            aria-label="Refresh punch details"
            className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-slate-200 ring-1 ring-white/15 transition hover:bg-white/20 disabled:opacity-60"
          >
            <RefreshCw className={`h-3 w-3 ${spinning ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          <PunchTile icon={LogIn} label="Punch in" value={fmtTime(checkIn)} iconTone="text-emerald-300" />
          <PunchTile icon={LogOut} label="Punch out" value={fmtTime(checkOut)} iconTone="text-rose-300" />
          <PunchTile icon={Timer} label="Working hrs" value={workingHrs} iconTone="text-sky-300" highlight />
        </div>

        {/* Workday progress */}
        <div className="mt-2.5">
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-blue-400 to-emerald-300 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-right text-[10px] font-medium text-slate-300">
            {Math.round(progress)}% of 8h workday
          </p>
        </div>
      </div>
    </div>
  )
}