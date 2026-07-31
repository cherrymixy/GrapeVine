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
