import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { AuthProvider } from "@/contexts/auth-context";

function RootNavigator() {
  return (
    <>
      <StatusBar style="light" />

      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade",
          contentStyle: {
            backgroundColor: "#020617",
          },
        }}
      >
        <Stack.Screen name="index" />

        <Stack.Screen
          name="(auth)"
          options={{
            animation: "fade",
          }}
        />

        <Stack.Screen
          name="(chat)"
          options={{
            animation: "slide_from_right",
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
