import { type ChildProcess, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createServiceRoleClient } from '@/lib/supabase';
import { SupabaseVineRepository } from '@/repositories/supabase-vine-repository';

/**
 * 라우트 가드를 **실제 HTTP 로** 검증한다.
 *
 * 미들웨어/가드는 단위 테스트로는 못 잡는다 — matcher 가 안 걸리거나 쿠키가
 * 응답에 안 실리는 실패가 전부 배선 문제라서, 진짜 서버를 띄워야 의미가 있다.
 */

const hasCredentials = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
const PORT = 3117;
const BASE = `http://127.0.0.1:${PORT}`;
const PROJECT_ROOT = fileURLToPath(new URL('../..', import.meta.url));

function run(command: string, args: string[]): Promise<ChildProcess> {
  const child = spawn(command, args, { cwd: PROJECT_ROOT, stdio: 'pipe' });
  return Promise.resolve(child);
}

async function waitForServer(timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE}/`, { redirect: 'manual' });
      if (response.status > 0) return;
    } catch {
      // 아직 안 떴다.
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`server did not start on ${BASE}`);
}

/** Set-Cookie 배열 → 요청에 붙일 Cookie 헤더. */
function toCookieHeader(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(';')[0])
    .join('; ');
}

describe.skipIf(!hasCredentials)('auth 라우트 가드 (실서버)', () => {
  let server: ChildProcess;
  let admin: SupabaseClient;
  const createdAuthUserIds: string[] = [];

  beforeAll(async () => {
    admin = createServiceRoleClient();

    // dev 서버는 최초 요청에서 지연 컴파일이 일어나 타이밍이 흔들린다.
    // 프로덕션 빌드로 띄워 배선을 있는 그대로 본다.
    const build = await run('npx', ['next', 'build']);
    await new Promise<void>((resolve, reject) => {
      build.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`build failed ${code}`))));
    });

    server = await run('npx', ['next', 'start', '-p', String(PORT)]);
    await waitForServer();
  }, 180_000);

  afterAll(async () => {
    server?.kill('SIGTERM');
    // auth 사용자 삭제 → public.users → vines → vine_pages → grapes 까지 cascade.
    for (const id of createdAuthUserIds) {
      await admin.auth.admin.deleteUser(id);
    }
  }, 60_000);

  async function signUpViaHttp(loginId: string, displayName: string) {
    const response = await fetch(`${BASE}/api/auth/signup`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ loginId, password: 'test-password-123', displayName }),
    });

    const { data } = await admin.auth.admin.listUsers();
    const created = data.users.find((u) => u.email?.startsWith(`${loginId.toLowerCase()}@`));
    if (created) createdAuthUserIds.push(created.id);

    return response;
  }

  it('미로그인으로 /my 에 접근하면 /login 으로 리다이렉트된다', async () => {
    const response = await fetch(`${BASE}/my`, { redirect: 'manual' });

    expect([302, 303, 307]).toContain(response.status);
    expect(response.headers.get('location')).toContain('/login');
  });

  it('로그인하면 /my 를 통과하고 displayName 이 보인다', async () => {
    const loginId = `t${Date.now().toString(36)}`;
    const signUpResponse = await signUpViaHttp(loginId, 'Blair');

    expect(signUpResponse.status).toBe(303);
    expect(signUpResponse.headers.get('location')).toContain('/my');

    const cookie = toCookieHeader(signUpResponse);
    expect(cookie).not.toBe('');

    const myResponse = await fetch(`${BASE}/my`, { redirect: 'manual', headers: { cookie } });

    expect(myResponse.status).toBe(200);
    await expect(myResponse.text()).resolves.toContain('Blair');
  });

  it('/v/[slug] 는 세션과 무관하게 항상 공개다', async () => {
    const loginId = `p${Date.now().toString(36)}`;
    await signUpViaHttp(loginId, 'Owner');

    const ownerId = createdAuthUserIds.at(-1);
    expect(ownerId).toBeDefined();

    const { vine } = await new SupabaseVineRepository(admin).createVine(ownerId!);

    // 쿠키 없이 — 방문자와 동일한 조건.
    const response = await fetch(`${BASE}/v/${vine.slug}`, { redirect: 'manual' });

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });
});
