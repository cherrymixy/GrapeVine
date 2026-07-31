import { REVEAL_CLASS, revealStyle } from './reveal';
import styles from './scroll-cue.module.css';
import type { ScrollCue as Cue } from '@/data';

/**
 * 스크롤 유도 (STEP 21).
 *
 * 첫 화면은 넝쿨이 아직 안 자란 **빈 화면**이라, 스크롤해야 무언가 일어난다는
 * 신호가 하나도 없었다. 타이틀조차 진행률 0.82 부터 나타난다.
 *
 * 조금만 굴리면 사라진다 — 역할을 다했는데 계속 떠 있으면 잔소리다.
 * 구간은 `from > to` 로 준다. `.reveal` 은 `(p - from) / (to - from)` 이라
 * 뒤집으면 그대로 **사라지는** 계산이 된다 (새 CSS 가 필요 없다).
 */
export function ScrollCue({ cue }: { cue: Cue }) {
  return (
    <div
      className={`${styles.cue} ${REVEAL_CLASS}`}
      style={revealStyle(cue)}
      /* 스크롤할 수 있다는 건 브라우저가 이미 알린다. 눈으로 보는 신호일 뿐. */
      aria-hidden="true"
      data-testid="scroll-cue"
    >
      <span className={styles.chevron} />
    </div>
  );
}
