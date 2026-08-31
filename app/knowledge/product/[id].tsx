import { useState } from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Button, Typography } from 'heroui-native';

import { FormShell } from '@/components/FormShell';
import { Field } from '@/components/Field';
import { ChipMultiPicker, ChipPicker } from '@/components/ChipPicker';
import { SwitchRow } from '@/components/SwitchRow';
import { ConfirmDialog, ErrorNote } from '@/components/ConfirmDialog';
import { Loader } from '@/components/Loader';
import { centsToInput, inputToCents } from '@/lib/format';
import { friendlyError } from '@/lib/backend';
import { goBackOrReplace } from '@/lib/navigation';
import { useBakery, useDeleteProduct, useProducts, useSaveProduct } from '@/lib/data';
import { COMMON_ALLERGENS, PRODUCT_CATEGORIES, type ProductCategory, toOption } from '@/lib/types';

export default function ProductEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';

  const products = useProducts();
  const { data: bakery } = useBakery();
  const save = useSaveProduct();
  const remove = useDeleteProduct();

  const existing = products.data?.find((product) => product.id === id);

  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [category, setCategory] = useState<ProductCategory>(
    toOption(PRODUCT_CATEGORIES, existing?.category, 'Bread'),
  );
  const [price, setPrice] = useState(centsToInput(existing?.price_cents));
  const [unit, setUnit] = useState(existing?.unit ?? '');
  const [leadTime, setLeadTime] = useState(
    existing?.lead_time_hours ? String(existing.lead_time_hours) : '',
  );
  const [available, setAvailable] = useState(existing?.available ?? true);
  const [allergens, setAllergens] = useState<string[]>(existing?.allergens ?? []);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [touched, setTouched] = useState(false);

  if (!isNew && products.isPending) return <Loader />;

  const nameError = touched && !name.trim() ? 'Give the product a name.' : null;

  const submit = () => {
    setTouched(true);
    if (!name.trim()) return;

    const hours = Number.parseInt(leadTime, 10);

    save.mutate(
      {
        id: isNew ? undefined : id,
        name: name.trim(),
        description: description.trim() || null,
        category,
        price_cents: inputToCents(price),
        unit: unit.trim() || null,
        lead_time_hours: Number.isFinite(hours) && hours > 0 ? hours : null,
        available,
        allergens,
      },
      { onSuccess: () => goBackOrReplace('/knowledge/products') },
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: isNew ? 'New product' : 'Edit product' }} />
      <FormShell
        submitLabel={isNew ? 'Add product' : 'Save changes'}
        onSubmit={submit}
        isSubmitting={save.isPending}
        secondary={
          isNew ? null : (
            <Button variant="ghost" onPress={() => setConfirmOpen(true)}>
              <Button.Label className="text-danger">Delete product</Button.Label>
            </Button>
          )
        }
      >
        <ErrorNote message={save.isError ? friendlyError(save.error) : null} />

        <Field
          label="Product name"
          isRequired
          placeholder="Sourdough loaf"
          value={name}
          onChangeText={setName}
          error={nameError}
        />

        <ChipPicker
          label="Category"
          options={PRODUCT_CATEGORIES}
          value={category}
          onChange={setCategory}
        />

        <Field
          label={`Price (${bakery?.currency ?? 'USD'})`}
          placeholder="0.00"
          keyboardType="decimal-pad"
          value={price}
          onChangeText={setPrice}
          hint="Leave at 0 if the price depends on the order."
        />

        <Field
          label="Size or unit"
          placeholder="800g loaf, per slice, box of 6"
          value={unit}
          onChangeText={setUnit}
        />

        <Field
          label="Description"
          multiline
          placeholder="Naturally leavened, baked fresh every morning."
          value={description}
          onChangeText={setDescription}
          hint="The assistant uses this to describe the product to customers."
        />

        <Field
          label="Notice needed (hours)"
          placeholder="24"
          keyboardType="number-pad"
          value={leadTime}
          onChangeText={setLeadTime}
          hint="How far ahead customers must order. Leave empty if it is always in stock."
        />

        <ChipMultiPicker
          label="Contains"
          hint="Tap everything this product contains, so allergy questions are answered safely."
          options={COMMON_ALLERGENS}
          values={allergens}
          onChange={setAllergens}
        />

        <SwitchRow
          label="Currently available"
          description="Switch off and the assistant will say it is sold out."
          value={available}
          onChange={setAvailable}
        />

        {existing?.allergens.length === 0 ? (
          <Typography type="body-xs" color="muted">
            No allergens recorded yet. The assistant will tell customers to check with you.
          </Typography>
        ) : null}
      </FormShell>

      <ConfirmDialog
        isOpen={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete this product?"
        description="The assistant will stop mentioning it to customers. This cannot be undone."
        isPending={remove.isPending}
        onConfirm={() =>
          remove.mutate(id, {
            onSuccess: () => {
              setConfirmOpen(false);
              goBackOrReplace('/knowledge/products');
            },
          })
        }
      />
    </>
  );
}
