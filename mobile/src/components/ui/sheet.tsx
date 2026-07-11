import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, radii, space } from '@/lib/theme';

// Shared bottom-sheet chrome (modal, backdrop, rounded slate panel). Content
// layout stays with the caller; pass `sheetStyle` for maxHeight/padding and
// `avoidKeyboard` when the sheet holds a text input.
export function Sheet({
  visible,
  onClose,
  closeLabel,
  avoidKeyboard = false,
  sheetStyle,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  closeLabel: string;
  avoidKeyboard?: boolean;
  sheetStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();

  const body = (
    <>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={closeLabel} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + space(4) }, sheetStyle]}>
        {children}
      </View>
    </>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {avoidKeyboard ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </Modal>
  );
}

// Mono uppercase sheet heading shared by every sheet.
export function SheetTitle({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
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
    paddingTop: space(5),
  },
  title: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.fgMuted,
  },
});
