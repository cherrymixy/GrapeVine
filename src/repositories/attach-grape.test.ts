import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PAGE_CAPACITY } from '@/data/slot-layout';
import { toSyntheticEmail } from '@/lib/auth';
import {
  MessageTooLongError,
  OwnerCannotAddGrapeError,
  SlotOutOfRangeError,
  SlotTakenError,
} from '@/lib/errors';
import { createServiceRoleClient } from '@/lib/supabase';
import type { Vine, VinePage } from '@/models';
import { SupabaseVineRepository } from '@/repositories/supabase-vine-repository';
import { getPageView } from '@/services/vine';

/**
 * PRD §7-3 · §7-4 · §7-7 — 슬롯 점유와 페이지 자동 증설.
 *
 * 전부 실제 Supabase 를 때린다. 이 규칙들의 실패 모드가 전부 DB 제약과
 * 트랜잭션 경계라서, 가짜 구현으로는 검증한 셈이 되지 않는다.
 */

const hasCredentials = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);

describe.skipIf(!hasCredentials)('attach_grape (원격)', () => {
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

  async function createOwner(): Promise<string> {
    const loginId = `t${crypto.randomUUID().slice(0, 12).replace(/-/g, '')}`;

    const { data, error } = await client.auth.admin.createUser({
      email: toSyntheticEmail(loginId),
      password: 'test-password-123',
      email_confirm: true,
    });
    if (error || !data.user) throw new Error(`fixture failed (auth): ${error?.message}`);
    createdAuthUserIds.push(data.user.id);

    const { error: profileError } = await client
      .from('users')
      .insert({ id: data.user.id, login_id: loginId, display_name: 'Owner' });
    if (profileError) throw new Error(`fixture failed (profile): ${profileError.message}`);

    return data.user.id;
  }

  /** 매 테스트가 자기만의 판을 갖는다 — 테스트끼리 슬롯을 뺏지 않도록. */
  async function freshVine(): Promise<{ ownerId: string; vine: Vine; page: VinePage }> {
    const ownerId = await createOwner();
    const { vine, firstPage } = await repository.createVine(ownerId);
    return { ownerId, vine, page: firstPage };
  }

  const praise = (message = 'You are kind.') => ({
    authorName: 'Clara',
    isAnonymous: false,
    message,
  });

  // ① 정상 추가
  it('빈 슬롯에 알을 붙이고, 페이지가 안 찼으면 증설하지 않는다', async () => {
    const { page } = await freshVine();

    const { grape, createdNextPage } = await repository.addGrape(page.id, 0, praise());

    expect(grape.pageId).toBe(page.id);
    expect(grape.slotIndex).toBe(0);
    expect(grape.authorName).toBe('Clara');
    expect(grape.isAnonymous).toBe(false);
    expect(grape.message).toBe('You are kind.');
    expect(createdNextPage).toBeNull();
  });

  // ② 같은 슬롯 중복
  it('이미 점유된 슬롯은 SlotTakenError 로 거절한다', async () => {
    const { page } = await freshVine();
    await repository.addGrape(page.id, 7, praise());

    await expect(repository.addGrape(page.id, 7, praise('me too'))).rejects.toBeInstanceOf(
      SlotTakenError,
    );

    // 거절된 시도가 기존 알을 덮어쓰지 않았는지 확인한다.
    const view = await repository.getPage(page.vineId, 1);
    expect(view!.slots[7].grape?.message).toBe('You are kind.');
  });

  // ③ 15번째를 채우면 페이지 2 자동 생성
  it('마지막 칸이 채워지면 같은 호출에서 다음 페이지가 생긴다', async () => {
    const { vine, page } = await freshVine();

    // 14칸까지는 증설이 없어야 한다.
    for (let slotIndex = 0; slotIndex < PAGE_CAPACITY - 1; slotIndex += 1) {
      const result = await repository.addGrape(page.id, slotIndex, praise(`praise ${slotIndex}`));
      expect(result.createdNextPage).toBeNull();
    }
    expect(await repository.listPages(vine.id)).toHaveLength(1);

    // 15번째에서 증설.
    const last = await repository.addGrape(page.id, PAGE_CAPACITY - 1, praise('the last one'));

    expect(last.createdNextPage).not.toBeNull();
    expect(last.createdNextPage!.pageIndex).toBe(2);
    expect(last.createdNextPage!.capacity).toBe(PAGE_CAPACITY);
    expect(last.createdNextPage!.vineId).toBe(vine.id);

    const pages = await repository.listPages(vine.id);
    expect(pages.map((p) => p.pageIndex)).toEqual([1, 2]);

    const view = await repository.getPage(vine.id, 1);
    expect(view!.isFull).toBe(true);
    expect(view!.totalPages).toBe(2);
  });

  // ④ 익명이면 authorName null
  it('익명이면 authorName 을 서버에서 버린다', async () => {
    const { page } = await freshVine();

    const { grape } = await repository.addGrape(page.id, 1, {
      authorName: 'ShouldBeDropped',
      isAnonymous: true,
      message: 'anonymous praise',
    });

    expect(grape.authorName).toBeNull();
    expect(grape.isAnonymous).toBe(true);

    // 저장된 값 자체를 다시 읽어 확인한다 — 반환값만 보면 매핑 단계에서
    // null 로 만든 것과 구분되지 않는다.
    const view = await repository.getPage(page.vineId, 1);
    expect(view!.slots[1].grape!.authorName).toBeNull();
  });

  // ⑤ 81자 거부
  it('81자는 거부하고 80자와 한글 80자는 받는다', async () => {
    const { page } = await freshVine();

    await expect(
      repository.addGrape(page.id, 2, praise('a'.repeat(81))),
    ).rejects.toBeInstanceOf(MessageTooLongError);

    await expect(repository.addGrape(page.id, 3, praise('a'.repeat(80)))).resolves.toBeDefined();
    // char_length 는 코드포인트를 센다 — 한글 80자도 통과해야 한다.
    await expect(repository.addGrape(page.id, 4, praise('가'.repeat(80)))).resolves.toBeDefined();
  });

  // ⑥ 주인 본인 차단
  it('주인은 자기 판에 쓸 수 없고, 다른 사람과 미로그인 방문자는 쓸 수 있다', async () => {
    const { ownerId, page } = await freshVine();
    const strangerId = await createOwner();

    await expect(
      repository.addGrape(page.id, 5, praise(), { actorId: ownerId }),
    ).rejects.toBeInstanceOf(OwnerCannotAddGrapeError);

    // 차단된 시도가 슬롯을 소모하지 않았는지 확인한다.
    const view = await repository.getPage(page.vineId, 1);
    expect(view!.slots[5].grape).toBeNull();

    await expect(
      repository.addGrape(page.id, 5, praise(), { actorId: strangerId }),
    ).resolves.toBeDefined();
    // actorId 없음 = 미로그인 방문자. 이게 기본 경로다 (절대규칙 4).
    await expect(repository.addGrape(page.id, 6, praise())).resolves.toBeDefined();
  });

  // ⑦ 동시성 — 이 RPC 가 페이지 행을 잠그는 유일한 이유
  it('마지막 두 칸이 동시에 채워져도 다음 페이지는 정확히 하나만 생긴다', async () => {
    const { vine, page } = await freshVine();

    for (let slotIndex = 0; slotIndex < PAGE_CAPACITY - 2; slotIndex += 1) {
      await repository.addGrape(page.id, slotIndex, praise(`praise ${slotIndex}`));
    }

    // 잠금이 없으면 둘 다 "14칸, 아직 안 찼다"고 판정해 증설이 아예 일어나지 않는다.
    const results = await Promise.all([
      repository.addGrape(page.id, PAGE_CAPACITY - 2, praise('second last')),
      repository.addGrape(page.id, PAGE_CAPACITY - 1, praise('last')),
    ]);

    const created = results.filter((r) => r.createdNextPage !== null);
    expect(created).toHaveLength(1);

    const pages = await repository.listPages(vine.id);
    expect(pages.map((p) => p.pageIndex)).toEqual([1, 2]);
  });

  it('capacity 범위 밖 슬롯은 SlotOutOfRangeError 로 거절한다', async () => {
    const { page } = await freshVine();

    await expect(repository.addGrape(page.id, PAGE_CAPACITY, praise())).rejects.toBeInstanceOf(
      SlotOutOfRangeError,
    );
    await expect(repository.addGrape(page.id, -1, praise())).rejects.toBeInstanceOf(
      SlotOutOfRangeError,
    );
  });

  describe('getPageView', () => {
    it('슬러그로 열면 항상 15칸 배열과 isFull / totalPages 를 돌려준다', async () => {
      const { vine, page } = await freshVine();
      await repository.addGrape(page.id, 9, praise());

      const view = await getPageView(repository, vine.slug, 1);

      expect(view).not.toBeNull();
      expect(view!.slots).toHaveLength(PAGE_CAPACITY);
      expect(view!.slots[9].grape?.message).toBe('You are kind.');
      expect(view!.slots.filter((slot) => slot.grape === null)).toHaveLength(PAGE_CAPACITY - 1);
      expect(view!.isFull).toBe(false);
      expect(view!.totalPages).toBe(1);
      expect(view!.pageIndex).toBe(1);
    });

    it('없는 슬러그와 없는 페이지는 null 이다', async () => {
      const { vine } = await freshVine();

      expect(await getPageView(repository, '__nonexistent', 1)).toBeNull();
      expect(await getPageView(repository, vine.slug, 99)).toBeNull();
    });
  });
});
