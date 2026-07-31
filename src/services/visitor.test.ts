import { describe, expect, it } from 'vitest';

import { copy } from '@/data';
import { buildShareUrl } from '@/services/share';
import { clampPageIndex, resolveCtaState } from '@/services/visitor';

describe('clampPageIndex', () => {
  it('keeps a page number that is inside the range', () => {
    expect(clampPageIndex('1', 3)).toBe(1);
    expect(clampPageIndex('2', 3)).toBe(2);
    expect(clampPageIndex('3', 3)).toBe(3);
  });

  it('falls back to 1 when the param is absent', () => {
    expect(clampPageIndex(undefined, 3)).toBe(1);
  });

  // 공유 링크는 아무나 손댈 수 있다. 어떤 쓰레기가 들어와도 첫 장을 보여준다.
  it.each([
    ['above the range', '4'],
    ['far above', '9999'],
    ['zero', '0'],
    ['negative', '-1'],
    ['not a number', 'abc'],
    ['empty', ''],
    ['whitespace', '   '],
    ['fractional', '1.5'],
    ['exponent', '1e3'],
    ['hex', '0x2'],
    ['padded', ' 2 '.replace('2', 'x')],
  ])('falls back to 1 when the param is %s', (_reason, raw) => {
    expect(clampPageIndex(raw, 3)).toBe(1);
  });

  it('takes the first value when the param repeats', () => {
    expect(clampPageIndex(['2', '3'], 3)).toBe(2);
  });

  it('survives a vine with no pages at all', () => {
    expect(clampPageIndex('1', 0)).toBe(1);
  });
});

describe('resolveCtaState', () => {
  const base = { isOwner: false, isFull: false, pageIndex: 1, totalPages: 1 };

  it('offers Add Grape when there is room and a stranger is looking', () => {
    const cta = resolveCtaState(base);

    expect(cta.kind).toBe('add');
    expect(cta.label).toBe(copy.othersVine.addGrape);
    expect(cta.disabled).toBe(false);
  });

  it('shows Here is Full! and points at the next page when the page is full', () => {
    const cta = resolveCtaState({ ...base, isFull: true, pageIndex: 1, totalPages: 2 });

    expect(cta.kind).toBe('full');
    expect(cta.label).toBe(copy.othersVine.full);
    expect(cta.disabled).toBe(true);
    expect(cta.kind === 'full' && cta.nextPageIndex).toBe(2);
  });

  it('has no next page to point at on the last page', () => {
    const cta = resolveCtaState({ ...base, isFull: true, pageIndex: 2, totalPages: 2 });

    expect(cta.kind === 'full' && cta.nextPageIndex).toBeNull();
  });

  it('disables the CTA for the owner (PRD §7-7)', () => {
    const cta = resolveCtaState({ ...base, isOwner: true });

    expect(cta.kind).toBe('owner');
    expect(cta.disabled).toBe(true);
  });

  // 주인은 어느 페이지에도 쓸 수 없다. 꽉 찼다고 "다음 장으로 가라"고
  // 유도하면 갈 곳 없는 길을 안내하는 셈이다.
  it('treats the owner as the owner even when the page is full', () => {
    const cta = resolveCtaState({ ...base, isOwner: true, isFull: true, totalPages: 2 });

    expect(cta.kind).toBe('owner');
    expect(cta).not.toHaveProperty('nextPageIndex');
  });
});

describe('buildShareUrl', () => {
  it('builds the visitor URL from an origin and slug', () => {
    expect(buildShareUrl('https://grapevine.app', 'abc1234567')).toBe(
      'https://grapevine.app/v/abc1234567',
    );
  });

  it('does not produce a double slash when the origin has a trailing one', () => {
    expect(buildShareUrl('https://grapevine.app/', 'abc1234567')).toBe(
      'https://grapevine.app/v/abc1234567',
    );
  });

  it('works against a local dev origin', () => {
    expect(buildShareUrl('http://localhost:3000', 'abc1234567')).toBe(
      'http://localhost:3000/v/abc1234567',
    );
  });
});
