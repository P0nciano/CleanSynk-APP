import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fundoGradiente } from 'src/components/AdminLayout';

// Cabeçalho azul das telas internas do cliente (com voltar), no mesmo estilo do cabeçalho das abas
export default function CabecalhoTela({ titulo, subtitulo, semVoltar }: { titulo: string; subtitulo?: string; semVoltar?: boolean }) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  return (
    <View className="px-5 pb-6 rounded-b-3xl" style={[fundoGradiente, { paddingTop: insets.top + 12 }]}>
      {semVoltar ? (
        <Text className="text-white font-bold text-xl">{titulo}</Text>
      ) : (
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Voltar" className="flex-row items-center self-start">
          <Ionicons name="arrow-back" size={22} color="white" />
          <Text className="text-white ml-2 font-bold text-xl">{titulo}</Text>
        </TouchableOpacity>
      )}
      {subtitulo ? <Text className="text-blue-100 text-sm mt-1" numberOfLines={2}>{subtitulo}</Text> : null}
    </View>
  );
}
