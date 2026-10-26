import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, Pressable } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PROGRAMAS, cancelarComEstorno, type Reserva } from 'src/lib/api';
import { useAuth } from 'src/context/auth';
import { hhmm } from 'src/lib/agenda';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const METODO: Record<string, string> = { stripe: 'Cartão de crédito (Stripe)', PIX: 'Pix', demo: 'Demonstração' };
const PAGAMENTO: Record<string, { rotulo: string; cor: string }> = {
  PAGO: { rotulo: 'Pago', cor: '#15803d' },
  ESTORNADO: { rotulo: 'Estornado', cor: '#b45309' },
};

const reais = (v: number) => `R$ ${Number(v).toFixed(2).replace('.', ',')}`;
const dia = (d: Date) => d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

// O que a reserva é agora, para o cliente: o status do banco mais o horário
function situacao(r: Reserva, agora = new Date()) {
  const ini = new Date(r.data_inicio), fim = new Date(r.data_fim);
  if (r.status === 'CANCELADA') return { rotulo: 'Cancelada', cor: '#dc2626', fundo: '#fee2e2', icone: 'close-circle-outline' as const, frase: 'Reserva cancelada' };
  if (r.status === 'CONCLUIDA') return { rotulo: 'Concluída', cor: '#15803d', fundo: '#dcfce7', icone: 'checkmark-circle-outline' as const, frase: 'Lavagem concluída' };
  if (r.status !== 'PAGA') return { rotulo: 'Aguardando pagamento', cor: '#b45309', fundo: '#fef3c7', icone: 'time-outline' as const, frase: 'Pagamento ainda não confirmado' };
  if (ini > agora) return { rotulo: 'Agendada', cor: '#6d28d9', fundo: '#ede9fe', icone: 'calendar-outline' as const, frase: `Começa às ${hhmm(ini)}` };
  if (fim > agora) return { rotulo: 'Em andamento', cor: '#1d4ed8', fundo: '#dbeafe', icone: 'water-outline' as const, frase: `Termina às ${hhmm(fim)}` };
  return { rotulo: 'Paga', cor: '#1d4ed8', fundo: '#dbeafe', icone: 'checkmark-circle-outline' as const, frase: 'Pagamento confirmado' };
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View className="flex-row justify-between py-2 border-b border-gray-100">
      <Text className="text-gray-500 text-sm">{rotulo}</Text>
      <Text className="text-gray-900 text-sm font-semibold shrink ml-4 text-right">{valor}</Text>
    </View>
  );
}

// Detalhe da reserva em um modal que sobe por cima da lista de Reservas
export default function ReservaDetalheModal({ reserva, onFechar, onAlterada }: { reserva: Reserva | null; onFechar: () => void; onAlterada: (r: Reserva) => void }) {
  return (
    <Modal visible={reserva !== null} animationType="slide" transparent onRequestClose={onFechar}>
      {reserva && <Conteudo reserva={reserva} onFechar={onFechar} onAlterada={onAlterada} />}
    </Modal>
  );
}

