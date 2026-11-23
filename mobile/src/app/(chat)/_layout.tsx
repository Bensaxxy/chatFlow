import { Redirect, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import FullScreenLoader from "@/components/common/full-screen-loader";
import { useAuth } from "@/contexts/auth-context";

export default function ChatLayout() {
  const { isAuthenticated, isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return <FullScreenLoader />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: {
          backgroundColor: "#f8fafc",
        },
      }}
      />
    </>
  );
}
