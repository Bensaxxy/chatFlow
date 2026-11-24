import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AppTabBar from "@/components/common/app-tab-bar";
import UserAvatar from "@/components/common/user-avatar";
import { useSocket } from "@/contexts/socket-context";
import { getApiErrorMessage } from "@/lib/api/errors";
import { createMobileDirectConversation } from "@/services/conversation.service";
import {
  acceptMobileFriendRequest,
  cancelMobileFriendRequest,
  declineMobileFriendRequest,
  getMobileFriendRequests,
  getMobileFriends,
  getMobileFriendSuggestions,
  removeMobileFriend,
  sendMobileFriendRequest,
} from "@/services/friend.service";
import type { FriendUser, FriendshipView } from "@/types/friend";

type FriendsTab = "discover" | "friends" | "requests";

export default function FriendsScreen() {
  const { socket } = useSocket();

  const [activeTab, setActiveTab] = useState<FriendsTab>("discover");
  const [suggestions, setSuggestions] = useState<FriendUser[]>([]);
  const [friends, setFriends] = useState<FriendshipView[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendshipView[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendshipView[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [operationId, setOperationId] = useState<string | null>(null);

  const loadActiveTab = useCallback(async (silently = false): Promise<void> => {
    try {
      if (!silently) {
        setIsRefreshing(true);
      }

      if (activeTab === "discover") {
        const result = await getMobileFriendSuggestions();
        setSuggestions(result.users);
      } else if (activeTab === "friends") {
        const result = await getMobileFriends();
        setFriends(result.friends);
      } else {
        const [incoming, outgoing] = await Promise.all([
          getMobileFriendRequests({ direction: "incoming" }),
          getMobileFriendRequests({ direction: "outgoing" }),
        ]);
        setIncomingRequests(incoming.requests);
        setOutgoingRequests(outgoing.requests);
      }
    } catch (error) {
      Alert.alert("Could not load friends", getApiErrorMessage(error));
    } finally {
      if (!silently) {
        setIsRefreshing(false);
      }
    }
  }, [activeTab]);

  useFocusEffect(
    useCallback(() => {
      void loadActiveTab();
    }, [loadActiveTab]),
  );

  useEffect(() => {
    const refresh = (): void => {
      void loadActiveTab(true);
    };

    socket.on("friendship:changed", refresh);

    return () => {
      socket.off("friendship:changed", refresh);
    };
  }, [loadActiveTab, socket]);

  const startConversation = async (userId: string): Promise<void> => {
    try {
      setOperationId(`message:${userId}`);
      const conversation = await createMobileDirectConversation(userId);
      router.push({
        pathname: "/chats/[conversationId]",
        params: { conversationId: conversation._id },
      });
    } catch (error) {
      Alert.alert("Could not start chat", getApiErrorMessage(error));
    } finally {
      setOperationId(null);
    }
  };

  const sendRequest = async (person: FriendUser): Promise<void> => {
    try {
      setOperationId(`send:${person._id}`);
      await sendMobileFriendRequest(person._id);
      setSuggestions((current) => current.filter((user) => user._id !== person._id));
    } catch (error) {
      Alert.alert("Could not send request", getApiErrorMessage(error));
    } finally {
      setOperationId(null);
    }
  };

  const acceptRequest = async (request: FriendshipView): Promise<void> => {
    try {
      setOperationId(`accept:${request.friendshipId}`);
      const friendship = await acceptMobileFriendRequest(request.friendshipId);
      setIncomingRequests((current) =>
        current.filter((item) => item.friendshipId !== request.friendshipId),
      );
      setFriends((current) => [
        friendship,
        ...current.filter((item) => item.friendshipId !== friendship.friendshipId),
      ]);
    } catch (error) {
      Alert.alert("Could not accept request", getApiErrorMessage(error));
    } finally {
      setOperationId(null);
    }
  };

  const declineRequest = async (request: FriendshipView): Promise<void> => {
    try {
      setOperationId(`decline:${request.friendshipId}`);
      await declineMobileFriendRequest(request.friendshipId);
      setIncomingRequests((current) =>
        current.filter((item) => item.friendshipId !== request.friendshipId),
      );
    } catch (error) {
      Alert.alert("Could not decline request", getApiErrorMessage(error));
    } finally {
      setOperationId(null);
    }
  };

  const cancelRequest = async (request: FriendshipView): Promise<void> => {
    try {
      setOperationId(`cancel:${request.friendshipId}`);
      await cancelMobileFriendRequest(request.friendshipId);
      setOutgoingRequests((current) =>
        current.filter((item) => item.friendshipId !== request.friendshipId),
      );
    } catch (error) {
      Alert.alert("Could not cancel request", getApiErrorMessage(error));
    } finally {
      setOperationId(null);
    }
  };

  const removeFriend = (friendship: FriendshipView): void => {
    Alert.alert(
      `Remove ${friendship.user.name}?`,
      "You can send a new friend request later.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                setOperationId(`remove:${friendship.friendshipId}`);
                await removeMobileFriend(friendship.friendshipId);
                setFriends((current) =>
                  current.filter((item) => item.friendshipId !== friendship.friendshipId),
                );
              } catch (error) {
                Alert.alert("Could not remove friend", getApiErrorMessage(error));
              } finally {
                setOperationId(null);
              }
            })();
          },
        },
      ],
    );
  };

  const renderPerson = (
    person: FriendUser,
    actions: ReactNode,
    key: string,
  ) => (
    <View key={key} style={styles.personRow}>
      <UserAvatar name={person.name} avatarUrl={person.avatarUrl} size={50} />
      <View style={styles.personCopy}>
        <Text style={styles.personName} numberOfLines={1}>{person.name}</Text>
        <Text style={styles.personBio} numberOfLines={1}>{person.bio || "ChatFlow member"}</Text>
      </View>
      <View style={styles.rowActions}>{actions}</View>
    </View>
  );

  const iconButton = (
    label: string,
    icon: import("react").ComponentProps<typeof Ionicons>["name"],
    onPress: () => void,
    disabled = false,
    variant: "accent" | "neutral" | "danger" = "accent",
  ) => (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.iconButton, styles[`iconButton${variant[0].toUpperCase()}${variant.slice(1)}` as "iconButtonAccent"], pressed && styles.pressed, disabled && styles.disabled]}
    >
      {disabled ? <ActivityIndicator size="small" color={variant === "accent" ? "#0e7490" : "#64748b"} /> : <Ionicons name={icon} size={19} color={variant === "danger" ? "#dc2626" : variant === "neutral" ? "#475569" : "#0e7490"} />}
    </Pressable>
  );

  const content = (() => {
    if (activeTab === "discover") {
      return suggestions.map((person) =>
        renderPerson(
          person,
          <>
            {iconButton("Send friend request", "person-add-outline", () => void sendRequest(person), operationId === `send:${person._id}`)}
            {iconButton("Message", "chatbubble-ellipses-outline", () => void startConversation(person._id), operationId === `message:${person._id}`, "neutral")}
          </>,
          person._id,
        ),
      );
    }

    if (activeTab === "friends") {
      return friends.map((friendship) =>
        renderPerson(
          friendship.user,
          <>
            {iconButton("Message", "chatbubble-ellipses-outline", () => void startConversation(friendship.user._id), operationId === `message:${friendship.user._id}`, "accent")}
            {iconButton("Remove friend", "person-remove-outline", () => removeFriend(friendship), operationId === `remove:${friendship.friendshipId}`, "danger")}
          </>,
          friendship.friendshipId,
        ),
      );
    }

    return [
      ...(incomingRequests.length > 0
        ? [
            <View key="incoming-requests">
          <Text style={styles.requestHeading}>Incoming</Text>
              {incomingRequests.map((request) =>
                renderPerson(
                  request.user,
                  <>
                    {iconButton("Accept request", "checkmark", () => void acceptRequest(request), operationId === `accept:${request.friendshipId}`)}
                    {iconButton("Decline request", "close", () => void declineRequest(request), operationId === `decline:${request.friendshipId}`, "danger")}
                  </>,
                  `incoming-${request.friendshipId}`,
                ),
              )}
            </View>,
          ]
        : []),
      ...(outgoingRequests.length > 0
        ? [
            <View key="outgoing-requests">
          <Text style={styles.requestHeading}>Sent</Text>
              {outgoingRequests.map((request) =>
                renderPerson(
                  request.user,
                  <>
                    {iconButton("Message", "chatbubble-ellipses-outline", () => void startConversation(request.user._id), operationId === `message:${request.user._id}`, "neutral")}
                    {iconButton("Cancel request", "close", () => void cancelRequest(request), operationId === `cancel:${request.friendshipId}`, "danger")}
                  </>,
                  `outgoing-${request.friendshipId}`,
                ),
              )}
            </View>,
          ]
        : []),
    ];
  })();

  const emptyTitle = activeTab === "discover" ? "No suggestions right now" : activeTab === "friends" ? "No friends yet" : "No friend requests";
  const emptyText = activeTab === "discover" ? "New ChatFlow members will appear here." : activeTab === "friends" ? "Discover people and send a friend request." : "Incoming and sent requests will appear here.";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Friends</Text>
          <Text style={styles.subtitle}>Discover, connect, and keep in touch</Text>
        </View>
        <View style={styles.headerIcon}><Ionicons name="people" size={23} color="#0e7490" /></View>
      </View>

      <View style={styles.tabs}>
        {(["discover", "friends", "requests"] as const).map((tab) => (
          <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.tab, activeTab === tab && styles.tabActive]}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab[0].toUpperCase() + tab.slice(1)}</Text>
            {tab === "requests" && incomingRequests.length > 0 && <View style={styles.requestBadge}><Text style={styles.requestBadgeText}>{incomingRequests.length}</Text></View>}
          </Pressable>
        ))}
      </View>

      <FlatList
        data={content}
        keyExtractor={(_, index) => String(index)}
        renderItem={({ item }) => item}
        contentContainerStyle={content.length === 0 ? styles.emptyList : styles.list}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadActiveTab()} tintColor="#0891b2" />}
        ListEmptyComponent={
          !isRefreshing ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}><Ionicons name={activeTab === "friends" ? "people-outline" : "person-add-outline"} size={40} color="#0e7490" /></View>
              <Text style={styles.emptyTitle}>{emptyTitle}</Text>
              <Text style={styles.emptyText}>{emptyText}</Text>
            </View>
          ) : undefined
        }
      />

      <AppTabBar activeTab="friends" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },
  header: { minHeight: 78, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: "#e2e8f0", backgroundColor: "#ffffff" },
  title: { color: "#0f172a", fontSize: 24, fontWeight: "900" },
  subtitle: { marginTop: 3, color: "#64748b", fontSize: 12 },
  headerIcon: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 15, backgroundColor: "#ecfeff" },
  tabs: { flexDirection: "row", paddingHorizontal: 14, paddingTop: 10, borderBottomWidth: 1, borderBottomColor: "#e2e8f0", backgroundColor: "#ffffff" },
  tab: { flex: 1, minHeight: 43, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: "#0891b2" },
  tabText: { color: "#64748b", fontSize: 13, fontWeight: "800" },
  tabTextActive: { color: "#0e7490" },
  requestBadge: { minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 4, borderRadius: 9, backgroundColor: "#e11d48" },
  requestBadgeText: { color: "#ffffff", fontSize: 10, fontWeight: "900" },
  list: { paddingVertical: 8 },
  emptyList: { flexGrow: 1 },
  personRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 12, backgroundColor: "#ffffff" },
  personCopy: { flex: 1, minWidth: 0, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  personName: { color: "#0f172a", fontSize: 16, fontWeight: "800" },
  personBio: { marginTop: 3, color: "#64748b", fontSize: 13 },
  rowActions: { flexDirection: "row", alignItems: "center", gap: 5 },
  iconButton: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 19 },
  iconButtonAccent: { backgroundColor: "#ecfeff" },
  iconButtonNeutral: { backgroundColor: "#f1f5f9" },
  iconButtonDanger: { backgroundColor: "#fff1f2" },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.55 },
  requestHeading: { paddingHorizontal: 18, paddingVertical: 8, color: "#64748b", fontSize: 11, fontWeight: "900", letterSpacing: 0.8, textTransform: "uppercase" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 34 },
  emptyIcon: { width: 84, height: 84, alignItems: "center", justifyContent: "center", borderRadius: 28, backgroundColor: "#ecfeff" },
  emptyTitle: { marginTop: 20, color: "#0f172a", fontSize: 20, fontWeight: "900" },
  emptyText: { marginTop: 8, color: "#64748b", fontSize: 14, lineHeight: 21, textAlign: "center" },
});
