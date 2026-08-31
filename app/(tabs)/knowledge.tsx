import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import {
  BookOpen,
  Croissant,
  HelpCircle,
  ScrollText,
  Sparkles,
  Store,
  Truck,
} from 'lucide-react-native';
import { Button, Chip, Separator, Spinner, Typography, useThemeColor } from 'heroui-native';

import { ScreenScroll } from '@/components/Screen';
import { SectionCard } from '@/components/SectionCard';
import { ListRow } from '@/components/ListRow';
import { ErrorNote } from '@/components/ConfirmDialog';
import { friendlyError } from '@/lib/backend';
import {
  useBakery,
  useKnowledgeSummary,
  useLoadSampleBakery,
  type SampleLoadResult,
} from '@/lib/data';

/** Plain-language summary of what the sample loader just added. */
function describeSample(result: SampleLoadResult): string {
  const parts: string[] = [];
  if (result.products > 0) parts.push(`${result.products} products`);
  if (result.policies > 0) parts.push(`${result.policies} policies`);
  if (result.faqs > 0) parts.push(`${result.faqs} FAQs`);
  if (result.zones > 0) parts.push(`${result.zones} delivery areas`);
  if (result.conversations > 0) parts.push(`${result.conversations} example chats`);
  if (result.filledProfile) parts.push('your opening hours and address');

  if (parts.length === 0) return 'Everything was already filled in, so nothing changed.';
  if (parts.length === 1) return `Added ${parts[0]}.`;
  return `Added ${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}.`;
}

export default function KnowledgeScreen() {
  const [foreground, accent] = useThemeColor(['foreground', 'accent']);
  const { data: bakery } = useBakery();
  const summary = useKnowledgeSummary();
  const loadSample = useLoadSampleBakery();
  const [sampleNote, setSampleNote] = useState<string | null>(null);

  const sections = [
    {
      key: 'products',
      icon: <Croissant size={20} color={foreground} />,
      title: 'Products & prices',
      subtitle: 'What you sell, prices, sizes and lead times',
      count: summary.products,
      onPress: () => router.push('/knowledge/products'),
    },
    {
      key: 'policies',
      icon: <ScrollText size={20} color={foreground} />,
      title: 'Policies',
      subtitle: 'Ordering, payment, cancellations, allergens',
      count: summary.policies,
      onPress: () => router.push('/knowledge/policies'),
    },
    {
      key: 'faqs',
      icon: <HelpCircle size={20} color={foreground} />,
      title: 'FAQs',
      subtitle: 'Answers to the questions customers keep asking',
      count: summary.faqs,
      onPress: () => router.push('/knowledge/faqs'),
    },
    {
      key: 'delivery',
      icon: <Truck size={20} color={foreground} />,
      title: 'Delivery areas',
      subtitle: 'Where you deliver, fees and minimum orders',
      count: summary.zones,
      onPress: () => router.push('/knowledge/delivery'),
    },
  ];

  return (
    <ScreenScroll>
      <SectionCard className="border-accent/25 bg-accent/10 border">
        <View className="flex-row items-center gap-2">
          <BookOpen size={18} color={accent} />
          <Typography type="body" weight="semibold">
            {summary.filledSections} of 4 sections filled in
          </Typography>
        </View>
        <Typography type="body-sm" color="muted">
          Everything you add here becomes the knowledge your assistant answers from. The more you
          fill in, the fewer questions it has to hand back to you.
        </Typography>
      </SectionCard>

      <SectionCard title="Knowledge base" className="px-0 pb-1">
        {sections.map((section, index) => (
          <View key={section.key}>
            {index > 0 ? (
              <View className="pl-[68px]">
                <Separator />
              </View>
            ) : null}
            <ListRow
              icon={section.icon}
              title={section.title}
              subtitle={section.subtitle}
              onPress={section.onPress}
              trailing={
                section.count > 0 ? (
                  <Chip size="sm" variant="secondary" color="default">
                    <Chip.Label>{String(section.count)}</Chip.Label>
                  </Chip>
                ) : (
                  <Chip size="sm" variant="soft" color="warning">
                    <Chip.Label>Empty</Chip.Label>
                  </Chip>
                )
              }
            />
          </View>
        ))}
      </SectionCard>

      <SectionCard title="Your bakery" className="px-0 pb-1">
        <ListRow
          icon={<Store size={20} color={foreground} />}
          title={bakery?.name ?? 'Bakery details'}
          subtitle="Opening hours, pickup address and order lead time"
          onPress={() => router.push('/knowledge/bakery')}
          trailing={
            summary.hasProfileDetails ? null : (
              <Chip size="sm" variant="soft" color="warning">
                <Chip.Label>Incomplete</Chip.Label>
              </Chip>
            )
          }
        />
      </SectionCard>

      {summary.filledSections < 4 ? (
        <SectionCard
          title="Not sure where to start?"
          subtitle="Load an example bakery — products with prices and allergens, policies, FAQs, delivery areas and two customer chats. Only the empty sections are filled, and you can edit or delete anything afterwards."
        >
          {loadSample.isError ? <ErrorNote message={friendlyError(loadSample.error)} /> : null}
          {sampleNote ? (
            <Typography type="body-sm" className="text-accent">
              {sampleNote}
            </Typography>
          ) : null}
          <Button
            variant="secondary"
            className="self-start"
            isDisabled={loadSample.isPending || !bakery}
            onPress={() => {
              setSampleNote(null);
              loadSample.mutate(undefined, {
                onSuccess: (result) => setSampleNote(describeSample(result)),
              });
            }}
          >
            {loadSample.isPending ? <Spinner size="sm" /> : <Sparkles size={16} color={accent} />}
            <Button.Label>
              {loadSample.isPending ? 'Adding…' : 'Add example bakery content'}
            </Button.Label>
          </Button>
        </SectionCard>
      ) : null}
    </ScreenScroll>
  );
}
