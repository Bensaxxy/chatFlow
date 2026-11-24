import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import UserAvatar from "@/components/common/user-avatar";
import { getApiErrorMessage } from "@/lib/api/errors";
import { createMobileDirectConversation } from "@/services/conversation.service";
import { searchMobileUsers } from "@/services/user.service";
import type { SearchUser } from "@/types/conversation";

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [openingUserId, setOpeningUserId] = useState<string | null>(null);

  const handleQueryChange = (value: string): void => {
    setQuery(value);
    setIsSearching(value.trim().length >= 2);
  };

  useEffect(() => {
    const trimmedQuery = query.trim();
    let isCurrent = true;
    const timeoutId = setTimeout(() => {
      if (trimmedQuery.length < 2) {
        setUsers([]);
        setIsSearching(false);
        return;
      }

      void searchMobileUsers(trimmedQuery)
        .then((result) => {
          if (isCurrent) {
            setUsers(result);
          }
        })
        .catch((error: unknown) => {
          if (isCurrent) {
            Alert.alert("Search failed", getApiErrorMessage(error));
          }
        })
        .finally(() => {
          if (isCurrent) {
            setIsSearching(false);
          }
        });
    }, trimmedQuery.length < 2 ? 0 : 300);

    return () => {
      isCurrent = false;
      clearTimeout(timeoutId);
    };
  }, [query]);

  const openConversation = async (person: SearchUser): Promise<void> => {
    if (openingUserId) {
      return;
    }

    try {
      setOpeningUserId(person._id);
      const conversation = await createMobileDirectConversation(person._id);
      router.replace({ pathname: "/chats/[conversationId]", params: { conversationId: conversation._id } });
    } catch (error) {
      Alert.alert("Could not start chat", getApiErrorMessage(error));
    } finally {
      setOpeningUserId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={10} accessibilityLabel="Back to chats">
          <Ionicons name="arrow-back" size={23} color="#0f172a" />
        </Pressable>
        <Text style={styles.title}>New chat</Text>
      </View>
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={20} color="#64748b" />
        <TextInput value={query} onChangeText={handleQueryChange} autoFocus placeholder="Search by name or email" placeholderTextColor="#64748b" autoCapitalize="none" autoCorrect={false} style={styles.searchInput} />
        {isSearching && <ActivityIndicator size="small" color="#0891b2" />}
      </View>
      <FlatList
        data={users}
        keyExtractor={(person) => person._id}
        contentContainerStyle={users.length === 0 ? styles.emptyList : styles.list}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable onPress={() => void openConversation(item)} disabled={openingUserId !== null} style={({ pressed }) => [styles.userRow, pressed && styles.userRowPressed]}>
            <UserAvatar name={item.name} avatarUrl={item.avatarUrl} size={50} />
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>
            </View>
            {openingUserId === item._id ? <ActivityIndicator size="small" color="#0891b2" /> : <Ionicons name="chatbubble-ellipses-outline" size={21} color="#0891b2" />}
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}><Ionicons name={query.trim().length >= 2 ? "people-outline" : "search-outline"} size={36} color="#0891b2" /></View>
            <Text style={styles.emptyTitle}>{query.trim().length >= 2 ? "No people found" : "Find people on ChatFlow"}</Text>
            <Text style={styles.emptyText}>{query.trim().length >= 2 ? "Try another name or email address." : "Type at least two characters to start searching."}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },
  header: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: "#e2e8f0", backgroundColor: "#ffffff" },
  backButton: { width: 38, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 20 },
  title: { color: "#0f172a", fontSize: 18, fontWeight: "900" },
  searchBox: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 10, margin: 16, paddingHorizontal: 14, borderRadius: 15, backgroundColor: "#e2e8f0" },
  searchInput: { flex: 1, paddingVertical: 10, color: "#0f172a", fontSize: 16 },
  list: { paddingBottom: 16 },
  emptyList: { flexGrow: 1 },
  userRow: { flexDirection: "row", alignItems: "center", gap: 13, paddingHorizontal: 18, paddingVertical: 12, backgroundColor: "#ffffff" },
  userRowPressed: { backgroundColor: "#f0fdfa" },
  userInfo: { flex: 1, minWidth: 0, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  userName: { color: "#0f172a", fontSize: 16, fontWeight: "800" },
  userEmail: { marginTop: 3, color: "#64748b", fontSize: 13 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 36 },
  emptyIcon: { width: 76, height: 76, alignItems: "center", justifyContent: "center", borderRadius: 25, backgroundColor: "#ecfeff" },
  emptyTitle: { marginTop: 18, color: "#0f172a", fontSize: 18, fontWeight: "900", textAlign: "center" },
  emptyText: { marginTop: 7, color: "#64748b", fontSize: 14, lineHeight: 21, textAlign: "center" },
});
