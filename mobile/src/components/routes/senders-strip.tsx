import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import type { Sender } from '@/lib/route-detail';
import { colors, fonts, radii, space } from '@/lib/theme';

// Senders strip ported from the web SendersStrip: overlapping avatar row +
// "N climbers have sent this", tap to expand the full sender list. Rows are
// inert until S10 adds public profile screens to navigate to.
export function SendersStrip({
  senders,
  totalSends,
}: {
  senders: Sender[];
  totalSends: number;
}) {
  const [open, setOpen] = useState(false);

  if (totalSends === 0) return null;

  const shown = senders.slice(0, 6);
  const extra = totalSends - shown.length;

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityLabel="Show climbers who have sent this route"
        style={({ pressed }) => [styles.strip, pressed && styles.stripPressed]}>
        <View style={styles.avaRow}>
          {shown.map((s, i) => (
            <View key={s.user_id} style={[styles.ava, i > 0 && styles.avaOverlap]}>
              <Avatar
                src={s.profiles?.avatar_url ?? null}
                name={s.profiles?.username ?? null}
                size={32}
              />
            </View>
          ))}
          {extra > 0 ? (
            <View style={[styles.ava, styles.avaOverlap, styles.avaMore]}>
              <Text style={styles.avaMoreText}>+{extra}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.label} numberOfLines={1}>
          <Text style={styles.labelStrong}>
            {totalSends} {totalSends === 1 ? 'climber' : 'climbers'}
          </Text>{' '}
          {totalSends === 1 ? 'has' : 'have'} sent this
        </Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.fgMuted}
        />
      </Pressable>

      {open ? (
        <View style={styles.list}>
          {senders.map((s) => (
            <View key={s.user_id} style={styles.item}>
              <Avatar
                src={s.profiles?.avatar_url ?? null}
                name={s.profiles?.username ?? null}
                size={26}
              />
              <Text style={styles.itemName}>{s.profiles?.username ?? 'Unknown'}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space(2),
  },
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    paddingHorizontal: space(3.5),
    paddingVertical: space(2.5),
  },
  stripPressed: {
    backgroundColor: colors.surfaceHover,
  },
  avaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ava: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
    backgroundColor: colors.surfaceHover,
    overflow: 'hidden',
  },
  avaOverlap: {
    marginLeft: -10,
  },
  avaMore: {
    backgroundColor: colors.slate600,
  },
  avaMoreText: {
    fontFamily: fonts.uiSemi,
    fontSize: 11,
    color: colors.chalk200,
  },
  label: {
    flex: 1,
    fontFamily: fonts.ui,
    fontSize: 13,
    color: colors.fgMuted,
  },
  labelStrong: {
    fontFamily: fonts.uiSemi,
    color: colors.chalk100,
  },
  list: {
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    paddingVertical: space(1.5),
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2.5),
    paddingHorizontal: space(3.5),
    paddingVertical: space(2),
  },
  itemName: {
    fontFamily: fonts.uiMedium,
    fontSize: 14,
    color: colors.chalk100,
  },
});
