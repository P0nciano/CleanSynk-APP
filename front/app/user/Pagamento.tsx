import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStripe } from 'src/lib/stripe';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { cancelarReserva, criarCheckout, criarPaymentIntent, criarReserva, getPrograma } from 'src/lib/api';
import { useAuth } from 'src/context/auth';
import CabecalhoTela from 'src/components/CabecalhoTela';

export default function Pagamento() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<any>();
  const { lavanderia, maquina, programa, valor } = route.params;
  const { user, token } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [loading, setLoading] = useState(false);
  const total: number = valor;

  async function handlePagar() {
    if (!user || !token) {
      Alert.alert('Erro', 'Usuário não está logado');
      return;
    }

    setLoading(true);
    let reservaId: number | null = null;
    try {
      const agora = new Date();
      const fim = new Date(agora.getTime() + getPrograma(programa).minutos * 60 * 1000);

      const reserva = await criarReserva({
        maquina_id: maquina.maquina_id,
        usuario_id: user.usuario_id,
        data_inicio: agora.toISOString(),
        data_fim: fim.toISOString(),
        status: 'AGUARDANDO_PAGAMENTO',
      }, token);
      reservaId = reserva.reserva_id;

      // Web: vai para a página do Stripe; a volta é tratada no App.tsx
      if (Platform.OS === 'web') {
        const { url } = await criarCheckout({ reserva_id: reserva.reserva_id, programa }, token);
        window.location.href = url;
        return;
      }

      const { clientSecret } = await criarPaymentIntent({
        reserva_id: reserva.reserva_id,
        programa,
      }, token);

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'CleanSynk',
        paymentIntentClientSecret: clientSecret,
        defaultBillingDetails: { name: user.nome, email: user.email },
      });

      if (initError) throw new Error(initError.message);

      const { error: paymentError } = await presentPaymentSheet();
      if (paymentError) throw new Error(paymentError.message);

      navigation.navigate('StatusLavagem', { lavanderia, maquina, programa, valor: total });
    } catch (e) {
      if (reservaId !== null) {
        await cancelarReserva(reservaId, token).catch(() => undefined);
      }
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível criar a reserva.');
    } finally {
      setLoading(false);
    }
  }

  const reais = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;
  const linhas = [
    ['Lavanderia', lavanderia.nome],
    ['Máquina', `Máquina ${String(maquina.numero).padStart(2, '0')}`],
    ['Programa', `${getPrograma(programa).nome} · ${getPrograma(programa).minutos} min`],
  ];

  return (
    <ScrollView className="flex-1 bg-[#f5f7fb]" contentContainerStyle={{ paddingBottom: 32 }}>
      <CabecalhoTela titulo="Pagamento" subtitulo="Confira o resumo e pague com segurança" />

      <View className="mx-4 mt-6 bg-white border border-gray-200 rounded-2xl p-4">
        <Text className="text-gray-900 font-bold text-base mb-3">Resumo</Text>
        {linhas.map(([rotulo, valorLinha]) => (
          <View key={rotulo} className="flex-row justify-between mb-2">
            <Text className="text-gray-500 text-sm">{rotulo}</Text>
            <Text className="text-gray-800 text-sm font-semibold shrink ml-4 text-right">{valorLinha}</Text>
          </View>
        ))}
        <View className="border-t border-gray-100 mt-2 pt-3 flex-row justify-between items-center">
          <Text className="text-gray-900 font-bold">Total</Text>
          <Text className="text-blue-700 font-bold text-xl">{reais(total)}</Text>
        </View>
      </View>

      <Text className="mx-4 mt-5 mb-3 text-gray-900 font-bold text-base">Forma de pagamento</Text>
      <View className="mx-4 bg-white border-2 border-blue-700 rounded-2xl p-4 flex-row items-center">
        <View className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center mr-3">
          <Ionicons name="card-outline" size={20} color="#1d4ed8" />
        </View>
        <View className="flex-1">
          <Text className="text-gray-900 font-semibold">Cartão de crédito</Text>
          <Text className="text-gray-400 text-xs">Pagamento seguro via Stripe</Text>
        </View>
        <Ionicons name="checkmark-circle" size={22} color="#1d4ed8" />
      </View>

      <View className="mx-4 mt-3 flex-row items-start">
        <Ionicons name="time-outline" size={14} color="#6b7280" style={{ marginTop: 1 }} />
        <Text className="text-gray-500 text-xs ml-1 flex-1">A máquina fica reservada por 10 minutos enquanto você paga.</Text>
      </View>

      <TouchableOpacity onPress={handlePagar} disabled={loading} className="mx-4 mt-5 bg-blue-700 rounded-2xl py-4 items-center">
        {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-base">Pagar {reais(total)}</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}
