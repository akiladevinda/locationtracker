import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/components/theme';
import type { LocationRecord } from '@/types/location';

interface Props {
  location: LocationRecord | null;
  pendingLocations: number;
  pendingFiles: number;
  online: boolean;
  lastSyncAt: string | null;
}

function formatTime(value: string | null): string {
  if (!value) return 'Not yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function OverviewCard({
  location,
  pendingLocations,
  pendingFiles,
  online,
  lastSyncAt,
}: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Overview</Text>

      <View style={styles.grid}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Network</Text>
          <Text style={[styles.statValue, { color: online ? colors.success : colors.warning }]}>
            {online ? 'Online' : 'Offline'}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Pending</Text>
          <Text style={styles.statValue}>{pendingLocations}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Files</Text>
          <Text style={styles.statValue}>{pendingFiles}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Last sync</Text>
          <Text style={styles.statValueSmall}>{formatTime(lastSyncAt)}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <Text style={styles.section}>Last GPS point</Text>
      {location ? (
        <>
          <Text style={styles.coords}>
            {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
          </Text>
          <Text style={styles.meta}>
            {new Date(location.recordedAt).toLocaleString()} ·{' '}
            {location.accuracy != null ? `${Math.round(location.accuracy)} m` : 'n/a'} ·{' '}
            {location.syncStatus}
          </Text>
        </>
      ) : (
        <Text style={styles.meta}>No points yet. Start tracking to collect GPS.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  stat: {
    width: '47%',
    backgroundColor: colors.soft,
    borderRadius: 14,
    padding: 12,
  },
  statLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  statValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
  },
  statValueSmall: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 6,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 16,
  },
  section: {
    color: colors.muted,
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  coords: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 6,
  },
  meta: {
    color: colors.muted,
    marginTop: 4,
    lineHeight: 20,
  },
});
