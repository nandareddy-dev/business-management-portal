'use client'

import Link from 'next/link'

// ── SVG Icons ─────────────────────────────────────────────────────────────

const LinkedInIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
)

const InstagramIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
  </svg>
)

const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.258 5.63L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/>
  </svg>
)

const WhatsAppIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
)

// ── Data ──────────────────────────────────────────────────────────────────

// Internal nav links — use Next.js Link
const productLinks = [
  { label: 'Features',   href: '/#features' },
  { label: 'AI Tools',   href: '/#ai-tools' },
  { label: 'Industries', href: '/#industries' },
  { label: 'Pricing',    href: '/#pricing' },
  { label: 'Pipeline',   href: '/#features' },
  { label: 'Analytics',  href: '/#features' },
]

// External social links — keep as <a>
const socialLinks = [
  { href: 'https://linkedin.com/company/gkcrm',  icon: <LinkedInIcon />,  label: 'LinkedIn',  hoverClass: 'hover:bg-[#0A66C2] hover:border-[#0A66C2] hover:text-white' },
  { href: 'https://instagram.com/gkcrm',          icon: <InstagramIcon />, label: 'Instagram', hoverClass: 'hover:bg-pink-500 hover:border-pink-500 hover:text-white' },
  { href: 'https://x.com/gkcrm',                  icon: <XIcon />,         label: 'X',         hoverClass: 'hover:bg-black hover:border-black hover:text-white' },
]

// ── Types ─────────────────────────────────────────────────────────────────

interface GKFooterProps {
  activePage?: 'home' | 'privacy' | 'terms'
}

// ── Component ─────────────────────────────────────────────────────────────

