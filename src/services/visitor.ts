import { copy } from '@/data';

/**
 * 방문자 화면의 판단 로직 — **전부 순수 함수**.
 *
 * 서버 컴포넌트 안에 조건문으로 흩어 놓으면 렌더를 돌려야만 검증할 수 있다.
 * 분리해 두면 분기를 값으로 확인할 수 있고, STEP 7 에서 화면을 바꿔도
 * 규칙은 그대로 남는다.
 */

/**
 * `?page=n` 을 실제 페이지 번호로 바꾼다.
 *
 * 범위 밖이면 **1로 되돌린다**(가장 가까운 경계로 붙이지 않는다).
 * 공유 링크에 손댄 값이 들어와도 방문자는 언제나 판의 첫 장을 보게 된다 —
 * 빈 화면이나 404 를 만나는 것보다 낫다 (§3 "방문자 마찰 0").
 */
export function clampPageIndex(raw: string | string[] | undefined, totalPages: number): number {
  if (totalPages < 1) return 1;

  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === undefined) return 1;

  // `Number()` 는 ''·'  '·'1.5'·'1e3' 을 전부 통과시킨다. 정수만 받는다.
  if (!/^\d+$/.test(value.trim())) return 1;

  const parsed = Number(value.trim());
  if (parsed < 1 || parsed > totalPages) return 1;

  return parsed;
}

export type CtaState =
  /** 빈 슬롯이 있고 남이 보는 중 — 정상 경로 */
  | { kind: 'add'; label: string; disabled: false }
  /** 이 페이지가 꽉 참. nextPageIndex 가 있으면 다음 장으로 유도한다 */
  | { kind: 'full'; label: string; disabled: true; nextPageIndex: number | null }
  /** 주인 본인 — PRD §7-7 */
  | { kind: 'owner'; label: string; disabled: true };

/**
 * 하단 CTA 의 상태 (PRD §5.9).
 *
 * 판정 순서가 중요하다: **주인 여부를 먼저** 본다. 주인이 꽉 찬 페이지를 보고
 * 있을 때 "다음 페이지로 가서 쓰라"고 유도하면 안 되기 때문이다 — 주인은
 * 애초에 어느 페이지에도 쓸 수 없다.
 */
export function resolveCtaState(input: {
  isOwner: boolean;
  isFull: boolean;
  pageIndex: number;
  totalPages: number;
}): CtaState {
  if (input.isOwner) {
    return { kind: 'owner', label: copy.othersVine.addGrape, disabled: true };
  }

  if (input.isFull) {
    return {
      kind: 'full',
      label: copy.othersVine.full,
      disabled: true,
      nextPageIndex: input.pageIndex < input.totalPages ? input.pageIndex + 1 : null,
    };
  }

  return { kind: 'add', label: copy.othersVine.addGrape, disabled: false };
}
