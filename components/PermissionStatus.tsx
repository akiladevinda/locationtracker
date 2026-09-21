import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/components/theme';
import { StatusRow } from '@/components/StatusRow';
import type { LocationPermissionSnapshot } from '@/types/location';

interface Props {
  snapshot: LocationPermissionSnapshot;
}

function tone(state: string) {
  return state === 'granted' ? 'success' : state === 'denied' ? 'danger' : 'warning';
}

export function PermissionStatus({ snapshot }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Permission Status</Text>
      <StatusRow
        label="Foreground Location"
        value={snapshot.foreground === 'granted' ? 'Granted' : 'Denied'}
        tone={tone(snapshot.foreground)}
      />
      <StatusRow
        label="Background Location"
        value={snapshot.background === 'granted' ? 'Granted' : 'Denied'}
        tone={tone(snapshot.background)}
      />
      <StatusRow
        label="Notifications"
        value={snapshot.notifications === 'granted' ? 'Granted' : 'Denied'}
        tone={tone(snapshot.notifications)}
      />
      <StatusRow
        label="GPS / Location Services"
        value={snapshot.gpsEnabled ? 'On' : 'Off'}
        tone={snapshot.gpsEnabled ? 'success' : 'danger'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
});
