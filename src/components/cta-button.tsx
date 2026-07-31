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
  testId,
  children,
}: {
  variant?: 'filled' | 'inverted';
  centered?: boolean;
  disabled?: boolean;
  /** 주면 링크, 없으면 submit 버튼. */
  href?: string;
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
      type={href ? 'button' : 'submit'}
      disabled={disabled}
      data-testid={testId}
      data-kind={variant}
    >
      {children}
    </button>
  );
}
