import { useState } from 'react';
import { View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Bot, CheckCircle2, Pause, Play } from 'lucide-react-native';
import { Chip, PressableFeedback, Typography, useThemeColor } from 'heroui-native';

import { ChatThread } from '@/components/ChatThread';
import { EmptyState } from '@/components/EmptyState';
import { ErrorNote } from '@/components/ConfirmDialog';
import { Loader } from '@/components/Loader';
import { formatPhone, relativeTime } from '@/lib/format';
import { friendlyError } from '@/lib/backend';
import {
  useConversation,
  useMessages,
  useSendOwnerMessage,
  useUpdateConversation,
} from '@/lib/data';

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [muted, warning] = useThemeColor(['muted', 'warning']);

  const conversation = useConversation(id);
  const messages = useMessages(id);
  const send = useSendOwnerMessage();
  const update = useUpdateConversation();

  const [pendingText, setPendingText] = useState<string | null>(null);

  if (conversation.isPending) return <Loader />;

  const thread = conversation.data;

  if (!thread) {
    return (
      <View className="bg-background flex-1">
        <Stack.Screen options={{ title: 'Conversation' }} />
        <EmptyState
          icon={<Bot size={28} color={muted} />}
          title="Conversation not found"
          body="It may have been deleted."
        />
      </View>
    );
  }

  const title =
    thread.customer_name ?? (thread.is_test ? 'Test customer' : formatPhone(thread.customer_phone));

  const needsHuman = thread.status === 'needs_human';

  const submit = (text: string) => {
    setPendingText(text);
    send.mutate({ conversationId: id, text }, { onSettled: () => setPendingText(null) });
  };

  const toggleAgent = () => update.mutate({ id, ai_paused: !thread.ai_paused });

  const resolve = () =>
    update.mutate({ id, status: needsHuman ? 'active' : 'closed', unread_count: 0 });

  return (
    <>
      <Stack.Screen options={{ title }} />
      <ChatThread
        messages={messages.data ?? []}
        isPending={messages.isPending}
        optimistic={pendingText ? { body: pendingText, role: 'owner' } : null}
        placeholder="Reply to this customer…"
        isSending={send.isPending}
        onSend={submit}
        header={
          <View className="gap-3">
            {messages.isError ? <ErrorNote message={friendlyError(messages.error)} /> : null}
            {send.isError ? <ErrorNote message={friendlyError(send.error)} /> : null}

            <View className="border-border bg-surface flex-row items-center gap-2 rounded-2xl border p-3">
              <View className="flex-1 gap-0.5">
                <Typography type="body-sm" weight="semibold">
                  {thread.ai_paused ? 'You are handling this chat' : 'Assistant is replying'}
                </Typography>
                <Typography type="body-xs" color="muted">
                  {thread.ai_paused
                    ? 'Automatic replies are paused for this customer.'
                    : 'New customer messages get an automatic answer.'}
                </Typography>
              </View>

              <PressableFeedback
                onPress={toggleAgent}
                className="border-border bg-surface-secondary rounded-full border px-3 py-2"
              >
                <View className="flex-row items-center gap-1.5">
                  {thread.ai_paused ? (
                    <Play size={14} color={muted} />
                  ) : (
                    <Pause size={14} color={muted} />
                  )}
                  <Typography type="body-xs" weight="medium">
                    {thread.ai_paused ? 'Resume' : 'Pause'}
                  </Typography>
                </View>
              </PressableFeedback>
            </View>

            <View className="flex-row items-center gap-2">
              <Typography type="body-xs" color="muted" className="flex-1">
                Started {relativeTime(thread.created_at)}
              </Typography>
              {thread.is_test ? (
                <Chip size="sm" variant="secondary" color="default">
                  <Chip.Label>Test thread</Chip.Label>
                </Chip>
              ) : null}
            </View>
          </View>
        }
        empty={
          <EmptyState
            icon={<Bot size={28} color={muted} />}
            title="No messages yet"
            body="When this customer writes on WhatsApp, the conversation shows up here."
          />
        }
        footer={
          needsHuman ? (
            <PressableFeedback
              onPress={resolve}
              className="border-warning/40 bg-warning/10 rounded-2xl border"
            >
              <View className="flex-row items-center gap-2.5 p-3">
                <CheckCircle2 size={18} color={warning} />
                <View className="flex-1">
                  <Typography type="body-sm" weight="semibold">
                    The assistant asked for your help
                  </Typography>
                  <Typography type="body-xs" color="muted">
                    Tap once you have sorted it out to clear the flag.
                  </Typography>
                </View>
                <Typography type="body-sm" weight="semibold" className="text-warning">
                  Done
                </Typography>
              </View>
            </PressableFeedback>
          ) : null
        }
      />
    </>
  );
}
