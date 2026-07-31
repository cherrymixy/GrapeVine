import type { CSSProperties } from 'react';

import type { ScrollCue } from '@/data';

/**
 * 구간을 CSS 변수로 옮긴다 — `globals.css` 의 `.reveal` 이 읽는다 (STEP 16).
 *
 * 감춤·드러냄은 **전부 CSS** 다. 하네스가 씬에 얹은 `--scroll-progress` 를
 * 그대로 읽어 계산하므로 JS 도, 리렌더도, 클라이언트 컴포넌트도 필요 없다.
 * 그래서 이걸 쓰는 화면은 서버 컴포넌트로 남는다.
 */
export function revealStyle(cue: ScrollCue): CSSProperties {
  return { '--cue-from': cue.from, '--cue-to': cue.to } as CSSProperties;
}

/** `.reveal` 은 전역 클래스라 CSS 모듈 클래스와 함께 붙인다. */
export const REVEAL_CLASS = 'reveal';
