'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

const navLinks = [
  { label: 'Features',   id: 'features' },
  { label: 'AI Tools',   id: 'ai-tools' },
  { label: 'Industries', id: 'industries' },
  { label: 'Pricing',    id: 'pricing' },
  { label: 'Support',    id: 'support' },
]

export default function GKHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const [activeNav, setActiveNav] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Home page లో ఉంటే direct scroll, వేరే page లో ఉంటే home కి navigate చేసి అక్కడ scroll అవ్వాలి
  // (LandingPage.tsx లో ఉన్న hash-scroll useEffect దీన్ని home page లో handle చేస్తుంది)
  const scrollTo = (id: string) => {
    if (pathname === '/') {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
      setActiveNav(id)
    } else {
      router.push(`/#${id}`)
    }
    setMobileMenuOpen(false)
  }

  return (
    <nav className="sticky top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#E2D9C8] shadow-sm">
      <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <button onClick={() => router.push('/')} className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-sm font-bold text-white shadow-md">G</div>
          <span className="font-serif text-xl text-[#1C1712]">GK · CRM</span>
          <span className="hidden md:block text-[9px] font-bold text-[#B8860B] bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full uppercase tracking-widest ml-1">Premium</span>
        </button>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6 lg:gap-8">
          {navLinks.map(item => (
            <button key={item.id} onClick={() => scrollTo(item.id)}
              className={`text-sm font-medium transition-all relative pb-0.5 ${activeNav === item.id ? 'text-[#B8860B]' : 'text-[#7A6E60] hover:text-[#1C1712]'}`}>
              {item.label}
              {activeNav === item.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#B8860B] rounded-full" />}
            </button>
          ))}
        </div>

        {/* Right CTA */}
        <div className="flex items-center gap-2 md:gap-3">
          <button onClick={() => router.push('/login')}
            className="hidden md:block text-sm font-medium text-[#7A6E60] hover:text-[#1C1712] transition-colors">
            Sign In
          </button>
          <button onClick={() => scrollTo('pricing')}
            className="bg-[#1C1712] text-white text-xs md:text-sm font-semibold px-3 md:px-5 py-2 md:py-2.5 rounded-xl hover:bg-[#B8860B] transition-all duration-300 shadow-md">
            Start Free →
          </button>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl border border-[#E2D9C8] text-[#7A6E60]">
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-[#E2D9C8] px-4 py-3 space-y-1">
          {navLinks.map(item => (
            <button key={item.id} onClick={() => scrollTo(item.id)}
              className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium text-[#7A6E60] hover:bg-[#F5F0E8] hover:text-[#1C1712] transition-colors">
              {item.label}
            </button>
          ))}
          <button onClick={() => { router.push('/login'); setMobileMenuOpen(false) }}
            className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium text-[#7A6E60] hover:bg-[#F5F0E8] transition-colors">
            Sign In
          </button>
        </div>
      )}
    </nav>
  )
}