
import Header from 'src/components/header';
import React, { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { getLavanderias, type Lavanderia } from 'src/lib/api';
import { useSearch } from 'src/context/search';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from 'src/context/auth';

const OFERTAS = [
  { id: 1, titulo: 'Ganhe 30% off', descricao: 'Na 1ª lavagem - Lavanderia Central', badge: 'Tempo Limitado' },
  { id: 2, titulo: 'Leve 2, pague 1', descricao: 'Secagem grátis na segunda visita', badge: 'Promoção' },
  { id: 3, titulo: 'Frete grátis', descricao: 'Na primeira retirada em domicílio', badge: 'Novidade' },
];

export default function Home() {
  const [lavanderias, setLavanderias] = useState<Lavanderia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOfertas, setModalOfertas] = useState(false);
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
        const todas = await getLavanderias(token!);
        if (ativo) setLavanderias(todas.slice(0, 3));
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

      <View className="flex-row justify-between items-center px-4 mt-6">
        <Text className="text-lg font-bold text-gray-800">#OfertasParaVocê</Text>
        <TouchableOpacity onPress={() => setModalOfertas(true)}>
          <Text className="text-blue-500">Ver todas</Text>
        </TouchableOpacity>
      </View>

      <View className="mx-4 mt-4 bg-[#1565C0] rounded-3xl p-4 overflow-hidden">
        <View className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-blue-400" />
        <View className="bg-white/20 self-start px-2 py-1 rounded-full">
          <Text className="text-white text-xs font-semibold">Tempo Limitado</Text>
        </View>
        <Text className="text-white text-3xl font-bold mt-3">Ganhe 30% off</Text>
        <Text className="text-white mt-2">Na 1ª lavagem - Lavanderia Central</Text>
        <TouchableOpacity className="bg-white self-start px-5 py-2 rounded-full mt-4">
          <Text className="text-blue-700 font-bold">Resgatar</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row justify-center mt-3">
        <View className="w-5 h-2 rounded-full bg-blue-700 mx-1" />
        <View className="w-2 h-2 rounded-full bg-gray-300 mx-1" />
        <View className="w-2 h-2 rounded-full bg-gray-300 mx-1" />
      </View>

      <View className="flex-row justify-between items-center px-4 mt-8">
        <Text className="text-lg font-bold text-gray-800">Lavanderias próximas</Text>
        <TouchableOpacity onPress={() => navigation.navigate('UserTabs', { screen: 'Lavanderias' })}>
          <Text className="text-blue-500">Ver todas</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="mt-8 items-center">
          <ActivityIndicator size="large" color="#1d4ed8" />
        </View>
      ) : error ? (
        <View className="mx-4 mt-4 rounded-3xl bg-red-50 p-4">
          <Text className="text-red-700 font-semibold">{error}</Text>
        </View>
      ) : lavanderiasFiltradas.length === 0 ? (
        <View className="mx-4 mt-4 rounded-3xl bg-gray-100 p-4">
          <Text className="text-gray-700">Nenhuma lavanderia encontrada</Text>
        </View>
      ) : (
        lavanderiasFiltradas.map((item) => (
          <TouchableOpacity
            key={item.lavanderia_id}
            onPress={() => navigation.navigate('LavanderiaDetalhe', { lavanderia: item })}
            className="mx-4 mt-4 bg-blue-100 rounded-3xl p-4 flex-row"
          >
            <View className="w-20 h-20 bg-gray-300 rounded-2xl items-center justify-center">
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

      <Modal visible={modalOfertas} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#1f2937' }}>Todas as Ofertas</Text>
              <TouchableOpacity onPress={() => setModalOfertas(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            {OFERTAS.map((o) => (
              <View key={o.id} style={{ backgroundColor: '#eff6ff', borderRadius: 16, padding: 16, marginBottom: 12 }}>
                <View style={{ backgroundColor: '#dbeafe', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, marginBottom: 8 }}>
                  <Text style={{ color: '#1d4ed8', fontSize: 12, fontWeight: '600' }}>{o.badge}</Text>
                </View>
                <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#1f2937' }}>{o.titulo}</Text>
                <Text style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>{o.descricao}</Text>
                <TouchableOpacity style={{ backgroundColor: '#1565C0', borderRadius: 12, paddingVertical: 10, alignItems: 'center', marginTop: 12 }}>
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>Resgatar</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
