import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PermissionStatus } from '@/components/PermissionStatus';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors } from '@/components/theme';
import { SETTING_KEYS } from '@/config/constants';
import { usePermissions } from '@/hooks/usePermissions';
import { setSetting } from '@/services/database/settingsRepository';
import { requestMicrophonePermission } from '@/services/audio/audioRecorder';
import { openAppSettings, describePermissionImpact } from '@/services/location/permissions';

export default function PermissionsScreen() {
  const router = useRouter();
  const { snapshot, request, refresh } = usePermissions();
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const notes = describePermissionImpact(snapshot);

  async function acceptAndContinue(): Promise<void> {
    setBusy(true);
    try {
      await setSetting(SETTING_KEYS.consentAccepted, 'true');
      const next = await request();
      await requestMicrophonePermission();
      await refresh();
      if (next.canTrackForeground) {
        router.replace('/');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Before we start</Text>
      <Text style={styles.body}>
        This testing app only collects data after you agree. Android will still show its own
        permission prompts — you can deny any of them.
      </Text>

      <View style={styles.card}>
        <Text style={styles.title}>What we may collect</Text>
        <Text style={styles.item}>Precise GPS location while tracking is on</Text>
        <Text style={styles.item}>Background location (if you allow it)</Text>
        <Text style={styles.item}>Timestamps and accuracy</Text>
        <Text style={styles.item}>Optional audio you record yourself</Text>
      </View>

      <PermissionStatus snapshot={snapshot} />
      {notes.map((note) => (
        <Text key={note} style={styles.warning}>
          {note}
        </Text>
      ))}

      <PrimaryButton
        label={accepted ? 'Consent saved' : 'I understand and accept'}
        variant={accepted ? 'secondary' : 'primary'}
        onPress={() => setAccepted(true)}
      />
      <PrimaryButton
        label="Allow permissions & continue"
        onPress={() => {
          void acceptAndContinue();
        }}
        disabled={!accepted}
        loading={busy}
      />
      <PrimaryButton label="Open Android settings" variant="secondary" onPress={() => void openAppSettings()} />
      <PrimaryButton label="Skip to home" variant="secondary" onPress={() => router.replace('/')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  heading: { color: colors.text, fontSize: 28, fontWeight: '800' },
  body: { color: colors.muted, lineHeight: 22, fontSize: 15 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  title: { color: colors.text, fontWeight: '800', fontSize: 16, marginBottom: 2 },
  item: { color: colors.text, fontSize: 15, lineHeight: 22 },
  warning: {
    color: colors.warning,
    lineHeight: 20,
    backgroundColor: colors.warningBg,
    borderRadius: 12,
    padding: 12,
  },
});
