import { SlugCollisionError, SlugExhaustedError } from '@/lib/errors';

/**
 * 공유 슬러그 생성 — PRD §8 "추측 불가 랜덤".
 *
 * 슬러그가 이 서비스의 유일한 접근 통제 수단이다. `/v/[slug]` 는 세션과 무관하게
 * 공개되므로(절대규칙 4), 슬러그를 맞히면 남의 판에 쓸 수 있다.
 * 따라서 `Math.random()` 이 아니라 CSPRNG 를 쓴다.
 */

/**
 * 32자 알파벳. 두 가지 이유로 이 구성이다.
 * - `0/O`, `1/l` 처럼 눈으로 헷갈리는 글자를 뺐다(링크를 손으로 옮겨 적는 경우).
 * - 길이가 정확히 32(=256/8)라서 `byte % 32` 에 모듈로 편향이 없다.
 *   알파벳 길이를 바꾸면 이 성질이 깨지므로 거부 샘플링이 필요해진다.
 */
const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';

export const SLUG_LENGTH = 10;

/** 재시도 횟수. 50비트 엔트로피라 1회 충돌도 사실상 일어나지 않는다. */
export const SLUG_ATTEMPTS = 5;

/** 32^10 ≈ 2^50 — 무차별 대입으로 유효 슬러그를 찾는 게 비현실적인 수준. */
export function generateSlug(length: number = SLUG_LENGTH): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);

  let slug = '';
  for (const byte of bytes) {
    slug += ALPHABET[byte % ALPHABET.length];
  }
  return slug;
}

/**
 * 슬러그를 뽑아 `claim` 에 넘기고, 충돌하면 새로 뽑아 다시 시도한다.
 *
 * "미리 조회해서 비어 있으면 쓴다"가 아니라 **일단 써 보고 실패하면 재시도**다.
 * 사전 조회는 조회와 삽입 사이가 그대로 경쟁 구간이라 충돌을 못 막는다.
 * 실제 방어선은 `UNIQUE(vines.slug)` 이고 이 루프는 그 실패를 흡수할 뿐이다.
 *
 * @param claim 슬러그 하나로 점유를 시도한다. 이미 쓰였으면 SlugCollisionError.
 */
export async function withUniqueSlug<T>(
  claim: (slug: string) => Promise<T>,
  options: { attempts?: number; generate?: () => string } = {},
): Promise<T> {
  const attempts = options.attempts ?? SLUG_ATTEMPTS;
  const generate = options.generate ?? generateSlug;

  let lastCollision: SlugCollisionError | undefined;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await claim(generate());
    } catch (error) {
      if (!(error instanceof SlugCollisionError)) {
        throw error;
      }
      lastCollision = error;
    }
  }

  throw new SlugExhaustedError(attempts, { cause: lastCollision });
}
