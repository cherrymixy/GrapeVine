'use client';

import { useEffect, useRef } from 'react';

import { clamp01 } from '@/lib/scroll-math';

import { useScrollScene } from './scroll-scene';
import styles from './scrub-sequence.module.css';

/**
 * 이미지 시퀀스 스크럽 (STEP 19b / PRD §9.1).
 *
 * 모바일에서 영상 대신 쓴다. `<canvas>` 에 프레임을 그리는 것뿐이라
 * `currentTime` seek 이 없다 — iOS 에서 스크러빙이 불안정할 여지 자체가 없다.
 *
 * ## 프리로드: 듬성듬성 먼저, 그다음 채우기
 *
 * 121장을 다 기다리면 그동안 아무것도 못 한다. `stride` 간격으로 먼저 받아
 * (8이면 16장 ≈ 160KB) **스크럽이 즉시 돌게** 하고, 나머지는 뒤따라오며
 * 촘촘해진다. 아직 없는 프레임 자리는 **가장 가까운 받은 프레임**을 그린다 —
 * 처음엔 뚝뚝 끊기다가 매끄러워진다. 빈 화면보다 낫다.
 *
 * ## `ImageBitmap` 을 쓰지 않는다
 *
 * 121장을 전부 디코드해 들고 있으면 720×362×4바이트 × 121 ≈ **126MB** 다.
 * 폰에서 이건 위험하다. `<img>` 로 두고 디코드 캐시는 브라우저에 맡긴다.
 */
export function ScrubSequence({
  dir,
  frames,
  stride,
}: {
  /** 프레임 파일이 있는 경로. 파일명은 `000.webp` 형식. */
  dir: string;
  frames: number;
  /** 처음에 건너뛰며 받을 간격. */
  stride: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { subscribe, reducedMotion } = useScrollScene();

  useEffect(() => {
    /*
     * ⚠️ reduce 면 **한 장도 받지 않는다** (PRD §9.4).
     *
     * STEP 15 에서 영상으로 똑같은 걸 밟았다: 화면에서 안 보이게만 해 두고
     * (CSS `display:none`) 내려받기는 그대로 두면, reduce 를 켠 사람에게
     * 1.22MB 를 떠넘긴다. 실제로 이번에도 121장을 받고 있었다 —
     * **요청 수를 세지 않았으면 "안 보이니 됐다"로 넘어갔을 결함이다.**
     *
     * `useScrollScene().reducedMotion` 만 믿지 않고 여기서 직접 읽는 이유도
     * STEP 15 와 같다: `useSyncExternalStore` 는 하이드레이션 중 서버 값을
     * 돌려주고, 이 effect 는 그 사이에 이미 한 번 돈다.
     */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const images: (HTMLImageElement | null)[] = new Array(frames).fill(null);
    let disposed = false;
    let lastDrawn = -1;
    /** 마지막으로 요청받은 프레임. 이미지가 늦게 도착해도 여기로 다시 그린다. */
    let wanted = 0;

    const digits = String(frames - 1).length;
    const src = (index: number) => `${dir}/${String(index).padStart(digits, '0')}.webp`;

    /** `index` 에 가장 가까운, **이미 받은** 프레임을 찾는다. */
    const nearestLoaded = (index: number): number => {
      if (images[index]) return index;
      for (let offset = 1; offset < frames; offset += 1) {
        if (images[index - offset]) return index - offset;
        if (images[index + offset]) return index + offset;
      }
      return -1;
    };

    const draw = () => {
      if (disposed) return;
      const found = nearestLoaded(wanted);
      if (found < 0 || found === lastDrawn) return;

      const image = images[found];
      if (!image) return;

      /*
       * 캔버스 픽셀 크기를 프레임에 맞춘다. CSS 가 `object-fit: cover` 로
       * 늘리므로 여기서는 원본 비율 그대로 한 장을 통째로 그린다.
       */
      if (canvas.width !== image.naturalWidth) {
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
      }
      context.drawImage(image, 0, 0);
      lastDrawn = found;
    };

    const load = (index: number) => {
      if (images[index]) return;
      const image = new Image();
      image.decoding = 'async';
      image.src = src(index);
      image.onload = () => {
        if (disposed) return;
        images[index] = image;
        // 방금 온 게 지금 필요한 것보다 가까우면 다시 그린다.
        draw();
      };
    };

    /*
     * 첫 프레임은 무조건 먼저. 스크롤을 안 건드려도 화면에 뭔가 있어야 한다.
     * 그다음 듬성듬성, 그다음 전부.
     */
    load(0);
    for (let i = 0; i < frames; i += stride) load(i);
    const fillRest = window.setTimeout(() => {
      for (let i = 0; i < frames; i += 1) load(i);
    }, 0);

    const unsubscribe = subscribe((progress) => {
      const index = Math.round(clamp01(progress) * (frames - 1));
      if (index === wanted) return;
      wanted = index;
      draw();
    });

    return () => {
      disposed = true;
      window.clearTimeout(fillRest);
      unsubscribe();
    };
  }, [dir, frames, stride, subscribe, reducedMotion]);

  // reduce — 배경 스틸이 곧 마지막 프레임이다. 캔버스 자체가 필요 없다.
  if (reducedMotion) return null;

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" data-testid="scrub-sequence" />;
}
