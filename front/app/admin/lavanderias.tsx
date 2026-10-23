import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Modal, TextInput, Alert, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import FotoLavanderia from 'src/components/FotoLavanderia';
import { salvarFotoLavanderia } from 'src/lib/api';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { AdminPagina, AbasSegmentadas } from 'src/components/AdminLayout';
import { getStoredToken } from 'src/lib/auth';

const API = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

// No navegador, fechar o teclado ao tocar tira o foco do campo que acabou de ser clicado
const fecharTeclado = Platform.OS === 'web' ? undefined : Keyboard.dismiss;

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
  foto_versao?: number;
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
      className="bg-white border border-gray-200 rounded-2xl p-4 items-center w-[47%] md:w-[23%] lg:w-[18%]"
    >
      <View className="w-12 h-12 rounded-xl items-center justify-center mb-1" style={{ backgroundColor: (STATUS_COLOR[maquina.status] ?? '#9ca3af') + '1a' }}>
        <MaterialCommunityIcons name="washing-machine" size={28} color={STATUS_COLOR[maquina.status] ?? '#9ca3af'} />
      </View>
      <Text className="text-gray-800 font-semibold text-sm mt-1">Máquina {maquina.numero.toString().padStart(2, '0')}</Text>
      <Text className="text-xs mt-0.5" style={{ color: STATUS_COLOR[maquina.status] ?? '#9ca3af' }}>
        {maquina.status === 'LIVRE' ? '+ Livre' : maquina.status === 'OCUPADA' ? '● Em uso' : '⚠ Manutenção'}
      </Text>
    </TouchableOpacity>
  );
}

// Quadro de contagem (Livres / Em uso / Manutenção)
function Contador({ valor, rotulo, cor, fundo, icone }: { valor: number; rotulo: string; cor: string; fundo: string; icone: React.ReactNode }) {
  return (
    <View className="flex-1 bg-white border border-gray-200 rounded-2xl p-3 gap-2 md:p-6 md:flex-row md:items-center md:gap-4">
      <View className="w-12 h-12 rounded-xl items-center justify-center" style={{ backgroundColor: fundo }}>{icone}</View>
      <View>
        <Text className="text-[26px] md:text-[32px] font-bold" style={{ color: cor }}>{valor}</Text>
        <Text className="text-gray-600 text-sm">{rotulo}</Text>
      </View>
    </View>
  );
}

