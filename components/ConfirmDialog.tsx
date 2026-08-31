import { View } from 'react-native';
import { Button, Dialog, Spinner, Typography } from 'heroui-native';

/** Confirmation step for anything irreversible, controlled by the caller. */
export function ConfirmDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Delete',
  isPending,
  onConfirm,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  isPending?: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content>
          <View className="mb-5 gap-1.5">
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Description>{description}</Dialog.Description>
          </View>
          <View className="flex-row justify-end gap-3">
            <Button variant="ghost" size="sm" onPress={() => onOpenChange(false)}>
              <Button.Label>Cancel</Button.Label>
            </Button>
            <Button size="sm" variant="danger" isDisabled={isPending} onPress={onConfirm}>
              {isPending ? <Spinner size="sm" color="danger" /> : null}
              <Button.Label>{confirmLabel}</Button.Label>
            </Button>
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}

/** Inline, human-readable error banner. */
export function ErrorNote({ message }: { message?: string | null }) {
  if (!message) return null;

  return (
    <View className="border-danger/30 bg-danger/10 rounded-2xl border px-4 py-3">
      <Typography type="body-sm" className="text-danger">
        {message}
      </Typography>
    </View>
  );
}
