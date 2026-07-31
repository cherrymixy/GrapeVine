import type { PageView, Vine } from '@/models';
import type { VineRepository } from '@/repositories/vine-repository';
import { clampPageIndex } from '@/services/visitor';

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

export type VisitorPage = {
  vine: Vine;
  view: PageView;
};

/**
 * `/v/[slug]` 가 필요한 것 전부를 한 번에.
 *
 * 라우트가 `?page` 를 직접 해석하지 않도록 클램프까지 여기서 끝낸다.
 * 판이 없으면 `null` — 404 로 만들지 여부는 라우트가 판단한다.
 */
export async function getVisitorPage(
  repository: VineRepository,
  slug: string,
  rawPage: string | string[] | undefined,
): Promise<VisitorPage | null> {
  const vine = await repository.getVineBySlug(slug);
  if (!vine) return null;

  const pages = await repository.listPages(vine.id);
  const pageIndex = clampPageIndex(rawPage, pages.length);

  const view = await repository.getPage(vine.id, pageIndex);
  // 판이 있는데 페이지가 없는 건 데이터가 깨진 상태다. 클램프를 통과한
  // 번호라 여기 도달하면 안 되고, 도달했다면 404 로 감추지 않고 드러낸다.
  if (!view) return null;

  return { vine, view };
}
