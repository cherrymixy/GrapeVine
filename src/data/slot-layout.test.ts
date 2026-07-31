import { describe, expect, it } from 'vitest';

import { PAGE_CAPACITY, SLOT_LAYOUT, SOURCE_FRAME } from '@/data/slot-layout';

/**
 * 골든 데이터 — Figma `DDD` / My Vine `201:753` 의 Ellipse 좌상단 px.
 * Ellipse 번호 오름차순, 5007 과 완전히 겹치는 5009 는 제외.
 * 이 배열은 손으로 고치지 않는다. 피그마가 바뀌면 다시 추출한다.
 */
const FIGMA_TOP_LEFT_PX: ReadonlyArray<readonly [number, number]> = [
  [634, 461], // 5002
  [1106, 31], // 5003
  [189, 461], // 5004
  [867, 3], // 5005
  [704, 154], // 5006
  [485, 31], // 5007
  [42, 154], // 5008
  [411, 358], // 5010
  [248, 166], // 5011
  [856, 605], // 5012
  [1168, 524], // 5013
  [1073, 235], // 5014
  [1310, 358], // 5015
  [403, 575], // 5016
  [871, 358], // 5017
];

const FIGMA_DIAMETER_PX = 163;

describe('slot-layout', () => {
  it(`has exactly ${PAGE_CAPACITY} entries`, () => {
    expect(SLOT_LAYOUT).toHaveLength(PAGE_CAPACITY);
  });

  it('uses slotIndex values that match their array position', () => {
    for (const [index, slot] of SLOT_LAYOUT.entries()) {
      expect(slot.slotIndex).toBe(index);
    }
  });

  it('keeps every slot within the container', () => {
    for (const slot of SLOT_LAYOUT) {
      expect(slot.xPct).toBeGreaterThanOrEqual(0);
      expect(slot.xPct).toBeLessThanOrEqual(100);
      expect(slot.yPct).toBeGreaterThanOrEqual(0);
      expect(slot.yPct).toBeLessThanOrEqual(100);
      expect(slot.sizePct).toBeGreaterThan(0);
      expect(slot.sizePct).toBeLessThanOrEqual(100);
    }
  });

  it('never assigns the same slotIndex twice', () => {
    const seen = new Set(SLOT_LAYOUT.map((slot) => slot.slotIndex));
    expect(seen.size).toBe(SLOT_LAYOUT.length);
  });

  it('never places two slots at the same spot', () => {
    const spots = new Set(SLOT_LAYOUT.map((slot) => `${slot.xPct},${slot.yPct}`));
    expect(spots.size).toBe(SLOT_LAYOUT.length);
  });

  // % 값을 손으로 고쳐서 피그마와 어긋나는 걸 막는 골든 테스트.
  it('round-trips back to the original Figma pixels', () => {
    expect(SLOT_LAYOUT).toHaveLength(FIGMA_TOP_LEFT_PX.length);

    SLOT_LAYOUT.forEach((slot, index) => {
      const [x, y] = FIGMA_TOP_LEFT_PX[index];
      const radius = FIGMA_DIAMETER_PX / 2;

      expect((slot.xPct / 100) * SOURCE_FRAME.width - radius).toBeCloseTo(x, 1);
      expect((slot.yPct / 100) * SOURCE_FRAME.height - radius).toBeCloseTo(y, 1);
      expect((slot.sizePct / 100) * SOURCE_FRAME.width).toBeCloseTo(FIGMA_DIAMETER_PX, 1);
    });
  });
});
