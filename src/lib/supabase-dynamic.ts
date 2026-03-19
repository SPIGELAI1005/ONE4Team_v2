import { supabase } from "@/integrations/supabase/client";

interface DynamicQueryBuilder {
  select: (...args: unknown[]) => DynamicQueryBuilder;
  insert: (...args: unknown[]) => Promise<{ data: unknown; error: { message?: string } | null }>;
  update: (...args: unknown[]) => DynamicQueryBuilder;
  delete: (...args: unknown[]) => DynamicQueryBuilder;
  upsert: (...args: unknown[]) => Promise<{ data: unknown; error: { message?: string } | null }>;
  eq: (...args: unknown[]) => DynamicQueryBuilder;
  gte: (...args: unknown[]) => DynamicQueryBuilder;
  lt: (...args: unknown[]) => DynamicQueryBuilder;
  order: (...args: unknown[]) => DynamicQueryBuilder;
  limit: (...args: unknown[]) => DynamicQueryBuilder;
  single: () => Promise<{ data: unknown; error: { message?: string } | null }>;
  then?: PromiseLike<{ data: unknown; error: { message?: string } | null }>["then"];
}

interface DynamicSupabaseClient {
  from: (table: string) => DynamicQueryBuilder;
  rpc: (
    fn: string,
    args?: Record<string, unknown>
  ) => Promise<{ data: unknown; error: { message?: string } | null }>;
  functions: {
    invoke: (fn: string, options?: { body?: unknown; headers?: Record<string, string> }) => Promise<{ data: unknown; error: { message?: string } | null }>;
  };
}

// Some new rollout tables/functions are ahead of generated DB types.
// Use this thin adapter to keep TS strict elsewhere while enabling incremental migrations.
export const supabaseDynamic = supabase as unknown as DynamicSupabaseClient;
