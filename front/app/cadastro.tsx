import React, { useState } from "react";
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "src/context/auth";
import { cadastrar } from "src/lib/api";

export default function Cadastro() {
  const navigation = useNavigation();
  const { signIn } = useAuth();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleCadastro() {
    if (!nome.trim() || !email.trim() || !senha) return setError("Preencha todos os campos");
    if (senha.length < 6) return setError("A senha precisa ter pelo menos 6 caracteres");
    if (senha !== confirmar) return setError("As senhas não conferem");

    try {
      setSubmitting(true);
      setError("");
      await cadastrar({ nome: nome.trim(), email: email.trim(), senha });
      await signIn(email.trim(), senha);
    } catch (cadastroError) {
      setError(cadastroError instanceof Error ? cadastroError.message : "Erro ao cadastrar");
      setSubmitting(false);
    }
  }

  return (
    <View className="flex-1 bg-white px-6 justify-center">
      <Text className="text-3xl font-bold text-blue-700">Criar conta</Text>
      <Text className="text-gray-500 mt-2 mb-8">Cadastre-se para reservar máquinas</Text>

      <TextInput
        value={nome}
        onChangeText={setNome}
        placeholder="Nome"
        className="border border-gray-300 rounded-2xl px-4 py-4 mb-4"
      />

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

      <TextInput
        value={confirmar}
        onChangeText={setConfirmar}
        placeholder="Confirmar senha"
        secureTextEntry
        className="border border-gray-300 rounded-2xl px-4 py-4 mb-4"
      />

      {error ? <Text className="text-red-600 mb-4">{error}</Text> : null}

      <TouchableOpacity
        onPress={handleCadastro}
        disabled={submitting}
        className="bg-blue-700 rounded-2xl py-4 items-center"
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-bold text-base">Cadastrar</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()} className="py-4 items-center">
        <Text className="text-blue-700">Já tenho conta — Entrar</Text>
      </TouchableOpacity>
    </View>
  );
}
