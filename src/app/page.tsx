import { DecorGrapes, type DecorGrape } from '@/components/decor-grapes';
import { Screen } from '@/components/screen';
import { Sidebar } from '@/components/sidebar';
import { copy } from '@/data';

import styles from './page.module.css';

/**
 * Main — Figma 201:645 번역.
 *
 * 스크롤 스크럽 영상·오버레이 시퀀스·진행률 인디케이터는 연출 패스
 * (STEP 14~16)에서 이 위에 얹힌다. 여기서는 마지막 프레임 상태만 세운다.
 */

/**
 * 헤드라인 마지막 낱말에 선택 하이라이트가 걸린다 (201:653 — "vine").
 *
 * 마침표는 하이라이트 밖에 둔다. Figma 의 타이틀에는 마침표가 없는데
 * `copy.ts` 의 태그라인에는 있고, data/ 는 이번 범위가 아니라 못 고친다.
 * 문장부호까지 감싸면 상자가 한 글자만큼 길어져 시안과 어긋난다.
 */
function splitHighlight(text: string): [string, string, string] {
  const match = /^(.*\s)([^\s]*?)([.!?]*)$/.exec(text.trimEnd());
  if (!match) return ['', text, ''];
  return [match[1], match[2], match[3]];
}

/**
 * 서브카피는 Figma 에서 문장 단위 두 줄이다 (201:655).
 * `copy.ts` 는 한 문장으로 갖고 있고 data/ 는 이번 범위가 아니라 못 고치므로,
 * 문장 경계로 끊어 같은 모양을 만든다.
 */
function splitSentences(text: string): string[] {
  return text.split(/(?<=\.)\s+/);
}

/** 프레임(1536×771) 대비 %. Figma 201:658 / 659 / 660. */
const GRAPES: readonly DecorGrape[] = [
  { x: 68.066, y: 69.585, size: 10.612 }, // 964, 455
  { x: 52.376, y: 48.443, size: 10.612 }, // 723, 292
  { x: 32.585, y: 83.852, size: 10.612 }, // 419, 565
];

export default function MainPage() {
  const [lead, highlighted, punctuation] = splitHighlight(copy.main.title);

  return (
    <Screen background="/images/main_2.png" tone="light" priority>
      <DecorGrapes grapes={GRAPES} />
      <Sidebar variant="guest" />

      <h1 className={styles.title}>
        {lead}
        <span className={`${styles.selected} ${styles.caretDots}`}>{highlighted}</span>
        {punctuation}
      </h1>

      <p className={styles.subtitle}>
        {splitSentences(copy.main.subtitle).map((line) => (
          <span key={line} className={styles.subtitleLine}>
            {line}
          </span>
        ))}
      </p>
    </Screen>
  );
}
