import './global.css';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthProvider, useAuth } from 'src/context/auth';
import { SearchProvider } from 'src/context/search';

// USER
import Home from './app/home';
import Lavanderias from './app/lavanderias';
import Reservas from './app/reservas';
import Perfil from './app/perfil';
import Login from './app/login';

// USER - telas extras (stack)
import LavanderiaDetalhe from './app/user/LavanderiaDetalhe';
import EscolherMaquina from './app/user/EscolherMaquina';
import Pagamento from './app/user/Pagamento';
import StatusLavagem from './app/user/StatusLavagem';
import MeusDados from './app/user/MeusDados';
import MeusCupons from './app/user/MeusCupons';
import Notificacoes from './app/user/Notificacoes';

// ADMIN
import AdminHome from './app/admin/home';
import AdminLavanderias from './app/admin/lavanderias';
import AdminRelatorios from './app/admin/relatorios';
import AdminPerfil from './app/admin/perfil';
import AssistenteIA from './app/admin/AssistenteIA';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function UserTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#1565C0',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: { height: 70, paddingBottom: 5, paddingTop: 5 },
        tabBarLabelStyle: { fontSize: 12 },
        tabBarIcon: ({ color, size }) => {
          switch (route.name) {
            case 'Home': return <Ionicons name="home" size={size} color={color} />;
            case 'Lavanderias': return <MaterialCommunityIcons name="washing-machine" size={size} color={color} />;
            case 'Reservas': return <Ionicons name="checkmark-circle-outline" size={size} color={color} />;
            case 'Perfil': return <Ionicons name="person" size={size} color={color} />;
            default: return null;
          }
        },
      })}
    >
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="Lavanderias" component={Lavanderias} />
      <Tab.Screen name="Reservas" component={Reservas} />
      <Tab.Screen name="Perfil" component={Perfil} />
    </Tab.Navigator>
  );
}

function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#1565C0',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: { height: 70, paddingBottom: 5, paddingTop: 5 },
        tabBarLabelStyle: { fontSize: 12 },
        tabBarIcon: ({ color, size }) => {
          switch (route.name) {
            case 'Início': return <Ionicons name="home" size={size} color={color} />;
            case 'Lavanderias': return <MaterialCommunityIcons name="washing-machine" size={size} color={color} />;
            case 'Relatórios': return <Ionicons name="bar-chart" size={size} color={color} />;
            case 'Perfil': return <Ionicons name="person" size={size} color={color} />;
            default: return null;
          }
        },
      })}
    >
      <Tab.Screen name="Início" component={AdminHome} />
      <Tab.Screen name="Lavanderias" component={AdminLavanderias} />
      <Tab.Screen name="Relatórios" component={AdminRelatorios} />
      <Tab.Screen name="Perfil" component={AdminPerfil} />
    </Tab.Navigator>
  );
}

function AppContent() {
  const { token, loading, user } = useAuth();

  if (loading) return null;

  const isAdmin = user?.tipo === 'ADMIN';

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!token ? (
          <Stack.Screen name="Login" component={Login} />
        ) : isAdmin ? (
          <>
            <Stack.Screen name="AdminTabs" component={AdminTabs} />
            <Stack.Screen name="AssistenteIA" component={AssistenteIA} />
          </>
        ) : (
          <>
            <Stack.Screen name="UserTabs" component={UserTabs} />
            <Stack.Screen name="LavanderiaDetalhe" component={LavanderiaDetalhe} />
            <Stack.Screen name="EscolherMaquina" component={EscolherMaquina} />
            <Stack.Screen name="Pagamento" component={Pagamento} />
            <Stack.Screen name="StatusLavagem" component={StatusLavagem} />
            <Stack.Screen name="MeusDados" component={MeusDados} />
            <Stack.Screen name="MeusCupons" component={MeusCupons} />
            <Stack.Screen name="Notificacoes" component={Notificacoes} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SearchProvider>
          <AppContent />
        </SearchProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
