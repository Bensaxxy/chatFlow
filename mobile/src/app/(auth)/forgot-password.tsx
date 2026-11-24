import { zodResolver } from "@hookform/resolvers/zod";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getApiErrorMessage } from "@/lib/api/errors";
import { emailSchema, type EmailFormValues } from "@/lib/validations/auth";
import { requestMobilePasswordReset } from "@/services/auth.service";

export default function ForgotPasswordScreen() {
  const [isSent, setIsSent] = useState(false);
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: EmailFormValues): Promise<void> => {
    try {
      await requestMobilePasswordReset(values.email);
      setIsSent(true);
    } catch (error) {
      Alert.alert("Could not send reset link", getApiErrorMessage(error));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color="#67e8f9" />
            <Text style={styles.backText}>Back to login</Text>
          </Pressable>
          <View style={styles.icon}><Ionicons name="key-outline" size={33} color="#67e8f9" /></View>
          <Text style={styles.title}>Reset your password</Text>
          <Text style={styles.description}>We will email you a secure link to create a new password.</Text>

          {isSent ? (
            <View style={styles.sentCard}>
              <Ionicons name="checkmark-circle" size={22} color="#6ee7b7" />
              <Text style={styles.sentText}>If an account matches that email, the reset link is on its way. Check your inbox and spam folder.</Text>
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.label}>Email address</Text>
              <Controller control={control} name="email" render={({ field }) => (
                <TextInput value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} placeholder="you@example.com" placeholderTextColor="#64748b" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" style={[styles.input, errors.email && styles.inputError]} />
              )} />
              {errors.email && <Text style={styles.error}>{errors.email.message}</Text>}
              <Pressable onPress={() => void handleSubmit(onSubmit)()} disabled={isSubmitting} style={({ pressed }) => [styles.button, pressed && styles.pressed, isSubmitting && styles.disabled]}>
                <Text style={styles.buttonText}>{isSubmitting ? "Sending link..." : "Email reset link"}</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#020617" },
  keyboardView: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 28 },
  backButton: { flexDirection: "row", alignSelf: "flex-start", alignItems: "center", gap: 8, paddingVertical: 8 },
  backText: { color: "#67e8f9", fontSize: 14, fontWeight: "700" },
  icon: { width: 72, height: 72, alignItems: "center", justifyContent: "center", alignSelf: "center", marginTop: 50, borderRadius: 24, backgroundColor: "#083344" },
  title: { marginTop: 26, color: "#f8fafc", fontSize: 29, fontWeight: "900", textAlign: "center" },
  description: { marginTop: 10, color: "#94a3b8", fontSize: 15, lineHeight: 22, textAlign: "center" },
  form: { marginTop: 38 },
  label: { marginBottom: 8, color: "#cbd5e1", fontSize: 14, fontWeight: "700" },
  input: { minHeight: 54, paddingHorizontal: 16, borderWidth: 1, borderColor: "#1e293b", borderRadius: 17, backgroundColor: "#0f172a", color: "#f8fafc", fontSize: 16 },
  inputError: { borderColor: "#fb7185" },
  error: { marginTop: 7, color: "#fda4af", fontSize: 13 },
  button: { minHeight: 54, alignItems: "center", justifyContent: "center", marginTop: 22, borderRadius: 17, backgroundColor: "#67e8f9" },
  buttonText: { color: "#082f49", fontSize: 16, fontWeight: "900" },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.6 },
  sentCard: { flexDirection: "row", gap: 11, marginTop: 36, padding: 18, borderWidth: 1, borderColor: "#134e4a", borderRadius: 18, backgroundColor: "#052e2b" },
  sentText: { flex: 1, color: "#d1fae5", fontSize: 14, lineHeight: 21 },
});
