import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Modal, TextInput, Alert, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AdminHeader from 'src/components/AdminHeader';
import { getStoredToken } from 'src/lib/auth';

const API = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

type Maquina = {
  maquina_id: number;
  numero: number;
  tipo: string;
  status: 'LIVRE' | 'OCUPADA' | 'MANUTENCAO';
};

type Lavanderia = {
  lavanderia_id: number;
  nome: string;
  endereco: string;
  maquinas: Maquina[];
};

const STATUS_COLOR: Record<string, string> = {
  LIVRE: '#22c55e',
  OCUPADA: '#1d4ed8',
  MANUTENCAO: '#f59e0b',
};

function MaquinaCard({ maquina, onManutencao }: { maquina: Maquina; onManutencao: (m: Maquina) => void }) {
  return (
    <TouchableOpacity
      onPress={() => onManutencao(maquina)}
      className="bg-white rounded-2xl p-3 items-center m-1"
      style={{ width: '46%' }}
    >
      <MaterialCommunityIcons name="washing-machine" size={32} color={STATUS_COLOR[maquina.status] ?? '#9ca3af'} />
      <Text className="text-gray-800 font-semibold text-sm mt-1">Máquina {maquina.numero.toString().padStart(2, '0')}</Text>
      <Text className="text-xs mt-0.5" style={{ color: STATUS_COLOR[maquina.status] ?? '#9ca3af' }}>
        {maquina.status === 'LIVRE' ? '+ Livre' : maquina.status === 'OCUPADA' ? '● Em uso' : '⚠ Manutenção'}
      </Text>
    </TouchableOpacity>
  );
}

