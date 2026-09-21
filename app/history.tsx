import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { colors } from '@/components/theme';
import { HISTORY_PAGE_SIZE } from '@/config/constants';
import { LocationRepository } from '@/services/database/locationRepository';
import type { LocationRecord } from '@/types/location';

function syncTone(status: string): string {
  if (status === 'uploaded') return colors.success;
  if (status === 'failed') return colors.danger;
  return colors.warning;
}

export default function HistoryScreen() {
  const [items, setItems] = useState<LocationRecord[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const loadMore = useCallback(async () => {
    if (loading || done) {
      return;
    }
    setLoading(true);
    try {
      const page = await LocationRepository.getRecentLocations(HISTORY_PAGE_SIZE, offset);
      setItems((current) => [...current, ...page]);
      setOffset((current) => current + page.length);
      if (page.length < HISTORY_PAGE_SIZE) {
        setDone(true);
      }
    } catch {
      setDone(true);
    } finally {
      setLoading(false);
    }
  }, [done, loading, offset]);

  useEffect(() => {
    void loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={items}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.title}>History</Text>
          <Text style={styles.subtitle}>Points saved on this phone. Cloud copies live in Supabase.</Text>
          <PrimaryButton
            label="Open cloud table"
            variant="secondary"
            onPress={() => {
              void Linking.openURL(
                'https://supabase.com/dashboard/project/qnbcgvnujaasvzjjawtw/editor',
              );
            }}
          />
        </View>
      }
      onEndReached={() => {
        if (!loading && !done && items.length > 0) {
          void loadMore();
        }
      }}
      onEndReachedThreshold={0.4}
      ListEmptyComponent={
        loading ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <Text style={styles.empty}>No locations yet. Start tracking on Home.</Text>
        )
      }
      ListFooterComponent={loading && items.length > 0 ? <ActivityIndicator color={colors.accent} /> : null}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View style={styles.rowTop}>
            <Text style={styles.time}>{new Date(item.recordedAt).toLocaleString()}</Text>
            <Text style={[styles.badge, { color: syncTone(item.syncStatus) }]}>
              {item.syncStatus}
            </Text>
          </View>
          <Text style={styles.coords}>
            {item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}
          </Text>
          <Text style={styles.meta}>
            Accuracy {item.accuracy != null ? `${Math.round(item.accuracy)} m` : 'n/a'}
          </Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32 },
  header: { gap: 10, marginBottom: 12 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  subtitle: { color: colors.muted, lineHeight: 20 },
  row: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'center' },
  time: { color: colors.text, fontWeight: '700', flex: 1 },
  badge: { fontWeight: '800', textTransform: 'uppercase', fontSize: 11 },
  coords: { color: colors.accent, marginTop: 8, fontSize: 17, fontWeight: '700' },
  meta: { color: colors.muted, marginTop: 4 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 24, lineHeight: 22 },
});
