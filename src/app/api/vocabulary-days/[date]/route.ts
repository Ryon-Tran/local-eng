import { NextRequest, NextResponse } from 'next/server';
import { getDayByDate } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const { date } = await params;
    const day = getDayByDate(date);
    if (!day) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy ngày học này' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: day });
  } catch (error: any) {
    console.error('Error fetching vocabulary day:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
