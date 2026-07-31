'use client';

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';

import { IMAGE_SEQUENCE, MY_VINE_REVEAL } from '@/data';

import styles from './create-vine-reveal.module.css';

/**
 * 판 생성 리빌 (STEP 17 / PRD §9.2).
 *
 * `Create My Vine` 을 누르면 넝쿨이 **스톱모션처럼 뚝뚝 끊기며** 드러나고,
 * 끝나면 그때 폼이 전송돼 빈 포도판으로 넘어간다.
 *
 * ## 영상을 쓰지 않는다 (STEP 20 에서 바꿈)
 *
 * 원래는 `myvine.mp4`(7.8MB)를 `currentTime` 으로 양자화해 돌렸다. 그런데
 * 이 연출은 **이산 10단계**라 화면에 나오는 그림이 11장뿐이다
 * (`floor(t*10)/10` → 0, 0.1 … 1.0). 121프레임짜리 영상을 받아 그중 11장만
 * 보여 주고 있었던 셈이다.
 *
 * 같은 11장을 이미지로 두면 **0.84MB** 다 — 9배 작고, 화질은 같은 1440폭이며,
 * seek 이 없으니 기기와 무관하게 정확히 같은 계단이 나온다.
 * 그래서 절대규칙 10(`currentTime` 은 lerp 로만)과 부딪힐 일도 사라졌다.
 *
 * ## 폼을 가로채는 방식
 *
 * 전송을 **막는 게 아니라 미룬다.** 리빌이 끝나면 `form.submit()` 으로
 * 네이티브 전송을 그대로 태운다 — 서버 리다이렉트도, 에러 처리도 지금과
 * 똑같이 동작한다. fetch 로 바꾸면 그 경로를 전부 새로 만들어야 한다.
 *
 * JS 가 없으면 `onSubmit` 이 안 걸리니 **지금 그대로 즉시 전송**된다.
 * reduce 도 마찬가지로 즉시 전송한다 (PRD §9.4).
 */
export function CreateVineReveal({
  action,
  children,
}: {
  /** 폼이 보낼 곳. 로직은 그대로 두고 연출만 얹는다. */
  action: string;
  /** CTA 버튼. */
  children: ReactNode;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [revealing, setRevealing] = useState(false);
  /** 이미 한 번 눌렀다. 두 번 눌러 판이 두 개 생기는 일은 없다. */
  const startedRef = useRef(false);
  /** 미리 받아 둔 11장. null 이면 아직(또는 reduce 라서 안 받음). */
  const framesRef = useRef<HTMLImageElement[] | null>(null);
  /** 도는 중인 rAF. 언마운트 때 끊는다. */
  const frameRef = useRef(0);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  useEffect(() => {
    /*
     * ⚠️ reduce 면 한 장도 받지 않는다 (PRD §9.4).
     *
     * `matchMedia` 를 effect 시점에 **직접** 읽는다. 서버는 reduce 여부를
     * 알 수 없고, 하이드레이션 중에는 리액트가 일부러 서버 값을 돌려주므로
     * 그 값을 믿으면 이 effect 가 한 번 먼저 돌아 버린다 (STEP 15·19b 에서
     * 두 번 밟았다 — 화면에서 안 보이게만 하고 내려받기는 그대로 뒀다).
     */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    /*
     * 미리 받아 둔다. 이 화면에서 할 수 있는 일은 이 버튼 하나뿐이라 거의
     * 확실히 필요해진다. 누른 뒤에 받기 시작하면 빈 화면으로 기다리게 된다.
     */
    const { dir, frames } = IMAGE_SEQUENCE.reveal;
    framesRef.current = Array.from({ length: frames }, (_, step) => {
      const image = new Image();
      image.decoding = 'async';
      image.src = `${dir}/${String(step).padStart(2, '0')}.webp`;
      return image;
    });
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // 두 번째 클릭은 무시. 판이 두 개 생기는 일은 없다.
    if (startedRef.current) {
      event.preventDefault();
      return;
    }

    const form = event.currentTarget;
    const surface = imageRef.current;
    const sequence = framesRef.current;

    // reduce 이거나(=미리 안 받음) 아직 준비 전이면 연출 없이 즉시 (PRD §9.4).
    if (!surface || !sequence) return;

    event.preventDefault();
    startedRef.current = true;
    setRevealing(true);

    const start = performance.now();
    let shown = -1;

    const tick = (now: number) => {
      const t = Math.min((now - start) / MY_VINE_REVEAL.durationMs, 1);
      /*
       * PRD §9.2 의 계단 함수. `t` 는 매끄럽게 흐르지만 보여 주는 그림은
       * `steps + 1` 장뿐이다 — 그래서 스톱모션으로 보인다.
       */
      const step = Math.min(Math.floor(t * MY_VINE_REVEAL.steps), sequence.length - 1);
      if (step !== shown) {
        shown = step;
        surface.src = sequence[step].src;
      }

      if (t < 1) frameRef.current = requestAnimationFrame(tick);
      else form.submit();
    };

    frameRef.current = requestAnimationFrame(tick);
  }

  return (
    <form ref={formRef} method="post" action={action} onSubmit={handleSubmit}>
      {/*
        리빌 중에만 화면을 덮는다. 그 전에는 빈 상태 배경(같은 풀밭 그림)이
        보이고 있으므로 나타나는 순간 이어 붙는다.

        `src` 를 미리 안 붙인다 — 어차피 숨어 있고, 미리 받아 둔 11장이
        캐시에 있어 첫 프레임 대입이 즉시 그려진다.
      */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imageRef}
        className={styles.reveal}
        alt=""
        aria-hidden="true"
        data-revealing={revealing ? '' : undefined}
        data-testid="create-vine-reveal"
      />
      <div className={styles.cta} data-revealing={revealing ? '' : undefined}>
        {children}
      </div>
    </form>
  );
}
