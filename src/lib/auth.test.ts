import { describe, expect, it } from 'vitest';

import { SYNTHETIC_EMAIL_DOMAIN, normalizeSignUpInput, toSyntheticEmail } from '@/lib/auth';
import { InvalidSignUpInputError } from '@/lib/errors';

describe('toSyntheticEmail', () => {
  it('maps a loginId onto the reserved synthetic domain', () => {
    expect(toSyntheticEmail('blair')).toBe(`blair@${SYNTHETIC_EMAIL_DOMAIN}`);
  });

  it('lowercases so the same id never yields two accounts', () => {
    expect(toSyntheticEmail('Blair')).toBe(toSyntheticEmail('blair'));
  });
});

describe('normalizeSignUpInput', () => {
  const valid = { loginId: 'blair', password: 'hunter22', displayName: 'Blair' };

  it('trims loginId and displayName but never the password', () => {
    const result = normalizeSignUpInput({
      loginId: '  blair  ',
      password: '  hunter22  ',
      displayName: '  Blair  ',
    });

    expect(result).toEqual({ loginId: 'blair', password: '  hunter22  ', displayName: 'Blair' });
  });

  // loginId 는 이메일의 local part 가 되므로, @ 나 공백이 들어가면
  // 주소 자체가 바뀌어 다른 계정으로 붙을 수 있다.
  it.each([
    ['contains @', 'bl@ir'],
    ['contains a space', 'bl air'],
    ['too short', 'ab'],
    ['too long', 'b'.repeat(31)],
    ['starts with punctuation', '.blair'],
    ['empty', ''],
  ])('rejects a loginId that %s', (_reason, loginId) => {
    expect(() => normalizeSignUpInput({ ...valid, loginId })).toThrow(InvalidSignUpInputError);
  });

  it('rejects a password shorter than the Supabase minimum', () => {
    expect(() => normalizeSignUpInput({ ...valid, password: '12345' })).toThrow(
      InvalidSignUpInputError,
    );
  });

  it.each([
    ['empty', ''],
    ['whitespace only', '   '],
    ['over the cap', 'x'.repeat(41)],
  ])('rejects a displayName that is %s', (_reason, displayName) => {
    expect(() => normalizeSignUpInput({ ...valid, displayName })).toThrow(InvalidSignUpInputError);
  });

  it('counts displayName by code point, matching the 80-char message rule', () => {
    // 한글 40자는 통과해야 한다 — UTF-16 길이로 세면 여기서 잘못 걸린다.
    expect(() => normalizeSignUpInput({ ...valid, displayName: '가'.repeat(40) })).not.toThrow();
  });

  it('names the offending field so the route can redirect with a useful code', () => {
    try {
      normalizeSignUpInput({ ...valid, displayName: '' });
      expect.unreachable();
    } catch (error) {
      expect((error as InvalidSignUpInputError).field).toBe('displayName');
    }
  });
});
