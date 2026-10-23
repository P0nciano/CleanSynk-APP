import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from 'src/context/auth';
import { updateUsuario } from 'src/lib/api';
import CabecalhoTela from 'src/components/CabecalhoTela';

function Campo({ rotulo, ...props }: { rotulo: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View className="mb-4">
      <Text className="text-gray-500 text-sm mb-1">{rotulo}</Text>
      <TextInput
        className="border border-gray-200 rounded-xl px-4 py-3 text-gray-900 bg-white"
        placeholderTextColor="#9ca3af"
        accessibilityLabel={rotulo}
        {...props}
      />
    </View>
  );
}

export default function MeusDados() {
  const insets = useSafeAreaInsets();
  const { user, token, atualizarUsuario } = useAuth();
  const [nome, setNome] = useState(user?.nome ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [loading, setLoading] = useState(false);

  // Modal de troca de senha
  const [modalSenha, setModalSenha] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmaSenha, setConfirmaSenha] = useState('');
  const [loadingSenha, setLoadingSenha] = useState(false);

  function fecharModal() {
    setModalSenha(false);
    setSenhaAtual('');
    setNovaSenha('');
    setConfirmaSenha('');
  }

  async function handleSalvar() {
    if (!user || !token) return;
    if (!nome.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      Alert.alert('Atenção', 'Preencha o nome e um e-mail válido.');
      return;
    }
    setLoading(true);
    try {
      const atualizado = await updateUsuario(user.usuario_id, { nome: nome.trim(), email: email.trim() }, token);
      await atualizarUsuario({ ...atualizado, token: user.token });
      Alert.alert('Sucesso', 'Dados atualizados com sucesso!');
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível atualizar.');
    } finally {
      setLoading(false);
    }
  }

  async function handleTrocarSenha() {
    if (!senhaAtual || !novaSenha || !confirmaSenha) {
      Alert.alert('Atenção', 'Preencha os três campos.');
      return;
    }
    if (novaSenha !== confirmaSenha) {
      Alert.alert('Atenção', 'As senhas não coincidem.');
      return;
    }
    if (novaSenha.length < 6) {
      Alert.alert('Atenção', 'A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (!user || !token) return;
    setLoadingSenha(true);
    try {
      await updateUsuario(user.usuario_id, { senha: novaSenha, senha_atual: senhaAtual }, token);
      fecharModal();
      Alert.alert('Sucesso', 'Senha alterada com sucesso!');
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível alterar a senha.');
    } finally {
      setLoadingSenha(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-[#f5f7fb]" contentContainerStyle={{ paddingBottom: 32 }}>
      <CabecalhoTela titulo="Meus dados" />

      <View className="items-center mt-6 mb-5">
        <View className="w-20 h-20 bg-blue-100 rounded-full items-center justify-center">
          <Ionicons name="person" size={38} color="#1d4ed8" />
        </View>
      </View>

      <View className="mx-4 bg-white border border-gray-200 rounded-2xl p-5">
        <Campo rotulo="Nome" value={nome} onChangeText={setNome} placeholder="Seu nome" />
        <Campo rotulo="E-mail" value={email} onChangeText={setEmail} placeholder="seu@email.com" keyboardType="email-address" autoCapitalize="none" />

        <TouchableOpacity onPress={handleSalvar} disabled={loading} className="bg-blue-700 rounded-xl py-3.5 items-center mt-1">
          {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-base">Salvar alterações</Text>}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={() => setModalSenha(true)}
        className="mx-4 mt-3 bg-white border border-gray-200 rounded-2xl px-3 py-3 flex-row items-center justify-between"
      >
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center">
            <Ionicons name="lock-closed-outline" size={20} color="#1d4ed8" />
          </View>
          <Text className="text-gray-900 font-semibold text-base">Trocar senha</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
      </TouchableOpacity>

      {/* Modal de troca de senha */}
      <Modal visible={modalSenha} animationType="slide" transparent onRequestClose={fecharModal}>
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-3xl p-6" style={{ paddingBottom: insets.bottom + 24 }}>
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-gray-900 font-bold text-lg">Trocar senha</Text>
              <TouchableOpacity onPress={fecharModal} accessibilityLabel="Fechar">
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Campo rotulo="Senha atual" value={senhaAtual} onChangeText={setSenhaAtual} placeholder="Sua senha de agora" secureTextEntry />
            <Campo rotulo="Nova senha" value={novaSenha} onChangeText={setNovaSenha} placeholder="Mínimo 6 caracteres" secureTextEntry />
            <Campo rotulo="Confirmar nova senha" value={confirmaSenha} onChangeText={setConfirmaSenha} placeholder="Repita a nova senha" secureTextEntry />

            <View className="flex-row gap-3 mt-1">
              <TouchableOpacity onPress={fecharModal} className="flex-1 border border-gray-200 rounded-xl py-3.5 items-center">
                <Text className="text-gray-600 font-semibold">Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleTrocarSenha} disabled={loadingSenha} className="flex-1 bg-blue-700 rounded-xl py-3.5 items-center">
                {loadingSenha ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold">Confirmar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
