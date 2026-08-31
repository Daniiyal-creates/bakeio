import type { PropsWithChildren, ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { Button } from 'heroui-native';

/**
 * Keyboard-aware shell for editor screens: scrolling fields with a save action
 * pinned above the safe area, so the keyboard never covers the primary button.
 */
export function FormShell({
  children,
  submitLabel,
  onSubmit,
  isSubmitting,
  isDisabled,
  secondary,
}: PropsWithChildren<{
  submitLabel: string;
  onSubmit: () => void;
  isSubmitting?: boolean;
  isDisabled?: boolean;
  secondary?: ReactNode;
}>) {
  return (
    <KeyboardAvoidingView
      className="bg-background flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerClassName="px-4 pt-4 pb-8 gap-5"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>

      <View className="border-border bg-background pb-safe-offset-3 gap-3 border-t px-4 pt-3">
        {secondary}
        <Button size="lg" onPress={onSubmit} isDisabled={isDisabled || isSubmitting}>
          <Button.Label>{isSubmitting ? 'Saving…' : submitLabel}</Button.Label>
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}
