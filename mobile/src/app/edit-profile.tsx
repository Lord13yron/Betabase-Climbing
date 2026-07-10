import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { gradesForDiscipline } from '@/lib/grades';
import { cmToFtIn, ftInToCm, type HeightUnit } from '@/lib/height';
import { fetchOwnProfile, getHeightUnit, setHeightUnit, updateProfile, uploadAvatar } from '@/lib/profile';
import { useSession } from '@/lib/session';
import { colors, fonts, radii, space } from '@/lib/theme';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const BOULDER_GRADES = gradesForDiscipline('boulder');
const ROUTE_GRADES = gradesForDiscipline('lead');

// Edit profile modal (web: ProfileEdit.tsx). Username is display-only on
// mobile; editable fields are avatar, height, and the two max grades.

export default function EditProfileScreen() {
  const { session } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = session!.user.id;

  const profileQuery = useQuery({
    queryKey: ['own-profile', userId],
    queryFn: () => fetchOwnProfile(userId),
  });
  const profile = profileQuery.data;

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPending, setAvatarPending] = useState(false);

  // Height: cm is canonical; ft/in is a view that writes back into cm.
  const [unit, setUnit] = useState<HeightUnit>('cm');
  const [cm, setCm] = useState('');
  const [ft, setFt] = useState('');
  const [inch, setInch] = useState('');

  const [maxBoulder, setMaxBoulder] = useState<string | null>(null);
  const [maxRoute, setMaxRoute] = useState<string | null>(null);
  const [pickerFor, setPickerFor] = useState<'boulder' | 'route' | null>(null);

  // Seed the form once the profile row arrives.
  useEffect(() => {
    if (!profile) return;
    setAvatarUrl(profile.avatar_url);
    setCm(profile.height_cm != null ? String(Math.round(profile.height_cm)) : '');
    setMaxBoulder(profile.max_boulder_grade);
    setMaxRoute(profile.max_route_grade);
  }, [profile]);

  useEffect(() => {
    getHeightUnit().then(setUnit);
  }, []);

  useEffect(() => {
    if (cm) {
      const { ft: f, in: i } = cmToFtIn(Number(cm));
      setFt(String(f));
      setInch(String(i));
    } else {
      setFt('');
      setInch('');
    }
  }, [cm]);

  function changeUnit(next: HeightUnit) {
    setUnit(next);
    setHeightUnit(next);
    queryClient.invalidateQueries({ queryKey: ['height-unit'] });
  }

  function onFtInChange(nextFt: string, nextIn: string) {
    setFt(nextFt);
    setInch(nextIn);
    if (nextFt === '' && nextIn === '') {
      setCm('');
      return;
    }
    setCm(String(ftInToCm(Number(nextFt || 0), Number(nextIn || 0))));
  }

  async function onChangePhoto() {
    setError(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? 'image/jpeg';
    if (!ALLOWED_TYPES.includes(mimeType)) {
      setError('Use a JPEG, PNG, or WebP image.');
      return;
    }
    if (asset.fileSize != null && asset.fileSize > MAX_AVATAR_BYTES) {
      setError('Image must be under 5 MB.');
      return;
    }
    setAvatarPending(true);
    try {
      const url = await uploadAvatar(userId, asset.uri, mimeType);
      setAvatarUrl(url);
      queryClient.invalidateQueries({ queryKey: ['own-profile', userId] });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Avatar upload failed.');
    } finally {
      setAvatarPending(false);
    }
  }

  async function onSave() {
    setError(null);
    setSaving(true);
    try {
      await updateProfile(userId, {
        height_cm: cm ? Number(cm) : null,
        max_boulder_grade: maxBoulder,
        max_route_grade: maxRoute,
      });
      queryClient.invalidateQueries({ queryKey: ['own-profile', userId] });
      queryClient.invalidateQueries({ queryKey: ['public-profile'] });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your profile.');
      setSaving(false);
    }
  }

  return (
    <View style={styles.page}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.safe}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.head}>
            <View>
              <Text style={styles.eyebrow}>Account</Text>
              <Text style={styles.title}>Edit profile</Text>
            </View>
            <Pressable
              onPress={() => router.back()}
              hitSlop={space(2)}
              accessibilityLabel="Close"
              style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}>
              <Ionicons name="close" size={20} color={colors.chalk100} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {/* avatar */}
            <View style={styles.avatarRow}>
              <Avatar src={avatarUrl} name={profile?.username ?? null} size={72} />
              <View style={styles.avatarActions}>
                <Pressable
                  onPress={onChangePhoto}
                  disabled={avatarPending}
                  style={({ pressed }) => [styles.photoBtn, pressed && styles.photoBtnPressed]}>
                  <Ionicons name="camera-outline" size={15} color={colors.fg} />
                  <Text style={styles.photoBtnLabel}>
                    {avatarPending ? 'Uploading...' : 'Change photo'}
                  </Text>
                </Pressable>
                <Text style={styles.hint}>JPEG, PNG or WebP, under 5 MB</Text>
              </View>
            </View>

            {/* username (display-only on mobile) */}
            <View style={styles.field}>
              <Text style={styles.label}>Username</Text>
              <View style={styles.usernameRow}>
                <Text style={styles.usernameSigil}>@</Text>
                <Text style={styles.usernameValue}>{profile?.username}</Text>
              </View>
              <Text style={styles.hint}>Usernames change on the website.</Text>
            </View>

            {/* height */}
            <View style={styles.field}>
              <View style={styles.fieldRow}>
                <Text style={styles.label}>Height</Text>
                <View style={styles.unitToggle}>
                  <Pressable
                    onPress={() => changeUnit('cm')}
                    style={[styles.unitBtn, unit === 'cm' && styles.unitBtnOn]}>
                    <Text style={[styles.unitLabel, unit === 'cm' && styles.unitLabelOn]}>cm</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => changeUnit('ftin')}
                    style={[styles.unitBtn, unit === 'ftin' && styles.unitBtnOn]}>
                    <Text style={[styles.unitLabel, unit === 'ftin' && styles.unitLabelOn]}>
                      ft / in
                    </Text>
                  </Pressable>
                </View>
              </View>
              {unit === 'cm' ? (
                <TextInput
                  style={styles.input}
                  value={cm}
                  onChangeText={setCm}
                  placeholder="cm"
                  placeholderTextColor={colors.fgFaint}
                  keyboardType="number-pad"
                  maxLength={3}
                />
              ) : (
                <View style={styles.two}>
                  <TextInput
                    style={[styles.input, styles.half]}
                    value={ft}
                    onChangeText={(v) => onFtInChange(v, inch)}
                    placeholder="ft"
                    placeholderTextColor={colors.fgFaint}
                    keyboardType="number-pad"
                    maxLength={1}
                  />
                  <TextInput
                    style={[styles.input, styles.half]}
                    value={inch}
                    onChangeText={(v) => onFtInChange(ft, v)}
                    placeholder="in"
                    placeholderTextColor={colors.fgFaint}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>
              )}
            </View>

            {/* max grades */}
            <View style={styles.two}>
              <GradeField
                label="Max boulder"
                value={maxBoulder}
                onPress={() => setPickerFor('boulder')}
              />
              <GradeField label="Max route" value={maxRoute} onPress={() => setPickerFor('route')} />
            </View>

            {error && <Text style={styles.error}>{error}</Text>}

            <Pressable
              onPress={onSave}
              disabled={saving || !profile}
              style={({ pressed }) => [
                styles.saveBtn,
                pressed && styles.saveBtnPressed,
                (saving || !profile) && styles.saveBtnDisabled,
              ]}>
              <Ionicons name="checkmark" size={16} color={colors.onAccent} />
              <Text style={styles.saveLabel}>{saving ? 'Saving...' : 'Save profile'}</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <GradePickerSheet
        visible={pickerFor !== null}
        title={pickerFor === 'boulder' ? 'Max boulder' : 'Max route'}
        grades={pickerFor === 'boulder' ? BOULDER_GRADES : ROUTE_GRADES}
        selected={pickerFor === 'boulder' ? maxBoulder : maxRoute}
        onSelect={(g) => (pickerFor === 'boulder' ? setMaxBoulder(g) : setMaxRoute(g))}
        onClose={() => setPickerFor(null)}
      />
    </View>
  );
}

