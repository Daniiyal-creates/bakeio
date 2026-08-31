import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Stack } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Check, CircleCheck, Copy, TriangleAlert } from 'lucide-react-native';
import { Button, Chip, Separator, Spinner, Typography, useThemeColor } from 'heroui-native';

import { ConfirmDialog, ErrorNote } from '@/components/ConfirmDialog';
import { Field } from '@/components/Field';
import { ChipPicker } from '@/components/ChipPicker';
import { Loader } from '@/components/Loader';
import { SectionCard } from '@/components/SectionCard';
import { WhatsappQrPanel } from '@/components/WhatsappQr';
import { WEBHOOK_URL, friendlyError } from '@/lib/backend';
import { formatPhone, normalizePhone, relativeTime } from '@/lib/format';
import {
  useRemoveWhatsappConnection,
  useSaveWhatsappConnection,
  useSetWhatsappDesiredState,
  useWhatsappConnection,
} from '@/lib/data';
import { WHATSAPP_MODES, type WhatsappConnection, type WhatsappMode, toOption } from '@/lib/types';

const MODE_LABELS: Record<WhatsappMode, string> = {
  test: 'Just testing',
  qr: 'Scan a QR code',
  live: 'WhatsApp Business API',
};

const MODE_HINTS: Record<WhatsappMode, string> = {
  test: 'Nothing is sent to WhatsApp. Use the “Try it” tab to chat with your assistant and get it right first.',
  qr: 'Link Bakeio to the WhatsApp already on your phone by scanning a code, the way WhatsApp Web does. No approval from Meta needed.',
  live: 'Real customer messages arrive through the official API. This needs a WhatsApp Business account approved by Meta.',
};

export default function WhatsappScreen() {
  const connection = useWhatsappConnection();

  return (
    <>
      <Stack.Screen options={{ title: 'WhatsApp number' }} />
      {connection.isPending ? <Loader /> : <WhatsappForm existing={connection.data ?? null} />}
    </>
  );
}

