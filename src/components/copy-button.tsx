'use client';

import { useState } from 'react';

import { copy } from '@/data';
import { copyToClipboard } from '@/services/share';

import styles from './copy-button.module.css';

/**
 * Share My Vine 의 Copy 버튼 (Figma 201:814).
 *
 * 클립보드 API 는 보안 컨텍스트(https 또는 localhost)에서만 존재한다.
 * 실패를 성공처럼 보이지 않게 상태를 나눠 둔다 — 링크를 못 받은 걸
 * 모르고 넘어가면 판이 영영 안 채워진다.
 */
export function CopyButton({ value }: { value: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  return (
    <button
      className={styles.copy}
      type="button"
      data-testid="copy"
      data-state={state}
      onClick={async () => {
        setState((await copyToClipboard(value)) ? 'copied' : 'failed');
      }}
    >
      {copy.share.copy}
    </button>
  );
}
