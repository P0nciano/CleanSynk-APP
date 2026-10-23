import React, { useState } from "react";
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "src/context/auth";
import TelaEntrada, { estiloCampo } from "src/components/TelaEntrada";

export default function Login() {
  const navigation = useNavigation();
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
    <TelaEntrada titulo="Entrar" subtitulo="Acesse sua conta para reservar máquinas">

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="E-mail"
        accessibilityLabel="E-mail"
        autoCapitalize="none"
        keyboardType="email-address"
        className={estiloCampo}
        placeholderTextColor="#9ca3af"
      />

      <TextInput
        value={senha}
        onChangeText={setSenha}
        placeholder="Senha"
        accessibilityLabel="Senha"
        secureTextEntry
        className={estiloCampo}
        placeholderTextColor="#9ca3af"
      />

      {error ? <Text className="text-red-600 mb-3">{error}</Text> : null}

      <TouchableOpacity
        onPress={handleLogin}
        disabled={submitting}
        className="bg-blue-700 rounded-xl py-4 items-center mt-1"
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-bold text-base">Entrar</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Cadastro" as never)} className="pt-4 items-center">
        <Text className="text-blue-700 font-semibold">Não tem conta? Cadastre-se</Text>
      </TouchableOpacity>
    </TelaEntrada>
  );
}