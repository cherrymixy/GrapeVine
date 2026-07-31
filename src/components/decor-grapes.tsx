import type { ScrollCue } from '@/data';

import styles from './decor-grapes.module.css';
import { REVEAL_CLASS, revealStyle } from './reveal';

/** 프레임(1536×771) 대비 중심 좌표와 지름. 전부 % 다. */
export type DecorGrape = {
  /** 중심 x — 프레임 폭 대비 % */
  x: number;
  /** 중심 y — 프레임 높이 대비 % */
  y: number;
  /** 지름 — 프레임 폭 대비 % */
  size: number;
};

/**
 * 배경에 흩어진 장식 포도알.
 *
 * 판의 슬롯과는 무관하다 — 슬롯 좌표는 `data/slot-layout.ts` 가 갖고 있고
 * 이건 화면별 장식이라 각 페이지가 좌표를 넘긴다.
 *
 * 텍스트보다 **뒤에** 깔린다 (Figma 레이어 순서). About 은 포도알이 헤드라인과
 * 겹치는데, 글자가 위에 와야 시안과 같다.
 */
/**
 * `grape` 는 포도알 색(Main·About), `panel` 은 패널과 같은 옅은 면
 * (Login·Sign Up — 바탕 위에 거의 안 보일 만큼 옅게 얹힌다).
 */
export type DecorTone = 'grape' | 'panel';

export function DecorGrapes({
  grapes,
  tone = 'grape',
  reveal,
}: {
  grapes: readonly DecorGrape[];
  tone?: DecorTone;
  /**
   * 스크롤 구간에 맞춰 하나씩 드러낼 때만 넘긴다 (Main — PRD §5.1).
   * `grapes` 와 **같은 순서**로 짝지어진다. 없으면 그냥 다 보인다 —
   * About·Login·Sign Up 은 스크롤 씬이 아니다.
   */
  reveal?: readonly ScrollCue[];
}) {
  return (
    <>
      {grapes.map((grape, index) => {
        const cue = reveal?.[index];
        return (
          <span
            key={`${grape.x}-${grape.y}`}
            className={cue ? `${styles.grape} ${REVEAL_CLASS}` : styles.grape}
            data-tone={tone}
            style={{
              left: `${grape.x}%`,
              top: `${grape.y}%`,
              width: `${grape.size}%`,
              aspectRatio: '1 / 1',
              ...(cue ? revealStyle(cue) : null),
            }}
            aria-hidden="true"
          />
        );
      })}
    </>
  );
}
