'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Coffee, User, Utensils, X, type LucideIcon } from 'lucide-react'
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

const BREAK_TYPES: {
  key: string
  label: string
  hint: string
  icon: LucideIcon
  tile: string
}[] = [
  { key: 'tea',      label: 'Tea Break',      hint: 'Quick refresh', icon: Coffee,   tile: 'bg-amber-100 text-amber-700' },
  { key: 'lunch',    label: 'Lunch Break',    hint: 'Meal time',     icon: Utensils, tile: 'bg-emerald-100 text-emerald-700' },
  { key: 'personal', label: 'Personal Break', hint: 'Away briefly',  icon: User,     tile: 'bg-violet-100 text-violet-700' },
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
  const containerRef = useRef<HTMLDivElement | null>(null)

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

  // Close the menu on outside click or Escape
  useEffect(() => {
    if (!showMenu) return

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowMenu(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [showMenu])

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

  const label = BREAK_TYPES.find(t => t.key === activeBreak?.break_type)?.label ?? 'On Break'

  /* ---------------- Active break: live timer + end ---------------- */
  if (activeBreak) {
    return (
      <button
        onClick={endBreak}
        disabled={loading}
        aria-label={`End ${label}`}
        className="group flex max-w-full items-center gap-2 rounded-full bg-amber-400/15 py-1.5 pl-3 pr-1.5 text-[11px] font-semibold text-amber-200 ring-1 ring-amber-300/40 transition hover:bg-amber-400/25 disabled:opacity-60"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
        </span>

        <span className="whitespace-nowrap">{label}</span>
        <span className="font-mono tabular-nums text-amber-100">{elapsed}</span>

        <span className="rounded-full bg-amber-300 px-2.5 py-1 text-[10px] font-bold uppercase sm:px-2 sm:py-0.5 tracking-wide text-amber-950 transition group-hover:bg-amber-200">
          End
        </span>
      </button>
    )
  }

  /* ---------------- No active break: start menu ---------------- */
  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setShowMenu(v => !v)}
        disabled={loading}
        aria-haspopup="menu"
        aria-expanded={showMenu}
        className="flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-white sm:px-3 sm:py-1.5 ring-1 ring-white/20 backdrop-blur transition hover:bg-white/20 disabled:opacity-60"
      >
        <Coffee className="h-3.5 w-3.5 text-amber-300" />
        Breaks
        <ChevronDown className={`h-3.5 w-3.5 text-slate-300 transition-transform ${showMenu ? 'rotate-180' : ''}`} />
      </button>

      {showMenu && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-60 max-w-[calc(100vw-3rem)] overflow-hidden rounded-2xl bg-white p-1.5 shadow-2xl shadow-slate-900/30 ring-1 ring-slate-200"
        >
          <div className="flex items-center justify-between px-2.5 pb-1.5 pt-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Start break</span>
            <button
              onClick={() => setShowMenu(false)}
              aria-label="Close menu"
              className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {BREAK_TYPES.map(t => {
            const Icon = t.icon

            return (
              <button
                key={t.key}
                role="menuitem"
                onClick={() => startBreak(t.key)}
                className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-slate-50"
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${t.tile}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-900">{t.label}</span>
                  <span className="block text-[11px] text-slate-500">{t.hint}</span>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}