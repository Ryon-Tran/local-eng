import { NextRequest, NextResponse } from 'next/server';
import { getVocabularyById, updateVocabulary, deleteVocabulary } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const vocab = getVocabularyById(id);
    if (!vocab) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy từ vựng' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: vocab });
  } catch (error: any) {
    console.error('Error getting vocabulary by id:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updated = updateVocabulary(id, body);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy từ vựng' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error updating vocabulary:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ok = deleteVocabulary(id);
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy từ vựng' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Đã xóa từ vựng thành công' });
  } catch (error: any) {
    console.error('Error deleting vocabulary:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
