import { describe, expect, it } from 'vitest';

import { clamp01, lerpToward, sceneProgress } from './scroll-math';

/**
 * 스크롤 하네스의 계산 (STEP 14).
 *
 * 화면에서 눈으로 굴려 보는 것으로는 "끝까지 갔나"를 확신할 수 없다.
 * 경계(시작·끝·범위 밖)와 수렴을 여기서 못 박는다.
 */

describe('sceneProgress', () => {
  // 씬 4배 높이 × 뷰포트 800 → 굴릴 수 있는 거리 2400
  const HEIGHT = 3200;
  const VIEWPORT = 800;

  it('씬 꼭대기에 있으면 0', () => {
    expect(sceneProgress(0, HEIGHT, VIEWPORT)).toBe(0);
  });

  it('굴릴 거리를 다 쓰면 1', () => {
    expect(sceneProgress(-2400, HEIGHT, VIEWPORT)).toBe(1);
  });

  it('절반이면 0.5', () => {
    expect(sceneProgress(-1200, HEIGHT, VIEWPORT)).toBeCloseTo(0.5, 10);
  });

  it('씬에 닿기 전(아래에 있음)은 0 으로 자른다', () => {
    expect(sceneProgress(500, HEIGHT, VIEWPORT)).toBe(0);
  });

  it('씬을 지나쳐도 1 을 넘지 않는다', () => {
    expect(sceneProgress(-9999, HEIGHT, VIEWPORT)).toBe(1);
  });

  it('씬이 뷰포트보다 작으면 0 — 0 으로 나누지 않는다', () => {
    expect(sceneProgress(-100, 800, 800)).toBe(0);
    expect(sceneProgress(-100, 400, 800)).toBe(0);
    expect(Number.isFinite(sceneProgress(-100, 800, 800))).toBe(true);
  });
});

describe('lerpToward', () => {
  it('목표를 향해 계수만큼 다가간다', () => {
    expect(lerpToward(0, 1, 0.1)).toBeCloseTo(0.1, 10);
    expect(lerpToward(0.5, 1, 0.1)).toBeCloseTo(0.55, 10);
  });

  it('목표를 지나치지 않는다', () => {
    let current = 0;
    for (let i = 0; i < 500; i += 1) current = lerpToward(current, 1, 0.1);
    expect(current).toBeLessThanOrEqual(1);
  });

  it('충분히 가까워지면 스냅한다 — 영원히 근접만 하지 않는다', () => {
    let current = 0;
    let frames = 0;
    while (current !== 1 && frames < 1000) {
      current = lerpToward(current, 1, 0.1);
      frames += 1;
    }
    // 스냅이 없으면 1000 프레임을 다 쓰고도 1 이 되지 않는다.
    expect(current).toBe(1);
    expect(frames).toBeLessThan(200);
  });

  it('되돌아올 때도 똑같이 수렴한다', () => {
    let current = 1;
    let frames = 0;
    while (current !== 0 && frames < 1000) {
      current = lerpToward(current, 0, 0.1);
      frames += 1;
    }
    expect(current).toBe(0);
  });

  it('이미 목표면 그대로', () => {
    expect(lerpToward(1, 1, 0.1)).toBe(1);
  });
});

describe('clamp01', () => {
  it('범위 밖을 자른다', () => {
    expect(clamp01(-3)).toBe(0);
    expect(clamp01(7)).toBe(1);
    expect(clamp01(0.42)).toBe(0.42);
  });

  it('NaN 은 0 — 진행률이 NaN 이면 currentTime 대입이 통째로 죽는다', () => {
    expect(clamp01(Number.NaN)).toBe(0);
  });
});
