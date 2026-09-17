import { NextRequest, NextResponse } from 'next/server';
import { parseVocabularyText } from '@/lib/parser';
import { findDuplicates } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;

    if (typeof text !== 'string') {
      return NextResponse.json({ success: false, error: 'Thiếu nội dung văn bản' }, { status: 400 });
    }

    const parseResult = parseVocabularyText(text);

    // Check duplicate info for each parsed word
    const words = parseResult.items.map(item => item.word);
    const duplicates = findDuplicates(words);

    const enrichedItems = parseResult.items.map(item => {
      const dup = duplicates[item.word.trim().toLowerCase()];
      return {
        ...item,
        duplicateInfo: dup || { exists: false },
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        items: enrichedItems,
        errors: parseResult.errors,
        totalLines: parseResult.totalLines,
        validCount: parseResult.validCount,
        duplicateCount: enrichedItems.filter(i => i.duplicateInfo?.exists).length,
      },
    });
  } catch (error: any) {
    console.error('Error parsing vocabulary:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
