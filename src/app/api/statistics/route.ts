import { NextResponse } from 'next/server';
import { getStatistics } from '@/lib/db';

export async function GET() {
  try {
    const stats = getStatistics();
    return NextResponse.json({ success: true, data: stats });
  } catch (error: any) {
    console.error('Error getting statistics:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
