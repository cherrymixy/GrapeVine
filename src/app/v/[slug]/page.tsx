import { notFound } from 'next/navigation';

import { createServiceRoleClient } from '@/lib/supabase';
import { SupabaseVineRepository } from '@/repositories/supabase-vine-repository';
import { getCurrentUser } from '@/services/auth';
import { getVisitorPage } from '@/services/vine';
import { resolveCtaState } from '@/services/visitor';

// 회색박스 (작업규칙 5). 비주얼은 STEP 10 이후.
//
// 절대규칙 4: 이 라우트는 세션과 무관하게 항상 공개다. src/proxy.ts 의
// matcher 에 들어 있지 않아 가드가 아예 실행되지 않는다.
export default async function OthersVinePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const [{ slug }, { page }] = await Promise.all([params, searchParams]);

  const repository = new SupabaseVineRepository(createServiceRoleClient());
  const visitor = await getVisitorPage(repository, slug, page);

  if (!visitor) notFound();

  // 세션이 없어도(미로그인 방문자) 정상 경로다. isOwner 판정에만 쓴다.
  const viewer = await getCurrentUser();

  const cta = resolveCtaState({
    isOwner: viewer?.id === visitor.vine.ownerId,
    isFull: visitor.view.isFull,
    pageIndex: visitor.view.pageIndex,
    totalPages: visitor.view.totalPages,
  });

  return (
    <main>
      {/*
        PRD §5.9 의 타이틀은 `{주인이름}'s Vine` 이지만 주인 displayName 조회는
        이번 범위 밖이라 넣지 않는다. 슬러그를 이름 자리에 끼우면 틀린 값이
        화면에 남는다. copy.othersVine.title(name) 배선은 STEP 7.
      */}
      {/*
        값을 data 속성으로도 내보낸다. 텍스트로만 두면 React 가 인접 표현식
        사이에 주석 노드를 끼워 `1<!-- -->/<!-- -->2` 로 렌더돼서, 화면은
        멀쩡한데 파싱은 깨진다. 실제로 밟았다.
      */}
      <p
        data-testid="pagination"
        data-page={visitor.view.pageIndex}
        data-total={visitor.view.totalPages}
      >
        {`${visitor.view.pageIndex}/${visitor.view.totalPages}`}
      </p>

      <ul data-testid="slots">
        {visitor.view.slots.map((slot) => (
          <li key={slot.slotIndex} data-filled={slot.grape !== null}>
            {slot.slotIndex}
          </li>
        ))}
      </ul>

      <button type="button" data-testid="cta" data-kind={cta.kind} disabled={cta.disabled}>
        {cta.label}
      </button>

      {cta.kind === 'full' && cta.nextPageIndex !== null ? (
        <a data-testid="next-page" href={`/v/${slug}?page=${cta.nextPageIndex}`}>
          {cta.nextPageIndex}
        </a>
      ) : null}
    </main>
  );
}
