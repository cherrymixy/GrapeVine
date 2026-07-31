import type { ReactNode } from 'react';

import styles from './cta-button.module.css';

/**
 * 큰 사각 CTA (Figma 201:751 / 201:789 / 201:898).
 *
 * pill 과는 다른 규칙이다 — 각지고 보더가 없다.
 * `filled` 는 마젠타 바탕(Create My Vine), `inverted` 는 밝은 바탕에 마젠타
 * 글자(Add Grape / Here is Full!)다.
 */
export function CtaButton({
  variant = 'filled',
  centered = false,
  disabled = false,
  href,
  onClick,
  testId,
  children,
}: {
  /**
   * `filled` 마젠타 바탕(Create My Vine) / `inverted` 밝은 바탕(Add Grape) /
   * `full` 밝은 바탕에 큰 글자(Here is Full!).
   */
  variant?: 'filled' | 'inverted' | 'full';
  centered?: boolean;
  disabled?: boolean;
  /** 주면 링크, 없으면 submit 버튼. */
  href?: string;
  /**
   * 누를 때 할 일. **클라이언트 컴포넌트에서만** 넘길 수 있다 —
   * 서버 컴포넌트가 함수를 넘기면 빌드가 막는다(그게 맞다).
   * 오류 화면의 "다시 시도"가 이걸 쓴다 (STEP 20).
   */
  onClick?: () => void;
  testId?: string;
  children: ReactNode;
}) {
  const className = [styles.cta, styles[variant], centered ? styles.centered : '']
    .filter(Boolean)
    .join(' ');

  if (href && !disabled) {
    return (
      <a className={className} href={href} data-testid={testId} data-kind={variant}>
        {children}
      </a>
    );
  }

  return (
    <button
      className={className}
      type={href || onClick ? 'button' : 'submit'}
      disabled={disabled}
      onClick={onClick}
      data-testid={testId}
      data-kind={variant}
    >
      {children}
    </button>
  );
}
