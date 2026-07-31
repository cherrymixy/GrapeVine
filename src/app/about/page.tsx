import { BackLink } from '@/components/back-link';
import type { DecorGrape } from '@/components/decor-grapes';
import { FloatingGrapes } from '@/components/floating-grapes';
import { Screen } from '@/components/screen';
import { Sidebar } from '@/components/sidebar';
import { copy } from '@/data';

import styles from './page.module.css';

/**
 * About — Figma 201:667 번역.
 *
 * 헤드라인은 About 이라는 낱말이 아니라 **태그라인**이다(201:681).
 * 그 오른쪽에 작은 장식 문구 `is...`(201:680)가 붙는다.
 */

/** 프레임(1536×771) 대비 %. Figma 201:671 / 670 / 669 / 668. */
const GRAPES: readonly DecorGrape[] = [
  { x: 54.134, y: 38.976, size: 10.612 }, // 750, 219
  { x: 68.392, y: 54.929, size: 10.612 }, // 969, 342
  { x: 92.415, y: 65.434, size: 10.612 }, // 1338, 423
  { x: 49.316, y: 81.388, size: 10.612 }, // 676, 546
];

export default function AboutPage() {
  return (
    <Screen tone="light">
      {/*
        About 의 포도알은 떠다니고 마우스를 피한다 (승아님 지시).
        공용 DecorGrapes 는 그대로 둔다 — 다른 세 화면까지 떠다닐 이유가 없다.
      */}
      <FloatingGrapes grapes={GRAPES} />
      <Sidebar variant="guest" current="/about" />

      <BackLink href="/" />

      <h1 className={styles.title}>
        {copy.about.title}
        <span className={styles.note}>{copy.about.note}</span>
      </h1>

      <p className={styles.body}>
        {copy.about.bodyLines.map((line) => (
          <span key={line} className={styles.bodyLine}>
            {line}
          </span>
        ))}
      </p>
    </Screen>
  );
}
