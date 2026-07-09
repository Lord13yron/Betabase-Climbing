import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { toggleFavoriteRoute } from '@/lib/gym-detail';
import { toggleSend } from '@/lib/route-detail';
import { useSession } from '@/lib/session';
import { colors, fonts, space } from '@/lib/theme';

// Sent state colors from the web's .rd-send-btn.is-sent (hold green + dark ink).
const SENT_BG = '#4e9d5b';
const SENT_INK = '#07140A';

// Route header actions ported from the web RouteActions: primary "Log a send"
// button that flips to a green "Sent" state, plus a circular favorite heart.
// Every app user is signed in (onboarding gate), so no signed-out variant.
export function RouteActions({
  routeId,
  gymId,
  sent,
  favorited,
}: {
  routeId: string;
  gymId: string;
  sent: boolean;
  favorited: boolean;
}) {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  // A send changes this screen's state + senders strip, and the gym list's
  // send_count (S3 gym_routes view).
  const sendMutation = useMutation({
    mutationFn: () => toggleSend(userId!, routeId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['route-my-state', routeId] });
      queryClient.invalidateQueries({ queryKey: ['route-senders', routeId] });
      queryClient.invalidateQueries({ queryKey: ['gym-routes', gymId] });
    },
  });

  const favMutation = useMutation({
    mutationFn: () => toggleFavoriteRoute(userId!, routeId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['route-my-state', routeId] });
      queryClient.invalidateQueries({ queryKey: ['favorite-route-ids', gymId] });
    },
  });

  if (!userId) return null;

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => sendMutation.mutate()}
        disabled={sendMutation.isPending}
        style={({ pressed }) => [
          styles.sendBtn,
          sent && styles.sendBtnSent,
          (pressed || sendMutation.isPending) && styles.pressed,
        ]}>
        <Ionicons
          name={sent ? 'checkmark' : 'flag-outline'}
          size={18}
          color={sent ? SENT_INK : colors.onAccent}
        />
        <Text style={[styles.sendLabel, sent && styles.sendLabelSent]}>
          {sent ? 'Sent' : 'Log a send'}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => favMutation.mutate()}
        disabled={favMutation.isPending}
        accessibilityLabel={favorited ? 'Remove route from favorites' : 'Add route to favorites'}
        style={({ pressed }) => [
          styles.heartBtn,
          favorited && styles.heartBtnFav,
          (pressed || favMutation.isPending) && styles.pressed,
        ]}>
        <Ionicons
          name={favorited ? 'heart' : 'heart-outline'}
          size={20}
          color={favorited ? colors.accent : colors.chalk100}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2.5),
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2),
    height: 48,
    paddingHorizontal: space(5.5),
    borderRadius: 24,
    backgroundColor: colors.accent,
  },
  sendBtnSent: {
    backgroundColor: SENT_BG,
  },
  sendLabel: {
    fontFamily: fonts.uiSemi,
    fontSize: 15,
    color: colors.onAccent,
  },
  sendLabelSent: {
    color: SENT_INK,
  },
  heartBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },
  heartBtnFav: {
    backgroundColor: 'rgba(199, 159, 101, 0.16)',
    borderColor: colors.accent,
  },
  pressed: {
    opacity: 0.7,
  },
});
