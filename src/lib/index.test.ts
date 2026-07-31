import { describe, expect, it } from 'vitest';

import * as lib from '@/lib';

// 스캐폴드 스모크: TS + Vitest + '@/' path alias 배선이 살아 있는지만 확인한다.
// 실제 도메인 테스트는 STEP 2부터.
describe('scaffold', () => {
  it("resolves the '@/' path alias", () => {
    expect(lib).toBeDefined();
  });
});
