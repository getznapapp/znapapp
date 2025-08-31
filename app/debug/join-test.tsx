'use client';
import { View, TextInput, Button, Text, Alert } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useGuestStore } from '@/store/guest-store';

export default function DebugJoinTest() {
  const [name, setName] = useState('');
  const [cameraId, setCameraId] = useState('test-camera-123');
  const router = useRouter();
  const { createSession, currentSession } = useGuestStore();

  const handleJoin = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }

    try {
      await createSession(cameraId, name.trim());
      Alert.alert('Success', `Joined as ${name}`, [
        {
          text: 'Go to Camera',
          onPress: () => router.push('/(tabs)/camera')
        }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to create session');
    }
  };

  return (
    <View style={{ padding: 32, flex: 1, backgroundColor: '#1a1a1a' }}>
      <Text style={{ color: 'white', fontSize: 18, marginBottom: 16 }}>
        Debug Join Test
      </Text>
      
      <Text style={{ color: 'white', marginBottom: 8 }}>Camera ID:</Text>
      <TextInput
        value={cameraId}
        onChangeText={setCameraId}
        placeholder="Camera ID"
        style={{
          backgroundColor: 'white',
          color: 'black',
          padding: 12,
          marginBottom: 16,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: '#ccc',
        }}
      />
      
      <Text style={{ color: 'white', marginBottom: 8 }}>Your Name:</Text>
      <TextInput
        value={name}
        placeholder="Your Name"
        onChangeText={setName}
        style={{
          backgroundColor: 'white',
          color: 'black',
          padding: 12,
          marginBottom: 16,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: '#ccc',
        }}
      />
      
      <Button title="Join Camera" onPress={handleJoin} />
      
      {currentSession && (
        <View style={{ marginTop: 20, padding: 16, backgroundColor: '#333', borderRadius: 8 }}>
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Current Session:</Text>
          <Text style={{ color: 'white' }}>Name: {currentSession.guestName}</Text>
          <Text style={{ color: 'white' }}>Camera: {currentSession.cameraId}</Text>
          <Text style={{ color: 'white' }}>Active: {currentSession.isActive ? 'Yes' : 'No'}</Text>
        </View>
      )}
    </View>
  );
}