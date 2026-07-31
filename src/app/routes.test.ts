import { type ChildProcess, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PAGE_CAPACITY } from '@/data/slot-layout';
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

describe.skipIf(!hasCredentials)('라우트 (실서버)', () => {
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

  describe('방문자 라우트', () => {
    it('없는 슬러그는 404 다', async () => {
      const response = await fetch(`${BASE}/v/nosuchslug`, { redirect: 'manual' });

      expect(response.status).toBe(404);
    });

    // 핵심 루프: 판 생성 → 링크 공유 → 방문자가 붙이기 → 주인이 열람.
    it('주인이 판을 만들고 미로그인 방문자가 칭찬을 붙인다', async () => {
      const loginId = `l${Date.now().toString(36)}`;
      const signUp = await signUpViaHttp(loginId, 'Blair');
      const ownerCookie = toCookieHeader(signUp);

      // 1) Create My Vine
      const created = await fetch(`${BASE}/api/vine`, {
        method: 'POST',
        redirect: 'manual',
        headers: { cookie: ownerCookie },
      });
      expect(created.status).toBe(303);

      // 2) /my 에 공유 URL 이 뜬다
      const my = await fetch(`${BASE}/my`, { redirect: 'manual', headers: { cookie: ownerCookie } });
      const myHtml = await my.text();
      const shareUrl = /data-testid="share-url"[^>]*value="([^"]+)"/.exec(myHtml)?.[1];
      expect(shareUrl).toMatch(/\/v\/[a-z0-9]{10}$/);
      const slug = shareUrl!.split('/v/')[1];

      // 3) 미로그인 방문자가 붙인다 — 쿠키 없음, 슬롯도 안 고른다
      const added = await fetch(`${BASE}/api/v/${slug}/grape`, {
        method: 'POST',
        redirect: 'manual',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ page: '1', authorName: 'Clara', message: 'You are kind.' }),
      });
      expect(added.status).toBe(303);
      expect(added.headers.get('location')).not.toContain('error=');

      // 4) 판에 반영된다 — 정확히 한 칸
      const board = await fetch(`${BASE}/v/${slug}`, { redirect: 'manual' });
      const boardHtml = await board.text();
      expect(boardHtml).toContain("Blair&#x27;s Vine");
      expect(boardHtml.match(/data-filled="true"/g)).toHaveLength(1);

      // 5) 주인 본인은 막힌다 (PRD §7-7)
      const byOwner = await fetch(`${BASE}/api/v/${slug}/grape`, {
        method: 'POST',
        redirect: 'manual',
        headers: {
          cookie: ownerCookie,
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ page: '1', authorName: 'Blair', message: 'self praise' }),
      });
      expect(byOwner.headers.get('location')).toContain('error=OWNER_CANNOT_ADD_GRAPE');

      // 6) 빈 메시지도 막힌다
      const blank = await fetch(`${BASE}/api/v/${slug}/grape`, {
        method: 'POST',
        redirect: 'manual',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ page: '1', authorName: 'Clara', message: '   ' }),
      });
      expect(blank.headers.get('location')).toContain('error=EMPTY_MESSAGE');

      // 막힌 두 번의 시도가 슬롯을 소모하지 않았는지 확인한다.
      const after = await fetch(`${BASE}/v/${slug}`, { redirect: 'manual' });
      expect((await after.text()).match(/data-filled="true"/g)).toHaveLength(1);
    });

    it('?page 가 범위 밖이면 1페이지를 보여준다', async () => {
      const loginId = `c${Date.now().toString(36)}`;
      await signUpViaHttp(loginId, 'Clamp');
      const ownerId = createdAuthUserIds.at(-1)!;

      const repository = new SupabaseVineRepository(admin);
      const { vine, firstPage } = await repository.createVine(ownerId);

      // 15칸을 채워 페이지 2를 만든다 — 클램프가 실제 페이지 수를 본다는 걸
      // 보이려면 페이지가 둘 이상이어야 한다.
      for (let slotIndex = 0; slotIndex < PAGE_CAPACITY; slotIndex += 1) {
        await repository.addGrape(firstPage.id, slotIndex, {
          authorName: 'Clara',
          isAnonymous: false,
          message: `praise ${slotIndex}`,
        });
      }

      const pageOf = async (query: string) => {
        const response = await fetch(`${BASE}/v/${vine.slug}${query}`, { redirect: 'manual' });
        expect(response.status).toBe(200);
        const html = await response.text();
        const tag = /<p[^>]*data-testid="pagination"[^>]*>/.exec(html)?.[0] ?? '';
        return [
          /data-page="(\d+)"/.exec(tag)?.[1],
          /data-total="(\d+)"/.exec(tag)?.[1],
        ];
      };

      expect(await pageOf('')).toEqual(['1', '2']);
      expect(await pageOf('?page=2')).toEqual(['2', '2']);
      // 범위 밖은 전부 1로.
      expect(await pageOf('?page=99')).toEqual(['1', '2']);
      expect(await pageOf('?page=0')).toEqual(['1', '2']);
      expect(await pageOf('?page=abc')).toEqual(['1', '2']);
    });
  });
});
