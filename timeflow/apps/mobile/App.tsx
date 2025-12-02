/**
 * TimeFlow Mobile App
 *
 * Main entry point with navigation setup.
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet } from 'react-native';

import { TaskListScreen } from './src/screens/TaskListScreen';
import { TodayScreen } from './src/screens/TodayScreen';

const Tab = createBottomTabNavigator();

// Simple icon components (replace with proper icons in production)
function TasksIcon({ color }: { color: string }) {
  return (
    <View style={[styles.iconContainer, { borderColor: color }]}>
      <Text style={[styles.iconText, { color }]}>☐</Text>
    </View>
  );
}

function TodayIcon({ color }: { color: string }) {
  return (
    <View style={[styles.iconContainer, { borderColor: color }]}>
      <Text style={[styles.iconText, { color }]}>📅</Text>
    </View>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#3b82f6',
          tabBarInactiveTintColor: '#94a3b8',
          tabBarStyle: {
            backgroundColor: '#fff',
            borderTopColor: '#e2e8f0',
            paddingTop: 8,
            paddingBottom: 8,
            height: 60,
          },
          headerStyle: {
            backgroundColor: '#fff',
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: '#e2e8f0',
          },
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 18,
            color: '#1e293b',
          },
        }}
      >
        <Tab.Screen
          name="Today"
          component={TodayScreen}
          options={{
            headerTitle: "Today's Agenda",
            tabBarIcon: ({ color }) => <TodayIcon color={color} />,
          }}
        />
        <Tab.Screen
          name="Tasks"
          component={TaskListScreen}
          options={{
            headerTitle: 'All Tasks',
            tabBarIcon: ({ color }) => <TasksIcon color={color} />,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 18,
  },
});

