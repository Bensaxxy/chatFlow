import { Redirect, Stack } from "expo-router";

import FullScreenLoader from "@/components/common/full-screen-loader";
import { useAuth } from "@/contexts/auth-context";

export default function AuthLayout() {
  const { isAuthenticated, isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return <FullScreenLoader />;
  }

  if (isAuthenticated) {
    return <Redirect href="/chats" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: {
          backgroundColor: "#020617",
        },
      }}
    />
  );
}
