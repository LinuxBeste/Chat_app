import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { useAuth } from "../lib/auth-context";

export function LoginScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    try {
      if (mode === "login") await login(email, password);
      else await register(username, email, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={s.card}>
        <Text style={s.title}>{mode === "login" ? "Welcome back" : "Create account"}</Text>
        <Text style={s.sub}>{mode === "login" ? "Sign in to continue" : "Register to get started"}</Text>

        {mode === "register" && (
          <TextInput
            style={s.input}
            placeholder="Username"
            placeholderTextColor="#5C6068"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        )}
        <TextInput
          style={s.input}
          placeholder="Email"
          placeholderTextColor="#5C6068"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={s.input}
          placeholder="Password"
          placeholderTextColor="#5C6068"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        {error ? <Text style={s.error}>{error}</Text> : null}
        <TouchableOpacity style={s.button} onPress={handleSubmit}>
          <Text style={s.buttonText}>{mode === "login" ? "Sign In" : "Create Account"}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setMode(mode === "login" ? "register" : "login")}>
          <Text style={s.switch}>
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <Text style={s.switchAccent}>{mode === "login" ? "Register" : "Sign in"}</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0E1116", padding: 24 },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#181B22",
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "#2A2F3A",
    padding: 32,
  },
  title: { fontSize: 20, fontWeight: "600", color: "#F0F0F0", marginBottom: 4 },
  sub: { fontSize: 14, color: "#8B8F96", marginBottom: 24 },
  input: {
    width: "100%",
    height: 44,
    backgroundColor: "#0E1116",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2A2F3A",
    paddingHorizontal: 16,
    color: "#F0F0F0",
    fontSize: 14,
    marginBottom: 12,
  },
  button: {
    width: "100%",
    height: 44,
    backgroundColor: "#4850BB",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  error: { color: "#EF4444", fontSize: 13, marginBottom: 8 },
  switch: { color: "#8B8F96", fontSize: 13, textAlign: "center", marginTop: 24 },
  switchAccent: { color: "#4850BB" },
});
