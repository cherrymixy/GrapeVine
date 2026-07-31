/**
 * 페이지당 포도알 슬롯 좌표 프리셋 — PRD §6.
 *
 * 절대규칙 5: 슬롯 좌표는 이 파일에서만. 컴포넌트에 px 하드코딩 금지.
 * 레이아웃을 바꾸고 싶으면 이 파일 하나만 고친다.
 *
 * 전 페이지가 같은 레이아웃을 쓴다 (PRD §7-2). 랜덤 아님.
 *
 * 출처: Figma `DDD` / My Vine 프레임 `201:753` (1536 × 771).
 *       Ellipse 5002~5017, 전부 163 × 163.
 */

/**
 * 좌표계 규약:
 * - 모든 값은 컨테이너 대비 **%**. px 금지 — 판이 반응형으로 스케일해야 한다.
 * - xPct / yPct 는 알의 **중심** 좌표다. 좌상단이 아니다.
 * - xPct 는 컨테이너 **폭**, yPct 는 컨테이너 **높이** 대비.
 * - sizePct 는 알의 **지름**이며 컨테이너 **폭** 대비다.
 *   (높이 대비로 잡으면 컨테이너 종횡비가 바뀔 때 알이 타원이 된다.)
 *
 * ⚠️ 컨테이너는 원본 프레임의 종횡비 **1536 : 771 (≈1.992)** 를 유지해야 한다.
 *    x는 폭 대비, y는 높이 대비로 환산했으므로, 종횡비가 달라지면 알의 상대 배치가
 *    배경 넝쿨 이미지와 어긋난다.
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
 * 피그마 원본 프레임 크기. 아래 % 값의 환산 기준이다.
 * xPct = (x + 163/2) / 1536 * 100,  yPct = (y + 163/2) / 771 * 100
 */
export const SOURCE_FRAME = { width: 1536, height: 771 } as const;

/**
 * slotIndex 는 Ellipse 번호 오름차순(5002→0 … 5017→14)으로 매겼다.
 * 채워지는 순서와는 무관하다 — 슬롯 배정은 빈 슬롯 중 서버가 랜덤으로 고른다.
 * 번호를 그대로 쓴 이유는 디버깅할 때 슬롯 ↔ 피그마 노드를 역추적할 수 있어서다.
 *
 * ⚠️ 프레임에는 ellipse 노드가 **16개** 있지만 `Ellipse 5009`(201:764)가
 *    `Ellipse 5007`(201:768)과 좌표·크기가 완전히 동일해 정확히 겹쳐 있다.
 *    화면에 보이는 알은 15개이고 PRD §7-2 도 15알이므로 5009 를 제외했다.
 *    피그마 쪽 잔여 레이어로 보이니 정리하는 편이 좋다.
 */
export const SLOT_LAYOUT: readonly SlotLayout[] = [
  // slotIndex, Ellipse, node,    원본 x/y
  { slotIndex: 0, xPct: 46.582, yPct: 70.363, sizePct: 10.612 }, // 5002  201:755   634, 461
  { slotIndex: 1, xPct: 77.311, yPct: 14.591, sizePct: 10.612 }, // 5003  201:765  1106,  31
  { slotIndex: 2, xPct: 17.611, yPct: 70.363, sizePct: 10.612 }, // 5004  201:770   189, 461
  { slotIndex: 3, xPct: 61.751, yPct: 10.96, sizePct: 10.612 }, //  5005  201:766   867,   3
  { slotIndex: 4, xPct: 51.139, yPct: 30.545, sizePct: 10.612 }, // 5006  201:767   704, 154
  { slotIndex: 5, xPct: 36.882, yPct: 14.591, sizePct: 10.612 }, // 5007  201:768   485,  31
  { slotIndex: 6, xPct: 8.04, yPct: 30.545, sizePct: 10.612 }, //   5008  201:769    42, 154
  { slotIndex: 7, xPct: 32.064, yPct: 57.004, sizePct: 10.612 }, // 5010  201:756   411, 358
  { slotIndex: 8, xPct: 21.452, yPct: 32.101, sizePct: 10.612 }, // 5011  201:757   248, 166
  { slotIndex: 9, xPct: 61.035, yPct: 89.04, sizePct: 10.612 }, //  5012  201:758   856, 605
  { slotIndex: 10, xPct: 81.348, yPct: 78.534, sizePct: 10.612 }, // 5013 201:759  1168, 524
  { slotIndex: 11, xPct: 75.163, yPct: 41.051, sizePct: 10.612 }, // 5014 201:760  1073, 235
  { slotIndex: 12, xPct: 90.592, yPct: 57.004, sizePct: 10.612 }, // 5015 201:761  1310, 358
  { slotIndex: 13, xPct: 31.543, yPct: 85.149, sizePct: 10.612 }, // 5016 201:762   403, 575
  { slotIndex: 14, xPct: 62.012, yPct: 57.004, sizePct: 10.612 }, // 5017 201:763   871, 358
];
