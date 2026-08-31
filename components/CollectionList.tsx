import type { ReactNode } from 'react';
import { RefreshControl, View } from 'react-native';
import { Stack } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { Plus } from 'lucide-react-native';
import { Button, Separator, useThemeColor } from 'heroui-native';

import { Loader } from '@/components/Loader';
import { ErrorNote } from '@/components/ConfirmDialog';
import { friendlyError } from '@/lib/backend';

/**
 * Shared layout for the knowledge-base list screens: a flat separated list with
 * the "add" action pinned above the safe area so it is always reachable.
 */
export function CollectionList<T extends { id: string }>({
  title,
  items,
  isPending,
  isRefetching,
  error,
  onRefresh,
  addLabel,
  onAdd,
  renderRow,
  empty,
}: {
  title: string;
  items: T[];
  isPending: boolean;
  isRefetching?: boolean;
  error?: unknown;
  onRefresh?: () => void;
  addLabel: string;
  onAdd: () => void;
  renderRow: (item: T) => ReactNode;
  empty: ReactNode;
}) {
  const [accent, accentForeground] = useThemeColor(['accent', 'accent-foreground']);

  return (
    <View className="bg-background flex-1">
      <Stack.Screen options={{ title }} />

      {isPending ? (
        <Loader />
      ) : (
        <FlashList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerClassName="pt-2 pb-6"
          ListHeaderComponent={
            error ? (
              <View className="px-4 pb-2">
                <ErrorNote message={friendlyError(error)} />
              </View>
            ) : null
          }
          ItemSeparatorComponent={() => (
            <View className="pl-4">
              <Separator />
            </View>
          )}
          ListEmptyComponent={<>{empty}</>}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={Boolean(isRefetching)}
                onRefresh={onRefresh}
                tintColor={accent}
              />
            ) : undefined
          }
          renderItem={({ item }) => <>{renderRow(item)}</>}
        />
      )}

      <View className="border-border bg-background pb-safe-offset-3 border-t px-4 pt-3">
        <Button size="lg" onPress={onAdd}>
          <Plus size={18} color={accentForeground} />
          <Button.Label>{addLabel}</Button.Label>
        </Button>
      </View>
    </View>
  );
}
