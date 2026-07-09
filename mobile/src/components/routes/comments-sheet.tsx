import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Alert,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { createComment, deleteComment, type Comment, type CommentTarget } from '@/lib/comments';
import { useSession } from '@/lib/session';
import { colors, fonts, radii, space } from '@/lib/theme';

// Error text color from the web's var(--color-hold-red).
const ERROR_RED = '#d6453b';

// Ported from the web RouteComments.
function relativeTime(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Bottom-sheet port of the web RouteComments: one reusable surface for both
// the route-level Discussion and a clip's thread, selected by `target` (which
// carries exactly one id, like the web). Flat list newest-first, multiline
// composer, delete on own comments only (manager/admin deletion is web-only).
export function CommentsSheet({
  target,
  routeId,
  comments,
  onClose,
}: {
  target: CommentTarget | null;
  routeId: string;
  comments: Comment[];
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['route-comments', routeId] });
    queryClient.invalidateQueries({ queryKey: ['route-video-comments', routeId] });
  };

  const postMutation = useMutation({
    mutationFn: () => createComment(userId!, target!, body),
    onSuccess: () => {
      setBody('');
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
    onSettled: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: string) => deleteComment(commentId),
    onError: (e: Error) => setError(e.message),
    onSettled: invalidate,
  });

  const onPost = () => {
    if (!body.trim() || postMutation.isPending) return;
    setError(null);
    postMutation.mutate();
  };

  const confirmDelete = (commentId: string) => {
    Alert.alert('Delete comment', "This removes the comment for everyone. This can't be undone.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(commentId),
      },
    ]);
  };

  const title = target && 'videoId' in target ? 'Comments' : 'Discussion';

  return (
    <Modal visible={target !== null} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close comments" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + space(3) }]}>
          <View style={styles.head}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.count}>
              {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={space(2)}
              accessibilityLabel="Close comments"
              style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}>
              <Ionicons name="close" size={20} color={colors.fgMuted} />
            </Pressable>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {comments.length === 0 ? (
              <Text style={styles.emptyText}>No comments yet. Start the conversation.</Text>
            ) : (
              comments.map((c) => (
                <View style={styles.comment} key={c.id}>
                  <Avatar
                    src={c.profiles?.avatar_url ?? null}
                    name={c.profiles?.username ?? null}
                    size={36}
                  />
                  <View style={styles.commentBody}>
                    <View style={styles.commentHead}>
                      <Text style={styles.commentName}>{c.profiles?.username ?? 'Unknown'}</Text>
                      <Text style={styles.commentTime}>{relativeTime(c.created_at)}</Text>
                      {c.author_id === userId ? (
                        <Pressable
                          onPress={() => confirmDelete(c.id)}
                          disabled={deleteMutation.isPending}
                          hitSlop={space(1.5)}
                          style={({ pressed }) => pressed && styles.pressed}>
                          <Text style={styles.commentDelete}>Delete</Text>
                        </Pressable>
                      ) : null}
                    </View>
                    <Text style={styles.commentText}>{c.body}</Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.composer}>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="Add a comment..."
              placeholderTextColor={colors.fgFaint}
              maxLength={1000}
              multiline
              style={styles.input}
            />
            <Pressable
              onPress={onPost}
              disabled={postMutation.isPending || !body.trim()}
              style={({ pressed }) => [
                styles.postBtn,
                (postMutation.isPending || !body.trim()) && styles.postBtnDisabled,
                pressed && styles.pressed,
              ]}>
              <Text style={styles.postLabel}>Post</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
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
    maxHeight: '82%',
    minHeight: '50%',
    backgroundColor: colors.bgDeep,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
    paddingTop: space(5),
  },
  head: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: space(2.5),
    paddingHorizontal: space(5),
    marginBottom: space(3),
  },
  title: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.fgMuted,
  },
  count: {
    flex: 1,
    fontFamily: fonts.ui,
    fontSize: 12,
    color: colors.fgFaint,
  },
  closeBtn: {
    alignSelf: 'center',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: space(5),
    paddingBottom: space(3),
    gap: space(4),
  },
  emptyText: {
    fontFamily: fonts.ui,
    fontSize: 14,
    lineHeight: 21,
    color: colors.fgMuted,
    paddingVertical: space(4),
  },
  comment: {
    flexDirection: 'row',
    gap: space(2.5),
  },
  commentBody: {
    flex: 1,
    gap: space(1),
  },
  commentHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: space(2),
  },
  commentName: {
    fontFamily: fonts.uiSemi,
    fontSize: 13,
    color: colors.chalk50,
  },
  commentTime: {
    flex: 1,
    fontFamily: fonts.ui,
    fontSize: 12,
    color: colors.fgFaint,
  },
  commentDelete: {
    fontFamily: fonts.uiMedium,
    fontSize: 12,
    color: colors.fgMuted,
  },
  commentText: {
    fontFamily: fonts.ui,
    fontSize: 14,
    lineHeight: 20,
    color: colors.chalk200,
  },
  errorText: {
    fontFamily: fonts.ui,
    fontSize: 13,
    color: ERROR_RED,
    paddingHorizontal: space(5),
    paddingBottom: space(2),
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space(2.5),
    paddingHorizontal: space(5),
    paddingTop: space(3),
    borderTopWidth: 1,
    borderTopColor: colors.hairlineSoft,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    fontFamily: fonts.ui,
    fontSize: 14,
    color: colors.fg,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    paddingHorizontal: space(3),
    paddingTop: space(2.5),
    paddingBottom: space(2.5),
  },
  postBtn: {
    height: 44,
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingHorizontal: space(4),
  },
  postBtnDisabled: {
    opacity: 0.5,
  },
  postLabel: {
    fontFamily: fonts.uiSemi,
    fontSize: 14,
    color: colors.onAccent,
  },
  pressed: {
    opacity: 0.7,
  },
});
