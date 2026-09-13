import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AdminHeader from 'src/components/AdminHeader';
import { getStoredToken } from 'src/lib/auth';

const API = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

type Alerta = {
  notificacao_id: number;
  mensagem: string;
  createdAt: string;
  lida: boolean;
};

type ResumoData = {
  totalReservas: number;
  receitaTotal: number;
  taxaUso: number;
  maquinasAtivas: number;
  maquinasManutencao: number;
  alertas: Alerta[];
};

function getBadgeColor(msg: string) {
  if (msg.toLowerCase().includes('falha') || msg.toLowerCase().includes('erro')) return '#ef4444';
  if (msg.toLowerCase().includes('manutenção')) return '#f59e0b';
  return '#22c55e';
}

export default function AdminHome() {
  const [data, setData] = useState<ResumoData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const token = await getStoredToken();
        console.log("TOKEN ADMIN:", token);
        const headers = { Authorization: `Bearer ${token}` };

        const [reservasRes, maquinasRes, notifRes] = await Promise.all([
          fetch(`${API}/reservas`, { headers }),
          fetch(`${API}/maquinas`, { headers }),
          fetch(`${API}/notificacoes`, { headers }),
        ]);

        const reservas = reservasRes.ok ? await reservasRes.json() : [];
        const maquinas = maquinasRes.ok ? await maquinasRes.json() : [];
        const notificacoes = notifRes.ok ? await notifRes.json() : [];

        const receitaTotal = reservas.reduce((acc: number, r: any) => {
          const pg = r.pagamentos?.[0];
          return acc + (pg ? Number(pg.valor) : 0);
        }, 0);

        const ativas = maquinas.filter((m: any) => m.status === 'OCUPADA').length;
        const manutencao = maquinas.filter((m: any) => m.status === 'MANUTENCAO').length;
        const taxaUso = maquinas.length > 0 ? Math.round((ativas / maquinas.length) * 100) : 0;

        setData({
          totalReservas: reservas.length,
          receitaTotal,
          taxaUso,
          maquinasAtivas: ativas,
          maquinasManutencao: manutencao,
          alertas: notificacoes.slice(0, 5),
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 bg-white">
        <AdminHeader />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1d4ed8" />
        </View>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ paddingBottom: 24 }}>
      <AdminHeader />

      {/* Card receita */}
      <View className="mx-4 mt-4 bg-blue-700 rounded-3xl p-4">
        <Text className="text-blue-200 text-xs mb-1">Receita total</Text>
        <Text className="text-white text-3xl font-bold">
          R$ {(data?.receitaTotal ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
        </Text>
        <View className="mt-3 flex-row gap-4">
          <View className="bg-blue-600 rounded-2xl px-4 py-2 flex-1 items-center">
            <Text className="text-white text-xl font-bold">{data?.totalReservas ?? 0}</Text>
            <Text className="text-blue-200 text-xs">Reservas</Text>
          </View>
          <View className="bg-blue-600 rounded-2xl px-4 py-2 flex-1 items-center">
            <Text className="text-white text-xl font-bold">{data?.taxaUso ?? 0}%</Text>
            <Text className="text-blue-200 text-xs">Uso</Text>
          </View>
          <View className="bg-blue-600 rounded-2xl px-4 py-2 flex-1 items-center">
            <Text className="text-white text-xl font-bold">{data?.maquinasManutencao ?? 0}</Text>
            <Text className="text-red-300 text-xs">Manutenção</Text>
          </View>
        </View>
      </View>

      {/* Alertas recentes */}
      <View className="mx-4 mt-4">
        <Text className="text-gray-700 font-bold text-base mb-3">Alertas recentes</Text>
        {(data?.alertas ?? []).length === 0 ? (
          <View className="bg-white rounded-2xl p-4 items-center">
            <Text className="text-gray-400">Nenhum alerta</Text>
          </View>
        ) : (
          (data?.alertas ?? []).map((a) => (
            <View key={a.notificacao_id} className="bg-white rounded-2xl px-4 py-3 mb-2 flex-row items-center gap-3">
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: getBadgeColor(a.mensagem) }} />
              <View className="flex-1">
                <Text className="text-gray-800 text-sm">{a.mensagem}</Text>
                <Text className="text-gray-400 text-xs mt-0.5">
                  {new Date(a.createdAt).toLocaleDateString('pt-BR')}
                </Text>
              </View>
              {!a.lida && (
                <View className="bg-blue-100 px-2 py-0.5 rounded-full">
                  <Text className="text-blue-700 text-xs font-bold">Novo</Text>
                </View>
              )}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
