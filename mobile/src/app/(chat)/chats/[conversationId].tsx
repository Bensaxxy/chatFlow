import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import UserAvatar from "@/components/common/user-avatar";
import { useAuth } from "@/contexts/auth-context";
import { getApiErrorMessage } from "@/lib/api/errors";
import { getConversationName, getConversationPeer } from "@/lib/chat/presentation";
import {
  getMobileConversation,
} from "@/services/conversation.service";
import {
  getMobileMessages,
  markMobileConversationRead,
  sendMobileMessage,
} from "@/services/message.service";
import type { Conversation } from "@/types/conversation";
import type { ChatMessage } from "@/types/message";

const createClientMessageId = (): string =>
  `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const formatMessageTime = (value: string): string =>
  new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function ConversationScreen() {
  const { conversationId: rawConversationId } = useLocalSearchParams<{
    conversationId?: string | string[];
  }>();
  const conversationId = Array.isArray(rawConversationId)
    ? rawConversationId[0]
    : rawConversationId;
  const { user } = useAuth();
  const listRef = useRef<FlatList<ChatMessage> | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const loadConversation = useCallback(async (): Promise<void> => {
    if (!conversationId) {
      return;
    }

    try {
      setIsLoading(true);
      const [nextConversation, page] = await Promise.all([
        getMobileConversation(conversationId),
        getMobileMessages(conversationId),
      ]);
      setConversation(nextConversation);
      setMessages(page.messages);
      void markMobileConversationRead(conversationId);
    } catch (error) {
      Alert.alert("Could not open chat", getApiErrorMessage(error), [
        { text: "Back", onPress: () => router.back() },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  useFocusEffect(
    useCallback(() => {
      void loadConversation();
    }, [loadConversation]),
  );

  const handleSend = async (): Promise<void> => {
    const content = text.trim();

    if (!conversationId || !user || !content || isSending) {
      return;
    }

    const clientMessageId = createClientMessageId();
    const temporaryMessage: ChatMessage = {
      _id: clientMessageId,
      clientMessageId,
      conversation: conversationId,
      sender: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
      content,
      type: "text",
      attachment: null,
      editedAt: null,
      deletedForEveryoneAt: null,
      createdAt: new Date().toISOString(),
      deliveryStatus: "sending",
    };

    setText("");
    setMessages((current) => [...current, temporaryMessage]);
    setIsSending(true);

    try {
      const sentMessage = await sendMobileMessage(
        conversationId,
        content,
        clientMessageId,
      );
      setMessages((current) =>
        current.map((message) =>
          message.clientMessageId === clientMessageId ? sentMessage : message,
        ),
      );
      void markMobileConversationRead(conversationId);
    } catch (error) {
      setMessages((current) =>
        current.map((message) =>
          message.clientMessageId === clientMessageId
            ? { ...message, deliveryStatus: "failed" }
            : message,
        ),
      );
      Alert.alert("Message not sent", getApiErrorMessage(error));
    } finally {
      setIsSending(false);
    }
  };

  if (!conversationId || !user) {
    return null;
  }

  const peer = conversation ? getConversationPeer(conversation, user._id) : null;
  const title = conversation ? getConversationName(conversation, user._id) : "Chat";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 4 : 0}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={10} accessibilityLabel="Back to chats">
            <Ionicons name="arrow-back" size={23} color="#0f172a" />
          </Pressable>
          <UserAvatar name={title} avatarUrl={conversation?.avatarUrl ?? peer?.avatarUrl} size={38} />
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            <Text style={styles.subtitle} numberOfLines={1}>{peer?.lastSeenAt ? "Last seen recently" : "ChatFlow"}</Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingState}><ActivityIndicator size="large" color="#0891b2" /><Text style={styles.loadingText}>Opening conversation…</Text></View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(message) => message._id}
            contentContainerStyle={messages.length === 0 ? styles.emptyList : styles.messageList}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }) => {
              const isOwnMessage = item.sender._id === user._id;
              const isDeleted = Boolean(item.deletedForEveryoneAt);
              const bubbleText = isDeleted
                ? "This message was deleted"
                : item.content || (item.type === "audio" ? "Voice note" : "Attachment");

              return (
                <View style={[styles.messageRow, isOwnMessage ? styles.messageRowOwn : styles.messageRowOther]}>
                  <View style={[styles.bubble, isOwnMessage ? styles.bubbleOwn : styles.bubbleOther, item.deliveryStatus === "failed" && styles.bubbleFailed]}>
                    <Text style={[styles.messageText, isOwnMessage && styles.messageTextOwn, isDeleted && styles.messageTextDeleted]}>{bubbleText}</Text>
                    <View style={styles.messageMeta}>
                      {item.editedAt && !isDeleted && <Text style={[styles.editedText, isOwnMessage && styles.editedTextOwn]}>edited</Text>}
                      <Text style={[styles.timeText, isOwnMessage && styles.timeTextOwn]}>{formatMessageTime(item.createdAt)}</Text>
                      {isOwnMessage && item.deliveryStatus === "sending" && <Ionicons name="time-outline" size={13} color="#0e7490" />}
                      {isOwnMessage && item.deliveryStatus === "failed" && <Ionicons name="alert-circle" size={14} color="#dc2626" />}
                    </View>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={<View style={styles.emptyState}><View style={styles.emptyIcon}><Ionicons name="chatbubble-ellipses-outline" size={34} color="#0891b2" /></View><Text style={styles.emptyTitle}>Start the conversation</Text><Text style={styles.emptyText}>Send a message to say hello.</Text></View>}
          />
        )}

        <View style={styles.composer}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Message"
            placeholderTextColor="#64748b"
            multiline
            maxLength={5_000}
            style={styles.composerInput}
            textAlignVertical="center"
          />
          <Pressable
            onPress={() => void handleSend()}
            disabled={!text.trim() || isSending || isLoading}
            style={({ pressed }) => [styles.sendButton, pressed && styles.sendButtonPressed, (!text.trim() || isSending || isLoading) && styles.sendButtonDisabled]}
            accessibilityLabel="Send message"
          >
            {isSending ? <ActivityIndicator size="small" color="#ffffff" /> : <Ionicons name="send" size={19} color="#ffffff" />}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },
  keyboardView: { flex: 1 },
  header: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: "#e2e8f0", backgroundColor: "#ffffff" },
  backButton: { width: 36, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 20 },
  headerText: { flex: 1, minWidth: 0 },
  title: { color: "#0f172a", fontSize: 16, fontWeight: "900" },
  subtitle: { marginTop: 2, color: "#64748b", fontSize: 12 },
  loadingState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: "#64748b", fontSize: 14 },
  messageList: { paddingHorizontal: 14, paddingVertical: 16 },
  emptyList: { flexGrow: 1 },
  messageRow: { flexDirection: "row", marginBottom: 8 },
  messageRowOwn: { justifyContent: "flex-end" },
  messageRowOther: { justifyContent: "flex-start" },
  bubble: { maxWidth: "82%", paddingHorizontal: 12, paddingTop: 9, paddingBottom: 6, borderRadius: 18 },
  bubbleOwn: { borderBottomRightRadius: 5, backgroundColor: "#cffafe" },
  bubbleOther: { borderBottomLeftRadius: 5, backgroundColor: "#ffffff" },
  bubbleFailed: { borderWidth: 1, borderColor: "#fca5a5", backgroundColor: "#fff1f2" },
  messageText: { color: "#0f172a", fontSize: 15, lineHeight: 21 },
  messageTextOwn: { color: "#083344" },
  messageTextDeleted: { color: "#64748b", fontStyle: "italic" },
  messageMeta: { flexDirection: "row", alignSelf: "flex-end", alignItems: "center", gap: 4, marginTop: 4 },
  timeText: { color: "#64748b", fontSize: 10 },
  timeTextOwn: { color: "#0e7490" },
  editedText: { color: "#94a3b8", fontSize: 10 },
  editedTextOwn: { color: "#0e7490" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 36 },
  emptyIcon: { width: 72, height: 72, alignItems: "center", justifyContent: "center", borderRadius: 24, backgroundColor: "#ecfeff" },
  emptyTitle: { marginTop: 18, color: "#0f172a", fontSize: 18, fontWeight: "900" },
  emptyText: { marginTop: 6, color: "#64748b", fontSize: 14, textAlign: "center" },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 9, paddingHorizontal: 12, paddingTop: 9, paddingBottom: Platform.OS === "ios" ? 10 : 12, borderTopWidth: 1, borderTopColor: "#e2e8f0", backgroundColor: "#ffffff" },
  composerInput: { flex: 1, minHeight: 44, maxHeight: 120, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: "#f1f5f9", color: "#0f172a", fontSize: 16 },
  sendButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: "#0891b2" },
  sendButtonPressed: { opacity: 0.8, transform: [{ scale: 0.96 }] },
  sendButtonDisabled: { opacity: 0.45 },
});
