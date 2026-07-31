import { BackLink } from '@/components/back-link';
import { DecorGrapes, type DecorGrape } from '@/components/decor-grapes';
import { Panel } from '@/components/panel';
import { Screen } from '@/components/screen';
import { Sidebar } from '@/components/sidebar';
import { copy } from '@/data';

import styles from '@/components/auth-form.module.css';

/**
 * Sign Up.
 *
 * ⚠️ **Figma 에 가입 화면 프레임이 없다.** Login(201:716)의 구조를 그대로
 *    쓰고 displayName 필드 하나를 더한다. 시안이 나오면 교체할 것.
 *    입력 세 개(loginId / password / displayName)는 STEP 4 에서 확정됐다.
 */

/** Login 과 같은 배경 원 (201:717~201:722). */
const GRAPES: readonly DecorGrape[] = [
  { x: 22.298, y: 35.019, size: 23.242 },
  { x: 13.444, y: 65.175, size: 11.523 },
  { x: 96.68, y: 39.235, size: 11.523 },
  { x: 0.846, y: 59.274, size: 14.453 },
  { x: 69.856, y: 64.202, size: 8.203 },
  { x: 82.943, y: 56.031, size: 20.573 },
];

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <Screen tone="light">
      <DecorGrapes grapes={GRAPES} tone="panel" />
      <Sidebar variant="guest" current="/login" />
      <BackLink href="/login" />

      <Panel title={copy.auth.signUp} centered>
        <form className={styles.form} method="post" action="/api/auth/signup">
          <input
            className={styles.field}
            name="loginId"
            type="text"
            autoComplete="username"
            placeholder={copy.auth.idLabel}
            aria-label={copy.auth.idLabel}
            required
          />
          <input
            className={styles.field}
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder={copy.auth.passwordLabel}
            aria-label={copy.auth.passwordLabel}
            required
          />
          <input
            className={styles.field}
            name="displayName"
            type="text"
            autoComplete="nickname"
            placeholder={copy.auth.displayNameLabel}
            aria-label={copy.auth.displayNameLabel}
            required
          />
          <button className={styles.submit} type="submit">
            {copy.auth.signUp}
          </button>

          {error ? (
            <p className={styles.error} data-testid="error">
              {error}
            </p>
          ) : null}

          <p className={styles.footer}>
            <a className={styles.link} href="/login">
              {copy.auth.logIn}
            </a>
          </p>
        </form>
      </Panel>
    </Screen>
  );
}
