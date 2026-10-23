import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getPrograma } from 'src/lib/api';
import CabecalhoTela from 'src/components/CabecalhoTela';

// Etapas de cada programa; as do meio dividem o tempo do programa em partes iguais
const ETAPAS_DO_PROGRAMA: Record<string, string[]> = {
  lavagem: ['Lavando'],
  secagem: ['Secando'],
  lava_seca: ['Lavando', 'Secando'],
};

export default function StatusLavagem() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<any>();
  const { lavanderia, maquina, programa } = route.params;

  const total = getPrograma(programa).minutos * 60;
  const [segundos, setSegundos] = useState(total);

  useEffect(() => {
    const timer = setInterval(() => setSegundos((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, []);

  const meio = ETAPAS_DO_PROGRAMA[programa] ?? ETAPAS_DO_PROGRAMA.lava_seca;
  const etapas = ['Pagamento confirmado', ...meio, 'Concluído'];
  const atual = segundos === 0 ? etapas.length - 1 : 1 + Math.min(meio.length - 1, Math.floor(((total - segundos) / total) * meio.length));

  const min = Math.floor(segundos / 60).toString().padStart(2, '0');
  const sec = (segundos % 60).toString().padStart(2, '0');
  const numero = String(maquina?.numero ?? 0).padStart(2, '0');

  return (
    <ScrollView className="flex-1 bg-[#f5f7fb]" contentContainerStyle={{ paddingBottom: 32 }}>
      <CabecalhoTela titulo="Status da lavagem" subtitulo={lavanderia?.nome} semVoltar />

      <View className="mx-4 mt-6 bg-white border border-gray-200 rounded-3xl p-6 items-center">
        <View className="w-36 h-36 rounded-full border-[6px] border-blue-700 items-center justify-center mb-4">
          <Text className="text-blue-700 text-4xl font-bold">{min}:{sec}</Text>
          <Text className="text-gray-400 text-xs">restantes</Text>
        </View>
        <Text className="text-gray-900 font-bold text-lg text-center">
          {segundos === 0 ? 'Pronto! Pode retirar suas roupas' : `${etapas[atual]}... Máquina ${numero}`}
        </Text>
        <Text className="text-gray-400 text-sm mt-1">{getPrograma(programa).nome}</Text>
      </View>

      <View className="mx-4 mt-3 bg-white border border-gray-200 rounded-2xl p-4">
        <Text className="text-gray-900 font-bold text-base mb-4">Etapas</Text>
        {etapas.map((etapa, i) => {
          const concluida = i < atual || segundos === 0;
          const emAndamento = i === atual && segundos > 0;
          return (
            <View key={etapa} className="flex-row items-center mb-4">
              <View className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${concluida ? 'bg-green-500' : emAndamento ? 'bg-blue-700' : 'bg-gray-200'}`}>
                {concluida ? <Ionicons name="checkmark" size={16} color="white" /> : <Text className={`text-xs font-bold ${emAndamento ? 'text-white' : 'text-gray-400'}`}>{i + 1}</Text>}
              </View>
              <Text className={`text-base ${concluida ? 'text-green-700 font-semibold' : emAndamento ? 'text-blue-700 font-bold' : 'text-gray-400'}`}>{etapa}</Text>
              {emAndamento && (
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
        className="mx-4 mt-5 border-2 border-blue-700 rounded-2xl py-4 items-center"
      >
        <Text className="text-blue-700 font-bold text-base">Voltar ao início</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
