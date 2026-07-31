import { copy } from '@/data';

// 회색박스 (작업규칙 5). 비주얼은 STEP 10 이후.
// JS 없이 동작하도록 평범한 폼 POST 를 쓴다.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main>
      <h1>{copy.auth.logIn}</h1>
      {error ? <p data-testid="error">{error}</p> : null}

      <form method="post" action="/api/auth/login">
        <label>
          {copy.auth.idLabel}
          <input name="loginId" type="text" autoComplete="username" required />
        </label>
        <label>
          {copy.auth.passwordLabel}
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        <button type="submit">{copy.auth.logIn}</button>
      </form>

      <p>
        {copy.auth.signUpPrompt} <a href="/signup">{copy.auth.signUp}</a>
      </p>
    </main>
  );
}
