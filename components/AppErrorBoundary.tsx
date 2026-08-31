import { Component, type ErrorInfo, type PropsWithChildren } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Typography } from 'heroui-native';

import { reportErrorToParent } from '@/lib/reportPreviewError';

type State = {
  error: Error | null;
  /** React's component stack for the failed render — the only reliable way to
   *  tell which screen broke. Reported out, and shown on screen in development. */
  componentStack: string | null;
};

/**
 * Catches render errors anywhere below the providers and shows a recovery
 * screen a bakery owner can act on, instead of a raw stack trace.
 *
 * Expo Router's own boundary only receives the error, so the component stack —
 * the part that identifies the broken screen — was previously thrown away.
 */
export class AppErrorBoundary extends Component<PropsWithChildren, State> {
  state: State = { error: null, componentStack: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const componentStack = info.componentStack ?? null;
    this.setState({ componentStack });

    if (Platform.OS === 'web') {
      reportErrorToParent([error.message, error.stack, componentStack].filter(Boolean).join('\n'));
    }
  }

  private retry = () => {
    this.setState({ error: null, componentStack: null });
  };

  private goHome = () => {
    this.setState({ error: null, componentStack: null });
    router.replace('/');
  };

  render() {
    const { error, componentStack } = this.state;
    if (!error) return this.props.children;

    return (
      <View className="bg-background flex-1 justify-center gap-6 px-6">
        <View className="gap-2">
          <Typography.Heading type="h4">Something went wrong</Typography.Heading>
          <Typography type="body-sm" color="muted">
            Bakeio could not open this screen. Your bakery information, your settings and every
            conversation are safe — nothing was lost.
          </Typography>
        </View>

        <View className="gap-3">
          <Button size="lg" onPress={this.retry}>
            <Button.Label>Try again</Button.Label>
          </Button>
          <Button size="lg" variant="ghost" onPress={this.goHome}>
            <Button.Label>Back to the inbox</Button.Label>
          </Button>
        </View>

        {__DEV__ ? (
          <View className="border-border bg-surface-secondary max-h-64 rounded-2xl border p-3">
            <Typography type="body-xs" weight="semibold" className="mb-1">
              {error.message}
            </Typography>
            <ScrollView>
              <Typography type="body-xs" color="muted">
                {componentStack?.trim().split('\n').slice(0, 14).join('\n') ??
                  'No component stack was captured.'}
              </Typography>
            </ScrollView>
          </View>
        ) : null}
      </View>
    );
  }
}
