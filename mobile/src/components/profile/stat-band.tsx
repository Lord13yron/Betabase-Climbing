import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radii, space } from '@/lib/theme';

// Decorative grade-block colors (NOT a route's hold color) — the two "max
// grade" trophy chips, fixed brand accents matching the web profile pages.
const BOULDER_BLOCK = '#7e5ca8';
const ROUTE_BLOCK = '#2e93ae';
const BLOCK_INK = '#f6f2ea';

// The profile stat band (web: pf-logband / u-stats): a row of count cells
// plus the two max-grade trophy chips. Callers pick the counts — own profile
// shows Sends / Beta filmed / Favorites, public shows Sends / Beta / Gyms.
export function StatBand({
  stats,
  maxBoulder,
  maxRoute,
}: {
  stats: { label: string; value: number }[];
  maxBoulder: string | null;
  maxRoute: string | null;
}) {
  return (
    <View style={styles.band}>
      <View style={styles.counts}>
        {stats.map((s) => (
          <View key={s.label} style={styles.cell}>
            <Text style={styles.cellLabel}>{s.label}</Text>
            <Text style={styles.cellValue}>{s.value}</Text>
          </View>
        ))}
      </View>
      <View style={styles.grades}>
        <GradeChip label="Max boulder" grade={maxBoulder} block={BOULDER_BLOCK} />
        <GradeChip label="Max route" grade={maxRoute} block={ROUTE_BLOCK} />
      </View>
    </View>
  );
}

function GradeChip({
  label,
  grade,
  block,
}: {
  label: string;
  grade: string | null;
  block: string;
}) {
  return (
    <View style={[styles.chip, { backgroundColor: grade ? block : colors.slate600 }]}>
      <Text style={[styles.chipLabel, { color: grade ? BLOCK_INK : colors.slate300 }]}>
        {label}
      </Text>
      <Text style={[styles.chipValue, { color: grade ? BLOCK_INK : colors.slate400 }]}>
        {grade ?? '—'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    gap: space(2),
  },
  counts: {
    flexDirection: 'row',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  cell: {
    flex: 1,
    paddingVertical: space(3),
    paddingHorizontal: space(3),
    gap: space(1),
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.hairline,
  },
  cellLabel: {
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.fgMuted,
  },
  cellValue: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.chalk50,
  },
  grades: {
    flexDirection: 'row',
    gap: space(2),
  },
  chip: {
    flex: 1,
    borderRadius: radii.md,
    paddingVertical: space(3),
    paddingHorizontal: space(3),
    gap: space(1),
  },
  chipLabel: {
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  chipValue: {
    fontFamily: fonts.display,
    fontSize: 24,
  },
});
