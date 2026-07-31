import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PAGE_CAPACITY } from '@/data/slot-layout';
import { toSyntheticEmail } from '@/lib/auth';
import { MessageTooLongError, OwnerCannotAddGrapeError, SlotTakenError } from '@/lib/errors';
import { createServiceRoleClient } from '@/lib/supabase';
import type { User, Vine, VinePage } from '@/models';
import { SupabaseVineRepository } from '@/repositories/supabase-vine-repository';
import { ensureProfile } from '@/services/auth';
import { getVisitorPage } from '@/services/vine';
import { resolveCtaState } from '@/services/visitor';

/**
 * v0.1-logic 통합 테스트 — 핵심 루프 전체를 실제 Supabase 로 한 번 관통한다.
 *
 * 단위 테스트는 각 규칙을 따로 지키는지 보고, 여기서는 그 규칙들이 **순서대로
 * 이어졌을 때도** 성립하는지 본다. 페이지 증설처럼 "14번째까지는 아니고
 * 15번째에만" 같은 조건은 누적 상태 위에서만 드러난다.
 *
 * HTTP·세션·라우팅은 `src/app/routes.test.ts` 가 실서버로 따로 검증한다.
 * 여기는 도메인 계층이다.
 */

const hasCredentials = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);

describe.skipIf(!hasCredentials)('핵심 루프 통합 (v0.1-logic)', () => {
  let client: SupabaseClient;
  let repository: SupabaseVineRepository;
  const createdAuthUserIds: string[] = [];

  beforeAll(() => {
    client = createServiceRoleClient();
    repository = new SupabaseVineRepository(client);
  });

  afterAll(async () => {
    for (const id of createdAuthUserIds) {
      await client.auth.admin.deleteUser(id);
    }
  });

  /** 신규 가입 — `signUp` 과 같은 경로(admin.createUser + ensureProfile)를 쓴다. */
  async function signUpOwner(displayName: string): Promise<User> {
    const loginId = `t${crypto.randomUUID().slice(0, 12).replace(/-/g, '')}`;

    const { data, error } = await client.auth.admin.createUser({
      email: toSyntheticEmail(loginId),
      password: 'test-password-123',
      email_confirm: true,
    });
    if (error || !data.user) throw new Error(`signup failed: ${error?.message}`);
    createdAuthUserIds.push(data.user.id);

    return ensureProfile(client, { id: data.user.id, loginId, displayName });
  }

  async function freshBoard(): Promise<{ owner: User; vine: Vine; page: VinePage }> {
    const owner = await signUpOwner('Blair');
    const { vine, firstPage } = await repository.createVine(owner.id);
    return { owner, vine, page: firstPage };
  }

  it('가입부터 페이지 증설까지 한 번에 이어진다', async () => {
    // --- 신규 가입 → 판 생성 ---
    const { owner, vine, page } = await freshBoard();

    expect(vine.ownerId).toBe(owner.id);
    expect(vine.slug).toHaveLength(10);
    expect(page.pageIndex).toBe(1);
    expect(page.capacity).toBe(PAGE_CAPACITY);

    // --- slug 로 판이 열리고 빈 15칸이다 ---
    const initial = await getVisitorPage(repository, vine.slug, undefined);
    expect(initial).not.toBeNull();
    expect(initial!.owner.displayName).toBe('Blair');
    expect(initial!.view.slots).toHaveLength(PAGE_CAPACITY);
    expect(initial!.view.slots.every((slot) => slot.grape === null)).toBe(true);
    expect(initial!.view.isFull).toBe(false);
    expect(initial!.view.totalPages).toBe(1);

    // --- 방문자 A: slot 0 에 실명 ---
    const a = await repository.addGrape(page.id, 0, {
      authorName: 'Clara',
      isAnonymous: false,
      message: 'You are kind.',
    });
    expect(a.grape.slotIndex).toBe(0);
    expect(a.grape.authorName).toBe('Clara');
    expect(a.createdNextPage).toBeNull();

    // --- 방문자 B: slot 1 에 익명 (authorName 은 서버가 버린다) ---
    const b = await repository.addGrape(page.id, 1, {
      authorName: 'ShouldBeDropped',
      isAnonymous: true,
      message: 'anonymous praise',
    });
    expect(b.grape.slotIndex).toBe(1);
    expect(b.grape.authorName).toBeNull();
    expect(b.grape.isAnonymous).toBe(true);

    // --- 14칸까지: 아직 증설 없음 ---
    for (let slotIndex = 2; slotIndex < PAGE_CAPACITY - 1; slotIndex += 1) {
      const result = await repository.addGrape(page.id, slotIndex, {
        authorName: `Friend${slotIndex}`,
        isAnonymous: false,
        message: `praise ${slotIndex}`,
      });
      expect(result.createdNextPage).toBeNull();
    }

    const beforeLast = await getVisitorPage(repository, vine.slug, '1');
    expect(beforeLast!.view.slots.filter((slot) => slot.grape !== null)).toHaveLength(
      PAGE_CAPACITY - 1,
    );
    expect(beforeLast!.view.isFull).toBe(false);
    expect(beforeLast!.view.totalPages).toBe(1);

    // --- 15번째: 같은 호출에서 페이지 2 가 생긴다 ---
    const last = await repository.addGrape(page.id, PAGE_CAPACITY - 1, {
      authorName: 'Zoe',
      isAnonymous: false,
      message: 'the last one',
    });
    expect(last.createdNextPage).not.toBeNull();
    expect(last.createdNextPage!.pageIndex).toBe(2);

    // --- 페이지 1 은 꽉 참, totalPages 2 ---
    const full = await getVisitorPage(repository, vine.slug, '1');
    expect(full!.view.isFull).toBe(true);
    expect(full!.view.totalPages).toBe(2);
    expect(full!.view.slots.every((slot) => slot.grape !== null)).toBe(true);

    // --- 그 상태의 CTA 는 "Here is Full!" + 다음 페이지 유도 ---
    const cta = resolveCtaState({
      isOwner: false,
      isFull: full!.view.isFull,
      pageIndex: full!.view.pageIndex,
      totalPages: full!.view.totalPages,
    });
    expect(cta.kind).toBe('full');
    expect(cta.label).toBe('Here is Full!');
    expect(cta.disabled).toBe(true);
    expect(cta.kind === 'full' && cta.nextPageIndex).toBe(2);

    // --- 페이지 2 는 빈 15칸이고 다시 쓸 수 있다 ---
    const second = await getVisitorPage(repository, vine.slug, '2');
    expect(second!.view.slots).toHaveLength(PAGE_CAPACITY);
    expect(second!.view.slots.every((slot) => slot.grape === null)).toBe(true);
    expect(
      resolveCtaState({ isOwner: false, isFull: false, pageIndex: 2, totalPages: 2 }).kind,
    ).toBe('add');
  });

  it('같은 슬롯을 다시 요청해도 기존 알이 오염되지 않는다', async () => {
    const { vine, page } = await freshBoard();

    await repository.addGrape(page.id, 0, {
      authorName: 'Clara',
      isAnonymous: false,
      message: 'the original',
    });

    await expect(
      repository.addGrape(page.id, 0, {
        authorName: 'Dana',
        isAnonymous: false,
        message: 'the overwrite',
      }),
    ).rejects.toBeInstanceOf(SlotTakenError);

    // 거절만으로는 반쪽이다 — 저장된 값이 그대로인지 확인한다.
    const view = await getVisitorPage(repository, vine.slug, '1');
    expect(view!.view.slots[0].grape!.message).toBe('the original');
    expect(view!.view.slots[0].grape!.authorName).toBe('Clara');
    expect(view!.view.slots.filter((slot) => slot.grape !== null)).toHaveLength(1);
    expect(view!.view.totalPages).toBe(1);
  });

  it('없는 슬러그는 판이 없는 것으로 취급된다', async () => {
    // 라우트는 이 null 을 404 로 바꾼다. HTTP 상태 자체는 routes.test.ts 가 본다.
    expect(await getVisitorPage(repository, 'nosuchslug', undefined)).toBeNull();
  });

  it('주인 본인은 자기 판에 쓸 수 없다', async () => {
    const { owner, vine, page } = await freshBoard();

    await expect(
      repository.addGrape(
        page.id,
        0,
        { authorName: 'Blair', isAnonymous: false, message: 'self praise' },
        { actorId: owner.id },
      ),
    ).rejects.toBeInstanceOf(OwnerCannotAddGrapeError);

    // 차단된 시도가 슬롯을 소모하지 않았는지도 본다.
    const view = await getVisitorPage(repository, vine.slug, '1');
    expect(view!.view.slots[0].grape).toBeNull();

    // 주인이 볼 때 CTA 는 비활성이다 (PRD §7-7).
    expect(resolveCtaState({ isOwner: true, isFull: false, pageIndex: 1, totalPages: 1 }).kind).toBe(
      'owner',
    );
  });

  it('81자는 거절하고 80자는 받는다', async () => {
    const { page } = await freshBoard();

    await expect(
      repository.addGrape(page.id, 0, {
        authorName: 'Clara',
        isAnonymous: false,
        message: 'a'.repeat(81),
      }),
    ).rejects.toBeInstanceOf(MessageTooLongError);

    await expect(
      repository.addGrape(page.id, 0, {
        authorName: 'Clara',
        isAnonymous: false,
        message: 'a'.repeat(80),
      }),
    ).resolves.toBeDefined();

    // 코드포인트 기준이라 한글 80자도 통과해야 한다.
    await expect(
      repository.addGrape(page.id, 1, {
        authorName: 'Clara',
        isAnonymous: false,
        message: '가'.repeat(80),
      }),
    ).resolves.toBeDefined();
  });
});
