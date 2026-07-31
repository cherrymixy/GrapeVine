import type { ReactNode } from 'react';

import styles from './panel.module.css';

/**
 * 원형 패널 (PRD §5.0 "딤 오버레이 + 대형 원형 패널" / Figma 201:730).
 *
 * Login·Sign Up 은 화면 한가운데 그대로 놓고, 모달 4종은 딤 위에 같은 원을
 * 얹는다. 원 하나를 두 쓰임이 공유하도록 `centered` 로만 가른다.
 */
export function Panel({
  title,
  centered = false,
  testId,
  children,
}: {
  title: string;
  /** 화면 한가운데 절대배치할지 (Login·Sign Up). 모달은 딤이 가운데를 잡는다. */
  centered?: boolean;
  testId?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`${styles.panel} ${centered ? styles.centered : ''}`}
      data-testid={testId}
    >
      <h1 className={styles.title}>{title}</h1>
      {children}
    </div>
  );
}
