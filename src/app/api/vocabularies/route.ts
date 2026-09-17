import { NextRequest, NextResponse } from 'next/server';
import { getVocabularies, createVocabulary } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dayId = searchParams.get('dayId') || undefined;
    const date = searchParams.get('date') || undefined;
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;

    const items = await getVocabularies({ dayId, date, status, search });
    return NextResponse.json({ success: true, data: items });
  } catch (error: any) {
    console.error('Error getting vocabularies:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { word, phonetic, partOfSpeech, meaning, usage, exampleSentence, date } = body;

    if (!word || !meaning) {
      return NextResponse.json(
        { success: false, error: 'Từ tiếng Anh và nghĩa tiếng Việt là bắt buộc' },
        { status: 400 }
      );
    }

    const targetDate = date || new Date().toISOString().split('T')[0];
    const created = await createVocabulary({
      date: targetDate,
      word,
      phonetic,
      partOfSpeech,
      meaning,
      usage,
      exampleSentence,
    });

    return NextResponse.json({ success: true, data: created });
  } catch (error: any) {
    console.error('Error creating vocabulary:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
