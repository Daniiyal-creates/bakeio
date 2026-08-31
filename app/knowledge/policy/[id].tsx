import { useState } from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Button } from 'heroui-native';

import { FormShell } from '@/components/FormShell';
import { Field } from '@/components/Field';
import { ChipPicker } from '@/components/ChipPicker';
import { ConfirmDialog, ErrorNote } from '@/components/ConfirmDialog';
import { Loader } from '@/components/Loader';
import { friendlyError } from '@/lib/backend';
import { goBackOrReplace } from '@/lib/navigation';
import { useDeletePolicy, usePolicies, useSavePolicy } from '@/lib/data';
import { POLICY_CATEGORIES, type PolicyCategory, toOption } from '@/lib/types';

const PLACEHOLDERS: Record<PolicyCategory, string> = {
  general: 'Anything customers should know before ordering.',
  ordering: 'Orders are confirmed once paid. Custom cakes need 48 hours notice.',
  payment: 'We accept cash, card and bank transfer. Deposits are 50%.',
  delivery: 'Delivery runs between 9:00 and 13:00, same day within the city.',
  pickup: 'Collect from the counter any time we are open. Ask for the name on the order.',
  cancellation: 'Cancel free of charge up to 24 hours before pickup.',
  allergens: 'Everything is made in a kitchen that handles gluten, nuts and dairy.',
};

export default function PolicyEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';

  const policies = usePolicies();
  const save = useSavePolicy();
  const remove = useDeletePolicy();

  const existing = policies.data?.find((policy) => policy.id === id);

  const [title, setTitle] = useState(existing?.title ?? '');
  const [body, setBody] = useState(existing?.body ?? '');
  const [category, setCategory] = useState<PolicyCategory>(
    toOption(POLICY_CATEGORIES, existing?.category, 'ordering'),
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [touched, setTouched] = useState(false);

  if (!isNew && policies.isPending) return <Loader />;

  const titleError = touched && !title.trim() ? 'Give this policy a short title.' : null;
  const bodyError = touched && !body.trim() ? 'Write what the policy actually says.' : null;

  const submit = () => {
    setTouched(true);
    if (!title.trim() || !body.trim()) return;

    save.mutate(
      { id: isNew ? undefined : id, title: title.trim(), body: body.trim(), category },
      { onSuccess: () => goBackOrReplace('/knowledge/policies') },
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: isNew ? 'New policy' : 'Edit policy' }} />
      <FormShell
        submitLabel={isNew ? 'Add policy' : 'Save changes'}
        onSubmit={submit}
        isSubmitting={save.isPending}
        secondary={
          isNew ? null : (
            <Button variant="ghost" onPress={() => setConfirmOpen(true)}>
              <Button.Label className="text-danger">Delete policy</Button.Label>
            </Button>
          )
        }
      >
        <ErrorNote message={save.isError ? friendlyError(save.error) : null} />

        <ChipPicker
          label="What is it about?"
          options={POLICY_CATEGORIES}
          value={category}
          onChange={setCategory}
        />

        <Field
          label="Title"
          isRequired
          placeholder="Custom cake orders"
          value={title}
          onChangeText={setTitle}
          error={titleError}
        />

        <Field
          label="The policy"
          isRequired
          multiline
          placeholder={PLACEHOLDERS[category]}
          value={body}
          onChangeText={setBody}
          error={bodyError}
          hint="Plain sentences work best. The assistant answers using these words."
        />
      </FormShell>

      <ConfirmDialog
        isOpen={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete this policy?"
        description="The assistant will no longer use it when answering customers."
        isPending={remove.isPending}
        onConfirm={() =>
          remove.mutate(id, {
            onSuccess: () => {
              setConfirmOpen(false);
              goBackOrReplace('/knowledge/policies');
            },
          })
        }
      />
    </>
  );
}
