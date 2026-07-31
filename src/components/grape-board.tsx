import type { CSSProperties } from 'react';

import { GRAPE_DROP } from '@/data/scroll-cues';
import { SLOT_LAYOUT } from '@/data/slot-layout';
import type { PageView } from '@/models';

import styles from './grape-board.module.css';

/**
 * 포도판 — 알을 고정 좌표에 절대배치한다 (Figma 201:753).
 *
 * 좌표·지름은 전부 `data/slot-layout.ts` 에서 온다 (절대규칙 5 — px 하드코딩
 * 금지). 이 파일이 정하는 숫자는 없다.
 */
export function GrapeBoard({
  view,
  slotHref,
  dropSlot = null,
}: {
  view: PageView;
  /** 채워진 알을 눌렀을 때 갈 곳. 없으면 읽기 전용. */
  slotHref?: (slotIndex: number) => string;
  /**
   * 방금 붙은 알의 슬롯 번호. 이 알만 위에서 떨어진다 (STEP 18 / PRD §9.3).
   * 서버가 `?dropped=` 로 알려 준다 — 어느 슬롯이 배정됐는지는 서버만 안다.
   */
  dropSlot?: number | null;
}) {
  return (
    <div className={styles.board} data-testid="board">
      {view.slots.map((slot) => {
        const layout = SLOT_LAYOUT[slot.slotIndex];
        // 좌표가 없는 슬롯은 그리지 않는다 — 임의의 자리에 던져 놓으면
        // 화면은 채워지지만 틀린 배치가 남는다.
        if (!layout) return null;

        const filled = slot.grape !== null;
        // 빈 칸이 떨어질 일은 없다. `?dropped=` 가 조작돼도 마찬가지다.
        const dropping = filled && slot.slotIndex === dropSlot;
        const className = [styles.slot, filled ? styles.filled : styles.empty, dropping ? styles.dropping : '']
          .filter(Boolean)
          .join(' ');
        const style = {
          // xPct/yPct 는 알의 **중심**이라 절반만큼 되민다.
          '--x': `${layout.xPct}%`,
          '--y': `${layout.yPct}%`,
          '--size': `${layout.sizePct}%`,
          ...(dropping
            ? {
                '--drop-duration': `${GRAPE_DROP.durationMs}ms`,
                '--drop-from': `${GRAPE_DROP.fromDiameters * 100}%`,
              }
            : null),
        } as CSSProperties;

        if (filled && slotHref) {
          return (
            <a
              key={slot.slotIndex}
              className={className}
              style={style}
              href={slotHref(slot.slotIndex)}
              data-slot={slot.slotIndex}
              data-filled="true"
              data-dropping={dropping ? '' : undefined}
            />
          );
        }

        return (
          <span
            key={slot.slotIndex}
            className={className}
            style={style}
            data-slot={slot.slotIndex}
            data-filled={filled}
            data-dropping={dropping ? '' : undefined}
          />
        );
      })}
    </div>
  );
}
