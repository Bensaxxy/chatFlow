import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";

import AppTabBar from "@/components/common/app-tab-bar";
import UserAvatar from "@/components/common/user-avatar";
import { useAuth } from "@/contexts/auth-context";
import { useSocket } from "@/contexts/socket-context";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  createMobilePhotoStatus,
  createMobileTextStatus,
  deleteMobileStatus,
  getMobileStatuses,
  reactToMobileStatus,
  viewMobileStatus,
} from "@/services/status.service";
import type { ChatStatus, StatusBackground, StatusGroup, StatusReactionEmoji } from "@/types/status";

const STATUS_REACTIONS: StatusReactionEmoji[] = ["❤️", "😂", "😮", "😢", "🔥", "👏"];

const statusBackgrounds: Record<StatusBackground, string> = {
  slate: "#0f172a",
  cyan: "#0891b2",
  violet: "#7c3aed",
  emerald: "#059669",
  rose: "#e11d48",
  amber: "#fbbf24",
};

const formatStatusTime = (value: string): string => {
  const date = new Date(value);
  const now = new Date();

  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

const statusPreview = (status: ChatStatus): string =>
  status.type === "photo" ? status.text || "Photo update" : status.text;

const upsertStatus = (
  statuses: ChatStatus[],
  nextStatus: ChatStatus,
): ChatStatus[] => {
  const currentIndex = statuses.findIndex((status) => status._id === nextStatus._id);

  if (currentIndex < 0) {
    return [nextStatus, ...statuses];
  }

  return statuses.map((status, index) =>
    index === currentIndex ? nextStatus : status,
  );
};

export default function StatusScreen() {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [statuses, setStatuses] = useState<ChatStatus[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerText, setComposerText] = useState("");
  const [composerBackground, setComposerBackground] = useState<StatusBackground>("cyan");
  const [selectedPhoto, setSelectedPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [viewerGroup, setViewerGroup] = useState<StatusGroup | null>(null);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [isUpdatingReaction, setIsUpdatingReaction] = useState(false);

  const loadStatuses = useCallback(async (silently = false): Promise<void> => {
    try {
      if (!silently) {
        setIsRefreshing(true);
      }

      setStatuses(await getMobileStatuses());
    } catch (error) {
      Alert.alert("Could not load status", getApiErrorMessage(error));
    } finally {
      if (!silently) {
        setIsRefreshing(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadStatuses();
    }, [loadStatuses]),
  );

  useEffect(() => {
    const refreshStatuses = (): void => {
      void loadStatuses(true);
    };

    socket.on("status:new", refreshStatuses);
    socket.on("status:deleted", refreshStatuses);

    return () => {
      socket.off("status:new", refreshStatuses);
      socket.off("status:deleted", refreshStatuses);
    };
  }, [loadStatuses, socket]);

  const groups = useMemo<StatusGroup[]>(() => {
    const byAuthor = new Map<string, StatusGroup>();

    [...statuses]
      .sort((first, second) =>
        new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
      )
      .forEach((status) => {
        const existing = byAuthor.get(status.author._id);

        if (existing) {
          existing.statuses.push(status);
          existing.hasUnviewedStatuses ||= !status.viewerHasViewed;
          return;
        }

        byAuthor.set(status.author._id, {
          author: status.author,
          statuses: [status],
          hasUnviewedStatuses: !status.viewerHasViewed,
          latestStatusCreatedAt: status.createdAt,
          isCurrentUser: status.author._id === user?._id,
        });
      });

    return [...byAuthor.values()].sort((first, second) => {
      if (first.isCurrentUser !== second.isCurrentUser) {
        return first.isCurrentUser ? -1 : 1;
      }

      return new Date(second.latestStatusCreatedAt).getTime() - new Date(first.latestStatusCreatedAt).getTime();
    });
  }, [statuses, user?._id]);

  const activeStatus = viewerGroup?.statuses[viewerIndex] ?? null;
  const isViewingOwnStatus = activeStatus?.author._id === user?._id;

  const replaceStatus = useCallback((nextStatus: ChatStatus): void => {
    setStatuses((current) => upsertStatus(current, nextStatus));
    setViewerGroup((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        statuses: current.statuses.map((status) =>
          status._id === nextStatus._id ? nextStatus : status,
        ),
      };
    });
  }, []);

  const openStatusGroup = (group: StatusGroup): void => {
    const firstUnviewedIndex = group.statuses.findIndex(
      (status) => !status.viewerHasViewed,
    );
    const nextIndex = firstUnviewedIndex >= 0 ? firstUnviewedIndex : 0;
    const status = group.statuses[nextIndex];

    setViewerGroup(group);
    setViewerIndex(nextIndex);

    if (status && status.author._id !== user?._id && !status.viewerHasViewed) {
      void viewMobileStatus(status._id)
        .then(replaceStatus)
        .catch(() => undefined);
    }
  };

  const moveStatus = (direction: -1 | 1): void => {
    if (!viewerGroup) {
      return;
    }

    const nextIndex = viewerIndex + direction;

    if (nextIndex >= 0 && nextIndex < viewerGroup.statuses.length) {
      setViewerIndex(nextIndex);
      const status = viewerGroup.statuses[nextIndex];

      if (status && status.author._id !== user?._id && !status.viewerHasViewed) {
        void viewMobileStatus(status._id)
          .then(replaceStatus)
          .catch(() => undefined);
      }
    }
  };

  const handlePickPhoto = async (): Promise<void> => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert("Photo access", "Allow photo access to share a photo status.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.9,
      });

      if (!result.canceled && result.assets[0]) {
        const photo = result.assets[0];
        const supportedMimeTypes = ["image/jpeg", "image/png", "image/webp"];

        if (photo.mimeType && !supportedMimeTypes.includes(photo.mimeType)) {
          Alert.alert(
            "Choose a different photo",
            "Status photos must be JPG, PNG, or WebP images.",
          );
          return;
        }

        setSelectedPhoto(photo);
      }
    } catch (error) {
      Alert.alert("Could not select photo", getApiErrorMessage(error));
    }
  };

  const closeComposer = (): void => {
    if (isPublishing) {
      return;
    }

    setIsComposerOpen(false);
    setComposerText("");
    setSelectedPhoto(null);
    setComposerBackground("cyan");
  };

  const publishStatus = async (): Promise<void> => {
    const text = composerText.trim();

    if (!selectedPhoto && !text) {
      Alert.alert("Write an update", "Add text or choose a photo for your status.");
      return;
    }

    try {
      setIsPublishing(true);
      const createdStatus = selectedPhoto
        ? await createMobilePhotoStatus({
            uri: selectedPhoto.uri,
            fileName: selectedPhoto.fileName ?? `status-${Date.now()}.jpg`,
            mimeType: selectedPhoto.mimeType ?? "image/jpeg",
            caption: text,
          })
        : await createMobileTextStatus({
            text,
            backgroundColor: composerBackground,
          });

      setStatuses((current) => [createdStatus, ...current]);
      closeComposer();
    } catch (error) {
      Alert.alert("Could not publish status", getApiErrorMessage(error));
    } finally {
      setIsPublishing(false);
    }
  };

  const updateReaction = async (emoji: StatusReactionEmoji): Promise<void> => {
    if (!activeStatus || isUpdatingReaction) {
      return;
    }

    try {
      setIsUpdatingReaction(true);
      const updatedStatus = await reactToMobileStatus(
        activeStatus._id,
        activeStatus.viewerReaction === emoji ? null : emoji,
      );
      replaceStatus(updatedStatus);
    } catch (error) {
      Alert.alert("Could not react", getApiErrorMessage(error));
    } finally {
      setIsUpdatingReaction(false);
    }
  };

  const removeStatus = (): void => {
    if (!activeStatus) {
      return;
    }

    Alert.alert("Delete status?", "This update will be removed for everyone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void deleteMobileStatus(activeStatus._id)
            .then(() => {
              setStatuses((current) =>
                current.filter((status) => status._id !== activeStatus._id),
              );
              setViewerGroup(null);
            })
            .catch((error: unknown) => {
              Alert.alert("Could not delete status", getApiErrorMessage(error));
            });
        },
      },
    ]);
  };

  const renderStatus = ({ item: group }: { item: StatusGroup }) => {
    const latestStatus = group.statuses[0];

    return (
      <Pressable
        onPress={() => openStatusGroup(group)}
        style={({ pressed }) => [styles.statusRow, pressed && styles.statusRowPressed]}
        accessibilityLabel={`View ${group.isCurrentUser ? "your" : group.author.name + "'s"} status`}
      >
        <View style={[
          styles.statusRing,
          group.hasUnviewedStatuses ? styles.statusRingUnviewed : styles.statusRingViewed,
          group.isCurrentUser && styles.statusRingOwn,
        ]}>
          <UserAvatar name={group.author.name} avatarUrl={group.author.avatarUrl} size={52} />
          {group.isCurrentUser && (
            <View style={styles.addStatusBadge}>
              <Ionicons name="add" size={15} color="#ffffff" />
            </View>
          )}
        </View>

        <View style={styles.statusCopy}>
          <Text style={styles.statusName} numberOfLines={1}>
            {group.isCurrentUser ? "My status" : group.author.name}
          </Text>
          <Text style={styles.statusPreview} numberOfLines={1}>
            {group.isCurrentUser && group.statuses.length === 0
              ? "Tap to add an update"
              : statusPreview(latestStatus)}
          </Text>
        </View>

        <Text style={styles.statusTime}>{formatStatusTime(latestStatus.createdAt)}</Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Status</Text>
          <Text style={styles.subtitle}>Share moments that disappear after 24 hours</Text>
        </View>

        <Pressable
          onPress={() => setIsComposerOpen(true)}
          style={styles.createButton}
          accessibilityLabel="Create status"
        >
          <Ionicons name="add" size={24} color="#ffffff" />
        </Pressable>
      </View>

      <FlatList
        data={groups}
        keyExtractor={(group) => group.author._id}
        renderItem={renderStatus}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadStatuses()} tintColor="#0891b2" />}
        contentContainerStyle={groups.length === 0 ? styles.emptyList : styles.list}
        ListHeaderComponent={
          <Pressable onPress={() => setIsComposerOpen(true)} style={styles.myStatusCard}>
            <View style={styles.myStatusIcon}>
              <Ionicons name="sparkles-outline" size={24} color="#0e7490" />
            </View>
            <View style={styles.statusCopy}>
              <Text style={styles.myStatusTitle}>Add to your status</Text>
              <Text style={styles.statusPreview}>Share a text or photo update</Text>
            </View>
            <Ionicons name="chevron-forward" size={19} color="#94a3b8" />
          </Pressable>
        }
        ListEmptyComponent={
          !isRefreshing ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="radio-button-on-outline" size={42} color="#0e7490" />
              </View>
              <Text style={styles.emptyTitle}>No updates yet</Text>
              <Text style={styles.emptyText}>Share your first status or check back when friends post one.</Text>
            </View>
          ) : undefined
        }
      />

      <AppTabBar activeTab="status" />

      <Modal visible={isComposerOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeComposer}>
        <SafeAreaView style={styles.composerScreen} edges={["top", "bottom", "left", "right"]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={closeComposer} disabled={isPublishing} style={styles.modalIconButton} accessibilityLabel="Close status composer">
              <Ionicons name="close" size={24} color="#0f172a" />
            </Pressable>
            <Text style={styles.modalTitle}>New status</Text>
            <Pressable onPress={() => void publishStatus()} disabled={isPublishing} style={[styles.publishButton, isPublishing && styles.publishButtonDisabled]}>
              {isPublishing ? <ActivityIndicator size="small" color="#ffffff" /> : <Text style={styles.publishText}>Post</Text>}
            </Pressable>
          </View>

          <View style={styles.composerContent}>
            {selectedPhoto ? (
              <Pressable onPress={() => setSelectedPhoto(null)} style={styles.photoPreview} accessibilityLabel="Remove selected photo">
                <Image source={{ uri: selectedPhoto.uri }} style={styles.photoPreviewImage} />
                <View style={styles.removePhotoBadge}><Ionicons name="close" size={18} color="#ffffff" /></View>
              </Pressable>
            ) : (
              <Pressable onPress={() => void handlePickPhoto()} style={[styles.textCanvas, { backgroundColor: statusBackgrounds[composerBackground] }]}>
                <Ionicons name="image-outline" size={30} color="rgba(255,255,255,0.85)" />
                <Text style={styles.canvasHint}>Tap to add a photo</Text>
              </Pressable>
            )}

            <TextInput
              value={composerText}
              onChangeText={setComposerText}
              placeholder={selectedPhoto ? "Write a caption (optional)" : "What's on your mind?"}
              placeholderTextColor="#94a3b8"
              multiline
              maxLength={selectedPhoto ? 300 : 700}
              style={styles.composerInput}
            />

            {!selectedPhoto && (
              <View style={styles.palette}>
                {Object.entries(statusBackgrounds).map(([background, color]) => (
                  <Pressable
                    key={background}
                    onPress={() => setComposerBackground(background as StatusBackground)}
                    style={[styles.paletteSwatch, { backgroundColor: color }, composerBackground === background && styles.paletteSwatchSelected]}
                    accessibilityLabel={`Use ${background} background`}
                  />
                ))}
              </View>
            )}

            <Text style={styles.composerNote}>Your update is shared with people you have chatted with and disappears after 24 hours.</Text>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal visible={viewerGroup !== null && activeStatus !== null} animationType="fade" onRequestClose={() => setViewerGroup(null)}>
        <SafeAreaView style={[styles.viewerScreen, { backgroundColor: activeStatus ? statusBackgrounds[activeStatus.backgroundColor] : "#0f172a" }]} edges={["top", "bottom", "left", "right"]}>
          {activeStatus && (
            <>
              <View style={styles.viewerTop}>
                <View style={styles.viewerAuthor}>
                  <UserAvatar name={activeStatus.author.name} avatarUrl={activeStatus.author.avatarUrl} size={40} />
                  <View>
                    <Text style={styles.viewerName}>{isViewingOwnStatus ? "My status" : activeStatus.author.name}</Text>
                    <Text style={styles.viewerTime}>{formatStatusTime(activeStatus.createdAt)}</Text>
                  </View>
                </View>
                <Pressable onPress={() => setViewerGroup(null)} style={styles.viewerCloseButton} accessibilityLabel="Close status viewer">
                  <Ionicons name="close" size={25} color="#ffffff" />
                </Pressable>
              </View>

              <Pressable onPress={() => moveStatus(-1)} style={styles.previousZone} accessibilityLabel="Previous status" />
              <Pressable onPress={() => moveStatus(1)} style={styles.nextZone} accessibilityLabel="Next status" />

              <View style={styles.viewerContent} pointerEvents="box-none">
                {activeStatus.photo ? <Image source={{ uri: activeStatus.photo.url }} style={styles.viewerPhoto} resizeMode="contain" /> : null}
                {activeStatus.text ? <Text style={[styles.viewerText, activeStatus.textColor === "dark" && styles.viewerTextDark]}>{activeStatus.text}</Text> : null}
              </View>

              <View style={styles.viewerBottom}>
                {isViewingOwnStatus ? (
                  <Pressable onPress={removeStatus} style={styles.deleteStatusButton} accessibilityLabel="Delete status">
                    <Ionicons name="trash-outline" size={21} color="#ffffff" />
                    <Text style={styles.viewerActionText}>{activeStatus.viewCount} views</Text>
                  </Pressable>
                ) : (
                  <View style={styles.reactionBar}>
                    {STATUS_REACTIONS.map((emoji) => (
                      <Pressable key={emoji} onPress={() => void updateReaction(emoji)} disabled={isUpdatingReaction} style={[styles.reactionButton, activeStatus.viewerReaction === emoji && styles.reactionButtonSelected]}>
                        <Text style={styles.reactionText}>{emoji}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            </>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },
  header: { minHeight: 78, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 14, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: "#e2e8f0", backgroundColor: "#ffffff" },
  title: { color: "#0f172a", fontSize: 24, fontWeight: "900" },
  subtitle: { maxWidth: 270, marginTop: 3, color: "#64748b", fontSize: 12 },
  createButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 15, backgroundColor: "#0891b2" },
  list: { paddingBottom: 16 },
  emptyList: { flexGrow: 1 },
  myStatusCard: { flexDirection: "row", alignItems: "center", gap: 13, margin: 16, marginBottom: 8, padding: 14, borderWidth: 1, borderColor: "#bae6fd", borderRadius: 20, backgroundColor: "#ffffff" },
  myStatusIcon: { width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: "#ecfeff" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 13, paddingHorizontal: 18, paddingVertical: 12, backgroundColor: "#ffffff" },
  statusRowPressed: { backgroundColor: "#f0fdfa" },
  statusRing: { position: "relative", alignItems: "center", justifyContent: "center", width: 62, height: 62, borderWidth: 3, borderRadius: 31 },
  statusRingUnviewed: { borderColor: "#0891b2" },
  statusRingViewed: { borderColor: "#cbd5e1" },
  statusRingOwn: { borderColor: "#22c55e" },
  addStatusBadge: { position: "absolute", right: -3, bottom: -2, width: 21, height: 21, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#ffffff", borderRadius: 11, backgroundColor: "#0891b2" },
  statusCopy: { flex: 1, minWidth: 0 },
  statusName: { color: "#0f172a", fontSize: 16, fontWeight: "800" },
  myStatusTitle: { color: "#0f172a", fontSize: 15, fontWeight: "900" },
  statusPreview: { marginTop: 3, color: "#64748b", fontSize: 13 },
  statusTime: { alignSelf: "flex-start", color: "#94a3b8", fontSize: 11 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 34 },
  emptyIcon: { width: 84, height: 84, alignItems: "center", justifyContent: "center", borderRadius: 28, backgroundColor: "#ecfeff" },
  emptyTitle: { marginTop: 21, color: "#0f172a", fontSize: 20, fontWeight: "900" },
  emptyText: { marginTop: 8, color: "#64748b", fontSize: 14, lineHeight: 21, textAlign: "center" },
  composerScreen: { flex: 1, backgroundColor: "#f8fafc" },
  modalHeader: { minHeight: 64, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: "#e2e8f0", backgroundColor: "#ffffff" },
  modalIconButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 21 },
  modalTitle: { color: "#0f172a", fontSize: 17, fontWeight: "900" },
  publishButton: { minWidth: 58, minHeight: 36, alignItems: "center", justifyContent: "center", paddingHorizontal: 12, borderRadius: 12, backgroundColor: "#0891b2" },
  publishButtonDisabled: { opacity: 0.65 },
  publishText: { color: "#ffffff", fontSize: 14, fontWeight: "900" },
  composerContent: { flex: 1, padding: 18 },
  textCanvas: { height: 174, alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 24 },
  canvasHint: { color: "#ffffff", fontSize: 14, fontWeight: "800" },
  photoPreview: { position: "relative", height: 236, overflow: "hidden", borderRadius: 24, backgroundColor: "#0f172a" },
  photoPreviewImage: { width: "100%", height: "100%" },
  removePhotoBadge: { position: "absolute", top: 10, right: 10, width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: "rgba(15,23,42,0.72)" },
  composerInput: { minHeight: 112, marginTop: 16, paddingHorizontal: 15, paddingVertical: 13, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 18, backgroundColor: "#ffffff", color: "#0f172a", fontSize: 16, lineHeight: 23, textAlignVertical: "top" },
  palette: { flexDirection: "row", justifyContent: "space-between", marginTop: 18, paddingHorizontal: 4 },
  paletteSwatch: { width: 35, height: 35, borderWidth: 3, borderColor: "transparent", borderRadius: 18 },
  paletteSwatchSelected: { borderColor: "#0f172a", transform: [{ scale: 1.12 }] },
  composerNote: { marginTop: 22, color: "#64748b", fontSize: 12, lineHeight: 18, textAlign: "center" },
  viewerScreen: { flex: 1 },
  viewerTop: { zIndex: 3, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 10 },
  viewerAuthor: { flexDirection: "row", alignItems: "center", gap: 10 },
  viewerName: { color: "#ffffff", fontSize: 15, fontWeight: "900" },
  viewerTime: { marginTop: 2, color: "rgba(255,255,255,0.72)", fontSize: 12 },
  viewerCloseButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 21, backgroundColor: "rgba(15,23,42,0.25)" },
  previousZone: { position: "absolute", zIndex: 1, top: 86, bottom: 82, left: 0, width: "32%" },
  nextZone: { position: "absolute", zIndex: 1, top: 86, right: 0, bottom: 82, width: "68%" },
  viewerContent: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingBottom: 40 },
  viewerPhoto: { width: "100%", height: "68%", borderRadius: 18 },
  viewerText: { color: "#ffffff", fontSize: 27, fontWeight: "800", lineHeight: 38, textAlign: "center" },
  viewerTextDark: { color: "#422006" },
  viewerBottom: { zIndex: 3, minHeight: 68, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  reactionBar: { flexDirection: "row", gap: 7, padding: 7, borderRadius: 22, backgroundColor: "rgba(15,23,42,0.28)" },
  reactionButton: { width: 35, height: 35, alignItems: "center", justifyContent: "center", borderRadius: 18 },
  reactionButtonSelected: { backgroundColor: "rgba(255,255,255,0.3)" },
  reactionText: { fontSize: 20 },
  deleteStatusButton: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 42, paddingHorizontal: 14, borderRadius: 21, backgroundColor: "rgba(15,23,42,0.28)" },
  viewerActionText: { color: "#ffffff", fontSize: 13, fontWeight: "800" },
});
