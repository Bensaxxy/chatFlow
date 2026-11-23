import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import UserAvatar from "@/components/common/user-avatar";
import { useAuth } from "@/contexts/auth-context";
import { getApiErrorMessage } from "@/lib/api/errors";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!user) {
    return null;
  }

  const handleLogout = async (): Promise<void> => {
    try {
      setIsLoggingOut(true);
      await logout();
      router.replace("/login");
    } catch (error) {
      Alert.alert("Logout failed", getApiErrorMessage(error));
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={10}
          accessibilityLabel="Back to chats"
        >
          <Ionicons name="arrow-back" size={23} color="#0f172a" />
        </Pressable>
        <Text style={styles.title}>Profile</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size={94} />
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.email}>{user.email}</Text>
          {!!user.bio && <Text style={styles.bio}>{user.bio}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="mail-outline" size={20} color="#0e7490" />
            </View>
            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>Email address</Text>
              <Text style={styles.detailValue}>{user.email}</Text>
            </View>
            {user.isEmailVerified && (
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            )}
          </View>
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="calendar-outline" size={20} color="#0e7490" />
            </View>
            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>Member since</Text>
              <Text style={styles.detailValue}>
                {new Date(user.createdAt).toLocaleDateString([], {
                  month: "long",
                  year: "numeric",
                })}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.notice}>
          <Ionicons name="phone-portrait-outline" size={21} color="#0e7490" />
          <Text style={styles.noticeText}>
            Profile editing and privacy controls remain available in ChatFlow on
            the web while the mobile settings experience is expanded.
          </Text>
        </View>

        <Pressable
          onPress={() =>
            Alert.alert(
              "Log out",
              "Do you want to log out of ChatFlow on this device?",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Log out",
                  style: "destructive",
                  onPress: () => void handleLogout(),
                },
              ],
            )
          }
          disabled={isLoggingOut}
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.pressed,
            isLoggingOut && styles.disabled,
          ]}
        >
          <Ionicons name="log-out-outline" size={21} color="#dc2626" />
          <Text style={styles.logoutText}>
            {isLoggingOut ? "Logging out…" : "Log out"}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },
  backButton: {
    width: 38,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  title: { color: "#0f172a", fontSize: 18, fontWeight: "900" },
  content: { padding: 18, paddingBottom: 36 },
  hero: {
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 28,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: "#ffffff",
  },
  name: {
    marginTop: 16,
    color: "#0f172a",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },
  email: { marginTop: 5, color: "#64748b", fontSize: 14, textAlign: "center" },
  bio: {
    marginTop: 14,
    color: "#334155",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  section: {
    marginTop: 18,
    overflow: "hidden",
    borderRadius: 20,
    backgroundColor: "#ffffff",
  },
  sectionTitle: {
    paddingHorizontal: 18,
    paddingTop: 17,
    paddingBottom: 9,
    color: "#64748b",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  detailIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: "#ecfeff",
  },
  detailText: { flex: 1, minWidth: 0 },
  detailLabel: { color: "#64748b", fontSize: 12 },
  detailValue: {
    marginTop: 2,
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "700",
  },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 18,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#ecfeff",
  },
  noticeText: { flex: 1, color: "#155e75", fontSize: 13, lineHeight: 19 },
  logoutButton: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    marginTop: 22,
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 16,
    backgroundColor: "#fff1f2",
  },
  logoutText: { color: "#dc2626", fontSize: 15, fontWeight: "800" },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.55 },
});
