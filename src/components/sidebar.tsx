import { copy } from '@/data';

import styles from './sidebar.module.css';

/**
 * 공통 셸의 우상단 세로 스택 사이드바 (PRD §5.0 / Figma 201:647~652, 201:771~776).
 *
 * 모달은 쿼리 파라미터로 연다(`?modal=share`). 클라이언트 상태 없이 서버
 * 렌더만으로 동작하고, 링크로 바로 열 수 있으며, JS 없이도 된다.
 */

export type SidebarVariant = 'guest' | 'owner';

export function Sidebar({ variant, current }: { variant: SidebarVariant; current?: string }) {
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
