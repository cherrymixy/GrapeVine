import type { Grape, PageView, Vine, VinePage } from '@/models';

/**
 * 데이터 계층 인터페이스 — 경로 A(Supabase) ↔ B(Firebase) 교체점.
 *
 * 설계 원칙:
 * 1. 메서드 단위는 테이블이 아니라 **원자성 경계**다. `addGrape` 를 "슬롯 조회"
 *    + "삽입" 으로 쪼개면 절대규칙 1(슬롯 점유는 DB가 보장)이 인터페이스 레벨에서
 *    이미 깨진다. 원자적이어야 하는 일은 메서드 하나여야 한다.
 * 2. 트랜잭션을 노출하지 않는다. `beginTransaction()` 같은 메서드는 두지 않는다.
 *    Postgres 는 RPC 한 방, Firestore 는 runTransaction — 원자성 확보 방식은
 *    어댑터 내부 구현 디테일이다.
 * 3. 실패는 `lib/errors.ts` 의 도메인 에러로 던진다. 백엔드별 에러 코드
 *    (SQLSTATE 23505, Firestore ALREADY_EXISTS …)는 어댑터 안에서 번역된다.
 */

/** 방문자가 보내는 칭찬 내용. slotIndex 는 별도 인자다. */
export type GrapePayload = {
  /** isAnonymous 가 true 면 어댑터가 null 로 강제한다 (절대규칙 3). */
  authorName: string | null;
  isAnonymous: boolean;
  message: string;
};

export type CreatedVine = {
  vine: Vine;
  firstPage: VinePage;
};

export interface VineRepository {
  /**
   * 판 생성 (PRD §7-1). Vine + Page 1 을 만든다.
   * 슬러그는 어댑터가 생성하고 충돌 시 재시도한다 — 호출자는 신경 쓰지 않는다.
   *
   * @throws {OwnerAlreadyHasVineError} 이미 판이 있는 주인
   * @throws {SlugExhaustedError} 재시도를 다 써도 빈 슬러그를 못 찾음
   */
  createVine(ownerId: string): Promise<CreatedVine>;

  /** 공유 링크 진입점. 없으면 null (에러 아님 — 404 는 라우트가 판단한다). */
  getVineBySlug(slug: string): Promise<Vine | null>;

  /** 열람용 파생 뷰. slots 는 항상 capacity 개. 없으면 null. */
  getPage(vineId: string, pageIndex: number): Promise<PageView | null>;

  /** page_index 오름차순. */
  listPages(vineId: string): Promise<VinePage[]>;

  /**
   * 지정한 슬롯을 점유한다 — 이 인터페이스의 핵심 원자 연산.
   *
   * 슬롯 **선택**은 여기서 하지 않는다. 확정된 설계상 서버가 빈 슬롯 중 하나를
   * 골라 이 메서드를 부르고, `SlotTakenError` 가 나면 다른 슬롯으로 재시도한다.
   * 그 선택·재시도 루프는 services/ 소관이고, 이 메서드는 "이 슬롯을 원자적으로
   * 점유하라"는 원시 연산만 책임진다.
   *
   * @throws {SlotTakenError} 다른 방문자가 먼저 점유 (PRD §7-4)
   * @throws {PageNotFoundError} 없는 페이지
   * @throws {MessageTooLongError} 80자 초과
   * @throws {InvalidAuthorNameError} 기명인데 이름 없음
   */
  addGrape(pageId: string, slotIndex: number, payload: GrapePayload): Promise<Grape>;
}
