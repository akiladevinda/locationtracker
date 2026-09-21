import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/components/theme';
import { StatusRow } from '@/components/StatusRow';

interface Props {
  online: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
}

function formatTime(value: string | null): string {
  if (!value) {
    return 'Never';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function SyncStatus({ online, lastSyncAt, lastError }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Sync Status</Text>
      <StatusRow label="Network" value={online ? 'Online' : 'Offline'} tone={online ? 'success' : 'warning'} />
      <StatusRow label="Last Successful Sync" value={formatTime(lastSyncAt)} />
      {lastError ? <StatusRow label="Last API Error" value={lastError} tone="danger" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
});
