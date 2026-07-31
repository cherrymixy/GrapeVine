import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { BackLink } from '@/components/back-link';
import { CopyButton } from '@/components/copy-button';
import { CreateVineReveal } from '@/components/create-vine-reveal';
import { CtaButton } from '@/components/cta-button';
import { GrapeBoard } from '@/components/grape-board';
import { Modal } from '@/components/modal';
import { Pagination } from '@/components/pagination';
import { Screen } from '@/components/screen';
import { Sidebar } from '@/components/sidebar';
import { copy } from '@/data';
import { errorMessage } from '@/lib/error-message';
import { createServiceRoleClient } from '@/lib/supabase';
import { SupabaseVineRepository } from '@/repositories/supabase-vine-repository';
import { getCurrentUser } from '@/services/auth';
import { buildShareUrl, resolveOrigin } from '@/services/share';
import { clampPageIndex } from '@/services/visitor';

import styles from './page.module.css';

/*
 * 색인하지 말 것 (STEP 20).
 *
 * `robots.txt` 는 크롤러에게 **오지 말라**고 하는 것이고, 이건 **색인하지
 * 말라**고 하는 것이다. 누군가 이 주소를 어디에 링크하면 robots.txt 만으로는
 * 색인될 수 있다 — 둘 다 있어야 한다.
 *
 * 비목표에 "포도밭 둘러보기"가 있다. 검색으로 남의 판이 나오면 그 기능이
 * 뒷문으로 생긴다.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};


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
        <h1 className="srOnly">{copy.nav.myVine}</h1>
        {search.error ? (
          <p className={styles.error} data-testid="error">
            {errorMessage(search.error)}
          </p>
        ) : null}
        {/*
          누르면 넝쿨이 스톱모션으로 드러나고, 끝나면 그때 전송된다
          (STEP 17 / PRD §9.2). 로직은 그대로다 — 전송을 막는 게 아니라
          미룰 뿐이고, JS 나 reduce 가 없으면 지금처럼 즉시 전송된다.

          그림은 `images/reveal-seq` 11장이다 (STEP 20). 첫 장이 이 화면의
          배경 스틸(풀밭)과 같고 마지막 장이 판 화면 배경(넝쿨)과 같아서
          시작도 끝도 이어 붙는다.
        */}
        <CreateVineReveal action="/api/vine">
          <CtaButton centered testId="create-vine">
            {copy.myVine.createVine}
          </CtaButton>
        </CreateVineReveal>
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

  const modalOpen =
    openedGrape !== null || ['share', 'setting', 'account'].includes(search.modal ?? '');

  return (
    <Screen background="/images/myvine_2.png" tone="dark" priority>
      {/* 시안에는 제목 글자가 없다(201:753). 보이지 않게만 넣는다. */}
      <h1 className="srOnly">{copy.nav.myVine}</h1>

      <GrapeBoard view={view} slotHref={(slotIndex) => `${base}&grape=${slotIndex}`} />
      <Sidebar variant="owner" current="/my" />

      {/*
        좌상단은 평소 페이지네이션이지만 모달이 열리면 뒤로가기로 바뀐다
        (Figma 201:791 / 201:823 / 201:979 는 모두 `<` 를 그린다).
        모달을 닫는 길이 딤 말고도 하나 더 있어야 한다.
      */}
      {modalOpen ? (
        <BackLink href={base} />
      ) : (
        <Pagination
          pageIndex={view.pageIndex}
          totalPages={view.totalPages}
          hrefFor={(page) => `/my?page=${page}`}
        />
      )}

      {search.error ? (
        <p className={styles.error} data-testid="error">
          {errorMessage(search.error)}
        </p>
      ) : null}

      {search.modal === 'share' ? (
        <Modal title={copy.share.title} label={copy.share.title} titleTop={10.5} closeHref={base} testId="share-modal">
          <div className={styles.shareRow}>
            <input
              className={styles.shareUrl}
              data-testid="share-url"
              aria-label={copy.share.title}
              readOnly
              value={shareUrl}
            />
            <CopyButton value={shareUrl} />
          </div>
        </Modal>
      ) : null}

      {search.modal === 'setting' ? (
        <Modal title={copy.setting.title} label={copy.setting.title} titleTop={6.1875} closeHref={base} testId="setting-modal">
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

      {/*
        My Account — Setting 의 첫 행이 여는 곳.
        ⚠️ Figma 에 이 프레임이 없다. 그런데 Setting 의 `My Account >` 가
           갈 데가 없으면 죽은 링크가 되고, 무엇보다 **로그아웃할 방법이
           아무 데도 없다.** 계정 화면이 로그아웃의 제자리라 최소로 만들었다.
           시안이 나오면 교체할 것.
      */}
      {search.modal === 'account' ? (
        <Modal
          title={copy.setting.myAccount}
          label={copy.setting.myAccount}
          titleTop={6.1875}
          closeHref={`${base}&modal=setting`}
          testId="account-modal"
        >
          <dl className={styles.account}>
            <dt>{copy.auth.idLabel}</dt>
            <dd data-testid="account-login-id">{user.loginId}</dd>
            <dt>{copy.auth.displayNameLabel}</dt>
            <dd data-testid="account-display-name">{user.displayName}</dd>
          </dl>
          <form method="post" action="/api/auth/logout">
            <button className={styles.logout} type="submit" data-testid="logout">
              {copy.auth.logOut}
            </button>
          </form>
        </Modal>
      ) : null}

      {openedGrape ? (
        <Modal
          title={openedGrape.isAnonymous ? copy.seeGrape.anonymousAuthor : openedGrape.authorName!}
          label={openedGrape.isAnonymous ? copy.seeGrape.anonymousAuthor : openedGrape.authorName!}
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
