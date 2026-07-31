/**
 * How It Works 01~05 — PRD §5.3 / §6 / Figma 201:682.
 *
 * 절대규칙 6(문구 하드코딩 금지) + PRD §6("data/steps.ts")에 따라 여기 둔다.
 *
 * ⚠️ PRD §6 은 "원 크기 스케일 값"도 이 파일 소관이라고 했지만 그 필드는 두지
 *    않는다. 실측해 보니 원과 글자가 **서로 다른 비율**로 줄어들기 때문이다.
 *      원  485 / 275 / 367 / 197 / 275  → 1, .567, .757, .406, .567
 *      글자 47.6 / 23.0 / 38.3 / 15.6 / 28.9 → 1, .483, .805, .327, .606
 *    스칼라 하나로 둘 다 표현할 수 없어서, 크기·좌표·각도는 화면 쪽 비주얼
 *    표(`app/how-it-works/page.tsx`)에 함께 둔다. 흩어 놓는 것보다 낫다.
 */

export type HowItWorksStep = {
  /** "01" ~ "05" */
  no: string;
  /**
   * Figma 가 손으로 끊어 놓은 줄.
   * 문구가 오른쪽 정렬이라 첫 줄이 길어지면 번호 뱃지를 덮는다 —
   * 끊는 위치가 조판의 일부다.
   */
  lines: readonly string[];
  /** 한 줄로 필요할 때(스크린리더·요약 등). */
  text: string;
};

/** Figma 201:701 / 704 / 709 / 712 / 715 의 줄 구성 그대로. */
const STEP_LINES: ReadonlyArray<{ no: string; lines: readonly string[] }> = [
  { no: '01', lines: ['Create', 'My Grapevine'] },
  { no: '02', lines: ['Share link', 'with your friends'] },
  { no: '03', lines: ['Waiting', "for friends'", 'compliments'] },
  // Figma 는 "A Friend" 로 F 가 대문자다 (PRD §5.3 은 소문자). 비주얼 SSOT 를 따른다.
  { no: '04', lines: ['A Friend', 'gave a compliment'] },
  { no: '05', lines: ['Grapes', 'are growing!'] },
];

export const HOW_IT_WORKS_STEPS: readonly HowItWorksStep[] = STEP_LINES.map((step) => ({
  ...step,
  text: step.lines.join(' '),
}));

/** 장식 텍스트 (PRD §5.3 / Figma 201:705 · 201:706). */
export const HOW_IT_WORKS_DECORATIONS = ['^_^', 'T.T'] as const;
