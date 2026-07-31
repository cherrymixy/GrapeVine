import { describe, expect, it, vi } from 'vitest';

import {
  EmptyMessageError,
  InvalidAuthorNameError,
  MessageTooLongError,
  OwnerCannotAddGrapeError,
  PageFullError,
  SlotTakenError,
  VineNotFoundError,
} from '@/lib/errors';
import type { PageSlot } from '@/models';
import type { VineRepository } from '@/repositories/vine-repository';
import { MESSAGE_MAX_LENGTH, normalizeGrapeInput, pickEmptySlot, submitGrape } from '@/services/grape';

describe('normalizeGrapeInput', () => {
  const valid = { authorName: 'Clara', isAnonymous: false, message: 'You are kind.' };

  it('trims the message', () => {
    expect(normalizeGrapeInput({ ...valid, message: '  hi  ' }).message).toBe('hi');
  });

  it.each([
    ['empty', ''],
    ['spaces only', '   '],
    ['newlines only', '\n\t '],
  ])('rejects a message that is %s', (_reason, message) => {
    expect(() => normalizeGrapeInput({ ...valid, message })).toThrow(EmptyMessageError);
  });

  it('rejects 81 characters but accepts 80', () => {
    expect(() => normalizeGrapeInput({ ...valid, message: 'a'.repeat(81) })).toThrow(
      MessageTooLongError,
    );
    expect(normalizeGrapeInput({ ...valid, message: 'a'.repeat(80) }).message).toHaveLength(80);
  });

  it('counts by code point so 80 Korean characters fit', () => {
    const message = '가'.repeat(MESSAGE_MAX_LENGTH);
    expect(normalizeGrapeInput({ ...valid, message }).message).toBe(message);
  });

  // 절대규칙 3 — 클라가 보낸 이름을 그대로 믿지 않는다.
  it('drops the author name when anonymous', () => {
    const result = normalizeGrapeInput({ ...valid, isAnonymous: true, authorName: 'Leaked' });

    expect(result.authorName).toBeNull();
    expect(result.isAnonymous).toBe(true);
  });

  it.each([
    ['null', null],
    ['empty', ''],
    ['spaces only', '   '],
  ])('rejects a named grape whose author name is %s', (_reason, authorName) => {
    expect(() => normalizeGrapeInput({ ...valid, authorName })).toThrow(InvalidAuthorNameError);
  });
});

describe('pickEmptySlot', () => {
  const slots = (filled: number[]): PageSlot[] =>
    Array.from({ length: 5 }, (_, slotIndex) => ({
      slotIndex,
      grape: filled.includes(slotIndex) ? ({ slotIndex } as never) : null,
    }));

  it('only ever picks an empty slot', () => {
    // random 을 양 끝으로 밀어 경계에서도 찬 슬롯을 고르지 않는지 본다.
    expect(pickEmptySlot(slots([0, 1, 2]), () => 0)).toBe(3);
    expect(pickEmptySlot(slots([0, 1, 2]), () => 0.999)).toBe(4);
  });

  it('returns null when the page is full', () => {
    expect(pickEmptySlot(slots([0, 1, 2, 3, 4]))).toBeNull();
  });

  it('spreads picks across the empty slots rather than always taking the first', () => {
    const picked = new Set(
      Array.from({ length: 200 }, () => pickEmptySlot(slots([]), Math.random)),
    );
    expect(picked.size).toBeGreaterThan(1);
  });
});

