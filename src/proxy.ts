import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * 라우트 가드 (Next 16 `proxy` — 구 `middleware`).
 *
 * ⚠️ 이건 **두 겹 중 바깥쪽**이다. Next 공식 문서가 경고한다:
 *   "Always verify authentication and authorization inside each Server Function
 *    rather than relying on Proxy alone."
 * matcher 를 손대거나 라우트를 옮기면 커버리지가 조용히 사라질 수 있으므로,
 * `/my` 페이지는 이 가드와 별개로 자기 세션을 다시 확인한다.
 *
 * 여기서 하는 일은 두 가지다.
 * 1. 만료가 임박한 세션 쿠키 갱신 (getUser 가 부수효과로 처리)
 * 2. 미인증 사용자를 `/login` 으로 보내는 UX 리다이렉트
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getSession() 이 아니라 getUser(). 전자는 쿠키를 그대로 믿어서 위조 가능하다.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.search = '';
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

/**
 * `/my` 만 매칭한다.
 *
 * `/v/[slug]` 가 목록에 **없다**는 사실이 절대규칙 4(세션과 무관하게 항상 공개)를
 * 보장한다. 코드로 "공개로 둔다"가 아니라 가드가 애초에 실행되지 않는 구조다.
 */
export const config = {
  matcher: ['/my'],
};
