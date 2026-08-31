import type { ReactNode } from 'react';
import { View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { PressableFeedback, Typography, useThemeColor } from 'heroui-native';

import { cn } from '@/lib/utils';

/** Tappable settings/list row: leading icon, title, subtitle, trailing content. */
export function ListRow({
  icon,
  title,
  subtitle,
  trailing,
  onPress,
  showChevron = true,
  className,
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: string | null;
  trailing?: ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  className?: string;
}) {
  const [muted] = useThemeColor(['muted']);

  const content = (
    <View className={cn('flex-row items-center gap-3 px-4 py-3.5', className)}>
      {icon ? (
        <View className="bg-surface-secondary h-10 w-10 items-center justify-center rounded-xl">
          {icon}
        </View>
      ) : null}

      <View className="flex-1 gap-0.5">
        <Typography type="body" weight="medium">
          {title}
        </Typography>
        {subtitle ? (
          <Typography type="body-sm" color="muted" numberOfLines={2}>
            {subtitle}
          </Typography>
        ) : null}
      </View>

      {trailing}
      {onPress && showChevron ? <ChevronRight size={18} color={muted} /> : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <PressableFeedback onPress={onPress} className="rounded-2xl">
      {content}
    </PressableFeedback>
  );
}
