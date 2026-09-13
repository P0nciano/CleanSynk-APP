import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getLavanderia, type Lavanderia } from 'src/lib/api';

export default function LavanderiaDetalhe() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<any>();
  const lavanderia: Lavanderia = route.params?.lavanderia;

  const [dados, setDados] = useState<Lavanderia | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregar() {
      try {
        const d = await getLavanderia(lavanderia.lavanderia_id);
        setDados(d);
      } catch {
        setDados(lavanderia);
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, []);

  const info = dados ?? lavanderia;
  const livres = info.maquinas?.filter((m) => m.status === 'LIVRE').length ?? 0;

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ paddingBottom: 32 }}>
      {/* Header */}
      <View className="bg-[#1565C0] pt-12 pb-6 px-5">
        <TouchableOpacity onPress={() => navigation.goBack()} className="flex-row items-center mb-4">
          <Ionicons name="arrow-back" size={22} color="white" />
          <Text className="text-white ml-2 font-semibold">Voltar</Text>
        </TouchableOpacity>
        <Text className="text-white text-2xl font-bold">{info.nome}</Text>
        <Text className="text-blue-200 text-sm mt-1">{info.endereco}</Text>
      </View>

      {/* Foto placeholder */}
      <View className="mx-4 mt-4 h-48 bg-gray-200 rounded-3xl items-center justify-center">
        <MaterialCommunityIcons name="washing-machine" size={64} color="#9ca3af" />
      </View>

      {/* Info cards */}
      <View className="mx-4 mt-4 flex-row gap-3">
        <View className="flex-1 bg-blue-50 rounded-2xl p-3 items-center">
          <Ionicons name="star" size={20} color="#FBBF24" />
          <Text className="text-gray-800 font-bold mt-1">4.5</Text>
          <Text className="text-gray-400 text-xs">Avaliação</Text>
        </View>
        <View className="flex-1 bg-blue-50 rounded-2xl p-3 items-center">
          <Ionicons name="time-outline" size={20} color="#1d4ed8" />
          <Text className="text-gray-800 font-bold mt-1">07h–22h</Text>
          <Text className="text-gray-400 text-xs">Horário</Text>
        </View>
        <View className="flex-1 bg-blue-50 rounded-2xl p-3 items-center">
          <MaterialCommunityIcons name="washing-machine" size={20} color="#1d4ed8" />
          <Text className="text-gray-800 font-bold mt-1">{livres}</Text>
          <Text className="text-gray-400 text-xs">Livres</Text>
        </View>
      </View>

      {/* Preços */}
      <View className="mx-4 mt-4 bg-blue-50 rounded-2xl p-4">
        <Text className="text-gray-800 font-bold mb-2">Preços</Text>
        <View className="flex-row justify-between">
          <Text className="text-gray-600 text-sm">Lavagem</Text>
          <Text className="text-gray-800 font-semibold text-sm">R$ 18,00 / ciclo</Text>
        </View>
        <View className="flex-row justify-between mt-1">
          <Text className="text-gray-600 text-sm">Secagem</Text>
          <Text className="text-gray-800 font-semibold text-sm">R$ 12,00 / ciclo</Text>
        </View>
        <View className="flex-row justify-between mt-1">
          <Text className="text-gray-600 text-sm">Tempo médio</Text>
          <Text className="text-gray-800 font-semibold text-sm">35 min</Text>
        </View>
      </View>

      {/* Disponibilidade */}
      {loading ? (
        <ActivityIndicator size="small" color="#1d4ed8" style={{ marginTop: 16 }} />
      ) : (
        <View className="mx-4 mt-4">
          <Text className="text-gray-800 font-bold mb-2">Disponibilidade agora</Text>
          <View className="flex-row gap-2">
            <View className="bg-green-100 rounded-xl px-4 py-2 items-center">
              <Text className="text-green-700 font-bold text-lg">{livres}</Text>
              <Text className="text-green-600 text-xs">Livres</Text>
            </View>
            <View className="bg-blue-100 rounded-xl px-4 py-2 items-center">
              <Text className="text-blue-700 font-bold text-lg">
                {info.maquinas?.filter((m) => m.status === 'OCUPADA').length ?? 0}
              </Text>
              <Text className="text-blue-600 text-xs">Em uso</Text>
            </View>
            <View className="bg-yellow-100 rounded-xl px-4 py-2 items-center">
              <Text className="text-yellow-700 font-bold text-lg">
                {info.maquinas?.filter((m) => m.status === 'MANUTENCAO').length ?? 0}
              </Text>
              <Text className="text-yellow-600 text-xs">Manutenção</Text>
            </View>
          </View>
        </View>
      )}

      <TouchableOpacity
        onPress={() => navigation.navigate('EscolherMaquina', { lavanderia: info })}
        className="mx-4 mt-6 bg-[#1565C0] rounded-2xl py-4 items-center"
      >
        <Text className="text-white font-bold text-base">Escolher máquina</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
