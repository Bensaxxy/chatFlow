import { Ionicons } from "@expo/vector-icons";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { useState } from "react";
import { ActivityIndicator, Alert, Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import type { MobileAttachmentInput } from "@/services/message.service";

interface VoiceNoteRecorderProps {
  disabled?: boolean;
  hidden?: boolean;
  onRecordingChange: (isRecording: boolean) => void;
  onRecorded: (attachment: MobileAttachmentInput) => void;
}

const formatDuration = (durationMillis: number): string => {
  const seconds = Math.floor(durationMillis / 1_000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};

export default function VoiceNoteRecorder({ disabled = false, hidden = false, onRecordingChange, onRecorded }: VoiceNoteRecorderProps) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 200);
  const [isRecording, setIsRecording] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [pulse] = useState(() => new Animated.Value(1));

  const setRecordingState = (nextValue: boolean): void => {
    setIsRecording(nextValue);
    onRecordingChange(nextValue);

    if (nextValue) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.16, duration: 700, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        ]),
      ).start();
    } else {
      pulse.stopAnimation();
      pulse.setValue(1);
    }
  };

  const startRecording = async (): Promise<void> => {
    if (disabled || isPreparing) {
      return;
    }

    try {
      setIsPreparing(true);
      const permission = await requestRecordingPermissionsAsync();

      if (!permission.granted) {
        Alert.alert("Microphone permission", "Allow microphone access to record a voice note.");
        return;
      }

      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecordingState(true);
    } catch {
      Alert.alert("Could not record", "ChatFlow could not start the voice recording. Please try again.");
    } finally {
      setIsPreparing(false);
    }
  };

  const finishRecording = async (shouldSend: boolean): Promise<void> => {
    if (!isRecording) {
      return;
    }

    try {
      await recorder.stop();
      const uri = recorder.uri;

      if (shouldSend && uri) {
        const isWebRecording = Platform.OS === "web";

        onRecorded({
          uri,
          fileName: `voice-note-${Date.now()}.${isWebRecording ? "webm" : "m4a"}`,
          mimeType: isWebRecording ? "audio/webm" : "audio/mp4",
        });
      }
    } catch {
      Alert.alert("Could not save recording", "Please record the voice note again.");
    } finally {
      await setAudioModeAsync({ allowsRecording: false });
      setRecordingState(false);
    }
  };

  if (!isRecording && hidden) {
    return null;
  }

  if (!isRecording) {
    return (
      <Pressable onPress={() => void startRecording()} disabled={disabled || isPreparing} style={({ pressed }) => [styles.microphoneButton, pressed && styles.pressed, (disabled || isPreparing) && styles.disabled]} accessibilityLabel="Record voice note">
        {isPreparing ? <ActivityIndicator size="small" color="#0e7490" /> : <Ionicons name="mic-outline" size={22} color="#0e7490" />}
      </Pressable>
    );
  }

  return (
    <View style={styles.recordingPanel}>
      <Pressable onPress={() => void finishRecording(false)} style={styles.cancelButton} accessibilityLabel="Cancel voice recording">
        <Ionicons name="trash-outline" size={20} color="#dc2626" />
      </Pressable>
      <View style={styles.recordingStatus}>
        <Animated.View style={[styles.recordingDot, { transform: [{ scale: pulse }] }]} />
        <Text style={styles.recordingText}>Recording {formatDuration(recorderState.durationMillis)}</Text>
      </View>
      <Pressable onPress={() => void finishRecording(true)} style={styles.sendButton} accessibilityLabel="Send voice note">
        <Ionicons name="send" size={18} color="#ffffff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  microphoneButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: "#ecfeff" },
  recordingPanel: { flex: 1, minHeight: 44, flexDirection: "row", alignItems: "center", gap: 10, paddingLeft: 2 },
  cancelButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 20, backgroundColor: "#fff1f2" },
  recordingStatus: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  recordingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#ef4444" },
  recordingText: { color: "#0f172a", fontSize: 14, fontWeight: "800" },
  sendButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: "#0891b2" },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.5 },
});
