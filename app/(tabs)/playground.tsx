import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { BookOpen, RotateCcw, Sparkles } from 'lucide-react-native';
import { Chip, PressableFeedback, Typography, useThemeColor } from 'heroui-native';

import { ChatThread } from '@/components/ChatThread';
import { EmptyState } from '@/components/EmptyState';
import { ErrorNote } from '@/components/ConfirmDialog';
import { Loader } from '@/components/Loader';
import { friendlyError } from '@/lib/backend';
import {
  useAgentSettings,
  useAskAgent,
  useBakeryId,
  useClearConversationMessages,
  useKnowledgeSummary,
  useMessages,
  useTestConversation,
} from '@/lib/data';
import type { AgentReplyResult } from '@/lib/types';

const SAMPLE_QUESTIONS = [
  'What time do you open on Sunday?',
  'How much is a sourdough loaf?',
  'Do you deliver to the city centre?',
  'Can I order a birthday cake for Saturday?',
  'Is anything gluten-free?',
];

const REASON_TEXT: Record<NonNullable<AgentReplyResult['reason']>, string> = {
  agent_disabled: 'Your assistant is switched off, so it did not reply. Turn it on in Settings.',
  ai_paused: 'Automatic replies are paused for this thread. Resume them to test again.',
  no_settings: 'Set up your assistant in Settings before testing it.',
  missing_api_key: 'The assistant could not reach the AI service. Please try again shortly.',
};

export default function PlaygroundScreen() {
  const [muted, accent] = useThemeColor(['muted', 'accent']);

  const bakeryId = useBakeryId();
  const settings = useAgentSettings();
  const knowledge = useKnowledgeSummary();
  const ensureThread = useTestConversation();
  const ask = useAskAgent();
  const clear = useClearConversationMessages();

  const [threadId, setThreadId] = useState<string | null>(null);
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const requested = useRef(false);

  const messages = useMessages(threadId ?? '');

  useEffect(() => {
    if (!bakeryId || requested.current) return;
    requested.current = true;
    ensureThread.mutate(undefined, {
      onSuccess: (conversation) => setThreadId(conversation.id),
      onError: () => {
        requested.current = false;
      },
    });
  }, [bakeryId, ensureThread]);

  if (!threadId) {
    return ensureThread.isError ? (
      <View className="bg-background flex-1 justify-center p-4">
        <ErrorNote message={friendlyError(ensureThread.error)} />
      </View>
    ) : (
      <Loader />
    );
  }

  const submit = (text: string) => {
    setNotice(null);
    setPendingText(text);
    ask.mutate(
      { conversationId: threadId, text },
      {
        onSuccess: (result) => {
          if (!result.replied && result.reason) setNotice(REASON_TEXT[result.reason]);
        },
        onSettled: () => setPendingText(null),
      },
    );
  };

  const hasKnowledge = knowledge.filledSections > 0;
  const agentName = settings.data?.agent_name ?? 'your assistant';

  return (
    <ChatThread
      messages={messages.data ?? []}
      isPending={messages.isPending}
      optimistic={pendingText ? { body: pendingText, role: 'customer' } : null}
      awaitingReply={ask.isPending}
      placeholder="Ask something as a customer…"
      isSending={ask.isPending}
      onSend={submit}
      header={
        <View className="gap-3">
          {ask.isError ? <ErrorNote message={friendlyError(ask.error)} /> : null}
          {notice ? <ErrorNote message={notice} /> : null}

          <View className="border-accent/25 bg-accent/10 rounded-2xl border p-3.5">
            <View className="flex-row items-start gap-2.5">
              <Sparkles size={18} color={accent} />
              <View className="flex-1 gap-0.5">
                <Typography type="body-sm" weight="semibold">
                  You are the customer here
                </Typography>
                <Typography type="body-xs" color="muted">
                  Whatever you type gets answered by {agentName} using only your bakery information.
                  Nothing is sent to WhatsApp.
                </Typography>
              </View>
            </View>
          </View>

          {hasKnowledge ? null : (
            <PressableFeedback
              onPress={() => router.push('/(tabs)/knowledge')}
              className="border-border bg-surface rounded-2xl border"
            >
              <View className="flex-row items-center gap-2.5 p-3.5">
                <BookOpen size={18} color={muted} />
                <View className="flex-1">
                  <Typography type="body-sm" weight="semibold">
                    Your knowledge base is empty
                  </Typography>
                  <Typography type="body-xs" color="muted">
                    Add products and FAQs first, or the assistant will keep saying it does not know.
                  </Typography>
                </View>
              </View>
            </PressableFeedback>
          )}

          {(messages.data?.length ?? 0) > 0 ? (
            <View className="flex-row justify-end">
              <PressableFeedback
                onPress={() => clear.mutate(threadId)}
                className="border-border bg-surface-secondary rounded-full border px-3 py-1.5"
              >
                <View className="flex-row items-center gap-1.5">
                  <RotateCcw size={13} color={muted} />
                  <Typography type="body-xs" weight="medium">
                    {clear.isPending ? 'Clearing…' : 'Start over'}
                  </Typography>
                </View>
              </PressableFeedback>
            </View>
          ) : null}
        </View>
      }
      empty={
        <View className="gap-4 pt-4">
          <EmptyState
            icon={<Sparkles size={28} color={muted} />}
            title="Try the assistant"
            body="Send a message the way a customer would, and see exactly what your assistant answers before real people see it."
          />
          <View className="gap-2 px-2">
            <Typography type="body-xs" color="muted" align="center">
              Or tap one of these
            </Typography>
            <View className="flex-row flex-wrap justify-center gap-2">
              {SAMPLE_QUESTIONS.map((question) => (
                <Chip
                  key={question}
                  size="sm"
                  variant="secondary"
                  color="default"
                  onPress={() => submit(question)}
                >
                  <Chip.Label>{question}</Chip.Label>
                </Chip>
              ))}
            </View>
          </View>
        </View>
      }
    />
  );
}
