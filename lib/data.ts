import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';

import { backend } from '@/lib/backend';
import { useAuth } from '@/lib/auth';
import type {
  AgentReplyResult,
  AgentSettings,
  Bakery,
  Conversation,
  DeliveryZone,
  Faq,
  Message,
  Policy,
  Product,
  WhatsappConnection,
} from '@/lib/types';

/* -------------------------------------------------------------------------- */
/* Keys                                                                       */
/* -------------------------------------------------------------------------- */

export const keys = {
  bakery: (userId?: string) => ['bakery', userId ?? 'anon'] as const,
  products: (bakeryId?: string) => ['products', bakeryId] as const,
  policies: (bakeryId?: string) => ['policies', bakeryId] as const,
  faqs: (bakeryId?: string) => ['faqs', bakeryId] as const,
  zones: (bakeryId?: string) => ['zones', bakeryId] as const,
  agentSettings: (bakeryId?: string) => ['agent-settings', bakeryId] as const,
  whatsapp: (bakeryId?: string) => ['whatsapp', bakeryId] as const,
  conversations: (bakeryId?: string) => ['conversations', bakeryId] as const,
  conversation: (id: string) => ['conversation', id] as const,
  messages: (conversationId: string) => ['messages', conversationId] as const,
};

/* -------------------------------------------------------------------------- */
/* Bakery                                                                     */
/* -------------------------------------------------------------------------- */

export function useBakery() {
  const { user } = useAuth();

  return useQuery({
    queryKey: keys.bakery(user?.id),
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<Bakery | null> => {
      const result = await backend
        .from('bakeries')
        .select<'*', Bakery>('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
  });
}

export function useBakeryId(): string | undefined {
  return useBakery().data?.id;
}

export type CreateBakeryInput = {
  name: string;
  city: string | null;
  currency: string;
  tagline: string | null;
};

/** Creates the bakery plus its default agent settings in one go. */
export function useCreateBakery() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateBakeryInput): Promise<Bakery> => {
      const bakeryResult = await backend
        .from('bakeries')
        .insert({ ...input, user_id: user!.id })
        .select<'*', Bakery>('*')
        .single();
      if (bakeryResult.error) throw new Error(bakeryResult.error.message);
      const bakery = bakeryResult.data;

      const settings = await backend
        .from('agent_settings')
        .insert({
          bakery_id: bakery.id,
          agent_name: `${bakery.name} Assistant`,
        })
        .select('id')
        .single();
      if (settings.error && !settings.error.message.includes('duplicate key')) {
        throw new Error(settings.error.message);
      }

      return bakery;
    },
    onSuccess: (bakery) => {
      queryClient.setQueryData(keys.bakery(user?.id), bakery);
      void queryClient.invalidateQueries({ queryKey: keys.agentSettings(bakery.id) });
    },
  });
}

export function useUpdateBakery() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const bakeryId = useBakeryId();

  return useMutation({
    mutationFn: async (patch: Partial<Bakery>): Promise<Bakery> => {
      const result = await backend
        .from('bakeries')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', bakeryId!)
        .select<'*', Bakery>('*')
        .single();
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: (bakery) => queryClient.setQueryData(keys.bakery(user?.id), bakery),
  });
}

/* -------------------------------------------------------------------------- */
/* Generic knowledge-base collection                                          */
/* -------------------------------------------------------------------------- */

type Table = 'products' | 'policies' | 'faqs' | 'delivery_zones';

function useCollection<T>(table: Table, key: readonly unknown[], orderBy = 'sort_order') {
  const bakeryId = useBakeryId();

  return useQuery({
    queryKey: key,
    enabled: Boolean(bakeryId),
    queryFn: async (): Promise<T[]> => {
      const result = await backend
        .from(table)
        .select<'*', T>('*')
        .eq('bakery_id', bakeryId!)
        .order(orderBy, { ascending: true })
        .order('created_at', { ascending: true });
      if (result.error) throw new Error(result.error.message);
      return result.data ?? [];
    },
  });
}

/**
 * Insert-or-update for a knowledge-base row. `id` absent means create.
 * New rows are appended by giving them the next sort_order.
 */
