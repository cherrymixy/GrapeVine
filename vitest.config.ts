import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // 'server-only' 는 Next 번들러 밖(=vitest)에서 import 되면 throw 한다.
      // 서버 전용 모듈을 테스트에서 불러올 수 있도록 no-op 으로 치환한다.
      'server-only': fileURLToPath(new URL('./vitest.server-only.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
    // 원격 Supabase 왕복은 기본 5초를 넘길 수 있다.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
