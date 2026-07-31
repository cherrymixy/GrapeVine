import { BackLink } from '@/components/back-link';
import { DecorGrapes, type DecorGrape } from '@/components/decor-grapes';
import { Panel } from '@/components/panel';
import { Screen } from '@/components/screen';
import { Sidebar } from '@/components/sidebar';
import { copy } from '@/data';

import styles from '@/components/auth-form.module.css';

/**
 * Login — Figma 201:716 번역.
 *
 * 폼은 JS 없이 동작하는 평범한 POST 다 (STEP 4 결정).
 */

/**
 * 배경에 흩어진 원 (201:717~201:722).
 * 패널과 같은 색이라 바탕 위에 아주 옅게 얹힌다.
 */
const GRAPES: readonly DecorGrape[] = [
  { x: 22.298, y: 35.019, size: 23.242 }, // 164, 95 — 357
  { x: 13.444, y: 65.175, size: 11.523 }, // 118, 414 — 177
  { x: 96.68, y: 39.235, size: 11.523 }, // 1397, 214 — 177
  { x: 0.846, y: 59.274, size: 14.453 }, // -98, 346 — 222
  { x: 69.856, y: 64.202, size: 8.203 }, // 1010, 432 — 126
  { x: 82.943, y: 56.031, size: 20.573 }, // 1120, 274 — 316
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <Screen tone="light">
      <DecorGrapes grapes={GRAPES} tone="panel" />
      <Sidebar variant="guest" current="/login" />
      <BackLink href="/" />

      <Panel title={copy.auth.logInTitle} centered>
        <form className={styles.form} method="post" action="/api/auth/login">
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
            autoComplete="current-password"
            placeholder={copy.auth.passwordLabel}
            aria-label={copy.auth.passwordLabel}
            required
          />
          <button className={styles.submit} type="submit">
            {copy.auth.logIn}
          </button>

          {error ? (
            <p className={styles.error} data-testid="error">
              {error}
            </p>
          ) : null}

          <p className={styles.footer}>
            <span>{copy.auth.signUpPrompt}</span>
            <a className={styles.link} href="/signup">
              {copy.auth.signUp}
            </a>
          </p>
        </form>
      </Panel>
    </Screen>
  );
}
