import React, { useCallback, useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { AdminPagina, Card, fundoGradiente, useLargo } from 'src/components/AdminLayout';
import { getStoredToken } from 'src/lib/auth';
import { somaPagos } from 'src/lib/api';

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
  maquinasManutencao: number;
  alertas: Alerta[];
};

function getBadgeColor(msg: string) {
  if (msg.toLowerCase().includes('falha') || msg.toLowerCase().includes('erro')) return '#ef4444';
  if (msg.toLowerCase().includes('manutenção')) return '#f59e0b';
  return '#22c55e';
}

export function formatarReais(valor: number) {
  return `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Quadrinho translúcido dentro do card azul
function Indicador({ icone, valor, rotulo, destaque }: { icone: keyof typeof Ionicons.glyphMap; valor: string; rotulo: string; destaque?: boolean }) {
  return (
    <View className="flex-1 min-w-[90px] rounded-2xl p-3 md:p-4 border border-white/20 bg-white/10">
      <View className="w-8 h-8 rounded-lg bg-white/20 items-center justify-center mb-3">
        <Ionicons name={icone} size={16} color={destaque ? '#fde68a' : 'white'} />
      </View>
      <Text className="text-white text-2xl md:text-[28px] font-bold">{valor}</Text>
      <Text className={`text-xs md:text-sm ${destaque ? 'text-amber-200' : 'text-blue-100'}`}>{rotulo}</Text>
    </View>
  );
}

export function CardReceita({ receita, children, etiqueta }: { receita: number; children: React.ReactNode; etiqueta?: string }) {
  return (
    <View className="rounded-3xl p-6 md:p-8 overflow-hidden" style={[fundoGradiente, { shadowColor: '#1d4ed8', shadowOpacity: 0.25, shadowRadius: 24, shadowOffset: { width: 0, height: 12 } }]}>
      {/* Círculos decorativos */}
      <View className="absolute -top-24 -right-16 w-80 h-80 rounded-full bg-white/5" />
      <View className="absolute -bottom-24 right-1/3 w-48 h-48 rounded-full bg-white/5" />
      <View className="flex-row justify-between items-start">
        <View>
          <Text className="text-blue-100 text-sm">Receita total</Text>
          <Text className="text-white text-[36px] md:text-[44px] font-extrabold mt-1">{formatarReais(receita)}</Text>
        </View>
        {etiqueta ? (
          <View className="bg-white/20 rounded-full px-3 py-1">
            <Text className="text-white text-xs font-semibold">{etiqueta}</Text>
          </View>
        ) : null}
      </View>
      <View className="flex-row flex-wrap gap-3 md:gap-4 mt-6">{children}</View>
    </View>
  );
}

export default function AdminHome() {
  const navigation = useNavigation<any>();
  const largo = useLargo();
  const [data, setData] = useState<ResumoData | null>(null);
  const [loading, setLoading] = useState(true);

  // Recarrega ao voltar para a aba (reservas e alertas mudam o tempo todo)
  useFocusEffect(useCallback(() => {
    async function load() {
      try {
        const token = await getStoredToken();
        const headers = { Authorization: `Bearer ${token}` };

        const [reservasRes, maquinasRes, notifRes] = await Promise.all([
          fetch(`${API}/reservas`, { headers }),
          fetch(`${API}/maquinas`, { headers }),
          fetch(`${API}/notificacoes`, { headers }),
        ]);

        const reservas = reservasRes.ok ? await reservasRes.json() : [];
        const maquinas = maquinasRes.ok ? await maquinasRes.json() : [];
        const notificacoes = notifRes.ok ? await notifRes.json() : [];

        const receitaTotal = reservas.reduce((acc: number, r: any) => acc + somaPagos(r), 0);
        const ativas = maquinas.filter((m: any) => m.status === 'OCUPADA').length;
        const manutencao = maquinas.filter((m: any) => m.status === 'MANUTENCAO').length;
        const taxaUso = maquinas.length > 0 ? Math.round((ativas / maquinas.length) * 100) : 0;

        setData({
          totalReservas: reservas.length,
          receitaTotal,
          taxaUso,
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
  }, []));

  const alertas = data?.alertas ?? [];

  return (
    <AdminPagina titulo="Visão geral" subtitulo="Acompanhe a receita, o uso das máquinas e os alertas da sua lavanderia.">
      {loading ? (
        <ActivityIndicator size="large" color="#1d4ed8" className="mt-10" />
      ) : (
        <View className={`gap-6 ${largo ? 'flex-row items-start' : ''}`}>
          <View className={largo ? 'flex-[2]' : ''}>
            <CardReceita receita={data?.receitaTotal ?? 0} etiqueta="Total">
              <Indicador icone="calendar-outline" valor={String(data?.totalReservas ?? 0)} rotulo="Reservas" />
              <Indicador icone="pulse-outline" valor={`${data?.taxaUso ?? 0}%`} rotulo="Uso" />
              <Indicador icone="build-outline" valor={String(data?.maquinasManutencao ?? 0)} rotulo="Manutenção" destaque />
            </CardReceita>
          </View>

          <Card className={largo ? 'flex-1' : ''}>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-gray-900 font-bold text-base">Alertas recentes</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Perfil', { aba: 'Alertas' })}>
                <Text className="text-blue-700 text-sm font-semibold">Ver todos</Text>
              </TouchableOpacity>
            </View>
            {alertas.length === 0 ? (
              <View className="border border-dashed border-gray-200 rounded-2xl py-10 px-6 items-center">
                <View className="w-12 h-12 rounded-full bg-green-100 items-center justify-center mb-3">
                  <Ionicons name="checkmark" size={22} color="#16a34a" />
                </View>
                <Text className="text-gray-900 font-semibold">Nenhum alerta</Text>
                <Text className="text-gray-400 text-sm text-center mt-1">Está tudo funcionando. Novos avisos aparecem aqui.</Text>
              </View>
            ) : (
              alertas.map((a) => (
                <View key={a.notificacao_id} className="flex-row items-center gap-3 py-3 border-b border-gray-100">
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: getBadgeColor(a.mensagem) }} />
                  <View className="flex-1">
                    <Text className="text-gray-800 text-sm">{a.mensagem}</Text>
                    <Text className="text-gray-400 text-xs mt-0.5">{new Date(a.createdAt).toLocaleDateString('pt-BR')}</Text>
                  </View>
                  {!a.lida && (
                    <View className="bg-blue-100 px-2 py-0.5 rounded-full">
                      <Text className="text-blue-700 text-xs font-bold">Novo</Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </Card>
        </View>
      )}
    </AdminPagina>
  );
}
