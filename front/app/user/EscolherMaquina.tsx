import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PROGRAMAS, precoNaLavanderia, type Lavanderia, type Maquina } from 'src/lib/api';
import CabecalhoTela from 'src/components/CabecalhoTela';

const STATUS: Record<string, { cor: string; rotulo: string }> = {
  LIVRE: { cor: '#16a34a', rotulo: 'Livre' },
  OCUPADA: { cor: '#dc2626', rotulo: 'Ocupada' },
  MANUTENCAO: { cor: '#d97706', rotulo: 'Manutenção' },
};

export default function EscolherMaquina() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<any>();
  const lavanderia: Lavanderia = route.params?.lavanderia;

  const [programaSelecionado, setProgramaSelecionado] = useState('lava_seca');
  const [maquinaSelecionada, setMaquinaSelecionada] = useState<Maquina | null>(null);

  const maquinas = lavanderia.maquinas ?? [];
  const valor = precoNaLavanderia(programaSelecionado, lavanderia);

  return (
    <ScrollView className="flex-1 bg-[#f5f7fb]" contentContainerStyle={{ paddingBottom: 32 }}>
      <CabecalhoTela titulo="Escolher máquina" subtitulo={lavanderia.nome} />

      <Text className="mx-4 mt-6 mb-3 text-gray-900 font-bold text-base">Programa</Text>
      <View className="mx-4 flex-row gap-2">
        {PROGRAMAS.map((p) => {
          const ativo = programaSelecionado === p.id;
          return (
            <TouchableOpacity
              key={p.id}
              onPress={() => setProgramaSelecionado(p.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: ativo }}
              className={`flex-1 py-3 px-1 rounded-2xl items-center border ${ativo ? 'bg-blue-700 border-blue-700' : 'bg-white border-gray-200'}`}
            >
              <Text className={`text-sm font-bold ${ativo ? 'text-white' : 'text-gray-800'}`}>{p.nome}</Text>
              <Text className={`text-xs mt-0.5 ${ativo ? 'text-blue-100' : 'text-gray-400'}`}>
                {p.minutos} min · R$ {precoNaLavanderia(p.id, lavanderia).toFixed(2).replace('.', ',')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text className="mx-4 mt-6 mb-3 text-gray-900 font-bold text-base">Escolha a máquina</Text>
      {maquinas.length === 0 ? (
        <View className="mx-4 bg-white border border-dashed border-gray-200 rounded-2xl p-6 items-center">
          <Text className="text-gray-400">Nenhuma máquina disponível</Text>
        </View>
      ) : (
        <View className="mx-4 flex-row flex-wrap gap-3">
          {maquinas.map((m) => {
            const selecionada = maquinaSelecionada?.maquina_id === m.maquina_id;
            const disponivel = m.status === 'LIVRE';
            const status = STATUS[m.status] ?? STATUS.MANUTENCAO;
            return (
              <TouchableOpacity
                key={m.maquina_id}
                disabled={!disponivel}
                onPress={() => setMaquinaSelecionada(m)}
                accessibilityRole="radio"
                accessibilityState={{ selected: selecionada, disabled: !disponivel }}
                className={`w-[47%] rounded-2xl p-4 items-center border-2 ${selecionada ? 'border-blue-700 bg-blue-50' : 'border-gray-200 bg-white'} ${!disponivel ? 'opacity-50' : ''}`}
              >
                <View className="w-12 h-12 rounded-xl items-center justify-center" style={{ backgroundColor: status.cor + '1a' }}>
                  <MaterialCommunityIcons name="washing-machine" size={28} color={status.cor} />
                </View>
                <Text className="text-gray-900 font-semibold mt-2 text-sm">Máquina {String(m.numero).padStart(2, '0')}</Text>
                <Text className="text-xs mt-0.5" style={{ color: status.cor }}>● {status.rotulo}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <TouchableOpacity
        disabled={!maquinaSelecionada}
        onPress={() => navigation.navigate('Pagamento', { lavanderia, maquina: maquinaSelecionada, programa: programaSelecionado, valor })}
        className={`mx-4 mt-6 rounded-2xl py-4 items-center ${maquinaSelecionada ? 'bg-blue-700' : 'bg-gray-300'}`}
      >
        <Text className="text-white font-bold text-base">
          {maquinaSelecionada ? `Continuar · R$ ${valor.toFixed(2).replace('.', ',')}` : 'Escolha uma máquina livre'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
