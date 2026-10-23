import React from 'react';
import { View, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fotoDaLavanderia, type Lavanderia } from 'src/lib/api';

// Foto quadrada da lavanderia; sem foto, a gota no fundo azul claro
export default function FotoLavanderia({ lavanderia, tamanho = 72 }: { lavanderia: Pick<Lavanderia, 'lavanderia_id' | 'nome' | 'foto_versao'>; tamanho?: number }) {
  const uri = fotoDaLavanderia(lavanderia);
  return (
    <View className="bg-blue-50 rounded-xl items-center justify-center overflow-hidden" style={{ width: tamanho, height: tamanho }}>
      {uri ? (
        <Image source={{ uri }} resizeMode="cover" style={{ width: tamanho, height: tamanho }} accessibilityLabel={`Foto da ${lavanderia.nome}`} />
      ) : (
        <Ionicons name="water" size={Math.round(tamanho * 0.36)} color="#1d4ed8" />
      )}
    </View>
  );
}
