import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Lavanderia, Maquina } from 'src/lib/api';

const PROGRAMAS = [
  { id: 'secagem', label: 'Secagem (35min)' },
  { id: 'lava_seca', label: 'Lava e Seca (45min)' },
];

export default function EscolherMaquina() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<any>();
  const lavanderia: Lavanderia = route.params?.lavanderia;

  const [programaSelecionado, setProgramaSelecionado] = useState('lava_seca');
  const [maquinaSelecionada, setMaquinaSelecionada] = useState<Maquina | null>(null);

  const maquinas = lavanderia.maquinas ?? [];
  const valor = programaSelecionado === 'lava_seca' ? 30.00 : 18.00;

  function getStatusColor(status: string) {
    if (status === 'LIVRE') return '#22c55e';
    if (status === 'OCUPADA') return '#ef4444';
    return '#f59e0b';
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ paddingBottom: 32 }}>
      <View className="bg-[#1565C0] pt-12 pb-6 px-5">
        <TouchableOpacity onPress={() => navigation.goBack()} className="flex-row items-center mb-4">
          <Ionicons name="arrow-back" size={22} color="white" />
          <Text className="text-white ml-2 font-semibold">Escolher Máquina</Text>
        </TouchableOpacity>
      </View>

      {/* Seletor de programa */}
      <View className="mx-4 mt-4">
        <Text className="text-gray-700 font-bold mb-3">Programa</Text>
        <View className="flex-row gap-2">
          {PROGRAMAS.map((p) => (
            <TouchableOpacity
              key={p.id}
              onPress={() => setProgramaSelecionado(p.id)}
              className={`flex-1 py-3 rounded-xl items-center border-2 ${programaSelecionado === p.id ? 'bg-blue-700 border-blue-700' : 'bg-white border-gray-200'}`}
            >
              <Text className={`text-sm font-semibold ${programaSelecionado === p.id ? 'text-white' : 'text-gray-600'}`}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Grid máquinas */}
      <View className="mx-4 mt-4">
        <Text className="text-gray-700 font-bold mb-3">Escolha a máquina</Text>
        {maquinas.length === 0 ? (
          <View className="bg-blue-50 rounded-2xl p-4 items-center">
            <Text className="text-gray-500">Nenhuma máquina disponível</Text>
          </View>
        ) : (
          <View className="flex-row flex-wrap">
            {maquinas.map((m) => {
              const selecionada = maquinaSelecionada?.maquina_id === m.maquina_id;
              const disponivel = m.status === 'LIVRE';
              return (
                <TouchableOpacity
                  key={m.maquina_id}
                  disabled={!disponivel}
                  onPress={() => setMaquinaSelecionada(m)}
                  style={{ width: '46%', margin: '2%' }}
                  className={`rounded-2xl p-4 items-center border-2 ${selecionada ? 'border-blue-700 bg-blue-50' : 'border-gray-100 bg-gray-50'} ${!disponivel ? 'opacity-50' : ''}`}
                >
                  <MaterialCommunityIcons
                    name="washing-machine"
                    size={36}
                    color={getStatusColor(m.status)}
                  />
                  <Text className="text-gray-800 font-semibold mt-2 text-sm">
                    Máquina {m.numero.toString().padStart(2, '0')}
                  </Text>
                  <Text style={{ color: getStatusColor(m.status), fontSize: 11, marginTop: 2 }}>
                    {m.status === 'LIVRE' ? '● Livre' : m.status === 'OCUPADA' ? '● Ocupada' : '⚠ Manutenção'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      <TouchableOpacity
        disabled={!maquinaSelecionada}
        onPress={() => navigation.navigate('Pagamento', { lavanderia, maquina: maquinaSelecionada, programa: programaSelecionado, valor })}
        className={`mx-4 mt-4 rounded-2xl py-4 items-center ${maquinaSelecionada ? 'bg-[#1565C0]' : 'bg-gray-300'}`}
      >
        <Text className="text-white font-bold text-base">Confirmar máquina</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
