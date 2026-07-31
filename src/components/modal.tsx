import type { ReactNode } from 'react';

import { copy } from '@/data';

/**
 * 딤 오버레이 + 패널 (PRD §5.0 — 피그마에서 `Rectangle 26` 이 깔린 프레임).
 *
 * 모든 모달이 이 구조를 공유한다. 회색박스라 딤도 패널도 아직 시각 효과가
 * 없지만, 마크업 구조를 여기서 한 번 고정해 두면 STEP 12~13 에서 스타일만
 * 붙이면 된다.
 *
 * 열림/닫힘은 URL 이 갖는다 — `closeHref` 로 돌아가는 링크가 곧 닫기 버튼이다.
 * 클라이언트 상태가 없어 JS 없이 동작하고 뒤로가기도 자연스럽게 맞는다.
 */
export function Modal({
  title,
  closeHref,
  testId,
  children,
}: {
  title: string;
  closeHref: string;
  testId: string;
  children: ReactNode;
}) {
  return (
    <div data-testid={testId} data-modal="">
      {/* 딤 오버레이. 클릭하면 닫힌다. */}
      <a data-modal-dim="" href={closeHref} aria-label={copy.shell.close} />

      <div data-modal-panel="" role="dialog" aria-modal="true" aria-label={title}>
        <h2>{title}</h2>
        {children}
        <a data-modal-close="" href={closeHref}>
          {copy.shell.close}
        </a>
      </div>
    </div>
  );
}
