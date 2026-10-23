import { Ionicons } from "@expo/vector-icons";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { useEffect, useState } from "react";
import { minhaCidade } from "src/lib/localizacao";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSearch } from "src/context/search";
import { fundoGradiente } from "src/components/AdminLayout";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

export default function Header() {
  const { query, setQuery } = useSearch();
  const [cidade, setCidade] = useState("Buscando...");

  function localizar() {
    setCidade("Buscando...");
    // Se falhar, tocar no nome tenta de novo
    minhaCidade().then(setCidade).catch(() => setCidade("Ativar localização"));
  }

  useEffect(localizar, []);
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="px-5 pb-6 rounded-b-3xl"
      style={[fundoGradiente, { paddingTop: insets.top + 12 }]}
    >
      <View className="flex-row items-center justify-between">
        <TouchableOpacity onPress={localizar} accessibilityLabel="Atualizar localização" className="flex-row items-start shrink">
          <Ionicons name="location-outline" size={13} color="white" style={{ marginTop: 2 }} />
          <View className="ml-1 shrink">
            <Text className="text-white/80 text-xs">Localização</Text>
            <Text className="text-white text-2xl font-bold" numberOfLines={1}>{cidade}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('Notificacoes')}
          className="w-11 h-11 rounded-full bg-white/15 border border-white/20 items-center justify-center"
        >
          <Ionicons name="notifications-outline" size={20} color="white" />
        </TouchableOpacity>
      </View>

      <View className="mt-5 bg-white rounded-xl flex-row items-center px-4 h-12">
        <Ionicons name="search-outline" size={18} color="#9CA3AF" />
        <TextInput
          placeholder="Buscar lavanderias"
          placeholderTextColor="#9CA3AF"
          className="flex-1 ml-3 text-base"
          value={query}
          onChangeText={setQuery}
        />
      </View>
    </View>
  );
}
