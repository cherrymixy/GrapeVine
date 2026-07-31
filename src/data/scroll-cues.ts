/*
 * 스크롤 연출의 구간 값 (CLAUDE.md 절대규칙 6 — 스크롤 구간은 여기서만).
 *
 * 컴포넌트에 타이밍을 하드코딩하지 않는다. 연출을 다듬을 때 고칠 파일이
 * 한 곳에 모여 있어야 STEP 15~18 이 서로를 건드리지 않고 굴러간다.
 *
 * 좌표(slot-layout)·문구(copy)와 같은 이유로 분리한다: 값을 바꾸는 일과
 * 구조를 바꾸는 일이 섞이면 연출을 다듬을 때마다 컴포넌트가 흔들린다.
 */

export type ScrollScene = {
  /** 핀 구간의 길이. 뷰포트 높이의 배수. */
  readonly length: number;
  /** 진행률 lerp 계수 (0~1). 작을수록 더 늦게 따라온다. */
  readonly lerp: number;
};

/**
 * Main 스크럽 씬 (PRD §5.1 / §9.1).
 *
 * `length` — 영상이 5.04초다. 4배면 한 화면 스크롤에 약 1.26초가 흐른다.
 *   ⚠️ 이 값은 Figma 에도 PRD 에도 근거가 없다. 스크롤 "감각"의 문제라
 *      눈으로 보고 정해야 하는 값이다. 지어낸 값이 아니라 **정해야 하는
 *      값**이라 여기 한 줄로 빼 뒀다 — 느리면 줄이고 급하면 늘린다.
 *
 * `lerp` — PRD §9.1 이 명시한 0.1 (`current += (target - current) * 0.1`).
 *   목표값을 그대로 쓰면 계단처럼 튄다 (절대규칙 10).
 */
export const MAIN_SCENE: ScrollScene = {
  length: 4,
  lerp: 0.1,
};

/** 진행률 구간. `from` 에서 보이기 시작해 `to` 에서 다 보인다. */
export type ScrollCue = {
  readonly from: number;
  readonly to: number;
};

/**
 * Main 오버레이 구간 (PRD §5.1).
 *
 * > 넝쿨이 뻗어나감 → **후반부 포도알 그래픽이 하나씩 등장** →
 * > **마지막에** 타이틀 + 서브카피 + 사이드바 등장
 *
 * PRD 가 정한 건 이 **순서와 대략의 자리**("후반부", "마지막")뿐이다.
 * 아래 숫자는 그걸 구간으로 옮긴 것이고, ⚠️ Figma 에 타이밍 시안이 없으니
 * **눈으로 보고 정해야 하는 값**이다 — `MAIN_SCENE.length` 와 같은 성격이라
 * 같은 파일에 뒀다 (절대규칙 6). 늦으면 앞으로 당기고 급하면 벌린다.
 *
 * 앞 절반(0~0.5)은 넝쿨만 자란다. 오버레이가 일찍 끼면 영상 자체를 못 본다.
 *
 * `grapes` 는 `app/page.tsx` 의 `GRAPES` 배열 순서와 1:1 로 짝지어진다
 * (= Figma 레이어 순서). 겹치게 두면 "하나씩"이 아니라 뭉쳐 보인다.
 */
export const MAIN_CUES = {
  grapes: [
    { from: 0.5, to: 0.6 },
    { from: 0.6, to: 0.7 },
    { from: 0.7, to: 0.8 },
  ],
  title: { from: 0.82, to: 0.9 },
  subtitle: { from: 0.86, to: 0.94 },
  sidebar: { from: 0.9, to: 0.98 },
} as const satisfies {
  grapes: readonly ScrollCue[];
  title: ScrollCue;
  subtitle: ScrollCue;
  sidebar: ScrollCue;
};

