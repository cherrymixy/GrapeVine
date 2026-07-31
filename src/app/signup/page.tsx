import { copy } from '@/data';

// 회색박스 (작업규칙 5). 입력은 loginId / password / displayName 셋뿐.
export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main>
      <h1>{copy.auth.signUp}</h1>
      {error ? <p data-testid="error">{error}</p> : null}

      <form method="post" action="/api/auth/signup">
        <label>
          {copy.auth.idLabel}
          <input name="loginId" type="text" autoComplete="username" required />
        </label>
        <label>
          {copy.auth.passwordLabel}
          <input name="password" type="password" autoComplete="new-password" required />
        </label>
        <label>
          {copy.auth.displayNameLabel}
          <input name="displayName" type="text" autoComplete="nickname" required />
        </label>
        <button type="submit">{copy.auth.signUp}</button>
      </form>

      <p>
        <a href="/login">{copy.auth.logIn}</a>
      </p>
    </main>
  );
}
