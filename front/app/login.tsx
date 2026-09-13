import React, { useState } from "react";
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useAuth } from "src/context/auth";

export default function Login() {
  const { signIn, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return null;
  }

  async function handleLogin() {
    try {
      setSubmitting(true);
      setError("");
      await signIn(email.trim(), senha);
    } catch (loginError) {
      const message = loginError instanceof Error ? loginError.message : "Erro ao realizar login";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View className="flex-1 bg-white px-6 justify-center">
      <Text className="text-3xl font-bold text-blue-700">CleanSynk</Text>
      <Text className="text-gray-500 mt-2 mb-8">Entre para acessar sua conta</Text>

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="E-mail"
        autoCapitalize="none"
        keyboardType="email-address"
        className="border border-gray-300 rounded-2xl px-4 py-4 mb-4"
      />

      <TextInput
        value={senha}
        onChangeText={setSenha}
        placeholder="Senha"
        secureTextEntry
        className="border border-gray-300 rounded-2xl px-4 py-4 mb-4"
      />

      {error ? <Text className="text-red-600 mb-4">{error}</Text> : null}

      <TouchableOpacity
        onPress={handleLogin}
        disabled={submitting}
        className="bg-blue-700 rounded-2xl py-4 items-center"
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-bold text-base">Entrar</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}