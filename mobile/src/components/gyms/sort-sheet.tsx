import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close sort menu" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + space(4) }]}>
        <Text style={styles.title}>Sort gyms</Text>
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  sheet: {
    backgroundColor: colors.bgDeep,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
    paddingHorizontal: space(5),
    paddingTop: space(5),
    gap: space(1),
  },
  title: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.fgMuted,
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
