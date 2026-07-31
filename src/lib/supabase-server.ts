import 'server-only';

import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * 세션 쿠키를 다루는 Supabase 클라이언트.
 *
 * publishable 키를 쓰지만 **서버에서만** 만든다 — 브라우저로 내려보내지 않는다.
 * 이 클라이언트는 인증(로그인/로그아웃/세션 확인) 전용이고, DB 접근은
 * 여전히 `lib/supabase.ts` 의 service_role 클라이언트가 담당한다.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `환경변수 ${name} 가 비어 있습니다. .env.example 을 참고해 .env.local 에 설정하세요.`,
    );
  }
  return value;
}

export async function createSessionClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  return createServerClient(
    requireEnv('SUPABASE_URL'),
    requireEnv('SUPABASE_PUBLISHABLE_KEY'),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Component 에서는 쿠키를 쓸 수 없다. 세션 갱신은
            // proxy.ts 가 담당하므로 여기서 조용히 넘어가도 된다.
          }
        },
      },
    },
  );
}
