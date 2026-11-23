import { Redirect } from "expo-router";

import FullScreenLoader from "@/components/common/full-screen-loader";
import { useAuth } from "@/contexts/auth-context";

export default function IndexScreen() {
  const { isAuthenticated, isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return <FullScreenLoader />;
  }

  return <Redirect href={isAuthenticated ? "/chats" : "/login"} />;
}
