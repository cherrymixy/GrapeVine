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

  let droppedSlot: number;
  try {
    const attached = await submitGrape(repository, {
      slug,
      pageIndex,
      authorName: String(form.get('authorName') ?? ''),
      isAnonymous: form.get('isAnonymous') !== null,
      message: String(form.get('message') ?? ''),
      actorId: viewer?.id ?? null,
    });
    droppedSlot = attached.grape.slotIndex;
  } catch (error) {
    const code = isDomainError(error) ? error.code : 'REPOSITORY_FAILURE';
    if (!isDomainError(error)) console.error('add grape failed', error);
    return NextResponse.redirect(back(`&error=${code}`), 303);
  }

  /*
   * `dropped` 은 **연출용 힌트**다 (STEP 18 / PRD §9.3 — 방금 붙은 알이
   * 위에서 떨어진다). 동작은 아무것도 바뀌지 않는다.
   *
   * 여기 붙이는 이유: **어느 슬롯이 배정됐는지는 서버만 안다.** 슬롯은
   * 방문자가 고르지 않고 서버가 빈 칸 중에서 뽑아 충돌하면 조용히 다시
   * 시도한다. 클라이언트에서 "전후 판을 비교해 새 알을 찾는" 방법도 있지만,
   * 이 서비스는 **여러 방문자가 동시에 붙이는 것이 전제**라(절대규칙 1)
   * 그 사이 남이 붙인 알을 자기 것으로 착각한다.
   *
   * 이 파라미터는 애니메이션이 끝나면 클라이언트가 URL 에서 지운다 —
   * 방문자가 주소를 복사해 갈 때 남아 있으면 안 된다.
   */
  return NextResponse.redirect(back(`&dropped=${droppedSlot}`), 303);
}
