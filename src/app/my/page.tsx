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

  /*
   * 열린 모달과 그 **닫는 곳**을 한 군데서 정한다 (STEP 23).
   *
   * 전에는 딤은 `closeHref` 로, 좌상단 뒤로가기는 늘 `base` 로 갔다 —
   * My Account 에서 뒤로가기를 누르면 Setting 이 아니라 판까지 나가 버렸다.
   * 둘이 같은 값을 봐야 어긋나지 않는다.
   */
  const SETTING_PAGES = ['account', 'privacy', 'terms', 'openSource'] as const;
  type SettingPage = (typeof SETTING_PAGES)[number];
  const settingPage = SETTING_PAGES.find((name) => name === search.modal) ?? null;

  const openModal = openedGrape !== null ? 'grape' : (search.modal ?? null);
  const modalOpen =
    openedGrape !== null || ['share', 'setting', ...SETTING_PAGES].includes(search.modal ?? '');
  /** 설정 안쪽 문서는 설정으로, 나머지는 판으로 돌아간다. */
  const closeHref = settingPage ? `${base}&modal=setting` : base;

  return (
    <Screen background="/images/myvine_2.png" tone="dark" priority>
      {/* 시안에는 제목 글자가 없다(201:753). 보이지 않게만 넣는다. */}
      <h1 className="srOnly">{copy.nav.myVine}</h1>

      {/*
        주인 화면은 빈 알을 그리지 않는다 (승아님 지시). 자기 판의 빈자리를
        세는 건 이 서비스가 하려는 일이 아니다 (§9 "판 상태 = 채운 수만").
        방문자 화면은 어디에 붙일지 보여야 하므로 그대로 그린다.
      */}
      <GrapeBoard
        view={view}
        slotHref={(slotIndex) => `${base}&grape=${slotIndex}`}
        showEmpty={false}
      />
      <Sidebar variant="owner" current="/my" />

      {/*
        좌상단은 평소 페이지네이션이지만 모달이 열리면 뒤로가기로 바뀐다
        (Figma 201:791 / 201:823 / 201:979 는 모두 `<` 를 그린다).
        모달을 닫는 길이 딤 말고도 하나 더 있어야 한다.
      */}
      {modalOpen ? (
        <BackLink href={closeHref} />
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
        <Modal title={copy.share.title} label={copy.share.title} titleTop={10.5} closeHref={closeHref} testId="share-modal">
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
        <Modal title={copy.setting.title} label={copy.setting.title} titleTop={6.1875} closeHref={closeHref} testId="setting-modal">
          <ul className={styles.settingList}>
            {[
              { key: 'account', label: copy.setting.myAccount },
              { key: 'privacy', label: copy.setting.privacy },
              { key: 'terms', label: copy.setting.terms },
              { key: 'openSource', label: copy.setting.openSource },
            ].map((row) => (
              <li key={row.key} className={styles.settingRow}>
                <a className={styles.settingLink} href={`${base}&modal=${row.key}`}>
                  <span>{row.label}</span>
                  <span>{copy.shell.nextPage}</span>
                </a>
              </li>
            ))}
            {/* 로그아웃은 이동이 아니라 동작이라 링크가 아니다. */}
            <li className={styles.settingRow}>
              <form method="post" action="/api/auth/logout">
                <button className={styles.settingLink} type="submit" data-testid="logout">
                  <span>{copy.setting.logOutRow}</span>
                  <span aria-hidden="true" />
                </button>
              </form>
            </li>
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
          closeHref={closeHref}
          testId="account-modal"
        >
          <dl className={styles.account}>
            <dt>{copy.auth.idLabel}</dt>
            <dd data-testid="account-login-id">{user.loginId}</dd>
            <dt>{copy.auth.displayNameLabel}</dt>
            <dd data-testid="account-display-name">{user.displayName}</dd>
          </dl>
        </Modal>
      ) : null}

      {/*
        설정 안쪽 문서 (STEP 23). 전에는 `...` 네 줄이 비활성으로 놓여 있었다.
        홀수 줄이 소제목, 짝수 줄이 본문이다 — 문구는 전부 `data/copy.ts`.
      */}
      {settingPage && settingPage !== 'account' ? (
        <Modal
          title={copy.documents[settingPage].title}
          label={copy.documents[settingPage].title}
          titleTop={4.5}
          closeHref={closeHref}
          testId={`${settingPage}-modal`}
        >
          <div className={styles.document} data-testid="document">
            {copy.documents[settingPage].body.map((line, index) =>
              index % 2 === 0 ? (
                <h3 key={line} className={styles.documentHeading}>
                  {line}
                </h3>
              ) : (
                <p key={line} className={styles.documentBody}>
                  {line}
                </p>
              ),
            )}
          </div>
        </Modal>
      ) : null}

      {openedGrape ? (
        <Modal
          title={openedGrape.isAnonymous ? copy.seeGrape.anonymousAuthor : openedGrape.authorName!}
          label={openedGrape.isAnonymous ? copy.seeGrape.anonymousAuthor : openedGrape.authorName!}
          titleTop={6.1875}
          closeHref={closeHref}
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
