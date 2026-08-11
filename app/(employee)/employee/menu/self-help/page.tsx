'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, ChevronDown, Clock, Calendar, FileText, KeyRound,
  MapPin, Wallet, MessageCircleQuestion,
} from 'lucide-react'

interface FaqItem {
  question: string
  answer: string
}

const FAQS: FaqItem[] = [
  {
    question: 'How do I mark my attendance?',
    answer: 'Go to Home and tap "Check in". Your location is checked against the office geofence — if you\'re within range, attendance marks automatically. Tap "Check out" when you leave.',
  },
  {
    question: 'What if I forget to check in or check out?',
    answer: 'If you\'re outside the office geofence when checking in, you\'ll see a regularization option — submit a reason and it goes to admin for approval. For a missed check-out, contact your reporting manager or HR to correct the record.',
  },
  {
    question: 'How do I apply for leave?',
    answer: 'Go to Menu → Leave, select your leave type (CL, SL, or EL), pick the dates, and submit. You can track approval status from the same screen.',
  },
  {
    question: 'How do I check my leave balance?',
    answer: 'Your leave balance (CL, SL, EL — used and remaining) is shown on the Home screen leave ledger, updated for the current month.',
  },
  {
    question: 'How do I submit my daily work report?',
    answer: 'Go to Menu → Work Report and fill in your update for the day. It\'s recommended to submit this before you check out.',
  },
  {
    question: 'How do I change my password?',
    answer: 'Go to Menu → My Profile → Security → Change password. Enter a new password, confirm it, and submit.',
  },
  {
    question: 'Who do I contact for salary or payslip queries?',
    answer: 'Your salary details are on My Profile. For payslip copies or salary certificate requests, use Menu → Salary Cert., or reach out to HR directly.',
  },
  {
    question: 'The app isn\'t loading or is showing an error — what do I do?',
    answer: 'Try refreshing the page first. If the issue persists, log out and log back in. Still stuck? Contact your admin with a screenshot of the issue.',
  },
]

const GUIDES = [
  { label: 'Attendance & geofencing', Icon: Clock, color: 'bg-emerald-50 text-emerald-600' },
  { label: 'Leave & holidays', Icon: Calendar, color: 'bg-purple-50 text-purple-600' },
  { label: 'Work reports', Icon: FileText, color: 'bg-blue-50 text-blue-600' },
  { label: 'Account & security', Icon: KeyRound, color: 'bg-amber-50 text-amber-600' },
  { label: 'Office location', Icon: MapPin, color: 'bg-rose-50 text-rose-600' },
  { label: 'Salary & payslips', Icon: Wallet, color: 'bg-teal-50 text-teal-600' },
]

export default function SelfHelpPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto py-4 px-4">

        <Link href="/employee/menu" className="text-gray-400 text-xs flex items-center gap-1.5 mb-3 w-fit hover:text-gray-600 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to menu
        </Link>
        <h1 className="text-xl font-medium text-gray-900">Self help</h1>
        <p className="text-xs text-gray-400 mt-0.5 mb-5">Common questions and quick guides</p>

        {/* Topic chips */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {GUIDES.map((g) => (
            <div key={g.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center mx-auto mb-2 ${g.color}`}>
                <g.Icon className="w-4 h-4" />
              </div>
              <p className="text-[11px] font-medium text-gray-700 leading-tight">{g.label}</p>
            </div>
          ))}
        </div>

        {/* FAQ accordion */}
        <div className="flex items-center gap-2 mb-3">
          <MessageCircleQuestion className="w-4 h-4 text-gray-400" />
          <p className="text-sm font-medium text-gray-500">Frequently asked questions</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {FAQS.map((faq, i) => {
            const isOpen = openIndex === i
            return (
              <div key={faq.question} className={i > 0 ? 'border-t border-gray-100' : ''}>
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-900">{faq.question}</span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4">
                    <p className="text-sm text-gray-500 leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Still need help */}
        <div className="bg-blue-50 rounded-2xl p-4 mt-4 text-center">
          <p className="text-sm font-medium text-blue-700 mb-1">Still need help?</p>
          <p className="text-xs text-blue-500">Reach out to your reporting manager or HR directly.</p>
        </div>
      </div>
      <div className="h-20" />
    </div>
  )
}