import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FotoLavanderia from 'src/components/FotoLavanderia';
import type { Lavanderia } from 'src/lib/api';

function formatarDistancia(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace('.', ',')} km`;
}

// Card da lavanderia nas listas do cliente (Home e Lavanderias)
export default function CardLavanderia({ item, onPress }: { item: Lavanderia; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} className="mx-4 mt-3 bg-white border border-gray-200 rounded-2xl p-3.5 flex-row">
      <FotoLavanderia lavanderia={item} />
      <View className="ml-4 flex-1 justify-center">
        <Text className="text-base font-bold text-gray-900">{item.nome}</Text>
        <Text className="text-gray-500 text-sm mt-0.5" numberOfLines={2}>{item.endereco}</Text>
        <View className="flex-row items-center gap-2 mt-2">
          <View className="flex-row items-center bg-amber-100 px-2 py-0.5 rounded-full">
            <Ionicons name="star" size={11} color="#f59e0b" />
            <Text className="text-amber-700 text-xs font-bold ml-1">4.5</Text>
          </View>
          {item.distanciaKm != null && (
            <View className="flex-row items-center">
              <Ionicons name="navigate-outline" size={12} color="#6b7280" />
              <Text className="text-gray-500 text-xs ml-1">{formatarDistancia(item.distanciaKm)}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
