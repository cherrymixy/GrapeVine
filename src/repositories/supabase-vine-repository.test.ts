import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PAGE_CAPACITY } from '@/data/slot-layout';
import { SlotTakenError } from '@/lib/errors';
import { createServiceRoleClient } from '@/lib/supabase';
import { SupabaseVineRepository } from '@/repositories/supabase-vine-repository';

/** 자격증명이 없으면 실패가 아니라 스킵. */
const hasCredentials = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);

describe.skipIf(!hasCredentials)('SupabaseVineRepository (원격 왕복)', () => {
  // describe 본문은 스킵돼도 실행되므로 클라이언트 생성을 훅으로 늦춘다.
  // 본문에서 만들면 자격증명 없는 환경에서 스킵이 아니라 수집 단계 실패가 된다.
  let client: SupabaseClient;
  let repository: SupabaseVineRepository;
  const createdUserIds: string[] = [];

  beforeAll(() => {
    client = createServiceRoleClient();
    repository = new SupabaseVineRepository(client);
  });

  // users 삭제가 vines → vine_pages → grapes 로 cascade 된다.
  afterAll(async () => {
    for (const id of createdUserIds) {
      await client.from('users').delete().eq('id', id);
    }
  });

  async function createOwner(): Promise<string> {
    const loginId = `__test_${crypto.randomUUID().slice(0, 12)}`;
    const { data, error } = await client
      .from('users')
      .insert({ login_id: loginId, display_name: 'Test Owner' })
      .select('id')
      .single<{ id: string }>();

    if (error) throw new Error(`test fixture failed: ${error.message}`);
    createdUserIds.push(data.id);
    return data.id;
  }

  it('생성한 판을 슬러그로 다시 찾고, 슬롯을 점유하고, 중복 점유는 거부한다', async () => {
    const ownerId = await createOwner();

    // --- 생성 ---
    const { vine, firstPage } = await repository.createVine(ownerId);

    expect(vine.ownerId).toBe(ownerId);
    expect(vine.slug).toHaveLength(10);
    expect(firstPage.pageIndex).toBe(1);
    expect(firstPage.capacity).toBe(PAGE_CAPACITY);

    // --- 슬러그로 왕복 조회 ---
    const found = await repository.getVineBySlug(vine.slug);
    expect(found).toEqual(vine);

    expect(await repository.getVineBySlug('__nonexistent')).toBeNull();

    // --- 빈 판 ---
    const empty = await repository.getPage(vine.id, 1);
    expect(empty).not.toBeNull();
    expect(empty!.slots).toHaveLength(PAGE_CAPACITY);
    expect(empty!.slots.every((slot) => slot.grape === null)).toBe(true);
    expect(empty!.isFull).toBe(false);
    expect(empty!.totalPages).toBe(1);

    expect(await repository.listPages(vine.id)).toEqual([firstPage]);

    // --- 슬롯 점유 ---
    const grape = await repository.addGrape(firstPage.id, 3, {
      authorName: 'Clara',
      isAnonymous: false,
      message: 'You are kind.',
    });

    expect(grape.slotIndex).toBe(3);
    expect(grape.authorName).toBe('Clara');

    const afterAdd = await repository.getPage(vine.id, 1);
    expect(afterAdd!.slots[3].grape).toEqual(grape);
    expect(afterAdd!.slots.filter((slot) => slot.grape !== null)).toHaveLength(1);
    expect(afterAdd!.isFull).toBe(false);

    // --- 절대규칙 3: 익명이면 이름을 서버가 버린다 ---
    const anonymous = await repository.addGrape(firstPage.id, 4, {
      authorName: 'ShouldBeDropped',
      isAnonymous: true,
      message: 'anonymous praise',
    });
    expect(anonymous.authorName).toBeNull();

    // --- 절대규칙 1: 같은 슬롯 재점유는 DB가 거부한다 ---
    await expect(
      repository.addGrape(firstPage.id, 3, {
        authorName: 'Dana',
        isAnonymous: false,
        message: 'me too',
      }),
    ).rejects.toBeInstanceOf(SlotTakenError);
  });
});
