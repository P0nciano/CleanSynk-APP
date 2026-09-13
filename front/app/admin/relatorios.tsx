import React, { useEffect, useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import AdminHeader from 'src/components/AdminHeader';
import { getStoredToken } from 'src/lib/auth';

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

export default function AdminRelatorios() {
  const navigation = useNavigation<any>();
  const [receita, setReceita] = useState(0);
  const [reservas, setReservas] = useState(0);
  const [taxaUso, setTaxaUso] = useState(0);
  const [lavanderias, setLavanderias] = useState<LavanderiaStat[]>([]);
  const [programas, setProgramas] = useState<ProgramaStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

        const receitaTotal = rs.reduce((acc, r) => acc + Number(r.pagamentos?.[0]?.valor ?? 0), 0);
        const ativas = ms.filter((m) => m.status === 'OCUPADA').length;
        const uso = ms.length > 0 ? Math.round((ativas / ms.length) * 100) : 0;

        // Lucro por lavanderia
        const lavStats: LavanderiaStat[] = ls.map((lav: any) => {
          const lavReservas = rs.filter((r) => r.maquina?.lavanderia_id === lav.lavanderia_id);
          const lavReceita = lavReservas.reduce((acc, r) => acc + Number(r.pagamentos?.[0]?.valor ?? 0), 0);
          return { nome: lav.nome, receita: lavReceita, reservas: lavReservas.length };
        });

        // Uso por programa (tipo de máquina)
        const tipoMap: Record<string, ProgramaStat> = {};
        rs.forEach((r) => {
          const tipo = r.maquina?.tipo ?? 'Outros';
          if (!tipoMap[tipo]) tipoMap[tipo] = { tipo, count: 0, total: 0 };
          tipoMap[tipo].count += 1;
          tipoMap[tipo].total += Number(r.pagamentos?.[0]?.valor ?? 0);
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
  }, []);

  if (loading) {
    return (
      <View className="flex-1 bg-white">
        <AdminHeader />

      <TouchableOpacity
        onPress={() => navigation.navigate('AssistenteIA')}
        className="mx-4 mt-4 bg-white border-2 border-blue-700 rounded-2xl py-3 px-4 flex-row items-center justify-between"
      >
        <View className="flex-row items-center gap-2">
          <Ionicons name="sparkles" size={20} color="#1d4ed8" />
          <Text className="text-blue-700 font-bold">Assistente IA — Análise de Ocorrências</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#1d4ed8" />
      </TouchableOpacity>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1d4ed8" />
        </View>
      </View>
    );
  }

  const maxReceita = Math.max(...lavanderias.map((l) => l.receita), 1);
  const maxProg = Math.max(...programas.map((p) => p.count), 1);

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ paddingBottom: 24 }}>
      <AdminHeader />

      <TouchableOpacity
        onPress={() => navigation.navigate('AssistenteIA')}
        className="mx-4 mt-4 bg-white border-2 border-blue-700 rounded-2xl py-3 px-4 flex-row items-center justify-between"
      >
        <View className="flex-row items-center gap-2">
          <Ionicons name="sparkles" size={20} color="#1d4ed8" />
          <Text className="text-blue-700 font-bold">Assistente IA — Análise de Ocorrências</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#1d4ed8" />
      </TouchableOpacity>

      {/* Card receita */}
      <View className="mx-4 mt-4 bg-blue-700 rounded-3xl p-4">
        <Text className="text-blue-200 text-xs">Receita total</Text>
        <Text className="text-white text-3xl font-bold">
          R$ {receita.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}
        </Text>
        <View className="mt-3 flex-row gap-4">
          <View className="bg-blue-600 rounded-2xl px-4 py-2 flex-1 items-center">
            <Text className="text-white text-xl font-bold">{reservas}</Text>
            <Text className="text-blue-200 text-xs">Reservas</Text>
          </View>
          <View className="bg-blue-600 rounded-2xl px-4 py-2 flex-1 items-center">
            <Text className="text-white text-xl font-bold">{taxaUso}%</Text>
            <Text className="text-blue-200 text-xs">Uso</Text>
          </View>
        </View>
      </View>

      {/* Uso por programa */}
      <View className="mx-4 mt-4 bg-white rounded-3xl p-4">
        <Text className="text-gray-800 font-bold text-base mb-4">Uso por programa</Text>
        {programas.length === 0 ? (
          <Text className="text-gray-400 text-sm">Sem dados</Text>
        ) : (
          programas.map((p) => (
            <BarRow key={p.tipo} label={p.tipo} valor={p.count} max={maxProg} cor="#1d4ed8" />
          ))
        )}
      </View>

      {/* Lucro por lavanderia */}
      <View className="mx-4 mt-4 bg-white rounded-3xl p-4">
        <Text className="text-gray-800 font-bold text-base mb-4">Lucro por lavanderia</Text>
        {lavanderias.length === 0 ? (
          <Text className="text-gray-400 text-sm">Sem dados</Text>
        ) : (
          <View>
            <View className="flex-row mb-2 px-1">
              <Text className="flex-1 text-xs text-gray-400 font-bold">NOME</Text>
              <Text className="w-20 text-xs text-gray-400 font-bold text-right">RESERVAS</Text>
              <Text className="w-24 text-xs text-gray-400 font-bold text-right">RECEITA</Text>
              <Text className="w-16 text-xs text-gray-400 font-bold text-right">%</Text>
            </View>
            {lavanderias.map((l, i) => (
              <View key={i} className="flex-row py-2 border-t border-gray-100 px-1 items-center">
                <Text className="flex-1 text-gray-700 text-sm">{l.nome}</Text>
                <Text className="w-20 text-gray-500 text-sm text-right">{l.reservas}</Text>
                <Text className="w-24 text-blue-700 text-sm font-semibold text-right">
                  R$ {l.receita.toFixed(2)}
                </Text>
                <Text className="w-16 text-gray-400 text-xs text-right">
                  {receita > 0 ? ((l.receita / receita) * 100).toFixed(0) : 0}%
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
