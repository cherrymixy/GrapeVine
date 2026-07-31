'use client';

import { useState } from 'react';

import { copy } from '@/data';
import { copyToClipboard } from '@/services/share';

/**
 * 회색박스 (작업규칙 5). 비주얼은 STEP 10 이후.
 *
 * 클립보드 API 는 보안 컨텍스트에서만 존재하므로 실패할 수 있다.
 * 실패를 성공처럼 보이지 않게 상태를 나눠 둔다 — 링크를 못 받은 걸
 * 모르고 넘어가면 판이 영영 안 채워진다.
 */
export function CopyButton({ value }: { value: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  return (
    <button
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
