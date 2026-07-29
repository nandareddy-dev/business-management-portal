'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Coffee, X } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

interface ActiveBreak {
  id: string
  break_type: string
  start_time: string
}

interface BreaksWidgetProps {
  employeeId: string
  activeBreak: ActiveBreak | null
}

const BREAK_TYPES = [
  { key: 'tea',      label: 'Tea Break' },
  { key: 'lunch',    label: 'Lunch Break' },
  { key: 'personal', label: 'Personal Break' },
]

export function BreaksWidget({ employeeId, activeBreak }: BreaksWidgetProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [showMenu, setShowMenu] = useState(false)
  const [loading, setLoading] = useState(false)
  const [elapsed, setElapsed] = useState('00:00')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (activeBreak) {
      const tick = () => {
        const diffMs = Date.now() - new Date(activeBreak.start_time).getTime()
        const m = Math.floor(diffMs / 60000)
        const s = Math.floor((diffMs % 60000) / 1000)
        setElapsed(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
      }
      tick()
      intervalRef.current = setInterval(tick, 1000)
      return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
    }
  }, [activeBreak])

  const startBreak = async (breakType: string) => {
    setLoading(true)
    setShowMenu(false)
    try {
      const { error } = await supabase.from('breaks').insert({
        employee_id: employeeId,
        break_type: breakType,
        start_time: new Date().toISOString(),
      })
      if (!error) startTransition(() => router.refresh())
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const endBreak = async () => {
    if (!activeBreak) return
    setLoading(true)
    try {
      const { error } = await supabase.from('breaks')
        .update({ end_time: new Date().toISOString() })
        .eq('id', activeBreak.id)
      if (!error) startTransition(() => router.refresh())
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const mono = { fontFamily: 'ui-monospace, "JetBrains Mono", monospace' }
  const label = BREAK_TYPES.find(t => t.key === activeBreak?.break_type)?.label ?? 'On Break'

  if (activeBreak) {
    return (
      <button
        onClick={endBreak}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 border border-amber-500/50 text-[10px] tracking-[1px] uppercase text-amber-400 hover:bg-amber-500/30 transition-colors disabled:opacity-60"
        style={mono}
      >
        <Coffee className="w-3 h-3" />
        {label} · {elapsed}
      </button>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(v => !v)}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-[#B8860B]/30 text-[10px] tracking-[1px] uppercase text-[#D4A537] hover:bg-white/10 transition-colors disabled:opacity-60"
        style={mono}
      >
        <Coffee className="w-3 h-3" /> Breaks
      </button>
      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full mt-1 bg-[#1C1712] border border-[#B8860B]/40 w-40 z-50 shadow-lg">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#B8860B]/20">
              <span className="text-[9px] tracking-[1px] uppercase text-white/40" style={mono}>Start Break</span>
              <button onClick={() => setShowMenu(false)}><X className="w-3 h-3 text-white/40" /></button>
            </div>
            {BREAK_TYPES.map(t => (
              <button
                key={t.key}
                onClick={() => startBreak(t.key)}
                className="w-full text-left px-3 py-2 text-[12px] text-white/80 hover:bg-white/5 transition-colors"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}