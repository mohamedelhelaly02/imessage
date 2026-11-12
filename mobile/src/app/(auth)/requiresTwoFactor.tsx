import { Redirect } from "expo-router";

export default function RequiresTwoFactorRoute() {
  return <Redirect href="/(auth)/login" />;
}
