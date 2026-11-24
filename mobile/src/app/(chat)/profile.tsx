import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import UserAvatar from "@/components/common/user-avatar";
import AppTabBar from "@/components/common/app-tab-bar";
import { useAuth } from "@/contexts/auth-context";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  removeMobileAvatar,
  updateMobileNotificationSettings,
  updateMobilePrivacySettings,
  updateMobileProfile,
  uploadMobileAvatar,
} from "@/services/profile.service";
import type { NotificationSound } from "@/types/settings";

export default function ProfileScreen() {
  const { user, logout, updateCurrentUser } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const [updatingPreference, setUpdatingPreference] = useState<string | null>(null);

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

  const handleSaveProfile = async (): Promise<void> => {
    const nextName = name.trim();
    const nextBio = bio.trim();

    if (nextName.length < 2) {
      Alert.alert("Name needed", "Enter at least two characters for your name.");
      return;
    }

    try {
      setIsSaving(true);
      const updatedUser = await updateMobileProfile({
        name: nextName,
        bio: nextBio,
      });
      updateCurrentUser(updatedUser);
      setIsEditing(false);
    } catch (error) {
      Alert.alert("Could not update profile", getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectAvatar = async (): Promise<void> => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Photo access", "Allow photo access to update your profile picture.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.9,
        allowsEditing: true,
        aspect: [1, 1],
      });
      if (result.canceled) {
        return;
      }

      const image = result.assets[0];
      if (!image) {
        return;
      }

      setIsUpdatingAvatar(true);
      const updatedUser = await uploadMobileAvatar({
        uri: image.uri,
        fileName: image.fileName ?? `avatar-${Date.now()}.jpg`,
        mimeType: image.mimeType ?? "image/jpeg",
      });
      updateCurrentUser(updatedUser);
    } catch (error) {
      Alert.alert("Could not update photo", getApiErrorMessage(error));
    } finally {
      setIsUpdatingAvatar(false);
    }
  };

  const handleRemoveAvatar = (): void => {
    Alert.alert("Remove profile picture?", "Your profile picture will be removed from ChatFlow.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          void removeMobileAvatar()
            .then(updateCurrentUser)
            .catch((error: unknown) => {
              Alert.alert("Could not remove photo", getApiErrorMessage(error));
            });
        },
      },
    ]);
  };

  const updatePrivacy = async (
    field: "profilePhotoVisibility" | "lastSeenVisibility" | "readReceipts",
    value: "everyone" | "nobody" | boolean,
  ): Promise<void> => {
    try {
      setUpdatingPreference(field);
      const updatedUser = await updateMobilePrivacySettings({
        ...user.privacySettings,
        [field]: value,
      });
      updateCurrentUser(updatedUser);
    } catch (error) {
      Alert.alert("Could not update privacy", getApiErrorMessage(error));
    } finally {
      setUpdatingPreference(null);
    }
  };

  const updateNotifications = async (
    field: "emailNotifications" | "vibration" | "messageSound",
    value: boolean | NotificationSound,
  ): Promise<void> => {
    try {
      setUpdatingPreference(field);
      const updatedUser = await updateMobileNotificationSettings({
        ...user.notificationSettings,
        [field]: value,
      });
      updateCurrentUser(updatedUser);
    } catch (error) {
      Alert.alert("Could not update alerts", getApiErrorMessage(error));
    } finally {
      setUpdatingPreference(null);
    }
  };

  const chooseMessageSound = (): void => {
    const sounds: NotificationSound[] = ["chime", "pulse", "pop", "none"];

    Alert.alert(
      "Message sound",
      "Choose the alert sound for incoming messages.",
      [
        ...sounds.map((sound) => ({
          text: sound === "none" ? "No sound" : sound[0].toUpperCase() + sound.slice(1),
          onPress: () => void updateNotifications("messageSound", sound),
        })),
        { text: "Cancel", style: "cancel" as const },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Pressable onPress={() => void handleSelectAvatar()} disabled={isUpdatingAvatar} style={styles.avatarButton} accessibilityLabel="Change profile picture">
            <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size={94} />
            <View style={styles.avatarEditBadge}>{isUpdatingAvatar ? <ActivityIndicator size="small" color="#ffffff" /> : <Ionicons name="camera" size={15} color="#ffffff" />}</View>
          </Pressable>
          {isEditing ? <TextInput value={name} onChangeText={setName} maxLength={60} style={styles.nameInput} placeholder="Your name" /> : <Text style={styles.name}>{user.name}</Text>}
          <Text style={styles.email}>{user.email}</Text>
          {isEditing ? <TextInput value={bio} onChangeText={setBio} maxLength={160} multiline placeholder="Add a short bio" placeholderTextColor="#64748b" style={styles.bioInput} textAlign="center" /> : !!user.bio && <Text style={styles.bio}>{user.bio}</Text>}
          {isEditing ? (
            <View style={styles.editActions}>
              <Pressable onPress={() => { setName(user.name); setBio(user.bio); setIsEditing(false); }} disabled={isSaving} style={styles.cancelEditButton}><Text style={styles.cancelEditText}>Cancel</Text></Pressable>
              <Pressable onPress={() => void handleSaveProfile()} disabled={isSaving} style={styles.saveEditButton}>{isSaving ? <ActivityIndicator size="small" color="#ffffff" /> : <Text style={styles.saveEditText}>Save</Text>}</Pressable>
            </View>
          ) : <View style={styles.profileActions}>
            <Pressable onPress={() => setIsEditing(true)} style={styles.editProfileButton}><Ionicons name="create-outline" size={17} color="#0e7490" /><Text style={styles.editProfileText}>Edit profile</Text></Pressable>
            {user.avatarUrl && <Pressable onPress={handleRemoveAvatar} style={styles.removePhotoButton}><Ionicons name="trash-outline" size={17} color="#dc2626" /></Pressable>}
          </View>}
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          <View style={styles.settingRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="image-outline" size={20} color="#0e7490" />
            </View>
            <View style={styles.detailText}>
              <Text style={styles.detailValue}>Profile photo</Text>
              <Text style={styles.detailLabel}>Show it to people you chat with</Text>
            </View>
            <Switch
              value={user.privacySettings.profilePhotoVisibility === "everyone"}
              disabled={updatingPreference === "profilePhotoVisibility"}
              onValueChange={(value) => void updatePrivacy("profilePhotoVisibility", value ? "everyone" : "nobody")}
              trackColor={{ false: "#cbd5e1", true: "#67e8f9" }}
              thumbColor={user.privacySettings.profilePhotoVisibility === "everyone" ? "#0891b2" : "#f8fafc"}
            />
          </View>
          <View style={styles.settingRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="time-outline" size={20} color="#0e7490" />
            </View>
            <View style={styles.detailText}>
              <Text style={styles.detailValue}>Last seen and online</Text>
              <Text style={styles.detailLabel}>Let people see when you are active</Text>
            </View>
            <Switch
              value={user.privacySettings.lastSeenVisibility === "everyone"}
              disabled={updatingPreference === "lastSeenVisibility"}
              onValueChange={(value) => void updatePrivacy("lastSeenVisibility", value ? "everyone" : "nobody")}
              trackColor={{ false: "#cbd5e1", true: "#67e8f9" }}
              thumbColor={user.privacySettings.lastSeenVisibility === "everyone" ? "#0891b2" : "#f8fafc"}
            />
          </View>
          <View style={styles.settingRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="checkmark-done-outline" size={20} color="#0e7490" />
            </View>
            <View style={styles.detailText}>
              <Text style={styles.detailValue}>Read receipts</Text>
              <Text style={styles.detailLabel}>Show when messages have been read</Text>
            </View>
            <Switch
              value={user.privacySettings.readReceipts}
              disabled={updatingPreference === "readReceipts"}
              onValueChange={(value) => void updatePrivacy("readReceipts", value)}
              trackColor={{ false: "#cbd5e1", true: "#67e8f9" }}
              thumbColor={user.privacySettings.readReceipts ? "#0891b2" : "#f8fafc"}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Message alerts</Text>
          <Pressable onPress={chooseMessageSound} disabled={updatingPreference === "messageSound"} style={styles.settingRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="volume-high-outline" size={20} color="#0e7490" />
            </View>
            <View style={styles.detailText}>
              <Text style={styles.detailValue}>Alert sound</Text>
              <Text style={styles.detailLabel}>{user.notificationSettings.messageSound === "none" ? "No sound" : user.notificationSettings.messageSound[0].toUpperCase() + user.notificationSettings.messageSound.slice(1)}</Text>
            </View>
            {updatingPreference === "messageSound" ? <ActivityIndicator size="small" color="#0891b2" /> : <Ionicons name="chevron-forward" size={20} color="#94a3b8" />}
          </Pressable>
          <View style={styles.settingRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="mail-outline" size={20} color="#0e7490" />
            </View>
            <View style={styles.detailText}>
              <Text style={styles.detailValue}>Email notifications</Text>
              <Text style={styles.detailLabel}>Receive important alerts by email</Text>
            </View>
            <Switch
              value={user.notificationSettings.emailNotifications}
              disabled={updatingPreference === "emailNotifications"}
              onValueChange={(value) => void updateNotifications("emailNotifications", value)}
              trackColor={{ false: "#cbd5e1", true: "#67e8f9" }}
              thumbColor={user.notificationSettings.emailNotifications ? "#0891b2" : "#f8fafc"}
            />
          </View>
          <View style={styles.settingRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="phone-portrait-outline" size={20} color="#0e7490" />
            </View>
            <View style={styles.detailText}>
              <Text style={styles.detailValue}>Vibration</Text>
              <Text style={styles.detailLabel}>Vibrate for incoming messages</Text>
            </View>
            <Switch
              value={user.notificationSettings.vibration}
              disabled={updatingPreference === "vibration"}
              onValueChange={(value) => void updateNotifications("vibration", value)}
              trackColor={{ false: "#cbd5e1", true: "#67e8f9" }}
              thumbColor={user.notificationSettings.vibration ? "#0891b2" : "#f8fafc"}
            />
          </View>
        </View>

        <View style={styles.notice}>
          <Ionicons name="phone-portrait-outline" size={21} color="#0e7490" />
          <Text style={styles.noticeText}>
            Profile changes sync immediately across ChatFlow. Your existing
            privacy, appearance and notification preferences are preserved here.
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

      <AppTabBar activeTab="profile" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#ffffff",
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
  avatarButton: { position: "relative" },
  avatarEditBadge: { position: "absolute", right: -2, bottom: -2, width: 30, height: 30, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#ffffff", borderRadius: 15, backgroundColor: "#0891b2" },
  name: {
    marginTop: 16,
    color: "#0f172a",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },
  nameInput: { width: "100%", marginTop: 16, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: "#67e8f9", borderRadius: 12, color: "#0f172a", fontSize: 20, fontWeight: "900", textAlign: "center" },
  email: { marginTop: 5, color: "#64748b", fontSize: 14, textAlign: "center" },
  bio: {
    marginTop: 14,
    color: "#334155",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  bioInput: { width: "100%", minHeight: 58, marginTop: 14, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: "#bae6fd", borderRadius: 12, color: "#334155", fontSize: 14, lineHeight: 21 },
  profileActions: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 16 },
  editProfileButton: { minHeight: 38, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, borderRadius: 12, backgroundColor: "#ecfeff" },
  editProfileText: { color: "#0e7490", fontSize: 13, fontWeight: "800" },
  removePhotoButton: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "#fff1f2" },
  editActions: { flexDirection: "row", gap: 8, marginTop: 14 },
  cancelEditButton: { minHeight: 40, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, borderRadius: 12, backgroundColor: "#f1f5f9" },
  cancelEditText: { color: "#475569", fontSize: 13, fontWeight: "800" },
  saveEditButton: { minWidth: 76, minHeight: 40, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, borderRadius: 12, backgroundColor: "#0891b2" },
  saveEditText: { color: "#ffffff", fontSize: 13, fontWeight: "900" },
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
  settingRow: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
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
