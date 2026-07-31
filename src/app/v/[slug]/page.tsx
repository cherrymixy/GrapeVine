import { notFound } from 'next/navigation';

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
import { MESSAGE_MAX_LENGTH } from '@/services/grape';
import { getVisitorPage } from '@/services/vine';
import { resolveCtaState } from '@/services/visitor';

import styles from './page.module.css';

type Search = { page?: string; modal?: string; grape?: string; error?: string };

/**
 * Other's Vine — Figma 201:777(빈 칸 있음) / 201:871(꽉 참) / 201:904(Add Grape).
 *
 * 절대규칙 4: 이 라우트는 세션과 무관하게 항상 공개다. src/proxy.ts 의
 * matcher 에 들어 있지 않아 가드가 아예 실행되지 않는다.
 */
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

  // 채워진 알 열람은 주인 화면과 같은 모달을 쓴다 (PRD §5.8).
  const openedSlot = search.grape === undefined ? null : Number(search.grape);
  const openedGrape =
    openedSlot !== null && Number.isInteger(openedSlot)
      ? (view.slots.find((slot) => slot.slotIndex === openedSlot)?.grape ?? null)
      : null;

  return (
    <Screen background="/images/myvine_2.png" tone="dark" priority>
      <GrapeBoard view={view} slotHref={(slotIndex) => `${base}&grape=${slotIndex}`} />

      {/* PRD §5.0 — 방문자 GNB 는 `{이름}'s Vine` 단일 항목이다. */}
      <Sidebar variant="visitor" ownerName={owner.displayName} />

      <Pagination
        pageIndex={view.pageIndex}
        totalPages={view.totalPages}
        hrefFor={(page) => `/v/${slug}?page=${page}`}
      />

      {/* CTA 3분기 — 판정은 resolveCtaState 가 한다 (PRD §5.9). */}
      <div className={styles.cta}>
        {cta.kind === 'add' ? (
          <CtaButton variant="inverted" href={`${base}&modal=add`} testId="cta">
            {cta.label}
          </CtaButton>
        ) : (
          <CtaButton variant={cta.kind === 'full' ? 'full' : 'inverted'} disabled testId="cta">
            {cta.label}
          </CtaButton>
        )}
      </div>

      {search.error ? (
        <p className={styles.error} data-testid="error">
          {search.error}
        </p>
      ) : null}

      {/* Add Grape (PRD §5.10). 슬롯을 고르는 입력이 없다 — 서버가 배정한다. */}
      {search.modal === 'add' && cta.kind === 'add' ? (
        <Modal
          title={
            <>
              <span>{copy.addGrape.titleLead}</span>
              <br />
              <u>{owner.displayName}</u>
            </>
          }
          label={copy.addGrape.title(owner.displayName)}
          titleTop={5.6875}
          closeHref={base}
          testId="add-grape-modal"
        >
          <form className={styles.form} method="post" action={`/api/v/${slug}/grape`}>
            <input type="hidden" name="page" value={view.pageIndex} />
            <textarea
              className={styles.message}
              name="message"
              maxLength={MESSAGE_MAX_LENGTH}
              aria-label={copy.addGrape.title(owner.displayName)}
              required
            />

            <label className={styles.anonymous}>
              <input className={styles.radio} name="isAnonymous" type="checkbox" />
              {copy.addGrape.anonymous}
            </label>

            {/*
              PRD §5.10 "익명 미선택 시 이름 입력 필요".
              Unknown 을 켜면 CSS 가 이 칸을 숨긴다 — 익명이면 받을 이유가 없다.
              Figma 201:904 에 안 보이는 건 그 프레임이 Unknown 켜진 상태라서다.

              `required` 를 걸지 않는다. 숨겨진 채로 required 면 브라우저가
              전송을 막으면서 포커스할 곳이 없어 아무 안내도 못 준다.
              이름 누락은 서버가 InvalidAuthorNameError 로 거른다.
            */}
            <input
              className={styles.authorName}
              name="authorName"
              type="text"
              placeholder={copy.auth.displayNameLabel}
              aria-label={copy.auth.displayNameLabel}
            />

            <button className={styles.send} type="submit">
              {copy.addGrape.send}
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
