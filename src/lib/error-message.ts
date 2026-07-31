import { copy } from '@/data';

type ErrorCode = keyof typeof copy.errors;

/**
 * 에러 코드를 사람이 읽을 문장으로 (STEP 20).
 *
 * ⚠️ 이걸 거치지 않으면 `MESSAGE_TOO_LONG` 같은 **코드가 그대로 화면에
 *    나온다.** STEP 7 부터 그래 왔다 — `?error=` 를 그대로 렌더했다.
 *
 * 모르는 코드는 `UNKNOWN` 으로 떨어뜨린다. 주소는 누구나 고칠 수 있으므로
 * `?error=<아무거나>` 가 화면에 그대로 찍히면 안 된다.
 */
export function errorMessage(code: string | undefined | null): string | null {
  if (!code) return null;
  return copy.errors[code as ErrorCode] ?? copy.errors.UNKNOWN;
}
