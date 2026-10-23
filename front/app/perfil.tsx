import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import Header from 'src/components/header';
import { useAuth } from 'src/context/auth';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

export default function Perfil() {
  const { user, signOut } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const opcoes = [
    { label: 'Meus dados', icon: 'person-outline', tela: 'MeusDados' },
    { label: 'Meus cupons', icon: 'pricetag-outline', tela: 'MeusCupons' },
    { label: 'Notificações', icon: 'notifications-outline', tela: 'Notificacoes' },
  ];

  return (
    <ScrollView className="flex-1 bg-[#f5f7fb]" contentContainerStyle={{ paddingBottom: 24 }}>
      <Header />
      <View className="items-center mt-8 px-4">
        <View className="w-24 h-24 bg-blue-100 rounded-full items-center justify-center mb-4">
          <Ionicons name="person" size={44} color="#1d4ed8" />
        </View>
        <Text className="text-2xl font-bold text-gray-900">{user?.nome ?? 'Nome'}</Text>
        <Text className="text-gray-400 mt-1">{user?.email ?? 'email'}</Text>
      </View>

      <View className="px-4 mt-6">
        {opcoes.map((op) => (
          <TouchableOpacity
            key={op.tela}
            onPress={() => navigation.navigate(op.tela)}
            className="mb-3 bg-white border border-gray-200 rounded-2xl px-3 py-3 flex-row items-center justify-between"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center">
                <Ionicons name={op.icon as any} size={20} color="#1d4ed8" />
              </View>
              <Text className="text-gray-900 font-semibold text-base">{op.label}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          onPress={() => signOut()}
          className="mt-2 bg-red-50 border border-red-100 rounded-2xl px-3 py-3 flex-row items-center gap-3"
        >
          <View className="w-10 h-10 rounded-xl bg-red-100 items-center justify-center">
            <Ionicons name="log-out-outline" size={20} color="#dc2626" />
          </View>
          <Text className="text-red-600 font-semibold text-base">Sair</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
