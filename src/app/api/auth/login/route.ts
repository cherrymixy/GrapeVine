import { NextResponse } from 'next/server';

import { isDomainError } from '@/lib/errors';
import { signIn } from '@/services/auth';

export async function POST(request: Request): Promise<Response> {
  const form = await request.formData();

  try {
    await signIn(String(form.get('loginId') ?? ''), String(form.get('password') ?? ''));
  } catch (error) {
    const code = isDomainError(error) ? error.code : 'AUTH_FAILURE';
    if (!isDomainError(error)) console.error('login failed', error);
    return NextResponse.redirect(new URL(`/login?error=${code}`, request.url), 303);
  }

  return NextResponse.redirect(new URL('/my', request.url), 303);
}
