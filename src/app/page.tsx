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

/** 헤드라인 마지막 낱말에 선택 하이라이트가 걸린다 (201:653 — "vine"). */
function splitTrailingWord(text: string): [string, string] {
  const at = text.trimEnd().lastIndexOf(' ');
  if (at < 0) return ['', text];
  return [text.slice(0, at + 1), text.slice(at + 1)];
}

/** 프레임(1536×771) 대비 %. Figma 201:658 / 659 / 660. */
const GRAPES: readonly DecorGrape[] = [
  { x: 68.066, y: 69.585, size: 10.612 }, // 964, 455
  { x: 52.376, y: 48.443, size: 10.612 }, // 723, 292
  { x: 32.585, y: 83.852, size: 10.612 }, // 419, 565
];

export default function MainPage() {
  const [lead, highlighted] = splitTrailingWord(copy.main.title);

  return (
    <Screen background="/images/main_2.png" tone="light" priority>
      <DecorGrapes grapes={GRAPES} />
      <Sidebar variant="guest" />

      <h1 className={styles.title}>
        {lead}
        <span className={`${styles.selected} ${styles.caretDots}`}>{highlighted}</span>
      </h1>

      <p className={styles.subtitle}>
        {copy.main.subtitleLines.map((line) => (
          <span key={line} className={styles.subtitleLine}>
            {line}
          </span>
        ))}
      </p>
    </Screen>
  );
}
