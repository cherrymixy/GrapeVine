import type { ReactNode } from 'react';

import { copy } from '@/data';

import { Panel } from './panel';
import styles from './modal.module.css';

/**
 * 딤 오버레이 + 원형 패널 (PRD §5.0 — 피그마에서 `Rectangle 26` 이 깔린 프레임).
 *
 * 모달 4종이 이 구조를 공유하고, 패널은 Login 과 같은 `Panel` 이다.
 *
 * 열림/닫힘은 URL 이 갖는다 — `closeHref` 로 돌아가는 링크가 곧 닫기다.
 * 딤 자체가 그 링크라 바깥을 누르면 닫힌다. 클라이언트 상태가 없어 JS 없이
 * 동작하고 뒤로가기도 자연스럽게 맞는다.
 */
export function Modal({
  title,
  titleTop,
  closeHref,
  testId,
  children,
}: {
  title: string;
  titleTop?: number;
  closeHref: string;
  testId: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.modal} data-testid={testId} data-modal="">
      <a className={styles.dim} href={closeHref} aria-label={copy.shell.close} />

      <div className={styles.panel} role="dialog" aria-modal="true" aria-label={title}>
        <Panel title={title} titleTop={titleTop}>
          {children}
        </Panel>
      </div>
    </div>
  );
}
