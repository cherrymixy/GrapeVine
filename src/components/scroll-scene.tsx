'use client';

import Lenis from 'lenis';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from 'react';

import { lerpToward, sceneProgress } from '@/lib/scroll-math';

import styles from './scroll-scene.module.css';

/**
 * 스크롤 하네스 (STEP 14) — 연출 패스가 딛고 설 바닥.
 *
 * 긴 구간을 만들고 그 안에서 화면 하나를 `sticky` 로 붙잡아 둔 뒤,
 * 얼마나 굴렸는지를 `0..1` 로 내보낸다 (PRD §9.1).
 * 여기서는 진행률을 **만들어 나눠 주기만** 한다. 그걸로 무엇을 그릴지는
 * STEP 15(영상 스크럽) 이후의 몫이다.
 *
 * ## 진행률을 두 갈래로 내보내는 이유
 *
 * 1. **CSS 변수 `--scroll-progress`** — 씬 엘리먼트에 얹는다. 상속되므로
 *    안쪽 어디서든 `var(--scroll-progress)` 로 읽는다. JS 가 필요 없다.
 * 2. **`subscribe()`** — 영상의 `currentTime` 처럼 숫자가 필요한 쪽.
 *
 * 둘 다 **React state 를 쓰지 않는다.** 진행률은 초당 60번 바뀌는데 state 에
 * 담으면 그때마다 트리 전체가 다시 그려진다. ref 에 담고 직접 통지한다.
 *
 * ## lerp 가 왜 하네스에 있나
 *
 * 절대규칙 10 은 `currentTime` 을 항상 lerp 로 접근하라고 한다. 소비자마다
 * lerp 를 하게 두면 한 곳만 잊어도 규칙이 깨지고, 깨진 걸 눈으로만 알 수
 * 있다. **하네스가 이미 부드러워진 값만 내보내면** 소비자는 잊을 수가 없다.
 */

type ProgressSubscriber = (progress: number) => void;

export type ScrollSceneApi = {
  /** 진행률이 바뀔 때마다 호출된다. 구독 즉시 현재 값을 한 번 준다. */
  subscribe: (subscriber: ProgressSubscriber) => () => void;
  /** 구독 없이 지금 값만 필요할 때. */
  getProgress: () => number;
  /** true 면 진행률은 1(마지막 프레임)에 고정되고 스크롤 구간도 없다. */
  reducedMotion: boolean;
};

const ScrollSceneContext = createContext<ScrollSceneApi | null>(null);

export function useScrollScene(): ScrollSceneApi {
  const api = useContext(ScrollSceneContext);
  if (!api) throw new Error('useScrollScene 은 <ScrollScene> 안에서만 쓸 수 있다.');
  return api;
}

/**
 * `prefers-reduced-motion: reduce` 구독 (PRD §9.4).
 *
 * 서버에서는 알 수 없으므로 false 로 시작한다 — 그래서 **레이아웃은 CSS 가
 * 먼저 잡는다**(module.css 의 같은 미디어쿼리). JS 는 뒤따라와서 Lenis 와
 * rAF 만 끈다. 이 순서라야 첫 페인트에서 화면이 튀지 않는다.
 *
 * 설정을 도중에 바꿔도 따라간다.
 */
function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia('(prefers-reduced-motion: reduce)');
      query.addEventListener('change', onChange);
      return () => query.removeEventListener('change', onChange);
    },
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false,
  );
}

export function ScrollScene({
  length,
  lerp,
  children,
}: {
  /** 핀 구간의 길이(뷰포트 배수). `data/scroll-cues.ts` 에서 온다. */
  length: number;
  /** lerp 계수. 마찬가지로 `data/scroll-cues.ts`. */
  lerp: number;
  children: ReactNode;
}) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const subscribersRef = useRef<Set<ProgressSubscriber>>(new Set());
  const reducedMotion = useReducedMotion();

  const publish = useCallback((progress: number) => {
    if (progress === progressRef.current) return;
    progressRef.current = progress;
    // 소수 4자리면 1440px 폭에서도 서브픽셀 아래다. 문자열을 짧게 유지한다.
    sceneRef.current?.style.setProperty('--scroll-progress', progress.toFixed(4));
    for (const subscriber of subscribersRef.current) subscriber(progress);
  }, []);

  const api = useMemo<ScrollSceneApi>(
    () => ({
      subscribe: (subscriber) => {
        subscribersRef.current.add(subscriber);
        // 붙는 순간 현재 값을 준다 — 늦게 마운트된 소비자가 0 에서 시작하지 않게.
        subscriber(progressRef.current);
        return () => {
          subscribersRef.current.delete(subscriber);
        };
      },
      getProgress: () => progressRef.current,
      reducedMotion,
    }),
    [reducedMotion],
  );

  useEffect(() => {
    /*
     * reduce — 스크럽도 스무스 스크롤도 없다. 마지막 프레임 상태로 못 박는다
     * (PRD §9.4 "정적 폴백 + 즉시 표시"). 스크롤 구간은 CSS 가 이미 걷어냈다.
     */
    if (reducedMotion) {
      publish(1);
      return;
    }

    const scene = sceneRef.current;
    if (!scene) return;

    const lenis = new Lenis({ autoRaf: false, lerp });
    let frame = 0;
    let current = 0;

    const loop = (time: number) => {
      // Lenis 를 먼저 굴려야 이번 프레임의 스크롤 위치가 반영된 뒤에 읽는다.
      lenis.raf(time);

      const target = sceneProgress(
        scene.getBoundingClientRect().top,
        scene.offsetHeight,
        window.innerHeight,
      );
      current = lerpToward(current, target, lerp);
      publish(current);

      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, [lerp, reducedMotion, publish]);

  return (
    <ScrollSceneContext.Provider value={api}>
      <div
        ref={sceneRef}
        className={styles.scene}
        style={{ '--scene-length': length } as CSSProperties}
        data-testid="scroll-scene"
      >
        <div className={styles.pin}>{children}</div>
      </div>
    </ScrollSceneContext.Provider>
  );
}
