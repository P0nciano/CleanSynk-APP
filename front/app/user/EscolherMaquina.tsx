import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PROGRAMAS, getOcupacao, getPrograma, precoNaLavanderia, type Lavanderia, type Maquina, type Ocupacao } from 'src/lib/api';
import CabecalhoTela from 'src/components/CabecalhoTela';
import { horariosDeHoje, hhmm } from 'src/lib/agenda';

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
  const [horario, setHorario] = useState<Date | null>(null); // null = agora
  const [maquinaSelecionada, setMaquinaSelecionada] = useState<Maquina | null>(null);
  const [ocupacao, setOcupacao] = useState<Ocupacao[]>([]);

  useEffect(() => {
    getOcupacao(lavanderia.lavanderia_id).then(setOcupacao).catch(() => undefined);
  }, [lavanderia.lavanderia_id]);

  const maquinas = lavanderia.maquinas ?? [];
  const valor = precoNaLavanderia(programaSelecionado, lavanderia);
  const minutos = getPrograma(programaSelecionado).minutos;
  const horarios = horariosDeHoje(minutos);

  const inicio = horario ?? new Date();
  const fim = new Date(inicio.getTime() + minutos * 60_000);
  // Livre no horário escolhido: sem manutenção, sem reserva que se sobreponha e, se for agora, sem ninguém usando
  function livreNoHorario(m: Maquina) {
    if (m.status === 'MANUTENCAO' || (!horario && m.status === 'OCUPADA')) return false;
    return !ocupacao.some((o) => o.maquina_id === m.maquina_id && new Date(o.data_inicio) < fim && new Date(o.data_fim) > inicio);
  }

  // Trocar programa ou horário pode tornar a máquina escolhida indisponível
  useEffect(() => {
    if (maquinaSelecionada && !livreNoHorario(maquinaSelecionada)) setMaquinaSelecionada(null);
  }, [programaSelecionado, horario, ocupacao]);

  if (horario && !horarios.some((h) => h.getTime() === horario.getTime())) setHorario(null);

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

      <Text className="mx-4 mt-6 mb-3 text-gray-900 font-bold text-base">Quando? <Text className="text-gray-400 font-normal text-sm">hoje</Text></Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {[null, ...horarios].map((h) => {
          const ativo = h === null ? horario === null : horario?.getTime() === h.getTime();
          return (
            <TouchableOpacity
              key={h ? h.getTime() : 'agora'}
              onPress={() => setHorario(h)}
              accessibilityRole="radio"
              accessibilityState={{ selected: ativo }}
              className={`px-4 py-2.5 rounded-full border ${ativo ? 'bg-blue-700 border-blue-700' : 'bg-white border-gray-200'}`}
            >
              <Text className={`text-sm font-semibold ${ativo ? 'text-white' : 'text-gray-700'}`}>{h ? hhmm(h) : 'Agora'}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {horario && (
        <Text className="mx-4 mt-2 text-gray-500 text-xs">Das {hhmm(inicio)} às {hhmm(fim)}</Text>
      )}

      <Text className="mx-4 mt-6 mb-3 text-gray-900 font-bold text-base">Escolha a máquina</Text>
      {maquinas.length === 0 ? (
        <View className="mx-4 bg-white border border-dashed border-gray-200 rounded-2xl p-6 items-center">
          <Text className="text-gray-400">Nenhuma máquina disponível</Text>
        </View>
      ) : (
        <View className="mx-4 flex-row flex-wrap gap-3">
          {maquinas.map((m) => {
            const selecionada = maquinaSelecionada?.maquina_id === m.maquina_id;
            const disponivel = livreNoHorario(m);
            // Agendando: o que importa é estar livre no horário, não o status de agora
            const status = m.status === 'MANUTENCAO' ? STATUS.MANUTENCAO : disponivel ? STATUS.LIVRE : { cor: STATUS.OCUPADA.cor, rotulo: horario ? 'Reservada' : 'Ocupada' };
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
        onPress={() => navigation.navigate('Pagamento', { lavanderia, maquina: maquinaSelecionada, programa: programaSelecionado, valor, inicio: horario?.toISOString() ?? null })}
        className={`mx-4 mt-6 rounded-2xl py-4 items-center ${maquinaSelecionada ? 'bg-blue-700' : 'bg-gray-300'}`}
      >
        <Text className="text-white font-bold text-base">
          {maquinaSelecionada ? `Continuar · R$ ${valor.toFixed(2).replace('.', ',')}` : 'Escolha uma máquina livre'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
