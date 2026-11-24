import { zodResolver } from "@hookform/resolvers/zod";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { useEffect, useState } from "react";
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
import {
  verificationSchema,
  type VerificationFormValues,
} from "@/lib/validations/auth";
import {
  resendMobileVerificationCode,
  verifyMobileEmail,
} from "@/services/auth.service";

const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ email?: string; sent?: string }>();
  const [resendSeconds, setResendSeconds] = useState(
    params.sent === "1" ? RESEND_COOLDOWN_SECONDS : 0,
  );
  const [isResending, setIsResending] = useState(false);
  const {
    control,
    getValues,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VerificationFormValues>({
    resolver: zodResolver(verificationSchema),
    defaultValues: { email: params.email ?? "", code: "" },
  });

  useEffect(() => {
    if (resendSeconds <= 0) {
      return;
    }

    const intervalId = setInterval(() => {
      setResendSeconds((current) => Math.max(0, current - 1));
    }, 1_000);

    return () => clearInterval(intervalId);
  }, [resendSeconds]);

  const onSubmit = async (values: VerificationFormValues): Promise<void> => {
    try {
      await verifyMobileEmail(values);
      Alert.alert("Email verified", "You can now sign in to ChatFlow.", [
        { text: "Continue", onPress: () => router.replace("/login") },
      ]);
    } catch (error) {
      Alert.alert("Verification failed", getApiErrorMessage(error));
    }
  };

  const handleResend = async (): Promise<void> => {
    const email = getValues("email");

    if (!email.trim()) {
      Alert.alert("Email required", "Enter the email address you used to create your account.");
      return;
    }

    try {
      setIsResending(true);
      const message = await resendMobileVerificationCode(email);
      setResendSeconds(RESEND_COOLDOWN_SECONDS);
      Alert.alert("Code sent", message);
    } catch (error) {
      Alert.alert("Could not resend code", getApiErrorMessage(error));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color="#67e8f9" />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <View style={styles.icon}><Ionicons name="shield-checkmark-outline" size={34} color="#67e8f9" /></View>
          <Text style={styles.title}>Verify your email</Text>
          <Text style={styles.description}>Enter the six-digit code we sent to your inbox.</Text>

          <View style={styles.form}>
            <View>
              <Text style={styles.label}>Email address</Text>
              <Controller control={control} name="email" render={({ field }) => (
                <TextInput value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} placeholder="you@example.com" placeholderTextColor="#64748b" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} style={[styles.input, errors.email && styles.inputError]} />
              )} />
              {errors.email && <Text style={styles.error}>{errors.email.message}</Text>}
            </View>
            <View>
              <Text style={styles.label}>Verification code</Text>
              <Controller control={control} name="code" render={({ field }) => (
                <TextInput value={field.value} onChangeText={(value) => field.onChange(value.replace(/\D/g, "").slice(0, 6))} onBlur={field.onBlur} placeholder="000000" placeholderTextColor="#475569" keyboardType="number-pad" autoComplete="one-time-code" maxLength={6} style={[styles.codeInput, errors.code && styles.inputError]} />
              )} />
              {errors.code && <Text style={styles.error}>{errors.code.message}</Text>}
            </View>
            <Pressable onPress={() => void handleSubmit(onSubmit)()} disabled={isSubmitting || isResending} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, (isSubmitting || isResending) && styles.disabled]}>
              <Text style={styles.primaryText}>{isSubmitting ? "Verifying..." : "Verify email"}</Text>
            </Pressable>
          </View>

          <Text style={styles.resendPrompt}>Did not receive a code?</Text>
          <Pressable onPress={() => void handleResend()} disabled={isResending || isSubmitting || resendSeconds > 0} style={styles.resendButton}>
            <Ionicons name="refresh" size={17} color={resendSeconds > 0 ? "#64748b" : "#67e8f9"} />
            <Text style={[styles.resendText, resendSeconds > 0 && styles.resendTextDisabled]}>{isResending ? "Sending..." : resendSeconds > 0 ? `Resend in ${resendSeconds}s` : "Resend verification code"}</Text>
          </Pressable>
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
  icon: { width: 72, height: 72, alignItems: "center", justifyContent: "center", alignSelf: "center", marginTop: 42, borderRadius: 24, backgroundColor: "#083344" },
  title: { marginTop: 26, color: "#f8fafc", fontSize: 29, fontWeight: "900", textAlign: "center" },
  description: { marginTop: 10, color: "#94a3b8", fontSize: 15, lineHeight: 22, textAlign: "center" },
  form: { gap: 20, marginTop: 38 },
  label: { marginBottom: 8, color: "#cbd5e1", fontSize: 14, fontWeight: "700" },
  input: { minHeight: 54, paddingHorizontal: 16, borderWidth: 1, borderColor: "#1e293b", borderRadius: 17, backgroundColor: "#0f172a", color: "#f8fafc", fontSize: 16 },
  codeInput: { minHeight: 60, paddingHorizontal: 16, borderWidth: 1, borderColor: "#1e293b", borderRadius: 17, backgroundColor: "#0f172a", color: "#f8fafc", fontSize: 25, fontWeight: "900", letterSpacing: 9, textAlign: "center" },
  inputError: { borderColor: "#fb7185" },
  error: { marginTop: 7, color: "#fda4af", fontSize: 13 },
  primaryButton: { minHeight: 54, alignItems: "center", justifyContent: "center", borderRadius: 17, backgroundColor: "#67e8f9" },
  primaryText: { color: "#082f49", fontSize: 16, fontWeight: "900" },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.6 },
  resendPrompt: { marginTop: 28, color: "#94a3b8", fontSize: 14, textAlign: "center" },
  resendButton: { flexDirection: "row", alignSelf: "center", alignItems: "center", gap: 8, marginTop: 9, padding: 8 },
  resendText: { color: "#67e8f9", fontSize: 14, fontWeight: "800" },
  resendTextDisabled: { color: "#64748b" },
});
