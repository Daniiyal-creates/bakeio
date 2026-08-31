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
import { WEBHOOK_URL, friendlyError } from '@/lib/backend';
import { formatPhone, normalizePhone, relativeTime } from '@/lib/format';
import {
  useCheckTwilioCredentials,
  useRemoveWhatsappConnection,
  useSaveWhatsappConnection,
  useWhatsappConnection,
} from '@/lib/data';
import {
  TWILIO_SANDBOX_NUMBER,
  WHATSAPP_MODES,
  type WhatsappConnection,
  type WhatsappMode,
  looksLikeAccountSid,
  toOption,
} from '@/lib/types';

const MODE_LABELS: Record<WhatsappMode, string> = {
  test: 'Just testing',
  twilio: 'Connect with Twilio',
};

const MODE_HINTS: Record<WhatsappMode, string> = {
  test: 'Nothing is sent to WhatsApp. Use the “Try it” tab to chat with your assistant and get it right first.',
  twilio:
    'Real customer messages arrive through your own Twilio account. Twilio handles WhatsApp for you, and their free sandbox number works straight away.',
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
  const check = useCheckTwilioCredentials();
  const remove = useRemoveWhatsappConnection();

  const [phone, setPhone] = useState(existing?.phone_number ?? '');
  const [displayName, setDisplayName] = useState(existing?.display_name ?? '');
  const [mode, setMode] = useState<WhatsappMode>(toOption(WHATSAPP_MODES, existing?.mode, 'test'));
  const [accountSid, setAccountSid] = useState(existing?.twilio_account_sid ?? '');
  const [authToken, setAuthToken] = useState(existing?.twilio_auth_token ?? '');
  const [sender, setSender] = useState(existing?.twilio_from_number ?? '');
  const [touched, setTouched] = useState(false);

  const [removeOpen, setRemoveOpen] = useState(false);

  const phoneError =
    touched && normalizePhone(phone).length < 8
      ? 'Enter the full number, including the country code.'
      : null;

  const twilioTouched = touched && mode === 'twilio';
  const sidError =
    twilioTouched && !looksLikeAccountSid(accountSid)
      ? 'An Account SID starts with AC and is 34 characters long.'
      : null;
  const tokenError = twilioTouched && !authToken.trim() ? 'Paste your Auth Token.' : null;
  const senderError =
    twilioTouched && normalizePhone(sender).length < 8
      ? 'Enter the sender number Twilio sends from, including the country code.'
      : null;

  const isSandbox = normalizePhone(sender) === TWILIO_SANDBOX_NUMBER;

  // Rejected credentials are never written to the database; the reason is shown
  // here instead, so the owner can fix the value and try again.
  const twilioRejection = check.data && !check.data.ok ? check.data.message : null;

  const submit = async () => {
    setTouched(true);
    if (normalizePhone(phone).length < 8) return;

    const base = {
      phone_number: normalizePhone(phone),
      display_name: displayName.trim() || null,
      mode,
    };

    if (mode === 'test') {
      save.mutate({
        ...base,
        twilio_account_sid: null,
        twilio_auth_token: null,
        twilio_from_number: null,
        status: 'connected',
        error_message: null,
        connected_at: new Date().toISOString(),
      });
      return;
    }

    if (!looksLikeAccountSid(accountSid) || !authToken.trim()) return;
    if (normalizePhone(sender).length < 8) return;

    const result = await check
      .mutateAsync({ account_sid: accountSid.trim(), auth_token: authToken.trim() })
      .catch(() => null);
    if (!result?.ok) return;

    save.mutate({
      ...base,
      twilio_account_sid: accountSid.trim(),
      twilio_auth_token: authToken.trim(),
      twilio_from_number: normalizePhone(sender),
      status: 'connected',
      error_message: null,
      connected_at: new Date().toISOString(),
    });
  };

  const busy = save.isPending || check.isPending;
  const actionError = check.isError
    ? friendlyError(check.error)
    : save.isError
      ? friendlyError(save.error)
      : remove.isError
        ? friendlyError(remove.error)
        : null;

  const savedMode = toOption(WHATSAPP_MODES, existing?.mode, 'test');
  const connected = existing?.status === 'connected';

  return (
    <ScrollView
      className="bg-background flex-1"
      contentContainerClassName="gap-4 p-4 pb-safe-offset-8"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
    >
      <ErrorNote message={actionError} />
      <ErrorNote message={existing?.error_message ?? null} />

      {existing ? (
        <SectionCard title="Status">
          <View className="flex-row items-center gap-2.5">
            {connected ? (
              <CircleCheck size={20} color={success} />
            ) : (
              <TriangleAlert size={20} color={warning} />
            )}
            <View className="flex-1">
              <Typography type="body-sm" weight="semibold">
                {connected
                  ? savedMode === 'twilio'
                    ? 'Connected to WhatsApp'
                    : 'Ready for testing'
                  : 'Not connected yet'}
              </Typography>
              <Typography type="body-xs" color="muted">
                {formatPhone(existing.phone_number)}
                {existing.connected_at ? ` · since ${relativeTime(existing.connected_at)}` : ''}
              </Typography>
            </View>
            <Chip size="sm" variant="secondary" color="default">
              <Chip.Label>{MODE_LABELS[savedMode]}</Chip.Label>
            </Chip>
          </View>

          {savedMode === 'twilio' && existing.twilio_from_number ? (
            <>
              <Separator />
              <View className="gap-1">
                <Typography type="body-xs" color="muted">
                  Replies are sent from
                </Typography>
                <Typography type="body-sm" weight="semibold">
                  {formatPhone(existing.twilio_from_number)}
                </Typography>
              </View>
            </>
          ) : null}
        </SectionCard>
      ) : null}

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
      </SectionCard>

      {mode === 'twilio' ? (
        <SectionCard
          title="Your Twilio account"
          subtitle="Copy these from your Twilio Console. Bakeio checks them with Twilio before saving."
        >
          <ErrorNote message={twilioRejection} />

          <Field
            label="Account SID"
            placeholder="AC00000000000000000000000000000000"
            autoCapitalize="none"
            autoCorrect={false}
            value={accountSid}
            onChangeText={setAccountSid}
            error={sidError}
            hint="On the Twilio Console home page, under Account Info."
          />
          <Field
            label="Auth Token"
            placeholder="Your Twilio Auth Token"
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            value={authToken}
            onChangeText={setAuthToken}
            error={tokenError}
            hint="Stored privately in your account and only used to send your replies."
          />
          <Field
            label="WhatsApp sender number"
            placeholder="+1 415 523 8886"
            keyboardType="phone-pad"
            value={sender}
            onChangeText={setSender}
            error={senderError}
            hint="The number Twilio sends from — your own WhatsApp sender, or Twilio's free sandbox."
          />
          <Button
            size="sm"
            variant="ghost"
            className="self-start"
            onPress={() => setSender(TWILIO_SANDBOX_NUMBER)}
          >
            <Button.Label>Use Twilio&apos;s sandbox number</Button.Label>
          </Button>

          {isSandbox ? (
            <Typography type="body-xs" color="muted">
              The sandbox only answers people who have sent Twilio&apos;s join code first, and each
              link lapses after 72 hours. Good for testing; use your own sender for real customers.
            </Typography>
          ) : null}

          <Separator className="my-1" />

          <Typography type="body-sm" weight="semibold">
            Paste this into Twilio
          </Typography>
          <CopyRow label="When a message comes in" value={WEBHOOK_URL} mutedColor={muted} />
          <Typography type="body-xs" color="muted">
            In Twilio: Messaging → Settings → WhatsApp sandbox settings, or your sender&apos;s
            messaging configuration. Paste it in the “when a message comes in” box and leave the
            method on HTTP POST.
          </Typography>
        </SectionCard>
      ) : null}

      <Button size="lg" isDisabled={busy} onPress={() => void submit()}>
        {busy ? <Spinner size="sm" /> : null}
        <Button.Label>
          {check.isPending
            ? 'Checking with Twilio…'
            : existing
              ? 'Save changes'
              : mode === 'twilio'
                ? 'Connect number'
                : 'Save number'}
        </Button.Label>
      </Button>

      {existing ? (
        <Button variant="ghost" isDisabled={remove.isPending} onPress={() => setRemoveOpen(true)}>
          <Button.Label className="text-danger">Remove this number</Button.Label>
        </Button>
      ) : null}

      <ConfirmDialog
        isOpen={removeOpen}
        onOpenChange={setRemoveOpen}
        title="Remove this number?"
        description="Bakeio forgets the number and your Twilio details, and stops answering. Your bakery information and past chats stay."
        confirmLabel="Remove"
        isPending={remove.isPending}
        onConfirm={() => {
          if (!existing) {
            setRemoveOpen(false);
            return;
          }
          remove.mutate(existing.id, { onSuccess: () => setRemoveOpen(false) });
        }}
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
