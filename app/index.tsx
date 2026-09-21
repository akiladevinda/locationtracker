import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { OverviewCard } from '@/components/OverviewCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TrackingStatus } from '@/components/TrackingStatus';
import { colors } from '@/components/theme';
import { SETTING_KEYS } from '@/config/constants';
import { useNetwork } from '@/hooks/useNetwork';
import { usePermissions } from '@/hooks/usePermissions';
import { useSync } from '@/hooks/useSync';
import { useTracking } from '@/hooks/useTracking';
import { getSetting } from '@/services/database/settingsRepository';
import { describePermissionImpact } from '@/services/location/permissions';

export default function HomeScreen() {
  const router = useRouter();
  const tracking = useTracking();
  const permissions = usePermissions();
  const network = useNetwork();
  const sync = useSync();
  const [consented, setConsented] = useState(true);

  const refresh = useCallback(async () => {
    const consent = await getSetting(SETTING_KEYS.consentAccepted);
    setConsented(consent === 'true');
    if (consent !== 'true') {
      router.replace('/permissions');
      return;
    }
    await permissions.refresh();
    await tracking.refresh();
    await sync.refresh();
  }, [permissions, router, sync, tracking]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const note = describePermissionImpact(permissions.snapshot)[0];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Location Tracker</Text>
      <Text style={styles.subheading}>Simple GPS tracking for internal testing</Text>

      <TrackingStatus
        enabled={tracking.enabled}
        backgroundOk={permissions.snapshot.canTrackBackground}
      />
      <OverviewCard
        location={sync.latest}
        pendingLocations={sync.pendingLocations}
        pendingFiles={sync.pendingFiles}
        online={network.online}
        lastSyncAt={sync.lastSyncAt}
      />

      {note ? <Text style={styles.warning}>{note}</Text> : null}
      {tracking.error ? <Text style={styles.warning}>{tracking.error}</Text> : null}
      {sync.lastError && !sync.lastError.includes('not configured') ? (
        <Text style={styles.warning}>{sync.lastError}</Text>
      ) : null}

      {tracking.enabled ? (
        <PrimaryButton label="Stop Tracking" variant="danger" onPress={() => void tracking.stop()} />
      ) : (
        <PrimaryButton
          label="Start Tracking"
          onPress={() => void tracking.start()}
          loading={tracking.busy}
          disabled={!consented}
        />
      )}

      <View style={styles.row}>
        <View style={styles.half}>
          <PrimaryButton
            label="Sync"
            variant="secondary"
            onPress={() => void sync.syncNow()}
            loading={sync.busy}
          />
        </View>
        <View style={styles.half}>
          <PrimaryButton label="History" variant="secondary" onPress={() => router.push('/history')} />
        </View>
      </View>

      <PrimaryButton label="Audio upload" variant="secondary" onPress={() => router.push('/record')} />
      <PrimaryButton label="Settings" variant="secondary" onPress={() => router.push('/settings')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  heading: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  subheading: {
    color: colors.muted,
    marginTop: -6,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  half: {
    flex: 1,
  },
  warning: {
    color: colors.warning,
    lineHeight: 20,
    backgroundColor: colors.warningBg,
    borderRadius: 12,
    padding: 12,
    overflow: 'hidden',
  },
});
