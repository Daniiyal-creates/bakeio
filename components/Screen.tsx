import type { PropsWithChildren } from 'react';
import { ScrollView, View } from 'react-native';

import { cn } from '@/lib/utils';

/** Plain full-bleed page background. */
export function Screen({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <View className={cn('bg-background flex-1', className)}>{children}</View>;
}

/**
 * Scrolling page body. Screens sit inside a navigator with a header, so only the
 * bottom needs padding for the tab bar / home indicator.
 */
export function ScreenScroll({
  children,
  contentClassName,
}: PropsWithChildren<{ contentClassName?: string }>) {
  return (
    <View className="bg-background flex-1">
      <ScrollView
        contentContainerClassName={cn('pb-safe-offset-8 gap-4 px-4 pt-4', contentClassName)}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  );
}
