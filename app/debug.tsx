import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as TaskManager from 'expo-task-manager';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { StatusRow } from '@/components/StatusRow';
import { colors } from '@/components/theme';
import { BACKGROUND_LOCATION_TASK } from '@/config/constants';
import { useNetwork } from '@/hooks/useNetwork';
import { usePermissions } from '@/hooks/usePermissions';
import { useSync } from '@/hooks/useSync';
import { useTracking } from '@/hooks/useTracking';
import { getDatabaseHealth } from '@/services/database/database';
import { getOrCreateDeviceId } from '@/services/device/deviceId';
import { isBackgroundTaskRegistered } from '@/services/location/locationService';
import { syncService } from '@/services/sync/syncService';

export default function DebugScreen() {
  const tracking = useTracking();
  const permissions = usePermissions();
  const network = useNetwork();
  const sync = useSync();
  const [deviceId, setDeviceId] = useState('');
  const [taskRegistered, setTaskRegistered] = useState(false);
  const [schemaVersion, setSchemaVersion] = useState(0);
  const [dbOk, setDbOk] = useState(false);
  const [taskApi, setTaskApi] = useState(false);

  const load = useCallback(async () => {
    setDeviceId(await getOrCreateDeviceId());
    setTaskApi(await TaskManager.isAvailableAsync());
    setTaskRegistered(await isBackgroundTaskRegistered());
    const health = await getDatabaseHealth();
    setSchemaVersion(health.schemaVersion);
    setDbOk(health.ok);
    await tracking.refresh();
    await permissions.refresh();
    await sync.refresh();
  }, [permissions, sync, tracking]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Debug</Text>
      <StatusRow label="Device ID" value={deviceId} />
      <StatusRow label="App version" value={Constants.expoConfig?.version ?? 'unknown'} />
      <StatusRow label="Android version" value={String(Device.osVersion ?? 'unknown')} />
      <StatusRow label="Manufacturer" value={Device.manufacturer ?? 'unknown'} />
      <StatusRow label="Foreground permission" value={permissions.snapshot.foreground} />
      <StatusRow label="Background permission" value={permissions.snapshot.background} />
      <StatusRow label="GPS enabled" value={permissions.snapshot.gpsEnabled ? 'yes' : 'no'} />
      <StatusRow label="Task API" value={taskApi ? 'available' : 'unavailable'} />
      <StatusRow label="Task registered" value={taskRegistered ? 'yes' : 'no'} />
      <StatusRow label="Task name" value={BACKGROUND_LOCATION_TASK} />
      <StatusRow label="Tracking active" value={tracking.enabled ? 'yes' : 'no'} />
      <StatusRow label="Network" value={network.online ? `online (${network.type})` : 'offline'} />
      <StatusRow label="Pending locations" value={String(sync.pendingLocations)} />
      <StatusRow label="Pending files" value={String(sync.pendingFiles)} />
      <StatusRow label="SQLite health" value={dbOk ? 'ok' : 'error'} />
      <StatusRow label="Schema version" value={String(schemaVersion)} />
      <StatusRow label="Sync lock" value={syncService.isSyncing() ? 'busy' : 'idle'} />
      <StatusRow label="Last sync" value={sync.lastSyncAt ?? 'never'} />
      <StatusRow label="Last API error" value={sync.lastError ?? 'none'} tone={sync.lastError ? 'danger' : 'default'} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: {
    padding: 16,
    gap: 4,
    paddingBottom: 32,
    backgroundColor: colors.card,
    margin: 16,
    borderRadius: 12,
  },
  title: { color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: 8 },
});
