import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { criarReserva } from 'src/lib/api';
import { useAuth } from 'src/context/auth';

const METODOS = [
  { id: 'pix', label: 'Pix', sublabel: 'Pagamento instantâneo', icon: 'flash-outline' },
  { id: 'cartao', label: 'Cartão de Crédito', sublabel: '4 x sem juros', icon: 'card-outline' },
];

export default function Pagamento() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<any>();
  const { lavanderia, maquina, programa, valor } = route.params;
  const { user } = useAuth();
  console.log("USER:", user);

  const [metodoPagamento, setMetodoPagamento] = useState('pix');
  const [loading, setLoading] = useState(false);

  const desconto = 0;
  const total = valor - desconto;

  const LABEL_PROGRAMA: Record<string, string> = { lava_seca: 'Lava e Seca', secagem: 'Secagem' };

  async function handlePagar() {
  console.log("USER AO PAGAR:", user);

  if (!user) {
    Alert.alert("Erro", "Usuário não está logado");
    return;
  }
    setLoading(true);
    try {
      const agora = new Date();
      const fim = new Date(agora.getTime() + 45 * 60 * 1000);
      await criarReserva(
  {
    maquina_id: maquina.maquina_id,
    usuario_id: user.usuario_id,
    data_inicio: agora.toISOString(),
    data_fim: fim.toISOString(),
    status: "ATIVA",
  },
  user.token
);
      navigation.navigate('StatusLavagem', { lavanderia, maquina, programa, valor: total });
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível criar a reserva.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ paddingBottom: 32 }}>
      <View className="bg-[#1565C0] pt-12 pb-6 px-5">
        <TouchableOpacity onPress={() => navigation.goBack()} className="flex-row items-center mb-4">
          <Ionicons name="arrow-back" size={22} color="white" />
          <Text className="text-white ml-2 font-semibold">Pagamento</Text>
        </TouchableOpacity>
      </View>

      {/* Resumo */}
      <View className="mx-4 mt-4 bg-blue-50 rounded-2xl p-4">
        <Text className="text-gray-800 font-bold text-base mb-3">Resumo</Text>
        <View className="flex-row justify-between mb-1">
          <Text className="text-gray-500 text-sm">Lavanderia</Text>
          <Text className="text-gray-700 text-sm font-semibold">{lavanderia.nome}</Text>
        </View>
        <View className="flex-row justify-between mb-1">
          <Text className="text-gray-500 text-sm">Máquina</Text>
          <Text className="text-gray-700 text-sm font-semibold">Máquina {String(maquina.numero).padStart(2, '0')}</Text>
        </View>
        <View className="flex-row justify-between mb-1">
          <Text className="text-gray-500 text-sm">Programa</Text>
          <Text className="text-gray-700 text-sm font-semibold">{LABEL_PROGRAMA[programa] ?? programa}</Text>
        </View>
        <View className="flex-row justify-between mb-1">
          <Text className="text-gray-500 text-sm">Subtotal</Text>
          <Text className="text-gray-700 text-sm">R$ {valor.toFixed(2)}</Text>
        </View>
        {desconto > 0 && (
          <View className="flex-row justify-between mb-1">
            <Text className="text-gray-500 text-sm">Desconto (30%)</Text>
            <Text className="text-green-600 text-sm">-R$ {desconto.toFixed(2)}</Text>
          </View>
        )}
        <View className="border-t border-gray-200 mt-2 pt-2 flex-row justify-between">
          <Text className="text-gray-800 font-bold">Total</Text>
          <Text className="text-blue-700 font-bold text-lg">R$ {total.toFixed(2)}</Text>
        </View>
      </View>

      {/* Forma de pagamento */}
      <View className="mx-4 mt-4">
        <Text className="text-gray-800 font-bold text-base mb-3">Forma de pagamento</Text>
        {METODOS.map((m) => (
          <TouchableOpacity
            key={m.id}
            onPress={() => setMetodoPagamento(m.id)}
            className={`flex-row items-center p-4 rounded-2xl mb-2 border-2 ${metodoPagamento === m.id ? 'border-blue-700 bg-blue-50' : 'border-gray-100 bg-gray-50'}`}
          >
            <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${metodoPagamento === m.id ? 'bg-blue-700' : 'bg-gray-200'}`}>
              <Ionicons name={m.icon as any} size={20} color={metodoPagamento === m.id ? 'white' : '#6b7280'} />
            </View>
            <View className="flex-1">
              <Text className="text-gray-800 font-semibold">{m.label}</Text>
              <Text className="text-gray-400 text-xs">{m.sublabel}</Text>
            </View>
            <View className={`w-5 h-5 rounded-full border-2 items-center justify-center ${metodoPagamento === m.id ? 'border-blue-700' : 'border-gray-300'}`}>
              {metodoPagamento === m.id && <View className="w-2.5 h-2.5 rounded-full bg-blue-700" />}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        onPress={handlePagar}
        disabled={loading}
        className="mx-4 mt-4 bg-[#1565C0] rounded-2xl py-4 items-center"
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white font-bold text-base">Pagar R$ {total.toFixed(2)}</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}
