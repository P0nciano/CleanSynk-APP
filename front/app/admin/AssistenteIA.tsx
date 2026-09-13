import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from 'src/context/auth';

const API = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

type Ocorrencia = {
  titulo: string;
  descricao: string;
  categoria: string;
  setor: string;
  tempoParadoHoras: string;
  envolveCliente: boolean;
  qtdAfetados: string;
};

type OcorrenciaBanco = {
  ocorrencia_id: number;
  titulo: string;
  descricao: string;
  categoria: string;
  impacto: string;
  setor: string;
  tempoParadoHoras: number;
  envolveCliente: boolean;
  qtdAfetados: number;
  createdAt: string;
};

type Analise = {
  indice?: number;
  nivelCriticidade?: string;
  prioridade?: string;
  recomendacao?: string;
  justificativa?: string;
};

const OCORRENCIA_VAZIA: Ocorrencia = {
  titulo: '', descricao: '', categoria: 'operacional',
  setor: 'lavagem', tempoParadoHoras: '0',
  envolveCliente: false, qtdAfetados: '0',
};

const CATEGORIAS = ['operacional', 'equipamento', 'insumo', 'cliente', 'segurança'];

const COR_CRITICIDADE: Record<string, string> = {
  baixa: '#22c55e', media: '#f59e0b', alta: '#ef4444', critica: '#7c3aed',
};

