import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { CopyButton } from '@/components/copy-button';
import { GrapeBoard } from '@/components/grape-board';
import { Modal } from '@/components/modal';
import { Pagination } from '@/components/pagination';
import { Sidebar } from '@/components/sidebar';
import { copy } from '@/data';
import { createServiceRoleClient } from '@/lib/supabase';
import { SupabaseVineRepository } from '@/repositories/supabase-vine-repository';
import { getCurrentUser } from '@/services/auth';
import { buildShareUrl, resolveOrigin } from '@/services/share';
import { clampPageIndex } from '@/services/visitor';

type Search = { page?: string; modal?: string; grape?: string; error?: string };

// 회색박스 (작업규칙 5). 생성 리빌은 STEP 17, 비주얼은 STEP 12~13.
export default async function MyVinePage({ searchParams }: { searchParams: Promise<Search> }) {
  // proxy.ts 가 이미 걸러내지만 여기서 **다시** 확인한다.
  // Next 문서가 proxy 단독 의존을 명시적으로 경고한다.
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const search = await searchParams;
  const repository = new SupabaseVineRepository(createServiceRoleClient());
  const vine = await repository.getVineByOwnerId(user.id);

  const headerList = await headers();
  const origin = resolveOrigin({
    host: headerList.get('host'),
    forwardedProto: headerList.get('x-forwarded-proto'),
  });

  // --- 빈 상태: 버튼 하나 (PRD §5.5) ---
  if (!vine) {
    return (
      <main>
        <Sidebar variant="owner" />
        {search.error ? <p data-testid="error">{search.error}</p> : null}
        <form method="post" action="/api/vine">
          <button type="submit" data-testid="create-vine">
            {copy.myVine.createVine}
          </button>
        </form>
      </main>
    );
  }

  // --- 판 상태 ---
  const pages = await repository.listPages(vine.id);
  const pageIndex = clampPageIndex(search.page, pages.length);
  const view = await repository.getPage(vine.id, pageIndex);
  if (!view) redirect('/my');

  const shareUrl = buildShareUrl(origin, vine.slug);
  const base = `/my?page=${pageIndex}`;

  // See Grape: 채워진 알을 눌러 연 모달 (PRD §5.8).
  const openedSlot = search.grape === undefined ? null : Number(search.grape);
  const openedGrape =
    openedSlot !== null && Number.isInteger(openedSlot)
      ? (view.slots.find((slot) => slot.slotIndex === openedSlot)?.grape ?? null)
      : null;

  return (
    <main>
      <Sidebar variant="owner" />
      {search.error ? <p data-testid="error">{search.error}</p> : null}

      <Pagination
        pageIndex={view.pageIndex}
        totalPages={view.totalPages}
        hrefFor={(page) => `/my?page=${page}`}
      />

      <GrapeBoard view={view} slotHref={(slotIndex) => `${base}&grape=${slotIndex}`} />

      {search.modal === 'share' ? (
        <Modal title={copy.share.title} closeHref={base} testId="share-modal">
          <input data-testid="share-url" readOnly value={shareUrl} />
          <CopyButton value={shareUrl} />
        </Modal>
      ) : null}

      {search.modal === 'setting' ? (
        <Modal title={copy.setting.title} closeHref={base} testId="setting-modal">
          <ul>
            <li>
              <a href={`${base}&modal=account`}>{copy.setting.myAccount}</a>
            </li>
            {/* PRD §5.7 — 미정 4행. 확정 전까지 비활성. */}
            {Array.from({ length: copy.setting.pendingCount }, (_, index) => (
              <li key={index} aria-disabled="true" data-testid="setting-pending">
                {copy.setting.pending}
              </li>
            ))}
          </ul>
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
