import type { PageView, User, Vine } from '@/models';
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
  /** `{이름}'s Vine` / `Compliment {이름}` 표시용 (PRD §5.9·§5.10). */
  owner: User;
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

  const [owner, view] = await Promise.all([
    repository.getOwner(vine.id),
    repository.getPage(vine.id, pageIndex),
  ]);

  // 클램프가 1..pages.length 를 보장하므로 여기 도달하지 않는다. 도달했다면
  // 페이지가 사라졌거나 주인이 지워진 것 — 어느 쪽이든 방문자에게는 없는
  // 판과 같으므로 null 로 내린다(라우트가 404 로 만든다).
  if (!owner || !view) return null;

  return { vine, owner, view };
}
