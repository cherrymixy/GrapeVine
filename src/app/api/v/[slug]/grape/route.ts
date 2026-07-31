import { NextResponse } from 'next/server';

import { isDomainError } from '@/lib/errors';
import { createServiceRoleClient } from '@/lib/supabase';
import { SupabaseVineRepository } from '@/repositories/supabase-vine-repository';
import { getCurrentUser } from '@/services/auth';
import { submitGrape } from '@/services/grape';
import { clampPageIndex } from '@/services/visitor';

/**
 * Add Grape 전송 (PRD §5.10).
 *
 * 로그인 불필요 — 절대규칙 4. 세션은 주인 본인인지 판정하는 데만 쓴다.
 * 슬롯은 방문자가 고르지 않는다. 서버가 빈 슬롯 중 하나를 골라 점유하고
 * 충돌하면 조용히 다른 슬롯으로 다시 시도한다.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  const form = await request.formData();

  const repository = new SupabaseVineRepository(createServiceRoleClient());
  const viewer = await getCurrentUser();

  // 폼이 보낸 page 는 신뢰하지 않는다. 실제 페이지 수로 클램프한다.
  const vine = await repository.getVineBySlug(slug);
  if (!vine) return NextResponse.redirect(new URL('/', request.url), 303);

  const pages = await repository.listPages(vine.id);
  const pageIndex = clampPageIndex(String(form.get('page') ?? ''), pages.length);
  const back = (query = '') => new URL(`/v/${slug}?page=${pageIndex}${query}`, request.url);

  try {
    await submitGrape(repository, {
      slug,
      pageIndex,
      authorName: String(form.get('authorName') ?? ''),
      isAnonymous: form.get('isAnonymous') !== null,
      message: String(form.get('message') ?? ''),
      actorId: viewer?.id ?? null,
    });
  } catch (error) {
    const code = isDomainError(error) ? error.code : 'REPOSITORY_FAILURE';
    if (!isDomainError(error)) console.error('add grape failed', error);
    return NextResponse.redirect(back(`&error=${code}`), 303);
  }

  return NextResponse.redirect(back(), 303);
}
