import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

export default function FullScreenLoader() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#67e8f9" />

      <Text style={styles.text}>Loading ChatFlow...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#020617",
  },

  text: {
    marginTop: 14,
    color: "#94a3b8",
    fontSize: 14,
  },
});
