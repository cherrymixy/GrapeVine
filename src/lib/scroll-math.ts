/*
 * 스크롤 하네스의 계산 부분 (STEP 14).
 *
 * rAF 루프 안에 섞여 있으면 눈으로 굴려 보는 것 말고는 검증할 방법이 없다.
 * 순수 함수로 떼어 내 단위테스트로 못 박는다 (PRD §7-10 과 같은 이유).
 */

/**
 * 씬이 얼마나 스크롤됐는지를 `0..1` 로.
 *
 * @param sceneTop      씬 엘리먼트의 `getBoundingClientRect().top`
 * @param sceneHeight   씬 전체 높이 (뷰포트 여러 개 분량)
 * @param viewportHeight 뷰포트 높이
 *
 * 핀이 붙어 있는 동안만 진행한다. 씬 높이에서 뷰포트 하나를 뺀 만큼이
 * 실제로 굴릴 수 있는 거리다 — 마지막 한 화면은 핀이 풀리는 자리라
 * 진행률 1 에 도달한 뒤다.
 */
export function sceneProgress(
  sceneTop: number,
  sceneHeight: number,
  viewportHeight: number,
): number {
  const scrollable = sceneHeight - viewportHeight;
  // 씬이 뷰포트보다 작거나 같으면 굴릴 거리가 없다 (0 나누기 방지).
  if (scrollable <= 0) return 0;
  return clamp01(-sceneTop / scrollable);
}

/**
 * 목표값을 향해 한 프레임 다가간다 (절대규칙 10 — 직접 대입 금지).
 *
 * 지수 감쇠라 수학적으로는 목표에 영원히 도달하지 않는다. 충분히 가까워지면
 * 스냅하지 않으면 마지막 한 조각이 영원히 남아 영상이 끝 프레임에 못 닿고,
 * 매 프레임 의미 없는 갱신이 계속된다.
 */
export function lerpToward(
  current: number,
  target: number,
  factor: number,
  epsilon = 0.0001,
): number {
  const next = current + (target - current) * factor;
  return Math.abs(target - next) < epsilon ? target : next;
}

/** `0..1` 로 자른다. */
export function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(Math.max(value, 0), 1);
}

/**
 * 진행률을 재생 위치(초)로 (STEP 15).
 *
 * 두 가지를 여기서 막는다.
 *
 * 1. **메타데이터 전의 `duration`** — `loadedmetadata` 전에는 `NaN` 이다.
 *    그대로 곱하면 `NaN` 이 되고 `currentTime = NaN` 은 예외를 던져
 *    스크럽이 통째로 죽는다. 0 을 돌려주고 호출자가 다시 시도하게 한다.
 *
 * 2. **끝에서 마지막 프레임을 놓치는 것** — `currentTime = duration` 은
 *    재생 끝(EOF)이라 브라우저에 따라 마지막 프레임을 그리지 않는다.
 *    한 프레임 안쪽으로 물려서 확실히 그 프레임에 앉힌다.
 *
 * @param frameDuration 한 프레임의 길이(초). 이 영상은 24fps 라 1/24.
 */
export function progressToTime(
  progress: number,
  duration: number,
  frameDuration = 1 / 24,
): number {
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  return clamp01(progress) * Math.max(duration - frameDuration, 0);
}
