'use client'

import { useRouter } from 'next/navigation'

export default function PrivacyPolicyPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-[#F5F0E8] flex flex-col" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── CONTENT ── */}
      <div className="flex-1 max-w-5xl mx-auto px-4 md:px-6 pt-16 pb-20 w-full">
        <div className="mb-10">
          <p className="text-xs font-bold text-[#B8860B] uppercase tracking-[4px] mb-3">Legal</p>
          <h1 className="font-serif text-4xl md:text-5xl text-[#1C1712] mb-4">Privacy Policy</h1>
          <p className="text-sm text-[#9A8F82]">Last updated: June 13, 2026</p>
        </div>

        <div className="bg-white border border-[#E2D9C8] rounded-2xl p-6 md:p-10 space-y-8 shadow-sm">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm text-amber-800 leading-relaxed">
              At GK CRM, we take your privacy seriously. This policy explains what data we collect, how we use it, and how we protect it. By using GK CRM, you agree to the practices described here.
            </p>
          </div>

          {[
            { title: '1. Information We Collect', content: [
              { sub: 'Account Information', text: 'When you sign up, we collect your name, email address, phone number, and company name. This information is necessary to create and manage your account.' },
              { sub: 'Business Data', text: 'We store the data you enter into GK CRM — leads, customers, invoices, employee records, attendance, and other business information. This data belongs to you and is stored securely.' },
              { sub: 'Usage Data', text: 'We collect information about how you use GK CRM, including pages visited, features used, and actions taken. This helps us improve the product.' },
              { sub: 'Payment Information', text: 'Payments are processed by Razorpay. We do not store your card details. We only receive payment confirmation and transaction IDs.' },
            ]},
            { title: '2. How We Use Your Information', content: [
              { sub: 'Service Delivery', text: 'To provide, maintain, and improve GK CRM services.' },
              { sub: 'Communication', text: 'To send you important account notifications, updates, and support messages.' },
              { sub: 'Billing', text: 'To process payments and manage subscriptions.' },
              { sub: 'Analytics', text: 'To understand usage patterns and improve our product features.' },
              { sub: 'Legal Compliance', text: 'To comply with applicable laws and regulations in India.' },
            ]},
            { title: '3. Data Security', content: [
              { sub: 'Row-Level Security', text: "We use Supabase with Row Level Security (RLS). Your company's data is completely isolated — other companies cannot access your data under any circumstances." },
              { sub: 'Encryption', text: 'All data is encrypted in transit using HTTPS/TLS. Sensitive data is encrypted at rest in our database.' },
              { sub: 'Access Controls', text: 'Role-based access ensures that employees only see data they are authorized to view. Admin controls allow you to manage permissions.' },
            ]},
            { title: '4. Data Sharing', content: [
              { sub: 'We Do Not Sell Your Data', text: 'We never sell, rent, or trade your personal information or business data to third parties for marketing purposes.' },
              { sub: 'Service Providers', text: 'We share data only with trusted service providers — Supabase (database), Razorpay (payments), and Vercel (hosting). These providers are bound by strict data protection agreements.' },
              { sub: 'Legal Requirements', text: 'We may disclose data if required by Indian law, court order, or government authority.' },
            ]},
            { title: '5. Data Retention', content: [
              { sub: 'Active Accounts', text: 'We retain your data for as long as your account is active or as needed to provide services.' },
              { sub: 'Account Deletion', text: 'When you delete your account, we permanently delete all associated data within 30 days, except where retention is required by law.' },
            ]},
            { title: '6. Your Rights', content: [
              { sub: 'Access', text: 'You can access and export all your data from within GK CRM at any time.' },
              { sub: 'Correction', text: 'You can update or correct your personal information from account settings.' },
              { sub: 'Deletion', text: 'You can request deletion of your account and all associated data.' },
              { sub: 'Portability', text: 'You can export your data in standard formats (CSV, JSON) at any time.' },
            ]},
            { title: '7. Cookies', content: [
              { sub: 'Essential Cookies', text: 'We use cookies only for essential functions — authentication sessions and security. We do not use advertising or tracking cookies.' },
            ]},
            { title: "8. Children's Privacy", content: [
              { sub: 'Age Restriction', text: 'GK CRM is intended for business use and is not directed at children under 18 years of age. We do not knowingly collect data from minors.' },
            ]},
            { title: '9. Changes to This Policy', content: [
              { sub: 'Updates', text: 'We may update this Privacy Policy from time to time. We will notify you of significant changes via email or in-app notification. Continued use of GK CRM after changes constitutes acceptance.' },
            ]},
            { title: '10. Contact Us', content: [
              { sub: 'Privacy Questions', text: 'For any privacy-related questions, contact us at: supportcrm@gkdigitalsolutions.in or +91 7095815427. We are based in Hyderabad, Telangana, India.' },
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
          <button onClick={() => router.push('/terms-of-service')}
            className="px-6 py-3 border border-[#E2D9C8] text-[#7A6E60] rounded-xl text-sm font-medium hover:bg-white hover:border-[#B8860B]/40 transition-all">
            Terms of Service →
          </button>
        </div>
      </div>
    </div>
  )
}