import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import Header from 'src/components/header';
import { useAuth } from 'src/context/auth';
import { cancelarComEstorno, getReservasUsuario, type Reserva } from 'src/lib/api';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

const STATUS_LABEL: Record<string, string> = { ATIVA: 'Ativa', PAGA: 'Paga', CANCELADA: 'Cancelada', CONCLUIDA: 'Concluída' };
const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  ATIVA: { bg: '#dbeafe', text: '#1d4ed8' },
  PAGA: { bg: '#dbeafe', text: '#1d4ed8' },
  CANCELADA: { bg: '#fee2e2', text: '#dc2626' },
  CONCLUIDA: { bg: '#dcfce7', text: '#15803d' },
};

export default function Reservas() {
  const { user, token } = useAuth();
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelando, setCancelando] = useState<number | null>(null);
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  // Recarrega sempre que a aba aparece: o status muda depois do pagamento e do estorno
  useFocusEffect(useCallback(() => {
    if (!user || !token) return;
    let ativo = true;
    async function carregar() {
      try {
        setLoading(true);
        setError('');
        const data = await getReservasUsuario(user!.usuario_id, token!);
        if (ativo) setReservas(data);
      } catch (e) {
        if (ativo) setError(e instanceof Error ? e.message : 'Falha ao carregar');
      } finally {
        if (ativo) setLoading(false);
      }
    }
    carregar();
    return () => { ativo = false; };
  }, [user, token]));

  function confirmarCancelamento(item: Reserva) {
    Alert.alert('Cancelar reserva', 'O valor pago será devolvido no cartão. Deseja cancelar?', [
      { text: 'Voltar', style: 'cancel' },
      {
        text: 'Cancelar reserva',
        style: 'destructive',
        onPress: async () => {
          try {
            setCancelando(item.reserva_id);
            const { message } = await cancelarComEstorno(item.reserva_id, token!);
            setReservas((atual) => atual.map((r) => (r.reserva_id === item.reserva_id ? { ...r, status: 'CANCELADA' } : r)));
            Alert.alert('Pronto', message);
          } catch (e) {
            Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível cancelar');
          } finally {
            setCancelando(null);
          }
        },
      },
    ]);
  }

  function formatarData(iso: string) {
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <ScrollView className="flex-1 bg-[#f5f7fb]" contentContainerStyle={{ paddingBottom: 24 }}>
      <Header />
      <View className="px-4 pt-6 pb-1">
        <Text className="text-lg font-bold text-gray-900">Minhas reservas</Text>
      </View>

      {loading ? (
        <View className="mt-8 items-center"><ActivityIndicator size="large" color="#1d4ed8" /></View>
      ) : error ? (
        <View className="mx-4 mt-4 rounded-3xl bg-red-50 p-4">
          <Text className="text-red-700 font-semibold">{error}</Text>
        </View>
      ) : reservas.length === 0 ? (
        <View className="px-4 py-8 items-center">
          <Text className="text-4xl mb-4">📅</Text>
          <Text className="text-xl font-bold text-gray-800">Nenhuma reserva ainda</Text>
          <Text className="text-gray-500 mt-2 text-center">Busque uma lavanderia e faça sua primeira reserva.</Text>
          <TouchableOpacity
            className="mt-6 bg-[#1565C0] px-6 py-4 rounded-2xl"
            onPress={() => navigation.navigate('UserTabs', { screen: 'Lavanderias' })}
          >
            <Text className="text-white font-bold">Buscar lavanderias</Text>
          </TouchableOpacity>
        </View>
      ) : (
        reservas.map((item) => {
          const cor = STATUS_COLOR[item.status] ?? { bg: '#f3f4f6', text: '#4b5563' };
          return (
            <View key={item.reserva_id} className="mx-4 mt-3 bg-white border border-gray-200 rounded-2xl p-4">
              <View className="flex-row justify-between items-center">
                <Text className="text-base font-bold text-gray-900">
                  Máquina {item.maquina?.numero?.toString().padStart(2, '0') ?? item.maquina_id}
                </Text>
                <View style={{ backgroundColor: cor.bg, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 }}>
                  <Text style={{ color: cor.text, fontSize: 12, fontWeight: '700' }}>
                    {STATUS_LABEL[item.status] ?? item.status}
                  </Text>
                </View>
              </View>
              <View className="flex-row mt-2">
                <Text className="text-gray-400 text-sm w-12">Início</Text>
                <Text className="text-gray-700 text-sm">{formatarData(item.data_inicio)}</Text>
              </View>
              <View className="flex-row mt-0.5">
                <Text className="text-gray-400 text-sm w-12">Fim</Text>
                <Text className="text-gray-700 text-sm">{formatarData(item.data_fim)}</Text>
              </View>
              {(item.pagamentos?.length ?? 0) > 0 && (
                <View className="flex-row justify-between items-center mt-3 pt-3 border-t border-gray-100">
                  <Text className="text-gray-600">Valor</Text>
                  <Text className="text-blue-700 font-bold text-lg">
                    R$ {Number(item.pagamentos![0].valor).toFixed(2).replace('.', ',')}
                  </Text>
                </View>
              )}
              {item.status === 'PAGA' && (
                <TouchableOpacity
                  onPress={() => confirmarCancelamento(item)}
                  disabled={cancelando === item.reserva_id}
                  className="mt-3 border border-red-300 rounded-2xl py-2 items-center"
                >
                  {cancelando === item.reserva_id ? (
                    <ActivityIndicator color="#dc2626" />
                  ) : (
                    <Text className="text-red-600 font-semibold">Cancelar e estornar</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}
