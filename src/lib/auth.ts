import { InvalidSignUpInputError } from '@/lib/errors';

/**
 * 계정 관련 순수 규칙. I/O 없음 — 세션·DB 는 services/auth.ts 소관.
 */

/**
 * loginId → Supabase Auth 이메일.
 *
 * 피그마 §5.4 는 `ID / PASSWORD` UI 인데 Supabase Auth 는 이메일이 필수다.
 * 내부에서만 이메일로 매핑해 UI 를 지킨다. `.local` 은 RFC 6762 예약 TLD 라
 * 실제로 배달될 수 없는 주소이고, 이 서비스는 메일을 보내지 않으므로 문제없다.
 * (가입은 admin.createUser + email_confirm 이라 확인 메일 자체가 나가지 않는다.)
 */
export const SYNTHETIC_EMAIL_DOMAIN = 'grapevine.local';

export function toSyntheticEmail(loginId: string): string {
  return `${loginId.toLowerCase()}@${SYNTHETIC_EMAIL_DOMAIN}`;
}

/**
 * loginId 는 이메일의 local part 가 되므로 거기 안전한 문자로 제한한다.
 * 제한하지 않으면 `a@b.com` 같은 입력이 주소를 통째로 바꿔버린다.
 */
const LOGIN_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{2,29}$/i;

/** Supabase Auth 기본 최소 길이. 우리가 따로 더 세게 걸지 않는다. */
const PASSWORD_MIN_LENGTH = 6;

/**
 * displayName 상한.
 * ⚠️ PRD 에 값이 없어 잠정으로 정한 수다. "Compliment {name}" 한 줄에 들어가야
 * 하므로 짧아야 한다는 근거뿐이고, 확정되면 DB CHECK 로도 내려야 한다.
 */
const DISPLAY_NAME_MAX_LENGTH = 40;

export type SignUpInput = {
  loginId: string;
  password: string;
  displayName: string;
};

/**
 * 가입 입력 검증 + 정규화. 순수 함수.
 * @throws {InvalidSignUpInputError}
 */
export function normalizeSignUpInput(raw: SignUpInput): SignUpInput {
  const loginId = raw.loginId.trim();
  const displayName = raw.displayName.trim();

  if (!LOGIN_ID_PATTERN.test(loginId)) {
    throw new InvalidSignUpInputError('loginId');
  }
  if (raw.password.length < PASSWORD_MIN_LENGTH) {
    throw new InvalidSignUpInputError('password');
  }
  // 코드포인트 기준 — message 80자 제한과 같은 셈법을 쓴다.
  const displayNameLength = Array.from(displayName).length;
  if (displayNameLength === 0 || displayNameLength > DISPLAY_NAME_MAX_LENGTH) {
    throw new InvalidSignUpInputError('displayName');
  }

  return { loginId, password: raw.password, displayName };
}
