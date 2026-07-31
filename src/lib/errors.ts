/**
 * 도메인 에러.
 *
 * 백엔드가 내는 에러(Postgres SQLSTATE, Firestore 코드 …)는 어댑터 안에서
 * 여기 정의된 타입으로 **번역**된다. services/ 와 app/ 은 백엔드를 모른다.
 * 이게 경로 A↔B 를 갈아끼울 수 있게 만드는 실질적인 장치다.
 */

export type DomainErrorCode =
  | 'SLOT_TAKEN'
  | 'VINE_NOT_FOUND'
  | 'PAGE_NOT_FOUND'
  | 'OWNER_ALREADY_HAS_VINE'
  | 'SLUG_COLLISION'
  | 'SLUG_EXHAUSTED'
  | 'MESSAGE_TOO_LONG'
  | 'INVALID_AUTHOR_NAME'
  | 'REPOSITORY_FAILURE'
  | 'INVALID_SIGNUP_INPUT'
  | 'LOGIN_ID_TAKEN'
  | 'INVALID_CREDENTIALS'
  | 'AUTH_FAILURE';

export abstract class DomainError extends Error {
  abstract readonly code: DomainErrorCode;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}

/**
 * 슬롯 동시 점유 (PRD §7-4). `UNIQUE(page_id, slot_index)` 위반.
 * 서버가 다른 빈 슬롯으로 재시도하는 신호이지, 사용자에게 보여줄 에러가 아니다.
 */
export class SlotTakenError extends DomainError {
  readonly code = 'SLOT_TAKEN' as const;

  constructor(
    readonly pageId: string,
    readonly slotIndex: number,
    options?: ErrorOptions,
  ) {
    super(`slot ${slotIndex} on page ${pageId} is already taken`, options);
  }
}

export class VineNotFoundError extends DomainError {
  readonly code = 'VINE_NOT_FOUND' as const;

  constructor(
    readonly lookup: { slug: string } | { vineId: string } | { ownerId: string },
    options?: ErrorOptions,
  ) {
    super(`vine not found: ${JSON.stringify(lookup)}`, options);
  }
}

export class PageNotFoundError extends DomainError {
  readonly code = 'PAGE_NOT_FOUND' as const;

  constructor(
    readonly lookup: { pageId: string } | { vineId: string; pageIndex: number },
    options?: ErrorOptions,
  ) {
    super(`page not found: ${JSON.stringify(lookup)}`, options);
  }
}

/** PRD §7-1 판은 사용자당 1개. `UNIQUE(vines.owner_id)` 위반. */
export class OwnerAlreadyHasVineError extends DomainError {
  readonly code = 'OWNER_ALREADY_HAS_VINE' as const;

  constructor(
    readonly ownerId: string,
    options?: ErrorOptions,
  ) {
    super(`owner ${ownerId} already has a vine`, options);
  }
}

/** 슬러그 중복. services/slug.ts 의 재시도 루프가 잡아서 다시 뽑는다. */
export class SlugCollisionError extends DomainError {
  readonly code = 'SLUG_COLLISION' as const;

  constructor(
    readonly slug: string,
    options?: ErrorOptions,
  ) {
    super(`slug already in use: ${slug}`, options);
  }
}

/** 재시도를 다 쓰고도 빈 슬러그를 못 찾음. 사실상 발생 불가(50비트 엔트로피). */
export class SlugExhaustedError extends DomainError {
  readonly code = 'SLUG_EXHAUSTED' as const;

  constructor(
    readonly attempts: number,
    options?: ErrorOptions,
  ) {
    super(`could not find a free slug after ${attempts} attempts`, options);
  }
}

/** PRD §7-8. `CHECK char_length(message) <= 80` 위반. */
export class MessageTooLongError extends DomainError {
  readonly code = 'MESSAGE_TOO_LONG' as const;

  constructor(
    readonly limit: number,
    options?: ErrorOptions,
  ) {
    super(`message exceeds ${limit} characters`, options);
  }
}

/**
 * 익명인데 이름이 있거나(절대규칙 3), 기명인데 이름이 없음(PRD §7-6).
 * 전자는 어댑터가 저장 전에 null 로 강제하므로 여기까지 오면 안 되는 값이다.
 */
export class InvalidAuthorNameError extends DomainError {
  readonly code = 'INVALID_AUTHOR_NAME' as const;

  constructor(
    readonly reason: 'anonymous_with_name' | 'named_without_name',
    options?: ErrorOptions,
  ) {
    super(`invalid author name: ${reason}`, options);
  }
}

/** 도메인 규칙이 아닌 백엔드 실패(네트워크, 권한, 알 수 없는 SQLSTATE 등). */
export class RepositoryFailureError extends DomainError {
  readonly code = 'REPOSITORY_FAILURE' as const;

  constructor(
    readonly operation: string,
    options?: ErrorOptions,
  ) {
    super(`repository operation failed: ${operation}`, options);
  }
}

// --- 계정 (STEP 4) -----------------------------------------------------------

/** 가입 입력이 형식을 못 맞춤. 어느 필드인지 `field` 로 구분한다. */
export class InvalidSignUpInputError extends DomainError {
  readonly code = 'INVALID_SIGNUP_INPUT' as const;

  constructor(
    readonly field: 'loginId' | 'password' | 'displayName',
    options?: ErrorOptions,
  ) {
    super(`invalid sign-up input: ${field}`, options);
  }
}

/**
 * 이미 쓰이는 loginId.
 * loginId ↔ 합성 이메일이 1:1 이라 auth 쪽 이메일 중복이 곧 이 에러다.
 */
export class LoginIdTakenError extends DomainError {
  readonly code = 'LOGIN_ID_TAKEN' as const;

  constructor(
    readonly loginId: string,
    options?: ErrorOptions,
  ) {
    super(`login id already taken: ${loginId}`, options);
  }
}

/**
 * 아이디 또는 비밀번호 불일치.
 * 어느 쪽이 틀렸는지 구분하지 않는다 — 구분하면 아이디 존재 여부가 새어나간다.
 */
export class InvalidCredentialsError extends DomainError {
  readonly code = 'INVALID_CREDENTIALS' as const;

  constructor(options?: ErrorOptions) {
    super('invalid login id or password', options);
  }
}

/** 도메인 규칙이 아닌 인증 백엔드 실패. */
export class AuthFailureError extends DomainError {
  readonly code = 'AUTH_FAILURE' as const;

  constructor(
    readonly operation: string,
    options?: ErrorOptions,
  ) {
    super(`auth operation failed: ${operation}`, options);
  }
}
