import type { CSSProperties } from 'react';

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
}: {
  view: PageView;
  /** 채워진 알을 눌렀을 때 갈 곳. 없으면 읽기 전용. */
  slotHref?: (slotIndex: number) => string;
}) {
  return (
    <div className={styles.board} data-testid="board">
      {view.slots.map((slot) => {
        const layout = SLOT_LAYOUT[slot.slotIndex];
        // 좌표가 없는 슬롯은 그리지 않는다 — 임의의 자리에 던져 놓으면
        // 화면은 채워지지만 틀린 배치가 남는다.
        if (!layout) return null;

        const filled = slot.grape !== null;
        const className = `${styles.slot} ${filled ? styles.filled : styles.empty}`;
        const style = {
          // xPct/yPct 는 알의 **중심**이라 절반만큼 되민다.
          '--x': `${layout.xPct}%`,
          '--y': `${layout.yPct}%`,
          '--size': `${layout.sizePct}%`,
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
          />
        );
      })}
    </div>
  );
}
