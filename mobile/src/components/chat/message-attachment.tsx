import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import * as WebBrowser from "expo-web-browser";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import type { MessageAttachment } from "@/types/message";

interface MessageAttachmentProps {
  attachment: MessageAttachment;
  type: "image" | "file" | "audio";
  isOwnMessage: boolean;
}

const formatDuration = (seconds: number): string => {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
};

function VoiceNote({ attachment, isOwnMessage }: Omit<MessageAttachmentProps, "type">) {
  const player = useAudioPlayer(attachment.url);
  const status = useAudioPlayerStatus(player);
  const duration = attachment.duration ?? status.duration;

  const togglePlayback = (): void => {
    if (status.playing) {
      player.pause();
      return;
    }

    if (status.didJustFinish) {
      player.seekTo(0);
    }

    player.play();
  };

  return (
    <View style={styles.voiceRow}>
      <Pressable onPress={togglePlayback} style={[styles.playButton, isOwnMessage && styles.playButtonOwn]} accessibilityLabel={status.playing ? "Pause voice note" : "Play voice note"}>
        <Ionicons name={status.playing ? "pause" : "play"} size={18} color={isOwnMessage ? "#ffffff" : "#0e7490"} />
      </Pressable>
      <View style={styles.voiceBody}>
        <View style={styles.waveform}>
          {[8, 15, 11, 19, 13, 22, 10, 17, 9, 14, 20, 12].map((height, index) => (
            <View key={index} style={[styles.wave, { height }, isOwnMessage && styles.waveOwn]} />
          ))}
        </View>
        <Text style={[styles.duration, isOwnMessage && styles.durationOwn]}>{formatDuration(status.currentTime || duration || 0)} / {formatDuration(duration || 0)}</Text>
      </View>
    </View>
  );
}

export default function MessageAttachmentContent({ attachment, type, isOwnMessage }: MessageAttachmentProps) {
  if (type === "image") {
    return <Image source={{ uri: attachment.url }} style={styles.image} resizeMode="cover" accessibilityLabel={attachment.fileName} />;
  }

  if (type === "audio") {
    return <VoiceNote attachment={attachment} isOwnMessage={isOwnMessage} />;
  }

  const openFile = (): void => {
    void WebBrowser.openBrowserAsync(attachment.url);
  };

  return (
    <Pressable onPress={openFile} style={[styles.fileRow, isOwnMessage && styles.fileRowOwn]} accessibilityRole="link" accessibilityLabel={`Open ${attachment.fileName}`}>
      <View style={[styles.fileIcon, isOwnMessage && styles.fileIconOwn]}>
        <Ionicons name="document-text-outline" size={21} color={isOwnMessage ? "#0e7490" : "#ffffff"} />
      </View>
      <View style={styles.fileText}>
        <Text style={[styles.fileName, isOwnMessage && styles.fileNameOwn]} numberOfLines={2}>{attachment.fileName}</Text>
        <Text style={[styles.fileType, isOwnMessage && styles.fileTypeOwn]} numberOfLines={1}>{attachment.mimeType}</Text>
      </View>
      <Ionicons name="open-outline" size={18} color={isOwnMessage ? "#0e7490" : "#ffffff"} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  image: { width: 225, height: 225, borderRadius: 13, backgroundColor: "#e2e8f0" },
  voiceRow: { flexDirection: "row", alignItems: "center", minWidth: 214, gap: 10, paddingVertical: 2 },
  playButton: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 17, backgroundColor: "#ffffff" },
  playButtonOwn: { backgroundColor: "#0e7490" },
  voiceBody: { flex: 1 },
  waveform: { height: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 2 },
  wave: { width: 3, borderRadius: 2, backgroundColor: "#0e7490" },
  waveOwn: { backgroundColor: "#155e75" },
  duration: { marginTop: 3, color: "#64748b", fontSize: 10 },
  durationOwn: { color: "#0e7490" },
  fileRow: { flexDirection: "row", alignItems: "center", minWidth: 220, maxWidth: 250, gap: 10, padding: 9, borderRadius: 13, backgroundColor: "#0e7490" },
  fileRowOwn: { backgroundColor: "#a5f3fc" },
  fileIcon: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "#155e75" },
  fileIconOwn: { backgroundColor: "#ffffff" },
  fileText: { flex: 1, minWidth: 0 },
  fileName: { color: "#ffffff", fontSize: 13, fontWeight: "800" },
  fileNameOwn: { color: "#083344" },
  fileType: { marginTop: 2, color: "#cffafe", fontSize: 10 },
  fileTypeOwn: { color: "#0e7490" },
});
