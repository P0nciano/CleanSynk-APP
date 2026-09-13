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
    { label: 'Meus Dados', icon: 'person-outline', tela: 'MeusDados' },
    { label: 'Meus Cupons', icon: 'pricetag-outline', tela: 'MeusCupons' },
    { label: 'Notificações', icon: 'notifications-outline', tela: 'Notificacoes' },
  ];

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
      <Header />
      <View className="items-center mt-8 px-4">
        <View className="w-24 h-24 bg-blue-100 rounded-full items-center justify-center mb-4">
          <Ionicons name="person" size={44} color="#1d4ed8" />
        </View>
        <Text className="text-2xl font-bold text-gray-800">{user?.nome ?? 'Nome'}</Text>
        <Text className="text-gray-400 mt-1">{user?.email ?? 'email'}</Text>
      </View>

      <View className="px-4 mt-6">
        {opcoes.map((op) => (
          <TouchableOpacity
            key={op.tela}
            onPress={() => navigation.navigate(op.tela)}
            className="mb-3 bg-blue-50 rounded-2xl px-4 py-4 flex-row items-center justify-between"
          >
            <View className="flex-row items-center gap-3">
              <Ionicons name={op.icon as any} size={22} color="#1d4ed8" />
              <Text className="text-gray-800 font-semibold text-base">{op.label}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          onPress={() => signOut()}
          className="mt-2 bg-red-50 rounded-2xl px-4 py-4 flex-row items-center gap-3"
        >
          <Ionicons name="log-out-outline" size={22} color="#dc2626" />
          <Text className="text-red-600 font-semibold text-base">Sair</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
