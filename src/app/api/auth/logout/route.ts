import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/firebase/auth-utils';

export async function POST(request: NextRequest) {
  try {
    await clearSessionCookie();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