export default function AssistenteIA() {
  const navigation = useNavigation();
  const { token } = useAuth();

  const [aba, setAba] = useState<'nova' | 'banco'>('nova');
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([{ ...OCORRENCIA_VAZIA }]);
  const [ocorrenciasBanco, setOcorrenciasBanco] = useState<OcorrenciaBanco[]>([]);
  const [loadingBanco, setLoadingBanco] = useState(false);
  const [loading, setLoading] = useState(false);
  const [relatorio, setRelatorio] = useState<Analise[] | null>(null);

  // Carregar ocorrências do banco
  useEffect(() => {
    if (aba === 'banco') carregarBanco();
  }, [aba]);

  async function carregarBanco() {
    setLoadingBanco(true);
    try {
      const res = await fetch(`${API}/assistente-ia/analisar`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Nenhuma ocorrência cadastrada ainda');
      const data = await res.json();
      setOcorrenciasBanco(data.ocorrencias ?? []);
    } catch (e) {
      setOcorrenciasBanco([]);
    } finally {
      setLoadingBanco(false);
    }
  }

  function atualizar(idx: number, campo: keyof Ocorrencia, valor: string | boolean) {
    setOcorrencias((prev) => prev.map((o, i) => i === idx ? { ...o, [campo]: valor } : o));
  }

  function adicionarOcorrencia() {
    setOcorrencias((prev) => [...prev, { ...OCORRENCIA_VAZIA }]);
  }

  function removerOcorrencia(idx: number) {
    if (ocorrencias.length === 1) return;
    setOcorrencias((prev) => prev.filter((_, i) => i !== idx));
  }

  // Envia novas ocorrências — IA decide o nível de impacto
  async function analisarNovas() {
    const validas = ocorrencias.filter((o) => o.titulo.trim() || o.descricao.trim());
    if (validas.length === 0) {
      Alert.alert('Atenção', 'Preencha ao menos o título ou descrição de uma ocorrência.');
      return;
    }
    setLoading(true);
    setRelatorio(null);
    try {
      const payload = validas.map((o) => ({
        titulo: o.titulo,
        descricao: o.descricao,
        categoria: o.categoria,
        // impacto omitido — IA vai decidir com base nos outros campos
        setor: o.setor,
        tempoParadoHoras: Number(o.tempoParadoHoras) || 0,
        envolveCliente: o.envolveCliente,
        qtdAfetados: Number(o.qtdAfetados) || 0,
      }));
      const res = await fetch(`${API}/assistente-ia/analisar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ocorrencias: payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao consultar a IA');
      extrairRelatorio(data);
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível gerar o relatório.');
    } finally {
      setLoading(false);
    }
  }

  // Analisa ocorrências já salvas no banco
  async function analisarBanco() {
    if (ocorrenciasBanco.length === 0) {
      Alert.alert('Atenção', 'Não há ocorrências cadastradas no banco.');
      return;
    }
    setLoading(true);
    setRelatorio(null);
    try {
      // Usa o GET que já busca do banco e analisa
      const res = await fetch(`${API}/assistente-ia/analisar`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao consultar a IA');
      extrairRelatorio(data);
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível gerar o relatório.');
    } finally {
      setLoading(false);
    }
  }

  function extrairRelatorio(data: any) {
    // Tenta extrair o array de análises de qualquer estrutura que a IA retorne
    const analise = data?.resumo?.analiseIA ?? data?.analiseIA ?? data;
    let lista: Analise[] = [];

    if (Array.isArray(analise)) {
      lista = analise;
    } else if (analise && typeof analise === 'object') {
      // Alguns modelos retornam { analises: [...] } ou { ocorrencias: [...] } ou { resultado: [...] }
      const possiveis = ['analises', 'ocorrencias', 'resultado', 'items', 'data', 'analise'];
      for (const chave of possiveis) {
        if (Array.isArray(analise[chave])) { lista = analise[chave]; break; }
      }
      // Se ainda não achou, tenta valores do objeto
      if (lista.length === 0) {
        const vals = Object.values(analise).find((v) => Array.isArray(v));
        if (vals) lista = vals as Analise[];
      }
    }

    if (lista.length === 0 && typeof analise === 'object' && analise !== null) {
      // último recurso: trata o próprio objeto como uma análise única
      lista = [analise as Analise];
    }

    setRelatorio(lista);
  }

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={{ backgroundColor: '#1565C0', paddingBottom: 24, paddingHorizontal: 20 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingTop: 48 }}>
          <Ionicons name="arrow-back" size={22} color="white" />
          <Text style={{ color: 'white', marginLeft: 8, fontWeight: '600' }}>Assistente IA</Text>
        </TouchableOpacity>
        <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>Análise de Ocorrências</Text>
        <Text style={{ color: '#bfdbfe', fontSize: 13, marginTop: 4 }}>Registre ocorrências e a IA avalia criticidade e recomendações</Text>
      </View>

      {/* Abas */}
      <View style={{ flexDirection: 'row', marginHorizontal: 16, marginTop: 16, borderRadius: 16, overflow: 'hidden' }}>
        <TouchableOpacity
          onPress={() => setAba('nova')}
          style={{ flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: aba === 'nova' ? '#1565C0' : 'white' }}
        >
          <Text style={{ fontWeight: '600', fontSize: 14, color: aba === 'nova' ? 'white' : '#6b7280' }}>Nova Ocorrência</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setAba('banco')}
          style={{ flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: aba === 'banco' ? '#1565C0' : 'white' }}
        >
          <Text style={{ fontWeight: '600', fontSize: 14, color: aba === 'banco' ? 'white' : '#6b7280' }}>Do Banco ({ocorrenciasBanco.length})</Text>
        </TouchableOpacity>
      </View>

      {/* ABA: Nova ocorrência */}
      {aba === 'nova' && (
        <>
          {ocorrencias.map((o, idx) => (
            <View key={idx} style={{ marginHorizontal: 16, marginTop: 16, backgroundColor: 'white', borderRadius: 24, padding: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#1f2937' }}>Ocorrência {idx + 1}</Text>
                {ocorrencias.length > 1 && (
                  <TouchableOpacity onPress={() => removerOcorrencia(idx)}>
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>

              <Text style={{ color: '#6b7280', fontSize: 12, marginBottom: 4 }}>Título *</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12, color: '#1f2937', backgroundColor: '#f9fafb' }}
                placeholder="Ex: Máquina 03 parou de funcionar"
                value={o.titulo}
                onChangeText={(v) => atualizar(idx, 'titulo', v)}
              />

              <Text style={{ color: '#6b7280', fontSize: 12, marginBottom: 4 }}>Descrição</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12, color: '#1f2937', backgroundColor: '#f9fafb', minHeight: 70 }}
                placeholder="Descreva o problema..."
                value={o.descricao}
                onChangeText={(v) => atualizar(idx, 'descricao', v)}
                multiline
              />

              <Text style={{ color: '#6b7280', fontSize: 12, marginBottom: 6 }}>Categoria</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {CATEGORIAS.map((c) => (
                    <TouchableOpacity
                      key={c}
                      onPress={() => atualizar(idx, 'categoria', c)}
                      style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: o.categoria === c ? '#1565C0' : '#f3f4f6' }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '600', color: o.categoria === c ? 'white' : '#6b7280' }}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#6b7280', fontSize: 12, marginBottom: 4 }}>Tempo parado (h)</Text>
                  <TextInput
                    style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: '#1f2937', backgroundColor: '#f9fafb' }}
                    keyboardType="numeric"
                    value={o.tempoParadoHoras}
                    onChangeText={(v) => atualizar(idx, 'tempoParadoHoras', v)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#6b7280', fontSize: 12, marginBottom: 4 }}>Qtd. afetados</Text>
                  <TextInput
                    style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: '#1f2937', backgroundColor: '#f9fafb' }}
                    keyboardType="numeric"
                    value={o.qtdAfetados}
                    onChangeText={(v) => atualizar(idx, 'qtdAfetados', v)}
                  />
                </View>
              </View>

              <TouchableOpacity
                onPress={() => atualizar(idx, 'envolveCliente', !o.envolveCliente)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: o.envolveCliente ? '#1565C0' : '#d1d5db', backgroundColor: o.envolveCliente ? '#1565C0' : 'white', alignItems: 'center', justifyContent: 'center' }}>
                  {o.envolveCliente && <Ionicons name="checkmark" size={12} color="white" />}
                </View>
                <Text style={{ color: '#4b5563', fontSize: 14 }}>Envolve cliente</Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity
            onPress={adicionarOcorrencia}
            style={{ marginHorizontal: 16, marginTop: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: '#93c5fd', borderRadius: 16, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
          >
            <Ionicons name="add-circle-outline" size={20} color="#1d4ed8" />
            <Text style={{ color: '#1d4ed8', fontWeight: '600' }}>Adicionar ocorrência</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={analisarNovas}
            disabled={loading}
            style={{ marginHorizontal: 16, marginTop: 16, backgroundColor: '#1565C0', borderRadius: 16, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
          >
            {loading ? <ActivityIndicator color="white" /> : <Ionicons name="sparkles" size={20} color="white" />}
            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 15 }}>
              {loading ? 'Analisando...' : 'Gerar Relatório com IA'}
            </Text>
          </TouchableOpacity>
        </>
      )}

      {/* ABA: Ocorrências do banco */}
      {aba === 'banco' && (
        <>
          {loadingBanco ? (
            <View style={{ marginTop: 32, alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#1d4ed8" />
            </View>
          ) : ocorrenciasBanco.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Ionicons name="document-outline" size={48} color="#d1d5db" />
              <Text style={{ color: '#9ca3af', marginTop: 12 }}>Nenhuma ocorrência cadastrada ainda</Text>
            </View>
          ) : (
            ocorrenciasBanco.map((o) => (
              <View key={o.ocorrencia_id} style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: 'white', borderRadius: 20, padding: 16 }}>
                <Text style={{ fontWeight: 'bold', color: '#1f2937', fontSize: 14 }}>{o.titulo}</Text>
                <Text style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>{o.descricao}</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  <View style={{ backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
                    <Text style={{ color: '#1d4ed8', fontSize: 11 }}>{o.categoria}</Text>
                  </View>
                  <View style={{ backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
                    <Text style={{ color: '#6b7280', fontSize: 11 }}>{o.tempoParadoHoras}h parado</Text>
                  </View>
                  {o.envolveCliente && (
                    <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
                      <Text style={{ color: '#d97706', fontSize: 11 }}>Envolve cliente</Text>
                    </View>
                  )}
                </View>
              </View>
            ))
          )}

          {ocorrenciasBanco.length > 0 && (
            <TouchableOpacity
              onPress={analisarBanco}
              disabled={loading}
              style={{ marginHorizontal: 16, marginTop: 16, backgroundColor: '#1565C0', borderRadius: 16, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
            >
              {loading ? <ActivityIndicator color="white" /> : <Ionicons name="sparkles" size={20} color="white" />}
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 15 }}>
                {loading ? 'Analisando...' : `Analisar ${ocorrenciasBanco.length} Ocorrência(s)`}
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* Relatório */}
      {relatorio !== null && (
        <View style={{ marginHorizontal: 16, marginTop: 24 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#1f2937', marginBottom: 12 }}>📊 Relatório da IA</Text>
          {relatorio.length === 0 ? (
            <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 16 }}>
              <Text style={{ color: '#6b7280' }}>A IA não retornou análises. Tente novamente.</Text>
            </View>
          ) : (
            relatorio.map((a, i) => {
              const nivel = (a.nivelCriticidade ?? '').toLowerCase();
              const cor = COR_CRITICIDADE[nivel] ?? '#6b7280';
              return (
                <View key={i} style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: cor }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{ fontWeight: 'bold', color: '#1f2937' }}>
                      Ocorrência {(a.indice !== undefined ? a.indice + 1 : i + 1)}
                    </Text>
                    {nivel && (
                      <View style={{ backgroundColor: cor + '22', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 }}>
                        <Text style={{ color: cor, fontSize: 12, fontWeight: '700', textTransform: 'capitalize' }}>{nivel}</Text>
                      </View>
                    )}
                  </View>
                  {a.prioridade && (
                    <Text style={{ color: '#6b7280', fontSize: 13, marginBottom: 4 }}>
                      🎯 <Text style={{ fontWeight: '600', color: '#374151' }}>{a.prioridade}</Text>
                    </Text>
                  )}
                  {a.recomendacao && (
                    <Text style={{ color: '#6b7280', fontSize: 13, marginBottom: 4 }}>
                      💡 {a.recomendacao}
                    </Text>
                  )}
                  {a.justificativa && (
                    <Text style={{ color: '#9ca3af', fontSize: 12, fontStyle: 'italic', marginTop: 4 }}>
                      {a.justificativa}
                    </Text>
                  )}
                </View>
              );
            })
          )}
        </View>
      )}
    </ScrollView>
  );
}
