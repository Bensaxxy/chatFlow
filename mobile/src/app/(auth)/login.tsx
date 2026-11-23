import { zodResolver } from "@hookform/resolvers/zod";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
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
import { Controller, useForm } from "react-hook-form";

import { loginSchema, type LoginFormValues } from "@/lib/validations/auth";
import { useAuth } from "@/contexts/auth-context";
import { getApiErrorCode, getApiErrorMessage } from "@/lib/api/errors";

export default function LoginScreen() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),

    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues): Promise<void> => {
    try {
      await login({
        email: values.email,
        password: values.password,
      });

      router.replace("/chats");
    } catch (error) {
      const errorCode = getApiErrorCode(error);

      if (errorCode === "EMAIL_NOT_VERIFIED") {
        router.push({
          pathname: "/verify-email",
          params: { email: values.email.trim().toLowerCase() },
        });

        return;
      }

      Alert.alert("Login failed", getApiErrorMessage(error));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandSection}>
            <View style={styles.logo}>
              <Ionicons name="chatbubbles" size={30} color="#082f49" />
            </View>

            <Text style={styles.brandName}>ChatFlow</Text>
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>Welcome back</Text>

            <Text style={styles.description}>
              Sign in to continue your conversations.
            </Text>
          </View>

          <View style={styles.form}>
            <View>
              <Text style={styles.label}>Email address</Text>

              <Controller
                control={control}
                name="email"
                render={({ field }) => (
                  <View
                    style={[
                      styles.inputContainer,
                      errors.email && styles.inputContainerError,
                    ]}
                  >
                    <Ionicons
                      name="mail-outline"
                      size={20}
                      color={errors.email ? "#fda4af" : "#64748b"}
                    />

                    <TextInput
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      placeholder="you@example.com"
                      placeholderTextColor="#475569"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="email"
                      textContentType="emailAddress"
                      returnKeyType="next"
                      style={styles.input}
                    />
                  </View>
                )}
              />

              {errors.email && (
                <Text style={styles.errorText}>{errors.email.message}</Text>
              )}
            </View>

            <View>
              <Text style={styles.label}>Password</Text>

              <Controller
                control={control}
                name="password"
                render={({ field }) => (
                  <View
                    style={[
                      styles.inputContainer,
                      errors.password && styles.inputContainerError,
                    ]}
                  >
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={errors.password ? "#fda4af" : "#64748b"}
                    />

                    <TextInput
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      placeholder="Enter your password"
                      placeholderTextColor="#475569"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="current-password"
                      textContentType="password"
                      returnKeyType="done"
                      onSubmitEditing={() => void handleSubmit(onSubmit)()}
                      style={styles.input}
                    />

                    <Pressable
                      onPress={() => setShowPassword((current) => !current)}
                      hitSlop={12}
                      accessibilityRole="button"
                      accessibilityLabel={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={21}
                        color="#64748b"
                      />
                    </Pressable>
                  </View>
                )}
              />

              {errors.password && (
                <Text style={styles.errorText}>{errors.password.message}</Text>
              )}
            </View>

            <Pressable
              onPress={() => router.push("/forgot-password")}
              style={styles.forgotButton}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </Pressable>

            <Pressable
              onPress={() => void handleSubmit(onSubmit)()}
              disabled={isSubmitting}
              style={({ pressed }) => [
                styles.loginButton,
                pressed && styles.loginButtonPressed,
                isSubmitting && styles.loginButtonDisabled,
              ]}
            >
              <Text style={styles.loginButtonText}>
                {isSubmitting ? "Signing in..." : "Sign in"}
              </Text>

              {!isSubmitting && (
                <Ionicons name="arrow-forward" size={20} color="#082f49" />
              )}
            </Pressable>
          </View>

          <View style={styles.registerRow}>
            <Text style={styles.registerPrompt}>
              Don&apos;t have an account?
            </Text>

            <Pressable onPress={() => router.push("/register")} hitSlop={8}>
              <Text style={styles.registerLink}>Create account</Text>
            </Pressable>
          </View>

          <Text style={styles.securityText}>
            Your conversations are protected by secure authentication.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#020617",
  },

  keyboardView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 32,
  },

  brandSection: {
    alignItems: "center",
  },

  logo: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: "#67e8f9",
    shadowColor: "#22d3ee",
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.25,
    shadowRadius: 22,
    elevation: 8,
  },

  brandName: {
    marginTop: 12,
    color: "#67e8f9",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.6,
  },

  header: {
    marginTop: 30,
    alignItems: "center",
  },

  title: {
    color: "#f8fafc",
    fontSize: 30,
    fontWeight: "900",
    textAlign: "center",
  },

  description: {
    marginTop: 9,
    color: "#94a3b8",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },

  form: {
    marginTop: 34,
    gap: 19,
  },

  label: {
    marginBottom: 9,
    color: "#cbd5e1",
    fontSize: 14,
    fontWeight: "700",
  },

  inputContainer: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
    borderRadius: 17,
    backgroundColor: "#0f172a",
  },

  inputContainerError: {
    borderColor: "#fb7185",
  },

  input: {
    flex: 1,
    paddingVertical: 14,
    color: "#f8fafc",
    fontSize: 16,
  },

  errorText: {
    marginTop: 7,
    color: "#fda4af",
    fontSize: 13,
  },

  forgotButton: {
    alignSelf: "flex-end",
    marginTop: -7,
  },

  forgotText: {
    color: "#67e8f9",
    fontSize: 14,
    fontWeight: "700",
  },

  loginButton: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    borderRadius: 17,
    backgroundColor: "#67e8f9",
    shadowColor: "#22d3ee",
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 7,
  },

  loginButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },

  loginButtonDisabled: {
    opacity: 0.6,
  },

  loginButtonText: {
    color: "#082f49",
    fontSize: 16,
    fontWeight: "900",
  },

  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
    marginTop: 28,
  },

  registerPrompt: {
    color: "#94a3b8",
    fontSize: 14,
  },

  registerLink: {
    color: "#67e8f9",
    fontSize: 14,
    fontWeight: "800",
  },

  securityText: {
    marginTop: 30,
    color: "#475569",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
});
