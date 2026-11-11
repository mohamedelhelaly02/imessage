import { StyleSheet, View, Text } from "react-native";

export default function RequiresTwoFactorRoute() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Two Factor page</Text>
      <Text style={styles.message}>Welcome.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#F5F8FC",
  },
  title: {
    color: "#12213A",
    fontSize: 30,
    fontWeight: "700",
  },
  message: {
    color: "#607089",
    fontSize: 16,
    marginTop: 8,
  },
});
