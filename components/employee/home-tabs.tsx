'use client'

import { useState } from 'react'

const TABS = ['Communication', 'Offers', 'Life at GK'] as const
type Tab = typeof TABS[number]

export function HomeTabs() {
  const [active, setActive] = useState<Tab>('Communication')
  const mono = { fontFamily: 'ui-monospace, "JetBrains Mono", monospace' }

  return (
    <div className="bg-white border-t border-[#B8860B]/25">
      <div className="flex items-center border-b border-[#F0EAE0] px-6 lg:px-8">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            className={`px-1 py-3 mr-6 text-[13px] transition-colors relative ${
              active === tab ? 'text-[#1C1712]' : 'text-[#9A8F82]'
            }`}
            style={{ fontFamily: 'Georgia, serif' }}
          >
            {tab}
            {active === tab && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#B8860B]" />
            )}
          </button>
        ))}
      </div>
      <div className="px-6 lg:px-8 py-10 text-center">
        <p className="text-[13px] text-[#9A8F82]">No {active.toLowerCase()} yet</p>
        <p className="text-[10px] text-[#B0A594] mt-1 tracking-[0.5px] uppercase" style={mono}>Check back soon</p>
      </div>
    </div>
  )
}