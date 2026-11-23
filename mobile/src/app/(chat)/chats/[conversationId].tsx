import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
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

import MessageAttachmentContent from "@/components/chat/message-attachment";
import VoiceNoteRecorder from "@/components/chat/voice-note-recorder";
import UserAvatar from "@/components/common/user-avatar";
import { useAuth } from "@/contexts/auth-context";
import { useSocket } from "@/contexts/socket-context";
import { getApiErrorMessage } from "@/lib/api/errors";
import { createClientMessageId } from "@/lib/chat/client-message-id";
import { getConversationName, getConversationPeer } from "@/lib/chat/presentation";
import { getMobileConversation } from "@/services/conversation.service";
import {
  deleteMobileMessage,
  editMobileMessage,
  getMobileMessages,
  markMobileConversationRead,
  sendMobileAttachment,
  sendMobileMessage,
  updateMobileMessageReaction,
  type MobileAttachmentInput,
} from "@/services/message.service";
import type { Conversation } from "@/types/conversation";
import type {
  ChatMessage,
  MessageAttachment,
  MessageReactionEmoji,
} from "@/types/message";

const REACTIONS: MessageReactionEmoji[] = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const formatMessageTime = (value: string): string =>
  new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const attachmentType = (mimeType: string): ChatMessage["type"] => {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  return "file";
};

interface MessageBubbleProps {
  message: ChatMessage;
  currentUserId: string;
  onLongPress: (message: ChatMessage) => void;
  onRetry: (message: ChatMessage) => void;
  onReact: (message: ChatMessage, emoji: MessageReactionEmoji) => void;
}

