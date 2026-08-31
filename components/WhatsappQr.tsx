import { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { CircleCheck, Link2Off, Smartphone, TriangleAlert } from 'lucide-react-native';
import { Chip, Separator, Spinner, Typography, useThemeColor } from 'heroui-native';

import { formatPhone, relativeTime } from '@/lib/format';
import { isWorkerOnline, type WhatsappConnection } from '@/lib/types';

const STEPS = [
  'Open WhatsApp on the phone that uses your business number.',
  'Tap Settings, then Linked devices.',
  'Tap Link a device.',
  'Point the camera at the code above.',
];

type Presentation = {
  tone: 'ok' | 'busy' | 'warn';
  title: string;
  body: string;
};

function describe(connection: WhatsappConnection, workerOnline: boolean): Presentation {
  if (connection.desired_state !== 'connected') {
    return connection.status === 'disconnected'
      ? {
          tone: 'warn',
          title: 'Disconnected',
          body: 'Customer messages are not reaching Bakeio. Reconnect to start answering again.',
        }
      : { tone: 'busy', title: 'Disconnecting', body: 'Unlinking Bakeio from your WhatsApp.' };
  }

  if (!workerOnline) {
    return {
      tone: 'warn',
      title: 'Waiting for the WhatsApp service',
      body: 'The service that holds your WhatsApp session is not responding, so nothing is being answered right now.',
    };
  }

  switch (connection.status) {
    case 'connected':
      return {
        tone: 'ok',
        title: 'Connected',
        body: 'Bakeio is linked to your WhatsApp and answering customers.',
      };
    case 'qr_pending':
      return {
        tone: 'busy',
        title: 'Waiting for you to scan',
        body: 'Link Bakeio from your phone using the code below.',
      };
    case 'error':
      return {
        tone: 'warn',
        title: 'Connection problem',
        body: 'WhatsApp would not keep the session open. Bakeio keeps trying.',
      };
    default:
      return { tone: 'busy', title: 'Connecting', body: 'Reaching WhatsApp…' };
  }
}

/**
 * Live view of a QR-paired WhatsApp session.
 *
 * Purely presentational: the session worker owns the connection and writes
 * status, the pairing image and errors onto the row this reads.
 */
export function WhatsappQrPanel({ connection }: { connection: WhatsappConnection }) {
  const [success, warning, muted, foreground] = useThemeColor([
    'success',
    'warning',
    'muted',
    'foreground',
  ]);

  const workerOnline = isWorkerOnline(connection);
  const showQr = connection.desired_state === 'connected' && connection.status === 'qr_pending';

  // Only tick while a code is on screen, so the rest of the app is untouched.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!showQr) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [showQr]);

  const expiresAt = connection.qr_expires_at ? new Date(connection.qr_expires_at).getTime() : 0;
  const secondsLeft = expiresAt ? Math.max(0, Math.round((expiresAt - now) / 1000)) : 0;
  const codeIsFresh = Boolean(connection.qr_image) && secondsLeft > 0;

  const state = describe(connection, workerOnline);
  const toneColor = state.tone === 'ok' ? success : state.tone === 'warn' ? warning : muted;

  return (
    <View className="border-border bg-surface gap-4 rounded-2xl border p-4">
      <View className="flex-row items-center gap-2.5">
        {state.tone === 'ok' ? (
          <CircleCheck size={20} color={success} />
        ) : state.tone === 'warn' ? (
          <TriangleAlert size={20} color={warning} />
        ) : (
          <Spinner size="sm" />
        )}
        <View className="flex-1">
          <Typography type="body-sm" weight="semibold" style={{ color: toneColor }}>
            {state.title}
          </Typography>
          <Typography type="body-xs" color="muted">
            {state.body}
          </Typography>
        </View>
      </View>

      {connection.status === 'connected' ? (
        <>
          <Separator />
          <View className="gap-1">
            <Typography type="body-xs" color="muted">
              Linked WhatsApp number
            </Typography>
            <Typography type="body-sm" weight="semibold">
              {formatPhone(connection.linked_as ?? connection.phone_number)}
            </Typography>
            {connection.connected_at ? (
              <Typography type="body-xs" color="muted">
                Linked {relativeTime(connection.connected_at)}
              </Typography>
            ) : null}
          </View>

          {connection.linked_as &&
          connection.linked_as.replace(/\D/g, '') !== connection.phone_number.replace(/\D/g, '') ? (
            <View className="border-border bg-surface-secondary flex-row gap-2 rounded-xl border p-3">
              <TriangleAlert size={16} color={warning} />
              <Typography type="body-xs" color="muted" className="flex-1">
                You scanned from {formatPhone(connection.linked_as)}, which is not the number saved
                above. Customers will see replies from the number you scanned.
              </Typography>
            </View>
          ) : null}
        </>
      ) : null}

      {showQr ? (
        <>
          <Separator />
          {codeIsFresh ? (
            <View className="items-center gap-3">
              <View className="rounded-2xl bg-white p-3">
                <Image
                  source={{ uri: connection.qr_image! }}
                  style={{ width: 232, height: 232 }}
                  resizeMode="contain"
                  accessibilityLabel="WhatsApp pairing code"
                />
              </View>
              <Chip size="sm" variant="secondary" color="default">
                <Chip.Label>Code refreshes in {secondsLeft}s</Chip.Label>
              </Chip>
            </View>
          ) : (
            <View className="items-center gap-3 py-10">
              <Spinner size="md" />
              <Typography type="body-sm" color="muted">
                {connection.qr_image ? 'Getting a fresh code…' : 'Asking WhatsApp for a code…'}
              </Typography>
            </View>
          )}

          <View className="gap-2">
            {STEPS.map((step, index) => (
              <View key={step} className="flex-row gap-2.5">
                <View className="bg-surface-secondary size-5 items-center justify-center rounded-full">
                  <Typography type="body-xs" weight="semibold">
                    {index + 1}
                  </Typography>
                </View>
                <Typography type="body-sm" color="muted" className="flex-1">
                  {step}
                </Typography>
              </View>
            ))}
          </View>

          <View className="flex-row gap-2">
            <Smartphone size={16} color={muted} />
            <Typography type="body-xs" color="muted" className="flex-1">
              Bakeio links as an extra device, the same way WhatsApp Web does. Keep WhatsApp
              installed on that phone and online.
            </Typography>
          </View>
        </>
      ) : null}

      {connection.desired_state === 'connected' && !workerOnline ? (
        <View className="border-border bg-surface-secondary flex-row gap-2 rounded-xl border p-3">
          <Link2Off size={16} color={foreground} />
          <Typography type="body-xs" color="muted" className="flex-1">
            Your WhatsApp session runs on a small service outside the app. Once it is running this
            screen updates on its own.
          </Typography>
        </View>
      ) : null}
    </View>
  );
}
