import { describe, expect, it, vi } from 'vitest';

import { RepositoryFailureError, SlugCollisionError, SlugExhaustedError } from '@/lib/errors';
import { SLUG_LENGTH, generateSlug, withUniqueSlug } from '@/services/slug';

describe('generateSlug', () => {
  it('produces a 10-character slug from the safe alphabet', () => {
    for (let i = 0; i < 200; i += 1) {
      const slug = generateSlug();
      expect(slug).toHaveLength(SLUG_LENGTH);
      // 0/O, 1/l 은 눈으로 헷갈려서 알파벳에서 뺐다.
      expect(slug).toMatch(/^[abcdefghijkmnpqrstuvwxyz23456789]+$/);
    }
  });

  it('does not repeat itself across many draws', () => {
    const draws = new Set(Array.from({ length: 500 }, () => generateSlug()));
    expect(draws.size).toBe(500);
  });
});

describe('withUniqueSlug', () => {
  it('retries with a fresh slug when the first one collides', async () => {
    const generate = vi.fn().mockReturnValueOnce('taken00000').mockReturnValueOnce('free000000');

    const claim = vi.fn(async (slug: string) => {
      if (slug === 'taken00000') throw new SlugCollisionError(slug);
      return `claimed:${slug}`;
    });

    await expect(withUniqueSlug(claim, { generate })).resolves.toBe('claimed:free000000');
    expect(claim).toHaveBeenCalledTimes(2);
  });

  it('gives up with SlugExhaustedError after the attempt budget', async () => {
    const claim = vi.fn(async (slug: string) => {
      throw new SlugCollisionError(slug);
    });

    await expect(withUniqueSlug(claim, { attempts: 3 })).rejects.toBeInstanceOf(SlugExhaustedError);
    expect(claim).toHaveBeenCalledTimes(3);
  });

  it('keeps the last collision as the cause so the failure is traceable', async () => {
    const claim = async (slug: string) => {
      throw new SlugCollisionError(slug);
    };

    const error = await withUniqueSlug(claim, { attempts: 2 }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(SlugExhaustedError);
    expect((error as SlugExhaustedError).attempts).toBe(2);
    expect((error as Error).cause).toBeInstanceOf(SlugCollisionError);
  });

  it('rethrows non-collision failures immediately instead of burning retries', async () => {
    const claim = vi.fn(async () => {
      throw new RepositoryFailureError('createVine');
    });

    await expect(withUniqueSlug(claim, { attempts: 5 })).rejects.toBeInstanceOf(
      RepositoryFailureError,
    );
    // 재시도해봐야 같은 실패가 반복될 뿐이다. 한 번에 멈춰야 한다.
    expect(claim).toHaveBeenCalledTimes(1);
  });

  it('does not call claim more than once when the first slug works', async () => {
    const claim = vi.fn(async (slug: string) => slug);

    await expect(withUniqueSlug(claim)).resolves.toHaveLength(SLUG_LENGTH);
    expect(claim).toHaveBeenCalledTimes(1);
  });
});
