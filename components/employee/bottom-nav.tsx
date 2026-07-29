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
  const mono = { fontFamily: 'ui-monospace, "JetBrains Mono", monospace' }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#1C1712] border-t border-[#B8860B]/30">
      <div className="max-w-3xl mx-auto grid grid-cols-4">
        {navItems.map((item) => {
          const isActive = item.href === '/employee'
            ? pathname === '/employee'
            : pathname?.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center gap-1 py-2.5"
            >
              <Icon
                className={`w-5 h-5 transition-colors ${isActive ? 'text-[#D4A537]' : 'text-white/40'}`}
              />
              <span
                className={`text-[9px] tracking-[0.5px] uppercase transition-colors ${isActive ? 'text-[#D4A537]' : 'text-white/40'}`}
                style={mono}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}