/**
 * My Vine 생성 리빌 (PRD §9.2) — 스크롤이 아니지만 여기 둔다.
 *
 * 절대규칙 6 이 스크롤 구간을 이 파일로 모은 이유(타이밍을 고치는 일과
 * 구조를 고치는 일을 섞지 않는다)가 그대로 적용된다. 연출 타이밍의 집은
 * 하나여야 한다.
 *
 * PRD §9.2:
 * > 연속 재생이 아니라 **초 단위로 끊어서(이산)** 재생 → 스톱모션처럼
 * > 넝쿨이 드러남. `Math.floor(t * steps) / steps` 로 양자화.
 * >
 * > Main 과의 대비가 의도: Main = 스크롤 종속 연속 스크럽 /
 * > My Vine = 클릭 트리거 이산 재생. 같은 소재, 다른 리듬.
 *
 * ⚠️ PRD 가 정한 건 **"이산"이라는 성질**이고 숫자는 없다. 아래 두 값은
 *    그걸 옮긴 것이라 눈으로 보고 정해야 한다 — `MAIN_SCENE.length` 와
 *    같은 성격이다.
 *    `steps: 10` / `durationMs: 2500` = 초당 4번 바뀐다. 스톱모션으로
 *    읽히면서 판을 쓰기까지 기다리는 시간이 2.5초를 넘지 않는 선.
 */

export const MY_VINE_REVEAL = {
  /** 이산 단계 수. 낮을수록 뚝뚝 끊긴다. */
  steps: 10,
  /** 리빌 전체 길이(ms). 영상 길이(5.04초)와 무관하게 이 시간 안에 끝난다. */
  durationMs: 2500,
  /**
   * 영상이 이 시간 안에 준비되지 않으면 **리빌을 건너뛰고 바로 넘어간다.**
   * 장식 때문에 판 만들기를 기다리게 두지 않는다.
   */
  readyTimeoutMs: 1500,
} as const;

/**
 * 붙이기 낙하 (PRD §9.3) — `Send` 성공 후 그 알이 위에서 톡 떨어져 붙는다.
 *
 * > 기획 원문: *"실제 스티커판에 한 알을 채워 넣는 감각을 그대로 옮겼다."*
 *
 * PRD 가 "duration/curve 는 STEP 에서 정확한 값으로 지정"하라고 남겨 둔 자리다.
 *
 * - `durationMs: 420` — "톡"이다. 300 이하는 무슨 일이 있었는지 못 보고,
 *   600 을 넘으면 떨어지는 게 아니라 내려앉는다.
 * - `fromDiameters: 3` — 알 지름의 3배 위에서 떨어진다. 자기 크기 대비라
 *   화면이 커져도 낙하 거리의 인상이 유지된다.
 *
 * 곡선은 값이 아니라 모양이라 CSS 에 둔다 (`grape-board.module.css` 의
 * `@keyframes drop`) — 떨어질 때는 가속(중력), 닿은 뒤 눌린 모양이 되돌아올
 * 때는 감속.
 */
export const GRAPE_DROP = {
  durationMs: 420,
  fromDiameters: 3,
} as const;

/**
 * 모바일 이미지 시퀀스 (STEP 19b / PRD §9.1).
 *
 * PRD 는 이걸 iOS `currentTime` 스크러빙이 불안정할 때의 **폴백**으로 뒀지만,
 * 실제로 재보니 모바일에서는 **시퀀스가 더 싸다.**
 *
 * |            | 영상 | 시퀀스 |
 * |------------|------|--------|
 * | Main 스크럽 | 2.8MB | **1.22MB** (720폭 121장) |
 * | 리빌       | 7.8MB | **187KB** (540폭 **11장**) |
 *
 * Main 배경이 크림색 단색이라 WebP 가 극도로 잘 눌린다. 리빌은 더 극적인데,
 * **이산 10단계라 실제로 쓰이는 프레임이 11장뿐**이다 — 121장을 다 받을
 * 이유가 없다. 그래서 "불안정하면 갈아탄다"가 아니라 **모바일 기본**이다.
 */
export const IMAGE_SEQUENCE = {
  main: {
    dir: '/images/main-seq',
    /** 영상과 같은 121프레임. 파일명은 `000.webp` … `120.webp`. */
    frames: 121,
    /**
     * 처음에 몇 장 건너뛰며 받을지. 8이면 16장(≈160KB)만 와도 스크럽이
     * 돈다 — 나머지는 뒤따라오며 촘촘해진다. 없는 프레임 자리는 **가장
     * 가까운 받은 프레임**을 그린다.
     */
    coarseStride: 8,
  },
  reveal: {
    dir: '/images/reveal-seq',
    /** `MY_VINE_REVEAL.steps` + 1. 계단 하나당 한 장. */
    frames: 11,
    coarseStride: 1,
  },
} as const;
