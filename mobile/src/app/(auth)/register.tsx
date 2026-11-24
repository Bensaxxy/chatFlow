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
import {
  registerSchema,
  type RegisterFormValues,
} from "@/lib/validations/auth";
import { registerMobileUser } from "@/services/auth.service";

export default function RegisterScreen() {
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: RegisterFormValues): Promise<void> => {
    const email = values.email.trim().toLowerCase();

    try {
      await registerMobileUser({
        name: values.name.trim(),
        email,
        password: values.password,
      });
      router.replace({ pathname: "/verify-email", params: { email, sent: "1" } });
    } catch (error) {
      Alert.alert("Could not create account", getApiErrorMessage(error));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color="#67e8f9" />
            <Text style={styles.backText}>Back to login</Text>
          </Pressable>

          <View style={styles.brandRow}>
            <View style={styles.logo}>
              <Ionicons name="chatbubbles" size={26} color="#082f49" />
            </View>
            <Text style={styles.brandName}>ChatFlow</Text>
          </View>

          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.description}>
            Set up your profile and start your first conversation.
          </Text>

          <View style={styles.form}>
            <View>
              <Text style={styles.label}>Name</Text>
              <Controller
                control={control}
                name="name"
                render={({ field }) => (
                  <TextInput
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="Your name"
                    placeholderTextColor="#64748b"
                    autoCapitalize="words"
                    autoComplete="name"
                    style={[styles.input, errors.name && styles.inputError]}
                  />
                )}
              />
              {errors.name && <Text style={styles.error}>{errors.name.message}</Text>}
            </View>

            <View>
              <Text style={styles.label}>Email address</Text>
              <Controller
                control={control}
                name="email"
                render={({ field }) => (
                  <TextInput
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="you@example.com"
                    placeholderTextColor="#64748b"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    style={[styles.input, errors.email && styles.inputError]}
                  />
                )}
              />
              {errors.email && <Text style={styles.error}>{errors.email.message}</Text>}
            </View>

            <View>
              <Text style={styles.label}>Password</Text>
              <Controller
                control={control}
                name="password"
                render={({ field }) => (
                  <View style={[styles.passwordField, errors.password && styles.inputError]}>
                    <TextInput
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      placeholder="At least 8 characters"
                      placeholderTextColor="#64748b"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="new-password"
                      style={styles.passwordInput}
                    />
                    <Pressable onPress={() => setShowPassword((current) => !current)} hitSlop={12}>
                      <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={21} color="#94a3b8" />
                    </Pressable>
                  </View>
                )}
              />
              {errors.password && <Text style={styles.error}>{errors.password.message}</Text>}
            </View>

            <View>
              <Text style={styles.label}>Confirm password</Text>
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field }) => (
                  <TextInput
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="Enter your password again"
                    placeholderTextColor="#64748b"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="new-password"
                    onSubmitEditing={() => void handleSubmit(onSubmit)()}
                    style={[styles.input, errors.confirmPassword && styles.inputError]}
                  />
                )}
              />
              {errors.confirmPassword && <Text style={styles.error}>{errors.confirmPassword.message}</Text>}
            </View>

            <Pressable
              onPress={() => void handleSubmit(onSubmit)()}
              disabled={isSubmitting}
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, isSubmitting && styles.buttonDisabled]}
            >
              <Text style={styles.buttonText}>{isSubmitting ? "Creating account..." : "Create account"}</Text>
              {!isSubmitting && <Ionicons name="arrow-forward" size={20} color="#082f49" />}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
  },

  keyboardView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 28,
  },

  backButton: {
    flexDirection: "row",
    alignSelf: "flex-start",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },

  backText: {
    color: "#67e8f9",
    fontSize: 14,
    fontWeight: "700",
  },

  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 26,
  },

  logo: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: "#67e8f9",
  },

  brandName: {
    color: "#67e8f9",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  title: {
    marginTop: 34,
    color: "#f8fafc",
    fontSize: 30,
    fontWeight: "900",
  },

  description: {
    marginTop: 10,
    color: "#94a3b8",
    fontSize: 15,
    lineHeight: 22,
  },

  form: {
    gap: 18,
    marginTop: 32,
  },

  label: {
    marginBottom: 8,
    color: "#cbd5e1",
    fontSize: 14,
    fontWeight: "700",
  },

  input: {
    minHeight: 54,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
    borderRadius: 17,
    backgroundColor: "#0f172a",
    color: "#f8fafc",
    fontSize: 16,
  },

  passwordField: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 16,
    paddingRight: 17,
    borderWidth: 1,
    borderColor: "#1e293b",
    borderRadius: 17,
    backgroundColor: "#0f172a",
  },

  passwordInput: {
    flex: 1,
    minHeight: 52,
    color: "#f8fafc",
    fontSize: 16,
  },

  inputError: {
    borderColor: "#fb7185",
  },

  error: {
    marginTop: 7,
    color: "#fda4af",
    fontSize: 13,
  },

  button: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
    borderRadius: 16,
    backgroundColor: "#67e8f9",
  },

  buttonText: {
    color: "#082f49",
    fontSize: 16,
    fontWeight: "900",
  },

  buttonPressed: {
    opacity: 0.75,
  },

  buttonDisabled: {
    opacity: 0.6,
  },
});
