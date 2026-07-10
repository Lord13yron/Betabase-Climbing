import Ionicons from '@expo/vector-icons/Ionicons';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { fetchGymRoutes, fetchWalls, type GymRoute } from '@/lib/gym-detail';
import { fetchGymDirectory } from '@/lib/gyms';
import { holdColor, holdInk } from '@/lib/holds';
import { colors, fonts, radii, space } from '@/lib/theme';

// The route a clip is being uploaded to, with enough display fields for the
// compose step's summary card.
export type PickedRoute = {
  id: string;
  name: string;
  gradeLabel: string;
  color: string | null;
  gymId: string;
  gymName: string;
};

// Two-step picker for the Upload tab: searchable gym list (same gym_directory
// query as the Gyms tab), then the gym's routes (same gym_routes view as the
// route browser) narrowed by a text filter instead of the full filter sheet.
export function RoutePicker({ onPick }: { onPick: (route: PickedRoute) => void }) {
  const [gym, setGym] = useState<{ id: string; name: string } | null>(null);

  if (!gym) return <GymStep onPick={(id, name) => setGym({ id, name })} />;
  return (
    <RouteStep
      gymId={gym.id}
      gymName={gym.name}
      onBack={() => setGym(null)}
      onPick={onPick}
    />
  );
}

function GymStep({ onPick }: { onPick: (gymId: string, gymName: string) => void }) {
  const [value, setValue] = useState('');
  const [term, setTerm] = useState('');
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

  return (
    <View style={styles.step}>
      <Text style={styles.stepLabel}>Step 1 of 2: pick the gym</Text>
      <SearchBox
        value={value}
        onChangeText={onSearch}
        placeholder="Search gyms by name or city"
      />
      {gymsQuery.isPending ? (
        <Spinner />
      ) : gymsQuery.isError ? (
        <ErrorState text="We could not load the gym directory." onRetry={gymsQuery.refetch} />
      ) : (
        <FlatList
          data={gymsQuery.data}
          keyExtractor={(g) => g.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListEmptyComponent={<Text style={styles.empty}>No gyms found.</Text>}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onPick(item.id, item.name)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <View style={styles.rowMain}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {item.city ? `${item.city}  ·  ` : ''}
                  {item.routesCount} {item.routesCount === 1 ? 'route' : 'routes'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.fgFaint} />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

function RouteStep({
  gymId,
  gymName,
  onBack,
  onPick,
}: {
  gymId: string;
  gymName: string;
  onBack: () => void;
  onPick: (route: PickedRoute) => void;
}) {
  const [filter, setFilter] = useState('');

  const routesQuery = useQuery({
    queryKey: ['gym-routes', gymId],
    queryFn: () => fetchGymRoutes(gymId),
  });
  const wallsQuery = useQuery({
    queryKey: ['gym-walls', gymId],
    queryFn: () => fetchWalls(gymId),
  });

  const wallName = useMemo(() => {
    const byId = new Map((wallsQuery.data ?? []).map((w) => [w.id, w.name]));
    return (r: GymRoute) => (r.wall_id ? (byId.get(r.wall_id) ?? 'Unassigned') : 'Unassigned');
  }, [wallsQuery.data]);

  const filtered = useMemo(() => {
    const routes = routesQuery.data ?? [];
    const q = filter.trim().toLowerCase();
    const list = q
      ? routes.filter(
          (r) =>
            r.name.toLowerCase().includes(q) ||
            r.grade_label.toLowerCase().includes(q) ||
            (r.color ?? '').toLowerCase().includes(q) ||
            wallName(r).toLowerCase().includes(q)
        )
      : routes;
    return [...list].sort((a, b) => a.grade_order - b.grade_order || a.name.localeCompare(b.name));
  }, [routesQuery.data, filter, wallName]);

  return (
    <View style={styles.step}>
      <Pressable onPress={onBack} hitSlop={space(2)} style={styles.backRow}>
        <Ionicons name="chevron-back" size={16} color={colors.fg} />
        <Text style={styles.backLabel} numberOfLines={1}>
          {gymName}
        </Text>
      </Pressable>
      <Text style={styles.stepLabel}>Step 2 of 2: pick the route</Text>
      <SearchBox
        value={filter}
        onChangeText={setFilter}
        placeholder="Search by name, grade, color, or wall"
      />
      {routesQuery.isPending ? (
        <Spinner />
      ) : routesQuery.isError ? (
        <ErrorState text="We could not load this gym's routes." onRetry={routesQuery.refetch} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListEmptyComponent={<Text style={styles.empty}>No routes match.</Text>}
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                onPick({
                  id: item.id,
                  name: item.name,
                  gradeLabel: item.grade_label,
                  color: item.color,
                  gymId,
                  gymName,
                })
              }
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <View style={[styles.band, { backgroundColor: holdColor(item.color) }]}>
                <Text style={[styles.bandLabel, { color: holdInk(item.color) }]}>
                  {item.grade_label}
                </Text>
              </View>
              <View style={styles.rowMain}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {wallName(item)}
                  {item.color ? `  ·  ${item.color}` : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.fgFaint} />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

function SearchBox({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (next: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.search}>
      <Ionicons name="search-outline" size={18} color={colors.fgFaint} />
      <TextInput
        style={styles.searchInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.fgFaint}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />
    </View>
  );
}

function Spinner() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}

function ErrorState({ text, onRetry }: { text: string; onRetry: () => void }) {
  return (
    <View style={styles.center}>
      <Text style={styles.errorText}>{text}</Text>
      <Pressable style={styles.retryBtn} onPress={onRetry}>
        <Text style={styles.retryLabel}>Try again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  step: {
    flex: 1,
    gap: space(3),
  },
  stepLabel: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.fgMuted,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(0.5),
    alignSelf: 'flex-start',
  },
  backLabel: {
    fontFamily: fonts.uiMedium,
    fontSize: 14,
    color: colors.fg,
  },
  search: {
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
  list: {
    paddingBottom: space(8),
    gap: space(2.5),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
    borderRadius: radii.md,
    paddingRight: space(3.5),
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.85,
  },
  band: {
    width: 56,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space(3),
    paddingHorizontal: space(1),
  },
  bandLabel: {
    fontFamily: fonts.uiBold,
    fontSize: 14,
  },
  rowMain: {
    flex: 1,
    gap: space(0.5),
    paddingVertical: space(3),
  },
  rowTitle: {
    fontFamily: fonts.uiSemi,
    fontSize: 15,
    color: colors.chalk50,
  },
  rowMeta: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: colors.fgMuted,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space(2.5),
    paddingHorizontal: space(4),
  },
  empty: {
    fontFamily: fonts.ui,
    fontSize: 14,
    color: colors.fgMuted,
    textAlign: 'center',
    paddingTop: space(6),
  },
  errorText: {
    fontFamily: fonts.ui,
    fontSize: 14,
    lineHeight: 21,
    color: colors.fgMuted,
    textAlign: 'center',
  },
  retryBtn: {
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: space(4),
    paddingVertical: space(2),
  },
  retryLabel: {
    fontFamily: fonts.uiMedium,
    fontSize: 13,
    color: colors.fg,
  },
});
