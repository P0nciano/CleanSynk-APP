import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { AdminPagina, AbasSegmentadas, Card } from 'src/components/AdminLayout';
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
  const route = useRoute<any>();
  const [aba, setAba] = useState<Aba>('Perfil');

  // Sino e "Ver todos" abrem direto na aba de alertas
  useEffect(() => {
    if (route.params?.aba) setAba(route.params.aba);
  }, [route.params?.aba]);

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
      <View className="max-w-[820px]">
        <Card>
          <View className="flex-row items-center gap-4 mb-5 pb-5 border-b border-gray-100">
            <View className="w-[72px] h-[72px] bg-blue-100 rounded-full items-center justify-center">
              <Ionicons name="person" size={32} color="#1d4ed8" />
            </View>
            <View>
              <Text className="text-gray-900 font-bold text-[22px]">{user?.nome ?? '—'}</Text>
              <Text className="text-blue-700 text-sm font-semibold">Administrador</Text>
            </View>
          </View>
          <View className="gap-4">
            <View className="flex-row items-center gap-3">
              <Ionicons name="mail-outline" size={18} color="#6b7280" />
              <Text className="text-gray-600">{user?.email ?? '—'}</Text>
            </View>
            <View className="flex-row items-center gap-3">
              <Ionicons name="shield-checkmark-outline" size={18} color="#6b7280" />
              <Text className="text-gray-600">Acesso às suas lavanderias</Text>
            </View>
          </View>
        </Card>
        <TouchableOpacity onPress={() => signOut()} className="mt-5 bg-red-50 rounded-2xl py-4 flex-row items-center justify-center gap-2">
          <Ionicons name="log-out-outline" size={20} color="#dc2626" />
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
      <View className="max-w-[820px] gap-3">
        {alertas.map((a) => {
          const badge = getBadge(a.mensagem);
          return (
            <View key={a.notificacao_id} className="bg-white border border-gray-200 rounded-2xl p-4 flex-row gap-3 items-start">
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
      <View className="max-w-[820px]">
        <View className="bg-white border border-gray-200 rounded-2xl p-5 mb-4">
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
            <View key={lav.lavanderia_id} className="bg-white border border-gray-200 rounded-2xl p-5 mb-3">
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
      </View>
    );
  }

  return (
    <AdminPagina titulo="Perfil" subtitulo="Gerencie sua conta, veja os alertas e ajuste os preços.">
      <View className="mb-6">
        <AbasSegmentadas
          abas={(['Perfil', 'Alertas', 'Preços'] as Aba[]).map((a) => ({ id: a, rotulo: a }))}
          ativa={aba}
          onChange={setAba}
        />
      </View>
      {aba === 'Perfil' && renderPerfil()}
      {aba === 'Alertas' && renderAlertas()}
      {aba === 'Preços' && renderPrecos()}
    </AdminPagina>
  );
}