function WhatsappForm({ existing }: { existing: WhatsappConnection | null }) {
  const [muted, success, warning] = useThemeColor(['muted', 'success', 'warning']);

  const save = useSaveWhatsappConnection();
  const setDesiredState = useSetWhatsappDesiredState();
  const remove = useRemoveWhatsappConnection();

  const [phone, setPhone] = useState(existing?.phone_number ?? '');
  const [displayName, setDisplayName] = useState(existing?.display_name ?? '');
  const [mode, setMode] = useState<WhatsappMode>(toOption(WHATSAPP_MODES, existing?.mode, 'test'));
  const [phoneNumberId, setPhoneNumberId] = useState(existing?.provider_phone_number_id ?? '');
  const [token, setToken] = useState(existing?.provider_token ?? '');
  const [touched, setTouched] = useState(false);

  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);

  const phoneError =
    touched && normalizePhone(phone).length < 8
      ? 'Enter the full number, including the country code.'
      : null;
  const liveError =
    touched && mode === 'live' && (!phoneNumberId.trim() || !token.trim())
      ? 'Both the phone number ID and the access token are needed for a live number.'
      : null;

  const qrSession = existing?.mode === 'qr' ? existing : null;
  const qrIsOn = qrSession?.desired_state === 'connected';

  const submit = () => {
    setTouched(true);
    if (normalizePhone(phone).length < 8) return;
    if (mode === 'live' && (!phoneNumberId.trim() || !token.trim())) return;

    const base = {
      phone_number: normalizePhone(phone),
      display_name: displayName.trim() || null,
      mode,
      error_message: null,
    };

    if (mode === 'qr') {
      // Editing the name of a live session must not knock it offline, so an
      // existing QR session keeps whatever state the worker last reported.
      save.mutate({
        ...base,
        desired_state: 'connected',
        status: qrIsOn ? existing!.status : 'connecting',
        provider_phone_number_id: null,
        provider_token: null,
      });
      return;
    }

    save.mutate({
      ...base,
      // Leaving QR mode tells the worker to unlink and forget the session.
      desired_state: 'disconnected',
      provider_phone_number_id: mode === 'live' ? phoneNumberId.trim() : null,
      provider_token: mode === 'live' ? token.trim() : null,
      status: mode === 'live' ? 'pending' : 'connected',
      connected_at: mode === 'live' ? null : new Date().toISOString(),
      qr_image: null,
      qr_expires_at: null,
      linked_as: null,
    });
  };

  const busy = save.isPending || setDesiredState.isPending;
  const actionError = save.isError
    ? friendlyError(save.error)
    : setDesiredState.isError
      ? friendlyError(setDesiredState.error)
      : remove.isError
        ? friendlyError(remove.error)
        : null;

  return (
    <ScrollView
      className="bg-background flex-1"
      contentContainerClassName="gap-4 p-4 pb-safe-offset-8"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
    >
      <ErrorNote message={actionError} />
      <ErrorNote message={existing?.error_message ?? null} />

      {existing && existing.mode !== 'qr' ? (
        <SectionCard title="Status">
          <View className="flex-row items-center gap-2.5">
            {existing.status === 'connected' ? (
              <CircleCheck size={20} color={success} />
            ) : (
              <TriangleAlert size={20} color={warning} />
            )}
            <View className="flex-1">
              <Typography type="body-sm" weight="semibold">
                {existing.status === 'connected'
                  ? existing.mode === 'live'
                    ? 'Connected to WhatsApp'
                    : 'Ready for testing'
                  : 'Waiting for WhatsApp to verify'}
              </Typography>
              <Typography type="body-xs" color="muted">
                {formatPhone(existing.phone_number)}
                {existing.connected_at ? ` · since ${relativeTime(existing.connected_at)}` : ''}
              </Typography>
            </View>
            <Chip size="sm" variant="secondary" color="default">
              <Chip.Label>
                {MODE_LABELS[toOption(WHATSAPP_MODES, existing.mode, 'test')]}
              </Chip.Label>
            </Chip>
          </View>
        </SectionCard>
      ) : null}

      {qrSession ? <WhatsappQrPanel connection={qrSession} /> : null}

      <SectionCard
        title="Your number"
        subtitle="This is the number customers already message you on."
      >
        <Field
          label="WhatsApp number"
          isRequired
          placeholder="+351 912 345 678"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          error={phoneError}
        />
        <Field
          label="Business name shown to customers"
          placeholder="Oak Street Bakery"
          value={displayName}
          onChangeText={setDisplayName}
        />
      </SectionCard>

      <SectionCard title="How do you want to connect?">
        <ChipPicker
          options={WHATSAPP_MODES}
          value={mode}
          onChange={setMode}
          labelFor={(option) => MODE_LABELS[option]}
        />
        <Typography type="body-sm" color="muted">
          {MODE_HINTS[mode]}
        </Typography>
        {mode === 'qr' ? (
          <Typography type="body-xs" color="muted">
            Answer only customers who message you first. Numbers used for bulk or unsolicited
            messages can be blocked by WhatsApp.
          </Typography>
        ) : null}
      </SectionCard>

      {mode === 'live' ? (
        <SectionCard
          title="Connect through WhatsApp Business"
          subtitle="Copy these two values from your Meta WhatsApp app, then paste your webhook details back into Meta."
        >
          <ErrorNote message={liveError} />

          <Field
            label="Phone number ID"
            placeholder="123456789012345"
            value={phoneNumberId}
            onChangeText={setPhoneNumberId}
            hint="Meta shows this under WhatsApp → API Setup."
          />
          <Field
            label="Permanent access token"
            placeholder="EAAG…"
            autoCapitalize="none"
            value={token}
            onChangeText={setToken}
            hint="Stored privately in your account and only used to send your replies."
          />

          <Separator className="my-1" />

          <Typography type="body-sm" weight="semibold">
            Paste these into Meta
          </Typography>
          <CopyRow label="Callback URL" value={WEBHOOK_URL} mutedColor={muted} />
          <CopyRow
            label="Verify token"
            value={existing?.webhook_verify_token ?? 'Save first to generate a token'}
            mutedColor={muted}
            disabled={!existing?.webhook_verify_token}
          />
          <Typography type="body-xs" color="muted">
            Once Meta accepts the webhook, this screen flips to Connected on its own.
          </Typography>
        </SectionCard>
      ) : null}

      <Button size="lg" isDisabled={busy} onPress={submit}>
        {save.isPending ? <Spinner size="sm" /> : null}
        <Button.Label>
          {mode === 'qr'
            ? qrSession
              ? 'Save changes'
              : 'Show my QR code'
            : existing
              ? 'Save changes'
              : mode === 'live'
                ? 'Connect number'
                : 'Save number'}
        </Button.Label>
      </Button>

      {qrSession ? (
        qrIsOn ? (
          <Button variant="secondary" isDisabled={busy} onPress={() => setDisconnectOpen(true)}>
            <Button.Label>Disconnect WhatsApp</Button.Label>
          </Button>
        ) : (
          <Button
            variant="secondary"
            isDisabled={busy}
            onPress={() => setDesiredState.mutate({ id: qrSession.id, desired_state: 'connected' })}
          >
            {setDesiredState.isPending ? <Spinner size="sm" /> : null}
            <Button.Label>Reconnect WhatsApp</Button.Label>
          </Button>
        )
      ) : null}

      {existing ? (
        <Button variant="ghost" isDisabled={remove.isPending} onPress={() => setRemoveOpen(true)}>
          <Button.Label className="text-danger">Remove this number</Button.Label>
        </Button>
      ) : null}

      <ConfirmDialog
        isOpen={disconnectOpen}
        onOpenChange={setDisconnectOpen}
        title="Disconnect WhatsApp?"
        description="Bakeio unlinks from your WhatsApp and stops answering customers. Your bakery information and past chats stay, and you can reconnect by scanning again."
        confirmLabel="Disconnect"
        isPending={setDesiredState.isPending}
        onConfirm={() =>
          setDesiredState.mutate(
            { id: qrSession!.id, desired_state: 'disconnected' },
            { onSuccess: () => setDisconnectOpen(false) },
          )
        }
      />

      <ConfirmDialog
        isOpen={removeOpen}
        onOpenChange={setRemoveOpen}
        title="Remove this number?"
        description="Bakeio forgets the number and any WhatsApp link, and stops answering. Your bakery information and past chats stay."
        confirmLabel="Remove"
        isPending={remove.isPending}
        onConfirm={() => remove.mutate(existing!.id, { onSuccess: () => setRemoveOpen(false) })}
      />
    </ScrollView>
  );
}

function CopyRow({
  label,
  value,
  mutedColor,
  disabled,
}: {
  label: string;
  value: string;
  mutedColor: string;
  disabled?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    if (disabled) return;
    void Clipboard.setStringAsync(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };

  return (
    <View className="border-border bg-surface-secondary gap-1 rounded-xl border p-3">
      <Typography type="body-xs" color="muted">
        {label}
      </Typography>
      <View className="flex-row items-center gap-2">
        <Typography type="body-sm" className="flex-1" numberOfLines={2}>
          {value}
        </Typography>
        <Button size="sm" variant="ghost" isIconOnly isDisabled={disabled} onPress={copy}>
          <Button.Label>
            {copied ? (
              <Check size={16} color={mutedColor} />
            ) : (
              <Copy size={16} color={mutedColor} />
            )}
          </Button.Label>
        </Button>
      </View>
    </View>
  );
}
