import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import {
  Bot,
  CheckCircle2,
  LogOut,
  MessageCircle,
  Store,
  TriangleAlert,
} from 'lucide-react-native';
import { Button, Chip, Separator, Typography, useThemeColor } from 'heroui-native';

import { ConfirmDialog, ErrorNote } from '@/components/ConfirmDialog';
import { ListRow } from '@/components/ListRow';
import { SectionCard } from '@/components/SectionCard';
import { SwitchRow } from '@/components/SwitchRow';
import { formatPhone } from '@/lib/format';
import { friendlyError } from '@/lib/backend';
import { signOut, useAuth } from '@/lib/auth';
import {
  useAgentSettings,
  useBakery,
  useUpdateAgentSettings,
  useWhatsappConnection,
} from '@/lib/data';

export default function SettingsScreen() {
  const [foreground, success, warning] = useThemeColor(['foreground', 'success', 'warning']);
  const { user } = useAuth();

  const bakery = useBakery();
  const settings = useAgentSettings();
  const connection = useWhatsappConnection();
  const updateSettings = useUpdateAgentSettings();

  const [signOutOpen, setSignOutOpen] = useState(false);

  const whatsapp = connection.data;
  const connected = whatsapp?.status === 'connected';
  const needsSetup = whatsapp?.mode === 'twilio' && whatsapp.status !== 'connected';
  const agentOn = settings.data?.enabled ?? false;

  return (
    <ScrollView
      className="bg-background flex-1"
      contentContainerClassName="gap-4 p-4 pb-safe-offset-8"
      keyboardShouldPersistTaps="handled"
    >
      {updateSettings.isError ? <ErrorNote message={friendlyError(updateSettings.error)} /> : null}

      <SectionCard
        title="Automatic replies"
        subtitle={
          agentOn
            ? 'Customers who message on WhatsApp get an answer straight away.'
            : 'Nothing is answered automatically. Every message waits for you.'
        }
      >
        <SwitchRow
          label={agentOn ? 'Assistant is on' : 'Assistant is off'}
          description="You can pause a single conversation from inside the chat."
          value={agentOn}
          onChange={(next) => updateSettings.mutate({ enabled: next })}
          isDisabled={settings.isPending || !settings.data}
        />
      </SectionCard>

      <SectionCard className="gap-0 p-0">
        <ListRow
          icon={<MessageCircle size={20} color={foreground} />}
          title="WhatsApp number"
          subtitle={
            needsSetup
              ? 'Finish connecting Twilio so customers can reach you'
              : whatsapp
                ? formatPhone(whatsapp.phone_number)
                : 'Not connected — customers cannot reach the assistant yet'
          }
          onPress={() => router.push('/settings/whatsapp')}
          trailing={
            connected ? (
              <CheckCircle2 size={18} color={success} />
            ) : (
              <TriangleAlert size={18} color={warning} />
            )
          }
        />
        <Separator className="ml-[68px]" />
        <ListRow
          icon={<Bot size={20} color={foreground} />}
          title="Assistant behaviour"
          subtitle={settings.data?.agent_name ?? 'Name, tone, greeting and handoff'}
          onPress={() => router.push('/settings/agent')}
        />
        <Separator className="ml-[68px]" />
        <ListRow
          icon={<Store size={20} color={foreground} />}
          title="Bakery details"
          subtitle={bakery.data?.name ?? 'Name, address, hours and currency'}
          onPress={() => router.push('/knowledge/bakery')}
        />
      </SectionCard>

      <SectionCard title="Account" subtitle={user?.email ?? undefined}>
        <View className="flex-row">
          <Chip size="sm" variant="secondary" color="default">
            <Chip.Label>Signed in</Chip.Label>
          </Chip>
        </View>
        <Button variant="ghost" onPress={() => setSignOutOpen(true)}>
          <Button.Label className="text-danger">
            <View className="flex-row items-center gap-2">
              <LogOut size={16} color={warning} />
              <Typography type="body-sm" weight="semibold" className="text-danger">
                Sign out
              </Typography>
            </View>
          </Button.Label>
        </Button>
      </SectionCard>

      <Typography type="body-xs" color="muted" align="center">
        Bakeio keeps your bakery information and conversations in your own account.
      </Typography>

      <ConfirmDialog
        isOpen={signOutOpen}
        onOpenChange={setSignOutOpen}
        title="Sign out of Bakeio?"
        description="Your assistant keeps answering customers. You will need your email code to sign back in."
        confirmLabel="Sign out"
        onConfirm={() => {
          setSignOutOpen(false);
          void signOut();
        }}
      />
    </ScrollView>
  );
}