describe('submitGrape', () => {
  const vine = { id: 'v1', ownerId: 'owner', slug: 'abc', createdAt: '' };
  const page = { id: 'p1', vineId: 'v1', pageIndex: 1, capacity: 3 };

  function repo(overrides: Partial<VineRepository> = {}): VineRepository {
    const emptyView = {
      pageIndex: 1,
      totalPages: 1,
      isFull: false,
      slots: [0, 1, 2].map((slotIndex) => ({ slotIndex, grape: null })),
    };

    return {
      createVine: vi.fn(),
      getVineBySlug: vi.fn().mockResolvedValue(vine),
      getVineByOwnerId: vi.fn(),
      getOwner: vi.fn(),
      getPage: vi.fn().mockResolvedValue(emptyView),
      listPages: vi.fn().mockResolvedValue([page]),
      addGrape: vi.fn().mockImplementation(async (_pageId, slotIndex) => ({
        grape: { slotIndex },
        createdNextPage: null,
      })),
      ...overrides,
    } as unknown as VineRepository;
  }

  const input = {
    slug: 'abc',
    pageIndex: 1,
    authorName: 'Clara',
    isAnonymous: false,
    message: 'You are kind.',
  };

  it('lets the server pick the slot — the caller never names one', async () => {
    const repository = repo();

    const result = await submitGrape(repository, input, { random: () => 0 });

    expect(result.grape.slotIndex).toBe(0);
    expect(repository.addGrape).toHaveBeenCalledTimes(1);
  });

  // 방문자는 충돌이 있었다는 사실조차 몰라야 한다 (§3 마찰 0).
  it('retries on a slot conflict instead of surfacing it', async () => {
    const addGrape = vi
      .fn()
      .mockRejectedValueOnce(new SlotTakenError('p1', 0))
      .mockResolvedValue({ grape: { slotIndex: 1 }, createdNextPage: null });

    const result = await submitGrape(repo({ addGrape }), input, { random: () => 0 });

    expect(result.grape.slotIndex).toBe(1);
    expect(addGrape).toHaveBeenCalledTimes(2);
  });

  it('re-reads the page on every retry so it does not reuse a stale slot list', async () => {
    const getPage = vi.fn().mockResolvedValue({
      pageIndex: 1,
      totalPages: 1,
      isFull: false,
      slots: [{ slotIndex: 0, grape: null }],
    });
    const addGrape = vi
      .fn()
      .mockRejectedValueOnce(new SlotTakenError('p1', 0))
      .mockResolvedValue({ grape: { slotIndex: 0 }, createdNextPage: null });

    await submitGrape(repo({ getPage, addGrape }), input, { random: () => 0 });

    expect(getPage).toHaveBeenCalledTimes(2);
  });

  // 재시도해봐야 같은 결과인 실패는 즉시 올린다.
  it('does not retry errors other than a slot conflict', async () => {
    const addGrape = vi.fn().mockRejectedValue(new OwnerCannotAddGrapeError());

    await expect(submitGrape(repo({ addGrape }), input)).rejects.toBeInstanceOf(
      OwnerCannotAddGrapeError,
    );
    expect(addGrape).toHaveBeenCalledTimes(1);
  });

  it('reports the page as full when every slot is taken', async () => {
    const getPage = vi.fn().mockResolvedValue({
      pageIndex: 1,
      totalPages: 1,
      isFull: true,
      slots: [{ slotIndex: 0, grape: { slotIndex: 0 } }],
    });

    await expect(submitGrape(repo({ getPage }), input)).rejects.toBeInstanceOf(PageFullError);
  });

  it('gives up as PageFull after exhausting the retry budget', async () => {
    const addGrape = vi.fn().mockRejectedValue(new SlotTakenError('p1', 0));

    await expect(
      submitGrape(repo({ addGrape }), input, { attempts: 3 }),
    ).rejects.toBeInstanceOf(PageFullError);
    expect(addGrape).toHaveBeenCalledTimes(3);
  });

  it('rejects an unknown slug', async () => {
    const getVineBySlug = vi.fn().mockResolvedValue(null);

    await expect(submitGrape(repo({ getVineBySlug }), input)).rejects.toBeInstanceOf(
      VineNotFoundError,
    );
  });

  it('validates before touching the repository at all', async () => {
    const repository = repo();

    await expect(
      submitGrape(repository, { ...input, message: '   ' }),
    ).rejects.toBeInstanceOf(EmptyMessageError);
    expect(repository.getVineBySlug).not.toHaveBeenCalled();
  });

  it('passes the actor through so the owner can be blocked', async () => {
    const repository = repo();

    await submitGrape(repository, { ...input, actorId: 'someone' }, { random: () => 0 });

    expect(repository.addGrape).toHaveBeenCalledWith(
      'p1',
      0,
      expect.objectContaining({ authorName: 'Clara' }),
      { actorId: 'someone' },
    );
  });
});
