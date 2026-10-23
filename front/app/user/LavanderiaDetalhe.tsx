import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PROGRAMAS, fotoDaLavanderia, getLavanderia, precoNaLavanderia, type Lavanderia } from 'src/lib/api';
import CabecalhoTela from 'src/components/CabecalhoTela';

function Contador({ valor, rotulo, cor, fundo }: { valor: number; rotulo: string; cor: string; fundo: string }) {
  return (
    <View className="flex-1 rounded-2xl py-3 items-center" style={{ backgroundColor: fundo }}>
      <Text className="font-bold text-2xl" style={{ color: cor }}>{valor}</Text>
      <Text className="text-xs" style={{ color: cor }}>{rotulo}</Text>
    </View>
  );
}

export default function LavanderiaDetalhe() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<any>();
  const lavanderia: Lavanderia = route.params?.lavanderia;

  const [dados, setDados] = useState<Lavanderia | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregar() {
      try {
        setDados(await getLavanderia(lavanderia.lavanderia_id));
      } catch {
        setDados(lavanderia);
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, []);

  const info = dados ?? lavanderia;
  const contar = (status: string) => info.maquinas?.filter((m) => m.status === status).length ?? 0;
  const foto = fotoDaLavanderia(info);

  return (
    <ScrollView className="flex-1 bg-[#f5f7fb]" contentContainerStyle={{ paddingBottom: 32 }}>
      <CabecalhoTela titulo={info.nome} subtitulo={info.endereco} />

      {/* Foto (ou ilustração quando a lavanderia não tem) */}
      <View className="mx-4 mt-4 h-48 bg-blue-50 rounded-3xl items-center justify-center overflow-hidden">
        {foto ? (
          <Image source={{ uri: foto }} resizeMode="cover" style={{ width: '100%', height: '100%' }} accessibilityLabel={`Foto da ${info.nome}`} />
        ) : (
          <MaterialCommunityIcons name="washing-machine" size={64} color="#93c5fd" />
        )}
      </View>

      <View className="mx-4 mt-3 bg-white border border-gray-200 rounded-2xl p-4">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-gray-900 font-bold text-base">Disponibilidade agora</Text>
          <View className="flex-row items-center bg-amber-100 px-2 py-0.5 rounded-full">
            <Ionicons name="star" size={11} color="#f59e0b" />
            <Text className="text-amber-700 text-xs font-bold ml-1">4.5</Text>
          </View>
        </View>
        {loading ? (
          <ActivityIndicator size="small" color="#1d4ed8" />
        ) : (
          <View className="flex-row gap-2">
            <Contador valor={contar('LIVRE')} rotulo="Livres" cor="#15803d" fundo="#dcfce7" />
            <Contador valor={contar('OCUPADA')} rotulo="Em uso" cor="#1d4ed8" fundo="#dbeafe" />
            <Contador valor={contar('MANUTENCAO')} rotulo="Manutenção" cor="#b45309" fundo="#fef3c7" />
          </View>
        )}
      </View>

      {/* Preços desta lavanderia (os mesmos que o servidor cobra) */}
      <View className="mx-4 mt-3 bg-white border border-gray-200 rounded-2xl p-4">
        <Text className="text-gray-900 font-bold text-base mb-2">Preços</Text>
        {PROGRAMAS.map((p) => (
          <View key={p.id} className="flex-row justify-between items-center py-2 border-b border-gray-100">
            <View>
              <Text className="text-gray-800 text-sm font-semibold">{p.nome}</Text>
              <Text className="text-gray-400 text-xs">{p.minutos} min</Text>
            </View>
            <Text className="text-blue-700 font-bold">R$ {precoNaLavanderia(p.id, info).toFixed(2).replace('.', ',')}</Text>
          </View>
        ))}
        <View className="flex-row items-center mt-3">
          <Ionicons name="time-outline" size={14} color="#6b7280" />
          <Text className="text-gray-500 text-xs ml-1">Aberto das 07h às 22h</Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={() => navigation.navigate('EscolherMaquina', { lavanderia: info })}
        className="mx-4 mt-5 bg-blue-700 rounded-2xl py-4 items-center"
      >
        <Text className="text-white font-bold text-base">Escolher máquina</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
