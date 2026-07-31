import type { SupabaseClient } from '@supabase/supabase-js';

import {
  InvalidAuthorNameError,
  MessageTooLongError,
  OwnerAlreadyHasVineError,
  PageNotFoundError,
  RepositoryFailureError,
  SlotTakenError,
  SlugCollisionError,
} from '@/lib/errors';
import type { Grape, PageSlot, PageView, Vine, VinePage } from '@/models';
import type { CreatedVine, GrapePayload, VineRepository } from '@/repositories/vine-repository';
import { generateSlug, withUniqueSlug } from '@/services/slug';

/** 칭찬 길이 상한 — DB `grapes_message_length_check` 와 같은 값이어야 한다. */
const MESSAGE_LIMIT = 80;

// --- DB 행 (snake_case). 매핑은 이 파일 안에서만 일어난다. --------------------

type VineRow = { id: string; owner_id: string; slug: string; created_at: string };
type VinePageRow = { id: string; vine_id: string; page_index: number; capacity: number };
type GrapeRow = {
  id: string;
  page_id: string;
  slot_index: number;
  author_name: string | null;
  is_anonymous: boolean;
  message: string;
  created_at: string;
};

const toVine = (row: VineRow): Vine => ({
  id: row.id,
  ownerId: row.owner_id,
  slug: row.slug,
  createdAt: row.created_at,
});

const toVinePage = (row: VinePageRow): VinePage => ({
  id: row.id,
  vineId: row.vine_id,
  pageIndex: row.page_index,
  capacity: row.capacity,
});

const toGrape = (row: GrapeRow): Grape => ({
  id: row.id,
  pageId: row.page_id,
  slotIndex: row.slot_index,
  authorName: row.author_name,
  isAnonymous: row.is_anonymous,
  message: row.message,
  createdAt: row.created_at,
});

// --- 에러 번역 ----------------------------------------------------------------

type PostgrestLikeError = {
  code?: string;
  message?: string;
  details?: string | null;
};

/**
 * 위반된 제약의 **이름**을 뽑는다.
 *
 * SQLSTATE 만으로는 부족하다 — grapes 에는 CHECK 가 4개라 전부 23514 로 온다.
 * 어느 규칙이 깨졌는지는 제약 이름으로만 알 수 있고, 그래서 마이그레이션에서
 * 모든 제약에 명시적으로 이름을 붙였다.
 */
function constraintName(error: PostgrestLikeError): string | undefined {
  const text = `${error.message ?? ''} ${error.details ?? ''}`;
  return /constraint "([^"]+)"/.exec(text)?.[1];
}

// --- 구현 ---------------------------------------------------------------------

export class SupabaseVineRepository implements VineRepository {
  constructor(
    private readonly client: SupabaseClient,
    /** 주입 가능 — 테스트에서 슬러그를 결정적으로 만들기 위해 (PRD §7-10). */
    private readonly slugFactory: () => string = generateSlug,
  ) {}

  async createVine(ownerId: string): Promise<CreatedVine> {
    const vine = await withUniqueSlug(
      async (slug) => {
        const { data, error } = await this.client
          .from('vines')
          .insert({ owner_id: ownerId, slug })
          .select()
          .single<VineRow>();

        if (error) {
          const constraint = constraintName(error);
          if (constraint === 'vines_slug_key') throw new SlugCollisionError(slug, { cause: error });
          if (constraint === 'vines_owner_id_key') {
            throw new OwnerAlreadyHasVineError(ownerId, { cause: error });
          }
          throw new RepositoryFailureError('createVine/insertVine', { cause: error });
        }

        return toVine(data);
      },
      { generate: this.slugFactory },
    );

    // ⚠️ vine 과 page 1 이 별도 문장이라 원자적이지 않다. page 삽입이 실패하면
    //    "페이지 없는 판"이 남고, owner_id UNIQUE 때문에 재생성도 막힌다.
    //    그래서 실패 시 vine 을 보상 삭제한다. STEP 5 에서 RPC 하나로 합칠 것.
    try {
      const { data, error } = await this.client
        .from('vine_pages')
        .insert({ vine_id: vine.id, page_index: 1 })
        .select()
        .single<VinePageRow>();

      if (error) throw new RepositoryFailureError('createVine/insertFirstPage', { cause: error });

      return { vine, firstPage: toVinePage(data) };
    } catch (error) {
      await this.client.from('vines').delete().eq('id', vine.id);
      throw error;
    }
  }