function MessageBubble({ message, currentUserId, onLongPress, onRetry, onReact }: MessageBubbleProps) {
  const [transition] = useState(() => new Animated.Value(0));
  const isOwnMessage = message.sender._id === currentUserId;
  const isDeleted = Boolean(message.deletedForEveryoneAt);
  const reactions = message.reactions;
  const ownReaction = reactions.find((reaction) => reaction.user === currentUserId)?.emoji;
  const reactionSummary = useMemo(() => {
    const counts = new Map<MessageReactionEmoji, number>();
    reactions.forEach((reaction) => counts.set(reaction.emoji, (counts.get(reaction.emoji) ?? 0) + 1));
    return [...counts.entries()];
  }, [reactions]);

  useEffect(() => {
    Animated.timing(transition, { toValue: 1, duration: 180, useNativeDriver: true }).start();
  }, [transition]);

  const bubbleText = isDeleted
    ? "This message was deleted"
    : message.content || (message.type === "audio" ? "Voice note" : "Attachment");

  return (
    <Animated.View
      style={[
        styles.messageRow,
        isOwnMessage ? styles.messageRowOwn : styles.messageRowOther,
        { opacity: transition, transform: [{ translateY: transition.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] },
      ]}
    >
      <View style={styles.messageGroup}>
        <Pressable
          delayLongPress={280}
          onLongPress={() => onLongPress(message)}
          style={[styles.bubble, isOwnMessage ? styles.bubbleOwn : styles.bubbleOther, message.deliveryStatus === "failed" && styles.bubbleFailed]}
          accessibilityHint="Hold to react or manage this message"
        >
          {!isDeleted && message.attachment ? (
            <View style={message.content ? styles.attachmentWithText : undefined}>
              <MessageAttachmentContent attachment={message.attachment} type={message.type === "text" ? "file" : message.type} isOwnMessage={isOwnMessage} />
            </View>
          ) : null}
          {(message.content || isDeleted) && (
            <Text style={[styles.messageText, isOwnMessage && styles.messageTextOwn, isDeleted && styles.messageTextDeleted]}>{bubbleText}</Text>
          )}
          <View style={styles.messageMeta}>
            {message.editedAt && !isDeleted && <Text style={[styles.editedText, isOwnMessage && styles.editedTextOwn]}>edited</Text>}
            <Text style={[styles.timeText, isOwnMessage && styles.timeTextOwn]}>{formatMessageTime(message.createdAt)}</Text>
            {isOwnMessage && message.deliveryStatus === "sending" && <Ionicons name="time-outline" size={13} color="#0e7490" />}
            {isOwnMessage && message.deliveryStatus === "failed" && (
              <Pressable onPress={() => onRetry(message)} hitSlop={8} accessibilityLabel="Retry message"><Ionicons name="alert-circle" size={15} color="#dc2626" /></Pressable>
            )}
          </View>
        </Pressable>
        {reactionSummary.length > 0 && !isDeleted ? (
          <View style={[styles.reactionSummary, isOwnMessage && styles.reactionSummaryOwn]}>
            {reactionSummary.map(([emoji, count]) => (
              <Pressable key={emoji} onPress={() => onReact(message, emoji)} style={[styles.reactionPill, ownReaction === emoji && styles.reactionPillSelected]} accessibilityLabel={`React ${emoji}`}>
                <Text style={styles.reactionEmoji}>{emoji}</Text>{count > 1 && <Text style={styles.reactionCount}>{count}</Text>}
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

export default function ConversationScreen() {
  const { conversationId: rawConversationId } = useLocalSearchParams<{ conversationId?: string | string[] }>();
  const conversationId = Array.isArray(rawConversationId) ? rawConversationId[0] : rawConversationId;
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const listRef = useRef<FlatList<ChatMessage> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const isNearBottomRef = useRef(true);
  const shouldScrollToBottomRef = useRef(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [unseenMessageCount, setUnseenMessageCount] = useState(0);
  const [actionMessage, setActionMessage] = useState<ChatMessage | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  const requestScrollToBottom = useCallback((animated = true): void => {
    shouldScrollToBottomRef.current = animated;
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated }));
  }, []);

  const upsertMessage = useCallback((nextMessage: ChatMessage): void => {
    setMessages((current) => {
      const matchIndex = current.findIndex((message) => message._id === nextMessage._id || (Boolean(nextMessage.clientMessageId) && message.clientMessageId === nextMessage.clientMessageId));
      if (matchIndex === -1) return [...current, nextMessage];
      return current.map((message, index) => index === matchIndex ? nextMessage : message);
    });
  }, []);

  const stopTyping = useCallback((): void => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (conversationId && isTypingRef.current && socket.connected) socket.emit("typing:stop", conversationId);
    isTypingRef.current = false;
  }, [conversationId, socket]);

  const loadConversation = useCallback(async (): Promise<void> => {
    if (!conversationId) return;
    try {
      setIsLoading(true);
      const [nextConversation, page] = await Promise.all([getMobileConversation(conversationId), getMobileMessages(conversationId)]);
      setConversation(nextConversation);
      setMessages(page.messages);
      requestScrollToBottom(false);
      void markMobileConversationRead(conversationId);
    } catch (error) {
      Alert.alert("Could not open chat", getApiErrorMessage(error), [{ text: "Back", onPress: () => router.back() }]);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, requestScrollToBottom]);

  useFocusEffect(useCallback(() => { void loadConversation(); }, [loadConversation]));

  useEffect(() => {
    if (!conversationId || !user) return;
    let remoteTypingTimer: ReturnType<typeof setTimeout> | null = null;
    const clearRemoteTyping = (): void => setIsOtherUserTyping(false);
    const handleNewMessage = ({ message }: { message: ChatMessage }): void => {
      if (message.conversation !== conversationId) return;
      const isOwnMessage = message.sender._id === user._id;
      upsertMessage(message);
      if (isOwnMessage || isNearBottomRef.current) requestScrollToBottom();
      else setUnseenMessageCount((count) => count + 1);
      if (!isOwnMessage) void markMobileConversationRead(conversationId);
    };
    const handleMessageUpdated = ({ conversationId: updatedConversationId, message }: { conversationId: string; message: ChatMessage }): void => {
      if (updatedConversationId === conversationId) upsertMessage(message);
    };
    const handleMessageDeleted = ({ conversationId: deletedConversationId, messageId, scope, deletedForEveryoneAt }: { conversationId: string; messageId: string; scope: "me" | "everyone"; deletedForEveryoneAt: string | null }): void => {
      if (deletedConversationId !== conversationId) return;
      if (scope === "me") {
        setMessages((current) => current.filter((message) => message._id !== messageId));
        return;
      }
      setMessages((current) => current.map((message) => message._id === messageId ? { ...message, content: "This message was deleted", type: "text", attachment: null, reactions: [], deletedForEveryoneAt } : message));
    };
    const handleTyping = ({ conversationId: typingConversationId, userId, isTyping }: { conversationId: string; userId: string; isTyping: boolean }): void => {
      if (typingConversationId !== conversationId || userId === user._id) return;
      if (remoteTypingTimer) clearTimeout(remoteTypingTimer);
      setIsOtherUserTyping(isTyping);
      if (isTyping) remoteTypingTimer = setTimeout(clearRemoteTyping, 1_800);
    };
    socket.on("message:new", handleNewMessage);
    socket.on("message:updated", handleMessageUpdated);
    socket.on("message:deleted", handleMessageDeleted);
    socket.on("typing:update", handleTyping);
    if (isConnected) socket.emit("conversation:join", conversationId, () => undefined);
    return () => {
      stopTyping();
      if (remoteTypingTimer) clearTimeout(remoteTypingTimer);
      clearRemoteTyping();
      socket.off("message:new", handleNewMessage);
      socket.off("message:updated", handleMessageUpdated);
      socket.off("message:deleted", handleMessageDeleted);
      socket.off("typing:update", handleTyping);
      if (socket.connected) socket.emit("conversation:leave", conversationId);
    };
  }, [conversationId, isConnected, requestScrollToBottom, socket, stopTyping, upsertMessage, user]);

  const createTemporaryMessage = useCallback((clientMessageId: string, content: string, type: ChatMessage["type"], attachment: MessageAttachment | null): ChatMessage => ({
    _id: clientMessageId,
    clientMessageId,
    conversation: conversationId ?? "",
    sender: { _id: user?._id ?? "", name: user?.name ?? "You", email: user?.email ?? "", avatarUrl: user?.avatarUrl ?? null },
    content,
    type,
    attachment,
    editedAt: null,
    deletedForEveryoneAt: null,
    reactions: [],
    createdAt: new Date().toISOString(),
    deliveryStatus: "sending",
  }), [conversationId, user]);

  const sendText = useCallback(async (content: string, clientMessageId = createClientMessageId()): Promise<void> => {
    if (!conversationId) return;
    const temporaryMessage = createTemporaryMessage(clientMessageId, content, "text", null);
    setMessages((current) => [...current, temporaryMessage]);
    requestScrollToBottom();
    try {
      const sentMessage = await sendMobileMessage(conversationId, content, clientMessageId);
      upsertMessage(sentMessage);
      void markMobileConversationRead(conversationId);
    } catch (error) {
      setMessages((current) => current.map((message) => message.clientMessageId === clientMessageId ? { ...message, deliveryStatus: "failed" } : message));
      Alert.alert("Message not sent", getApiErrorMessage(error));
    }
  }, [conversationId, createTemporaryMessage, requestScrollToBottom, upsertMessage]);

  const handleSend = async (): Promise<void> => {
    const content = text.trim();
    if (!conversationId || !content) return;
    if (editingMessageId) {
      const original = messages.find((message) => message._id === editingMessageId);
      if (!original) { setEditingMessageId(null); return; }
      setText("");
      setEditingMessageId(null);
      setMessages((current) => current.map((message) => message._id === editingMessageId ? { ...message, content, editedAt: new Date().toISOString() } : message));
      try {
        const updatedMessage = await editMobileMessage(conversationId, editingMessageId, content);
        upsertMessage(updatedMessage);
      } catch (error) {
        setMessages((current) => current.map((message) => message._id === original._id ? original : message));
        Alert.alert("Could not edit message", getApiErrorMessage(error));
      }
      return;
    }
    setText("");
    stopTyping();
    await sendText(content);
  };

  const sendAttachment = useCallback(async (attachment: MobileAttachmentInput): Promise<void> => {
    if (!conversationId) return;
    const clientMessageId = createClientMessageId();
    const type = attachmentType(attachment.mimeType);
    const localAttachment: MessageAttachment = { url: attachment.uri, fileName: attachment.fileName, mimeType: attachment.mimeType, size: attachment.size };
    const temporaryMessage = createTemporaryMessage(clientMessageId, "", type, localAttachment);
    setMessages((current) => [...current, temporaryMessage]);
    setIsUploading(true);
    requestScrollToBottom();
    try {
      const sentMessage = await sendMobileAttachment(conversationId, attachment, clientMessageId);
      upsertMessage(sentMessage);
      void markMobileConversationRead(conversationId);
    } catch (error) {
      setMessages((current) => current.map((message) => message.clientMessageId === clientMessageId ? { ...message, deliveryStatus: "failed" } : message));
      Alert.alert("Attachment not sent", getApiErrorMessage(error));
    } finally {
      setIsUploading(false);
    }
  }, [conversationId, createTemporaryMessage, requestScrollToBottom, upsertMessage]);

  const pickImage = async (): Promise<void> => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) { Alert.alert("Photo access", "Allow photo access to share an image in ChatFlow."); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.9 });
      if (result.canceled) return;
      const image = result.assets[0];
      if (!image) return;
      setIsAttachmentMenuOpen(false);
      await sendAttachment({ uri: image.uri, fileName: image.fileName ?? `photo-${Date.now()}.jpg`, mimeType: image.mimeType ?? "image/jpeg", size: image.fileSize });
    } catch (error) {
      Alert.alert("Could not select photo", getApiErrorMessage(error));
    }
  };

  const pickDocument = async (): Promise<void> => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true, multiple: false });
      if (result.canceled) return;
      const file = result.assets[0];
      if (!file) return;
      setIsAttachmentMenuOpen(false);
      await sendAttachment({ uri: file.uri, fileName: file.name, mimeType: file.mimeType ?? "application/octet-stream", size: file.size });
    } catch (error) {
      Alert.alert("Could not select file", getApiErrorMessage(error));
    }
  };

  const handleRetry = (message: ChatMessage): void => {
    if (message.deliveryStatus !== "failed") return;
    setMessages((current) => current.filter((item) => item._id !== message._id));
    if (message.type === "text") { void sendText(message.content); return; }
    if (message.attachment?.url.startsWith("file")) {
      void sendAttachment({ uri: message.attachment.url, fileName: message.attachment.fileName, mimeType: message.attachment.mimeType, size: message.attachment.size });
    }
  };

  const handleReaction = async (message: ChatMessage, emoji: MessageReactionEmoji): Promise<void> => {
    if (!conversationId || message.deliveryStatus || message.deletedForEveryoneAt) return;
    const currentReaction = message.reactions.find((reaction) => reaction.user === user?._id)?.emoji;
    try {
      const updatedMessage = await updateMobileMessageReaction(conversationId, message._id, currentReaction === emoji ? null : emoji);
      upsertMessage(updatedMessage);
    } catch (error) {
      Alert.alert("Could not add reaction", getApiErrorMessage(error));
    } finally {
      setActionMessage(null);
    }
  };

  const handleDelete = (message: ChatMessage): void => {
    if (!conversationId || message.sender._id !== user?._id) return;
    Alert.alert("Delete for everyone?", "This will remove the message for everyone in this chat.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => {
        void deleteMobileMessage(conversationId, message._id).then(() => {
          setMessages((current) => current.map((item) => item._id === message._id ? { ...item, content: "This message was deleted", type: "text", attachment: null, reactions: [], deletedForEveryoneAt: new Date().toISOString() } : item));
        }).catch((error: unknown) => Alert.alert("Could not delete message", getApiErrorMessage(error)));
      } },
    ]);
  };

  const startEditing = (message: ChatMessage): void => {
    if (message.sender._id !== user?._id || message.type !== "text" || message.deletedForEveryoneAt) return;
    setActionMessage(null);
    setEditingMessageId(message._id);
    setText(message.content);
  };

  const handleTextChange = (value: string): void => {
    setText(value);
    if (editingMessageId || !conversationId || !socket.connected || !value.trim()) {
      if (!value.trim()) stopTyping();
      return;
    }
    if (!isTypingRef.current) {
      socket.emit("typing:start", conversationId);
      isTypingRef.current = true;
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(stopTyping, 1_200);
  };

  if (!conversationId || !user) return null;
  const peer = conversation ? getConversationPeer(conversation, user._id) : null;
  const title = conversation ? getConversationName(conversation, user._id) : "Chat";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 4 : 0}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={10} accessibilityLabel="Back to chats"><Ionicons name="arrow-back" size={23} color="#0f172a" /></Pressable>
          <UserAvatar name={title} avatarUrl={conversation?.avatarUrl ?? peer?.avatarUrl} size={38} />
          <View style={styles.headerText}><Text style={styles.title} numberOfLines={1}>{title}</Text><Text style={styles.subtitle} numberOfLines={1}>{peer?.lastSeenAt ? "Last seen recently" : "ChatFlow"}</Text></View>
          <View style={[styles.connectionDot, isConnected ? styles.connectionDotOnline : styles.connectionDotOffline]} />
        </View>

        <View style={styles.chatContent}>
          {isLoading ? <View style={styles.loadingState}><ActivityIndicator size="large" color="#0891b2" /><Text style={styles.loadingText}>Opening conversation…</Text></View> : (
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(message) => message._id}
              contentContainerStyle={messages.length === 0 ? styles.emptyList : styles.messageList}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => { if (shouldScrollToBottomRef.current) { listRef.current?.scrollToEnd({ animated: shouldScrollToBottomRef.current }); shouldScrollToBottomRef.current = false; } }}
              onScroll={({ nativeEvent }) => {
                const distanceFromBottom = nativeEvent.contentSize.height - nativeEvent.layoutMeasurement.height - nativeEvent.contentOffset.y;
                isNearBottomRef.current = distanceFromBottom < 100;
                if (isNearBottomRef.current) setUnseenMessageCount(0);
              }}
              scrollEventThrottle={100}
              renderItem={({ item }) => <MessageBubble message={item} currentUserId={user._id} onLongPress={(message) => !message.deliveryStatus && !message.deletedForEveryoneAt && setActionMessage(message)} onRetry={handleRetry} onReact={(message, emoji) => void handleReaction(message, emoji)} />}
              ListFooterComponent={isOtherUserTyping ? <View style={styles.typingBubble}><View style={styles.typingDots}><View style={styles.typingDot} /><View style={[styles.typingDot, styles.typingDotMiddle]} /><View style={styles.typingDot} /></View><Text style={styles.typingText}>{title} is typing…</Text></View> : undefined}
              ListEmptyComponent={<View style={styles.emptyState}><View style={styles.emptyIcon}><Ionicons name="chatbubble-ellipses-outline" size={34} color="#0891b2" /></View><Text style={styles.emptyTitle}>Start the conversation</Text><Text style={styles.emptyText}>Send a message, photo, file, or voice note.</Text></View>}
            />
          )}
          {!isLoading && unseenMessageCount > 0 && <Pressable onPress={() => { setUnseenMessageCount(0); requestScrollToBottom(); }} style={styles.jumpButton} accessibilityLabel={`Jump to ${unseenMessageCount} new messages`}><Ionicons name="arrow-down" size={19} color="#ffffff" /><Text style={styles.jumpCount}>{unseenMessageCount > 99 ? "99+" : unseenMessageCount}</Text></Pressable>}
        </View>

        {isAttachmentMenuOpen && !isRecording && <View style={styles.attachmentMenu}>
          <Pressable onPress={() => void pickImage()} style={styles.attachmentAction} disabled={isUploading}><View style={[styles.attachmentIcon, styles.photoIcon]}><Ionicons name="image-outline" size={20} color="#0e7490" /></View><Text style={styles.attachmentActionText}>Photo</Text></Pressable>
          <Pressable onPress={() => void pickDocument()} style={styles.attachmentAction} disabled={isUploading}><View style={[styles.attachmentIcon, styles.fileActionIcon]}><Ionicons name="document-attach-outline" size={20} color="#7c3aed" /></View><Text style={styles.attachmentActionText}>File</Text></Pressable>
        </View>}
        {editingMessageId && !isRecording && <View style={styles.editingBar}><View style={styles.editingIndicator} /><Text style={styles.editingText} numberOfLines={1}>Editing message</Text><Pressable onPress={() => { setEditingMessageId(null); setText(""); }} hitSlop={10} accessibilityLabel="Cancel editing"><Ionicons name="close" size={20} color="#0e7490" /></Pressable></View>}

        <View style={styles.composer}>
          {!isRecording && <Pressable onPress={() => setIsAttachmentMenuOpen((isOpen) => !isOpen)} disabled={isUploading || isLoading} style={({ pressed }) => [styles.composerAction, pressed && styles.composerActionPressed, (isUploading || isLoading) && styles.composerActionDisabled]} accessibilityLabel="Attach photo or file"><Ionicons name={isAttachmentMenuOpen ? "close" : "add"} size={24} color="#0e7490" /></Pressable>}
          {!isRecording && <TextInput value={text} onChangeText={handleTextChange} placeholder={editingMessageId ? "Edit message" : "Message"} placeholderTextColor="#64748b" multiline maxLength={5_000} style={styles.composerInput} textAlignVertical="center" accessibilityLabel="Message" />}
          {!isRecording && text.trim() && <Pressable onPress={() => void handleSend()} disabled={isLoading} style={({ pressed }) => [styles.sendButton, pressed && styles.sendButtonPressed, isLoading && styles.sendButtonDisabled]} accessibilityLabel={editingMessageId ? "Save message" : "Send message"}><Ionicons name={editingMessageId ? "checkmark" : "send"} size={19} color="#ffffff" /></Pressable>}
          <VoiceNoteRecorder key="voice-recorder" disabled={isUploading || isLoading} hidden={Boolean(text.trim())} onRecordingChange={(value) => { setIsRecording(value); if (value) setIsAttachmentMenuOpen(false); }} onRecorded={(attachment) => void sendAttachment(attachment)} />
        </View>

        {actionMessage && <View style={styles.actionLayer} pointerEvents="box-none">
          <Pressable style={styles.actionBackdrop} onPress={() => setActionMessage(null)} />
          <View style={styles.actionSheet}><View style={styles.actionHandle} /><Text style={styles.actionTitle} numberOfLines={1}>Message actions</Text><View style={styles.reactionChooser}>{REACTIONS.map((emoji) => <Pressable key={emoji} onPress={() => void handleReaction(actionMessage, emoji)} style={styles.reactionChooserButton} accessibilityLabel={`React ${emoji}`}><Text style={styles.reactionChooserEmoji}>{emoji}</Text></Pressable>)}</View>
            {actionMessage.sender._id === user._id && actionMessage.type === "text" && <Pressable onPress={() => startEditing(actionMessage)} style={styles.actionRow}><Ionicons name="create-outline" size={20} color="#0e7490" /><Text style={styles.actionRowText}>Edit message</Text></Pressable>}
            {actionMessage.sender._id === user._id && <Pressable onPress={() => { setActionMessage(null); handleDelete(actionMessage); }} style={styles.actionRow}><Ionicons name="trash-outline" size={20} color="#dc2626" /><Text style={[styles.actionRowText, styles.actionRowDanger]}>Delete for everyone</Text></Pressable>}
          </View>
        </View>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" }, keyboardView: { flex: 1 },
  header: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: "#e2e8f0", backgroundColor: "#ffffff" }, backButton: { width: 36, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 20 }, headerText: { flex: 1, minWidth: 0 }, title: { color: "#0f172a", fontSize: 16, fontWeight: "900" }, subtitle: { marginTop: 2, color: "#64748b", fontSize: 12 }, connectionDot: { width: 8, height: 8, borderRadius: 4 }, connectionDotOnline: { backgroundColor: "#22c55e" }, connectionDotOffline: { backgroundColor: "#cbd5e1" },
  chatContent: { flex: 1 }, loadingState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }, loadingText: { color: "#64748b", fontSize: 14 }, messageList: { paddingHorizontal: 14, paddingVertical: 16 }, emptyList: { flexGrow: 1 }, messageRow: { flexDirection: "row", marginBottom: 9 }, messageRowOwn: { justifyContent: "flex-end" }, messageRowOther: { justifyContent: "flex-start" }, messageGroup: { maxWidth: "84%" }, bubble: { paddingHorizontal: 12, paddingTop: 9, paddingBottom: 6, borderRadius: 18 }, bubbleOwn: { borderBottomRightRadius: 5, backgroundColor: "#cffafe" }, bubbleOther: { borderBottomLeftRadius: 5, backgroundColor: "#ffffff" }, bubbleFailed: { borderWidth: 1, borderColor: "#fca5a5", backgroundColor: "#fff1f2" }, attachmentWithText: { marginBottom: 8 }, messageText: { color: "#0f172a", fontSize: 15, lineHeight: 21 }, messageTextOwn: { color: "#083344" }, messageTextDeleted: { color: "#64748b", fontStyle: "italic" }, messageMeta: { flexDirection: "row", alignSelf: "flex-end", alignItems: "center", gap: 4, marginTop: 4 }, timeText: { color: "#64748b", fontSize: 10 }, timeTextOwn: { color: "#0e7490" }, editedText: { color: "#94a3b8", fontSize: 10 }, editedTextOwn: { color: "#0e7490" },
  reactionSummary: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 3 }, reactionSummaryOwn: { alignSelf: "flex-end" }, reactionPill: { minHeight: 23, flexDirection: "row", alignItems: "center", gap: 2, paddingHorizontal: 6, borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", backgroundColor: "#ffffff" }, reactionPillSelected: { borderColor: "#67e8f9", backgroundColor: "#ecfeff" }, reactionEmoji: { fontSize: 12 }, reactionCount: { color: "#475569", fontSize: 10, fontWeight: "800" }, typingBubble: { flexDirection: "row", alignSelf: "flex-start", alignItems: "center", gap: 7, marginTop: 3, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 15, backgroundColor: "#ffffff" }, typingDots: { flexDirection: "row", alignItems: "center", gap: 3 }, typingDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#0891b2" }, typingDotMiddle: { opacity: 0.55, transform: [{ translateY: -2 }] }, typingText: { color: "#64748b", fontSize: 12, fontStyle: "italic" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 36 }, emptyIcon: { width: 72, height: 72, alignItems: "center", justifyContent: "center", borderRadius: 24, backgroundColor: "#ecfeff" }, emptyTitle: { marginTop: 18, color: "#0f172a", fontSize: 18, fontWeight: "900" }, emptyText: { marginTop: 6, color: "#64748b", fontSize: 14, textAlign: "center" }, jumpButton: { position: "absolute", right: 18, bottom: 14, minWidth: 44, height: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingHorizontal: 10, borderRadius: 22, backgroundColor: "#0891b2", elevation: 4, shadowColor: "#0f172a", shadowOpacity: 0.16, shadowOffset: { width: 0, height: 2 }, shadowRadius: 5 }, jumpCount: { color: "#ffffff", fontSize: 11, fontWeight: "900" },
  attachmentMenu: { flexDirection: "row", gap: 10, marginHorizontal: 12, marginBottom: 8, padding: 8, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 16, backgroundColor: "#ffffff" }, attachmentAction: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 46, borderRadius: 12, backgroundColor: "#f8fafc" }, attachmentIcon: { width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: 10 }, photoIcon: { backgroundColor: "#ecfeff" }, fileActionIcon: { backgroundColor: "#f5f3ff" }, attachmentActionText: { color: "#334155", fontSize: 13, fontWeight: "800" }, editingBar: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1, borderTopColor: "#e2e8f0", backgroundColor: "#ecfeff" }, editingIndicator: { width: 3, height: 20, borderRadius: 2, backgroundColor: "#0891b2" }, editingText: { flex: 1, color: "#0e7490", fontSize: 13, fontWeight: "800" },
  composer: { minHeight: 62, flexDirection: "row", alignItems: "flex-end", gap: 7, paddingHorizontal: 10, paddingTop: 9, paddingBottom: 9, borderTopWidth: 1, borderTopColor: "#e2e8f0", backgroundColor: "#ffffff" }, composerAction: { width: 42, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: "#ecfeff" }, composerActionPressed: { opacity: 0.75, transform: [{ scale: 0.95 }] }, composerActionDisabled: { opacity: 0.5 }, composerInput: { flex: 1, minHeight: 44, maxHeight: 118, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: "#f1f5f9", color: "#0f172a", fontSize: 16, lineHeight: 21 }, sendButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: "#0891b2" }, sendButtonPressed: { opacity: 0.8, transform: [{ scale: 0.96 }] }, sendButtonDisabled: { opacity: 0.45 },
  actionLayer: { ...StyleSheet.absoluteFill, justifyContent: "flex-end", zIndex: 10 }, actionBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(15, 23, 42, 0.26)" }, actionSheet: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: "#ffffff" }, actionHandle: { alignSelf: "center", width: 36, height: 4, marginBottom: 12, borderRadius: 3, backgroundColor: "#cbd5e1" }, actionTitle: { color: "#0f172a", fontSize: 15, fontWeight: "900" }, reactionChooser: { flexDirection: "row", justifyContent: "space-between", gap: 4, marginTop: 12, marginBottom: 10, padding: 6, borderRadius: 16, backgroundColor: "#f8fafc" }, reactionChooserButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 14 }, reactionChooserEmoji: { fontSize: 22 }, actionRow: { minHeight: 50, flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: 1, borderTopColor: "#f1f5f9" }, actionRowText: { color: "#0f172a", fontSize: 15, fontWeight: "800" }, actionRowDanger: { color: "#dc2626" },
});
