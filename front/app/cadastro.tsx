import React, { useState } from "react";
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "src/context/auth";
import TelaEntrada, { estiloCampo } from "src/components/TelaEntrada";
import { cadastrar } from "src/lib/api";

export default function Cadastro() {
  const navigation = useNavigation();
  const { signIn } = useAuth();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [tipo, setTipo] = useState<"USER" | "ADMIN">("USER");
  const [codigoAdmin, setCodigoAdmin] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleCadastro() {
    if (!nome.trim() || !email.trim() || !senha) return setError("Preencha todos os campos");
    if (senha.length < 6) return setError("A senha precisa ter pelo menos 6 caracteres");
    if (senha !== confirmar) return setError("As senhas não conferem");
    if (tipo === "ADMIN" && !codigoAdmin.trim()) return setError("Informe o código de administrador");

    try {
      setSubmitting(true);
      setError("");
      await cadastrar({ nome: nome.trim(), email: email.trim(), senha, tipo, codigo_admin: tipo === "ADMIN" ? codigoAdmin.trim() : undefined });
      await signIn(email.trim(), senha);
    } catch (cadastroError) {
      setError(cadastroError instanceof Error ? cadastroError.message : "Erro ao cadastrar");
      setSubmitting(false);
    }
  }

  return (
    <TelaEntrada titulo="Criar conta" subtitulo="Cadastre-se para reservar máquinas">

      <View className="flex-row bg-slate-100 rounded-xl p-1 mb-4">
        {([["USER", "Cliente"], ["ADMIN", "Administrador"]] as const).map(([valor, rotulo]) => (
          <TouchableOpacity
            key={valor}
            onPress={() => setTipo(valor)}
            accessibilityRole="radio"
            accessibilityState={{ selected: tipo === valor }}
            className={`flex-1 py-2.5 rounded-lg items-center ${tipo === valor ? "bg-white" : ""}`}
          >
            <Text className={`font-semibold ${tipo === valor ? "text-blue-700" : "text-gray-600"}`}>{rotulo}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        value={nome}
        onChangeText={setNome}
        placeholder="Nome"
        accessibilityLabel="Nome"
        className={estiloCampo}
        placeholderTextColor="#9ca3af"
      />

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

      <TextInput
        value={confirmar}
        onChangeText={setConfirmar}
        placeholder="Confirmar senha"
        accessibilityLabel="Confirmar senha"
        secureTextEntry
        className={estiloCampo}
        placeholderTextColor="#9ca3af"
      />

      {tipo === "ADMIN" && (
        <TextInput
          value={codigoAdmin}
          onChangeText={setCodigoAdmin}
          placeholder="Código de administrador"
        accessibilityLabel="Código de administrador"
          autoCapitalize="none"
          secureTextEntry
          className={estiloCampo}
        placeholderTextColor="#9ca3af"
        />
      )}

      {error ? <Text className="text-red-600 mb-3">{error}</Text> : null}

      <TouchableOpacity
        onPress={handleCadastro}
        disabled={submitting}
        className="bg-blue-700 rounded-xl py-4 items-center mt-1"
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-bold text-base">Cadastrar</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()} className="pt-4 items-center">
        <Text className="text-blue-700 font-semibold">Já tenho conta — Entrar</Text>
      </TouchableOpacity>
    </TelaEntrada>
  );
}