function useSaveRow<T extends { id: string }, I extends object>(
  table: Table,
  key: readonly unknown[],
): UseMutationResult<T, Error, I & { id?: string }> {
  const queryClient = useQueryClient();
  const bakeryId = useBakeryId();
  const existing = queryClient.getQueryData<T[]>(key);

  return useMutation({
    mutationFn: async (input: I & { id?: string }): Promise<T> => {
      const { id, ...fields } = input;

      if (id) {
        const result = await backend
          .from(table)
          .update({ ...fields, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select<'*', T>('*')
          .single();
        if (result.error) throw new Error(result.error.message);
        return result.data;
      }

      const result = await backend
        .from(table)
        .insert({ ...fields, bakery_id: bakeryId!, sort_order: existing?.length ?? 0 })
        .select<'*', T>('*')
        .single();
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

function useDeleteRow(table: Table, key: readonly unknown[]) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await backend.from(table).delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

/* -------------------------------------------------------------------------- */
/* Products                                                                   */
/* -------------------------------------------------------------------------- */

export type ProductInput = {
  name: string;
  description: string | null;
  category: string;
  price_cents: number;
  unit: string | null;
  available: boolean;
  lead_time_hours: number | null;
  allergens: string[];
};

export function useProducts() {
  return useCollection<Product>('products', keys.products(useBakeryId()));
}

export function useSaveProduct() {
  return useSaveRow<Product, ProductInput>('products', keys.products(useBakeryId()));
}

export function useDeleteProduct() {
  return useDeleteRow('products', keys.products(useBakeryId()));
}

/* -------------------------------------------------------------------------- */
/* Policies                                                                   */
/* -------------------------------------------------------------------------- */

export type PolicyInput = { title: string; body: string; category: string };

export function usePolicies() {
  return useCollection<Policy>('policies', keys.policies(useBakeryId()));
}

export function useSavePolicy() {
  return useSaveRow<Policy, PolicyInput>('policies', keys.policies(useBakeryId()));
}

export function useDeletePolicy() {
  return useDeleteRow('policies', keys.policies(useBakeryId()));
}

/* -------------------------------------------------------------------------- */
/* FAQs                                                                       */
/* -------------------------------------------------------------------------- */

export type FaqInput = { question: string; answer: string };

export function useFaqs() {
  return useCollection<Faq>('faqs', keys.faqs(useBakeryId()));
}

export function useSaveFaq() {
  return useSaveRow<Faq, FaqInput>('faqs', keys.faqs(useBakeryId()));
}

export function useDeleteFaq() {
  return useDeleteRow('faqs', keys.faqs(useBakeryId()));
}

/* -------------------------------------------------------------------------- */
/* Delivery zones                                                             */
/* -------------------------------------------------------------------------- */

export type ZoneInput = {
  area: string;
  fee_cents: number;
  min_order_cents: number;
  eta: string | null;
  notes: string | null;
};

export function useDeliveryZones() {
  return useCollection<DeliveryZone>('delivery_zones', keys.zones(useBakeryId()));
}

export function useSaveZone() {
  return useSaveRow<DeliveryZone, ZoneInput>('delivery_zones', keys.zones(useBakeryId()));
}

export function useDeleteZone() {
  return useDeleteRow('delivery_zones', keys.zones(useBakeryId()));
}

/* -------------------------------------------------------------------------- */
/* Agent settings                                                             */
/* -------------------------------------------------------------------------- */

export function useAgentSettings() {
  const bakeryId = useBakeryId();

  return useQuery({
    queryKey: keys.agentSettings(bakeryId),
    enabled: Boolean(bakeryId),
    queryFn: async (): Promise<AgentSettings | null> => {
      const result = await backend
        .from('agent_settings')
        .select<'*', AgentSettings>('*')
        .eq('bakery_id', bakeryId!)
        .maybeSingle();
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
  });
}

export function useUpdateAgentSettings() {
  const queryClient = useQueryClient();
  const bakeryId = useBakeryId();
  const key = keys.agentSettings(bakeryId);

  return useMutation({
    mutationFn: async (patch: Partial<AgentSettings>): Promise<AgentSettings> => {
      const result = await backend
        .from('agent_settings')
        .upsert(
          { bakery_id: bakeryId!, ...patch, updated_at: new Date().toISOString() },
          { onConflict: 'bakery_id' },
        )
        .select<'*', AgentSettings>('*')
        .single();
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<AgentSettings | null>(key);
      if (previous) queryClient.setQueryData(key, { ...previous, ...patch });
      return { previous };
    },
    onError: (_error, _patch, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSuccess: (settings) => queryClient.setQueryData(key, settings),
  });
}

/* -------------------------------------------------------------------------- */
/* WhatsApp connection                                                        */
/* -------------------------------------------------------------------------- */

export function useWhatsappConnection() {
  const bakeryId = useBakeryId();

  return useQuery({
    queryKey: keys.whatsapp(bakeryId),
    enabled: Boolean(bakeryId),
    queryFn: async (): Promise<WhatsappConnection | null> => {
      const result = await backend
        .from('whatsapp_connections')
        .select<'*', WhatsappConnection>('*')
        .eq('bakery_id', bakeryId!)
        .maybeSingle();
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
  });
}

export function useSaveWhatsappConnection() {
  const queryClient = useQueryClient();
  const bakeryId = useBakeryId();

  return useMutation({
    mutationFn: async (patch: Partial<WhatsappConnection>): Promise<WhatsappConnection> => {
      const result = await backend
        .from('whatsapp_connections')
        .upsert(
          { bakery_id: bakeryId!, ...patch, updated_at: new Date().toISOString() },
          { onConflict: 'bakery_id' },
        )
        .select<'*', WhatsappConnection>('*')
        .single();
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: (connection) => queryClient.setQueryData(keys.whatsapp(bakeryId), connection),
  });
}

export function useDisconnectWhatsapp() {
  const queryClient = useQueryClient();
  const bakeryId = useBakeryId();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await backend.from('whatsapp_connections').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.setQueryData(keys.whatsapp(bakeryId), null),
  });
}

/* -------------------------------------------------------------------------- */
/* Conversations and messages                                                 */
/* -------------------------------------------------------------------------- */

export function useConversations(options?: { includeTests?: boolean }) {
  const bakeryId = useBakeryId();
  const includeTests = options?.includeTests ?? true;

  return useQuery({
    queryKey: [...keys.conversations(bakeryId), includeTests] as const,
    enabled: Boolean(bakeryId),
    queryFn: async (): Promise<Conversation[]> => {
      let query = backend
        .from('conversations')
        .select<'*', Conversation>('*')
        .eq('bakery_id', bakeryId!)
        .order('last_message_at', { ascending: false });
      if (!includeTests) query = query.eq('is_test', false);

      const result = await query;
      if (result.error) throw new Error(result.error.message);
      return result.data ?? [];
    },
  });
}

export function useConversation(id: string) {
  return useQuery({
    queryKey: keys.conversation(id),
    enabled: Boolean(id),
    queryFn: async (): Promise<Conversation | null> => {
      const result = await backend
        .from('conversations')
        .select<'*', Conversation>('*')
        .eq('id', id)
        .maybeSingle();
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
  });
}

export function useMessages(conversationId: string) {
  return useQuery({
    queryKey: keys.messages(conversationId),
    enabled: Boolean(conversationId),
    queryFn: async (): Promise<Message[]> => {
      const result = await backend
        .from('messages')
        .select<'*', Message>('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (result.error) throw new Error(result.error.message);
      return result.data ?? [];
    },
  });
}

export function useUpdateConversation() {
  const queryClient = useQueryClient();
  const bakeryId = useBakeryId();

  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: Partial<Conversation> & { id: string }): Promise<Conversation> => {
      const result = await backend
        .from('conversations')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select<'*', Conversation>('*')
        .single();
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: (conversation) => {
      queryClient.setQueryData(keys.conversation(conversation.id), conversation);
      void queryClient.invalidateQueries({ queryKey: keys.conversations(bakeryId) });
    },
  });
}

/** Creates (or reuses) the playground thread used to test the agent. */
export function useTestConversation() {
  const queryClient = useQueryClient();
  const bakeryId = useBakeryId();

  return useMutation({
    mutationFn: async (): Promise<Conversation> => {
      const existing = await backend
        .from('conversations')
        .select<'*', Conversation>('*')
        .eq('bakery_id', bakeryId!)
        .eq('is_test', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (existing.error) throw new Error(existing.error.message);
      if (existing.data) return existing.data;

      const created = await backend
        .from('conversations')
        .insert({
          bakery_id: bakeryId!,
          customer_name: 'Test customer',
          customer_phone: 'playground',
          is_test: true,
        })
        .select<'*', Conversation>('*')
        .single();
      if (created.error) throw new Error(created.error.message);
      return created.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.conversations(bakeryId) }),
  });
}

/** Clears a test thread so the owner can start a fresh trial run. */
export function useClearConversationMessages() {
  const queryClient = useQueryClient();
  const bakeryId = useBakeryId();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await backend
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId);
      if (error) throw new Error(error.message);

      const reset = await backend
        .from('conversations')
        .update({
          last_message_preview: null,
          status: 'active',
          unread_count: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);
      if (reset.error) throw new Error(reset.error.message);
    },
    onSuccess: (_data, conversationId) => {
      void queryClient.invalidateQueries({ queryKey: keys.messages(conversationId) });
      void queryClient.invalidateQueries({ queryKey: keys.conversation(conversationId) });
      void queryClient.invalidateQueries({ queryKey: keys.conversations(bakeryId) });
    },
  });
}

/**
 * Sends a customer message to the agent. The edge function records both turns,
 * builds the knowledge-base prompt and calls the model.
 */
export function useAskAgent() {
  const queryClient = useQueryClient();
  const bakeryId = useBakeryId();

  return useMutation({
    mutationFn: async (input: {
      conversationId: string;
      text: string;
    }): Promise<AgentReplyResult> => {
      const { data, error } = await backend.functions.invoke<AgentReplyResult>('agent-reply', {
        body: { conversation_id: input.conversationId, text: input.text },
      });
      if (error) throw error;
      if (!data) throw new Error('The assistant did not respond. Please try again.');
      return data;
    },
    onSettled: (_data, _error, input) => {
      void queryClient.invalidateQueries({ queryKey: keys.messages(input.conversationId) });
      void queryClient.invalidateQueries({ queryKey: keys.conversation(input.conversationId) });
      void queryClient.invalidateQueries({ queryKey: keys.conversations(bakeryId) });
    },
  });
}

/** A reply typed by the owner themselves, which pauses the agent for that thread. */
export function useSendOwnerMessage() {
  const queryClient = useQueryClient();
  const bakeryId = useBakeryId();

  return useMutation({
    mutationFn: async (input: { conversationId: string; text: string }): Promise<Message> => {
      const inserted = await backend
        .from('messages')
        .insert({ conversation_id: input.conversationId, role: 'owner', body: input.text })
        .select<'*', Message>('*')
        .single();
      if (inserted.error) throw new Error(inserted.error.message);
      const message = inserted.data;

      const update = await backend
        .from('conversations')
        .update({
          last_message_at: message.created_at,
          last_message_preview: input.text.slice(0, 160),
          status: 'active',
          unread_count: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.conversationId);
      if (update.error) throw new Error(update.error.message);

      return message;
    },
    onSuccess: (_message, input) => {
      void queryClient.invalidateQueries({ queryKey: keys.messages(input.conversationId) });
      void queryClient.invalidateQueries({ queryKey: keys.conversation(input.conversationId) });
      void queryClient.invalidateQueries({ queryKey: keys.conversations(bakeryId) });
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Knowledge readiness                                                        */
/* -------------------------------------------------------------------------- */

export type KnowledgeSummary = {
  products: number;
  policies: number;
  faqs: number;
  zones: number;
  hasProfileDetails: boolean;
  /** 0–4: how much of the knowledge base is filled in. */
  filledSections: number;
  isLoading: boolean;
};

export function useKnowledgeSummary(): KnowledgeSummary {
  const bakery = useBakery();
  const products = useProducts();
  const policies = usePolicies();
  const faqs = useFaqs();
  const zones = useDeliveryZones();

  const counts = {
    products: products.data?.length ?? 0,
    policies: policies.data?.length ?? 0,
    faqs: faqs.data?.length ?? 0,
    zones: zones.data?.length ?? 0,
  };

  const hours = bakery.data?.opening_hours ?? {};
  const hasProfileDetails = Object.values(hours).some(Boolean) && Boolean(bakery.data?.address);

  return {
    ...counts,
    hasProfileDetails,
    filledSections: Object.values(counts).filter((n) => n > 0).length,
    isLoading: products.isLoading || policies.isLoading || faqs.isLoading || zones.isLoading,
  };
}
