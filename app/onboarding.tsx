import { Fragment, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Select, Separator, Typography } from 'heroui-native';

import { ErrorNote } from '@/components/ConfirmDialog';
import { Field } from '@/components/Field';
import { FormShell } from '@/components/FormShell';
import { friendlyError } from '@/lib/backend';
import { CURRENCY_OPTIONS } from '@/lib/format';
import { useCreateBakery } from '@/lib/data';

type CurrencyOption = { value: string; label: string };

const CURRENCIES: CurrencyOption[] = CURRENCY_OPTIONS.map((code) => ({
  value: code,
  label: code,
}));

export default function Onboarding() {
  const createBakery = useCreateBakery();

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [tagline, setTagline] = useState('');
  const [currency, setCurrency] = useState<CurrencyOption | undefined>(CURRENCIES[0]);
  const [nameError, setNameError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim()) {
      setNameError('Your bakery needs a name.');
      return;
    }
    setNameError(null);
    setError(null);

    try {
      await createBakery.mutateAsync({
        name: name.trim(),
        city: city.trim() || null,
        tagline: tagline.trim() || null,
        currency: currency?.value ?? 'USD',
      });
      router.replace('/(tabs)');
    } catch (err) {
      setError(friendlyError(err));
    }
  };

  return (
    <FormShell
      submitLabel="Create my bakery"
      onSubmit={() => void submit()}
      isSubmitting={createBakery.isPending}
    >
      <View className="pt-safe-offset-6 gap-2">
        <Typography.Heading type="h3">Tell us about your bakery</Typography.Heading>
        <Typography type="body-sm" color="muted">
          Just the basics for now. You will add your products, prices and policies next — that is
          what the assistant answers from.
        </Typography>
      </View>

      <Field
        label="Bakery name"
        placeholder="Rosie's Bakehouse"
        value={name}
        onChangeText={(text) => {
          setName(text);
          setNameError(null);
        }}
        error={nameError}
        isRequired
        autoCapitalize="words"
      />

      <Field
        label="Town or city"
        placeholder="Lisbon"
        value={city}
        onChangeText={setCity}
        hint="Helps the assistant answer questions about where you are."
        autoCapitalize="words"
      />

      <Field
        label="One-line description"
        placeholder="Sourdough and pastries, baked fresh daily"
        value={tagline}
        onChangeText={setTagline}
      />

      <View className="gap-2">
        <Typography type="body-sm" weight="medium">
          Currency for your prices
        </Typography>
        <Select value={currency} onValueChange={setCurrency}>
          <Select.Trigger>
            <Select.Value placeholder="Choose a currency" />
            <Select.TriggerIndicator />
          </Select.Trigger>
          <Select.Portal>
            <Select.Overlay />
            <Select.Content presentation="popover" width="trigger">
              {CURRENCIES.map((option, index) => (
                <Fragment key={option.value}>
                  <Select.Item value={option.value} label={option.label} />
                  {index < CURRENCIES.length - 1 && <Separator />}
                </Fragment>
              ))}
            </Select.Content>
          </Select.Portal>
        </Select>
      </View>

      <ErrorNote message={error} />
    </FormShell>
  );
}
