import Ionicons from '@expo/vector-icons/Ionicons';
import { useEvent } from 'expo';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import type { Comment } from '@/lib/comments';
import { formatHeight } from '@/lib/height';
import { incrementVideoView, type BetaVideo } from '@/lib/route-detail';
import { colors, fonts, radii, space } from '@/lib/theme';

const streamUrl = (playbackId: string) => `https://stream.mux.com/${playbackId}.m3u8`;
const muxThumb = (playbackId: string | null, width: number) =>
  playbackId
    ? `https://image.mux.com/${playbackId}/thumbnail.webp?width=${width}&time=2`
    : null;

// Ported from the web RouteTheater.
function relativeTime(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return `${Math.floor(d / 7)}w`;
}

// Beta theater ported from the web RouteTheater: featured player + horizontal
// clip playlist, uploader attribution, view + comment counts. Where the web
// expands an inline thread, the count button hands off to the route screen's
// comments sheet via onOpenComments. Upload (S8) and delete (S10) come later.
// The screen opens on the newest clip's poster; selecting a playlist clip
// swaps and autoplays.
export function RouteTheater({
  videos,
  commentsByVideo,
  onOpenComments,
}: {
  videos: BetaVideo[];
  commentsByVideo: Record<string, Comment[]>;
  onOpenComments: (videoId: string) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(videos[0]?.id ?? null);
  // One RPC call per clip per screen visit (web semantics); the local +1
  // shows the viewer's own play this session, and doubles as "this clip has
  // started once", which hides its poster overlay.
  const countedRef = useRef<Set<string>>(new Set());
  const [viewBumps, setViewBumps] = useState<Record<string, number>>({});

  const active = videos.find((v) => v.id === activeId) ?? videos[0] ?? null;

  const player = useVideoPlayer(
    active?.mux_playback_id ? streamUrl(active.mux_playback_id) : null
  );
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });

  useEffect(() => {
    if (!isPlaying || !active) return;
    if (countedRef.current.has(active.id)) return;
    countedRef.current.add(active.id);
    setViewBumps((b) => ({ ...b, [active.id]: 1 }));
    void incrementVideoView(active.id);
  }, [isPlaying, active]);

  if (videos.length === 0) {
    return (
      <View style={styles.section}>
        <SectionHead count="No clips yet" />
        <View style={styles.empty}>
          <Ionicons name="videocam-outline" size={28} color={colors.fgFaint} />
          <Text style={styles.emptyTitle}>No beta yet</Text>
          <Text style={styles.emptyText}>
            Nobody&apos;s filmed this one. Be the first to show how it&apos;s done: your clip
            helps the next climber send.
          </Text>
        </View>
      </View>
    );
  }

  const selectClip = (v: BetaVideo) => {
    if (!active || v.id === active.id || !v.mux_playback_id) return;
    setActiveId(v.id);
    player
      .replaceAsync(streamUrl(v.mux_playback_id))
      .then(() => player.play())
      // Player may be released if the screen unmounts mid-swap.
      .catch(() => {});
  };

  const activePoster = active ? muxThumb(active.mux_playback_id, 720) : null;
  const posterVisible = !!active && viewBumps[active.id] == null && !isPlaying;
  const activeHeight =
    active?.profiles?.height_cm != null ? formatHeight(active.profiles.height_cm, 'ftin') : null;

  return (
    <View style={styles.section}>
      <SectionHead count={`${videos.length} ${videos.length === 1 ? 'clip' : 'clips'}`} />

      {/* featured player */}
      <View style={styles.stage}>
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          fullscreenOptions={{ enable: true }}
        />
        {posterVisible ? (
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityLabel="Play beta video"
            onPress={() => player.play()}>
            {activePoster ? (
              <Image
                source={{ uri: activePoster }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={100}
              />
            ) : null}
            <View style={styles.playBadge}>
              <Ionicons name="play" size={30} color={colors.onAccent} />
            </View>
          </Pressable>
        ) : null}
        {active ? (
          <View style={styles.viewsBadge}>
            <Ionicons name="eye-outline" size={13} color={colors.chalk200} />
            <Text style={styles.viewsText}>
              {active.view_count + (viewBumps[active.id] ?? 0)}
            </Text>
          </View>
        ) : null}
      </View>

      {/* uploader attribution */}
      {active ? (
        <View style={styles.caption}>
          <Avatar
            src={active.profiles?.avatar_url ?? null}
            name={active.profiles?.username ?? null}
            size={40}
          />
          <View style={styles.captionBody}>
            <Text style={styles.captionWho} numberOfLines={1}>
              <Text style={styles.captionName}>{active.profiles?.username ?? 'Unknown'}</Text>
              {activeHeight ? `  ·  ${activeHeight} tall` : ''}
              {`  ·  ${relativeTime(active.created_at)} ago`}
            </Text>
            {active.caption ? (
              <Text style={styles.captionText}>&ldquo;{active.caption}&rdquo;</Text>
            ) : null}
          </View>
          <Pressable
            onPress={() => onOpenComments(active.id)}
            accessibilityLabel="Open comments"
            hitSlop={space(1.5)}
            style={({ pressed }) => [styles.commentBtn, pressed && styles.commentBtnPressed]}>
            <Ionicons name="chatbubble-outline" size={15} color={colors.fgMuted} />
            <Text style={styles.commentBtnText}>
              {(commentsByVideo[active.id] ?? []).length}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* playlist */}
      {videos.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.clips}>
          {videos.map((v) => {
            const isActive = v.id === active?.id;
            const thumb = muxThumb(v.mux_playback_id, 320);
            return (
              <Pressable
                key={v.id}
                onPress={() => selectClip(v)}
                style={[styles.clip, isActive && styles.clipActive]}>
                <View style={styles.clipThumb}>
                  {thumb ? (
                    <Image
                      source={{ uri: thumb }}
                      style={StyleSheet.absoluteFill}
                      contentFit="cover"
                      transition={100}
                    />
                  ) : null}
                  {isActive ? (
                    <View style={styles.clipPlaying}>
                      <Ionicons name="play" size={14} color={colors.onAccent} />
                    </View>
                  ) : null}
                </View>
                <Text style={styles.clipCap} numberOfLines={1}>
                  {v.caption || 'Beta clip'}
                </Text>
                <View style={styles.clipMeta}>
                  <Text style={styles.clipMetaText} numberOfLines={1}>
                    {v.profiles?.username ?? 'unknown'}
                    {'  ·  '}
                    {relativeTime(v.created_at)}
                  </Text>
                  <View style={styles.clipViews}>
                    <Ionicons name="eye-outline" size={11} color={colors.fgFaint} />
                    <Text style={styles.clipMetaText}>
                      {v.view_count + (viewBumps[v.id] ?? 0)}
                    </Text>
                  </View>
                  <View style={styles.clipViews}>
                    <Ionicons name="chatbubble-outline" size={11} color={colors.fgFaint} />
                    <Text style={styles.clipMetaText}>
                      {(commentsByVideo[v.id] ?? []).length}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}

function SectionHead({ count }: { count: string }) {
  return (
    <View style={styles.head}>
      <Text style={styles.headTitle}>Beta</Text>
      <Text style={styles.headCount}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: space(3),
  },
  head: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: space(2.5),
  },
  headTitle: {
    fontFamily: fonts.monoMedium,
    fontSize: 12,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: colors.accent,
  },
  headCount: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: colors.fgFaint,
  },
  stage: {
    aspectRatio: 4 / 5,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: '#07090C',
  },
  playBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -34,
    marginLeft: -34,
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(199, 159, 101, 0.94)',
    paddingLeft: 4,
  },
  viewsBadge: {
    position: 'absolute',
    top: space(2.5),
    right: space(2.5),
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1),
    borderRadius: 999,
    backgroundColor: 'rgba(7, 9, 12, 0.66)',
    paddingHorizontal: space(2.5),
    paddingVertical: space(1),
  },
  viewsText: {
    fontFamily: fonts.uiMedium,
    fontSize: 12,
    color: colors.chalk200,
  },
  caption: {
    flexDirection: 'row',
    gap: space(2.5),
  },
  captionBody: {
    flex: 1,
    gap: space(1),
    justifyContent: 'center',
  },
  captionWho: {
    fontFamily: fonts.ui,
    fontSize: 13,
    color: colors.fgMuted,
  },
  captionName: {
    fontFamily: fonts.uiSemi,
    fontSize: 14,
    color: colors.chalk50,
  },
  captionText: {
    fontFamily: fonts.ui,
    fontSize: 14,
    lineHeight: 20,
    color: colors.chalk200,
  },
  commentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: space(1),
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
    paddingHorizontal: space(2.5),
    paddingVertical: space(1.5),
  },
  commentBtnPressed: {
    opacity: 0.7,
  },
  commentBtnText: {
    fontFamily: fonts.uiMedium,
    fontSize: 12,
    color: colors.fgMuted,
  },
  clips: {
    gap: space(2.5),
  },
  clip: {
    width: 148,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
    backgroundColor: colors.surface,
    padding: space(1.5),
    gap: space(1.5),
  },
  clipActive: {
    borderColor: colors.accent,
  },
  clipThumb: {
    aspectRatio: 16 / 10,
    borderRadius: radii.sm,
    overflow: 'hidden',
    backgroundColor: '#07090C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clipPlaying: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(199, 159, 101, 0.94)',
    paddingLeft: 2,
  },
  clipCap: {
    fontFamily: fonts.uiMedium,
    fontSize: 12,
    color: colors.chalk100,
    paddingHorizontal: space(0.5),
  },
  clipMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space(1.5),
    paddingHorizontal: space(0.5),
    paddingBottom: space(0.5),
  },
  clipMetaText: {
    flexShrink: 1,
    fontFamily: fonts.ui,
    fontSize: 11,
    color: colors.fgFaint,
  },
  clipViews: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(0.5),
  },
  empty: {
    alignItems: 'center',
    gap: space(2.5),
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    paddingVertical: space(9),
    paddingHorizontal: space(6),
  },
  emptyTitle: {
    fontFamily: fonts.uiSemi,
    fontSize: 16,
    color: colors.chalk50,
  },
  emptyText: {
    fontFamily: fonts.ui,
    fontSize: 13,
    lineHeight: 20,
    color: colors.fgMuted,
    textAlign: 'center',
    maxWidth: 300,
  },
});
