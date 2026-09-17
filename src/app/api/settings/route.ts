import { NextRequest, NextResponse } from 'next/server';
import { getUserSettings, updateUserSettings } from '@/lib/db';

export async function GET() {
  try {
    const settings = getUserSettings();
    return NextResponse.json({ success: true, data: settings });
  } catch (error: any) {
    console.error('Error getting user settings:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const updated = updateUserSettings(body);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error updating user settings:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
