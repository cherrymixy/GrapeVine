import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase 클라이언트 초기화.
 *
 * 이 모듈은 서버 전용이다 ('server-only'가 빌드타임에 강제).
 * service role 키가 클라이언트 번들에 들어가면 DB 전체가 열리므로,
 * 모든 DB 접근은 Route Handler / Server Action을 경유한다.
 *
 * 도메인 로직은 여기 두지 않는다. repositories/ 소관.
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

const CLIENT_OPTIONS = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
} as const;

/**
 * 환경변수 이름은 Supabase 대시보드의 현재 라벨(Publishable / Secret)을 따른다.
 * 구버전 라벨과의 대응: publishable = anon, secret = service_role.
 * 함수 이름은 Postgres 역할 기준이다 — RLS 를 따질 때 중요한 건 키가 아니라 역할이라서.
 */

/**
 * service_role 로 붙는 특권 클라이언트. RLS 를 우회한다. RPC 호출과 쓰기에 사용.
 * 요청마다 새로 만든다 — 서버리스에서 인스턴스를 공유하면 상태가 섞인다.
 */
export function createServiceRoleClient(): SupabaseClient {
  return createClient(
    requireEnv('SUPABASE_URL'),
    requireEnv('SUPABASE_SECRET_KEY'),
    CLIENT_OPTIONS,
  );
}

/**
 * anon 역할로 붙는 클라이언트. 인증 호출(STEP 4)에 사용한다.
 * 브라우저로 내려보내지 않는다 — 서버에서만 호출한다.
 */
export function createAnonClient(): SupabaseClient {
  return createClient(
    requireEnv('SUPABASE_URL'),
    requireEnv('SUPABASE_PUBLISHABLE_KEY'),
    CLIENT_OPTIONS,
  );
}
