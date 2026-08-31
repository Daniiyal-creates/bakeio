import { useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { Typography } from 'heroui-native';

import { FormShell } from '@/components/FormShell';
import { Field } from '@/components/Field';
import { ChipPicker } from '@/components/ChipPicker';
import { ErrorNote } from '@/components/ConfirmDialog';
import { Loader } from '@/components/Loader';
import { CURRENCY_OPTIONS } from '@/lib/format';
import { friendlyError } from '@/lib/backend';
import { goBackOrReplace } from '@/lib/navigation';
import { useBakery, useUpdateBakery } from '@/lib/data';
import { DAY_KEYS, DAY_LABELS, type OpeningHours } from '@/lib/types';

export default function BakeryDetailsScreen() {
  const bakery = useBakery();
  const update = useUpdateBakery();
  const existing = bakery.data;

  const [name, setName] = useState(existing?.name ?? '');
  const [tagline, setTagline] = useState(existing?.tagline ?? '');
  const [about, setAbout] = useState(existing?.about ?? '');
  const [address, setAddress] = useState(existing?.address ?? '');
  const [city, setCity] = useState(existing?.city ?? '');
  const [currency, setCurrency] = useState(existing?.currency ?? 'USD');
  const [leadTime, setLeadTime] = useState(existing?.order_lead_time ?? '');
  const [hours, setHours] = useState<OpeningHours>(existing?.opening_hours ?? {});
  const [touched, setTouched] = useState(false);

  if (bakery.isPending) return <Loader />;

  const nameError = touched && !name.trim() ? 'Your bakery needs a name.' : null;

  const setDay = (day: (typeof DAY_KEYS)[number], value: string) =>
    setHours((current) => ({ ...current, [day]: value }));

  const submit = () => {
    setTouched(true);
    if (!name.trim()) return;

    const cleanedHours: OpeningHours = {};
    for (const day of DAY_KEYS) {
      const value = hours[day]?.trim();
      if (value) cleanedHours[day] = value;
    }

    update.mutate(
      {
        name: name.trim(),
        tagline: tagline.trim() || null,
        about: about.trim() || null,
        address: address.trim() || null,
        city: city.trim() || null,
        currency,
        order_lead_time: leadTime.trim() || null,
        opening_hours: cleanedHours,
      },
      { onSuccess: () => goBackOrReplace('/(tabs)/knowledge') },
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Bakery details' }} />
      <FormShell submitLabel="Save details" onSubmit={submit} isSubmitting={update.isPending}>
        <ErrorNote message={update.isError ? friendlyError(update.error) : null} />

        <Field
          label="Bakery name"
          isRequired
          value={name}
          onChangeText={setName}
          error={nameError}
        />

        <Field
          label="Tagline"
          placeholder="Sourdough and pastries, baked daily"
          value={tagline}
          onChangeText={setTagline}
        />

        <Field
          label="About your bakery"
          multiline
          placeholder="A small family bakery on the corner of Oak Street since 2012."
          value={about}
          onChangeText={setAbout}
          hint="A sentence or two the assistant can use when customers ask who you are."
        />

        <Field
          label="Pickup address"
          placeholder="12 Oak Street"
          value={address}
          onChangeText={setAddress}
        />

        <Field label="City" placeholder="Lisbon" value={city} onChangeText={setCity} />

        <ChipPicker
          label="Currency"
          hint="Used for every price the assistant quotes."
          options={CURRENCY_OPTIONS}
          value={currency}
          onChange={setCurrency}
        />

        <Field
          label="Standard order notice"
          placeholder="Order by 6pm for next-day pickup"
          value={leadTime}
          onChangeText={setLeadTime}
        />

        <View className="gap-3">
          <Typography type="body" weight="semibold">
            Opening hours
          </Typography>
          <Typography type="body-sm" color="muted">
            Leave a day empty and the assistant will treat it as closed.
          </Typography>
          {DAY_KEYS.map((day) => (
            <Field
              key={day}
              label={DAY_LABELS[day]}
              placeholder="7:00 – 18:00"
              value={hours[day] ?? ''}
              onChangeText={(value) => setDay(day, value)}
            />
          ))}
        </View>
      </FormShell>
    </>
  );
}
