import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AdminHeader() {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="bg-blue-700 px-4 pb-4 flex-row items-center justify-between"
      style={{ paddingTop: insets.top + 12 }}
    >
      <View className="flex-row items-center gap-2">
        <View className="w-8 h-8 bg-white rounded-full items-center justify-center">
          <Text className="text-blue-700 font-bold text-xs">CS</Text>
        </View>
        <Text className="text-white font-bold text-base">CleanSynk Admin</Text>
      </View>
      <Ionicons name="notifications-outline" size={24} color="white" />
    </View>
  );
}
