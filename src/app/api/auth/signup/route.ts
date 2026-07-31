import { NextResponse } from 'next/server';

import { InvalidSignUpInputError, isDomainError } from '@/lib/errors';
import { signUp } from '@/services/auth';

/**
 * 가입 폼 수신.
 *
 * Server Action 이 아니라 Route Handler 인 이유: 평범한 폼 POST 라 JS 없이
 * 동작하고(회색박스 단계에 맞다), HTTP 로 그대로 테스트할 수 있다.
 *
 * 리다이렉트는 **303**. 302/307 은 메서드를 보존해서 브라우저가 `/my` 로
 * 다시 POST 를 보낸다.
 */
export async function POST(request: Request): Promise<Response> {
  const form = await request.formData();

  try {
    await signUp({
      loginId: String(form.get('loginId') ?? ''),
      password: String(form.get('password') ?? ''),
      displayName: String(form.get('displayName') ?? ''),
    });
  } catch (error) {
    /*
     * ⚠️ 어느 칸이 틀렸는지까지 보낸다.
     *
     * 전에는 코드만 넘겨서 아이디 규칙 위반이든 비번 길이든 이름 누락이든
     * 전부 "아이디·비밀번호·이름을 확인하세요" 하나로 나왔다. 사용자는
     * **무엇을 고쳐야 할지 알 수 없다** — 실제로 이 화면에서 막혔다.
     * `InvalidSignUpInputError` 는 처음부터 `field` 를 들고 있었는데
     * 여기서 버리고 있었다.
     */
    if (error instanceof InvalidSignUpInputError) {
      const byField = {
        loginId: 'SIGNUP_LOGIN_ID',
        password: 'SIGNUP_PASSWORD',
        displayName: 'SIGNUP_DISPLAY_NAME',
      } as const;
      return NextResponse.redirect(
        new URL(`/signup?error=${byField[error.field]}`, request.url),
        303,
      );
    }

    const code = isDomainError(error) ? error.code : 'AUTH_FAILURE';
    if (!isDomainError(error)) console.error('signup failed', error);
    return NextResponse.redirect(new URL(`/signup?error=${code}`, request.url), 303);
  }

  return NextResponse.redirect(new URL('/my', request.url), 303);
}
