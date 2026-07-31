'use client';

import { useEffect, useRef, type CSSProperties } from 'react';

import type { DecorGrape } from './decor-grapes';
import styles from './floating-grapes.module.css';

/**
 * 허공을 떠다니는 장식 포도알 (STEP 22, 승아님 지시).
 *
 * `DecorGrapes` 와 좌표 규칙은 같지만(프레임 대비 %) 두 가지가 다르다.
 *  1. 가만히 있지 않고 **느리게 떠다닌다** — 알마다 주기와 시작점이 다르다.
 *  2. **마우스를 피한다** — 커서가 가까울수록 밀려나고, 멀어지면 제자리로.
 *
 * 공용 `DecorGrapes` 를 건드리지 않고 새로 만든 이유: About 말고 세 화면이
 * 그걸 쓰는데, 거기까지 떠다니게 만들 이유가 없다.
 *
 * ## 레이어를 둘로 나눈 이유
 *
 * 떠다니는 건 CSS 애니메이션, 밀려나는 건 JS 다. **둘 다 `translate` 를
 * 쓰므로 한 요소에 얹으면 서로를 덮어쓴다.** 바깥 span 이 밀림을,
 * 안쪽 span 이 떠다님을 맡는다.
 *
 * ## 매 프레임 리렌더하지 않는다
 *
 * 커서는 초당 수십 번 움직인다. state 에 담으면 그때마다 트리가 다시
 * 그려진다. 스크롤 하네스(STEP 14)와 같은 이유로 **CSS 변수에 직접 쓴다.**
 */
export function FloatingGrapes({
  grapes,
  /** 이 거리(뷰포트 폭 대비 %) 안에 커서가 들어오면 밀리기 시작한다. */
  reach = 22,
  /** 최대로 밀리는 거리(자기 지름 대비 배수). */
  push = 0.55,
}: {
  grapes: readonly DecorGrape[];
  reach?: number;
  push?: number;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    /*
     * reduce — 떠다니지도, 밀리지도 않는다 (PRD §9.4). 애니메이션은 CSS 가
     * 이미 껐고, 여기서는 rAF 와 이벤트를 아예 걸지 않는다.
     * effect 시점에 직접 읽는 이유는 STEP 15·19b 와 같다.
     */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const root = rootRef.current;
    if (!root) return;

    const items = Array.from(root.querySelectorAll<HTMLElement>('[data-grape]'));
    /** 알마다 현재 밀린 양(px). 목표로 부드럽게 따라간다. */
    const current = items.map(() => ({ x: 0, y: 0 }));
    let target = current.map(() => ({ x: 0, y: 0 }));
    let frame = 0;
    let pointerInside = false;

    const onMove = (event: PointerEvent) => {
      pointerInside = true;
      const bounds = root.getBoundingClientRect();
      const reachPx = (bounds.width * reach) / 100;

      target = items.map((item) => {
        const box = item.getBoundingClientRect();
        const dx = box.left + box.width / 2 - event.clientX;
        const dy = box.top + box.height / 2 - event.clientY;
        const distance = Math.hypot(dx, dy);
        if (distance === 0 || distance > reachPx) return { x: 0, y: 0 };

        /*
         * 가까울수록 세게 민다. 선형이 아니라 제곱이라 **가장자리에서는
         * 거의 안 움직이고** 바짝 붙었을 때만 확 비킨다 — 그래야 마우스를
         * 피하는 것처럼 보인다.
         */
        const strength = (1 - distance / reachPx) ** 2;
        const amount = box.width * push * strength;
        return { x: (dx / distance) * amount, y: (dy / distance) * amount };
      });
    };

    const onLeave = () => {
      pointerInside = false;
      target = items.map(() => ({ x: 0, y: 0 }));
    };

    const tick = () => {
      let moving = false;
      for (let i = 0; i < items.length; i += 1) {
        const c = current[i];
        const t = target[i];
        // 스크롤 하네스와 같은 lerp. 목표에 충분히 붙으면 스냅한다.
        c.x += (t.x - c.x) * 0.12;
        c.y += (t.y - c.y) * 0.12;
        if (Math.abs(t.x - c.x) < 0.05) c.x = t.x;
        if (Math.abs(t.y - c.y) < 0.05) c.y = t.y;
        if (c.x !== 0 || c.y !== 0) moving = true;
        items[i].style.setProperty('--push-x', `${c.x.toFixed(2)}px`);
        items[i].style.setProperty('--push-y', `${c.y.toFixed(2)}px`);
      }
      // 커서가 나갔고 전부 제자리면 루프를 쉰다.
      frame = moving || pointerInside ? requestAnimationFrame(tick) : 0;
    };

    const wake = (event: PointerEvent) => {
      onMove(event);
      if (!frame) frame = requestAnimationFrame(tick);
    };

    window.addEventListener('pointermove', wake, { passive: true });
    document.addEventListener('pointerleave', onLeave);

    return () => {
      window.removeEventListener('pointermove', wake);
      document.removeEventListener('pointerleave', onLeave);
      cancelAnimationFrame(frame);
    };
  }, [reach, push]);

  return (
    <div ref={rootRef} className={styles.field} aria-hidden="true" data-testid="floating-grapes">
      {grapes.map((grape, index) => (
        <span
          key={`${grape.x}-${grape.y}`}
          className={styles.push}
          data-grape=""
          style={
            {
              left: `${grape.x}%`,
              top: `${grape.y}%`,
              width: `${grape.size}%`,
              // 알마다 다른 리듬. 같으면 한 덩어리로 움직여 부자연스럽다.
              '--drift-duration': `${9 + index * 2.5}s`,
              '--drift-delay': `${index * -1.7}s`,
            } as CSSProperties
          }
        >
          <span className={styles.grape} />
        </span>
      ))}
    </div>
  );
}
