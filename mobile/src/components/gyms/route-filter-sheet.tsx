import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Sheet, SheetTitle } from '@/components/ui/sheet';
import type { Discipline } from '@/lib/grades';
import { holdColor } from '@/lib/holds';
import type { Wall } from '@/lib/gym-detail';
import { colors, fonts, radii, space } from '@/lib/theme';

export type RouteSortKey = 'grade' | 'color' | 'discipline' | 'wall';
export type RouteSort = `${RouteSortKey}:${'asc' | 'desc'}`;

// Same five options as the web RouteBrowser's SORT_OPTIONS.
export const ROUTE_SORTS: { value: RouteSort; label: string }[] = [
  { value: 'grade:desc', label: 'Grade · hardest' },
  { value: 'grade:asc', label: 'Grade · easiest' },
  { value: 'discipline:asc', label: 'Discipline' },
  { value: 'color:asc', label: 'Color' },
  { value: 'wall:asc', label: 'Wall' },
];

type ChipOpt = { value: string; label: string; swatch?: string };

// Flat tappable chip row, the RN port of the web sheet's ChipGroup. `scroll`
// keeps long lists (grades) on one swipeable row.
function ChipGroup({
  options,
  value,
  onChange,
  scroll = false,
}: {
  options: ChipOpt[];
  value: string;
  onChange: (value: string) => void;
  scroll?: boolean;
}) {
  const chips = options.map((o) => {
    const active = o.value === value;
    return (
      <Pressable
        key={o.value}
        onPress={() => onChange(o.value)}
        accessibilityState={{ selected: active }}
        style={[styles.chip, active && styles.chipActive]}>
        {o.swatch ? <View style={[styles.swatch, { backgroundColor: o.swatch }]} /> : null}
        <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{o.label}</Text>
      </Pressable>
    );
  });

  if (scroll) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipScroll}>
        {chips}
      </ScrollView>
    );
  }
  return <View style={styles.chipWrap}>{chips}</View>;
}

// Combined "Filters & sort" bottom sheet for the route browser — the mobile
// stand-in for the web's gd-sheet <dialog>. Live-applies via the same setters
// as the inline controls; Done just closes.
export function RouteFilterSheet({
  visible,
  onClose,
  discipline,
  activeGrades,
  gradeMin,
  gradeMax,
  onGradeMin,
  onGradeMax,
  color,
  colorOptions,
  onColor,
  wall,
  walls,
  onWall,
  sort,
  onSort,
  onClearAll,
}: {
  visible: boolean;
  onClose: () => void;
  discipline: 'all' | Discipline;
  activeGrades: string[];
  gradeMin: number;
  gradeMax: number;
  onGradeMin: (i: number) => void;
  onGradeMax: (i: number) => void;
  color: string;
  colorOptions: string[];
  onColor: (c: string) => void;
  wall: string;
  walls: Wall[];
  onWall: (w: string) => void;
  sort: RouteSort;
  onSort: (s: RouteSort) => void;
  onClearAll: () => void;
}) {
  const gradeOpts = activeGrades.map((g, i) => ({ value: String(i), label: g }));
  const wallOpts = [
    { value: 'all', label: 'All walls' },
    ...walls.map((w) => ({ value: w.id, label: w.name })),
    { value: 'unassigned', label: 'Unassigned' },
  ];

  return (
    <Sheet visible={visible} onClose={onClose} closeLabel="Close filters" sheetStyle={styles.sheet}>
      <View style={styles.head}>
        <SheetTitle>Filters &amp; sort</SheetTitle>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Grade</Text>
          {discipline === 'all' ? (
            <Text style={styles.hint}>Pick a discipline to filter by grade.</Text>
          ) : (
            <>
              <Text style={styles.sub}>Min</Text>
              <ChipGroup
                scroll
                value={String(gradeMin)}
                options={gradeOpts}
                onChange={(v) => onGradeMin(Number(v))}
              />
              <Text style={styles.sub}>Max</Text>
              <ChipGroup
                scroll
                value={String(gradeMax)}
                options={gradeOpts}
                onChange={(v) => onGradeMax(Number(v))}
              />
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Color</Text>
          <ChipGroup
            value={color}
            options={[
              { value: 'all', label: 'Any' },
              ...colorOptions.map((c) => ({ value: c, label: c, swatch: holdColor(c) })),
            ]}
            onChange={onColor}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Wall</Text>
          <ChipGroup value={wall} options={wallOpts} onChange={onWall} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Sort</Text>
          <ChipGroup
            value={sort}
            options={ROUTE_SORTS}
            onChange={(v) => onSort(v as RouteSort)}
          />
        </View>
      </ScrollView>

      <View style={styles.foot}>
        <Pressable
          onPress={onClearAll}
          style={({ pressed }) => [styles.clearBtn, pressed && styles.pressed]}>
          <Text style={styles.clearLabel}>Clear all</Text>
        </Pressable>
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [styles.doneBtn, pressed && styles.pressed]}>
          <Text style={styles.doneLabel}>Done</Text>
        </Pressable>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    maxHeight: '82%',
  },
  head: {
    paddingHorizontal: space(5),
    marginBottom: space(3),
  },
  body: {
    flexGrow: 0,
  },
  bodyContent: {
    paddingHorizontal: space(5),
    gap: space(5),
    paddingBottom: space(3),
  },
  section: {
    gap: space(2),
  },
  sectionLabel: {
    fontFamily: fonts.uiSemi,
    fontSize: 14,
    color: colors.chalk100,
  },
  sub: {
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.fgFaint,
  },
  hint: {
    fontFamily: fonts.ui,
    fontSize: 13,
    color: colors.fgMuted,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space(2),
  },
  chipScroll: {
    gap: space(2),
  },
  chip: {
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
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipLabel: {
    fontFamily: fonts.uiMedium,
    fontSize: 13,
    color: colors.fgMuted,
  },
  chipLabelActive: {
    color: colors.onAccent,
  },
  swatch: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.25)',
  },
  foot: {
    flexDirection: 'row',
    gap: space(3),
    paddingHorizontal: space(5),
    paddingTop: space(3),
    borderTopWidth: 1,
    borderTopColor: colors.hairlineSoft,
  },
  clearBtn: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.md,
    paddingVertical: space(3),
  },
  clearLabel: {
    fontFamily: fonts.uiMedium,
    fontSize: 14,
    color: colors.fg,
  },
  doneBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: space(3),
  },
  doneLabel: {
    fontFamily: fonts.uiSemi,
    fontSize: 14,
    color: colors.onAccent,
  },
  pressed: {
    opacity: 0.8,
  },
});
