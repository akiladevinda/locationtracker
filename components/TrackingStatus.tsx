import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/components/theme';

interface Props {
  enabled: boolean;
  backgroundOk?: boolean;
}

export function TrackingStatus({ enabled, backgroundOk = true }: Props) {
  return (
    <View
      style={[
        styles.card,
        enabled ? (backgroundOk ? styles.on : styles.partial) : styles.off,
      ]}
    >
      <Text style={styles.eyebrow}>{enabled ? 'Live' : 'Idle'}</Text>
      <Text style={styles.value}>
        {enabled ? (backgroundOk ? 'Background tracking on' : 'Tracking (foreground only)') : 'Tracking off'}
      </Text>
      <Text style={styles.hint}>
        {enabled
          ? backgroundOk
            ? 'Keeps running in the background with the notification. Uploads to cloud about every 1 minute while online.'
            : 'Allow “all the time” location so tracking continues when the app is closed.'
          : 'Tap Start to collect GPS in the background and upload every 1 minute.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  on: {
    backgroundColor: colors.successBg,
    borderColor: '#166534',
  },
  partial: {
    backgroundColor: colors.warningBg,
    borderColor: '#854D0E',
  },
  off: {
    backgroundColor: colors.card,
    borderColor: colors.border,
  },
  eyebrow: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  value: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    marginTop: 4,
  },
  hint: {
    color: colors.muted,
    marginTop: 8,
    lineHeight: 20,
  },
});
