/**
 * 도메인 모델 — PRD §8.
 *
 * 순수 타입만. import 금지, 런타임 값 금지.
 * DB는 snake_case, 여기는 camelCase. 매핑은 repositories/ 소관(STEP 3).
 */

export type User = {
  id: string;
  /** 유니크. 로그인 입력값. Supabase Auth 에는 `{loginId}@grapevine.local` 로 매핑된다. */
  loginId: string;
  /** "Blair" — 판 제목/모달 타이틀에 쓰인다. */
  displayName: string;
  /** ISO 8601 */
  createdAt: string;
};

export type Vine = {
  id: string;
  /** User.id — 1:1 (PRD §7-1 사용자당 판 1개) */
  ownerId: string;
  /** 공유 URL용. 추측 불가 랜덤. */
  slug: string;
  /** ISO 8601 */
  createdAt: string;
};

export type VinePage = {
  id: string;
  vineId: string;
  /** 1부터 */
  pageIndex: number;
  /** 15 고정 (PRD §7-2) */
  capacity: number;
};

export type Grape = {
  id: string;
  pageId: string;
  /** 0..capacity-1 — (pageId, slotIndex) UNIQUE */
  slotIndex: number;
  /** isAnonymous 면 null (절대규칙 3 — 서버에서 강제) */
  authorName: string | null;
  isAnonymous: boolean;
  /** <= 80자 */
  message: string;
  /** ISO 8601 */
  createdAt: string;
};

/** 한 슬롯의 열람 상태. */
export type PageSlot = {
  slotIndex: number;
  grape: Grape | null;
};

/** 파생 — 저장하지 않는다. */
export type PageView = {
  pageIndex: number;
  totalPages: number;
  /** 항상 capacity 개 */
  slots: PageSlot[];
  isFull: boolean;
};
