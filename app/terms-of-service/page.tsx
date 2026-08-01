'use client'

import { useRouter } from 'next/navigation'

export default function TermsOfServicePage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-[#F5F0E8] flex flex-col" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── CONTENT ── */}
      <div className="flex-1 max-w-5xl mx-auto px-4 md:px-6 pt-16 pb-20 w-full">
        <div className="mb-10">
          <p className="text-xs font-bold text-[#B8860B] uppercase tracking-[4px] mb-3">Legal</p>
          <h1 className="font-serif text-4xl md:text-5xl text-[#1C1712] mb-4">Terms of Service</h1>
          <p className="text-sm text-[#9A8F82]">Last updated: June 13, 2026</p>
        </div>

        <div className="bg-white border border-[#E2D9C8] rounded-2xl p-6 md:p-10 space-y-8 shadow-sm">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm text-amber-800 leading-relaxed">
              These Terms of Service govern your use of GK CRM. By creating an account or using our services, you agree to be bound by these terms. Please read them carefully before using GK CRM.
            </p>
          </div>

          {[
            { title: '1. Acceptance of Terms', content: [
              { sub: 'Agreement', text: 'By accessing or using GK CRM, you confirm that you are at least 18 years old, have the legal authority to enter into this agreement, and agree to comply with these Terms.' },
              { sub: 'Business Use', text: 'GK CRM is designed for business use. You agree to use it only for lawful business purposes in accordance with applicable Indian laws and regulations.' },
            ]},
            { title: '2. Account Registration', content: [
              { sub: 'Accurate Information', text: 'You must provide accurate and complete information when creating your account. You are responsible for keeping your account information up to date.' },
              { sub: 'Account Security', text: 'You are responsible for maintaining the confidentiality of your login credentials. Notify us immediately at support@gkcrm.in if you suspect unauthorized access.' },
              { sub: 'One Account Per Company', text: 'Each company should maintain one primary account. You may add team members as employees under your account.' },
            ]},
            { title: '3. Subscription & Payments', content: [
              { sub: 'Pricing', text: 'GK CRM offers plans starting at ₹10,000/month per industry. Pricing is subject to change with 30 days notice.' },
              { sub: 'Free Trial', text: 'New accounts receive a 14-day free trial. No credit card is required. After the trial, you must subscribe to continue using the service.' },
              { sub: 'Payment', text: 'Payments are processed monthly via Razorpay. Subscriptions auto-renew unless cancelled before the renewal date.' },
              { sub: 'Refunds', text: 'We offer a 7-day refund policy for new paid subscriptions. Refund requests must be submitted to support@gkcrm.in within 7 days of payment.' },
              { sub: 'Bundle Discount', text: 'A 10% discount applies when you subscribe to the same plan for 2 or more industries. Applied automatically at checkout.' },
            ]},
            { title: '4. Acceptable Use', content: [
              { sub: 'Permitted Use', text: 'You may use GK CRM to manage your business operations, leads, customers, employees, billing, and related activities.' },
              { sub: 'Prohibited Activities', text: 'You must not use GK CRM to: (a) violate any laws, (b) store illegal content, (c) gain unauthorized access to other accounts, (d) reverse engineer the platform, or (e) resell access without written permission.' },
              { sub: 'Data Accuracy', text: 'You are responsible for the accuracy and legality of the data you enter into GK CRM.' },
            ]},
            { title: '5. Intellectual Property', content: [
              { sub: 'GK CRM Platform', text: 'The GK CRM software, design, and content are owned by GK Digital Solutions. You are granted a limited, non-exclusive license to use the platform.' },
              { sub: 'Your Data', text: 'You retain full ownership of all business data you enter into GK CRM. We do not claim any rights to your data.' },
            ]},
            { title: '6. Data & Privacy', content: [
              { sub: 'Data Isolation', text: "Your company's data is completely isolated from other companies. We use Row Level Security to enforce strict data separation." },
              { sub: 'Data Backup', text: 'We perform regular automated backups of all data. We recommend you also export your data periodically as an additional safeguard.' },
              { sub: 'Privacy Policy', text: 'Our handling of personal data is governed by our Privacy Policy, incorporated by reference into these Terms.' },
            ]},
            { title: '7. Service Availability', content: [
              { sub: 'Uptime', text: 'We target 99.9% uptime. Scheduled maintenance will be announced in advance. We are not liable for downtime caused by factors beyond our control.' },
              { sub: 'Modifications', text: 'We may modify or update features of GK CRM with reasonable notice. We will not remove core CRM functionality without offering alternatives.' },
            ]},
            { title: '8. Limitation of Liability', content: [
              { sub: 'No Warranty', text: 'GK CRM is provided "as is" without warranties of any kind. We do not guarantee the service will be error-free or uninterrupted.' },
              { sub: 'Liability Cap', text: 'Our total liability shall not exceed the amount you paid us in the 3 months preceding the claim.' },
              { sub: 'Indirect Damages', text: 'We are not liable for indirect, incidental, or consequential damages, including loss of business, revenue, or data.' },
            ]},
            { title: '9. Termination', content: [
              { sub: 'By You', text: 'You may cancel your subscription at any time from account settings. Your access continues until the end of the billing period.' },
              { sub: 'By Us', text: 'We may suspend or terminate your account for violation of these Terms, non-payment, or illegal activity.' },
              { sub: 'Data After Termination', text: 'After termination, you have 30 days to export your data. After 30 days, data will be permanently deleted.' },
            ]},
            { title: '10. Governing Law', content: [
              { sub: 'Jurisdiction', text: 'These Terms are governed by the laws of India. Disputes shall be subject to the exclusive jurisdiction of courts in Hyderabad, Telangana, India.' },
              { sub: 'Dispute Resolution', text: 'We encourage resolving disputes amicably. Contact us at support@gkcrm.in before initiating legal proceedings.' },
            ]},
            { title: '11. Changes to Terms', content: [
              { sub: 'Updates', text: 'We may update these Terms from time to time. We will notify you at least 14 days before significant changes take effect. Continued use constitutes acceptance.' },
            ]},
            { title: '12. Contact', content: [
              { sub: 'GK Digital Solutions', text: 'Email: supportcrm@gkdigitalsolutions.in | Phone: +91 7095815427 | Address: Hyderabad, Telangana, India | Website: gkcrm.in' },
            ]},
          ].map((section) => (
            <div key={section.title}>
              <h2 className="font-serif text-xl text-[#1C1712] mb-4">{section.title}</h2>
              <div className="space-y-3">
                {section.content.map((item) => (
                  <div key={item.sub} className="pl-4 border-l-2 border-[#E2D9C8] hover:border-[#B8860B] transition-colors">
                    <p className="text-sm font-semibold text-[#1C1712] mb-1">{item.sub}</p>
                    <p className="text-sm text-[#7A6E60] leading-relaxed">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex gap-3">
          <button onClick={() => router.push('/')}
            className="px-6 py-3 bg-[#1C1712] text-white rounded-xl text-sm font-semibold hover:bg-[#B8860B] transition-all duration-300 shadow-md">
            ← Back to Home
          </button>
          <button onClick={() => router.push('/privacy-policy')}
            className="px-6 py-3 border border-[#E2D9C8] text-[#7A6E60] rounded-xl text-sm font-medium hover:bg-white hover:border-[#B8860B]/40 transition-all">
            Privacy Policy →
          </button>
        </div>
      </div>
    </div>
  )
}