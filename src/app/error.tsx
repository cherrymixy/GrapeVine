'use client';

import { useEffect } from 'react';

import { CtaButton } from '@/components/cta-button';
import { Screen } from '@/components/screen';
import { copy } from '@/data';

import styles from './status.module.css';

/**
 * 서버가 넘어졌을 때 (STEP 20).
 *
 * 이게 없으면 Next 기본 오류 화면이 나오고, 프로덕션에서는 아무 설명 없는
 * 흰 화면에 가깝다. Supabase 가 잠깐 응답하지 않는 것만으로도 방문자가
 * 이걸 본다.
 *
 * **무엇이 잘못됐는지는 보여 주지 않는다.** 사용자가 고칠 수 있는 게 없고,
 * 내부 사정(테이블 이름·제약 이름)을 흘릴 이유도 없다. 대신 다시 시도할
 * 길을 준다 — `reset()` 은 이 구간만 다시 렌더한다.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 서버 로그로 흘러가는 digest 와 짝지을 수 있게 콘솔에도 남긴다.
    console.error('unhandled error', error.digest ?? '', error);
  }, [error]);

  return (
    <Screen tone="light">
      <div className={styles.center}>
        <h1 className={styles.title}>{copy.crashed.title}</h1>
        <p className={styles.body}>{copy.crashed.body}</p>
        <CtaButton testId="error-retry" onClick={reset}>
          {copy.crashed.retry}
        </CtaButton>
      </div>
    </Screen>
  );
}