  async getVineBySlug(slug: string): Promise<Vine | null> {
    const { data, error } = await this.client
      .from('vines')
      .select()
      .eq('slug', slug)
      .maybeSingle<VineRow>();

    if (error) throw new RepositoryFailureError('getVineBySlug', { cause: error });
    return data ? toVine(data) : null;
  }

  async listPages(vineId: string): Promise<VinePage[]> {
    const { data, error } = await this.client
      .from('vine_pages')
      .select()
      .eq('vine_id', vineId)
      .order('page_index', { ascending: true })
      .returns<VinePageRow[]>();

    if (error) throw new RepositoryFailureError('listPages', { cause: error });
    return (data ?? []).map(toVinePage);
  }

  async getPage(vineId: string, pageIndex: number): Promise<PageView | null> {
    const { data: page, error: pageError } = await this.client
      .from('vine_pages')
      .select()
      .eq('vine_id', vineId)
      .eq('page_index', pageIndex)
      .maybeSingle<VinePageRow>();

    if (pageError) throw new RepositoryFailureError('getPage/page', { cause: pageError });
    if (!page) return null;

    const [{ data: grapeRows, error: grapeError }, { count, error: countError }] = await Promise.all([
      this.client.from('grapes').select().eq('page_id', page.id).returns<GrapeRow[]>(),
      this.client
        .from('vine_pages')
        .select('id', { count: 'exact', head: true })
        .eq('vine_id', vineId),
    ]);

    if (grapeError) throw new RepositoryFailureError('getPage/grapes', { cause: grapeError });
    if (countError) throw new RepositoryFailureError('getPage/count', { cause: countError });

    const bySlot = new Map<number, Grape>();
    for (const row of grapeRows ?? []) {
      bySlot.set(row.slot_index, toGrape(row));
    }

    // slots 는 항상 capacity 개다 (PRD §8). 빈 슬롯도 자리를 차지해야
    // 컴포넌트가 slot-layout.ts 좌표와 1:1 로 대응시킬 수 있다.
    const slots: PageSlot[] = Array.from({ length: page.capacity }, (_, slotIndex) => ({
      slotIndex,
      grape: bySlot.get(slotIndex) ?? null,
    }));

    return {
      pageIndex: page.page_index,
      totalPages: count ?? 1,
      slots,
      isFull: bySlot.size >= page.capacity,
    };
  }

  async addGrape(pageId: string, slotIndex: number, payload: GrapePayload): Promise<Grape> {
    // 절대규칙 3 — 익명이면 이름을 서버에서 버린다. 클라 값을 신뢰하지 않는다.
    // DB CHECK 가 최종 방어선이지만, 여기서 지우면 애초에 위반이 만들어지지 않는다.
    const authorName = payload.isAnonymous ? null : payload.authorName;

    if (!payload.isAnonymous && !authorName) {
      throw new InvalidAuthorNameError('named_without_name');
    }

    const { data, error } = await this.client
      .from('grapes')
      .insert({
        page_id: pageId,
        slot_index: slotIndex,
        author_name: authorName,
        is_anonymous: payload.isAnonymous,
        message: payload.message,
      })
      .select()
      .single<GrapeRow>();

    if (error) {
      const constraint = constraintName(error);

      switch (constraint) {
        case 'grapes_slot_key':
          throw new SlotTakenError(pageId, slotIndex, { cause: error });
        case 'grapes_message_length_check':
          throw new MessageTooLongError(MESSAGE_LIMIT, { cause: error });
        case 'grapes_named_has_name_check':
          throw new InvalidAuthorNameError('named_without_name', { cause: error });
        case 'grapes_anonymous_no_name_check':
          throw new InvalidAuthorNameError('anonymous_with_name', { cause: error });
        case 'grapes_page_id_fkey':
          throw new PageNotFoundError({ pageId }, { cause: error });
        default:
          throw new RepositoryFailureError('addGrape', { cause: error });
      }
    }

    return toGrape(data);
  }
}