function GradeField({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string | null;
  onPress: () => void;
}) {
  return (
    <View style={[styles.field, styles.half]}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.input, styles.select, pressed && styles.selectPressed]}>
        <Text style={[styles.selectValue, !value && styles.selectPlaceholder]}>
          {value ?? 'Not set'}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.fgFaint} />
      </Pressable>
    </View>
  );
}

// Bottom-sheet grade picker, same chrome as the gyms tab's SortSheet.
function GradePickerSheet({
  visible,
  title,
  grades,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  grades: string[];
  selected: string | null;
  onSelect: (grade: string | null) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close grade picker" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + space(4) }]}>
        <Text style={styles.sheetTitle}>{title}</Text>
        <ScrollView style={styles.sheetList} showsVerticalScrollIndicator={false}>
          {[null, ...grades].map((g) => {
            const isSelected = g === selected;
            return (
              <Pressable
                key={g ?? 'not-set'}
                onPress={() => {
                  onSelect(g);
                  onClose();
                }}
                accessibilityState={{ selected: isSelected }}
                style={({ pressed }) => [styles.sheetItem, pressed && styles.sheetItemPressed]}>
                <Text style={[styles.sheetItemLabel, isSelected && styles.sheetItemLabelSelected]}>
                  {g ?? 'Not set'}
                </Text>
                {isSelected && <Ionicons name="checkmark" size={18} color={colors.accent} />}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  safe: {
    flex: 1,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space(5),
    paddingTop: space(4),
    paddingBottom: space(3),
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
    fontSize: 26,
    color: colors.chalk50,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  closeBtnPressed: {
    backgroundColor: colors.surfaceHover,
  },
  content: {
    paddingHorizontal: space(5),
    paddingBottom: space(8),
    gap: space(5),
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(4),
  },
  avatarActions: {
    gap: space(1.5),
  },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1.5),
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.md,
    paddingHorizontal: space(3.5),
    paddingVertical: space(2),
  },
  photoBtnPressed: {
    backgroundColor: colors.surface,
  },
  photoBtnLabel: {
    fontFamily: fonts.uiSemi,
    fontSize: 13,
    color: colors.fg,
  },
  hint: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: colors.fgFaint,
  },
  field: {
    gap: space(2),
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.fgMuted,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1.5),
  },
  usernameSigil: {
    fontFamily: fonts.uiSemi,
    fontSize: 16,
    color: colors.accent,
  },
  usernameValue: {
    fontFamily: fonts.uiSemi,
    fontSize: 16,
    color: colors.fg,
  },
  unitToggle: {
    flexDirection: 'row',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.hairline,
    overflow: 'hidden',
  },
  unitBtn: {
    paddingHorizontal: space(3),
    paddingVertical: space(1.5),
  },
  unitBtnOn: {
    backgroundColor: colors.surfaceHover,
  },
  unitLabel: {
    fontFamily: fonts.uiMedium,
    fontSize: 12,
    color: colors.fgMuted,
  },
  unitLabelOn: {
    color: colors.fg,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.md,
    paddingHorizontal: space(3.5),
    paddingVertical: space(3),
    fontFamily: fonts.ui,
    fontSize: 15,
    color: colors.fg,
  },
  two: {
    flexDirection: 'row',
    gap: space(3),
  },
  half: {
    flex: 1,
  },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectPressed: {
    backgroundColor: colors.surfaceHover,
  },
  selectValue: {
    fontFamily: fonts.ui,
    fontSize: 15,
    color: colors.fg,
  },
  selectPlaceholder: {
    color: colors.fgFaint,
  },
  error: {
    fontFamily: fonts.ui,
    fontSize: 13,
    color: '#e5743a',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space(1.5),
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: space(3.5),
  },
  saveBtnPressed: {
    backgroundColor: colors.accentHover,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveLabel: {
    fontFamily: fonts.uiSemi,
    fontSize: 15,
    color: colors.onAccent,
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
    paddingHorizontal: space(5),
    paddingTop: space(5),
    gap: space(1),
  },
  sheetTitle: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.fgMuted,
    marginBottom: space(2),
  },
  sheetList: {
    maxHeight: 380,
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space(3),
    paddingHorizontal: space(2),
    borderRadius: radii.md,
  },
  sheetItemPressed: {
    backgroundColor: colors.surface,
  },
  sheetItemLabel: {
    fontFamily: fonts.uiMedium,
    fontSize: 16,
    color: colors.fg,
  },
  sheetItemLabelSelected: {
    color: colors.accent,
  },
});
