import { ActivityIndicator, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function FullScreenLoader() {
  return (
    <SafeAreaView style={styles.container}>
      <ActivityIndicator size="large" color="#67e8f9" />

      <Text style={styles.text}>Loading ChatFlow...</Text>
    </SafeAreaView>
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
