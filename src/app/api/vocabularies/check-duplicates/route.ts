import { NextRequest, NextResponse } from 'next/server';
import { findDuplicates } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { words } = body;

    if (!Array.isArray(words)) {
      return NextResponse.json({ success: false, error: 'words phải là một mảng chuỗi' }, { status: 400 });
    }

    const duplicates = await findDuplicates(words);
    return NextResponse.json({ success: true, data: duplicates });
  } catch (error: any) {
    console.error('Error checking duplicates:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
