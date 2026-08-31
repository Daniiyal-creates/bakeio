import type { ReactNode } from 'react';
import {
  Description,
  FieldError,
  Input,
  Label,
  TextArea,
  TextField,
  type InputProps,
} from 'heroui-native';

type FieldProps = Omit<InputProps, 'className'> & {
  label: string;
  hint?: string;
  error?: string | null;
  isRequired?: boolean;
  /** Renders a growing multi-line input instead of a single line. */
  multiline?: boolean;
  trailing?: ReactNode;
};

/** Labelled text input, wired to HeroUI's form-item state. */
export function Field({
  label,
  hint,
  error,
  isRequired,
  multiline,
  trailing,
  ...inputProps
}: FieldProps) {
  return (
    <TextField isInvalid={Boolean(error)} isRequired={isRequired}>
      <Label>{label}</Label>
      {multiline ? (
        <TextArea numberOfLines={4} {...inputProps} />
      ) : (
        <Input {...inputProps}>{trailing}</Input>
      )}
      {hint ? <Description>{hint}</Description> : null}
      {error ? <FieldError>{error}</FieldError> : null}
    </TextField>
  );
}
