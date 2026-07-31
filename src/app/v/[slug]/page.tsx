import { notFound } from 'next/navigation';

import { GrapeBoard } from '@/components/grape-board';
import { Modal } from '@/components/modal';
import { Pagination } from '@/components/pagination';
import { copy } from '@/data';
import { createServiceRoleClient } from '@/lib/supabase';
import { SupabaseVineRepository } from '@/repositories/supabase-vine-repository';
import { getCurrentUser } from '@/services/auth';
import { MESSAGE_MAX_LENGTH } from '@/services/grape';
import { getVisitorPage } from '@/services/vine';
import { resolveCtaState } from '@/services/visitor';

type Search = { page?: string; modal?: string; grape?: string; error?: string };

// 회색박스 (작업규칙 5). 낙하 연출은 STEP 18, 비주얼은 STEP 12~13.
//
// 절대규칙 4: 이 라우트는 세션과 무관하게 항상 공개다. src/proxy.ts 의
// matcher 에 들어 있지 않아 가드가 아예 실행되지 않는다.
export default async function OthersVinePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Search>;
}) {
  const [{ slug }, search] = await Promise.all([params, searchParams]);

  const repository = new SupabaseVineRepository(createServiceRoleClient());
  const visitor = await getVisitorPage(repository, slug, search.page);

  if (!visitor) notFound();

  // 세션이 없어도(미로그인 방문자) 정상 경로다. isOwner 판정에만 쓴다.
  const viewer = await getCurrentUser();
  const { view, owner } = visitor;

  const cta = resolveCtaState({
    isOwner: viewer?.id === visitor.vine.ownerId,
    isFull: view.isFull,
    pageIndex: view.pageIndex,
    totalPages: view.totalPages,
  });

  const base = `/v/${slug}?page=${view.pageIndex}`;

  // 채워진 알 열람은 주인 것과 같은 모달을 쓴다 (PRD §5.8).
  const openedSlot = search.grape === undefined ? null : Number(search.grape);
  const openedGrape =
    openedSlot !== null && Number.isInteger(openedSlot)
      ? (view.slots.find((slot) => slot.slotIndex === openedSlot)?.grape ?? null)
      : null;

  return (
    <main>
      {/* PRD §5.0 — 방문자 화면의 GNB 는 `{이름}'s Vine` 단일 항목이다. */}
      <h1 data-testid="vine-title">{copy.othersVine.title(owner.displayName)}</h1>

      {search.error ? <p data-testid="error">{search.error}</p> : null}

      <Pagination
        pageIndex={view.pageIndex}
        totalPages={view.totalPages}
        hrefFor={(page) => `/v/${slug}?page=${page}`}
      />

      <GrapeBoard view={view} slotHref={(slotIndex) => `${base}&grape=${slotIndex}`} />

      {/* CTA 3분기 — 판정은 resolveCtaState 가 한다 (PRD §5.9). */}
      {cta.kind === 'add' ? (
        <a data-testid="cta" data-kind="add" href={`${base}&modal=add`}>
          {cta.label}
        </a>
      ) : (
        <button type="button" data-testid="cta" data-kind={cta.kind} disabled>
          {cta.label}
        </button>
      )}

      {cta.kind === 'full' && cta.nextPageIndex !== null ? (
        <a data-testid="cta-next" href={`/v/${slug}?page=${cta.nextPageIndex}`}>
          {copy.shell.nextPage}
        </a>
      ) : null}

      {/* Add Grape (PRD §5.10). 슬롯을 고르는 입력이 없다 — 서버가 배정한다. */}
      {search.modal === 'add' && cta.kind === 'add' ? (
        <Modal
          title={copy.addGrape.title(owner.displayName)}
          closeHref={base}
          testId="add-grape-modal"
        >
          <form method="post" action={`/api/v/${slug}/grape`}>
            <input type="hidden" name="page" value={view.pageIndex} />
            <textarea name="message" maxLength={MESSAGE_MAX_LENGTH} required />
            <label>
              <input name="isAnonymous" type="checkbox" />
              {copy.addGrape.anonymous}
            </label>
            <label>
              {copy.auth.displayNameLabel}
              <input name="authorName" type="text" />
            </label>
            <button type="submit">{copy.addGrape.send}</button>
          </form>
        </Modal>
      ) : null}

      {openedGrape ? (
        <Modal
          title={openedGrape.isAnonymous ? copy.seeGrape.anonymousAuthor : openedGrape.authorName!}
          closeHref={base}
          testId="see-grape-modal"
        >
          <p data-testid="grape-message">{openedGrape.message}</p>
        </Modal>
      ) : null}
    </main>
  );
}
