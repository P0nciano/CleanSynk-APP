import React, { useCallback, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { AdminPagina, Card, useLargo } from 'src/components/AdminLayout';
import { getStoredToken } from 'src/lib/auth';
import { somaPagos } from 'src/lib/api';
import { CardReceita, formatarReais } from './home';
import { PainelOcorrencias } from './AssistenteIA';

const API = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

type LavanderiaStat = { nome: string; receita: number; reservas: number };
type ProgramaStat = { tipo: string; count: number; total: number };

function BarRow({ label, valor, max, cor }: { label: string; valor: number; max: number; cor: string }) {
  const pct = max > 0 ? (valor / max) * 100 : 0;
  return (
    <View className="mb-3">
      <View className="flex-row justify-between mb-1">
        <Text className="text-gray-700 text-sm">{label}</Text>
        <Text className="text-gray-500 text-sm">{pct.toFixed(0)}%</Text>
      </View>
      <View className="bg-gray-100 rounded-full h-3">
        <View style={{ width: `${pct}%`, backgroundColor: cor, height: 12, borderRadius: 6 }} />
      </View>
    </View>
  );
}

function IndicadorSimples({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <View className="flex-1 min-w-[90px] rounded-2xl p-3 md:p-4 border border-white/20 bg-white/10">
      <Text className="text-white text-2xl md:text-[28px] font-bold">{valor}</Text>
      <Text className="text-blue-100 text-xs md:text-sm">{rotulo}</Text>
    </View>
  );
}

export default function AdminRelatorios() {
  const largo = useLargo();
  const [receita, setReceita] = useState(0);
  const [reservas, setReservas] = useState(0);
  const [taxaUso, setTaxaUso] = useState(0);
  const [lavanderias, setLavanderias] = useState<LavanderiaStat[]>([]);
  const [programas, setProgramas] = useState<ProgramaStat[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    async function load() {
      try {
        const token = await getStoredToken();
        const h = { Authorization: `Bearer ${token}` };

        const [rRes, mRes, lRes] = await Promise.all([
          fetch(`${API}/reservas`, { headers: h }),
          fetch(`${API}/maquinas`, { headers: h }),
          fetch(`${API}/lavanderias`, { headers: h }),
        ]);

        const rs: any[] = rRes.ok ? await rRes.json() : [];
        const ms: any[] = mRes.ok ? await mRes.json() : [];
        const ls: any[] = lRes.ok ? await lRes.json() : [];

        const receitaTotal = rs.reduce((acc, r) => acc + somaPagos(r), 0);
        const ativas = ms.filter((m) => m.status === 'OCUPADA').length;
        const uso = ms.length > 0 ? Math.round((ativas / ms.length) * 100) : 0;

        // Lucro por lavanderia
        const lavStats: LavanderiaStat[] = ls.map((lav: any) => {
          const lavReservas = rs.filter((r) => r.maquina?.lavanderia_id === lav.lavanderia_id);
          const lavReceita = lavReservas.reduce((acc, r) => acc + somaPagos(r), 0);
          return { nome: lav.nome, receita: lavReceita, reservas: lavReservas.length };
        });

        // Uso por programa (tipo de máquina)
        const tipoMap: Record<string, ProgramaStat> = {};
        rs.forEach((r) => {
          const tipo = r.maquina?.tipo ?? 'Outros';
          if (!tipoMap[tipo]) tipoMap[tipo] = { tipo, count: 0, total: 0 };
          tipoMap[tipo].count += 1;
          tipoMap[tipo].total += somaPagos(r);
        });

        setReceita(receitaTotal);
        setReservas(rs.length);
        setTaxaUso(uso);
        setLavanderias(lavStats);
        setProgramas(Object.values(tipoMap));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []));

  const maxProg = Math.max(...programas.map((p) => p.count), 1);

  return (
    <AdminPagina titulo="Relatórios" subtitulo="Veja o desempenho das lavanderias e registre ocorrências para a IA analisar.">
      <View className={`gap-6 ${largo ? 'flex-row items-start' : ''}`}>
        <View className={`gap-6 ${largo ? 'flex-1' : ''}`}>
          {loading ? (
            <ActivityIndicator size="large" color="#1d4ed8" className="mt-10" />
          ) : (
            <>
              <CardReceita receita={receita}>
                <IndicadorSimples valor={String(reservas)} rotulo="Reservas" />
                <IndicadorSimples valor={`${taxaUso}%`} rotulo="Uso" />
              </CardReceita>

              <Card>
                <Text className="text-gray-900 font-bold text-base mb-4">Uso por programa</Text>
                {programas.length === 0 ? (
                  <Text className="text-gray-400 text-sm">Sem dados</Text>
                ) : (
                  programas.map((p) => <BarRow key={p.tipo} label={p.tipo} valor={p.count} max={maxProg} cor="#1d4ed8" />)
                )}
              </Card>

              <Card>
                <Text className="text-gray-900 font-bold text-base mb-4">Lucro por lavanderia</Text>
                {lavanderias.length === 0 ? (
                  <Text className="text-gray-400 text-sm">Sem dados</Text>
                ) : (
                  <View>
                    <View className="flex-row pb-2 px-3 border-b border-gray-100">
                      <Text className="flex-1 text-xs text-gray-400 font-semibold">Nome</Text>
                      <Text className="w-24 text-xs text-gray-400 font-semibold text-right">Reservas</Text>
                      <Text className="w-28 text-xs text-gray-400 font-semibold text-right">Receita</Text>
                      <Text className="w-16 text-xs text-gray-400 font-semibold text-right">%</Text>
                    </View>
                    {lavanderias.map((l, i) => (
                      <View key={i} className="flex-row py-3 px-3 border-b border-gray-50 items-center">
                        <Text className="flex-1 text-gray-800 text-sm">{l.nome}</Text>
                        <Text className="w-24 text-gray-600 text-sm text-right">{l.reservas}</Text>
                        <Text className="w-28 text-blue-700 text-sm font-semibold text-right">{formatarReais(l.receita)}</Text>
                        <Text className="w-16 text-gray-400 text-sm text-right">
                          {receita > 0 ? ((l.receita / receita) * 100).toFixed(0) : 0}%
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </Card>
            </>
          )}
        </View>
          <Card className={largo ? 'flex-1' : ''}>
            <View className="flex-row items-center gap-3 mb-5">
              <View className="w-11 h-11 rounded-xl bg-blue-50 items-center justify-center">
                <Ionicons name="sparkles" size={20} color="#1d4ed8" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 font-bold text-lg">Análise de Ocorrências</Text>
                <Text className="text-gray-500 text-sm">Registre ocorrências e a IA avalia criticidade e recomendações.</Text>
              </View>
            </View>
            <PainelOcorrencias />
          </Card>
      </View>
    </AdminPagina>
  );
}
