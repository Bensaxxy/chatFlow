import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type AppTab = "chats" | "status" | "friends" | "profile";

interface AppTabBarProps {
  activeTab: AppTab;
}

const tabs: {
  id: AppTab;
  label: string;
  route: "/chats" | "/status" | "/friends" | "/profile";
  icon: ComponentProps<typeof Ionicons>["name"];
  activeIcon: ComponentProps<typeof Ionicons>["name"];
}[] = [
  {
    id: "chats",
    label: "Chats",
    route: "/chats",
    icon: "chatbubbles-outline",
    activeIcon: "chatbubbles",
  },
  {
    id: "status",
    label: "Status",
    route: "/status",
    icon: "radio-button-on-outline",
    activeIcon: "radio-button-on",
  },
  {
    id: "friends",
    label: "Friends",
    route: "/friends",
    icon: "people-outline",
    activeIcon: "people",
  },
  {
    id: "profile",
    label: "Profile",
    route: "/profile",
    icon: "person-circle-outline",
    activeIcon: "person-circle",
  },
];

export default function AppTabBar({ activeTab }: AppTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.shell, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;

          return (
            <Pressable
              key={tab.id}
              onPress={() => {
                if (!isActive) {
                  router.replace(tab.route);
                }
              }}
              style={({ pressed }) => [
                styles.tab,
                isActive && styles.tabActive,
                pressed && !isActive && styles.tabPressed,
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab.label}
            >
              <Ionicons
                name={isActive ? tab.activeIcon : tab.icon}
                size={21}
                color={isActive ? "#0e7490" : "#64748b"}
              />

              <Text style={[styles.label, isActive && styles.labelActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  tabBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
  },
  tab: {
    minWidth: 64,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingVertical: 7,
    borderRadius: 15,
  },
  tabActive: {
    backgroundColor: "#ecfeff",
  },
  tabPressed: {
    backgroundColor: "#f1f5f9",
  },
  label: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "700",
  },
  labelActive: {
    color: "#0e7490",
    fontWeight: "900",
  },
});
