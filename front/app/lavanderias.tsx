import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import Header from 'src/components/header';
import { getLavanderias, type Lavanderia } from 'src/lib/api';
import { useSearch } from 'src/context/search';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from 'src/context/auth';
import CardLavanderia from 'src/components/CardLavanderia';
import { minhaPosicao, ordenarPorDistancia } from 'src/lib/localizacao';

export default function Lavanderias() {
  const [lavanderias, setLavanderias] = useState<Lavanderia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { query } = useSearch();
  const { token } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const textoBusca = query.trim().toLowerCase();
  const lavanderiasFiltradas = textoBusca
    ? lavanderias.filter((item) => item.nome.toLowerCase().includes(textoBusca))
    : lavanderias;

  useEffect(() => {
    if (!token) return;
    let ativo = true;
    async function carregar() {
      try {
        setLoading(true);
        setError('');
        const resultado = await getLavanderias(token!);
        if (ativo) setLavanderias(resultado);
        minhaPosicao()
          .then((p) => { if (ativo) setLavanderias(ordenarPorDistancia(resultado, p)); })
          .catch(() => undefined);
      } catch (e) {
        if (ativo) setError(e instanceof Error ? e.message : 'Falha ao carregar');
      } finally {
        if (ativo) setLoading(false);
      }
    }
    carregar();
    return () => { ativo = false; };
  }, [token]);

  return (
    <ScrollView className="flex-1 bg-[#f5f7fb]" contentContainerStyle={{ paddingBottom: 24 }}>
      <Header />
      <View className="px-4 pt-6 pb-1">
        <Text className="text-lg font-bold text-gray-900">Todas as lavanderias</Text>
      </View>

      {loading ? (
        <View className="mt-8 items-center"><ActivityIndicator size="large" color="#1d4ed8" /></View>
      ) : error ? (
        <View className="mx-4 mt-4 rounded-3xl bg-red-50 p-4">
          <Text className="text-red-700 font-semibold">{error}</Text>
        </View>
      ) : lavanderiasFiltradas.length === 0 ? (
        <View className="mx-4 mt-4 rounded-3xl bg-blue-50 p-4">
          <Text className="text-gray-700">Nenhuma lavanderia encontrada</Text>
        </View>
      ) : (
        lavanderiasFiltradas.map((item) => (
          <CardLavanderia key={item.lavanderia_id} item={item} onPress={() => navigation.navigate('LavanderiaDetalhe', { lavanderia: item })} />
        ))
      )}
    </ScrollView>
  );
}
