import {
  EmptyMessageError,
  InvalidAuthorNameError,
  MessageTooLongError,
  PageFullError,
  SlotTakenError,
  VineNotFoundError,
} from '@/lib/errors';
import type { PageSlot } from '@/models';
import type { AttachedGrape, VineRepository } from '@/repositories/vine-repository';

/**
 * 칭찬 붙이기 유스케이스 (PRD §5.10).
 *
 * 확정된 설계: **방문자는 슬롯을 고르지 않는다.** 서버가 빈 슬롯 중 하나를
 * 골라 점유를 시도하고, 다른 방문자가 먼저 가져갔으면 다른 슬롯으로 다시
 * 시도한다. 방문자는 충돌이 있었다는 사실조차 모른다 — §3 "방문자 마찰 0".
 *
 * 리포지토리의 `addGrape` 는 "이 슬롯을 원자적으로 점유하라"는 원시 연산이고,
 * 선택과 재시도는 여기 있다.
 */

/** PRD §7-8. DB `grapes_message_length_check` 와 같은 값이어야 한다. */
export const MESSAGE_MAX_LENGTH = 80;

/** 슬롯 충돌 재시도 횟수. 한 페이지가 15칸이라 이 이상은 의미가 없다. */
export const SLOT_ATTEMPTS = 5;

export type GrapeInput = {
  authorName: string | null;
  isAnonymous: boolean;
  message: string;
};

/**
 * 입력 검증 + 정규화. 순수 함수.
 *
 * DB 제약이 최종 방어선이지만 여기서 먼저 걸러야 하는 이유는, 제약 위반은
 * 왕복 한 번을 낭비하고 에러 메시지도 사용자에게 보여줄 만한 형태가 아니어서다.
 *
 * @throws {EmptyMessageError} 공백만 있거나 빈 메시지
 * @throws {MessageTooLongError} 80자 초과
 * @throws {InvalidAuthorNameError} 익명이 아닌데 이름이 없음
 */
export function normalizeGrapeInput(raw: GrapeInput): GrapeInput {
  const message = raw.message.trim();

  if (message.length === 0) throw new EmptyMessageError();

  // 코드포인트 기준 — DB 의 char_length 와 같은 셈법이어야 한 쪽만 통과하는
  // 일이 없다. UTF-16 length 로 세면 이모지에서 어긋난다.
  if (Array.from(message).length > MESSAGE_MAX_LENGTH) {
    throw new MessageTooLongError(MESSAGE_MAX_LENGTH);
  }

  // 절대규칙 3 — 익명이면 이름은 서버에서 버린다. 클라 값을 신뢰하지 않는다.
  if (raw.isAnonymous) {
    return { authorName: null, isAnonymous: true, message };
  }

  const authorName = raw.authorName?.trim() ?? '';
  if (authorName.length === 0) throw new InvalidAuthorNameError('named_without_name');

  return { authorName, isAnonymous: false, message };
}

/**
 * 빈 슬롯 중 하나를 고른다. 순수 함수 — `random` 을 주입해 테스트한다.
 *
 * 순서대로 채우지 않고 무작위로 고르는 이유는 스티커판 감각이다. 좌표는
 * `data/slot-layout.ts` 에 고정돼 있고 **배정만** 무작위다.
 */
export function pickEmptySlot(slots: readonly PageSlot[], random: () => number = Math.random): number | null {
  const empty = slots.filter((slot) => slot.grape === null);
  if (empty.length === 0) return null;

  return empty[Math.floor(random() * empty.length)].slotIndex;
}

export type SubmitGrapeInput = GrapeInput & {
  slug: string;
  pageIndex: number;
  /** 로그인한 사람의 User.id. 미로그인 방문자면 null (기본 경로). */
  actorId?: string | null;
};

/**
 * 방문자가 보고 있는 페이지에 칭찬을 붙인다.
 *
 * 슬롯 충돌은 사용자에게 보이지 않는다 — 다른 빈 슬롯으로 조용히 다시 시도한다.
 * 매번 페이지를 다시 읽는 이유는, 충돌했다는 건 그 사이 판이 바뀌었다는 뜻이라
 * 낡은 목록으로 재시도하면 같은 충돌을 반복하기 때문이다.
 *
 * @throws {VineNotFoundError} 없는 슬러그
 * @throws {PageFullError} 이 페이지에 빈 슬롯이 없음
 * @throws {OwnerCannotAddGrapeError} 주인 본인 (PRD §7-7)
 */
export async function submitGrape(
  repository: VineRepository,
  input: SubmitGrapeInput,
  options: { attempts?: number; random?: () => number } = {},
): Promise<AttachedGrape> {
  const payload = normalizeGrapeInput(input);
  const attempts = options.attempts ?? SLOT_ATTEMPTS;

  const vine = await repository.getVineBySlug(input.slug);
  if (!vine) throw new VineNotFoundError({ slug: input.slug });

  const pages = await repository.listPages(vine.id);
  const page = pages.find((candidate) => candidate.pageIndex === input.pageIndex);
  if (!page) throw new PageFullError(input.pageIndex);

  let lastConflict: SlotTakenError | undefined;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const view = await repository.getPage(vine.id, input.pageIndex);
    if (!view) throw new PageFullError(input.pageIndex);

    const slotIndex = pickEmptySlot(view.slots, options.random);
    if (slotIndex === null) throw new PageFullError(input.pageIndex);

    try {
      return await repository.addGrape(page.id, slotIndex, payload, { actorId: input.actorId });
    } catch (error) {
      // 슬롯 충돌만 재시도한다. 주인 차단·길이 초과 등은 다시 시도해봐야
      // 같은 결과라 즉시 올린다.
      if (!(error instanceof SlotTakenError)) throw error;
      lastConflict = error;
    }
  }

  // 15칸짜리 판에서 5번 연속 충돌은 사실상 판이 찬 상태다.
  throw new PageFullError(input.pageIndex, { cause: lastConflict });
}
