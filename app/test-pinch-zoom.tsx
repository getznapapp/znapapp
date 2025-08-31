import React, { useRef, useState } from 'react';
import { View, StyleSheet, Text, Platform, TouchableOpacity } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';
import { Stack } from 'expo-router';
import { theme } from '@/constants/theme';

// Test component to isolate pinch gesture issues
export default function TestPinchZoom() {
  const zoom = useSharedValue(1);
  const baseZoom = useRef(1);
  const gestureActive = useSharedValue(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log(`🧪 TEST: ${logEntry}`);
    setLogs(prev => [logEntry, ...prev.slice(0, 9)]); // Keep last 10 logs
  };

  const clearLogs = () => {
    setLogs([]);
    console.clear();
    addLog('Logs cleared');
  };

  const pinchGesture = Gesture.Pinch()
    .onBegin(() => {
      'worklet';
      console.log('🤏 PINCH BEGIN - 2 fingers detected!');
      runOnJS(addLog)('🤏 PINCH BEGIN - 2 fingers detected!');
      baseZoom.current = zoom.value;
      gestureActive.value = true;
    })
    .onUpdate((event) => {
      'worklet';
      console.log('🤏 PINCH UPDATE - scale:', event.scale, 'velocity:', event.velocity);
      runOnJS(addLog)(`🤏 PINCH UPDATE - scale: ${event.scale.toFixed(2)}, velocity: ${event.velocity.toFixed(2)}`);
      
      // Simple scaling calculation
      let nextZoom = baseZoom.current * event.scale;
      nextZoom = Math.max(0.5, Math.min(nextZoom, 5)); // Clamp between 0.5x and 5x
      zoom.value = nextZoom;
    })
    .onEnd(() => {
      'worklet';
      console.log('🤏 PINCH END');
      runOnJS(addLog)('🤏 PINCH END');
      gestureActive.value = false;
    })
    .onFinalize(() => {
      'worklet';
      console.log('🤏 PINCH FINALIZE');
      runOnJS(addLog)('🤏 PINCH FINALIZE');
    });

  const tapGesture = Gesture.Tap()
    .onStart(() => {
      'worklet';
      console.log('👆 TAP DETECTED');
      runOnJS(addLog)('👆 TAP DETECTED - gesture system working!');
    });

  const combinedGesture = Gesture.Simultaneous(pinchGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: zoom.value }],
    backgroundColor: gestureActive.value ? 'rgba(255, 0, 0, 0.3)' : 'rgba(0, 255, 0, 0.3)',
  }));

  const zoomDisplayStyle = useAnimatedStyle(() => ({
    opacity: gestureActive.value ? 1 : 0.7,
    backgroundColor: gestureActive.value ? 'rgba(255, 0, 0, 0.9)' : 'rgba(0, 0, 0, 0.8)',
  }));

  return (
    <>
      <Stack.Screen options={{ title: 'Pinch Zoom Test' }} />
      <View style={styles.container}>
        <Text style={styles.title}>Pinch Zoom Diagnostic Test</Text>
        <Text style={styles.subtitle}>Platform: {Platform.OS}</Text>
        
        <View style={styles.testArea}>
          <GestureDetector gesture={combinedGesture}>
            <Animated.View style={[styles.testBox, animatedStyle]}>
              <Text style={styles.testText}>🤏 Pinch with 2 fingers</Text>
              <Text style={styles.testText}>👆 or tap to test gestures</Text>
              <Text style={styles.testText}>📱 Must use physical device</Text>
            </Animated.View>
          </GestureDetector>
        </View>
        
        <Animated.View style={[styles.zoomDisplay, zoomDisplayStyle]}>
          <Text style={styles.zoomText}>Zoom: {zoom.value.toFixed(2)}x</Text>
          <Text style={styles.statusText}>
            {gestureActive.value ? '🔴 GESTURE ACTIVE' : '🟢 WAITING FOR GESTURE'}
          </Text>
        </Animated.View>
        
        <View style={styles.logContainer}>
          <View style={styles.logHeader}>
            <Text style={styles.logTitle}>Live Logs:</Text>
            <TouchableOpacity onPress={clearLogs} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.logList}>
            {logs.length === 0 ? (
              <Text style={styles.logText}>No logs yet - try gestures above</Text>
            ) : (
              logs.map((log, index) => (
                <Text key={index} style={styles.logText}>{log}</Text>
              ))
            )}
          </View>
        </View>
        
        <View style={styles.instructions}>
          <Text style={styles.instructionTitle}>Troubleshooting:</Text>
          <Text style={styles.instructionText}>✅ If TAP works but PINCH doesn&apos;t → gesture handler issue</Text>
          <Text style={styles.instructionText}>❌ If neither work → GestureHandlerRootView missing</Text>
          <Text style={styles.instructionText}>📱 Test on physical device, not simulator</Text>
          <Text style={styles.instructionText}>🔍 Check console for detailed logs</Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  testArea: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  testBox: {
    width: 180,
    height: 180,
    backgroundColor: 'rgba(0, 255, 0, 0.3)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: theme.colors.primary,
  },
  testText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
    marginVertical: 3,
  },
  zoomDisplay: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 15,
  },
  zoomText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  statusText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 5,
  },
  logContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 10,
    padding: 10,
    marginVertical: 10,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  logTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  clearButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  clearButtonText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: 'bold',
  },
  logList: {
    flex: 1,
  },
  logText: {
    fontSize: 12,
    color: theme.colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginVertical: 1,
  },
  instructions: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 13,
    color: theme.colors.text,
    marginVertical: 2,
  },
});