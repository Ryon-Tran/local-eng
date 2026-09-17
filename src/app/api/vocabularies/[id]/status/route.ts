import { NextRequest, NextResponse } from 'next/server';
import { updateVocabularyStatus, getVocabularyById } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!['NEW', 'LEARNING', 'LEARNED'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Trạng thái không hợp lệ' }, { status: 400 });
    }

    const ok = await updateVocabularyStatus(id, status);
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy từ vựng' }, { status: 404 });
    }

    const updated = await getVocabularyById(id);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error updating vocabulary status:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
