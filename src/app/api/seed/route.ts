import { NextResponse } from 'next/server';
import { seedInitialData } from '@/lib/db';

export async function POST() {
  try {
    await seedInitialData();
    return NextResponse.json({ success: true, message: 'Đã nạp 20 từ vựng mẫu thành công' });
  } catch (error: any) {
    console.error('Error seeding data:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
