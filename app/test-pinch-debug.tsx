import React, { useRef } from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';

export default function PinchDebugScreen() {
  const zoom = useSharedValue(1);
  const baseZoom = useRef(1);

  const logMessage = (message: string) => {
    console.log(`🔍 PINCH DEBUG: ${message}`);
  };

  const pinchGesture = Gesture.Pinch()
    .onBegin(() => {
      'worklet';
      baseZoom.current = zoom.value;
      runOnJS(logMessage)('🤏 Pinch BEGIN detected!');
    })
    .onUpdate((e) => {
      'worklet';
      let nextZoom = baseZoom.current * e.scale;
      nextZoom = Math.max(0.5, Math.min(nextZoom, 5));
      zoom.value = nextZoom;
      runOnJS(logMessage)(`🤏 Pinch UPDATE - scale: ${e.scale.toFixed(2)}, zoom: ${nextZoom.toFixed(2)}`);
    })
    .onEnd(() => {
      'worklet';
      runOnJS(logMessage)('🤏 Pinch END');
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: zoom.value }],
  }));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pinch-to-Zoom Debug Test</Text>
      <Text style={styles.subtitle}>
        {Platform.OS === 'web' 
          ? 'Web platform - pinch may not work' 
          : 'Mobile platform - try pinching the red box'}
      </Text>
      
      <GestureDetector gesture={pinchGesture}>
        <Animated.View style={[styles.testBox, animatedStyle]}>
          <Text style={styles.boxText}>PINCH ME</Text>
          <Text style={styles.zoomText}>Zoom: {zoom.value.toFixed(2)}x</Text>
        </Animated.View>
      </GestureDetector>
      
      <Text style={styles.instructions}>
        1. Use two fingers to pinch the red box{'\n'}
        2. Check console logs for gesture detection{'\n'}
        3. Box should scale with pinch gesture{'\n'}
        4. If nothing happens, gesture handler is not working
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 30,
    textAlign: 'center',
  },
  testBox: {
    width: 200,
    height: 200,
    backgroundColor: '#ff4444',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  boxText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  zoomText: {
    fontSize: 16,
    color: '#fff',
  },
  instructions: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 20,
  },
});