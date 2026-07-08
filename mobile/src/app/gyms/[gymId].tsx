import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RouteFilterSheet, ROUTE_SORTS, type RouteSort } from '@/components/gyms/route-filter-sheet';
import { RouteRow } from '@/components/gyms/route-row';
import { type Discipline, gradesForDiscipline } from '@/lib/grades';
import {
  fetchGym,
  fetchGymRoutes,
  fetchFavoriteRouteIds,
  fetchWalls,
  type GymRoute,
} from '@/lib/gym-detail';
import { fallbackImage, fetchFavoriteGymIds, toggleFavoriteGym } from '@/lib/gyms';
import { useSession } from '@/lib/session';
import { colors, fonts, radii, space } from '@/lib/theme';

// Fixed order so the V-scale and YDS blocks don't interleave when sorting by
// grade across all disciplines (same constant as the web RouteBrowser).
const DISCIPLINE_ORDER: Record<Discipline, number> = {
  boulder: 0,
  top_rope: 1,
  lead: 2,
};

const DISCIPLINE_PILLS: ['all' | Discipline, string][] = [
  ['all', 'All'],
  ['boulder', 'Boulder'],
  ['lead', 'Lead'],
  ['top_rope', 'Top-rope'],
];

// Gym detail + route browser: photo hero with gym stats, then the web
// RouteBrowser's filter/sort/search state ported 1:1 over the S3 `gym_routes`
// rows. Everything renders in one FlatList so the whole screen scrolls.
export default function GymScreen() {
  const { gymId } = useLocalSearchParams<{ gymId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();

  const gymQuery = useQuery({
    queryKey: ['gym', gymId],
    queryFn: () => fetchGym(gymId),
  });
  const wallsQuery = useQuery({
    queryKey: ['gym-walls', gymId],
    queryFn: () => fetchWalls(gymId),
  });
  const routesQuery = useQuery({
    queryKey: ['gym-routes', gymId],
    queryFn: () => fetchGymRoutes(gymId),
  });

  const routes = useMemo(() => routesQuery.data ?? [], [routesQuery.data]);
  const walls = useMemo(() => wallsQuery.data ?? [], [wallsQuery.data]);
  const routeIds = useMemo(() => routes.map((r) => r.id), [routes]);

  // Gym heart shares the directory's query key so both screens stay in sync.
  const favGymsQuery = useQuery({
    queryKey: ['favorite-gym-ids', userId],
    queryFn: () => fetchFavoriteGymIds(userId!),
    enabled: !!userId,
  });
  const favRoutesQuery = useQuery({
    queryKey: ['favorite-route-ids', gymId, userId],
    queryFn: () => fetchFavoriteRouteIds(userId!, routeIds),
    enabled: !!userId && routeIds.length > 0,
  });
  const favoritedRoutes = useMemo(
    () => new Set(favRoutesQuery.data ?? []),
    [favRoutesQuery.data]
  );
  const gymFavorited = (favGymsQuery.data ?? []).includes(gymId);

  const toggleGymFav = useMutation({
    mutationFn: () => toggleFavoriteGym(userId!, gymId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['favorite-gym-ids'] }),
  });

  // --- Filter/sort/search state, ported from the web RouteBrowser ---
  const [discipline, setDiscipline] = useState<'all' | Discipline>('all');
  const [gradeMin, setGradeMin] = useState(0);
  const [gradeMax, setGradeMax] = useState(0);
  const [color, setColor] = useState<'all' | string>('all');
  const [wall, setWall] = useState<'all' | 'unassigned' | string>('all');
  const [sort, setSort] = useState<RouteSort>('grade:asc');
  const [query, setQuery] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);

  const activeGrades = useMemo(
    () => (discipline === 'all' ? [] : gradesForDiscipline(discipline)),
    [discipline]
  );

  const colorOptions = useMemo(
    () =>
      Array.from(new Set(routes.map((r) => r.color).filter((c): c is string => !!c))).sort(
        (a, b) => a.localeCompare(b)
      ),
    [routes]
  );

  const disciplineCounts = useMemo(() => {
    const c = { all: routes.length, boulder: 0, top_rope: 0, lead: 0 } as Record<
      'all' | Discipline,
      number
    >;
    for (const r of routes) c[r.discipline] += 1;
    return c;
  }, [routes]);

  const wallName = useMemo(() => {
    const map = new Map(walls.map((w) => [w.id, w.name]));
    return (id: string | null) => (id && map.get(id)) || 'Unassigned';
  }, [walls]);

  const wallSortValue = useMemo(() => {
    const map = new Map(walls.map((w) => [w.id, w.sort_order]));
    return (id: string | null) =>
      id && map.has(id) ? (map.get(id) as number) : Number.MAX_SAFE_INTEGER;
  }, [walls]);

  function onDisciplineChange(next: 'all' | Discipline) {
    setDiscipline(next);
    if (next !== 'all') {
      setGradeMin(0);
      setGradeMax(gradesForDiscipline(next).length - 1);
    }
  }

  function onGradeMin(next: number) {
    setGradeMin(next);
    if (next > gradeMax) setGradeMax(next);
  }

  function onGradeMax(next: number) {
    setGradeMax(next);
    if (next < gradeMin) setGradeMin(next);
  }

  function clearFilters() {
    setDiscipline('all');
    setGradeMin(0);
    setGradeMax(0);
    setColor('all');
    setWall('all');
    setQuery('');
    setSort('grade:asc');
  }

  // Count of filters hidden in the sheet (color/wall/grade) so the Filters
  // button can flag active state. Sort is not a filter, so excluded.
  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (color !== 'all') n += 1;
    if (wall !== 'all') n += 1;
    if (discipline !== 'all' && (gradeMin > 0 || gradeMax < activeGrades.length - 1)) n += 1;
    return n;
  }, [color, wall, discipline, gradeMin, gradeMax, activeGrades]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const [sortKey, sortDir] = sort.split(':') as [
      'grade' | 'color' | 'discipline' | 'wall',
      'asc' | 'desc',
    ];

    const filtered = routes.filter((r) => {
      if (discipline !== 'all') {
        if (r.discipline !== discipline) return false;
        if (r.grade_order < gradeMin || r.grade_order > gradeMax) return false;
      }
      if (color !== 'all' && r.color !== color) return false;
      if (wall === 'unassigned') {
        if (r.wall_id !== null) return false;
      } else if (wall !== 'all') {
        if (r.wall_id !== wall) return false;
      }
      if (q && !r.name.toLowerCase().includes(q)) return false;
      return true;
    });

    filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'grade':
          cmp = DISCIPLINE_ORDER[a.discipline] - DISCIPLINE_ORDER[b.discipline];
          if (cmp === 0) cmp = a.grade_order - b.grade_order;
          break;
        case 'color':
          cmp = (a.color ?? '').localeCompare(b.color ?? '');
          break;
        case 'discipline':
          cmp = DISCIPLINE_ORDER[a.discipline] - DISCIPLINE_ORDER[b.discipline];
          break;
        case 'wall':
          cmp = wallSortValue(a.wall_id) - wallSortValue(b.wall_id);
          break;
      }
      if (cmp === 0) cmp = a.name.localeCompare(b.name);
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return filtered;
  }, [routes, discipline, gradeMin, gradeMax, color, wall, sort, query, wallSortValue]);

  const gym = gymQuery.data;
  const betaTotal = useMemo(() => routes.reduce((a, r) => a + r.beta_count, 0), [routes]);

  if (gymQuery.isPending || routesQuery.isPending || wallsQuery.isPending) {
    return (
      <View style={[styles.page, styles.center]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (gymQuery.isError || routesQuery.isError || wallsQuery.isError || !gym) {
    return (
      <View style={[styles.page, styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.emptyTitle}>Something went wrong</Text>
        <Text style={styles.emptyText}>We could not load this gym.</Text>
        <View style={styles.errorBtns}>
          <Pressable
            style={styles.outlineBtn}
            onPress={() => {
              gymQuery.refetch();
              routesQuery.refetch();
              wallsQuery.refetch();
            }}>
            <Text style={styles.outlineBtnLabel}>Try again</Text>
          </Pressable>
          <Pressable style={styles.outlineBtn} onPress={() => router.back()}>
            <Text style={styles.outlineBtnLabel}>Back to gyms</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const header = (
    <View>
      {/* Photo hero: gym image (or the directory's deterministic fallback),
          scrim, overlay back/heart, then city, name, address, and stats. */}
      <View style={styles.hero}>
        <Image
          source={{ uri: gym.image_url ?? fallbackImage(gym.id) }}
          style={StyleSheet.absoluteFill}
          alt={gym.name}
          contentFit="cover"
          transition={150}
        />
        <View style={styles.scrim} />
        <View style={[styles.heroTop, { top: insets.top + space(2) }]}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={space(2)}
            accessibilityLabel="Back to gyms"
            style={({ pressed }) => [styles.glassBtn, pressed && styles.glassBtnPressed]}>
            <Ionicons name="chevron-back" size={20} color={colors.chalk100} />
          </Pressable>
          {userId ? (
            <Pressable
              onPress={() => toggleGymFav.mutate()}
              disabled={toggleGymFav.isPending}
              hitSlop={space(2)}
              accessibilityLabel={
                gymFavorited ? 'Remove gym from favorites' : 'Add gym to favorites'
              }
              style={({ pressed }) => [
                styles.glassBtn,
                (pressed || toggleGymFav.isPending) && styles.glassBtnPressed,
              ]}>
              <Ionicons
                name={gymFavorited ? 'heart' : 'heart-outline'}
                size={20}
                color={gymFavorited ? colors.accent : colors.chalk100}
              />
            </Pressable>
          ) : null}
        </View>
        <View style={styles.heroBody}>
          {gym.city ? <Text style={styles.eyebrow}>{gym.city}</Text> : null}
          <Text style={styles.gymName}>{gym.name}</Text>
          {gym.address || gym.city ? (
            <View style={styles.locRow}>
              <Ionicons name="location-outline" size={14} color={colors.chalk200} />
              <Text style={styles.loc} numberOfLines={1}>
                {[gym.address, gym.city].filter(Boolean).join(' · ')}
              </Text>
            </View>
          ) : null}
          <View style={styles.stats}>
            <View style={styles.stat}>
              <View style={styles.statNum}>
                <Ionicons name="layers-outline" size={15} color={colors.accent} />
                <Text style={styles.statN}>{routes.length}</Text>
              </View>
              <Text style={styles.statL}>Routes</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statN}>{walls.length}</Text>
              <Text style={styles.statL}>Walls</Text>
            </View>
            <View style={styles.stat}>
              <View style={styles.statNum}>
                <Ionicons name="play-circle-outline" size={15} color={colors.accent} />
                <Text style={styles.statN}>{betaTotal}</Text>
              </View>
              <Text style={styles.statL}>Beta clips</Text>
            </View>
          </View>
        </View>
      </View>

      {routes.length > 0 ? (
        <View style={styles.toolbar}>
          <View style={styles.search}>
            <Ionicons name="search-outline" size={18} color={colors.fgFaint} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Filter routes"
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
            {DISCIPLINE_PILLS.map(([value, label]) => {
              const active = discipline === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => onDisciplineChange(value)}
                  style={[styles.pill, active && styles.pillActive]}>
                  <Text style={[styles.pillLabel, active && styles.pillLabelActive]}>
                    {label}
                  </Text>
                  <Text style={[styles.pillCount, active && styles.pillLabelActive]}>
                    {disciplineCounts[value]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={styles.toolsRow}>
            <Text style={styles.count}>{visible.length} routes</Text>
            <Pressable
              onPress={() => setSheetOpen(true)}
              style={({ pressed }) => [styles.filtersBtn, pressed && styles.filtersBtnPressed]}>
              <Ionicons name="options-outline" size={15} color={colors.fgMuted} />
              <Text style={styles.filtersLabel}>Filters · sort</Text>
              {activeFilterCount > 0 ? (
                <View style={styles.filtersBadge}>
                  <Text style={styles.filtersBadgeText}>{activeFilterCount}</Text>
                </View>
              ) : null}
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.page}>
      <FlatList
        data={visible}
        keyExtractor={(r: GymRoute) => r.id}
        renderItem={({ item }) => (
          <View style={styles.rowWrap}>
            <RouteRow
              route={item}
              wallName={wallName(item.wall_id)}
              favorited={favoritedRoutes.has(item.id)}
            />
          </View>
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={
          routes.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="trail-sign-outline" size={28} color={colors.fgFaint} />
              <Text style={styles.emptyTitle}>No routes set yet</Text>
              <Text style={styles.emptyText}>
                This gym hasn&apos;t published any routes. Once the setters log their first
                problems, they&apos;ll show up here with grades, beta, and sends.
              </Text>
              <Text style={styles.emptySoon}>Check back soon</Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No routes match these filters</Text>
              <Pressable style={styles.outlineBtn} onPress={clearFilters}>
                <Text style={styles.outlineBtnLabel}>Clear filters</Text>
              </Pressable>
            </View>
          )
        }
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + space(8) }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />

      <RouteFilterSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        discipline={discipline}
        activeGrades={activeGrades}
        gradeMin={gradeMin}
        gradeMax={gradeMax}
        onGradeMin={onGradeMin}
        onGradeMax={onGradeMax}
        color={color}
        colorOptions={colorOptions}
        onColor={setColor}
        wall={wall}
        walls={walls}
        onWall={setWall}
        sort={sort}
        onSort={setSort}
        onClearAll={clearFilters}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space(8),
    gap: space(2.5),
  },
  hero: {
    height: 300,
    backgroundColor: colors.slate700,
    justifyContent: 'flex-end',
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(14, 18, 22, 0.45)',
  },
  heroTop: {
    position: 'absolute',
    left: space(4),
    right: space(4),
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  glassBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(14, 18, 22, 0.6)',
  },
  glassBtnPressed: {
    opacity: 0.7,
  },
  heroBody: {
    padding: space(5),
    gap: space(1.5),
  },
  eyebrow: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: colors.plywood300,
  },
  gymName: {
    fontFamily: fonts.display,
    fontSize: 30,
    lineHeight: 36,
    color: colors.chalk50,
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1),
  },
  loc: {
    flex: 1,
    fontFamily: fonts.ui,
    fontSize: 13,
    color: colors.chalk200,
  },
  stats: {
    flexDirection: 'row',
    gap: space(6),
    marginTop: space(2),
  },
  stat: {
    gap: space(0.5),
  },
  statNum: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1),
  },
  statN: {
    fontFamily: fonts.uiSemi,
    fontSize: 17,
    color: colors.chalk50,
  },
  statL: {
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.chalk300,
  },
  toolbar: {
    paddingTop: space(4),
    paddingBottom: space(3),
    gap: space(3),
  },
  search: {
    marginHorizontal: space(4),
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
    paddingHorizontal: space(4),
    gap: space(2),
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1.5),
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
  pillCount: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    color: colors.fgFaint,
  },
  pillLabelActive: {
    color: colors.onAccent,
  },
  toolsRow: {
    marginHorizontal: space(4),
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
  filtersBtn: {
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
  filtersBtnPressed: {
    backgroundColor: colors.surfaceHover,
  },
  filtersLabel: {
    fontFamily: fonts.uiMedium,
    fontSize: 12,
    color: colors.fgMuted,
  },
  filtersBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: space(1),
  },
  filtersBadgeText: {
    fontFamily: fonts.uiSemi,
    fontSize: 11,
    color: colors.onAccent,
  },
  list: {
    gap: space(2.5),
  },
  rowWrap: {
    marginHorizontal: space(4),
  },
  empty: {
    alignItems: 'center',
    gap: space(2.5),
    paddingVertical: space(10),
    paddingHorizontal: space(6),
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
  emptySoon: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.fgFaint,
  },
  errorBtns: {
    flexDirection: 'row',
    gap: space(3),
    marginTop: space(1),
  },
  outlineBtn: {
    marginTop: space(1),
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: space(4),
    paddingVertical: space(2),
  },
  outlineBtnLabel: {
    fontFamily: fonts.uiMedium,
    fontSize: 13,
    color: colors.fg,
  },
});