export default function AdminLavanderias() {
  const [lavanderias, setLavanderias] = useState<Lavanderia[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Lavanderia | null>(null);

  // Modal cadastrar máquina
  const [showCadastro, setShowCadastro] = useState(false);
  const [numero, setNumero] = useState('');
  const [tipo, setTipo] = useState('');
  const [saving, setSaving] = useState(false);

  // Modal registrar manutenção (via botão)
  const [showManutencao, setShowManutencao] = useState(false);
  const [maquinaEscolhida, setMaquinaEscolhida] = useState<Maquina | null>(null);
  const [salvandoManutencao, setSalvandoManutencao] = useState(false);
  const [erroManutencao, setErroManutencao] = useState('');

  // Modal liberar máquina (tirar da manutenção)
  const [showLiberar, setShowLiberar] = useState(false);
  const [maquinaLiberar, setMaquinaLiberar] = useState<Maquina | null>(null);
  const [salvandoLiberar, setSalvandoLiberar] = useState(false);
  const [erroLiberar, setErroLiberar] = useState('');

  async function load() {
    try {
      const token = await getStoredToken();
      const res = await fetch(`${API}/lavanderias`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      const data: Lavanderia[] = await res.json();
      setLavanderias(data);
      if (selected) {
        const updated = data.find((l) => l.lavanderia_id === selected.lavanderia_id);
        if (updated) setSelected(updated);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function registrarManutencao(maquina: Maquina) {
    const novoStatus = maquina.status === 'MANUTENCAO' ? 'LIVRE' : 'MANUTENCAO';
    const label = novoStatus === 'MANUTENCAO' ? 'Registrar manutenção' : 'Liberar máquina';
    Alert.alert(label, `Deseja alterar o status da Máquina ${maquina.numero} para ${novoStatus}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar', onPress: async () => {
          const token = await getStoredToken();
          await fetch(`${API}/maquinas/${maquina.maquina_id}/status`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: novoStatus }),
          });
          load();
        }
      }
    ]);
  }

  async function confirmarManutencaoModal() {
    setErroManutencao('');
    if (!maquinaEscolhida) {
      setErroManutencao('Selecione uma máquina antes de confirmar.');
      return;
    }
    if (!API) {
      setErroManutencao('EXPO_PUBLIC_API_URL não configurada no .env do front.');
      return;
    }
    setSalvandoManutencao(true);
    try {
      const token = await getStoredToken();
      const res = await fetch(`${API}/maquinas/${maquinaEscolhida.maquina_id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'MANUTENCAO' }),
      });
      if (!res.ok) {
        const texto = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} ${texto}`);
      }
      setShowManutencao(false);
      setMaquinaEscolhida(null);
      load();
    } catch (err: any) {
      console.error('Erro ao registrar manutenção:', err);
      setErroManutencao(
        err?.message?.includes('Network')
          ? 'Não foi possível conectar ao servidor. Verifique se o backend está rodando e o IP em EXPO_PUBLIC_API_URL está correto.'
          : `Falha ao registrar manutenção: ${err?.message ?? 'erro desconhecido'}`
      );
    } finally {
      setSalvandoManutencao(false);
    }
  }

  async function confirmarLiberacao() {
    setErroLiberar('');
    if (!maquinaLiberar) {
      setErroLiberar('Selecione uma máquina antes de confirmar.');
      return;
    }
    setSalvandoLiberar(true);
    try {
      const token = await getStoredToken();
      const res = await fetch(`${API}/maquinas/${maquinaLiberar.maquina_id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'LIVRE' }),
      });
      if (!res.ok) {
        const texto = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} ${texto}`);
      }
      setShowLiberar(false);
      setMaquinaLiberar(null);
      load();
    } catch (err: any) {
      console.error('Erro ao liberar máquina:', err);
      setErroLiberar(`Falha ao liberar máquina: ${err?.message ?? 'erro desconhecido'}`);
    } finally {
      setSalvandoLiberar(false);
    }
  }

  async function cadastrarMaquina() {
    if (!numero || !tipo || !selected) return;
    setSaving(true);
    try {
      const token = await getStoredToken();
      const res = await fetch(`${API}/maquinas`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lavanderia_id: selected.lavanderia_id,
          numero: Number(numero),
          tipo,
          status: 'LIVRE',
        }),
      });
      if (!res.ok) throw new Error();
      setShowCadastro(false);
      setNumero('');
      setTipo('');
      load();
    } catch {
      Alert.alert('Erro', 'Não foi possível cadastrar a máquina.');
    } finally {
      setSaving(false);
    }
  }

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

  // Tela detalhe da lavanderia
  if (selected) {
    const livre = selected.maquinas.filter((m) => m.status === 'LIVRE').length;
    const ocupada = selected.maquinas.filter((m) => m.status === 'OCUPADA').length;
    const manut = selected.maquinas.filter((m) => m.status === 'MANUTENCAO').length;

    return (
      <View className="flex-1 bg-gray-50">
        <AdminHeader />
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          {/* Tabs simulados */}
          <View className="flex-row bg-white mx-4 mt-4 rounded-2xl overflow-hidden">
            <TouchableOpacity onPress={() => setSelected(null)} className="flex-1 py-3 items-center bg-blue-50">
              <Text className="text-blue-700 text-sm font-semibold">← Voltar</Text>
            </TouchableOpacity>
            <View className="flex-1 py-3 items-center bg-blue-700">
              <Text className="text-white text-sm font-semibold">Máquinas</Text>
            </View>
            <TouchableOpacity onPress={() => setShowCadastro(true)} className="flex-1 py-3 items-center bg-blue-50">
              <Text className="text-blue-700 text-sm font-semibold">+ Cadastrar</Text>
            </TouchableOpacity>
          </View>

          {/* Botões manutenção */}
          <View className="mx-4 mt-3 flex-row gap-2">
            <TouchableOpacity
              onPress={() => { setMaquinaEscolhida(null); setErroManutencao(''); setShowManutencao(true); }}
              className="flex-1 bg-blue-700 rounded-2xl py-3 items-center"
            >
              <Text className="text-white font-bold">+ Registrar manutenção</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setMaquinaLiberar(null); setErroLiberar(''); setShowLiberar(true); }}
              className="flex-1 bg-amber-500 rounded-2xl py-3 items-center"
            >
              <Text className="text-white font-bold">Liberar máquina</Text>
            </TouchableOpacity>
          </View>

          {/* Status resumo */}
          <View className="mx-4 mt-3 flex-row gap-2">
            <View className="flex-1 bg-green-50 rounded-2xl p-3 items-center">
              <Text className="text-green-600 text-xl font-bold">{livre}</Text>
              <Text className="text-green-600 text-xs">Livres</Text>
            </View>
            <View className="flex-1 bg-blue-50 rounded-2xl p-3 items-center">
              <Text className="text-blue-600 text-xl font-bold">{ocupada}</Text>
              <Text className="text-blue-600 text-xs">Em uso</Text>
            </View>
            <View className="flex-1 bg-yellow-50 rounded-2xl p-3 items-center">
              <Text className="text-yellow-600 text-xl font-bold">{manut}</Text>
              <Text className="text-yellow-600 text-xs">Manutenção</Text>
            </View>
          </View>

          {/* Nome lavanderia */}
          <Text className="mx-4 mt-4 text-blue-700 font-bold text-base">{selected.nome}</Text>

          {/* Grid máquinas */}
          <View className="mx-4 mt-2 flex-row flex-wrap">
            {selected.maquinas.map((m) => (
              <MaquinaCard key={m.maquina_id} maquina={m} onManutencao={registrarManutencao} />
            ))}
            {selected.maquinas.length === 0 && (
              <Text className="text-gray-400 text-sm mt-2">Nenhuma máquina cadastrada.</Text>
            )}
          </View>
        </ScrollView>

        {/* Modal cadastrar máquina */}
        <Modal visible={showCadastro} animationType="slide" transparent>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View className="flex-1 bg-black/40 justify-end">
            <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'}>
            <View className="bg-white rounded-t-3xl p-6">
              <Text className="text-gray-800 font-bold text-lg mb-4">Nova máquina</Text>
              <Text className="text-gray-500 text-sm mb-1">Número</Text>
              <TextInput
                className="border border-gray-200 rounded-xl px-3 py-2 mb-3 text-gray-800"
                placeholder="Ex: 5"
                keyboardType="numeric"
                value={numero}
                onChangeText={setNumero}
                returnKeyType="done"
                blurOnSubmit
                onSubmitEditing={Keyboard.dismiss}
              />
              <Text className="text-gray-500 text-sm mb-1">Tipo</Text>
              <TextInput
                className="border border-gray-200 rounded-xl px-3 py-2 mb-4 text-gray-800"
                placeholder="Ex: Lava e Seca W7000"
                value={tipo}
                onChangeText={setTipo}
                returnKeyType="done"
                blurOnSubmit
                onSubmitEditing={Keyboard.dismiss}
              />
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setShowCadastro(false)}
                  className="flex-1 border border-gray-200 rounded-2xl py-3 items-center"
                >
                  <Text className="text-gray-600 font-semibold">Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={cadastrarMaquina}
                  disabled={saving}
                  className="flex-1 bg-blue-700 rounded-2xl py-3 items-center"
                >
                  {saving ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white font-bold">Cadastrar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
            </KeyboardAvoidingView>
          </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Modal registrar manutenção */}
        <Modal visible={showManutencao} animationType="slide" transparent>
          <View className="flex-1 bg-black/40 justify-end">
            <View className="bg-white rounded-t-3xl p-6" style={{ maxHeight: '80%' }}>
              <Text className="text-gray-800 font-bold text-lg mb-1">Registrar manutenção</Text>
              <Text className="text-gray-500 text-sm mb-4">Selecione a máquina que entrará em manutenção.</Text>

              <ScrollView style={{ maxHeight: 320 }}>
                {selected.maquinas
                  .filter((m) => m.status !== 'MANUTENCAO')
                  .map((m) => {
                    const isChosen = maquinaEscolhida?.maquina_id === m.maquina_id;
                    return (
                      <TouchableOpacity
                        key={m.maquina_id}
                        activeOpacity={0.7}
                        onPress={() => setMaquinaEscolhida(m)}
                        className="flex-row items-center justify-between rounded-2xl px-4 py-3 mb-2"
                        style={{
                          borderWidth: 1,
                          borderColor: isChosen ? '#1d4ed8' : '#e5e7eb',
                          backgroundColor: isChosen ? '#eff6ff' : '#ffffff',
                        }}
                      >
                        <View className="flex-row items-center gap-3">
                          <MaterialCommunityIcons
                            name="washing-machine"
                            size={22}
                            color={STATUS_COLOR[m.status] ?? '#9ca3af'}
                          />
                          <View>
                            <Text className="text-gray-800 font-semibold text-sm">
                              Máquina {m.numero.toString().padStart(2, '0')}
                            </Text>
                            <Text className="text-xs" style={{ color: STATUS_COLOR[m.status] ?? '#9ca3af' }}>
                              {m.status === 'LIVRE' ? 'Livre' : 'Em uso'}
                            </Text>
                          </View>
                        </View>
                        {isChosen && (
                          <Ionicons name="checkmark-circle" size={22} color="#1d4ed8" />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                {selected.maquinas.filter((m) => m.status !== 'MANUTENCAO').length === 0 && (
                  <Text className="text-gray-400 text-sm text-center py-4">
                    Todas as máquinas já estão em manutenção.
                  </Text>
                )}
              </ScrollView>

              {erroManutencao ? (
                <Text className="text-red-600 text-sm mt-3">{erroManutencao}</Text>
              ) : null}

              <View className="flex-row gap-3 mt-4">
                <TouchableOpacity
                  onPress={() => { setShowManutencao(false); setMaquinaEscolhida(null); setErroManutencao(''); }}
                  className="flex-1 border border-gray-200 rounded-2xl py-3 items-center"
                >
                  <Text className="text-gray-600 font-semibold">Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={confirmarManutencaoModal}
                  disabled={!maquinaEscolhida || salvandoManutencao}
                  className="flex-1 bg-blue-700 rounded-2xl py-3 items-center"
                  style={{ opacity: !maquinaEscolhida || salvandoManutencao ? 0.5 : 1 }}
                >
                  {salvandoManutencao ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white font-bold">Confirmar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal liberar máquina */}
        <Modal visible={showLiberar} animationType="slide" transparent>
          <View className="flex-1 bg-black/40 justify-end">
            <View className="bg-white rounded-t-3xl p-6" style={{ maxHeight: '80%' }}>
              <Text className="text-gray-800 font-bold text-lg mb-1">Liberar máquina</Text>
              <Text className="text-gray-500 text-sm mb-4">Selecione a máquina que sairá de manutenção.</Text>

              <ScrollView style={{ maxHeight: 320 }}>
                {selected.maquinas
                  .filter((m) => m.status === 'MANUTENCAO')
                  .map((m) => {
                    const isChosen = maquinaLiberar?.maquina_id === m.maquina_id;
                    return (
                      <TouchableOpacity
                        key={m.maquina_id}
                        activeOpacity={0.7}
                        onPress={() => setMaquinaLiberar(m)}
                        className="flex-row items-center justify-between rounded-2xl px-4 py-3 mb-2"
                        style={{
                          borderWidth: 1,
                          borderColor: isChosen ? '#1d4ed8' : '#e5e7eb',
                          backgroundColor: isChosen ? '#eff6ff' : '#ffffff',
                        }}
                      >
                        <View className="flex-row items-center gap-3">
                          <MaterialCommunityIcons
                            name="washing-machine"
                            size={22}
                            color={STATUS_COLOR[m.status] ?? '#9ca3af'}
                          />
                          <View>
                            <Text className="text-gray-800 font-semibold text-sm">
                              Máquina {m.numero.toString().padStart(2, '0')}
                            </Text>
                            <Text className="text-xs" style={{ color: STATUS_COLOR[m.status] ?? '#9ca3af' }}>
                              Manutenção
                            </Text>
                          </View>
                        </View>
                        {isChosen && (
                          <Ionicons name="checkmark-circle" size={22} color="#1d4ed8" />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                {selected.maquinas.filter((m) => m.status === 'MANUTENCAO').length === 0 && (
                  <Text className="text-gray-400 text-sm text-center py-4">
                    Nenhuma máquina em manutenção no momento.
                  </Text>
                )}
              </ScrollView>

              {erroLiberar ? (
                <Text className="text-red-600 text-sm mt-3">{erroLiberar}</Text>
              ) : null}

              <View className="flex-row gap-3 mt-4">
                <TouchableOpacity
                  onPress={() => { setShowLiberar(false); setMaquinaLiberar(null); setErroLiberar(''); }}
                  className="flex-1 border border-gray-200 rounded-2xl py-3 items-center"
                >
                  <Text className="text-gray-600 font-semibold">Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={confirmarLiberacao}
                  disabled={!maquinaLiberar || salvandoLiberar}
                  className="flex-1 bg-amber-500 rounded-2xl py-3 items-center"
                  style={{ opacity: !maquinaLiberar || salvandoLiberar ? 0.5 : 1 }}
                >
                  {salvandoLiberar ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white font-bold">Confirmar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // Lista de lavanderias
  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ paddingBottom: 24 }}>
      <AdminHeader />
      <View className="px-4 py-4">
        <Text className="text-xl font-bold text-gray-800">Lavanderias</Text>
      </View>
      {lavanderias.map((lav) => {
        const livre = lav.maquinas.filter((m) => m.status === 'LIVRE').length;
        const ocupada = lav.maquinas.filter((m) => m.status === 'OCUPADA').length;
        const manut = lav.maquinas.filter((m) => m.status === 'MANUTENCAO').length;
        return (
          <TouchableOpacity
            key={lav.lavanderia_id}
            onPress={() => setSelected(lav)}
            className="mx-4 mb-3 bg-white rounded-3xl p-4"
          >
            <Text className="text-gray-800 font-bold text-base">{lav.nome}</Text>
            <Text className="text-gray-400 text-xs mb-3">{lav.endereco}</Text>
            <View className="flex-row gap-3">
              <View className="flex-row items-center gap-1">
                <View className="w-2 h-2 rounded-full bg-green-500" />
                <Text className="text-green-600 text-sm font-semibold">{livre} Livres</Text>
              </View>
              <View className="flex-row items-center gap-1">
                <View className="w-2 h-2 rounded-full bg-blue-500" />
                <Text className="text-blue-600 text-sm font-semibold">{ocupada} Em uso</Text>
              </View>
              <View className="flex-row items-center gap-1">
                <View className="w-2 h-2 rounded-full bg-yellow-400" />
                <Text className="text-yellow-600 text-sm font-semibold">{manut} Manut.</Text>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
      {lavanderias.length === 0 && (
        <View className="items-center mt-12">
          <Text className="text-gray-400">Nenhuma lavanderia encontrada.</Text>
        </View>
      )}
    </ScrollView>
  );
}
