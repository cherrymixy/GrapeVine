'use client';

import { useEffect } from 'react';

import { GRAPE_DROP } from '@/data';

/**
 * 낙하가 끝나면 `?dropped=` 을 주소에서 지운다 (STEP 18).
 *
 * 이 파라미터는 **한 번 떨어뜨리라는 신호**지 화면 상태가 아니다. 남겨 두면
 * 두 가지가 어긋난다.
 *
 * 1. 방문자가 주소를 복사해 가면 남의 알 번호가 따라간다.
 * 2. 새로고침할 때마다 같은 알이 다시 떨어진다.
 *
 * `history.replaceState` 라 서버 왕복도, 히스토리 항목도 늘지 않는다.
 * JS 가 없으면 지워지지 않지만, JS 가 없으면 애니메이션도 한 번 그려지고
 * 끝이라 이상해 보이지 않는다.
 */
export function DropCleanup() {
  useEffect(() => {
    const timer = setTimeout(() => {
      /*
       * 주소를 **지금** 읽는다. effect 가 걸린 시점의 주소를 붙들고 있으면,
       * 그 사이 방문자가 모달을 열거나 페이지를 넘겼을 때 옛 주소로 되돌린다.
       */
      const url = new URL(window.location.href);
      if (!url.searchParams.has('dropped')) return;
      url.searchParams.delete('dropped');
      window.history.replaceState(null, '', `${url.pathname}${url.search}`);
    }, GRAPE_DROP.durationMs + 100);

    return () => clearTimeout(timer);
  }, []);

  return null;
}
