import { NextResponse } from 'next/server';

import { signOut } from '@/services/auth';

export async function POST(request: Request): Promise<Response> {
  // 로그아웃 실패로 사용자를 붙잡아 두지 않는다. 세션이 이미 없어도 결과는 같다.
  await signOut().catch((error: unknown) => console.error('logout failed', error));

  return NextResponse.redirect(new URL('/', request.url), 303);
}
