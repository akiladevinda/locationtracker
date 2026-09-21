import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/components/theme';
import { StatusRow } from '@/components/StatusRow';
import type { LocationRecord } from '@/types/location';

interface Props {
  location: LocationRecord | null;
}

export function LocationCard({ location }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Last Location</Text>
      {location ? (
        <>
          <StatusRow label="Latitude" value={location.latitude.toFixed(6)} />
          <StatusRow label="Longitude" value={location.longitude.toFixed(6)} />
          <StatusRow
            label="Accuracy"
            value={location.accuracy != null ? `${Math.round(location.accuracy)} m` : 'n/a'}
          />
          <StatusRow label="Last Update" value={new Date(location.recordedAt).toLocaleString()} />
          <StatusRow label="Sync" value={location.syncStatus} />
        </>
      ) : (
        <Text style={styles.empty}>No location recorded yet.</Text>
      )}
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
  empty: {
    color: colors.muted,
  },
});