function Conteudo({ reserva, onFechar, onAlterada }: { reserva: Reserva; onFechar: () => void; onAlterada: (r: Reserva) => void }) {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [cancelando, setCancelando] = useState(false);

  const ini = new Date(reserva.data_inicio), fim = new Date(reserva.data_fim);
  const minutos = Math.round((fim.getTime() - ini.getTime()) / 60_000);
  // A reserva não guarda o programa: a duração identifica qual foi
  const programa = PROGRAMAS.find((p) => p.minutos === minutos)?.nome;
  const s = situacao(reserva);
  const lavanderia = reserva.maquina?.lavanderia;
  const podeCancelar = reserva.status === 'PAGA' && fim > new Date();

  function confirmarCancelamento() {
    Alert.alert('Cancelar reserva', 'O valor pago será devolvido no cartão. Deseja cancelar?', [
      { text: 'Voltar', style: 'cancel' },
      {
        text: 'Cancelar reserva',
        style: 'destructive',
        onPress: async () => {
          try {
            setCancelando(true);
            const { message } = await cancelarComEstorno(reserva.reserva_id, token!);
            onAlterada({ ...reserva, status: 'CANCELADA', pagamentos: reserva.pagamentos?.map((p) => (p.status === 'PAGO' ? { ...p, status: 'ESTORNADO' } : p)) });
            Alert.alert('Pronto', message);
          } catch (e) {
            Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível cancelar');
          } finally {
            setCancelando(false);
          }
        },
      },
    ]);
  }

  return (
    <View className="flex-1 justify-end">
      <Pressable className="absolute inset-0 bg-black/40" onPress={onFechar} accessibilityLabel="Fechar detalhes" />
      <View className="bg-[#f5f7fb] rounded-t-3xl max-h-[90%] md:self-center md:w-[480px]" style={{ paddingBottom: insets.bottom }}>
        <View className="flex-row items-center justify-between px-5 pt-5 pb-1">
          <View className="shrink">
            <Text className="text-gray-900 font-bold text-xl">Reserva #{reserva.reserva_id}</Text>
            {lavanderia && <Text className="text-gray-500 text-sm" numberOfLines={1}>{lavanderia.nome}</Text>}
          </View>
          <TouchableOpacity onPress={onFechar} accessibilityLabel="Fechar" className="w-10 h-10 rounded-full bg-white border border-gray-200 items-center justify-center">
            <Ionicons name="close" size={22} color="#4b5563" />
          </TouchableOpacity>
        </View>
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>

      <View className="mx-4 mt-4 bg-white border border-gray-200 rounded-2xl p-5 flex-row items-center gap-4">
        <View className="w-14 h-14 rounded-2xl items-center justify-center" style={{ backgroundColor: s.fundo }}>
          <Ionicons name={s.icone} size={28} color={s.cor} />
        </View>
        <View className="flex-1">
          <Text className="text-xs font-bold uppercase" style={{ color: s.cor }}>{s.rotulo}</Text>
          <Text className="text-gray-900 font-bold text-lg">{s.frase}</Text>
        </View>
      </View>

      <View className="mx-4 mt-3 bg-white border border-gray-200 rounded-2xl p-4">
        <Text className="text-gray-900 font-bold text-base mb-1">Quando</Text>
        <Linha rotulo="Dia" valor={dia(ini)} />
        <Linha rotulo="Horário" valor={`${hhmm(ini)} às ${hhmm(fim)}`} />
        <Linha rotulo="Programa" valor={programa ? `${programa} · ${minutos} min` : `${minutos} min`} />
      </View>

      <View className="mx-4 mt-3 bg-white border border-gray-200 rounded-2xl p-4">
        <Text className="text-gray-900 font-bold text-base mb-3">Onde</Text>
        <View className="flex-row items-center gap-3">
          <View className="w-11 h-11 rounded-xl bg-blue-50 items-center justify-center">
            <MaterialCommunityIcons name="washing-machine" size={24} color="#1d4ed8" />
          </View>
          <View className="flex-1">
            <Text className="text-gray-900 font-semibold">
              Máquina {String(reserva.maquina?.numero ?? reserva.maquina_id).padStart(2, '0')}
              {reserva.maquina?.tipo ? <Text className="text-gray-500 font-normal"> · {reserva.maquina.tipo}</Text> : null}
            </Text>
            {lavanderia && <Text className="text-gray-500 text-sm" numberOfLines={2}>{lavanderia.nome} · {lavanderia.endereco}</Text>}
          </View>
        </View>
        {lavanderia && (
          <TouchableOpacity onPress={() => { onFechar(); navigation.navigate('LavanderiaDetalhe', { lavanderia }); }} className="mt-3 self-start">
            <Text className="text-blue-700 font-semibold">Ver lavanderia</Text>
          </TouchableOpacity>
        )}
      </View>

      <View className="mx-4 mt-3 bg-white border border-gray-200 rounded-2xl p-4">
        <Text className="text-gray-900 font-bold text-base mb-1">Pagamento</Text>
        {(reserva.pagamentos?.length ?? 0) === 0 ? (
          <Text className="text-gray-500 text-sm mt-1">
            {reserva.status === 'AGUARDANDO_PAGAMENTO' ? 'Sem pagamento em até 10 minutos, a reserva é cancelada sozinha.' : 'Nenhum pagamento registrado.'}
          </Text>
        ) : (
          reserva.pagamentos!.map((p) => {
            const st = PAGAMENTO[p.status] ?? { rotulo: p.status, cor: '#4b5563' };
            return (
              <View key={p.pagamento_id} className="py-2 border-b border-gray-100">
                <View className="flex-row justify-between items-center">
                  <Text className="text-blue-700 font-bold text-lg">{reais(p.valor)}</Text>
                  <Text className="text-sm font-bold" style={{ color: st.cor }}>{st.rotulo}</Text>
                </View>
                <Text className="text-gray-500 text-xs mt-0.5">
                  {METODO[p.metodo] ?? p.metodo}
                  {p.data_pagamento ? ` · ${new Date(p.data_pagamento).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : ''}
                </Text>
              </View>
            );
          })
        )}
      </View>

      {podeCancelar && (
        <TouchableOpacity
          onPress={confirmarCancelamento}
          disabled={cancelando}
          className="mx-4 mt-5 border border-red-300 bg-white rounded-2xl py-4 items-center"
        >
          {cancelando ? <ActivityIndicator color="#dc2626" /> : <Text className="text-red-600 font-bold">Cancelar e estornar</Text>}
        </TouchableOpacity>
      )}
    </ScrollView>
      </View>
    </View>
  );
}
