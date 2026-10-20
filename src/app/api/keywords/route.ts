import { NextRequest, NextResponse } from 'next/server';
import { 
  getActiveKeywords, 
  getActiveBrand, 
  switchActiveBrand, 
  addCustomKeyword, 
  removeCustomKeyword,
  getActiveCategoryGroups
} from '@/storage';

export async function GET() {
  const brand = getActiveBrand();
  const keywords = getActiveKeywords();
  const categoryGroups = getActiveCategoryGroups();
  return NextResponse.json({ brand, keywords, categoryGroups });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, keyword, brand } = body;

    if (action === 'switchBrand') {
      if (brand !== 'AHL' && brand !== 'Alchemane') {
        return NextResponse.json({ success: false, error: 'Brand must be AHL or Alchemane' }, { status: 400 });
      }
      const result = switchActiveBrand(brand);
      return NextResponse.json({ 
        success: true, 
        brand: result.activeBrand, 
        keywords: result.keywords,
        categoryGroups: result.categoryGroups
      });
    }

    if (!keyword || typeof keyword !== 'string') {
      return NextResponse.json({ success: false, error: 'Valid keyword string is required' }, { status: 400 });
    }

    if (action === 'add') {
      const updated = addCustomKeyword(keyword);
      return NextResponse.json({ success: true, keywords: updated });
    }

    if (action === 'remove') {
      const updated = removeCustomKeyword(keyword);
      return NextResponse.json({ success: true, keywords: updated });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
