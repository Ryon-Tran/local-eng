import { NextRequest, NextResponse } from 'next/server';
import { importVocabularies } from '@/lib/db';
import { ImportPayload } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body: ImportPayload = await request.json();
    const { date, items } = body;

    if (!date || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Ngày học và danh sách từ vựng là bắt buộc' },
        { status: 400 }
      );
    }

    const result = importVocabularies(date, items);
    return NextResponse.json({
      success: true,
      data: result,
      message: `Đã xử lý: ${result.added} thêm mới, ${result.updated} cập nhật, ${result.skipped} bỏ qua`,
    });
  } catch (error: any) {
    console.error('Error importing vocabularies:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
