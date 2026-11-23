import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import UserAvatar from "@/components/common/user-avatar";
import { useAuth } from "@/contexts/auth-context";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  formatConversationTime,
  getConversationName,
  getConversationPeer,
} from "@/lib/chat/presentation";
import { getMobileConversations } from "@/services/conversation.service";
import type { Conversation } from "@/types/conversation";

export default function ChatsScreen() {
  const { user, logout } = useAuth();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(true);

  const loadConversations = useCallback(async (): Promise<void> => {
    try {
      setIsRefreshing(true);
      const nextConversations = await getMobileConversations();
      setConversations(nextConversations);
    } catch (error) {
      Alert.alert("Could not load chats", getApiErrorMessage(error));
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadConversations();
    }, [loadConversations]),
  );

  const handleLogout = async (): Promise<void> => {
    try {
      setIsLoggingOut(true);
      await logout();
    } catch (error) {
      Alert.alert("Logout failed", getApiErrorMessage(error));
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.push("/profile")}
          style={styles.profileButton}
          accessibilityRole="button"
          accessibilityLabel="Open profile"
        >
          <UserAvatar name={user?.name ?? "ChatFlow"} avatarUrl={user?.avatarUrl} size={42} />
          <View style={styles.userDetails}>
            <Text style={styles.appName}>ChatFlow</Text>
            <Text style={styles.email} numberOfLines={1}>{user?.name}</Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => router.push("/search")}
          style={styles.headerIcon}
          accessibilityRole="button"
          accessibilityLabel="Start a new conversation"
        >
          <Ionicons name="create-outline" size={22} color="#0e7490" />
        </Pressable>
        <Pressable
          onPress={() => {
            Alert.alert(
              "Log out",
              "Do you want to log out of ChatFlow on this device?",
              [
                {
                  text: "Cancel",
                  style: "cancel",
                },
                {
                  text: "Log out",
                  style: "destructive",
                  onPress: () => void handleLogout(),
                },
              ],
            );
          }}
          disabled={isLoggingOut}
          style={styles.headerIcon}
          accessibilityRole="button"
          accessibilityLabel="Log out"
        >
          <Ionicons name="log-out-outline" size={22} color="#ef4444" />
        </Pressable>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(conversation) => conversation._id}
        contentContainerStyle={conversations.length === 0 ? styles.emptyList : styles.list}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadConversations()} tintColor="#0891b2" />}
        renderItem={({ item }) => {
          const peer = user ? getConversationPeer(item, user._id) : null;
          const name = user ? getConversationName(item, user._id) : "Chat";
          const preview = item.lastMessage?.deletedForEveryoneAt
            ? "This message was deleted"
            : item.lastMessage?.content || (item.lastMessage ? "Sent an attachment" : "Start your conversation");

          return (
            <Pressable
              onPress={() => router.push({ pathname: "/chats/[conversationId]", params: { conversationId: item._id } })}
              style={({ pressed }) => [styles.conversation, pressed && styles.conversationPressed]}
            >
              <UserAvatar name={name} avatarUrl={item.avatarUrl ?? peer?.avatarUrl} size={54} />
              <View style={styles.conversationBody}>
                <View style={styles.conversationTopLine}>
                  <Text style={styles.conversationName} numberOfLines={1}>{name}</Text>
                  <Text style={styles.conversationTime}>{formatConversationTime(item.lastMessage?.createdAt ?? item.updatedAt)}</Text>
                </View>
                <View style={styles.conversationBottomLine}>
                  <Text style={styles.preview} numberOfLines={1}>{preview}</Text>
                  {!!item.unreadCount && <View style={styles.unreadBadge}><Text style={styles.unreadText}>{item.unreadCount > 99 ? "99+" : item.unreadCount}</Text></View>}
                </View>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          !isRefreshing ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}><Ionicons name="chatbubbles-outline" size={42} color="#0891b2" /></View>
              <Text style={styles.emptyTitle}>Your chats will appear here</Text>
              <Text style={styles.emptyDescription}>Find someone on ChatFlow to start a conversation.</Text>
              <Pressable onPress={() => router.push("/search")} style={styles.newChatButton}>
                <Ionicons name="add" size={20} color="#ffffff" />
                <Text style={styles.newChatText}>New chat</Text>
              </Pressable>
            </View>
          ) : undefined
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },

  header: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },

  profileButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  userDetails: {
    flex: 1,
  },

  appName: {
    color: "#0f172a",
    fontSize: 17,
    fontWeight: "800",
  },

  email: {
    marginTop: 2,
    color: "#64748b",
    fontSize: 12,
  },

  headerIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
    backgroundColor: "#f1f5f9",
  },

  list: {
    paddingVertical: 8,
  },

  emptyList: {
    flexGrow: 1,
  },

  conversation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    paddingHorizontal: 18,
    paddingVertical: 13,
    backgroundColor: "#ffffff",
  },

  conversationPressed: {
    backgroundColor: "#f0fdfa",
  },

  conversationBody: {
    flex: 1,
    minWidth: 0,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },

  conversationTopLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  conversationName: {
    flex: 1,
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "800",
  },

  conversationTime: {
    color: "#64748b",
    fontSize: 12,
  },

  conversationBottomLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 5,
  },

  preview: {
    flex: 1,
    color: "#64748b",
    fontSize: 13,
  },

  unreadBadge: {
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: "#0891b2",
  },

  unreadText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "900",
  },

  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },

  emptyIcon: {
    width: 84,
    height: 84,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 28,
    backgroundColor: "#ecfeff",
  },

  emptyTitle: {
    marginTop: 22,
    color: "#0f172a",
    fontSize: 21,
    fontWeight: "900",
    textAlign: "center",
  },

  emptyDescription: {
    marginTop: 8,
    color: "#64748b",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },

  newChatButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 22,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: "#0891b2",
  },

  newChatText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
});
