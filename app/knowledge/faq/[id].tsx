import { useState } from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Button } from 'heroui-native';

import { FormShell } from '@/components/FormShell';
import { Field } from '@/components/Field';
import { ConfirmDialog, ErrorNote } from '@/components/ConfirmDialog';
import { Loader } from '@/components/Loader';
import { friendlyError } from '@/lib/backend';
import { goBackOrReplace } from '@/lib/navigation';
import { useDeleteFaq, useFaqs, useSaveFaq } from '@/lib/data';

export default function FaqEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';

  const faqs = useFaqs();
  const save = useSaveFaq();
  const remove = useDeleteFaq();

  const existing = faqs.data?.find((faq) => faq.id === id);

  const [question, setQuestion] = useState(existing?.question ?? '');
  const [answer, setAnswer] = useState(existing?.answer ?? '');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [touched, setTouched] = useState(false);

  if (!isNew && faqs.isPending) return <Loader />;

  const questionError = touched && !question.trim() ? 'Type the question first.' : null;
  const answerError = touched && !answer.trim() ? 'Add the answer customers should get.' : null;

  const submit = () => {
    setTouched(true);
    if (!question.trim() || !answer.trim()) return;

    save.mutate(
      { id: isNew ? undefined : id, question: question.trim(), answer: answer.trim() },
      { onSuccess: () => goBackOrReplace('/knowledge/faqs') },
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: isNew ? 'New question' : 'Edit question' }} />
      <FormShell
        submitLabel={isNew ? 'Add question' : 'Save changes'}
        onSubmit={submit}
        isSubmitting={save.isPending}
        secondary={
          isNew ? null : (
            <Button variant="ghost" onPress={() => setConfirmOpen(true)}>
              <Button.Label className="text-danger">Delete question</Button.Label>
            </Button>
          )
        }
      >
        <ErrorNote message={save.isError ? friendlyError(save.error) : null} />

        <Field
          label="Question"
          isRequired
          placeholder="Do you have gluten-free bread?"
          value={question}
          onChangeText={setQuestion}
          error={questionError}
          hint="Write it the way a customer would ask it."
        />

        <Field
          label="Answer"
          isRequired
          multiline
          placeholder="Yes — we bake a gluten-free loaf on Tuesdays and Fridays. Order a day ahead to be sure."
          value={answer}
          onChangeText={setAnswer}
          error={answerError}
        />
      </FormShell>

      <ConfirmDialog
        isOpen={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete this question?"
        description="The assistant will no longer have this answer ready."
        isPending={remove.isPending}
        onConfirm={() =>
          remove.mutate(id, {
            onSuccess: () => {
              setConfirmOpen(false);
              goBackOrReplace('/knowledge/faqs');
            },
          })
        }
      />
    </>
  );
}