export default function AdminLavanderias() {
  const route = useRoute<any>();
  // Busca da barra superior
  const busca: string = (route.params?.busca ?? '').toLowerCase();
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

  // Modal nova lavanderia (admin novo começa sem nenhuma)
  const [showNovaLav, setShowNovaLav] = useState(false);
  const [nomeLav, setNomeLav] = useState('');
  const [enderecoLav, setEnderecoLav] = useState('');
  const [salvandoLav, setSalvandoLav] = useState(false);
  const [erroLav, setErroLav] = useState('');
  const [fotoLav, setFotoLav] = useState<{ uri: string; base64?: string } | null>(null);

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

  // Foto opcional: reduz para 800 px em JPEG (~100 KB) antes de enviar; null = cancelou
  async function escolherImagem() {
    const escolha = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1 });
    if (escolha.canceled) return null;
    const contexto = ImageManipulator.manipulate(escolha.assets[0].uri);
    contexto.resize({ width: 800 });
    const imagem = await contexto.renderAsync();
    return imagem.saveAsync({ compress: 0.7, format: SaveFormat.JPEG, base64: true });
  }

  async function escolherFoto() {
    try {
      const foto = await escolherImagem();
      if (foto) setFotoLav(foto);
    } catch {
      setErroLav('Não foi possível carregar a foto.');
    }
  }

  // Trocar ou remover (null) a foto da lavanderia aberta
  const [salvandoFoto, setSalvandoFoto] = useState(false);
  async function trocarFoto(remover = false) {
    if (!selected) return;
    try {
      const foto = remover ? null : await escolherImagem();
      if (!remover && !foto) return;
      setSalvandoFoto(true);
      await salvarFotoLavanderia(selected.lavanderia_id, foto?.base64 ?? null, (await getStoredToken()) ?? undefined);
      await load();
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível salvar a foto.');
    } finally {
      setSalvandoFoto(false);
    }
  }

  async function cadastrarLavanderia() {
    if (!nomeLav.trim() || !enderecoLav.trim()) return setErroLav('Preencha nome e endereço.');
    setSalvandoLav(true);
    setErroLav('');
    try {
      const token = await getStoredToken();
      const res = await fetch(`${API}/lavanderias`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nomeLav.trim(), endereco: enderecoLav.trim(), foto: fotoLav?.base64 }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? 'Não foi possível cadastrar a lavanderia.');
      setShowNovaLav(false);
      setNomeLav('');
      setEnderecoLav('');
      setFotoLav(null);
      load();
    } catch (err: any) {
      setErroLav(err?.message ?? 'Não foi possível cadastrar a lavanderia.');
    } finally {
      setSalvandoLav(false);
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
      <AdminPagina titulo="Lavanderias">
        <ActivityIndicator size="large" color="#1d4ed8" className="mt-10" />
      </AdminPagina>
    );
  }

  // Tela detalhe da lavanderia
  if (selected) {
    const livre = selected.maquinas.filter((m) => m.status === 'LIVRE').length;
    const ocupada = selected.maquinas.filter((m) => m.status === 'OCUPADA').length;
    const manut = selected.maquinas.filter((m) => m.status === 'MANUTENCAO').length;

    const abrirManutencao = () => { setMaquinaEscolhida(null); setErroManutencao(''); setShowManutencao(true); };
    const abrirLiberar = () => { setMaquinaLiberar(null); setErroLiberar(''); setShowLiberar(true); };

    return (
      <View className="flex-1">
        <AdminPagina
          titulo={selected.nome}
          subtitulo="Acompanhe as máquinas, registre manutenções e libere equipamentos."
          onVoltar={() => setSelected(null)}
          acoes={
            <>
              <TouchableOpacity onPress={abrirLiberar} className="flex-1 md:flex-none items-center bg-amber-500 rounded-xl px-3 md:px-5 py-3">
                <Text className="text-gray-900 font-semibold text-sm md:text-base">Liberar máquina</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={abrirManutencao} className="flex-1 md:flex-none bg-blue-700 rounded-xl px-3 md:px-5 py-3 flex-row items-center justify-center gap-2">
                <Ionicons name="add" size={18} color="white" className="hidden md:flex" />
                <Text className="text-white font-semibold text-sm md:text-base">Registrar manutenção</Text>
              </TouchableOpacity>
            </>
          }
        >
          <View className="bg-white border border-gray-200 rounded-2xl p-4 mb-6 flex-row items-center gap-4">
            <FotoLavanderia lavanderia={selected} tamanho={56} />
            <View className="flex-1">
              <Text className="text-gray-900 font-semibold">Foto da lavanderia</Text>
              <Text className="text-gray-400 text-xs">Aparece para os clientes na lista e no detalhe</Text>
            </View>
            {salvandoFoto ? (
              <ActivityIndicator color="#1d4ed8" />
            ) : (
              <View className="flex-row gap-4">
                <TouchableOpacity onPress={() => trocarFoto()}>
                  <Text className="text-blue-700 font-semibold">{selected.foto_versao ? 'Trocar' : 'Adicionar'}</Text>
                </TouchableOpacity>
                {selected.foto_versao ? (
                  <TouchableOpacity onPress={() => trocarFoto(true)}>
                    <Text className="text-red-600 font-semibold">Remover</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
          </View>

          <View className="mb-6">
            <AbasSegmentadas
              abas={[{ id: 'maquinas', rotulo: 'Máquinas' }, { id: 'cadastrar', rotulo: '+ Cadastrar' }]}
              ativa="maquinas"
              onChange={(id) => { if (id === 'cadastrar') setShowCadastro(true); }}
            />
          </View>

          <View className="flex-row gap-3 md:gap-5 mb-6">
            <Contador valor={livre} rotulo="Livres" cor="#15803d" fundo="#dcfce7" icone={<Ionicons name="checkmark" size={22} color="#16a34a" />} />
            <Contador valor={ocupada} rotulo="Em uso" cor="#1d4ed8" fundo="#dbeafe" icone={<MaterialCommunityIcons name="washing-machine" size={22} color="#1d4ed8" />} />
            <Contador valor={manut} rotulo="Manutenção" cor="#b45309" fundo="#fef3c7" icone={<Ionicons name="build-outline" size={20} color="#b45309" />} />
          </View>

          <View className="bg-white border border-gray-200 rounded-2xl p-7">
            <Text className="text-gray-900 font-bold text-base mb-4">Máquinas</Text>
            {selected.maquinas.length === 0 ? (
              <View className="border border-dashed border-gray-200 rounded-2xl py-14 px-6 items-center">
                <View className="w-14 h-14 rounded-2xl bg-blue-50 items-center justify-center mb-4">
                  <MaterialCommunityIcons name="washing-machine" size={26} color="#1d4ed8" />
                </View>
                <Text className="text-gray-900 font-bold">Nenhuma máquina cadastrada</Text>
                <Text className="text-gray-400 text-sm text-center mt-1 max-w-[360px]">
                  Cadastre a primeira máquina para acompanhar o uso e a manutenção.
                </Text>
                <TouchableOpacity onPress={() => setShowCadastro(true)} className="mt-5 bg-blue-700 rounded-xl px-5 py-3 flex-row items-center gap-2">
                  <Ionicons name="add" size={18} color="white" />
                  <Text className="text-white font-semibold">Cadastrar máquina</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="flex-row flex-wrap gap-3">
                {selected.maquinas.map((m) => (
                  <MaquinaCard key={m.maquina_id} maquina={m} onManutencao={registrarManutencao} />
                ))}
              </View>
            )}
          </View>
        </AdminPagina>

        {/* Modal cadastrar máquina */}
        <Modal visible={showCadastro} animationType="slide" transparent>
          <TouchableWithoutFeedback onPress={fecharTeclado}>
          <View className="flex-1 bg-black/40 justify-end md:justify-center md:items-center">
            <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'}>
            <View className="bg-white rounded-t-3xl p-6 md:rounded-3xl md:w-[480px]">
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
          <View className="flex-1 bg-black/40 justify-end md:justify-center md:items-center">
            <View className="bg-white rounded-t-3xl p-6 md:rounded-3xl md:w-[480px]" style={{ maxHeight: '80%' }}>
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
          <View className="flex-1 bg-black/40 justify-end md:justify-center md:items-center">
            <View className="bg-white rounded-t-3xl p-6 md:rounded-3xl md:w-[480px]" style={{ maxHeight: '80%' }}>
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
  const visiveis = lavanderias.filter((l) => !busca || `${l.nome} ${l.endereco}`.toLowerCase().includes(busca));

  return (
    <View className="flex-1">
      <AdminPagina
        titulo="Lavanderias"
        subtitulo={busca ? `Resultados para "${route.params?.busca}"` : 'Escolha uma lavanderia para ver e gerenciar as máquinas.'}
        acoes={
          <TouchableOpacity onPress={() => { setErroLav(''); setShowNovaLav(true); }} className="bg-blue-700 rounded-xl px-5 py-3 flex-row items-center gap-2">
            <Ionicons name="add" size={18} color="white" />
            <Text className="text-white font-semibold">Nova lavanderia</Text>
          </TouchableOpacity>
        }
      >
        <View className="flex-row flex-wrap gap-5">
          {visiveis.map((lav) => {
            const livre = lav.maquinas.filter((m) => m.status === 'LIVRE').length;
            const ocupada = lav.maquinas.filter((m) => m.status === 'OCUPADA').length;
            const manut = lav.maquinas.filter((m) => m.status === 'MANUTENCAO').length;
            return (
              <TouchableOpacity
                key={lav.lavanderia_id}
                onPress={() => setSelected(lav)}
                className="bg-white border border-gray-200 rounded-2xl p-6 w-full md:w-[48%] lg:w-[31.5%]"
              >
                <View className="flex-row items-center gap-3 mb-4">
                  <FotoLavanderia lavanderia={lav} tamanho={44} />
                  <View className="flex-1">
                    <Text className="text-gray-900 font-bold text-base" numberOfLines={1}>{lav.nome}</Text>
                    <Text className="text-gray-400 text-xs" numberOfLines={1}>{lav.endereco}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                </View>
                <View className="flex-row gap-4 pt-4 border-t border-gray-100">
                  <View className="flex-row items-center gap-1.5">
                    <View className="w-2 h-2 rounded-full bg-green-500" />
                    <Text className="text-gray-600 text-sm">{livre} livres</Text>
                  </View>
                  <View className="flex-row items-center gap-1.5">
                    <View className="w-2 h-2 rounded-full bg-blue-600" />
                    <Text className="text-gray-600 text-sm">{ocupada} em uso</Text>
                  </View>
                  <View className="flex-row items-center gap-1.5">
                    <View className="w-2 h-2 rounded-full bg-amber-500" />
                    <Text className="text-gray-600 text-sm">{manut} manut.</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        {visiveis.length === 0 && (
          <View className="bg-white border border-dashed border-gray-200 rounded-2xl py-14 items-center">
            <Text className="text-gray-400">
              {busca ? 'Nenhuma lavanderia encontrada.' : 'Você ainda não tem lavanderias. Cadastre a primeira.'}
            </Text>
          </View>
        )}
      </AdminPagina>

      {/* Modal nova lavanderia */}
      <Modal visible={showNovaLav} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={fecharTeclado}>
        <View className="flex-1 bg-black/40 justify-end md:justify-center md:items-center">
          <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'}>
          <View className="bg-white rounded-t-3xl p-6 md:rounded-3xl md:w-[480px]">
            <Text className="text-gray-800 font-bold text-lg mb-4">Nova lavanderia</Text>
            <Text className="text-gray-500 text-sm mb-1">Nome</Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-3 py-2 mb-3 text-gray-800"
              placeholder="Ex: Lavanderia Centro"
              value={nomeLav}
              onChangeText={setNomeLav}
            />
            <Text className="text-gray-500 text-sm mb-1">Endereço</Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-3 py-2 mb-4 text-gray-800"
              placeholder="Rua, número, cidade"
              value={enderecoLav}
              onChangeText={setEnderecoLav}
            />
            <Text className="text-gray-500 text-sm mb-1">Foto (opcional)</Text>
            {fotoLav ? (
              <View className="flex-row items-center gap-4 mb-4">
                <Image source={{ uri: fotoLav.uri }} style={{ width: 64, height: 64, borderRadius: 12 }} accessibilityLabel="Foto escolhida" />
                <TouchableOpacity onPress={escolherFoto}>
                  <Text className="text-blue-700 font-semibold">Trocar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setFotoLav(null)}>
                  <Text className="text-red-600 font-semibold">Remover</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={escolherFoto} className="border border-dashed border-gray-300 rounded-xl py-4 mb-4 flex-row items-center justify-center gap-2">
                <Ionicons name="camera-outline" size={20} color="#1d4ed8" />
                <Text className="text-blue-700 font-semibold">Adicionar foto</Text>
              </TouchableOpacity>
            )}
            {erroLav ? <Text className="text-red-600 text-sm mb-3">{erroLav}</Text> : null}
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => { setShowNovaLav(false); setFotoLav(null); }}
                className="flex-1 border border-gray-200 rounded-2xl py-3 items-center"
              >
                <Text className="text-gray-600 font-semibold">Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={cadastrarLavanderia}
                disabled={salvandoLav}
                className="flex-1 bg-blue-700 rounded-2xl py-3 items-center"
              >
                {salvandoLav ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold">Cadastrar</Text>}
              </TouchableOpacity>
            </View>
          </View>
          </KeyboardAvoidingView>
        </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}
