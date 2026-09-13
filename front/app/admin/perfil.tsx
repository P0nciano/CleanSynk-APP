import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AdminHeader from 'src/components/AdminHeader';
import { useAuth } from 'src/context/auth';

const API = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
type Aba = 'Perfil' | 'Alertas' | 'Preços';

type Notificacao = {
  notificacao_id: number;
  mensagem: string;
  lida: boolean;
  createdAt: string;
};

type Lavanderia = { lavanderia_id: number; nome: string };
type PrecoLocal = { lava_seca: string; secagem: string };

function getBadge(msg: string) {
  const m = msg.toLowerCase();
  if (m.includes('falha') || m.includes('erro')) return { cor: '#ef4444', label: 'Crítico' };
  if (m.includes('manutenção') || m.includes('manutenção')) return { cor: '#f59e0b', label: 'Atenção' };
  if (m.includes('liberada') || m.includes('concluída') || m.includes('concluida')) return { cor: '#22c55e', label: 'Concluído' };
  if (m.includes('nova reserva') || m.includes('reserva criada')) return { cor: '#1d4ed8', label: 'Reserva' };
  if (m.includes('pagamento')) return { cor: '#8b5cf6', label: 'Pagamento' };
  return { cor: '#6b7280', label: 'Info' };
}

export default function AdminPerfil() {
  const { user, signOut, token } = useAuth();
  const [aba, setAba] = useState<Aba>('Perfil');

  const [alertas, setAlertas] = useState<Notificacao[]>([]);
  const [loadingAlertas, setLoadingAlertas] = useState(false);

  const [lavanderias, setLavanderias] = useState<Lavanderia[]>([]);
  const [precoPadrao, setPrecoPadrao] = useState<PrecoLocal>({ lava_seca: '30,00', secagem: '12,00' });
  const [precosLav, setPrecosLav] = useState<Record<number, PrecoLocal>>({});
  const [savingPreco, setSavingPreco] = useState<number | null>(null);

  useEffect(() => {
    if (aba === 'Alertas') carregarAlertas();
    if (aba === 'Preços') carregarLavanderias();
  }, [aba]);

  async function carregarAlertas() {
    setLoadingAlertas(true);
    try {
      // Busca notificações do admin (usuario_id do admin)
      const res = await fetch(`${API}/notificacoes/usuario/${user?.usuario_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setAlertas(await res.json());
    } finally {
      setLoadingAlertas(false);
    }
  }

  async function carregarLavanderias() {
    const res = await fetch(`${API}/lavanderias`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data: Lavanderia[] = await res.json();
      setLavanderias(data);
      const init: Record<number, PrecoLocal> = {};
      data.forEach((l) => { init[l.lavanderia_id] = { lava_seca: '30,00', secagem: '12,00' }; });
      setPrecosLav(init);
    }
  }

  async function salvarPreco(lavanderia_id?: number) {
    setSavingPreco(lavanderia_id ?? 0);
    await new Promise((r) => setTimeout(r, 600));
    setSavingPreco(null);
    Alert.alert('Salvo', 'Preços atualizados com sucesso!');
  }

  function renderPerfil() {
    return (
      <View className="px-4 mt-4">
        <View className="bg-white rounded-3xl p-5">
          <View className="flex-row items-center gap-3 mb-4 pb-4 border-b border-gray-100">
            <View className="w-14 h-14 bg-blue-100 rounded-full items-center justify-center">
              <Ionicons name="person" size={28} color="#1d4ed8" />
            </View>
            <View>
              <Text className="text-gray-800 font-bold text-lg">{user?.nome ?? '—'}</Text>
              <Text className="text-blue-700 text-sm font-semibold">Administrador</Text>
            </View>
          </View>
          <View className="gap-3">
            <View className="flex-row items-center gap-3">
              <Ionicons name="mail-outline" size={18} color="#6b7280" />
              <Text className="text-gray-600">{user?.email ?? '—'}</Text>
            </View>
            <View className="flex-row items-center gap-3">
              <Ionicons name="shield-checkmark-outline" size={18} color="#6b7280" />
              <Text className="text-gray-600">Acesso total ao painel</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity onPress={() => signOut()} className="mt-4 bg-red-50 rounded-2xl py-4 items-center">
          <Text className="text-red-600 font-bold text-base">Sair</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderAlertas() {
    if (loadingAlertas) return <ActivityIndicator size="large" color="#1d4ed8" style={{ marginTop: 32 }} />;
    if (alertas.length === 0) {
      return (
        <View className="items-center mt-12">
          <Ionicons name="notifications-off-outline" size={48} color="#d1d5db" />
          <Text className="text-gray-400 mt-3">Nenhum alerta no momento.</Text>
        </View>
      );
    }
    return (
      <View className="px-4 mt-4 gap-3">
        {alertas.map((a) => {
          const badge = getBadge(a.mensagem);
          return (
            <View key={a.notificacao_id} className="bg-white rounded-2xl p-4 flex-row gap-3 items-start">
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: badge.cor, marginTop: 4 }} />
              <View className="flex-1">
                <Text className="text-gray-800 text-sm">{a.mensagem}</Text>
                <View className="flex-row items-center gap-2 mt-1">
                  <Text className="text-gray-400 text-xs">
                    {new Date(a.createdAt).toLocaleString('pt-BR')}
                  </Text>
                  <View style={{ backgroundColor: badge.cor + '22', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 }}>
                    <Text style={{ color: badge.cor, fontSize: 10, fontWeight: '700' }}>{badge.label}</Text>
                  </View>
                </View>
              </View>
              {!a.lida && <View className="bg-blue-100 px-2 py-0.5 rounded-full"><Text className="text-blue-700 text-xs font-bold">Novo</Text></View>}
            </View>
          );
        })}
      </View>
    );
  }

  function renderPrecos() {
    return (
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <View className="bg-white rounded-3xl p-4 mb-4">
          <Text className="text-gray-800 font-bold text-base mb-3">Preços Padrão</Text>
          <Text className="text-gray-500 text-sm mb-1">Lava e Seca</Text>
          <TextInput className="border border-gray-200 rounded-xl px-3 py-2 mb-2 text-gray-800" value={precoPadrao.lava_seca} onChangeText={(v) => setPrecoPadrao((p) => ({ ...p, lava_seca: v }))} keyboardType="decimal-pad" />
          <Text className="text-gray-500 text-sm mb-1">Secagem</Text>
          <TextInput className="border border-gray-200 rounded-xl px-3 py-2 mb-3 text-gray-800" value={precoPadrao.secagem} onChangeText={(v) => setPrecoPadrao((p) => ({ ...p, secagem: v }))} keyboardType="decimal-pad" />
          <TouchableOpacity onPress={() => salvarPreco()} className="bg-blue-700 rounded-2xl py-3 items-center">
            {savingPreco === 0 ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold">Salvar Preços</Text>}
          </TouchableOpacity>
        </View>

        <Text className="text-gray-600 font-bold text-sm mb-2 ml-1">Por Lavanderia</Text>
        {lavanderias.map((lav) => {
          const p = precosLav[lav.lavanderia_id] ?? { lava_seca: '30,00', secagem: '12,00' };
          return (
            <View key={lav.lavanderia_id} className="bg-white rounded-3xl p-4 mb-3">
              <Text className="text-gray-800 font-bold text-base mb-3">{lav.nome}</Text>
              <Text className="text-gray-500 text-sm mb-1">Lava e Seca</Text>
              <TextInput className="border border-gray-200 rounded-xl px-3 py-2 mb-2 text-gray-800" value={p.lava_seca} onChangeText={(v) => setPrecosLav((prev) => ({ ...prev, [lav.lavanderia_id]: { ...p, lava_seca: v } }))} keyboardType="decimal-pad" />
              <Text className="text-gray-500 text-sm mb-1">Secagem</Text>
              <TextInput className="border border-gray-200 rounded-xl px-3 py-2 mb-3 text-gray-800" value={p.secagem} onChangeText={(v) => setPrecosLav((prev) => ({ ...prev, [lav.lavanderia_id]: { ...p, secagem: v } }))} keyboardType="decimal-pad" />
              <TouchableOpacity onPress={() => salvarPreco(lav.lavanderia_id)} className="bg-blue-700 rounded-2xl py-3 items-center">
                {savingPreco === lav.lavanderia_id ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold">Salvar Preços</Text>}
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    );
  }

  const abas: Aba[] = ['Perfil', 'Alertas', 'Preços'];

  return (
    <View className="flex-1 bg-gray-50">
      <AdminHeader />
      <View className="flex-row bg-white mx-4 mt-4 rounded-2xl overflow-hidden">
        {abas.map((a) => (
          <TouchableOpacity key={a} onPress={() => setAba(a)} className={`flex-1 py-3 items-center ${aba === a ? 'bg-blue-700' : 'bg-white'}`}>
            <Text className={`font-semibold text-sm ${aba === a ? 'text-white' : 'text-gray-500'}`}>{a}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {aba === 'Perfil' && <ScrollView>{renderPerfil()}</ScrollView>}
      {aba === 'Alertas' && <ScrollView>{renderAlertas()}</ScrollView>}
      {aba === 'Preços' && renderPrecos()}
    </View>
  );
}
