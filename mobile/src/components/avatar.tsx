import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/lib/theme';

// Presentational avatar ported from the web components/Avatar.tsx: uploaded
// image, or an initials circle when there's no avatar_url.
export function Avatar({
  src,
  name,
  size = 40,
}: {
  src: string | null;
  name: string | null;
  size?: number;
}) {
  const round = { width: size, height: size, borderRadius: size / 2 };

  if (src) {
    return <Image source={{ uri: src }} style={round} contentFit="cover" transition={100} />;
  }

  return (
    <View style={[styles.fallback, round]}>
      <Text style={[styles.initial, { fontSize: size * 0.45 }]}>
        {(name ?? '?').charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHover,
  },
  initial: {
    fontFamily: fonts.uiMedium,
    color: colors.fgMuted,
  },
});
