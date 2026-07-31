/**
 * 페이지당 포도알 슬롯 좌표 프리셋 — PRD §6.
 *
 * 절대규칙 5: 슬롯 좌표는 이 파일에서만. 컴포넌트에 px 하드코딩 금지.
 * 레이아웃을 바꾸고 싶으면 이 파일 하나만 고친다.
 *
 * 전 페이지가 같은 레이아웃을 쓴다 (PRD §7-2). 랜덤 아님.
 */

/**
 * 좌표계 (값을 받기 전에 확정해야 하는 규약):
 * - 모든 값은 컨테이너 대비 **%**. px 금지 — 판이 반응형으로 스케일해야 한다.
 * - xPct / yPct 는 알의 **중심** 좌표다. 좌상단이 아니다.
 * - xPct 는 컨테이너 **폭**, yPct 는 컨테이너 **높이** 대비.
 * - sizePct 는 알의 **지름**이며 컨테이너 **폭** 대비다.
 *   (높이 대비로 잡으면 컨테이너 종횡비가 바뀔 때 알이 타원이 된다.)
 */
export type SlotLayout = {
  /** 0..PAGE_CAPACITY-1. 배열 인덱스와 일치해야 한다. */
  slotIndex: number;
  xPct: number;
  yPct: number;
  sizePct: number;
};

/**
 * 페이지당 슬롯 수 (PRD §7-2, 부록 D 확정).
 * DB `vine_pages.capacity` 기본값과 반드시 일치해야 한다.
 */
export const PAGE_CAPACITY = 15;

/**
 * TODO(승아): 피그마 Ellipse 노드에서 추출한 좌표 15개를 여기 채운다.
 *
 * 작업규칙 8(픽셀 추측 금지)에 따라 값을 지어내지 않고 비워 둔다.
 * 넘겨줄 때 위 좌표계 규약(중심 기준 / 지름 / 폭 대비)이 맞는지 함께 확인할 것.
 *
 * 채우고 나면 slot-layout.test.ts 의 `it.todo` 를 `it` 으로 바꾼다.
 *
 * 형태:
 *   { slotIndex: 0, xPct: 00.0, yPct: 00.0, sizePct: 00.0 },
 */
export const SLOT_LAYOUT: readonly SlotLayout[] = [];
