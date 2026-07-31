/**
 * How It Works 01~05 — PRD §5.3 / §6.
 *
 * 절대규칙 6(문구 하드코딩 금지) + PRD §6("data/steps.ts")에 따라 여기 둔다.
 * 텍스트는 PRD §5.3 에 문자 그대로 있는 값이다.
 */

export type HowItWorksStep = {
  /** "01" ~ "05" */
  no: string;
  text: string;
  /**
   * 원 지름 스케일 (1 = 첫 단계 기준).
   * TODO(승아): PRD §5.3 은 "원 크기를 점점 줄여가며"라고만 하고 값을 주지
   * 않았다. 피그마 How It Works 프레임에서 추출해 채울 것. 그때까지 1 로 둔다.
   */
  scale: number;
};

export const HOW_IT_WORKS_STEPS: readonly HowItWorksStep[] = [
  { no: '01', text: 'Create My Grapevine', scale: 1 },
  { no: '02', text: 'Share link with your friends', scale: 1 },
  { no: '03', text: "Waiting for friends' compliments", scale: 1 },
  { no: '04', text: 'A friend gave a compliment', scale: 1 },
  { no: '05', text: 'Grapes are growing!', scale: 1 },
];

/** 장식 텍스트 (PRD §5.3). */
export const HOW_IT_WORKS_DECORATIONS = ['^_^', 'T.T'] as const;
