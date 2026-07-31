'use client';

import { useEffect, useRef } from 'react';

import { progressToTime } from '@/lib/scroll-math';

import { useScrollScene } from './scroll-scene';
import styles from './scrub-video.module.css';

/**
 * 스크롤 스크럽 영상 (STEP 15 / PRD §9.1).
 *
 * 하네스가 내보내는 진행률을 재생 위치로 옮긴다. 그게 전부다.
 *
 * ## lerp 를 여기서 다시 걸지 않는다
 *
 * 절대규칙 10 은 `currentTime` 을 lerp 로 접근하라고 한다. **하네스가 이미
 * 부드러워진 값만 내보내므로** 이 대입 자체가 lerp 접근이다. 여기서 한 번
 * 더 걸면 이중 감쇠라 스크롤을 멈춘 뒤에도 한참 따라온다.
 *
 * ## seek 를 합친다
 *
 * 진행률은 매 프레임 바뀐다. seek 가 아직 안 끝났는데 또 대입하면 큐가
 * 쌓여서 스크롤을 멈춘 뒤에도 영상이 계속 움직인다. 이 영상은 전 프레임이
 * 키프레임이라 seek 가 2.8ms(실측)지만, 느린 기기에서는 그렇지 않다.
 * **진행 중이면 최신 값만 남겨 뒀다가 `seeked` 에서 이어 간다.**
 */
export function ScrubVideo({
  src,
  poster,
  enabled = true,
}: {
  src: string;
  /** 영상의 **첫 프레임**. 마지막 프레임을 쓰면 로드 직후 화면이 튄다. */
  poster: string;
  /**
   * false 면 **영상을 내려받지 않는다** (STEP 19b). 포스터만 띄운 채 기다린다.
   *
   * 기기가 이미지 시퀀스를 쓸지 판단하는 건 마운트 뒤에만 가능한데, 그때까지
   * 영상을 받아 버리면 시퀀스로 갈아타도 이미 늦다 — reduce 에서 밟았던 것과
   * 똑같은 함정이다(STEP 15). 그래서 판단이 끝날 때까지 아예 안 받는다.
   */
  enabled?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { subscribe, reducedMotion } = useScrollScene();

  useEffect(() => {
    // reduce 면 영상을 아예 안 그린다 — 아래 렌더에서 null 이다.
    if (reducedMotion) return;
    // 아직 이 기기가 영상을 쓸지 모른다. 포스터만 띄우고 기다린다 (STEP 19b).
    if (!enabled) return;

    /*
     * ⚠️ 여기서 **한 번 더** 직접 읽는다. 중복이 아니라 다른 시점의 값이다.
     *
     * `useSyncExternalStore` 는 하이드레이션 중 **일부러 서버 값(false)** 을
     * 돌려준다 — 그래야 마크업이 어긋나지 않는다. 진짜 값으로 다시 그리는
     * 건 그다음이고, **이 effect 는 그 사이에 이미 한 번 돈다.**
     * 그래서 reduce 를 켰는데도 아래 `video.src` 가 실행돼 mp4 를 받았다
     * (실측 1건 → 이 검사를 넣고 0건). effect 시점의 matchMedia 만이
     * 지금 실제 상태다.
     */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const video = videoRef.current;
    if (!video) return;

    /*
     * ⚠️ `src` 를 마크업이 아니라 여기서 붙인다.
     *
     * 서버 렌더 시점에는 reduce 여부를 알 수 없어 `useReducedMotion` 이
     * false 를 준다. `src` 를 JSX 에 두면 그 HTML 이 그대로 나가고,
     * 브라우저는 파싱하면서 곧바로 영상을 받기 시작한다. 하이드레이션 뒤에
     * 엘리먼트를 지워도 **이미 늦다** — reduce 를 켠 사람에게 2.8MB 를
     * 떠넘기게 된다. 실제로 밟았고(reduce 인데 mp4 요청 1건) 이렇게 고쳤다.
     *
     * 포스터는 마크업에 남는다. 첫 페인트부터 첫 프레임이 보여야 배경
     * 스틸(마지막 프레임)이 잠깐 비치는 일이 없다.
     */
    video.src = src;

    let latest = 0;
    let pending = false;

    const flush = () => {
      if (!pending) return;
      // 아직 앞의 seek 가 안 끝났다. `seeked` 가 다시 부른다.
      if (video.seeking) return;
      // 메타데이터 전에는 duration 이 NaN 이다. `loadedmetadata` 가 다시 부른다.
      if (!Number.isFinite(video.duration) || video.duration <= 0) return;

      pending = false;
      const time = progressToTime(latest, video.duration);
      /*
       * 같은 프레임이면 건드리지 않는다. 어차피 화면은 그대로인데 seek 만
       * 새로 일으키는 꼴이라, 스크롤이 거의 멈춘 구간에서 특히 낭비다.
       */
      if (Math.abs(video.currentTime - time) < 1 / 48) return;
      video.currentTime = time;
    };

    const unsubscribe = subscribe((progress) => {
      latest = progress;
      pending = true;
      flush();
    });

    video.addEventListener('seeked', flush);
    video.addEventListener('loadedmetadata', flush);

    return () => {
      unsubscribe();
      video.removeEventListener('seeked', flush);
      video.removeEventListener('loadedmetadata', flush);
    };
  }, [src, enabled, subscribe, reducedMotion]);

  /*
   * reduce — 영상을 내려받지도 않는다 (PRD §9.4). 아래에 깔린 배경 스틸이
   * 곧 마지막 프레임이라 최종 상태가 즉시 보인다.
   */
  if (reducedMotion) return null;

  return (
    <video
      ref={videoRef}
      className={styles.video}
      /* src 는 마크업에 두지 않는다 — 위 effect 의 주석 참고. */
      poster={poster}
      /* PRD §9.1 필수 속성. muted·playsinline 이라야 모바일이 인라인으로 그린다. */
      muted
      playsInline
      preload="auto"
      /* 배경이다. 재생 컨트롤도, 읽어 줄 내용도 없다. */
      aria-hidden="true"
      data-testid="scrub-video"
    />
  );
}
