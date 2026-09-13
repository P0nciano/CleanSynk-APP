import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const CUPONS = [
  { id: 1, codigo: 'PRIMEIRA30', desconto: '30% off', descricao: 'Na primeira lavagem', validade: '31/12/2026', usado: false },
  { id: 2, codigo: 'FIDELIDADE10', desconto: '10% off', descricao: 'Para clientes frequentes', validade: '30/06/2026', usado: false },
  { id: 3, codigo: 'VERAO2025', desconto: '15% off', descricao: 'Promoção de verão', validade: '01/03/2025', usado: true },
];

export default function MeusCupons() {
  const navigation = useNavigation();

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ paddingBottom: 32 }}>
      <View className="bg-[#1565C0] pt-12 pb-6 px-5">
        <TouchableOpacity onPress={() => navigation.goBack()} className="flex-row items-center mb-4">
          <Ionicons name="arrow-back" size={22} color="white" />
          <Text className="text-white ml-2 font-semibold">Meus Cupons</Text>
        </TouchableOpacity>
      </View>

      <View className="px-4 mt-4">
        {CUPONS.map((c) => (
          <View
            key={c.id}
            className={`rounded-2xl p-4 mb-3 border-2 ${c.usado ? 'border-gray-200 bg-gray-50' : 'border-blue-200 bg-blue-50'}`}
          >
            <View className="flex-row justify-between items-start">
              <View className="flex-1">
                <View className="flex-row items-center gap-2 mb-1">
                  <Ionicons name="pricetag" size={16} color={c.usado ? '#9ca3af' : '#1d4ed8'} />
                  <Text className={`font-bold text-base ${c.usado ? 'text-gray-400' : 'text-blue-700'}`}>{c.desconto}</Text>
                </View>
                <Text className={`font-mono font-bold text-lg ${c.usado ? 'text-gray-400' : 'text-gray-800'}`}>{c.codigo}</Text>
                <Text className={`text-sm mt-1 ${c.usado ? 'text-gray-400' : 'text-gray-500'}`}>{c.descricao}</Text>
                <Text className={`text-xs mt-1 ${c.usado ? 'text-gray-400' : 'text-gray-400'}`}>Válido até: {c.validade}</Text>
              </View>
              {c.usado ? (
                <View className="bg-gray-200 px-3 py-1 rounded-full">
                  <Text className="text-gray-500 text-xs font-bold">Usado</Text>
                </View>
              ) : (
                <View className="bg-green-100 px-3 py-1 rounded-full">
                  <Text className="text-green-700 text-xs font-bold">Disponível</Text>
                </View>
              )}
            </View>
          </View>
        ))}

        {CUPONS.length === 0 && (
          <View className="items-center mt-12">
            <Ionicons name="pricetag-outline" size={48} color="#d1d5db" />
            <Text className="text-gray-400 mt-3">Nenhum cupom disponível</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
