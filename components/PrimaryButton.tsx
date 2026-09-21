import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '@/components/theme';

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
}: Props) {
  const backgroundColor =
    variant === 'danger' ? colors.danger : variant === 'secondary' ? colors.card : colors.button;
  const textColor = variant === 'secondary' ? colors.text : colors.buttonText;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor,
          opacity: disabled || loading ? 0.5 : pressed ? 0.88 : 1,
          borderColor: variant === 'secondary' ? colors.border : backgroundColor,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  label: {
    fontWeight: '700',
    fontSize: 16,
  },
});
