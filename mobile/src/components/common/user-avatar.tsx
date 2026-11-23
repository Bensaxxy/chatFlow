import { Image, StyleSheet, Text, View } from "react-native";

interface UserAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: number;
}

const getInitials = (name: string): string =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "CF";

export default function UserAvatar({
  name,
  avatarUrl,
  size = 48,
}: UserAvatarProps) {
  const avatarStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  if (avatarUrl) {
    return <Image source={{ uri: avatarUrl }} style={avatarStyle} />;
  }

  return (
    <View style={[styles.fallback, avatarStyle]}>
      <Text style={[styles.initials, { fontSize: Math.max(12, size * 0.32) }]}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#cffafe",
  },
  initials: {
    color: "#0e7490",
    fontWeight: "900",
  },
});
