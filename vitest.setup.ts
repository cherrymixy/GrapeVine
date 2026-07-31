import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * `.env.local` 을 테스트 프로세스에 로드한다.
 *
 * Supabase 를 실제로 때리는 테스트는 자격증명이 없으면 `describe.skipIf` 로
 * 건너뛴다 — 자격증명 없는 환경(CI 등)에서 실패가 아니라 스킵이어야 한다.
 */
const envPath = fileURLToPath(new URL('./.env.local', import.meta.url));

if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}
