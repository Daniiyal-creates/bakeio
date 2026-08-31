import { router } from 'expo-router';
import { ScrollText } from 'lucide-react-native';
import { Chip, useThemeColor } from 'heroui-native';

import { CollectionList } from '@/components/CollectionList';
import { EmptyState } from '@/components/EmptyState';
import { ListRow } from '@/components/ListRow';
import { usePolicies } from '@/lib/data';
import type { Policy } from '@/lib/types';

export default function PoliciesScreen() {
  const [muted, foreground] = useThemeColor(['muted', 'foreground']);
  const policies = usePolicies();

  const openEditor = (id: string) =>
    router.push({ pathname: '/knowledge/policy/[id]', params: { id } });

  return (
    <CollectionList<Policy>
      title="Policies"
      items={policies.data ?? []}
      isPending={policies.isPending}
      isRefetching={policies.isRefetching}
      error={policies.isError ? policies.error : undefined}
      onRefresh={() => void policies.refetch()}
      addLabel="Add a policy"
      onAdd={() => openEditor('new')}
      empty={
        <EmptyState
          icon={<ScrollText size={28} color={muted} />}
          title="No policies yet"
          body="Write down how ordering, payment, cancellations and allergens work, so the assistant never has to invent an answer."
        />
      }
      renderRow={(policy) => (
        <ListRow
          icon={<ScrollText size={20} color={foreground} />}
          title={policy.title}
          subtitle={policy.body}
          onPress={() => openEditor(policy.id)}
          trailing={
            <Chip size="sm" variant="secondary" color="default">
              <Chip.Label>{policy.category}</Chip.Label>
            </Chip>
          }
        />
      )}
    />
  );
}
