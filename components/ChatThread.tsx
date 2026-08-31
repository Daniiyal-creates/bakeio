import { useEffect, useRef, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { SendHorizonal } from 'lucide-react-native';
import { Button, Input, Spinner, Typography, useThemeColor } from 'heroui-native';

import { messageTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Message } from '@/lib/types';

export type ChatThreadProps = {
  messages: Message[];
  isPending: boolean;
  /** Text typed but not yet stored, shown as an optimistic bubble. */
  optimistic?: { body: string; role: Message['role'] } | null;
  /** Shows the three-dot bubble while the model is thinking. */
  awaitingReply?: boolean;
  placeholder: string;
  isSending: boolean;
  onSend: (text: string) => void;
  /** Disables the composer, e.g. while the bakery has no agent settings yet. */
  disabled?: boolean;
  header?: ReactNode;
  empty?: ReactNode;
  /** Pinned between the messages and the composer, e.g. a handoff notice. */
  footer?: ReactNode;
};

export function ChatThread({
  messages,
  isPending,
  optimistic,
  awaitingReply,
  placeholder,
  isSending,
  onSend,
  disabled,
  header,
  empty,
  footer,
}: ChatThreadProps) {
  const [accentForeground] = useThemeColor(['accent-foreground']);
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlashListRef<Message> | null>(null);

  const rows: Message[] = optimistic
    ? [
        ...messages,
        {
          id: 'optimistic',
          conversation_id: '',
          role: optimistic.role,
          body: optimistic.body,
          handoff: false,
          model: null,
          created_at: new Date().toISOString(),
        },
      ]
    : messages;

  useEffect(() => {
    if (rows.length === 0) return;
    const timer = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(timer);
  }, [rows.length, awaitingReply]);

  const canSend = draft.trim().length > 0 && !isSending && !disabled;

  const submit = () => {
    if (!canSend) return;
    onSend(draft.trim());
    setDraft('');
  };

  return (
    <KeyboardAvoidingView
      className="bg-background flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FlashList
        ref={listRef}
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-4 pt-3 pb-4"
        ListHeaderComponent={header ? <View className="pb-3">{header}</View> : null}
        ListEmptyComponent={
          isPending ? (
            <View className="py-16">
              <Spinner />
            </View>
          ) : (
            (empty ?? null)
          )
        }
        ListFooterComponent={awaitingReply ? <TypingBubble /> : null}
        renderItem={({ item }) => <Bubble message={item} />}
      />

      {footer ? <View className="px-4 pb-2">{footer}</View> : null}

      <View className="border-border bg-background pb-safe-offset-3 border-t px-4 pt-3">
        <View className="flex-row items-end gap-2">
          <Input
            className="flex-1"
            placeholder={placeholder}
            value={draft}
            onChangeText={setDraft}
            editable={!disabled}
            multiline
            onSubmitEditing={submit}
            returnKeyType="send"
            submitBehavior="submit"
          />
          <Button
            size="md"
            isIconOnly
            isDisabled={!canSend || isSending}
            onPress={submit}
            accessibilityLabel="Send message"
          >
            <Button.Label>
              {isSending ? (
                <Spinner size="sm" color="default" />
              ) : (
                <SendHorizonal size={18} color={accentForeground} />
              )}
            </Button.Label>
          </Button>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function Bubble({ message }: { message: Message }) {
  const isCustomer = message.role === 'customer';
  const isAgent = message.role === 'agent';

  return (
    <View className={cn('mb-3 max-w-[86%]', isCustomer ? 'self-start' : 'self-end')}>
      {isCustomer ? null : (
        <Typography type="body-xs" color="muted" className="mb-1 pr-1 text-right">
          {isAgent ? 'Assistant' : 'You'}
        </Typography>
      )}

      <View
        className={cn(
          'rounded-2xl px-3.5 py-2.5',
          isCustomer && 'bg-surface-secondary rounded-bl-md',
          isAgent && 'bg-accent rounded-br-md',
          message.role === 'owner' && 'border-border bg-surface rounded-br-md border',
        )}
      >
        <Typography type="body-sm" className={isAgent ? 'text-accent-foreground' : undefined}>
          {message.body}
        </Typography>
      </View>

      <View className={cn('mt-1 flex-row items-center gap-2', isCustomer ? '' : 'justify-end')}>
        <Typography type="body-xs" color="muted">
          {messageTime(message.created_at)}
        </Typography>
        {message.handoff ? (
          <Typography type="body-xs" className="text-warning">
            passed to you
          </Typography>
        ) : null}
      </View>
    </View>
  );
}

function TypingBubble() {
  return (
    <View className="mb-3 self-end">
      <Typography type="body-xs" color="muted" className="mb-1 pr-1 text-right">
        Assistant
      </Typography>
      <View className="bg-accent/15 rounded-2xl rounded-br-md px-4 py-3">
        <View className="flex-row gap-1.5">
          <View className="bg-accent/60 h-1.5 w-1.5 rounded-full" />
          <View className="bg-accent/40 h-1.5 w-1.5 rounded-full" />
          <View className="bg-accent/25 h-1.5 w-1.5 rounded-full" />
        </View>
      </View>
    </View>
  );
}
