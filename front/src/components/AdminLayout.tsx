import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, useWindowDimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from 'src/context/auth';
import { getNotificacoes } from 'src/lib/api';

// Computador/tablet: layout de site (menu lateral + barra superior); celular: layout de app
export function useLargo() {
  return useWindowDimensions().width >= 768;
}

// Gradiente do card de receita; onde o estilo não é suportado fica o azul sólido
export const fundoGradiente = {
  backgroundColor: '#1d4ed8',
  experimental_backgroundImage: 'linear-gradient(135deg, #2350d8 0%, #1e3a8a 100%)',
} as object;

function iniciais(nome?: string) {
  return (nome ?? 'AD').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

const ICONES: Record<string, (cor: string) => React.ReactNode> = {
  'Início': (cor) => <Ionicons name="home-outline" size={20} color={cor} />,
  Home: (cor) => <Ionicons name="home-outline" size={20} color={cor} />,
  Reservas: (cor) => <Ionicons name="checkmark-circle-outline" size={20} color={cor} />,
  Lavanderias: (cor) => <MaterialCommunityIcons name="washing-machine" size={20} color={cor} />,
  'Relatórios': (cor) => <Ionicons name="bar-chart-outline" size={19} color={cor} />,
  Perfil: (cor) => <Ionicons name="person-outline" size={20} color={cor} />,
};

export function AdminSidebar({ state, navigation }: BottomTabBarProps) {
  const { user } = useAuth();
  return (
    <View className="w-[270px] h-full bg-white border-r border-gray-200 px-4 pt-6 pb-4">
      <View className="flex-row items-center gap-3 px-2">
        <View className="w-10 h-10 rounded-xl bg-blue-700 items-center justify-center" style={fundoGradiente}>
          <Text className="text-white font-bold text-sm">CS</Text>
        </View>
        <View>
          <Text className="text-gray-900 font-bold text-[17px]">CleanSynk</Text>
          <Text className="text-gray-400 text-xs">Painel Admin</Text>
        </View>
      </View>

      <Text className="text-gray-400 text-[11px] font-semibold tracking-widest mt-8 mb-2 px-3">MENU</Text>
      {state.routes.map((route, i) => {
        const ativo = state.index === i;
        const cor = ativo ? '#1d4ed8' : '#4b5563';
        return (
          <TouchableOpacity
            key={route.key}
            onPress={() => navigation.navigate(route.name)}
            accessibilityRole="link"
            accessibilityState={{ selected: ativo }}
            className={`flex-row items-center gap-3 px-3 py-2.5 rounded-xl mb-1 ${ativo ? 'bg-blue-50' : ''}`}
          >
            {ativo && <View className="absolute -left-4 top-2 bottom-2 w-[3px] rounded-r bg-blue-700" />}
            {ICONES[route.name]?.(cor)}
            <Text className={`text-[15px] ${ativo ? 'text-blue-700 font-semibold' : 'text-gray-600'}`}>{route.name}</Text>
          </TouchableOpacity>
        );
      })}

      <View className="mt-auto flex-row items-center gap-3 bg-gray-50 rounded-2xl p-3">
        <View className="w-9 h-9 rounded-full bg-blue-100 items-center justify-center">
          <Text className="text-blue-700 font-bold text-xs">{iniciais(user?.nome)}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-gray-900 font-semibold text-sm" numberOfLines={1}>{user?.nome ?? 'Administrador'}</Text>
          <Text className="text-gray-400 text-xs">Administrador</Text>
        </View>
      </View>
    </View>
  );
}

// Barra de baixo do celular: aba ativa com fundo azul claro atrás do ícone
export function AdminBarraInferior({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-row bg-white border-t border-gray-200 pt-2" style={{ paddingBottom: insets.bottom + 8 }}>
      {state.routes.map((route, i) => {
        const ativo = state.index === i;
        const cor = ativo ? '#1d4ed8' : '#9ca3af';
        return (
          <TouchableOpacity
            key={route.key}
            onPress={() => navigation.navigate(route.name)}
            accessibilityRole="tab"
            accessibilityState={{ selected: ativo }}
            className="flex-1 items-center gap-1"
          >
            <View className={`px-4 py-1 rounded-full ${ativo ? 'bg-blue-50' : ''}`}>{ICONES[route.name]?.(cor)}</View>
            <Text className={`text-[11px] ${ativo ? 'text-blue-700 font-semibold' : 'text-gray-400'}`}>{route.name}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function BotaoSino() {
  const navigation = useNavigation<any>();
  const { token } = useAuth();
  const [naoLidas, setNaoLidas] = useState(0);

  useEffect(() => {
    // Para admin, /notificacoes devolve só os alertas dele
    if (!token) return;
    getNotificacoes(token)
      .then((lista) => setNaoLidas(lista.filter((n) => !n.lida).length))
      .catch(() => undefined);
  }, [token]);

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('Perfil', { aba: 'Alertas' })}
      accessibilityLabel="Alertas"
      className="w-10 h-10 rounded-xl border border-gray-200 items-center justify-center"
    >
      <Ionicons name="notifications-outline" size={20} color="#374151" />
      {naoLidas > 0 && <View className="absolute top-2 right-2 w-2 h-2 rounded-full bg-orange-500" />}
    </TouchableOpacity>
  );
}

function CabecalhoMobile() {
  const insets = useSafeAreaInsets();
  return (
    <View className="bg-white border-b border-gray-200 px-4 pb-3 flex-row items-center justify-between" style={{ paddingTop: insets.top + 12 }}>
      <View className="flex-row items-center gap-2.5">
        <View className="w-9 h-9 rounded-xl items-center justify-center" style={fundoGradiente}>
          <Text className="text-white font-bold text-xs">CS</Text>
        </View>
        <Text className="text-gray-900 font-bold text-[17px]">CleanSynk</Text>
      </View>
      <BotaoSino />
    </View>
  );
}

function BarraSuperior() {
  const navigation = useNavigation<any>();
  const [busca, setBusca] = useState('');

  return (
    <View className="h-[72px] bg-white border-b border-gray-200 px-10 flex-row items-center justify-between">
      <View className="w-[360px] flex-row items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3">
        <Ionicons name="search-outline" size={16} color="#9ca3af" />
        <TextInput
          value={busca}
          onChangeText={setBusca}
          onSubmitEditing={() => navigation.navigate('Lavanderias', { busca: busca.trim() })}
          placeholder="Buscar lavanderia, máquina ou reserva..."
          placeholderTextColor="#9ca3af"
          accessibilityLabel="Buscar"
          className="flex-1 py-2.5 text-sm text-gray-800"
        />
      </View>
      <BotaoSino />
    </View>
  );
}

type PaginaProps = {
  titulo: string;
  subtitulo?: string;
  acoes?: React.ReactNode;
  onVoltar?: () => void;
  children: React.ReactNode;
};

// Moldura das telas do admin: título, subtítulo e ações no topo, conteúdo rolável
export function AdminPagina({ titulo, subtitulo, acoes, onVoltar, children }: PaginaProps) {
  const largo = useLargo();
  return (
    <View className="flex-1 bg-[#f5f7fb]">
      {largo ? <BarraSuperior /> : <CabecalhoMobile />}
      <ScrollView contentContainerClassName={largo ? 'px-10 py-10' : 'px-4 py-5'}>
        {onVoltar && (
          <TouchableOpacity onPress={onVoltar} className="flex-row items-center gap-2 mb-6 self-start">
            <Ionicons name="arrow-back" size={18} color="#4b5563" />
            <Text className="text-gray-600">Voltar</Text>
          </TouchableOpacity>
        )}
        <View className={`mb-7 gap-4 ${largo ? 'flex-row items-end justify-between' : ''}`}>
          <View className="shrink">
            <Text className={`font-bold text-gray-900 ${largo ? 'text-[28px]' : 'text-2xl'}`}>{titulo}</Text>
            {subtitulo ? <Text className="text-gray-500 text-[15px] mt-1">{subtitulo}</Text> : null}
          </View>
          {acoes ? <View className="flex-row flex-wrap gap-3">{acoes}</View> : null}
        </View>
        {children}
      </ScrollView>
    </View>
  );
}

// Abas no estilo "segmentado" (fundo cinza, aba ativa branca)
export function AbasSegmentadas<T extends string>({ abas, ativa, onChange, cheio }: {
  abas: { id: T; rotulo: string }[];
  ativa: T;
  onChange: (id: T) => void;
  cheio?: boolean;
}) {
  // No celular as abas ocupam a largura toda, como no desenho
  if (!useLargo()) cheio = true;
  return (
    <View className={`flex-row bg-slate-100 rounded-xl p-1 ${cheio ? '' : 'self-start'}`}>
      {abas.map((a) => (
        <TouchableOpacity
          key={a.id}
          onPress={() => onChange(a.id)}
          accessibilityRole="tab"
          accessibilityState={{ selected: ativa === a.id }}
          className={`px-5 py-2 rounded-lg items-center ${cheio ? 'flex-1' : ''} ${ativa === a.id ? 'bg-white' : ''}`}
          style={ativa === a.id ? { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } } : undefined}
        >
          <Text className={`text-sm font-semibold ${ativa === a.id ? 'text-blue-700' : 'text-gray-600'}`}>{a.rotulo}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// Card branco com borda fina
export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <View className={`bg-white rounded-2xl border border-gray-200 p-6 ${className}`}>{children}</View>;
}
