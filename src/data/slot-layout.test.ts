import { describe, expect, it } from 'vitest';

import { PAGE_CAPACITY, SLOT_LAYOUT } from '@/data/slot-layout';

describe('slot-layout', () => {
  // 좌표를 채우기 전까지는 배열이 비어 있어 아래 구조 검사가 공허하게 통과한다.
  // 이 todo 가 "아직 안 끝났다"는 유일한 표시다. 값을 채우면 it 으로 바꾼다.
  it.todo(`has exactly ${PAGE_CAPACITY} entries — 피그마 좌표 수령 후 활성화`);

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
});
