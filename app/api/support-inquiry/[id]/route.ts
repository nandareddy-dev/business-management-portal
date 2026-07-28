// app/api/admin/support-inquiries/[id]/route.ts
// Deletes a single support inquiry by id. Super-admin only (protect via your existing admin auth check).

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('support_inquiries')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Delete inquiry error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete inquiry' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Delete inquiry error:', err)
    return NextResponse.json(
      { success: false, error: 'Something went wrong' },
      { status: 500 }
    )
  }
}