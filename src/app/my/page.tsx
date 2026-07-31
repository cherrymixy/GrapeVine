import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { CopyButton } from '@/components/copy-button';
import { CtaButton } from '@/components/cta-button';
import { GrapeBoard } from '@/components/grape-board';
import { Modal } from '@/components/modal';
import { Pagination } from '@/components/pagination';
import { Screen } from '@/components/screen';
import { Sidebar } from '@/components/sidebar';
import { copy } from '@/data';
import { createServiceRoleClient } from '@/lib/supabase';
import { SupabaseVineRepository } from '@/repositories/supabase-vine-repository';
import { getCurrentUser } from '@/services/auth';
import { buildShareUrl, resolveOrigin } from '@/services/share';
import { clampPageIndex } from '@/services/visitor';

import styles from './page.module.css';

type Search = { page?: string; modal?: string; grape?: string; error?: string };

/**
 * My Vine — Figma 201:749(빈 상태) / 201:753(판 상태) 번역.
 *
 * 배경이 상태에 따라 다르다. 판을 만들기 전은 풀밭(리빌 시작 프레임),
 * 만든 뒤는 넝쿨(리빌 끝 프레임)이다. 리빌 연출 자체는 STEP 17.
 */
export default async function MyVinePage({ searchParams }: { searchParams: Promise<Search> }) {
  // proxy.ts 가 이미 걸러내지만 여기서 **다시** 확인한다.
  // Next 문서가 proxy 단독 의존을 명시적으로 경고한다.
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const search = await searchParams;
  const repository = new SupabaseVineRepository(createServiceRoleClient());
  const vine = await repository.getVineByOwnerId(user.id);

  // --- 빈 상태 (201:749) — 버튼 하나. 사이드바도 페이지네이션도 없다. ---
  if (!vine) {
    return (
      <Screen background="/images/myvine_1.png" tone="dark" priority>
        {search.error ? (
          <p className={styles.error} data-testid="error">
            {search.error}
          </p>
        ) : null}
        <form method="post" action="/api/vine">
          <CtaButton centered testId="create-vine">
            {copy.myVine.createVine}
          </CtaButton>
        </form>
      </Screen>
    );
  }

  // --- 판 상태 (201:753) ---
  const pages = await repository.listPages(vine.id);
  const pageIndex = clampPageIndex(search.page, pages.length);
  const view = await repository.getPage(vine.id, pageIndex);
  if (!view) redirect('/my');

  const headerList = await headers();
  const origin = resolveOrigin({
    host: headerList.get('host'),
    forwardedProto: headerList.get('x-forwarded-proto'),
  });
  const shareUrl = buildShareUrl(origin, vine.slug);
  const base = `/my?page=${pageIndex}`;

  // See Grape: 채워진 알만 열린다 (PRD §5.8).
  const openedSlot = search.grape === undefined ? null : Number(search.grape);
  const openedGrape =
    openedSlot !== null && Number.isInteger(openedSlot)
      ? (view.slots.find((slot) => slot.slotIndex === openedSlot)?.grape ?? null)
      : null;

  return (
    <Screen background="/images/myvine_2.png" tone="dark" priority>
      <GrapeBoard view={view} slotHref={(slotIndex) => `${base}&grape=${slotIndex}`} />
      <Sidebar variant="owner" current="/my" />

      <Pagination
        pageIndex={view.pageIndex}
        totalPages={view.totalPages}
        hrefFor={(page) => `/my?page=${page}`}
      />

      {search.error ? (
        <p className={styles.error} data-testid="error">
          {search.error}
        </p>
      ) : null}

      {search.modal === 'share' ? (
        <Modal title={copy.share.title} titleTop={10.5} closeHref={base} testId="share-modal">
          <div className={styles.shareRow}>
            <input className={styles.shareUrl} data-testid="share-url" readOnly value={shareUrl} />
            <CopyButton value={shareUrl} />
          </div>
        </Modal>
      ) : null}

      {search.modal === 'setting' ? (
        <Modal title={copy.setting.title} titleTop={6.1875} closeHref={base} testId="setting-modal">
          <ul className={styles.settingList}>
            <li className={styles.settingRow}>
              <a className={styles.settingLink} href={`${base}&modal=account`}>
                <span>{copy.setting.myAccount}</span>
                <span>{copy.shell.nextPage}</span>
              </a>
            </li>
            {/* PRD §5.7 — 미정 4행. 확정 전까지 비활성. */}
            {Array.from({ length: copy.setting.pendingCount }, (_, index) => (
              <li
                key={index}
                className={`${styles.settingRow} ${styles.settingPending}`}
                aria-disabled="true"
                data-testid="setting-pending"
              >
                <span>{copy.setting.pending}</span>
                <span>{copy.shell.nextPage}</span>
              </li>
            ))}
          </ul>
        </Modal>
      ) : null}

      {openedGrape ? (
        <Modal
          title={openedGrape.isAnonymous ? copy.seeGrape.anonymousAuthor : openedGrape.authorName!}
          titleTop={6.1875}
          closeHref={base}
          testId="see-grape-modal"
        >
          <p className={styles.grapeMessage} data-testid="grape-message">
            {openedGrape.message}
          </p>
        </Modal>
      ) : null}
    </Screen>
  );
}
