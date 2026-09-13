import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from 'src/context/auth';
import { updateUsuario } from 'src/lib/api';
import { saveUser } from 'src/lib/auth';

export default function MeusDados() {
  const navigation = useNavigation();
  const { user, token } = useAuth();
  const [nome, setNome] = useState(user?.nome ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [loading, setLoading] = useState(false);

  // Modal de troca de senha
  const [modalSenha, setModalSenha] = useState(false);
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmaSenha, setConfirmaSenha] = useState('');
  const [loadingSenha, setLoadingSenha] = useState(false);

  async function handleSalvar() {
    if (!user || !token) return;
    setLoading(true);
    try {
      const atualizado = await updateUsuario(user.usuario_id, {
        nome: nome || undefined,
        email: email || undefined,
      }, token);
      await saveUser({ ...atualizado, token: user.token });
      Alert.alert('Sucesso', 'Dados atualizados com sucesso!');
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível atualizar.');
    } finally {
      setLoading(false);
    }
  }

  async function handleTrocarSenha() {
    if (!novaSenha || !confirmaSenha) {
      Alert.alert('Atenção', 'Preencha os dois campos.');
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
      const atualizado = await updateUsuario(user.usuario_id, { senha: novaSenha }, token);
      await saveUser({ ...atualizado, token: user.token });
      setModalSenha(false);
      setNovaSenha('');
      setConfirmaSenha('');
      Alert.alert('Sucesso', 'Senha alterada com sucesso!');
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível alterar a senha.');
    } finally {
      setLoadingSenha(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ paddingBottom: 32 }}>
      <View className="bg-[#1565C0] pt-12 pb-6 px-5">
        <TouchableOpacity onPress={() => navigation.goBack()} className="flex-row items-center mb-4">
          <Ionicons name="arrow-back" size={22} color="white" />
          <Text className="text-white ml-2 font-semibold">Meus Dados</Text>
        </TouchableOpacity>
      </View>

      <View className="px-4 mt-6">
        <View className="items-center mb-6">
          <View className="w-20 h-20 bg-blue-100 rounded-full items-center justify-center">
            <Ionicons name="person" size={40} color="#1d4ed8" />
          </View>
        </View>

        <Text className="text-gray-500 text-sm mb-1">Nome</Text>
        <TextInput
          className="border border-gray-200 rounded-xl px-4 py-3 mb-4 text-gray-800 bg-gray-50"
          value={nome}
          onChangeText={setNome}
          placeholder="Seu nome"
        />

        <Text className="text-gray-500 text-sm mb-1">E-mail</Text>
        <TextInput
          className="border border-gray-200 rounded-xl px-4 py-3 mb-6 text-gray-800 bg-gray-50"
          value={email}
          onChangeText={setEmail}
          placeholder="seu@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TouchableOpacity
          onPress={handleSalvar}
          disabled={loading}
          className="bg-[#1565C0] rounded-2xl py-4 items-center mb-3"
        >
          {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-base">Salvar alterações</Text>}
        </TouchableOpacity>

        {/* Botão trocar senha */}
        <TouchableOpacity
          onPress={() => setModalSenha(true)}
          className="border-2 border-[#1565C0] rounded-2xl py-4 items-center"
        >
          <Text className="text-[#1565C0] font-bold text-base">Trocar senha</Text>
        </TouchableOpacity>
      </View>

      {/* Modal de troca de senha */}
      <Modal visible={modalSenha} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#1f2937' }}>Trocar senha</Text>
              <TouchableOpacity onPress={() => { setModalSenha(false); setNovaSenha(''); setConfirmaSenha(''); }}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text style={{ color: '#6b7280', fontSize: 13, marginBottom: 6 }}>Nova senha</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14, color: '#1f2937', backgroundColor: '#f9fafb', fontSize: 15 }}
              placeholder="Mínimo 6 caracteres"
              secureTextEntry
              value={novaSenha}
              onChangeText={setNovaSenha}
            />

            <Text style={{ color: '#6b7280', fontSize: 13, marginBottom: 6 }}>Confirmar nova senha</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 20, color: '#1f2937', backgroundColor: '#f9fafb', fontSize: 15 }}
              placeholder="Repita a nova senha"
              secureTextEntry
              value={confirmaSenha}
              onChangeText={setConfirmaSenha}
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => { setModalSenha(false); setNovaSenha(''); setConfirmaSenha(''); }}
                style={{ flex: 1, borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 16, paddingVertical: 14, alignItems: 'center' }}
              >
                <Text style={{ color: '#6b7280', fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleTrocarSenha}
                disabled={loadingSenha}
                style={{ flex: 1, backgroundColor: '#1565C0', borderRadius: 16, paddingVertical: 14, alignItems: 'center' }}
              >
                {loadingSenha ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: 'bold' }}>Confirmar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
