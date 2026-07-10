import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RoutePicker, type PickedRoute } from '@/components/upload/route-picker';
import { holdColor, holdInk } from '@/lib/holds';
import { useSession } from '@/lib/session';
import { colors, fonts, radii, space } from '@/lib/theme';
import {
  createUploadUrl,
  fetchMyLatestVideoId,
  fetchVideoStatus,
  isSupportedVideo,
  MAX_UPLOAD_BYTES,
  uploadToMux,
} from '@/lib/upload';

// Error red from the auth screens' error box (no theme token yet).
const ERROR_RED = '#c55046';
const ERROR_TEXT = '#e6a49d';

type Clip = {
  uri: string;
  mimeType: string | undefined;
  sizeMB: string;
  durationLabel: string | null;
};

// idle: composing. uploading: minting the URL + PUTting the file. pending:
// waiting for the Mux webhook to flip the row. ready/errored: final states.
type Phase = 'idle' | 'uploading' | 'pending' | 'ready' | 'errored';

function toClip(asset: ImagePicker.ImagePickerAsset): Clip {
  const seconds = asset.duration ? Math.round(asset.duration / 1000) : null;
  return {
    uri: asset.uri,
    mimeType: asset.mimeType ?? undefined,
    sizeMB: ((asset.fileSize ?? 0) / 1_000_000).toFixed(1),
    durationLabel:
      seconds !== null
        ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
        : null,
  };
}

