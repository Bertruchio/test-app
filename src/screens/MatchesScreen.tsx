import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MatchCard } from '../components/MatchCard';
import { UpdatedAgo } from '../components/UpdatedAgo';
import { MATCHES_URL } from '../config';
import { useFavorites } from '../hooks/useFavorites';
import { Match, MatchFilter } from '../types/match';
import {
  filterMatches,
  parseMatchesResponse,
} from '../utils/matches';

const FILTER_OPTIONS: { key: MatchFilter; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'upcoming', label: 'Предстоящие' },
  { key: 'finished', label: 'Завершённые' },
];

// Экран «Матчи тура» — задание в README.md, часть 1.
export function MatchesScreen() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [round, setRound] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [filter, setFilter] = useState<MatchFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const { isFavorite, toggle } = useFavorites();
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadMatches = useCallback(async (isRefresh = false) => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await fetch(MATCHES_URL, {
        signal: controller.signal,
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Ошибка сервера (${response.status})`);
      }

      const rawData: unknown = await response.json();
      const parsed = parseMatchesResponse(rawData);

      setMatches(parsed.matches);
      setRound(parsed.round);
      setLastUpdated(new Date());
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Не удалось загрузить список матчей';
      setError(message);
    } finally {
      if (abortControllerRef.current === controller) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    loadMatches(false);
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [loadMatches]);

  const filteredMatches = useMemo(
    () => filterMatches(matches, filter, searchQuery),
    [matches, filter, searchQuery]
  );

  const handleResetFilters = () => {
    setFilter('all');
    setSearchQuery('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.title}>
            {round !== null ? `Матчи тура • Тур ${round}` : 'Матчи тура'}
          </Text>
          {lastUpdated && (
            <View style={styles.updatedRow}>
              <UpdatedAgo since={lastUpdated} />
            </View>
          )}
        </View>

        <Pressable
          onPress={() => loadMatches(matches.length > 0)}
          disabled={loading || refreshing}
          style={({ pressed }) => [
            styles.refreshButton,
            (loading || refreshing) && styles.buttonDisabled,
            pressed && styles.buttonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Обновить список матчей"
        >
          <Text style={styles.refreshButtonText}>
            {refreshing ? 'Обновление…' : 'Обновить'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.filterTabs}>
        {FILTER_OPTIONS.map((option) => {
          const active = filter === option.key;
          return (
            <Pressable
              key={option.key}
              onPress={() => setFilter(option.key)}
              style={[styles.filterTab, active && styles.filterTabActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text
                style={[
                  styles.filterTabText,
                  active && styles.filterTabTextActive,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Поиск по клубу или городу…"
          placeholderTextColor="#9ca3af"
          style={styles.searchInput}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <Pressable
            onPress={() => setSearchQuery('')}
            hitSlop={8}
            style={styles.clearSearchButton}
            accessibilityRole="button"
            accessibilityLabel="Очистить поиск"
          >
            <Text style={styles.clearSearchText}>✕</Text>
          </Pressable>
        )}
      </View>

      {error && matches.length > 0 && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>
            Не удалось обновить данные: {error}
          </Text>
          <Pressable
            onPress={() => loadMatches(true)}
            style={styles.retrySmallButton}
            accessibilityRole="button"
          >
            <Text style={styles.retrySmallButtonText}>Повторить</Text>
          </Pressable>
        </View>
      )}

      {loading && matches.length === 0 ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.stateSubtext}>Загрузка матчей…</Text>
        </View>
      ) : error && matches.length === 0 ? (
        <View style={styles.centerState}>
          <Text style={styles.stateTitle}>Не удалось загрузить матчи</Text>
          <Text style={styles.stateSubtext}>{error}</Text>
          <Pressable
            onPress={() => loadMatches(false)}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
            ]}
            accessibilityRole="button"
          >
            <Text style={styles.primaryButtonText}>Повторить</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredMatches}
          keyExtractor={(item) => item.id}
          refreshing={refreshing}
          onRefresh={() => loadMatches(true)}
          contentContainerStyle={
            filteredMatches.length === 0
              ? styles.emptyListContainer
              : styles.listContent
          }
          renderItem={({ item }) => (
            <MatchCard
              match={item}
              isFavorite={isFavorite(item.id)}
              onToggleFavorite={toggle}
            />
          )}
          ListEmptyComponent={
            <View style={styles.centerState}>
              <Text style={styles.stateTitle}>Матчи не найдены</Text>
              <Text style={styles.stateSubtext}>
                {matches.length === 0
                  ? 'В этом туре пока нет запланированных или сыгранных матчей.'
                  : 'По выбранному фильтру или поисковому запросу ничего не найдено.'}
              </Text>
              {matches.length > 0 && (filter !== 'all' || searchQuery !== '') && (
                <Pressable
                  onPress={handleResetFilters}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed && styles.buttonPressed,
                  ]}
                  accessibilityRole="button"
                >
                  <Text style={styles.secondaryButtonText}>
                    Сбросить фильтры
                  </Text>
                </Pressable>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: '#f9fafb',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  updatedRow: {
    marginTop: 4,
  },
  refreshButton: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  refreshButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1d4ed8',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.75,
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    borderRadius: 10,
    padding: 3,
    marginBottom: 10,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  filterTabActive: {
    backgroundColor: '#ffffff',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4b5563',
  },
  filterTabTextActive: {
    color: '#111827',
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 9,
    fontSize: 14,
    color: '#111827',
  },
  clearSearchButton: {
    paddingLeft: 8,
    paddingVertical: 4,
  },
  clearSearchText: {
    fontSize: 14,
    color: '#6b7280',
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 24,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
    textAlign: 'center',
  },
  stateSubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#991b1b',
  },
  retrySmallButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retrySmallButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});