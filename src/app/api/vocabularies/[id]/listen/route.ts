import { NextRequest, NextResponse } from 'next/server';
import { incrementListenCount } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await incrementListenCount(id);
    if (!result) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy từ vựng' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error incrementing listen count:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
