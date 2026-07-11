import Ionicons from '@expo/vector-icons/Ionicons';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { FeedCard } from '@/components/community/feed-card';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { fetchFeed, searchProfiles } from '@/lib/feed-queries';
import { useSession } from '@/lib/session';
import { colors, fonts, radii, space } from '@/lib/theme';

// Community tab: the merged activity feed from the web's /community page plus
// debounced username search. While the search box has a query, matching
// climbers replace the feed; clearing it restores the feed.
export default function CommunityScreen() {
  const router = useRouter();
  const { session } = useSession();
  const userId = session?.user.id;

  const [value, setValue] = useState('');
  const [term, setTerm] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function onSearch(next: string) {
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setTerm(next.trim()), 300);
  }

  const feedQuery = useQuery({
    queryKey: ['feed', userId],
    queryFn: () => fetchFeed(userId!),
    enabled: !!userId,
  });
  const searchQuery = useQuery({
    queryKey: ['user-search', term],
    queryFn: () => searchProfiles(term),
    enabled: term.length > 0,
    placeholderData: keepPreviousData,
  });

  const searching = value.trim().length > 0;
  const personalized = feedQuery.data?.personalized ?? false;
  const events = feedQuery.data?.events ?? [];

  return (
    <SafeAreaView style={styles.page} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Community</Text>
        <Text style={styles.title}>Fresh beta, live from the walls</Text>
      </View>

      <View style={styles.search}>
        <Ionicons name="search-outline" size={18} color={colors.fgFaint} />
        <TextInput
          style={styles.searchInput}
          value={value}
          onChangeText={onSearch}
          placeholder="Find climbers by username"
          placeholderTextColor={colors.fgFaint}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {searching ? (
          <Pressable onPress={() => onSearch('')} hitSlop={space(2)}>
            <Ionicons name="close-circle" size={18} color={colors.fgFaint} />
          </Pressable>
        ) : null}
      </View>

      {searching ? (
        searchQuery.isPending ? (
          <LoadingState />
        ) : searchQuery.isError ? (
          <ErrorState
            message="We could not search climbers. Check your connection and try again."
            onRetry={() => searchQuery.refetch()}
          />
        ) : (searchQuery.data ?? []).length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="person-outline" size={28} color={colors.fgFaint} />
            <Text style={styles.emptyTitle}>No climbers found</Text>
            <Text style={styles.emptyText}>
              Nobody matches &ldquo;{value.trim()}&rdquo;. Try a different username.
            </Text>
          </View>
        ) : (
          <FlatList
            style={styles.grow}
            data={searchQuery.data ?? []}
            keyExtractor={(p) => p.username}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => router.push(`/u/${item.username}`)}
                style={({ pressed }) => [styles.person, pressed && styles.personPressed]}>
                <Avatar src={item.avatar_url} name={item.username} size={36} />
                <Text style={styles.personName}>{item.username}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.fgFaint} />
              </Pressable>
            )}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          />
        )
      ) : feedQuery.isPending ? (
        <LoadingState />
      ) : feedQuery.isError ? (
        <ErrorState
          message="We could not load the feed. Check your connection and try again."
          onRetry={() => feedQuery.refetch()}
        />
      ) : (
        <FlatList
          style={styles.grow}
          data={events}
          keyExtractor={(e) => e.key}
          renderItem={({ item }) => <FeedCard event={item} />}
          refreshControl={
            <RefreshControl
              refreshing={feedQuery.isRefetching}
              onRefresh={() => feedQuery.refetch()}
              tintColor={colors.accent}
            />
          }
          ListHeaderComponent={
            <View style={styles.listHead}>
              {!personalized ? (
                <View style={styles.banner}>
                  <Text style={styles.bannerText}>
                    Favorite a gym or route to personalize this feed.
                  </Text>
                  <Pressable onPress={() => router.push('/')} hitSlop={space(1.5)}>
                    <Text style={styles.bannerLink}>Browse gyms</Text>
                  </Pressable>
                </View>
              ) : null}
              <View style={styles.sectionHead}>
                <Text style={styles.sectionLabel}>
                  {personalized ? 'Your feed' : 'Recent activity'}
                </Text>
                <Text style={styles.sectionCount}>
                  {events.length} {events.length === 1 ? 'event' : 'events'}
                </Text>
                <View style={styles.sectionRule} />
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyBlock}>
              <Ionicons name="flag-outline" size={28} color={colors.fgFaint} />
              <Text style={styles.emptyTitle}>Nothing here yet</Text>
              <Text style={styles.emptyText}>
                {personalized
                  ? 'No recent activity at your favorite gyms or routes. Check back after the next session.'
                  : 'No activity yet. Once climbers start logging sends and sharing beta, it will show up here.'}
              </Text>
            </View>
          }
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />
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
    fontSize: 26,
    lineHeight: 32,
    color: colors.chalk50,
  },
  search: {
    marginHorizontal: space(6),
    marginTop: space(4),
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2.5),
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.md,
    paddingHorizontal: space(4),
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.ui,
    fontSize: 15,
    color: colors.fg,
    paddingVertical: space(3),
  },
  grow: {
    flex: 1,
  },
  list: {
    paddingHorizontal: space(6),
    paddingTop: space(3),
    paddingBottom: space(8),
    gap: space(3),
  },
  listHead: {
    gap: space(3),
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space(3),
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.md,
    paddingHorizontal: space(4),
    paddingVertical: space(3),
  },
  bannerText: {
    flex: 1,
    fontFamily: fonts.ui,
    fontSize: 13,
    lineHeight: 19,
    color: colors.fgMuted,
  },
  bannerLink: {
    fontFamily: fonts.uiSemi,
    fontSize: 13,
    color: colors.accent,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2),
    marginTop: space(1),
  },
  sectionLabel: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.fgMuted,
  },
  sectionCount: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    color: colors.accent,
  },
  sectionRule: {
    flex: 1,
    height: 1,
    backgroundColor: colors.hairlineSoft,
  },
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
    borderRadius: radii.md,
    paddingHorizontal: space(4),
    paddingVertical: space(3),
  },
  personPressed: {
    backgroundColor: colors.surfaceHover,
  },
  personName: {
    flex: 1,
    fontFamily: fonts.uiSemi,
    fontSize: 15,
    color: colors.fg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space(8),
    gap: space(2.5),
  },
  emptyBlock: {
    alignItems: 'center',
    paddingVertical: space(12),
    paddingHorizontal: space(4),
    gap: space(2.5),
  },
  emptyTitle: {
    fontFamily: fonts.uiSemi,
    fontSize: 17,
    color: colors.chalk50,
  },
  emptyText: {
    fontFamily: fonts.ui,
    fontSize: 14,
    lineHeight: 21,
    color: colors.fgMuted,
    textAlign: 'center',
  },
});
