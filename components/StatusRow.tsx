import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/components/theme';

interface Props {
  label: string;
  value: string;
  tone?: 'default' | 'success' | 'danger' | 'warning';
}

export function StatusRow({ label, value, tone = 'default' }: Props) {
  const color =
    tone === 'success'
      ? colors.success
      : tone === 'danger'
        ? colors.danger
        : tone === 'warning'
          ? colors.warning
          : colors.text;
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 6,
  },
  label: {
    color: colors.muted,
    fontSize: 14,
    flex: 1,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
});
