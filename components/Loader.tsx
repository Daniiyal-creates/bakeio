import { View } from 'react-native';
import { Spinner, Typography } from 'heroui-native';

/** Full-screen loading state used while the session or bakery is being read. */
export function Loader({ label }: { label?: string }) {
  return (
    <View className="bg-background flex-1 items-center justify-center gap-3">
      <Spinner />
      {label ? (
        <Typography type="body-sm" color="muted">
          {label}
        </Typography>
      ) : null}
    </View>
  );
}
