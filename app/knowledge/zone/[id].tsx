import { useState } from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Button } from 'heroui-native';

import { FormShell } from '@/components/FormShell';
import { Field } from '@/components/Field';
import { ConfirmDialog, ErrorNote } from '@/components/ConfirmDialog';
import { Loader } from '@/components/Loader';
import { centsToInput, inputToCents } from '@/lib/format';
import { friendlyError } from '@/lib/backend';
import { goBackOrReplace } from '@/lib/navigation';
import { useBakery, useDeleteZone, useDeliveryZones, useSaveZone } from '@/lib/data';

export default function ZoneEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';

  const zones = useDeliveryZones();
  const { data: bakery } = useBakery();
  const save = useSaveZone();
  const remove = useDeleteZone();

  const existing = zones.data?.find((zone) => zone.id === id);
  const currency = bakery?.currency ?? 'USD';

  const [area, setArea] = useState(existing?.area ?? '');
  const [fee, setFee] = useState(centsToInput(existing?.fee_cents));
  const [minOrder, setMinOrder] = useState(centsToInput(existing?.min_order_cents));
  const [eta, setEta] = useState(existing?.eta ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [touched, setTouched] = useState(false);

  if (!isNew && zones.isPending) return <Loader />;

  const areaError = touched && !area.trim() ? 'Name the area you deliver to.' : null;

  const submit = () => {
    setTouched(true);
    if (!area.trim()) return;

    save.mutate(
      {
        id: isNew ? undefined : id,
        area: area.trim(),
        fee_cents: inputToCents(fee),
        min_order_cents: inputToCents(minOrder),
        eta: eta.trim() || null,
        notes: notes.trim() || null,
      },
      { onSuccess: () => goBackOrReplace('/knowledge/delivery') },
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: isNew ? 'New delivery area' : 'Edit delivery area' }} />
      <FormShell
        submitLabel={isNew ? 'Add area' : 'Save changes'}
        onSubmit={submit}
        isSubmitting={save.isPending}
        secondary={
          isNew ? null : (
            <Button variant="ghost" onPress={() => setConfirmOpen(true)}>
              <Button.Label className="text-danger">Delete area</Button.Label>
            </Button>
          )
        }
      >
        <ErrorNote message={save.isError ? friendlyError(save.error) : null} />

        <Field
          label="Area or postcode"
          isRequired
          placeholder="City centre"
          value={area}
          onChangeText={setArea}
          error={areaError}
        />

        <Field
          label={`Delivery fee (${currency})`}
          placeholder="0.00"
          keyboardType="decimal-pad"
          value={fee}
          onChangeText={setFee}
          hint="Leave at 0 if delivery here is free."
        />

        <Field
          label={`Minimum order (${currency})`}
          placeholder="0.00"
          keyboardType="decimal-pad"
          value={minOrder}
          onChangeText={setMinOrder}
          hint="Leave at 0 if there is no minimum."
        />

        <Field
          label="When you deliver"
          placeholder="Same day, mornings only"
          value={eta}
          onChangeText={setEta}
        />

        <Field
          label="Anything else"
          multiline
          placeholder="We drop off between 9:00 and 12:00. Someone needs to be home."
          value={notes}
          onChangeText={setNotes}
        />
      </FormShell>

      <ConfirmDialog
        isOpen={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete this area?"
        description="The assistant will start telling customers here that you do not deliver."
        isPending={remove.isPending}
        onConfirm={() =>
          remove.mutate(id, {
            onSuccess: () => {
              setConfirmOpen(false);
              goBackOrReplace('/knowledge/delivery');
            },
          })
        }
      />
    </>
  );
}
