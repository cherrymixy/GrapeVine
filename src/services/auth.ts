import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

import { type SignUpInput, normalizeSignUpInput, toSyntheticEmail } from '@/lib/auth';
import {
  AuthFailureError,
  InvalidCredentialsError,
  LoginIdTakenError,
  RepositoryFailureError,
} from '@/lib/errors';
import { createSessionClient } from '@/lib/supabase-server';
import { createServiceRoleClient } from '@/lib/supabase';
import type { User } from '@/models';

/**
 * 계정 유스케이스.
 *
 * 두 클라이언트를 나눠 쓴다:
 * - 세션 클라이언트(publishable): 로그인/로그아웃/세션 확인. 쿠키를 다룬다.
 * - service_role 클라이언트: 사용자 생성(Admin API)과 프로필 테이블 쓰기.
 */

type AuthLikeError = { code?: string; status?: number; message?: string };

function isEmailTaken(error: AuthLikeError): boolean {
  if (error.code === 'email_exists' || error.code === 'user_already_exists') return true;
  return /already (been )?registered|already exists/i.test(error.message ?? '');
}

/**
 * 프로필 행을 보장한다. **멱등** — 몇 번 불려도 안전하다.
 *
 * `admin.createUser` 는 HTTP 호출이라 우리 SQL 과 한 트랜잭션에 묶을 수 없다.
 * 그래서 원자성을 흉내내는 대신, 가입과 로그인 **양쪽**에서 이걸 불러
 * 프로필이 없는 상태가 다음 로그인에 스스로 낫도록 만든다.
 * 보상 삭제를 쓰지 않는 이유는 STEP 3b 와 같다 — 보상 자체가 실패할 수 있다.
 */
export async function ensureProfile(
  client: SupabaseClient,
  profile: { id: string; loginId: string; displayName: string },
): Promise<User> {
  const { error: upsertError } = await client
    .from('users')
    .upsert(
      { id: profile.id, login_id: profile.loginId, display_name: profile.displayName },
      { onConflict: 'id', ignoreDuplicates: true },
    );

  if (upsertError) throw new RepositoryFailureError('ensureProfile/upsert', { cause: upsertError });

  const { data, error } = await client
    .from('users')
    .select()
    .eq('id', profile.id)
    .single<{ id: string; login_id: string; display_name: string; created_at: string }>();

  if (error) throw new RepositoryFailureError('ensureProfile/select', { cause: error });

  return {
    id: data.id,
    loginId: data.login_id,
    displayName: data.display_name,
    createdAt: data.created_at,
  };
}

/**
 * 가입 후 곧바로 로그인시킨다.
 *
 * `signUp()` 이 아니라 Admin API 를 쓰는 이유: 이 프로젝트는 이메일 확인이
 * 켜져 있는데(`mailer_autoconfirm: false`) 합성 주소는 메일을 받을 수 없어
 * 확인이 영원히 끝나지 않는다. `email_confirm: true` 로 확인된 사용자를
 * 바로 만들면 메일이 나가지 않고 대시보드 설정도 건드릴 필요가 없다.
 *
 * @throws {InvalidSignUpInputError} 입력 형식
 * @throws {LoginIdTakenError} 이미 쓰이는 아이디
 */
export async function signUp(raw: SignUpInput): Promise<User> {
  const input = normalizeSignUpInput(raw);
  const admin = createServiceRoleClient();

  const { data, error } = await admin.auth.admin.createUser({
    email: toSyntheticEmail(input.loginId),
    password: input.password,
    email_confirm: true,
    user_metadata: { login_id: input.loginId, display_name: input.displayName },
  });

  if (error) {
    if (isEmailTaken(error)) throw new LoginIdTakenError(input.loginId, { cause: error });
    throw new AuthFailureError('signUp/createUser', { cause: error });
  }
  if (!data.user) throw new AuthFailureError('signUp/no-user');

  const user = await ensureProfile(admin, {
    id: data.user.id,
    loginId: input.loginId,
    displayName: input.displayName,
  });

  // 가입 직후 바로 로그인 상태로 만든다 — /my 로 보내야 하므로.
  await signIn(input.loginId, input.password);

  return user;
}

/**
 * 로그인. 세션 쿠키는 세션 클라이언트가 설정한다.
 * @throws {InvalidCredentialsError} 아이디 또는 비밀번호 불일치
 */
export async function signIn(loginId: string, password: string): Promise<User> {
  const session = await createSessionClient();

  const { data, error } = await session.auth.signInWithPassword({
    email: toSyntheticEmail(loginId.trim()),
    password,
  });

  // 아이디가 없는 경우와 비밀번호가 틀린 경우를 구분하지 않는다.
  // 구분하면 어떤 아이디가 존재하는지가 새어나간다.
  if (error) throw new InvalidCredentialsError({ cause: error });
  if (!data.user) throw new AuthFailureError('signIn/no-user');

  // 프로필이 없으면 여기서 만들어진다 — 가입 도중 실패한 경우의 자가 치유.
  const metadata = data.user.user_metadata ?? {};
  return ensureProfile(createServiceRoleClient(), {
    id: data.user.id,
    loginId: String(metadata.login_id ?? loginId.trim()),
    displayName: String(metadata.display_name ?? loginId.trim()),
  });
}

/**
 * 로그아웃.
 *
 * ⚠️ `scope: 'local'` 이 필수다. Supabase 기본값은 `'global'` 이라 그 계정의
 *    **모든 세션**을 끊는다 — 노트북에서 로그아웃하면 폰에서도 로그아웃된다.
 *    실제로 밟았다(기기 두 대를 흉내내 확인). 지금 이 브라우저만 끊는다.
 */
export async function signOut(): Promise<void> {
  const session = await createSessionClient();
  const { error } = await session.auth.signOut({ scope: 'local' });
  if (error) throw new AuthFailureError('signOut', { cause: error });
}

/**
 * 현재 로그인한 주인. 없으면 null.
 *
 * `getSession()` 이 아니라 `getUser()` 를 쓴다 — `getSession()` 은 쿠키를
 * 그대로 믿기 때문에 위조가 가능하다. `getUser()` 는 인증 서버에 토큰을
 * 검증시킨다. 가드에 쓰는 값이므로 반드시 후자여야 한다.
 */
export async function getCurrentUser(): Promise<User | null> {
  // 세션 쿠키가 아예 없으면 인증 서버에 물어볼 이유가 없다.
  // `/v/[slug]` 는 링크 공유형이라 미로그인 방문자가 대부분인데,
  // 그 전원이 GoTrue 왕복 + DB 조회를 한 번씩 낭비하고 있었다.
  const cookieStore = await cookies();
  if (!cookieStore.getAll().some((cookie) => cookie.name.startsWith('sb-'))) {
    return null;
  }

  const session = await createSessionClient();
  const { data, error } = await session.auth.getUser();

  if (error || !data.user) return null;

  const admin = createServiceRoleClient();
  const { data: row } = await admin
    .from('users')
    .select()
    .eq('id', data.user.id)
    .maybeSingle<{ id: string; login_id: string; display_name: string; created_at: string }>();

  if (!row) return null;

  return {
    id: row.id,
    loginId: row.login_id,
    displayName: row.display_name,
    createdAt: row.created_at,
  };
}
