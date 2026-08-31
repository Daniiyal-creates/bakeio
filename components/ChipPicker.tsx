import { View } from 'react-native';
import { Chip, Label, Typography } from 'heroui-native';

/** Chip row for picking one value out of a short, known list. */
export function ChipPicker<T extends string>({
  label,
  hint,
  options,
  value,
  onChange,
  labelFor,
}: {
  label?: string;
  hint?: string;
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
  labelFor?: (option: T) => string;
}) {
  return (
    <View className="gap-2">
      {label ? <Label>{label}</Label> : null}
      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => {
          const selected = option === value;
          return (
            <Chip
              key={option}
              size="md"
              variant={selected ? 'primary' : 'secondary'}
              color={selected ? 'accent' : 'default'}
              onPress={() => onChange(option)}
            >
              <Chip.Label>{labelFor?.(option) ?? option}</Chip.Label>
            </Chip>
          );
        })}
      </View>
      {hint ? (
        <Typography type="body-xs" color="muted">
          {hint}
        </Typography>
      ) : null}
    </View>
  );
}

/** Chip row for toggling any number of values, e.g. allergens. */
export function ChipMultiPicker({
  label,
  hint,
  options,
  values,
  onChange,
}: {
  label?: string;
  hint?: string;
  options: readonly string[];
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (option: string) => {
    onChange(values.includes(option) ? values.filter((v) => v !== option) : [...values, option]);
  };

  return (
    <View className="gap-2">
      {label ? <Label>{label}</Label> : null}
      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => {
          const selected = values.includes(option);
          return (
            <Chip
              key={option}
              size="md"
              variant={selected ? 'primary' : 'secondary'}
              color={selected ? 'accent' : 'default'}
              onPress={() => toggle(option)}
            >
              <Chip.Label>{option}</Chip.Label>
            </Chip>
          );
        })}
      </View>
      {hint ? (
        <Typography type="body-xs" color="muted">
          {hint}
        </Typography>
      ) : null}
    </View>
  );
}
