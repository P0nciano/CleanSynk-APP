import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import Header from 'src/components/header';
import { useAuth } from 'src/context/auth';
import { getReservasUsuario, type Reserva } from 'src/lib/api';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

const STATUS_LABEL: Record<string, string> = { ATIVA: 'Ativa', PAGA: 'Paga', CANCELADA: 'Cancelada', CONCLUIDA: 'Concluída' };
const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  ATIVA: { bg: '#dbeafe', text: '#1d4ed8' },
  PAGA: { bg: '#dcfce7', text: '#16a34a' },
  CANCELADA: { bg: '#fee2e2', text: '#dc2626' },
  CONCLUIDA: { bg: '#f3f4f6', text: '#4b5563' },
};

export default function Reservas() {
  const { user, token } = useAuth();
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  useEffect(() => {
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
  }, [user, token]);

  function formatarData(iso: string) {
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ paddingBottom: 24 }}>
      <Header />
      <View className="px-4 py-5">
        <Text className="text-xl font-bold text-gray-800">Minhas Reservas</Text>
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
            <View key={item.reserva_id} className="mx-4 mt-4 bg-blue-50 rounded-3xl p-4">
              <View className="flex-row justify-between items-center">
                <Text className="text-base font-bold text-gray-800">
                  Máquina {item.maquina?.numero?.toString().padStart(2, '0') ?? item.maquina_id}
                </Text>
                <View style={{ backgroundColor: cor.bg, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 }}>
                  <Text style={{ color: cor.text, fontSize: 12, fontWeight: '700' }}>
                    {STATUS_LABEL[item.status] ?? item.status}
                  </Text>
                </View>
              </View>
              <Text className="text-gray-500 text-sm mt-2">Início: {formatarData(item.data_inicio)}</Text>
              <Text className="text-gray-500 text-sm">Fim: {formatarData(item.data_fim)}</Text>
              {(item.pagamentos?.length ?? 0) > 0 && (
                <Text className="text-blue-700 font-semibold mt-2">
                  Valor: R$ {Number(item.pagamentos![0].valor).toFixed(2)}
                </Text>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}
