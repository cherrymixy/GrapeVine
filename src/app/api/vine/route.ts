import { NextResponse } from 'next/server';

import { isDomainError } from '@/lib/errors';
import { createServiceRoleClient } from '@/lib/supabase';
import { SupabaseVineRepository } from '@/repositories/supabase-vine-repository';
import { getCurrentUser } from '@/services/auth';

/**
 * Create My Vine (PRD §5.5). 옵션 없음 — 버튼 하나.
 *
 * 이미 판이 있으면 `UNIQUE(vines.owner_id)` 가 막는다(→ OWNER_ALREADY_HAS_VINE).
 * 더블클릭도 여기서 걸러진다.
 */
export async function POST(request: Request): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL('/login', request.url), 303);

  try {
    const repository = new SupabaseVineRepository(createServiceRoleClient());
    await repository.createVine(user.id);
  } catch (error) {
    const code = isDomainError(error) ? error.code : 'REPOSITORY_FAILURE';
    if (!isDomainError(error)) console.error('create vine failed', error);
    return NextResponse.redirect(new URL(`/my?error=${code}`, request.url), 303);
  }

  return NextResponse.redirect(new URL('/my', request.url), 303);
}
