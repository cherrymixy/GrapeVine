import type { PageView } from '@/models';
import type { VineRepository } from '@/repositories/vine-repository';

/**
 * 판 열람 유스케이스.
 *
 * 리포지토리(A↔B 교체점)에 두지 않는 이유: 슬러그로 판을 찾아 페이지를 여는 건
 * **유스케이스**지 저장소 원시 연산이 아니다. 리포지토리는 `getVineBySlug` 와
 * `getPage` 라는 두 원시 연산만 알면 된다.
 */

/**
 * 공유 링크로 페이지를 연다.
 *
 * 반환되는 `slots` 는 **항상 capacity(15)개**다. 빈 칸도 자리를 지켜야
 * `data/slot-layout.ts` 의 좌표와 인덱스로 1:1 대응된다 (절대규칙 5).
 *
 * 없는 슬러그·없는 페이지는 `null`. 404 로 만들지 여부는 라우트가 판단한다.
 */
export async function getPageView(
  repository: VineRepository,
  slug: string,
  pageIndex: number,
): Promise<PageView | null> {
  const vine = await repository.getVineBySlug(slug);
  if (!vine) return null;

  return repository.getPage(vine.id, pageIndex);
}
