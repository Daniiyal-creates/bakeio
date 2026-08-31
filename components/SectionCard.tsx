import type { PropsWithChildren, ReactNode } from 'react';
import { View } from 'react-native';
import { Surface, Typography } from 'heroui-native';

import { cn } from '@/lib/utils';

/** Titled card used to group related settings or knowledge-base content. */
export function SectionCard({
  title,
  subtitle,
  action,
  children,
  className,
}: PropsWithChildren<{
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}>) {
  return (
    <Surface variant="default" className={cn('gap-3 rounded-2xl p-4', className)}>
      {(title || action) && (
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-0.5">
            {title ? (
              <Typography type="body" weight="semibold">
                {title}
              </Typography>
            ) : null}
            {subtitle ? (
              <Typography type="body-sm" color="muted">
                {subtitle}
              </Typography>
            ) : null}
          </View>
          {action}
        </View>
      )}
      {children}
    </Surface>
  );
}
