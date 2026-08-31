import { View } from 'react-native';
import { router } from 'expo-router';
import { Truck } from 'lucide-react-native';
import { Typography, useThemeColor } from 'heroui-native';

import { CollectionList } from '@/components/CollectionList';
import { EmptyState } from '@/components/EmptyState';
import { ListRow } from '@/components/ListRow';
import { formatMoney } from '@/lib/format';
import { useBakery, useDeliveryZones } from '@/lib/data';
import type { DeliveryZone } from '@/lib/types';

export default function DeliveryScreen() {
  const [muted, foreground] = useThemeColor(['muted', 'foreground']);
  const { data: bakery } = useBakery();
  const zones = useDeliveryZones();

  const openEditor = (id: string) =>
    router.push({ pathname: '/knowledge/zone/[id]', params: { id } });

  return (
    <CollectionList<DeliveryZone>
      title="Delivery areas"
      items={zones.data ?? []}
      isPending={zones.isPending}
      isRefetching={zones.isRefetching}
      error={zones.isError ? zones.error : undefined}
      onRefresh={() => void zones.refetch()}
      addLabel="Add an area"
      onAdd={() => openEditor('new')}
      empty={
        <EmptyState
          icon={<Truck size={28} color={muted} />}
          title="No delivery areas yet"
          body="Add the neighbourhoods you deliver to with their fees, and the assistant can answer “do you deliver to…?” on its own."
        />
      }
      renderRow={(zone) => (
        <ListRow
          icon={<Truck size={20} color={foreground} />}
          title={zone.area}
          subtitle={
            [
              zone.eta,
              zone.min_order_cents > 0
                ? `min ${formatMoney(zone.min_order_cents, bakery?.currency)}`
                : null,
              zone.notes,
            ]
              .filter(Boolean)
              .join(' · ') || null
          }
          onPress={() => openEditor(zone.id)}
          trailing={
            <View className="items-end">
              <Typography type="body" weight="semibold">
                {zone.fee_cents > 0 ? formatMoney(zone.fee_cents, bakery?.currency) : 'Free'}
              </Typography>
            </View>
          }
        />
      )}
    />
  );
}
