import { router } from 'expo-router';
import { HelpCircle } from 'lucide-react-native';
import { useThemeColor } from 'heroui-native';

import { CollectionList } from '@/components/CollectionList';
import { EmptyState } from '@/components/EmptyState';
import { ListRow } from '@/components/ListRow';
import { useFaqs } from '@/lib/data';
import type { Faq } from '@/lib/types';

const openEditor = (id: string) => router.push({ pathname: '/knowledge/faq/[id]', params: { id } });

export default function FaqsScreen() {
  const [muted, foreground] = useThemeColor(['muted', 'foreground']);
  const faqs = useFaqs();

  return (
    <CollectionList<Faq>
      title="FAQs"
      items={faqs.data ?? []}
      isPending={faqs.isPending}
      isRefetching={faqs.isRefetching}
      error={faqs.isError ? faqs.error : undefined}
      onRefresh={() => void faqs.refetch()}
      addLabel="Add a question"
      onAdd={() => openEditor('new')}
      empty={
        <EmptyState
          icon={<HelpCircle size={28} color={muted} />}
          title="No questions yet"
          body="Think of what customers message you about every week — parking, gluten-free options, big orders — and answer it once here."
        />
      }
      renderRow={(faq) => (
        <ListRow
          icon={<HelpCircle size={20} color={foreground} />}
          title={faq.question}
          subtitle={faq.answer}
          onPress={() => openEditor(faq.id)}
        />
      )}
    />
  );
}
