// app/(super-admin)/admin/support-inquiries/page.tsx
// Shows messages submitted via the landing page "Support" form (support_inquiries table).
// This is separate from the existing support-tickets system (client-portal tickets).

import { supabaseAdmin } from '@/lib/supabase/admin'
import DeleteInquiryButton from '@/components/super-admin/support-inquiries/DeleteInquiryButton'

export const dynamic = 'force-dynamic' // always fetch fresh data, no caching

type SupportInquiry = {
  id: string
  name: string
  email: string
  message: string
  status: string
  is_customer: boolean
  created_at: string
}

export default async function SupportInquiriesPage() {
  const { data: inquiries, error } = await supabaseAdmin
    .from('support_inquiries')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="p-6 bg-[#F5F0E8] min-h-screen">
        <p className="text-red-600">Failed to load inquiries: {error.message}</p>
      </div>
    )
  }

  const list = (inquiries ?? []) as SupportInquiry[]

  return (
    <div className="p-6 bg-[#F5F0E8] min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1C1712]">Landing Page Support Inquiries</h1>
        <p className="text-sm text-[#7A6E60] mt-1">
          Messages submitted via the public website support form. {list.length} total.
        </p>
      </div>

      {list.length === 0 ? (
        <div className="bg-white border border-[#E2D9C8] rounded-xl p-10 text-center text-[#9A8F82]">
          No inquiries yet.
        </div>
      ) : (
        <div className="bg-white border border-[#E2D9C8] rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-[#F7F5F1] border-b border-[#E2D9C8]">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-[#7A6E60]">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-[#7A6E60]">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-[#7A6E60]">Customer?</th>
                <th className="text-left px-4 py-3 font-semibold text-[#7A6E60]">Message</th>
                <th className="text-left px-4 py-3 font-semibold text-[#7A6E60]">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-[#7A6E60]">Received</th>
                <th className="text-left px-4 py-3 font-semibold text-[#7A6E60]">Action</th>
              </tr>
            </thead>
            <tbody>
              {list.map((inq) => (
                <tr key={inq.id} className="border-b border-[#F0EBE0] last:border-0 hover:bg-[#FDFAF8]">
                  <td className="px-4 py-3 font-medium text-[#1C1712]">{inq.name}</td>
                  <td className="px-4 py-3 text-[#7A6E60]">
                    <a href={`mailto:${inq.email}`} className="text-blue-600 hover:underline">
                      {inq.email}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    {inq.is_customer ? (
                      <span className="inline-block px-2 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                        ✓ Customer
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                        Not a customer
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#7A6E60] max-w-md truncate" title={inq.message}>
                    {inq.message}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                        inq.status === 'new'
                          ? 'bg-amber-100 text-amber-700'
                          : inq.status === 'resolved'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {inq.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#9A8F82] whitespace-nowrap">
                    {new Date(inq.created_at).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <DeleteInquiryButton id={inq.id} name={inq.name} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}