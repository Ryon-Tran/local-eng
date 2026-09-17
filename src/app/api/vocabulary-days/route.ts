import { NextResponse } from 'next/server';
import { getDaysWithStats } from '@/lib/db';

export async function GET() {
  try {
    const days = getDaysWithStats();
    return NextResponse.json({ success: true, data: days });
  } catch (error: any) {
    console.error('Error fetching vocabulary days:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
