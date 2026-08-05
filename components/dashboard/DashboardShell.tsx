'use client'
import { useState, useEffect } from 'react'
import { ChevronRight } from 'lucide-react'
import { Header } from '@/components/dashboard/header'
import { Sidebar } from '@/components/dashboard/sidebar'

interface DashboardShellProps {
  children: React.ReactNode
  userName: string
  userEmail: string
  userRole: string
}

export default function DashboardShell({ children, userName, userEmail, userRole }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // On desktop, open the sidebar by default after mount (mobile stays closed
  // until the menu button is tapped). Checking window.innerWidth in a client
  // effect avoids SSR/hydration mismatches from reading window during render.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync
    // with window size on mount; there is no external-system subscription here,
    // just reading a value that only exists client-side.
    if (window.innerWidth >= 1024) setSidebarOpen(true)
  }, [])

  return (
    <div className="flex h-screen bg-[#F7F5F1] overflow-hidden relative">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Reopen arrow — shows only when the sidebar is closed, pinned to the
          left edge so it's always reachable regardless of screen size. */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          title="Open sidebar"
          className="fixed top-1/2 left-0 -translate-y-1/2 z-50 w-7 h-14 bg-[#1C1C1E] hover:bg-[#2A2A2C] rounded-r-xl flex items-center justify-center shadow-lg transition-colors"
        >
          <ChevronRight size={16} className="text-white" />
        </button>
      )}

      <div
        className={`flex-1 flex flex-col min-w-0 transition-[margin] duration-300 ${
          sidebarOpen ? 'lg:ml-[220px]' : ''
        }`}
      >
        <Header
          onMenuClick={() => setSidebarOpen((prev) => !prev)}
          userName={userName}
          userEmail={userEmail}
          userRole={userRole}
        />
        <main className="flex-1 overflow-y-auto p-5">{children}</main>
      </div>
    </div>
  )
}