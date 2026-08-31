import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Stack } from 'expo-router';
import { Button, Spinner, Typography } from 'heroui-native';

import { ErrorNote } from '@/components/ConfirmDialog';
import { Field } from '@/components/Field';
import { ChipMultiPicker, ChipPicker } from '@/components/ChipPicker';
import { Loader } from '@/components/Loader';
import { SectionCard } from '@/components/SectionCard';
import { SwitchRow } from '@/components/SwitchRow';
import { friendlyError } from '@/lib/backend';
import { goBackOrReplace } from '@/lib/navigation';
import { useAgentSettings, useBakery, useUpdateAgentSettings } from '@/lib/data';
import { AGENT_TONES, TONE_LABELS, type AgentTone, toOption } from '@/lib/types';

const LANGUAGES = [
  'Match the customer',
  'English',
  'Portuguese',
  'Spanish',
  'French',
  'German',
  'Italian',
];

const DEFAULT_HANDOFF = ['complaint', 'refund', 'wrong order', 'speak to a human', 'manager'];

export default function AgentSettingsScreen() {
  const settings = useAgentSettings();
  const { data: bakery } = useBakery();
  const update = useUpdateAgentSettings();

  const existing = settings.data;

  const [enabled, setEnabled] = useState(existing?.enabled ?? true);
  const [agentName, setAgentName] = useState(existing?.agent_name ?? '');
  const [tone, setTone] = useState<AgentTone>(toOption(AGENT_TONES, existing?.tone, 'friendly'));
  const [language, setLanguage] = useState(existing?.language ?? 'Match the customer');
  const [greeting, setGreeting] = useState(existing?.greeting ?? '');
  const [fallback, setFallback] = useState(existing?.fallback_message ?? '');
  const [handoff, setHandoff] = useState<string[]>(existing?.handoff_keywords ?? []);
  const [strict, setStrict] = useState(existing?.answer_only_from_knowledge ?? true);
  const [outsideHours, setOutsideHours] = useState(existing?.auto_reply_outside_hours ?? true);
  const [touched, setTouched] = useState(false);

  if (settings.isPending) return <Loader />;

  const nameError = touched && !agentName.trim() ? 'Give your assistant a name.' : null;
  const handoffOptions = [...new Set([...DEFAULT_HANDOFF, ...handoff])];

  const submit = () => {
    setTouched(true);
    if (!agentName.trim()) return;

    update.mutate(
      {
        enabled,
        agent_name: agentName.trim(),
        tone,
        language,
        greeting: greeting.trim(),
        fallback_message: fallback.trim(),
        handoff_keywords: handoff,
        answer_only_from_knowledge: strict,
        auto_reply_outside_hours: outsideHours,
      },
      { onSuccess: () => goBackOrReplace('/(tabs)/settings') },
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Assistant behaviour' }} />
      <ScrollView
        className="bg-background flex-1"
        contentContainerClassName="gap-4 p-4 pb-safe-offset-8"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <ErrorNote message={update.isError ? friendlyError(update.error) : null} />

        <SectionCard title="On or off">
          <SwitchRow
            label="Answer customers automatically"
            description="Switch off and every WhatsApp message waits for you instead."
            value={enabled}
            onChange={setEnabled}
          />
        </SectionCard>

        <SectionCard title="How it introduces itself">
          <Field
            label="Assistant name"
            isRequired
            placeholder={`${bakery?.name ?? 'Bakery'} Assistant`}
            value={agentName}
            onChangeText={setAgentName}
            error={nameError}
          />

          <ChipPicker
            label="Tone of voice"
            options={AGENT_TONES}
            value={tone}
            onChange={setTone}
            labelFor={(option) => TONE_LABELS[option]}
          />

          <ChipPicker
            label="Language"
            hint="“Match the customer” replies in whatever language they wrote in."
            options={LANGUAGES}
            value={language}
            onChange={setLanguage}
          />

          <Field
            label="First message"
            multiline
            placeholder="Hi! Thanks for messaging us. How can I help?"
            value={greeting}
            onChangeText={setGreeting}
            hint="Sent as the opening line of a brand new conversation."
          />
        </SectionCard>

        <SectionCard
          title="When it does not know"
          subtitle="Everything the assistant says comes from your products, policies, FAQs and delivery areas."
        >
          <SwitchRow
            label="Never guess"
            description="Strongly recommended. The assistant will say it needs to check with you rather than inventing prices or rules."
            value={strict}
            onChange={setStrict}
          />

          <Field
            label="What to say instead"
            multiline
            placeholder="Let me check with the bakery and get back to you shortly."
            value={fallback}
            onChangeText={setFallback}
          />

          <SwitchRow
            label="Reply outside opening hours"
            description="Answers overnight and mentions when you open again."
            value={outsideHours}
            onChange={setOutsideHours}
          />
        </SectionCard>

        <SectionCard
          title="Hand over to you"
          subtitle="If a customer writes one of these, the assistant stops and flags the chat for you."
        >
          <ChipMultiPicker options={handoffOptions} values={handoff} onChange={setHandoff} />
          <Typography type="body-xs" color="muted">
            Complaints and refunds are usually worth handling yourself.
          </Typography>
        </SectionCard>

        <View className="gap-2">
          <Button size="lg" isDisabled={update.isPending} onPress={submit}>
            {update.isPending ? <Spinner size="sm" /> : null}
            <Button.Label>Save assistant</Button.Label>
          </Button>
        </View>
      </ScrollView>
    </>
  );
}
