import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Button, Typography } from 'heroui-native';

/** Friendly placeholder for a list with nothing in it yet. */
export function EmptyState({
  icon,
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View className="items-center gap-3 px-6 py-12">
      <View className="bg-surface-secondary h-16 w-16 items-center justify-center rounded-3xl">
        {icon}
      </View>
      <Typography.Heading type="h5" align="center">
        {title}
      </Typography.Heading>
      <Typography type="body-sm" color="muted" align="center">
        {body}
      </Typography>
      {actionLabel && onAction ? (
        <Button variant="secondary" onPress={onAction} className="mt-2">
          <Button.Label>{actionLabel}</Button.Label>
        </Button>
      ) : null}
    </View>
  );
}
