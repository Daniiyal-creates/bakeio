import { View } from 'react-native';
import { ControlField, Description, Label } from 'heroui-native';

/** Label + helper text + switch, all in one tappable row. */
export function SwitchRow({
  label,
  description,
  value,
  onChange,
  isDisabled,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (next: boolean) => void;
  isDisabled?: boolean;
}) {
  return (
    <ControlField isSelected={value} onSelectedChange={onChange} isDisabled={isDisabled}>
      <View className="flex-1 pr-3">
        <Label>{label}</Label>
        {description ? <Description>{description}</Description> : null}
      </View>
      <ControlField.Indicator />
    </ControlField>
  );
}
