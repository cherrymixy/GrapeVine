import { copy } from '@/data';

import styles from './sidebar.module.css';

/**
 * 공통 셸의 우상단 세로 스택 사이드바 (PRD §5.0 / Figma 201:647~652, 201:771~776).
 *
 * 모달은 쿼리 파라미터로 연다(`?modal=share`). 클라이언트 상태 없이 서버
 * 렌더만으로 동작하고, 링크로 바로 열 수 있으며, JS 없이도 된다.
 */

/**
 * `visitor` 는 `{이름}'s Vine` 단일 항목이다 (PRD §5.0 / Figma 201:787).
 * 남의 판에서는 갈 곳이 없으므로 링크가 아니라 표시다.
 */
export type SidebarVariant = 'guest' | 'owner' | 'visitor';

export function Sidebar({
  variant,
  current,
  ownerName,
}: {
  variant: SidebarVariant;
  current?: string;
  /** `visitor` 일 때 필요. */
  ownerName?: string;
}) {
  if (variant === 'visitor') {
    /*
     * 방문자 화면에는 이것 말고 제목이 없다 (Figma 201:787 — pill 하나뿐).
     * 갈 곳이 없어 링크도 아니므로 `nav` 가 아니라 **페이지 제목**으로 둔다.
     * `nav` 안의 span 으로 두면 이 화면에 h1 이 아예 없어진다.
     */
    return (
      <h1 className={`${styles.sidebar} ${styles.pill}`} data-testid="sidebar" data-variant={variant}>
        {copy.othersVine.title(ownerName ?? '')}
      </h1>
    );
  }

  const items =
    variant === 'guest'
      ? [
          { href: '/about', label: copy.nav.about },
          { href: '/how-it-works', label: copy.nav.howItWorks },
          { href: '/login', label: copy.nav.login },
        ]
      : [
          { href: '/my', label: copy.nav.myVine },
          { href: '/my?modal=share', label: copy.nav.shareMyVine },
          { href: '/my?modal=setting', label: copy.nav.setting },
        ];

  return (
    <nav className={styles.sidebar} data-testid="sidebar" data-variant={variant}>
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.href}>
            <a
              className={styles.pill}
              href={item.href}
              aria-current={item.href === current ? 'page' : undefined}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
