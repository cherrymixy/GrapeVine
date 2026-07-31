'use client';

import { useEffect, useState } from 'react';

import { IMAGE_SEQUENCE } from '@/data';
import { prefersImageSequence } from '@/lib/motion-mode';

import { ScrubSequence } from './scrub-sequence';
import { ScrubVideo } from './scrub-video';

/**
 * Main 배경을 영상으로 그릴지 이미지 시퀀스로 그릴지 고른다 (STEP 19b).
 *
 * **둘 중 하나만 내려받는다.** 판단은 마운트 뒤에만 가능하므로(서버는 기기를
 * 모른다) 그때까지는 `ScrubVideo` 가 포스터만 띄운 채 기다린다 — `src` 를
 * effect 에서 붙이도록 해 둔 STEP 15 의 구조가 그대로 값을 한다.
 */
export function ScrubBackdrop({ src, poster }: { src: string; poster: string }) {
  /** null = 아직 모름(서버·하이드레이션 직후). 그동안 영상은 src 를 안 붙인다. */
  const [useSequence, setUseSequence] = useState<boolean | null>(null);

  useEffect(() => {
    setUseSequence(prefersImageSequence());
  }, []);

  if (useSequence === true) {
    return (
      <ScrubSequence
        dir={IMAGE_SEQUENCE.main.dir}
        frames={IMAGE_SEQUENCE.main.frames}
        stride={IMAGE_SEQUENCE.main.coarseStride}
      />
    );
  }

  // false(영상) 또는 아직 모름(null) — 포스터는 어느 쪽이든 같은 첫 프레임이다.
  return <ScrubVideo src={src} poster={poster} enabled={useSequence === false} />;
}
