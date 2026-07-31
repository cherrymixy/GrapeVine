import { CtaButton } from '@/components/cta-button';
import { Screen } from '@/components/screen';
import { copy } from '@/data';

import styles from './status.module.css';

/**
 * 없는 판 (STEP 20).
 *
 * 지금까지는 Next 기본 404 가 나왔다 — 시스템 폰트에 검정/흰색이라 이
 * 서비스와 아무 상관없는 화면이다. **공유 링크가 낡았을 때 사람들이 실제로
 * 보게 되는 화면**이라 그냥 둘 수 없다.
 *
 * ⚠️ Figma 에 404 시안이 없다. 새 디자인을 지어내는 대신 이미 있는 것만
 *    조합했다 — 사진 없는 단색 면(About 과 같은 `Screen`), 헤드라인 크기,
 *    그리고 이 서비스의 CTA 버튼.
 */
export default function NotFound() {
  return (
    <Screen tone="light">
      <div className={styles.center}>
        <h1 className={styles.title}>{copy.notFound.title}</h1>
        <p className={styles.body}>{copy.notFound.body}</p>
        <CtaButton href="/" testId="not-found-home">
          {copy.notFound.home}
        </CtaButton>
      </div>
    </Screen>
  );
}
