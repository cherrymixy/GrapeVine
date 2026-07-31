import type { SupabaseClient } from '@supabase/supabase-js';

import {
  InvalidAuthorNameError,
  MessageTooLongError,
  OwnerAlreadyHasVineError,
  OwnerCannotAddGrapeError,
  PageNotFoundError,
  RepositoryFailureError,
  SlotOutOfRangeError,
  SlotTakenError,
  SlugCollisionError,
} from '@/lib/errors';
import type { Grape, PageSlot, PageView, Vine, VinePage } from '@/models';
import type {
  AddGrapeOptions,
  AttachedGrape,
  CreatedVine,
  GrapePayload,
  VineRepository,
} from '@/repositories/vine-repository';
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

/** `create_vine` RPC 의 반환 형태 (jsonb). */
type CreateVineResult = { vine: VineRow; page: VinePageRow };

/** `attach_grape` RPC 의 반환 형태 (jsonb). */
type AttachGrapeResult = { grape: GrapeRow; next_page: VinePageRow | null };

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

  /**
   * Vine + Page 1 을 **한 트랜잭션에서** 만든다 (PRD §7-1).
   *
   * 두 삽입을 애플리케이션에서 나누면 페이지 삽입 실패 시 "페이지 없는 판"이
   * 남고, `UNIQUE(vines.owner_id)` 때문에 재생성으로도 복구되지 않는다.
   * 그래서 `create_vine` RPC 안에서 처리한다 — plpgsql 본문은 호출 문장 하나라
   * 두 번째 삽입이 실패하면 첫 번째도 함께 롤백된다.
   */
  async createVine(ownerId: string): Promise<CreatedVine> {
    return withUniqueSlug(
      async (slug) => {
        const { data, error } = await this.client.rpc('create_vine', {
          p_owner_id: ownerId,
          p_slug: slug,
        });

        if (error) {
          const constraint = constraintName(error);
          if (constraint === 'vines_slug_key') throw new SlugCollisionError(slug, { cause: error });
          if (constraint === 'vines_owner_id_key') {
            throw new OwnerAlreadyHasVineError(ownerId, { cause: error });
          }
          throw new RepositoryFailureError('createVine', { cause: error });
        }

        // RPC 는 jsonb 를 그대로 돌려주므로 클라이언트가 형태를 알 수 없다.
        // 경계에서 한 번 확인해, 형태가 어긋나면 매핑 중 TypeError 가 아니라
        // 도메인 에러로 드러나게 한다.
        const result = data as CreateVineResult | null;
        if (!result?.vine || !result?.page) {
          throw new RepositoryFailureError('createVine/unexpected-rpc-shape');
        }

        return { vine: toVine(result.vine), firstPage: toVinePage(result.page) };
      },
      { generate: this.slugFactory },
    );
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

  async getVineByOwnerId(ownerId: string): Promise<Vine | null> {
    const { data, error } = await this.client
      .from('vines')
      .select()
      .eq('owner_id', ownerId)
      .maybeSingle<VineRow>();

    if (error) throw new RepositoryFailureError('getVineByOwnerId', { cause: error });
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

  /**
   * 슬롯 점유 + 페이지 증설을 `attach_grape` RPC 한 번으로 처리한다.
   *
   * 앱에서 "삽입 후 카운트 후 증설"로 쪼개면 절대규칙 2 가 깨질 뿐 아니라,
   * 동시에 마지막 두 칸이 채워질 때 양쪽 다 "아직 안 찼다"고 판정해
   * 다음 페이지가 영영 안 생긴다. RPC 가 페이지 행을 잠그고 처리한다.
   */
  async addGrape(
    pageId: string,
    slotIndex: number,
    payload: GrapePayload,
    options: AddGrapeOptions = {},
  ): Promise<AttachedGrape> {
    // 절대규칙 3 은 RPC 안에서도 강제되지만, 여기서 먼저 지워 두면
    // 애초에 위반이 만들어지지 않는다.
    const authorName = payload.isAnonymous ? null : payload.authorName;

    if (!payload.isAnonymous && !authorName) {
      throw new InvalidAuthorNameError('named_without_name');
    }

    const { data, error } = await this.client.rpc('attach_grape', {
      p_page_id: pageId,
      p_slot_index: slotIndex,
      p_author_name: authorName,
      p_is_anonymous: payload.isAnonymous,
      p_message: payload.message,
      p_actor_id: options.actorId ?? null,
    });

    if (error) {
      // 제약이 있는 규칙은 제약 이름으로, 제약이 없는 규칙은 커스텀 SQLSTATE 로.
      switch (error.code) {
        case 'GV001':
          throw new OwnerCannotAddGrapeError({ cause: error });
        case 'GV002':
          throw new SlotOutOfRangeError(slotIndex, { cause: error });
        case 'GV003':
          throw new PageNotFoundError({ pageId }, { cause: error });
      }

      switch (constraintName(error)) {
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

    const result = data as AttachGrapeResult | null;
    if (!result?.grape) {
      throw new RepositoryFailureError('addGrape/unexpected-rpc-shape');
    }

    return {
      grape: toGrape(result.grape),
      createdNextPage: result.next_page ? toVinePage(result.next_page) : null,
    };
  }
}