export default function GKFooter({ activePage = 'home' }: GKFooterProps) {
  // ── helpers ──
  const privacyActive = activePage === 'privacy'
  const termsActive   = activePage === 'terms'

  return (
    <footer style={{ fontFamily: "'DM Sans', sans-serif" }}>


      {/* ── 3. MAIN FOOTER GRID ────────────────────────────────────── */}
      <div className="bg-[#F5F0E8] border-t border-[#E2D9C8] pt-12 md:pt-16">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-6 pb-10 md:pb-12">

            {/* Col 1–2: Brand + Contact + Social */}
            <div className="col-span-2">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-2.5 mb-4 w-fit">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-sm font-bold text-white shadow-md">G</div>
                <span className="font-serif text-xl text-[#1C1712]">GK · CRM</span>
              </Link>
              <p className="text-sm text-[#7A6E60] leading-relaxed max-w-xs mb-5">
                Premium CRM for Indian businesses. Manage leads, projects, staff and billing — all in one portal.
              </p>

              {/* Contact info */}
              <div className="space-y-2 mb-5">
                <a href="mailto:supportcrm@gkdigitalsolutions.in"
                  className="flex items-center gap-2.5 text-sm text-[#7A6E60] hover:text-[#1C1712] transition-colors group">
                  <span className="w-7 h-7 bg-white border border-[#E2D9C8] rounded-lg flex items-center justify-center text-xs flex-shrink-0 group-hover:border-[#B8860B]/40 group-hover:bg-amber-50 transition-all">📧</span>
                  supportcrm@gkdigitalsolutions.in
                </a>
                <a href="tel:+917095815427"
                  className="flex items-center gap-2.5 text-sm text-[#7A6E60] hover:text-[#1C1712] transition-colors group">
                  <span className="w-7 h-7 bg-white border border-[#E2D9C8] rounded-lg flex items-center justify-center text-xs flex-shrink-0 group-hover:border-[#B8860B]/40 group-hover:bg-amber-50 transition-all">📞</span>
                  +91 7095815427
                </a>
                <a href="https://wa.me/917095815427" target="_blank" rel="noreferrer"
                  className="flex items-center gap-2.5 text-sm text-[#7A6E60] hover:text-[#1C1712] transition-colors group">
                  <span className="w-7 h-7 bg-white border border-[#E2D9C8] rounded-lg flex items-center justify-center text-xs flex-shrink-0 group-hover:border-[#B8860B]/40 group-hover:bg-amber-50 transition-all">💬</span>
                  WhatsApp Support
                </a>
                <div className="flex items-center gap-2.5 text-sm text-[#7A6E60]">
                  <span className="w-7 h-7 bg-white border border-[#E2D9C8] rounded-lg flex items-center justify-center text-xs flex-shrink-0">📍</span>
                  Hyderabad, Telangana
                </div>
              </div>

              {/* Social + Status */}
              <div className="flex flex-wrap items-center gap-2">
                {socialLinks.map((s) => (
                  <a key={s.label} href={s.href} target="_blank" rel="noreferrer" aria-label={s.label}
                    className={`w-8 h-8 rounded-xl bg-white border border-[#E2D9C8] flex items-center justify-center text-[#7A6E60] transition-all duration-200 ${s.hoverClass}`}>
                    {s.icon}
                  </a>
                ))}
                <div className="flex items-center gap-1.5 ml-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="text-[10px] text-emerald-600 font-medium">All systems operational</span>
                </div>
              </div>
            </div>

            {/* Col 3: Product — all internal, use Link */}
            <div>
              <p className="text-[10px] font-bold text-[#9A8F82] uppercase tracking-[3px] mb-4">Product</p>
              <div className="space-y-2.5">
                {productLinks.map(item => (
                  <Link key={item.label} href={item.href}
                    className="block text-sm text-[#7A6E60] hover:text-[#1C1712] hover:font-medium transition-colors">
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Col 4: Company — mix of internal (Link) and none */}
            <div>
              <p className="text-[10px] font-bold text-[#9A8F82] uppercase tracking-[3px] mb-4">Company</p>
              <div className="space-y-2.5">
                <Link href="/#support" className="block text-sm text-[#7A6E60] hover:text-[#1C1712] transition-colors">About Us</Link>
                <Link href="/#support" className="block text-sm text-[#7A6E60] hover:text-[#1C1712] transition-colors">Support</Link>
                <Link href="/#support" className="block text-sm text-[#7A6E60] hover:text-[#1C1712] transition-colors">Contact</Link>
                <Link href="/privacy"
                  className={`block text-sm transition-colors ${privacyActive ? 'font-semibold text-[#B8860B]' : 'font-normal text-[#7A6E60] hover:text-[#1C1712]'}`}>
                  Privacy Policy
                </Link>
                <Link href="/terms"
                  className={`block text-sm transition-colors ${termsActive ? 'font-semibold text-[#B8860B]' : 'font-normal text-[#7A6E60] hover:text-[#1C1712]'}`}>
                  Terms of Service
                </Link>
              </div>
            </div>

            {/* Col 5: Get Started — internal links use Link */}
            <div>
              <p className="text-[10px] font-bold text-[#9A8F82] uppercase tracking-[3px] mb-4">Get Started</p>
              <div className="space-y-2.5">
                <Link href="/#pricing"
                  className="block w-full bg-[#1C1712] text-white text-xs font-bold text-center py-2.5 px-4 rounded-xl hover:bg-[#B8860B] transition-all duration-300">
                  Start Free Trial →
                </Link>
                <Link href="/login"
                  className="block w-full border border-[#E2D9C8] text-[#1C1712] text-xs font-semibold text-center py-2.5 px-4 rounded-xl hover:border-[#B8860B] hover:bg-white transition-all">
                  Sign In
                </Link>
                <a href="https://wa.me/919876543210" target="_blank" rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 w-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold py-2.5 px-4 rounded-xl hover:bg-[#25D366] hover:border-[#25D366] hover:text-white transition-all duration-300">
                  <WhatsAppIcon /> Chat on WhatsApp
                </a>
                <p className="text-[10px] text-center text-[#B8B0A0]">14-day free · No card needed</p>
              </div>
            </div>
          </div>

          {/* ── 5. BOTTOM BAR ──────────────────────────────────────── */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 border-t border-[#E2D9C8] pt-6 pb-8">
            <p className="text-xs text-[#B8B0A0]">
              © 2026 GK CRM by <span className="text-[#7A6E60] font-medium">GK Digital Solutions</span>. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <Link href="/privacy"
                className={`text-xs transition-colors ${privacyActive ? 'text-[#B8860B] font-medium' : 'text-[#B8B0A0] hover:text-[#1C1712]'}`}>
                Privacy
              </Link>
              <span className="text-[#D3CBBB]">·</span>
              <Link href="/terms"
                className={`text-xs transition-colors ${termsActive ? 'text-[#B8860B] font-medium' : 'text-[#B8B0A0] hover:text-[#1C1712]'}`}>
                Terms
              </Link>
              <span className="text-[#D3CBBB]">·</span>
              <p className="text-xs text-[#B8B0A0]">Built with ❤️ in Hyderabad, India</p>
            </div>
          </div>

        </div>
      </div>
    </footer>
  )
}