// Upload tab (S8): pick a gym and route (or arrive with one pre-selected from
// a route screen), film or choose a clip, then push it straight to Mux and
// watch the row flip pending -> ready via the webhook.
export default function UploadScreen() {
  const params = useLocalSearchParams<{
    routeId?: string;
    routeName?: string;
    gradeLabel?: string;
    color?: string;
    gymId?: string;
    gymName?: string;
  }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useSession();

  const [route, setRoute] = useState<PickedRoute | null>(null);
  const [clip, setClip] = useState<Clip | null>(null);
  const [caption, setCaption] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);

  // Entering from a route screen pre-selects that route and restarts the flow.
  useEffect(() => {
    if (params.routeId && params.routeName && params.gradeLabel) {
      setRoute({
        id: params.routeId,
        name: params.routeName,
        gradeLabel: params.gradeLabel,
        color: params.color || null,
        gymId: params.gymId ?? '',
        gymName: params.gymName ?? '',
      });
      setClip(null);
      setCaption('');
      setPhase('idle');
      setError(null);
      setVideoId(null);
    }
  }, [params.routeId, params.routeName, params.gradeLabel, params.color, params.gymId, params.gymName]);

  // Poll the pending row every ~4s, mirroring the web route page's refresh
  // loop, until the Mux webhook resolves it.
  const statusQuery = useQuery({
    queryKey: ['upload-video-status', videoId],
    queryFn: () => fetchVideoStatus(videoId!),
    enabled: phase === 'pending' && !!videoId,
    refetchInterval: 4000,
  });
  useEffect(() => {
    if (phase !== 'pending') return;
    if (statusQuery.data === 'ready') {
      setPhase('ready');
      if (route) {
        queryClient.invalidateQueries({ queryKey: ['route-videos', route.id] });
        queryClient.invalidateQueries({ queryKey: ['gym-routes', route.gymId] });
      }
    } else if (statusQuery.data === 'errored') {
      setError('Mux could not process this video. Try a different clip.');
      setPhase('errored');
    }
  }, [statusQuery.data, phase, route, queryClient]);

  async function pick(source: 'camera' | 'library') {
    setError(null);
    try {
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          setError('Camera access is needed to film a clip. Enable it in Settings.');
          return;
        }
      }
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({ mediaTypes: ['videos'] })
          : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'] });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!isSupportedVideo(asset.mimeType ?? undefined, asset.uri)) {
        setError('That file is not a supported video. Use MP4 or MOV.');
        return;
      }
      if ((asset.fileSize ?? 0) > MAX_UPLOAD_BYTES) {
        setError('That video is over 500 MB. Trim it and try again.');
        return;
      }
      setClip(toClip(asset));
    } catch {
      setError(
        source === 'camera'
          ? 'The camera is not available on this device.'
          : 'Could not open your video library.'
      );
    }
  }

  async function startUpload() {
    const accessToken = session?.access_token;
    const userId = session?.user.id;
    if (!route || !clip || !accessToken || !userId) return;
    setError(null);
    setProgress(0);
    setPhase('uploading');
    try {
      const url = await createUploadUrl(route.id, caption, accessToken);
      await uploadToMux(clip.uri, url, clip.mimeType, setProgress);
      setVideoId(await fetchMyLatestVideoId(userId, route.id));
      setPhase('pending');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed. Try again.');
      setPhase('idle');
    }
  }

  function resetForAnother() {
    setClip(null);
    setCaption('');
    setPhase('idle');
    setError(null);
    setVideoId(null);
    setProgress(0);
  }

  const busy = phase === 'uploading' || phase === 'pending';

  return (
    <SafeAreaView style={styles.page} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Share beta</Text>
        <Text style={styles.title}>Upload a clip</Text>
      </View>

      {!route ? (
        <View style={styles.pickerWrap}>
          <RoutePicker onPick={setRoute} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
          {/* selected route summary */}
          <View style={styles.routeCard}>
            <View style={[styles.band, { backgroundColor: holdColor(route.color) }]}>
              <Text style={[styles.bandLabel, { color: holdInk(route.color) }]}>
                {route.gradeLabel}
              </Text>
            </View>
            <View style={styles.routeMain}>
              <Text style={styles.routeName} numberOfLines={1}>
                {route.name}
              </Text>
              {route.gymName ? (
                <Text style={styles.routeMeta} numberOfLines={1}>
                  {route.gymName}
                </Text>
              ) : null}
            </View>
            {!busy && phase !== 'ready' ? (
              <Pressable
                onPress={() => {
                  setRoute(null);
                  resetForAnother();
                }}
                hitSlop={space(2)}
                style={({ pressed }) => pressed && styles.pressed}>
                <Text style={styles.changeLabel}>Change</Text>
              </Pressable>
            ) : null}
          </View>

          {phase === 'ready' ? (
            <View style={styles.stateCard}>
              <Ionicons name="checkmark-circle" size={40} color={colors.accent} />
              <Text style={styles.stateTitle}>Beta is live</Text>
              <Text style={styles.stateText}>
                Your clip is processed and playing on the route page.
              </Text>
              <View style={styles.stateBtns}>
                <Pressable
                  style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
                  onPress={() => router.push(`/routes/${route.id}`)}>
                  <Text style={styles.primaryLabel}>View route</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.outlineBtn, pressed && styles.pressed]}
                  onPress={resetForAnother}>
                  <Text style={styles.outlineLabel}>Upload another</Text>
                </Pressable>
              </View>
            </View>
          ) : phase === 'pending' ? (
            <View style={styles.stateCard}>
              <ActivityIndicator color={colors.accent} />
              <Text style={styles.stateTitle}>Processing your beta</Text>
              <Text style={styles.stateText}>
                The upload is done. Mux is preparing the clip for playback, this usually takes
                under a minute.
              </Text>
            </View>
          ) : phase === 'errored' ? (
            <View style={styles.stateCard}>
              <Ionicons name="alert-circle" size={40} color={ERROR_RED} />
              <Text style={styles.stateTitle}>Processing failed</Text>
              <Text style={styles.stateText}>{error}</Text>
              <Pressable
                style={({ pressed }) => [styles.outlineBtn, pressed && styles.pressed]}
                onPress={resetForAnother}>
                <Text style={styles.outlineLabel}>Start over</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* clip source buttons / picked clip card */}
              {!clip ? (
                <View style={styles.sourceRow}>
                  <Pressable
                    onPress={() => pick('camera')}
                    style={({ pressed }) => [styles.sourceBtn, pressed && styles.pressed]}>
                    <Ionicons name="videocam-outline" size={22} color={colors.accent} />
                    <Text style={styles.sourceLabel}>Film now</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => pick('library')}
                    style={({ pressed }) => [styles.sourceBtn, pressed && styles.pressed]}>
                    <Ionicons name="images-outline" size={22} color={colors.accent} />
                    <Text style={styles.sourceLabel}>Choose from library</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.clipCard}>
                  <View style={styles.clipThumb}>
                    <Ionicons name="film-outline" size={20} color={colors.accent} />
                    {clip.durationLabel ? (
                      <Text style={styles.clipDuration}>{clip.durationLabel}</Text>
                    ) : null}
                  </View>
                  <View style={styles.clipMain}>
                    <Text style={styles.clipTitle}>
                      {phase === 'uploading'
                        ? `Uploading  ${Math.round(progress * 100)}%`
                        : 'Ready to upload'}
                    </Text>
                    <Text style={styles.clipMeta}>{clip.sizeMB} MB</Text>
                    {phase === 'uploading' ? (
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                      </View>
                    ) : null}
                  </View>
                  {phase === 'idle' ? (
                    <Pressable
                      onPress={() => setClip(null)}
                      hitSlop={space(2)}
                      accessibilityLabel="Remove clip"
                      style={({ pressed }) => pressed && styles.pressed}>
                      <Ionicons name="close" size={20} color={colors.fgMuted} />
                    </Pressable>
                  ) : null}
                </View>
              )}

              {/* caption */}
              <View style={styles.captionBlock}>
                <View style={styles.captionHead}>
                  <Text style={styles.captionLabel}>Caption (optional)</Text>
                  <Text style={styles.captionCount}>{caption.length}/280</Text>
                </View>
                <TextInput
                  style={styles.captionInput}
                  value={caption}
                  onChangeText={setCaption}
                  maxLength={280}
                  multiline
                  editable={phase === 'idle'}
                  placeholder="Call out the crux, the beta, the foot you stand up on"
                  placeholderTextColor={colors.fgFaint}
                />
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <Pressable
                onPress={startUpload}
                disabled={!clip || phase === 'uploading'}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  (!clip || phase === 'uploading') && styles.primaryBtnDisabled,
                  pressed && styles.pressed,
                ]}>
                <Ionicons name="cloud-upload-outline" size={18} color={colors.onAccent} />
                <Text style={styles.primaryLabel}>
                  {phase === 'uploading' ? 'Uploading' : 'Upload beta'}
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: space(6),
    paddingTop: space(4),
    paddingBottom: space(3),
    gap: space(1.5),
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
    fontSize: 30,
    lineHeight: 36,
    color: colors.chalk50,
  },
  pickerWrap: {
    flex: 1,
    paddingHorizontal: space(6),
  },
  scroll: {
    paddingHorizontal: space(6),
    paddingBottom: space(10),
    gap: space(4),
  },
  routeCard: {
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
  routeMain: {
    flex: 1,
    gap: space(0.5),
    paddingVertical: space(3),
  },
  routeName: {
    fontFamily: fonts.uiSemi,
    fontSize: 15,
    color: colors.chalk50,
  },
  routeMeta: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: colors.fgMuted,
  },
  changeLabel: {
    fontFamily: fonts.uiMedium,
    fontSize: 13,
    color: colors.accent,
  },
  sourceRow: {
    flexDirection: 'row',
    gap: space(3),
  },
  sourceBtn: {
    flex: 1,
    alignItems: 'center',
    gap: space(2),
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    paddingVertical: space(5),
    paddingHorizontal: space(3),
  },
  sourceLabel: {
    fontFamily: fonts.uiMedium,
    fontSize: 13,
    color: colors.fg,
    textAlign: 'center',
  },
  clipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3.5),
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
    borderRadius: radii.md,
    padding: space(3.5),
  },
  clipThumb: {
    width: 56,
    height: 56,
    borderRadius: radii.sm,
    backgroundColor: colors.bgDeep,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space(0.5),
  },
  clipDuration: {
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    color: colors.fgMuted,
  },
  clipMain: {
    flex: 1,
    gap: space(1),
  },
  clipTitle: {
    fontFamily: fonts.uiSemi,
    fontSize: 14,
    color: colors.chalk50,
  },
  clipMeta: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: colors.fgMuted,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.bgDeep,
    overflow: 'hidden',
    marginTop: space(1),
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  captionBlock: {
    gap: space(2),
  },
  captionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  captionLabel: {
    fontFamily: fonts.uiMedium,
    fontSize: 13,
    color: colors.fg,
  },
  captionCount: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    color: colors.fgFaint,
  },
  captionInput: {
    minHeight: 84,
    textAlignVertical: 'top',
    fontFamily: fonts.ui,
    fontSize: 14,
    color: colors.fg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.md,
    paddingHorizontal: space(3.5),
    paddingVertical: space(3),
  },
  errorText: {
    fontFamily: fonts.ui,
    fontSize: 13,
    lineHeight: 19,
    color: ERROR_TEXT,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space(2),
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accent,
    paddingHorizontal: space(5.5),
  },
  primaryBtnDisabled: {
    opacity: 0.45,
  },
  primaryLabel: {
    fontFamily: fonts.uiSemi,
    fontSize: 15,
    color: colors.onAccent,
  },
  outlineBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
    paddingHorizontal: space(5.5),
  },
  outlineLabel: {
    fontFamily: fonts.uiSemi,
    fontSize: 14,
    color: colors.fg,
  },
  stateCard: {
    alignItems: 'center',
    gap: space(3),
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    paddingVertical: space(8),
    paddingHorizontal: space(5),
  },
  stateTitle: {
    fontFamily: fonts.uiSemi,
    fontSize: 17,
    color: colors.chalk50,
  },
  stateText: {
    fontFamily: fonts.ui,
    fontSize: 14,
    lineHeight: 21,
    color: colors.fgMuted,
    textAlign: 'center',
  },
  stateBtns: {
    flexDirection: 'row',
    gap: space(3),
    marginTop: space(1),
  },
  pressed: {
    opacity: 0.7,
  },
});
