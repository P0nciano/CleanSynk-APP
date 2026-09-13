import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

const ETAPAS = [
  { id: 1, label: 'Pagamento confirmado' },
  { id: 2, label: 'Máquina em andamento' },
  { id: 3, label: 'Secagem' },
  { id: 4, label: 'Concluído' },
];

export default function StatusLavagem() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<any>();
  const { lavanderia, maquina, valor } = route.params;

  const [etapaAtual, setEtapaAtual] = useState(1);
  const [segundos, setSegundos] = useState(45 * 60);

  useEffect(() => {
    const timer = setInterval(() => {
      setSegundos((s) => {
        if (s <= 0) { clearInterval(timer); return 0; }
        return s - 1;
      });
      // Avança etapa a cada ~11 minutos (simulado)
      setEtapaAtual((e) => {
        if (segundos < 34 * 60 && e < 2) return 2;
        if (segundos < 22 * 60 && e < 3) return 3;
        if (segundos <= 0 && e < 4) return 4;
        return e;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [segundos]);

  const min = Math.floor(segundos / 60).toString().padStart(2, '0');
  const sec = (segundos % 60).toString().padStart(2, '0');

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ paddingBottom: 32 }}>
      <View className="bg-[#1565C0] pt-12 pb-6 px-5">
        <Text className="text-white text-xl font-bold">Status da Lavagem</Text>
        <Text className="text-blue-200 text-sm mt-1">{lavanderia?.nome}</Text>
      </View>

      {/* Timer */}
      <View className="mx-4 mt-6 bg-blue-50 rounded-3xl p-6 items-center">
        <View className="w-32 h-32 rounded-full border-4 border-blue-700 items-center justify-center mb-3">
          <Text className="text-blue-700 text-3xl font-bold">{min}:{sec}</Text>
          <Text className="text-blue-400 text-xs">restantes</Text>
        </View>
        <Text className="text-gray-800 font-bold text-lg">
          Lavando... Máquina {String(maquina?.numero ?? 0).padStart(2, '0')}
        </Text>
        <Text className="text-gray-400 text-sm mt-1">{lavanderia?.nome}</Text>
      </View>

      {/* Etapas */}
      <View className="mx-4 mt-6">
        <Text className="text-gray-800 font-bold text-base mb-4">Etapas</Text>
        {ETAPAS.map((etapa) => {
          const concluida = etapaAtual > etapa.id;
          const atual = etapaAtual === etapa.id;
          return (
            <View key={etapa.id} className="flex-row items-center mb-4">
              <View className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${concluida ? 'bg-green-500' : atual ? 'bg-blue-700' : 'bg-gray-200'}`}>
                {concluida ? (
                  <Ionicons name="checkmark" size={16} color="white" />
                ) : (
                  <Text className={`text-xs font-bold ${atual ? 'text-white' : 'text-gray-400'}`}>{etapa.id}</Text>
                )}
              </View>
              <Text className={`text-base ${concluida ? 'text-green-600 font-semibold' : atual ? 'text-blue-700 font-bold' : 'text-gray-400'}`}>
                {etapa.label}
              </Text>
              {atual && (
                <View className="ml-2 bg-blue-100 px-2 py-0.5 rounded-full">
                  <Text className="text-blue-700 text-xs font-semibold">Em andamento</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      <TouchableOpacity
        onPress={() => navigation.navigate('UserTabs', { screen: 'Home' })}
        className="mx-4 mt-4 border-2 border-blue-700 rounded-2xl py-4 items-center"
      >
        <Text className="text-blue-700 font-bold text-base">Voltar ao início</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
