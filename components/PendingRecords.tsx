import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/components/theme';
import { StatusRow } from '@/components/StatusRow';

interface Props {
  pendingLocations: number;
  pendingFiles: number;
}

export function PendingRecords({ pendingLocations, pendingFiles }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Pending Upload</Text>
      <StatusRow label="Pending Locations" value={`${pendingLocations} records`} />
      <StatusRow label="Pending Files" value={`${pendingFiles} files`} />
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
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
});
