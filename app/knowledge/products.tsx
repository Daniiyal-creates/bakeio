import { View } from 'react-native';
import { router } from 'expo-router';
import { Croissant } from 'lucide-react-native';
import { Chip, Typography, useThemeColor } from 'heroui-native';

import { CollectionList } from '@/components/CollectionList';
import { EmptyState } from '@/components/EmptyState';
import { ListRow } from '@/components/ListRow';
import { formatMoney } from '@/lib/format';
import { useBakery, useProducts } from '@/lib/data';
import type { Product } from '@/lib/types';

const openEditor = (id: string) =>
  router.push({ pathname: '/knowledge/product/[id]', params: { id } });

export default function ProductsScreen() {
  const [muted, foreground] = useThemeColor(['muted', 'foreground']);
  const { data: bakery } = useBakery();
  const products = useProducts();

  return (
    <CollectionList<Product>
      title="Products & prices"
      items={products.data ?? []}
      isPending={products.isPending}
      isRefetching={products.isRefetching}
      error={products.isError ? products.error : undefined}
      onRefresh={() => void products.refetch()}
      addLabel="Add a product"
      onAdd={() => openEditor('new')}
      empty={
        <EmptyState
          icon={<Croissant size={28} color={muted} />}
          title="No products yet"
          body="Add what you bake, with prices, so the assistant can quote customers correctly instead of guessing."
        />
      }
      renderRow={(product) => (
        <ListRow
          icon={<Croissant size={20} color={foreground} />}
          title={product.name}
          subtitle={[product.category, product.unit].filter(Boolean).join(' · ')}
          onPress={() => openEditor(product.id)}
          trailing={
            <View className="items-end gap-1">
              <Typography type="body" weight="semibold">
                {formatMoney(product.price_cents, bakery?.currency)}
              </Typography>
              {product.available ? null : (
                <Chip size="sm" variant="soft" color="warning">
                  <Chip.Label>Sold out</Chip.Label>
                </Chip>
              )}
            </View>
          }
        />
      )}
    />
  );
}
