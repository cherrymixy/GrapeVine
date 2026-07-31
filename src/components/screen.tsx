import Image from 'next/image';
import type { ReactNode } from 'react';

import styles from './screen.module.css';

/**
 * 화면 셸 (Figma 프레임 1536×771 → 뷰포트 전체).
 *
 * `tone` 은 배경 사진의 밝기에 따라 글자·보더 색을 가른다. Main 계열은 밝은
 * 사진이라 검정, 판 계열은 어두운 사진이라 흰색이다. 같은 pill 컴포넌트가
 * 두 화면에서 다른 색으로 그려지는 이유다.
 */
export function Screen({
  background,
  tone,
  priority = false,
  children,
}: {
  background: string;
  tone: 'light' | 'dark';
  /** 첫 화면의 배경만 true. 나머지는 lazy. */
  priority?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={styles.screen} data-tone={tone}>
      <Image
        className={styles.background}
        src={background}
        alt=""
        fill
        priority={priority}
        sizes="100vw"
      />
      <div className={styles.content}>{children}</div>
    </div>
  );
}
