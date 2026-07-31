import { copy } from '@/data';

import styles from './pagination.module.css';

/**
 * 좌상단 `1/2 >` (PRD §5.0 / Figma 201:867 · 201:869).
 *
 * 마지막 페이지에서는 `>` 를 내보내지 않는다 — 갈 곳 없는 링크를 남기지 않는다.
 */
export function Pagination({
  pageIndex,
  totalPages,
  hrefFor,
}: {
  pageIndex: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}) {
  const hasNext = pageIndex < totalPages;

  return (
    <div
      className={styles.pagination}
      data-testid="pagination"
      data-page={pageIndex}
      data-total={totalPages}
    >
      {/* 값을 텍스트로만 두면 React 가 인접 표현식 사이에 주석 노드를 끼워
          `1<!-- -->/<!-- -->2` 로 렌더된다. 한 덩어리로 만든다. */}
      <span>{`${pageIndex}/${totalPages}`}</span>
      {hasNext ? (
        <a className={styles.next} data-testid="next-page" href={hrefFor(pageIndex + 1)}>
          {copy.shell.nextPage}
        </a>
      ) : null}
    </div>
  );
}
