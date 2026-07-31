import { copy } from '@/data';

import styles from './back-link.module.css';

/** 좌상단 뒤로가기 `<` (PRD §5.0). */
export function BackLink({ href }: { href: string }) {
  return (
    <a className={styles.back} href={href} data-testid="back">
      {copy.shell.back}
    </a>
  );
}
