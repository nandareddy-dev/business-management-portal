'use client'

import { RefreshCw } from 'lucide-react'
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

export function PunchCard({ employeeId, fullName, designation, photoUrl, checkIn, checkOut, workingHrs, activeBreak }: PunchCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [spinning, setSpinning] = useState(false)

  const initials = fullName?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() ?? '?'
  const mono = { fontFamily: 'ui-monospace, "JetBrains Mono", monospace' }

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
    ? { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', label: isCheckedOut ? 'Checked out' : 'Not checked in' }
    : onBreak
      ? { color: '#eab308', bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.35)', label: 'On break' }
      : { color: '#22c55e', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.35)', label: 'Working' }

  return (
    <div className="bg-[#1C1712] px-6 py-5 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.05]" style={{
        backgroundImage: 'linear-gradient(#B8860B 1px, transparent 1px), linear-gradient(90deg, #B8860B 1px, transparent 1px)',
        backgroundSize: '28px 28px'
      }} />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {photoUrl ? (
              <img src={photoUrl} alt={fullName} className="w-11 h-11 rounded-full object-cover border-2 border-[#B8860B]/40" />
            ) : (
              <div className="w-11 h-11 rounded-full border-2 border-[#B8860B]/40 flex items-center justify-center text-[14px] text-[#D4A537]" style={{ fontFamily: 'Georgia, serif' }}>
                {initials}
              </div>
            )}
            <div>
              <p className="text-[15px] text-white" style={{ fontFamily: 'Georgia, serif' }}>{fullName}</p>
              <p className="text-[11px] text-white/40 tracking-wide" style={mono}>{designation ?? 'Employee'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              title={status.label}
              className="text-[10px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5"
              style={{ backgroundColor: status.bg, border: `1px solid ${status.border}`, color: status.color }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: status.color, boxShadow: `0 0 4px ${status.color}` }} />
              {status.label}
            </span>
            <BreaksWidget employeeId={employeeId} activeBreak={activeBreak} />
          </div>
        </div>

        <div className="bg-[#FAF7F2] px-4 py-3 flex items-center justify-between relative">
          <button
            onClick={handleRefresh}
            disabled={isPending}
            className="absolute top-2 right-2 text-[#9A8F82] hover:text-[#B8860B] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${spinning ? 'animate-spin' : ''}`} />
          </button>
          <div className="text-center flex-1">
            <p className="text-[15px] text-[#1C1712]" style={{ fontFamily: 'Georgia, serif' }}>{fmtTime(checkIn)}</p>
            <p className="text-[10px] text-[#9A8F82] uppercase tracking-[0.5px] mt-0.5">Punch In</p>
          </div>
          <div className="w-px h-8 bg-[#E2D9C8]" />
          <div className="text-center flex-1">
            <p className="text-[15px] text-[#1C1712]" style={{ fontFamily: 'Georgia, serif' }}>{fmtTime(checkOut)}</p>
            <p className="text-[10px] text-[#9A8F82] uppercase tracking-[0.5px] mt-0.5">Punch Out</p>
          </div>
          <div className="w-px h-8 bg-[#E2D9C8]" />
          <div className="text-center flex-1">
            <p className="text-[15px] text-[#1C1712]" style={{ fontFamily: 'Georgia, serif' }}>{workingHrs}</p>
            <p className="text-[10px] text-[#9A8F82] uppercase tracking-[0.5px] mt-0.5">Working Hrs</p>
          </div>
        </div>
      </div>
    </div>
  )
}