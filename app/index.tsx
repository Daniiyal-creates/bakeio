import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { Button, Typography } from 'heroui-native';

import { Loader } from '@/components/Loader';
import { useAuth } from '@/lib/auth';
import { useBakery } from '@/lib/data';

/**
 * Entry gate. Decides between signing in, first-run setup, and the app itself,
 * so no other screen has to guard for a missing session or bakery.
 */
export default function Index() {
  const { session, initializing } = useAuth();
  const bakery = useBakery();

  if (initializing) return <Loader />;
  if (!session) return <Redirect href="/sign-in" />;

  if (bakery.isPending) return <Loader label="Opening your bakery…" />;

  if (bakery.isError) {
    return (
      <View className="bg-background flex-1 items-center justify-center gap-4 px-8">
        <Typography.Heading type="h5" align="center">
          We could not load your bakery
        </Typography.Heading>
        <Typography type="body-sm" color="muted" align="center">
          Check your connection and try again.
        </Typography>
        <Button onPress={() => void bakery.refetch()}>
          <Button.Label>Try again</Button.Label>
        </Button>
      </View>
    );
  }

  if (!bakery.data) return <Redirect href="/onboarding" />;

  return <Redirect href="/(tabs)" />;
}
