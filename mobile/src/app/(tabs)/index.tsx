import Ionicons from '@expo/vector-icons/Ionicons';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GymCard } from '@/components/gyms/gym-card';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { SortSheet, SORTS, type SortKey } from '@/components/gyms/sort-sheet';
import type { Discipline } from '@/lib/grades';
import { fetchFavoriteGymIds, fetchGymDirectory, type GymCardData } from '@/lib/gyms';
import { useSession } from '@/lib/session';
import { colors, fonts, radii, space } from '@/lib/theme';

type DisciplineFilter = 'all' | Discipline;

const FILTERS: { key: DisciplineFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'boulder', label: 'Bouldering' },
  { key: 'lead', label: 'Lead' },
  { key: 'top_rope', label: 'Top-rope' },
];

// Gyms directory: debounced name/city search re-queries the gym_directory
// view; discipline filter and sort run client-side over the fetched list; a
// "Your gyms" / "All gyms" split mirrors the web's GymsDirectory.
export default function GymsScreen() {
  const { session } = useSession();
  const userId = session?.user.id;

  const [value, setValue] = useState('');
  const [term, setTerm] = useState('');
  const [discipline, setDiscipline] = useState<DisciplineFilter>('all');
  const [sort, setSort] = useState<SortKey>('name');
  const [sortOpen, setSortOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function onSearch(next: string) {
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setTerm(next.trim()), 300);
  }

  const gymsQuery = useQuery({
    queryKey: ['gym-directory', term],
    queryFn: () => fetchGymDirectory(term),
    placeholderData: keepPreviousData,
  });
  const favoritesQuery = useQuery({
    queryKey: ['favorite-gym-ids', userId],
    queryFn: () => fetchFavoriteGymIds(userId!),
    enabled: !!userId,
  });

  const favSet = useMemo(
    () => new Set(favoritesQuery.data ?? []),
    [favoritesQuery.data]
  );

  const filtered = useMemo(() => {
    const list = (gymsQuery.data ?? []).filter(
      (g) => discipline === 'all' || g.disciplines.includes(discipline)
    );
    const cmp: Record<SortKey, (a: GymCardData, b: GymCardData) => number> = {
      name: (a, b) => a.name.localeCompare(b.name),
      routes: (a, b) => b.routesCount - a.routesCount,
      beta: (a, b) => b.beta - a.beta,
      recent: (a, b) => b.setSort - a.setSort,
    };
    return [...list].sort(cmp[sort]);
  }, [gymsQuery.data, discipline, sort]);

  const favorites = filtered.filter((g) => favSet.has(g.id));
  const others = filtered.filter((g) => !favSet.has(g.id));

  const sections = [
    ...(favorites.length > 0 ? [{ title: 'Your gyms', data: favorites }] : []),
    ...(others.length > 0
      ? [{ title: favorites.length > 0 ? 'All gyms' : 'Gyms', data: others }]
      : []),
  ];

  return (
    <SafeAreaView style={styles.page} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Browse gyms</Text>
        <Text style={styles.title}>Find your gym</Text>
      </View>

      <View style={styles.toolbar}>
        <View style={styles.search}>
          <Ionicons name="search-outline" size={18} color={colors.fgFaint} />
          <TextInput
            style={styles.searchInput}
            value={value}
            onChangeText={onSearch}
            placeholder="Search gyms by name or city"
            placeholderTextColor={colors.fgFaint}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pills}>
          {FILTERS.map((f) => {
            const active = discipline === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setDiscipline(f.key)}
                style={[styles.pill, active && styles.pillActive]}>
                <Text style={[styles.pillLabel, active && styles.pillLabelActive]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={styles.toolsRow}>
          <Text style={styles.count}>{filtered.length} gyms</Text>
          <Pressable
            onPress={() => setSortOpen(true)}
            style={({ pressed }) => [styles.sortBtn, pressed && styles.sortBtnPressed]}>
            <Ionicons name="options-outline" size={15} color={colors.fgMuted} />
            <Text style={styles.sortLabel}>Sort</Text>
            <Text style={styles.sortValue}>
              {SORTS.find((s) => s.key === sort)?.label}
            </Text>
          </Pressable>
        </View>
      </View>

      {gymsQuery.isPending ? (
        <LoadingState />
      ) : gymsQuery.isError ? (
        <ErrorState
          message="We could not load the gym directory. Check your connection and try again."
          onRetry={() => gymsQuery.refetch()}
        />
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="search-outline" size={28} color={colors.fgFaint} />
          <Text style={styles.emptyTitle}>No gyms found</Text>
          <Text style={styles.emptyText}>
            {term
              ? `We couldn't find a gym matching "${term}". Try a different name or city.`
              : 'No gyms match this filter. Try a different discipline.'}
          </Text>
          {term ? (
            <Pressable style={styles.clearBtn} onPress={() => onSearch('')}>
              <Text style={styles.clearBtnLabel}>Clear search</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <SectionList
          style={styles.grow}
          sections={sections}
          keyExtractor={(g) => g.id}
          renderItem={({ item }) => <GymCard gym={item} favorited={favSet.has(item.id)} />}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHead}>
              <Text style={styles.sectionLabel}>{section.title}</Text>
              <Text style={styles.sectionCount}>{section.data.length}</Text>
              <View style={styles.sectionRule} />
            </View>
          )}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={
            <RefreshControl
              tintColor={colors.accent}
              refreshing={gymsQuery.isRefetching}
              onRefresh={() => {
                gymsQuery.refetch();
                favoritesQuery.refetch();
              }}
            />
          }
        />
      )}

      <SortSheet
        visible={sortOpen}
        sort={sort}
        onSelect={setSort}
        onClose={() => setSortOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: space(6),
    paddingTop: space(4),
    gap: space(1.5),
  },
  eyebrow: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: colors.accent,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 30,
    lineHeight: 36,
    color: colors.chalk50,
  },
  toolbar: {
    paddingTop: space(4),
    gap: space(3),
  },
  search: {
    marginHorizontal: space(6),
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2.5),
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.md,
    paddingHorizontal: space(4),
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.ui,
    fontSize: 15,
    color: colors.fg,
    paddingVertical: space(3),
  },
  pills: {
    paddingHorizontal: space(6),
    gap: space(2),
  },
  pill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
    paddingHorizontal: space(3.5),
    paddingVertical: space(2),
  },
  pillActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  pillLabel: {
    fontFamily: fonts.uiMedium,
    fontSize: 13,
    color: colors.fgMuted,
  },
  pillLabelActive: {
    color: colors.onAccent,
  },
  toolsRow: {
    marginHorizontal: space(6),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  count: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.fgFaint,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1.5),
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: space(3),
    paddingVertical: space(1.5),
  },
  sortBtnPressed: {
    backgroundColor: colors.surfaceHover,
  },
  sortLabel: {
    fontFamily: fonts.uiMedium,
    fontSize: 12,
    color: colors.fgMuted,
  },
  sortValue: {
    fontFamily: fonts.uiSemi,
    fontSize: 12,
    color: colors.fg,
  },
  grow: {
    flex: 1,
  },
  list: {
    paddingHorizontal: space(6),
    paddingTop: space(2),
    paddingBottom: space(8),
    gap: space(4),
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2),
    marginTop: space(2),
  },
  sectionLabel: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.fgMuted,
  },
  sectionCount: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    color: colors.accent,
  },
  sectionRule: {
    flex: 1,
    height: 1,
    backgroundColor: colors.hairlineSoft,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space(8),
    gap: space(2.5),
  },
  emptyTitle: {
    fontFamily: fonts.uiSemi,
    fontSize: 17,
    color: colors.chalk50,
  },
  emptyText: {
    fontFamily: fonts.ui,
    fontSize: 14,
    lineHeight: 21,
    color: colors.fgMuted,
    textAlign: 'center',
  },
  clearBtn: {
    marginTop: space(1),
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: space(4),
    paddingVertical: space(2),
  },
  clearBtnLabel: {
    fontFamily: fonts.uiMedium,
    fontSize: 13,
    color: colors.fg,
  },
});
