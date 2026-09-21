import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { StatusRow } from '@/components/StatusRow';
import { colors } from '@/components/theme';
import {
  DEFAULT_LOCATION_INTERVAL_MS,
  DEFAULT_RETENTION_DAYS,
  SETTING_KEYS,
} from '@/config/constants';
import { env, getDefaultBackendUrl } from '@/config/env';
import { getDatabaseHealth } from '@/services/database/database';
import { LocationRepository } from '@/services/database/locationRepository';
import { getSetting, getSettingNumber, setSetting } from '@/services/database/settingsRepository';
import { getOrCreateDeviceId } from '@/services/device/deviceId';
import { exportDebugLogs } from '@/services/debug/exportLogs';
import { isGoogleSignedIn, signInWithGoogle } from '@/services/google/googleAuth';
import { useSync } from '@/hooks/useSync';
import { useTracking } from '@/hooks/useTracking';
import { openAppSettings } from '@/services/location/permissions';
import { openBatteryOptimizationSettings } from '@/services/battery/batterySettings';
import { requestLocationPermissions } from '@/services/location/permissions';

export default function SettingsScreen() {
  const router = useRouter();
  const tracking = useTracking();
  const sync = useSync();
  const [deviceId, setDeviceId] = useState('');
  const [backendUrl, setBackendUrl] = useState('');
  const [folderId, setFolderId] = useState('');
  const [intervalMs, setIntervalMs] = useState(String(DEFAULT_LOCATION_INTERVAL_MS));
  const [dbSize, setDbSize] = useState('0');
  const [uploadedCount, setUploadedCount] = useState(0);
  const [googleConnected, setGoogleConnected] = useState(false);

  const load = useCallback(async () => {
    setDeviceId(await getOrCreateDeviceId());
    setBackendUrl((await getSetting(SETTING_KEYS.backendUrlOverride)) || getDefaultBackendUrl());
    setFolderId((await getSetting(SETTING_KEYS.driveFolderId)) || env.googleDriveFolderId);
    setIntervalMs(
      String(await getSettingNumber(SETTING_KEYS.locationIntervalMs, DEFAULT_LOCATION_INTERVAL_MS)),
    );
    const health = await getDatabaseHealth();
    setDbSize(`${(health.sizeBytes / 1024).toFixed(1)} KB`);
    setUploadedCount(await LocationRepository.getUploadedCount());
    setGoogleConnected(await isGoogleSignedIn());
    await sync.refresh();
    await tracking.refresh();
  }, [sync, tracking]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function saveSettings(): Promise<void> {
    await setSetting(SETTING_KEYS.backendUrlOverride, backendUrl.trim());
    await setSetting(SETTING_KEYS.driveFolderId, folderId.trim());
    const parsed = Number(intervalMs);
    if (Number.isFinite(parsed) && parsed >= 1000) {
      await setSetting(SETTING_KEYS.locationIntervalMs, String(Math.round(parsed)));
    }
    Alert.alert('Saved', 'Settings updated.');
  }

  async function clearUploaded(): Promise<void> {
    const deleted = await LocationRepository.deleteOldUploadedLocations(0);
    Alert.alert('Cleanup', `Deleted ${deleted} uploaded records. Pending records were kept.`);
    await load();
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Settings</Text>
      <Text style={styles.subheading}>Device status, sync, and Drive upload</Text>

      <View style={styles.card}>
        <Text style={styles.title}>This phone</Text>
        <StatusRow label="Device" value={deviceId.slice(0, 8) + '…'} />
        <StatusRow label="Tracking" value={tracking.enabled ? 'On' : 'Off'} />
        <StatusRow label="Waiting to upload" value={String(sync.pendingLocations)} />
        <StatusRow label="Already uploaded" value={String(uploadedCount)} />
        <StatusRow label="Storage used" value={dbSize} />
        <StatusRow label="Keep uploaded for" value={`${DEFAULT_RETENTION_DAYS} days`} />
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Google Drive</Text>
        <Text style={styles.body}>
          Connect once so audio recordings can upload into your shared folder.
        </Text>
        <StatusRow
          label="Account"
          value={googleConnected ? 'Connected' : 'Not connected'}
          tone={googleConnected ? 'success' : 'warning'}
        />
        <Text style={styles.label}>Folder ID</Text>
        <TextInput
          style={styles.input}
          value={folderId}
          onChangeText={setFolderId}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Drive folder ID"
          placeholderTextColor={colors.muted}
        />
        <PrimaryButton
          label={googleConnected ? 'Reconnect Google' : 'Connect Google'}
          onPress={() => {
            void signInWithGoogle()
              .then(async () => {
                await setSetting(SETTING_KEYS.driveFolderId, folderId.trim());
                await load();
                Alert.alert('Connected', 'Google Drive is ready for audio uploads.');
              })
              .catch((error: unknown) =>
                Alert.alert(
                  'Google sign-in needed',
                  `${error instanceof Error ? error.message : String(error)}\n\nAdd EXPO_PUBLIC_GOOGLE_CLIENT_ID in .env first.`,
                ),
              );
          }}
        />
        <PrimaryButton
          label="Open folder"
          variant="secondary"
          onPress={() => {
            void Linking.openURL(
              `https://drive.google.com/drive/folders/${folderId || env.googleDriveFolderId}`,
            );
          }}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Sync</Text>
        <Text style={styles.label}>Backend URL</Text>
        <TextInput
          style={styles.input}
          value={backendUrl}
          onChangeText={setBackendUrl}
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor={colors.muted}
        />
        <Text style={styles.label}>GPS interval (ms)</Text>
        <TextInput
          style={styles.input}
          value={intervalMs}
          onChangeText={setIntervalMs}
          keyboardType="number-pad"
        />
        <Text style={styles.hint}>
          GPS every ~10s. Uploads automatically every 1 minute while online (also from background GPS).
        </Text>
        <PrimaryButton label="Save" onPress={() => void saveSettings()} />
        <PrimaryButton label="Sync now" onPress={() => void sync.syncNow()} loading={sync.busy} />
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Permissions & cleanup</Text>
        <PrimaryButton
          label="Request permissions"
          variant="secondary"
          onPress={() => void requestLocationPermissions()}
        />
        <PrimaryButton
          label="Android settings"
          variant="secondary"
          onPress={() => void openAppSettings()}
        />
        <PrimaryButton
          label="Battery optimization"
          variant="secondary"
          onPress={() => void openBatteryOptimizationSettings()}
        />
        <PrimaryButton
          label="Clear uploaded records"
          variant="danger"
          onPress={() => {
            Alert.alert('Clear uploaded records?', 'Pending records are never deleted.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete uploaded', style: 'destructive', onPress: () => void clearUploaded() },
            ]);
          }}
        />
        <PrimaryButton
          label="Export debug logs"
          variant="secondary"
          onPress={() => {
            void exportDebugLogs()
              .then((uri) => Alert.alert('Logs exported', uri))
              .catch((error: unknown) =>
                Alert.alert('Export failed', error instanceof Error ? error.message : String(error)),
              );
          }}
        />
        <PrimaryButton label="Debug details" variant="secondary" onPress={() => router.push('/debug')} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  heading: { color: colors.text, fontSize: 28, fontWeight: '800' },
  subheading: { color: colors.muted, marginTop: -8 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  title: { color: colors.text, fontWeight: '800', fontSize: 17 },
  body: { color: colors.muted, lineHeight: 20 },
  label: { color: colors.muted, fontWeight: '600', marginTop: 4 },
  input: {
    backgroundColor: colors.bg,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  hint: { color: colors.muted, lineHeight: 20, fontSize: 13 },
});
