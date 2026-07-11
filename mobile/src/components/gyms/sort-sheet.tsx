import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Sheet, SheetTitle } from '@/components/ui/sheet';
import { colors, fonts, radii, space } from '@/lib/theme';

export type SortKey = 'name' | 'routes' | 'beta' | 'recent';

export const SORTS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'routes', label: 'Most routes' },
  { key: 'beta', label: 'Most beta' },
  { key: 'recent', label: 'Recently set' },
];

// Bottom-sheet picker for the directory's sort order — the mobile stand-in for
// the web's g-sort dropdown menu.
export function SortSheet({
  visible,
  sort,
  onSelect,
  onClose,
}: {
  visible: boolean;
  sort: SortKey;
  onSelect: (key: SortKey) => void;
  onClose: () => void;
}) {
  return (
    <Sheet visible={visible} onClose={onClose} closeLabel="Close sort menu" sheetStyle={styles.sheet}>
      <SheetTitle style={styles.title}>Sort gyms</SheetTitle>
      {SORTS.map((s) => {
        const selected = s.key === sort;
        return (
          <Pressable
            key={s.key}
            onPress={() => {
              onSelect(s.key);
              onClose();
            }}
            accessibilityState={{ selected }}
            style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}>
            <Text style={[styles.itemLabel, selected && styles.itemLabelSelected]}>
              {s.label}
            </Text>
            {selected && <Ionicons name="checkmark" size={18} color={colors.accent} />}
          </Pressable>
        );
      })}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    paddingHorizontal: space(5),
    gap: space(1),
  },
  title: {
    marginBottom: space(2),
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space(3.5),
    paddingHorizontal: space(2),
    borderRadius: radii.md,
  },
  itemPressed: {
    backgroundColor: colors.surface,
  },
  itemLabel: {
    fontFamily: fonts.uiMedium,
    fontSize: 16,
    color: colors.fg,
  },
  itemLabelSelected: {
    color: colors.accent,
  },
});
