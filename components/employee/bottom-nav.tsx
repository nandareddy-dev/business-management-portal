'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Clock, Grid2x2, User } from 'lucide-react'

const navItems = [
  { label: 'Home',       href: '/employee',            icon: Home },
  { label: 'Attendance', href: '/employee/attendance',  icon: Clock },
  { label: 'Menu',       href: '/employee/menu',        icon: Grid2x2 },
  { label: 'Profile',    href: '/employee/profile',     icon: User },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Primary"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="pointer-events-auto relative isolate mx-auto grid max-w-md grid-cols-4 gap-1 overflow-hidden rounded-3xl bg-slate-900/90 p-1.5 shadow-2xl shadow-slate-900/40 ring-1 ring-white/10 backdrop-blur-xl">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-indigo-950/80 via-slate-900/80 to-blue-950/80" />

        {navItems.map((item) => {
          const isActive = item.href === '/employee'
            ? pathname === '/employee'
            : pathname?.startsWith(item.href)
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-1 rounded-2xl py-2 transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 ${
                isActive
                  ? 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-lg shadow-indigo-900/50'
                  : 'text-slate-400 hover:bg-white/10 hover:text-slate-100'
              }`}
            >
              <Icon className={`h-5 w-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
              <span className="text-[10px] font-semibold tracking-wide">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}