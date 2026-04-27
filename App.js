import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { AppProvider } from './src/context/AppContext';
import { initSyncListener } from './src/services/sync';

import HomeScreen from './src/screens/HomeScreen';
import AddTransactionScreen from './src/screens/AddTransactionScreen';
import AccountsScreen from './src/screens/AccountsScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import ExportScreen from './src/screens/ExportScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Dashboard" component={HomeScreen} options={{ title: 'Finance Tracker' }} />
      <Stack.Screen name="AddTransaction" component={AddTransactionScreen} options={{ title: 'Add Transaction' }} />
    </Stack.Navigator>
  );
}

const ICONS = {
  Home: 'home',
  Accounts: 'wallet',
  History: 'time',
  Export: 'share',
  Settings: 'settings',
};

export default function App() {
  useEffect(() => {
    // Watch network and trigger Drive sync when online
    initSyncListener();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <NavigationContainer>
            <Tab.Navigator
              screenOptions={({ route }) => ({
                tabBarActiveTintColor: '#1976d2',
                tabBarInactiveTintColor: '#888',
                headerShown: false,
                tabBarIcon: ({ color, size, focused }) => {
                  const name = ICONS[route.name];
                  const iconName = focused ? name : `${name}-outline`;
                  return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
                tabBarStyle: { paddingBottom: 4, paddingTop: 4, height: 60 },
              })}
            >
              <Tab.Screen name="Home" component={HomeStack} />
              <Tab.Screen name="Accounts" component={AccountsScreen} />
              <Tab.Screen name="History" component={HistoryScreen} />
              <Tab.Screen name="Export" component={ExportScreen} />
              <Tab.Screen name="Settings" component={SettingsScreen} />
            </Tab.Navigator>
          </NavigationContainer>
        </AppProvider>
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
