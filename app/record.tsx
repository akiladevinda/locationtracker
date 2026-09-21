import {
  RecordingPresets,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { StatusRow } from '@/components/StatusRow';
import { colors } from '@/components/theme';
import {
  CALL_RECORDING_LIMITATION,
  importExistingAudioFile,
  persistRecordingFile,
  prepareAudioMode,
  requestMicrophonePermission,
} from '@/services/audio/audioRecorder';
import { uploadPendingAudio } from '@/services/audio/audioUpload';
import { useSync } from '@/hooks/useSync';

export default function RecordScreen() {
  const recorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    directory: 'document',
  });
  const state = useAudioRecorderState(recorder);
  const sync = useSync();
  const [busy, setBusy] = useState(false);

  async function startRecording(): Promise<void> {
    const permission = await requestMicrophonePermission();
    if (permission !== 'granted') {
      Alert.alert('Microphone denied', 'Manual recording cannot start without microphone permission.');
      return;
    }
    await prepareAudioMode();
    await recorder.prepareToRecordAsync();
    recorder.record();
  }

  async function stopRecording(): Promise<void> {
    setBusy(true);
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) {
        Alert.alert('Recording', 'No file was produced.');
        return;
      }
      const fileName = `recording-${Date.now()}.m4a`;
      await persistRecordingFile(uri, fileName, 'audio/mp4');
      await sync.refresh();
      Alert.alert('Saved', 'Recording stored locally and queued for Google Drive.');
      void uploadPendingAudio();
    } catch (error) {
      Alert.alert('Recording failed', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Audio</Text>
      <Text style={styles.subheading}>Record or import a file, then upload to Drive</Text>

      <View style={[styles.statusCard, state.isRecording && styles.recording]}>
        <Text style={styles.statusLabel}>{state.isRecording ? 'Recording' : 'Ready'}</Text>
        <Text style={styles.statusValue}>{Math.round(state.durationMillis / 1000)}s</Text>
        <Text style={styles.statusHint}>
          {state.isRecording ? 'Tap stop when you are done.' : 'Start a new clip anytime.'}
        </Text>
      </View>

      <View style={styles.card}>
        <StatusRow label="Pending uploads" value={String(sync.pendingFiles)} />
        <Text style={styles.note}>{CALL_RECORDING_LIMITATION.reason}</Text>
      </View>

      {state.isRecording ? (
        <PrimaryButton
          label="Stop recording"
          variant="danger"
          onPress={() => void stopRecording()}
          loading={busy}
        />
      ) : (
        <PrimaryButton label="Start recording" onPress={() => void startRecording()} />
      )}

      <PrimaryButton
        label="Import audio file"
        variant="secondary"
        onPress={() => {
          void importExistingAudioFile()
            .then((name) => {
              if (name) {
                Alert.alert('Queued', `${name} was added to the Drive upload queue.`);
                void sync.refresh();
                void uploadPendingAudio();
              }
            })
            .catch((error: unknown) =>
              Alert.alert('Import failed', error instanceof Error ? error.message : String(error)),
            );
        }}
      />
      <PrimaryButton label="Upload pending" variant="secondary" onPress={() => void uploadPendingAudio()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  heading: { color: colors.text, fontSize: 28, fontWeight: '800' },
  subheading: { color: colors.muted, marginTop: -6 },
  statusCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recording: {
    backgroundColor: colors.dangerBg,
    borderColor: '#7F1D1D',
  },
  statusLabel: {
    color: colors.muted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontSize: 12,
  },
  statusValue: {
    color: colors.text,
    fontSize: 36,
    fontWeight: '800',
    marginTop: 4,
  },
  statusHint: { color: colors.muted, marginTop: 6 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  note: { color: colors.muted, lineHeight: 20, fontSize: 13 },
});
