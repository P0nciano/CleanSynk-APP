import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CabecalhoTela from 'src/components/CabecalhoTela';
import { marcarNotificacaoLida } from 'src/lib/api';
import { useAuth } from 'src/context/auth';

const API = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

type Notificacao = {
  notificacao_id: number;
  mensagem: string;
  lida: boolean;
  createdAt: string;
};

function getBadge(msg: string) {
  const m = msg.toLowerCase();
  if (m.includes('erro') || m.includes('falha')) return { cor: '#ef4444', icon: 'alert-circle' as const };
  if (m.includes('concluída') || m.includes('concluida')) return { cor: '#22c55e', icon: 'checkmark-circle' as const };
  if (m.includes('reserva')) return { cor: '#1d4ed8', icon: 'calendar' as const };
  return { cor: '#6b7280', icon: 'notifications' as const };
}

export default function Notificacoes() {
  const { user, token } = useAuth();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || !token) return;
    async function carregar() {
      try {
        // Busca APENAS as notificações do usuário logado
        const res = await fetch(`${API}/notificacoes/usuario/${user!.usuario_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Erro ao carregar notificações');
        const lista: Notificacao[] = await res.json();
        setNotificacoes(lista);
        // Abriu a tela = viu os avisos: marca como lidos (a lista continua destacando os novos desta vez)
        lista.filter((n) => !n.lida).forEach((n) => marcarNotificacaoLida(n.notificacao_id, token!).catch(() => undefined));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro');
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, [user, token]);

  return (
    <ScrollView className="flex-1 bg-[#f5f7fb]" contentContainerStyle={{ paddingBottom: 32 }}>
      <CabecalhoTela titulo="Notificações" />

      {loading ? (
        <View className="mt-12 items-center"><ActivityIndicator size="large" color="#1d4ed8" /></View>
      ) : error ? (
        <View className="mx-4 mt-4 bg-red-50 rounded-2xl p-4"><Text className="text-red-700">{error}</Text></View>
      ) : notificacoes.length === 0 ? (
        <View className="items-center mt-16">
          <Ionicons name="notifications-off-outline" size={56} color="#d1d5db" />
          <Text className="text-gray-400 mt-3 text-base">Nenhuma notificação ainda</Text>
        </View>
      ) : (
        <View className="px-4 mt-6">
          {notificacoes.map((n) => {
            const badge = getBadge(n.mensagem);
            return (
              <View key={n.notificacao_id} className={`mb-3 rounded-2xl p-4 flex-row items-start border ${n.lida ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-100'}`}>
                <Ionicons name={badge.icon} size={22} color={badge.cor} style={{ marginTop: 2 }} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ fontSize: 14, color: n.lida ? '#6b7280' : '#1f2937', fontWeight: n.lida ? '400' : '600' }}>{n.mensagem}</Text>
                  <Text style={{ color: '#9ca3af', fontSize: 12, marginTop: 4 }}>
                    {new Date(n.createdAt).toLocaleString('pt-BR')}
                  </Text>
                </View>
                {!n.lida && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#1d4ed8', marginTop: 4 }} />}
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}
