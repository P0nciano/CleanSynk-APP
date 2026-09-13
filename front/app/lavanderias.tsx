import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import Header from 'src/components/header';
import { getLavanderias, type Lavanderia } from 'src/lib/api';
import { useSearch } from 'src/context/search';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from 'src/context/auth';

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
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ paddingBottom: 24 }}>
      <Header />
      <View className="px-4 py-5">
        <Text className="text-xl font-bold text-gray-800">Todas as Lavanderias</Text>
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
          <TouchableOpacity
            key={item.lavanderia_id}
            onPress={() => navigation.navigate('LavanderiaDetalhe', { lavanderia: item })}
            className="mx-4 mt-4 bg-blue-50 rounded-3xl p-4 flex-row"
          >
            <View className="w-20 h-20 bg-gray-200 rounded-2xl items-center justify-center">
              <Ionicons name="water" size={32} color="#1d4ed8" />
            </View>
            <View className="ml-4 flex-1 justify-center">
              <Text className="text-base font-bold text-gray-800">{item.nome}</Text>
              <Text className="text-gray-500 text-sm mt-1">{item.endereco}</Text>
              <View className="flex-row items-center self-start bg-yellow-100 px-2 py-1 rounded-full mt-2">
                <Ionicons name="star" size={12} color="#FBBF24" />
                <Text className="text-yellow-500 text-xs font-bold ml-1">4.5</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}
