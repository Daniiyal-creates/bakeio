import { useMemo, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { Link, router } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { Inbox, MessagesSquare, Pause } from 'lucide-react-native';
import {
  Avatar,
  Chip,
  PressableFeedback,
  Separator,
  Spinner,
  Typography,
  useThemeColor,
} from 'heroui-native';

import { EmptyState } from '@/components/EmptyState';
import { ErrorNote } from '@/components/ConfirmDialog';
import { ChipPicker } from '@/components/ChipPicker';
import { formatPhone, initialsFor, shortTime } from '@/lib/format';
import { friendlyError } from '@/lib/backend';
import { useAgentSettings, useConversations, useWhatsappConnection } from '@/lib/data';
import type { Conversation } from '@/lib/types';

const FILTERS = ['all', 'needs you', 'tests'] as const;
type Filter = (typeof FILTERS)[number];

export default function InboxScreen() {
  const [accent, warning, muted] = useThemeColor(['accent', 'warning', 'muted']);
  const [filter, setFilter] = useState<Filter>('all');

  const conversations = useConversations();
  const settings = useAgentSettings();
  const connection = useWhatsappConnection();

  const rows = useMemo(() => {
    const all = conversations.data ?? [];
    if (filter === 'needs you') return all.filter((c) => c.status === 'needs_human');
    if (filter === 'tests') return all.filter((c) => c.is_test);
    return all.filter((c) => !c.is_test || c.last_message_preview);
  }, [conversations.data, filter]);

  const needsAttention = (conversations.data ?? []).filter(
    (c) => c.status === 'needs_human',
  ).length;

  const agentOff = settings.data?.enabled === false;
  const notConnected = !connection.data || connection.data.status !== 'connected';

  return (
    <View className="bg-background flex-1">
      <FlashList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerClassName="pb-safe-offset-6"
        refreshControl={
          <RefreshControl
            refreshing={conversations.isRefetching}
            onRefresh={() => void conversations.refetch()}
            tintColor={accent}
          />
        }
        ListHeaderComponent={
          <View className="gap-3 px-4 pt-4 pb-2">
            {conversations.isError ? (
              <ErrorNote message={friendlyError(conversations.error)} />
            ) : null}

            {agentOff ? (
              <Banner
                tone="warning"
                icon={<Pause size={18} color={warning} />}
                title="Your assistant is switched off"
                body="Nothing is being answered automatically right now."
                actionLabel="Turn it on"
                onPress={() => router.push('/settings/agent')}
              />
            ) : null}

            {notConnected ? (
              <Banner
                tone="accent"
                icon={<MessagesSquare size={18} color={accent} />}
                title="WhatsApp is not connected yet"
                body="Connect your number so real customer messages arrive here."
                actionLabel="Connect"
                onPress={() => router.push('/settings/whatsapp')}
              />
            ) : null}

            <ChipPicker
              options={FILTERS}
              value={filter}
              onChange={setFilter}
              labelFor={(option) =>
                option === 'needs you' && needsAttention > 0
                  ? `Needs you (${needsAttention})`
                  : option.charAt(0).toUpperCase() + option.slice(1)
              }
            />
          </View>
        }
        ItemSeparatorComponent={() => (
          <View className="pl-[68px]">
            <Separator />
          </View>
        )}
        ListEmptyComponent={
          conversations.isPending ? (
            <View className="py-16">
              <Spinner />
            </View>
          ) : (
            <EmptyState
              icon={<Inbox size={28} color={muted} />}
              title={filter === 'all' ? 'No conversations yet' : 'Nothing here'}
              body={
                filter === 'all'
                  ? 'Once your WhatsApp number is connected, customer chats show up here. You can also try the assistant yourself first.'
                  : 'Try a different filter.'
              }
              actionLabel={filter === 'all' ? 'Try the assistant' : undefined}
              onAction={filter === 'all' ? () => router.push('/(tabs)/playground') : undefined}
            />
          )
        }
        renderItem={({ item }) => <ConversationRow conversation={item} />}
      />
    </View>
  );
}

function ConversationRow({ conversation }: { conversation: Conversation }) {
  const needsHuman = conversation.status === 'needs_human';

  return (
    <Link href={{ pathname: '/conversation/[id]', params: { id: conversation.id } }} asChild>
      <PressableFeedback>
        <View className="flex-row items-center gap-3 px-4 py-3.5">
          <Avatar size="lg" variant="soft" alt={conversation.customer_name ?? 'Customer'}>
            <Avatar.Fallback>
              {initialsFor(conversation.customer_name, conversation.customer_phone)}
            </Avatar.Fallback>
          </Avatar>

          <View className="flex-1 gap-0.5">
            <View className="flex-row items-center gap-2">
              <Typography type="body" weight="semibold" className="flex-1" numberOfLines={1}>
                {conversation.customer_name ??
                  (conversation.is_test
                    ? 'Test customer'
                    : formatPhone(conversation.customer_phone))}
              </Typography>
              <Typography type="body-xs" color="muted">
                {shortTime(conversation.last_message_at)}
              </Typography>
            </View>

            <Typography type="body-sm" color="muted" numberOfLines={1}>
              {conversation.last_message_preview ?? 'No messages yet'}
            </Typography>

            <View className="mt-1 flex-row items-center gap-2">
              {needsHuman ? (
                <Chip size="sm" variant="soft" color="danger">
                  <Chip.Label>Needs you</Chip.Label>
                </Chip>
              ) : null}
              {conversation.ai_paused ? (
                <Chip size="sm" variant="secondary" color="default">
                  <Chip.Label>Assistant paused</Chip.Label>
                </Chip>
              ) : null}
              {conversation.is_test ? (
                <Chip size="sm" variant="secondary" color="default">
                  <Chip.Label>Test</Chip.Label>
                </Chip>
              ) : null}
            </View>
          </View>
        </View>
      </PressableFeedback>
    </Link>
  );
}

function Banner({
  tone,
  icon,
  title,
  body,
  actionLabel,
  onPress,
}: {
  tone: 'accent' | 'warning';
  icon: React.ReactNode;
  title: string;
  body: string;
  actionLabel: string;
  onPress: () => void;
}) {
  return (
    <PressableFeedback
      onPress={onPress}
      className={
        tone === 'warning'
          ? 'border-warning/40 bg-warning/10 rounded-2xl border'
          : 'border-accent/30 bg-accent/10 rounded-2xl border'
      }
    >
      <View className="flex-row items-start gap-3 p-3.5">
        <View className="pt-0.5">{icon}</View>
        <View className="flex-1 gap-0.5">
          <Typography type="body-sm" weight="semibold">
            {title}
          </Typography>
          <Typography type="body-xs" color="muted">
            {body}
          </Typography>
        </View>
        <Typography
          type="body-sm"
          weight="semibold"
          className={tone === 'warning' ? 'text-warning' : 'text-accent'}
        >
          {actionLabel}
        </Typography>
      </View>
    </PressableFeedback>
  );
}
