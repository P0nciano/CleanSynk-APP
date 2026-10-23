import React from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fundoGradiente } from 'src/components/AdminLayout';

// Moldura do login e do cadastro: faixa azul com a marca e o formulário num card branco
export default function TelaEntrada({ titulo, subtitulo, children }: { titulo: string; subtitulo: string; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView className="flex-1 bg-[#f5f7fb]" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
        <View className="px-6 pb-20 rounded-b-[32px] items-center" style={[fundoGradiente, { paddingTop: insets.top + 40 }]}>
          <View className="w-14 h-14 rounded-2xl bg-white items-center justify-center">
            <Text className="text-blue-700 font-extrabold text-lg">CS</Text>
          </View>
          <Text className="text-white font-bold text-2xl mt-3">CleanSynk</Text>
          <Text className="text-blue-100 text-sm mt-1">Lavanderia sem fila, direto do celular</Text>
        </View>
        <View className="mx-4 -mt-12 bg-white border border-gray-200 rounded-3xl p-6 w-auto self-stretch md:self-center md:w-[420px]">
          <Text className="text-gray-900 font-bold text-2xl">{titulo}</Text>
          <Text className="text-gray-500 mt-1 mb-6">{subtitulo}</Text>
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export const estiloCampo = 'border border-gray-200 bg-gray-50 rounded-xl px-4 py-3.5 mb-3 text-gray-900';
