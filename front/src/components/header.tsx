import { Ionicons } from "@expo/vector-icons";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSearch } from "src/context/search";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

export default function Header() {
  const { query, setQuery } = useSearch();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="bg-[#1565C0] px-5 pb-6"
      style={{ paddingTop: insets.top + 12 }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-start">
          <Ionicons name="location-outline" size={16} color="white" style={{ marginTop: 2 }} />
          <View className="ml-1">
            <Text className="text-white/80 text-xs">Localização</Text>
            <Text className="text-white text-2xl font-bold">Pelotas, RS</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate('Notificacoes')}
          className="w-12 h-12 rounded-full bg-[#3949AB] items-center justify-center"
        >
          <Ionicons name="notifications-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View className="mt-5 bg-white rounded-2xl flex-row items-center px-4 h-14">
        <Ionicons name="search-outline" size={22} color="#9CA3AF" />
        <TextInput
          placeholder="Buscar Lavanderias"
          placeholderTextColor="#9CA3AF"
          className="flex-1 ml-3 text-base"
          value={query}
          onChangeText={setQuery}
        />
      </View>
    </View>
  );
}
