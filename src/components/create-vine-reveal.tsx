'use client';

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';

import { MY_VINE_REVEAL } from '@/data';

import styles from './create-vine-reveal.module.css';

/**
 * 판 생성 리빌 (STEP 17 / PRD §9.2).
 *
 * `Create My Vine` 을 누르면 넝쿨이 **스톱모션처럼 뚝뚝 끊기며** 드러나고,
 * 끝나면 그때 폼이 전송돼 빈 포도판으로 넘어간다.
 *
 * ## ⚠️ 여기서는 `currentTime` 을 lerp 로 접근하지 않는다
 *
 * 절대규칙 10 은 "항상 lerp, 직접 대입 금지"다. 그런데 그 규칙의 근거는
 * PRD §9.1 의 *"안 하면 **계단처럼 튐**"* 이고, **여기서는 계단이 목적이다.**
 * PRD §9.2 가 이 화면에 대해서만 `Math.floor(t * steps) / steps` 로
 * 양자화하라고 따로 지정했다. lerp 를 걸면 계단이 뭉개져 연출이 사라진다.
 * 규칙을 어기는 게 아니라 **규칙이 겨냥한 상황(스크럽)이 아니다.**
 * Main 은 그대로 하네스의 lerp 를 쓴다.
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
  src,
  poster,
  children,
}: {
  /** 폼이 보낼 곳. 로직은 그대로 두고 연출만 얹는다. */
  action: string;
  src: string;
  /** 영상의 **첫** 프레임(풀밭). 빈 상태 배경과 같은 그림이라 이어 붙는다. */
  poster: string;
  /** CTA 버튼. */
  children: ReactNode;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [revealing, setRevealing] = useState(false);
  /** 이미 한 번 눌렀다. 두 번 눌러 판이 두 개 생기는 일은 없다. */
  const startedRef = useRef(false);

  /*
   * 영상을 미리 받아 둔다. 이 화면에서 할 수 있는 일은 이 버튼 하나뿐이라
   * 거의 확실히 필요해진다. 누른 뒤에 받기 시작하면 몇 초를 빈 화면으로
   * 기다리게 된다.
   *
   * reduce 면 아예 받지 않는다 — STEP 15 에서 밟은 것과 같은 이유로
   * `src` 를 마크업이 아니라 여기서 붙인다. 서버는 reduce 를 알 수 없어
   * 마크업에 두면 그 HTML 이 그대로 나가 버린다. `useSyncExternalStore`
   * 대신 여기서 직접 읽는 것도 같은 이유다(하이드레이션 중엔 서버 값이 온다).
   */
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const video = videoRef.current;
    if (video && !video.src) video.src = src;
  }, [src]);

  /** 도는 중인 rAF. 언마운트 때 끊는다. */
  const frameRef = useRef(0);
  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // 두 번째 클릭은 무시. 리빌이 도는 동안 버튼은 disabled 지만 이중 방어.
    if (startedRef.current) {
      event.preventDefault();
      return;
    }

    const form = event.currentTarget;
    const video = videoRef.current;

    // reduce — 연출 없이 즉시 (PRD §9.4). 기본 동작 그대로 둔다.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!video) return;

    event.preventDefault();
    startedRef.current = true;
    setRevealing(true);

    /** 리빌이 어떻게 끝나든(정상·실패·시간초과) 여기로 모인다. */
    const submit = () => form.submit();

    const play = () => {
      const duration = video.duration;
      if (!Number.isFinite(duration) || duration <= 0) {
        submit();
        return;
      }

      // 마지막 프레임은 EOF 한 프레임 안쪽 — STEP 15 와 같은 이유.
      const end = Math.max(duration - 1 / 24, 0);
      const start = performance.now();

      const tick = (now: number) => {
        const t = Math.min((now - start) / MY_VINE_REVEAL.durationMs, 1);
        /*
         * PRD §9.2 의 계단 함수. `t` 는 매끄럽게 흐르지만 목표 시간은
         * `steps` 개의 값만 갖는다 — 그래서 스톱모션으로 보인다.
         */
        const quantized = Math.floor(t * MY_VINE_REVEAL.steps) / MY_VINE_REVEAL.steps;
        video.currentTime = quantized * end;

        if (t < 1) {
          frameRef.current = requestAnimationFrame(tick);
        } else {
          submit();
        }
      };

      frameRef.current = requestAnimationFrame(tick);
    };

    /*
     * 영상이 준비되면 시작한다. 안 되면 기다리지 않고 넘어간다 —
     * 장식 때문에 판 만들기가 막히면 안 된다.
     */
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      play();
      return;
    }

    let done = false;
    const once = (fn: () => void) => () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      video.removeEventListener('canplay', onReady);
      video.removeEventListener('error', onFail);
      fn();
    };
    const onReady = once(play);
    const onFail = once(submit);
    const timer = setTimeout(onFail, MY_VINE_REVEAL.readyTimeoutMs);

    video.addEventListener('canplay', onReady);
    video.addEventListener('error', onFail);
  }

  return (
    <form ref={formRef} method="post" action={action} onSubmit={handleSubmit}>
      {/*
        리빌 중에만 화면을 덮는다. 그 전에는 빈 상태 배경(같은 풀밭 그림)이
        보이고 있으므로 나타나는 순간 이어 붙는다.
      */}
      <video
        ref={videoRef}
        className={styles.reveal}
        poster={poster}
        muted
        playsInline
        preload="auto"
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
