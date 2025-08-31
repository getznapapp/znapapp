import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Alert, ScrollView, Platform, Switch } from 'react-native';
import { Stack, router } from 'expo-router';
import { Calendar, Clock, Users, Camera, Image, Hourglass, DollarSign, Play, Zap, Timer } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { trpc, isBackendAvailable, generateOfflineCameraId } from '@/lib/trpc';
import { QRCodeModal } from '@/components/QRCodeModal';
import { useCameraStore } from '@/store/camera-store';
import { theme } from '@/constants/theme';
import { Card } from '@/components/Card';
import { supabaseDirect } from '@/lib/supabase-direct';


type ParticipantOption = {
  limit: 20 | 25 | 30 | 50 | 999;
  price: number;
  label: string;
  productId?: string;
};

type RevealDelayOption = {
  type: 'immediate' | '12h' | '24h' | 'custom';
  label: string;
  description: string;
};

type DurationOption = {
  hours: number | 'custom';
  label: string;
  description: string;
};

const PARTICIPANT_OPTIONS: ParticipantOption[] = [
  { limit: 20, price: 0, label: '20 (Free)' },
  { limit: 25, price: 3, label: '25', productId: 'znap.participants.25' },
  { limit: 30, price: 5, label: '30', productId: 'znap.participants.30' },
  { limit: 50, price: 15, label: '50', productId: 'znap.participants.50' },
  { limit: 999, price: 25, label: '∞', productId: 'znap.participants.unlimited' },
];

const PHOTO_TIERS = [
  { count: 20, label: '20', price: 0 },
  { count: 25, label: '25', price: 3 },
  { count: 30, label: '30', price: 5 },
  { count: 50, label: '50', price: 10 },
];

const FILTER_OPTIONS = [
  { value: 'none' as const, label: 'None', price: 0 },
  { value: 'disposable' as const, label: 'Disposable Film', price: 0 },
];

const REVEAL_DELAY_OPTIONS: RevealDelayOption[] = [
  { type: 'immediate', label: 'Immediate', description: 'Photos are revealed as soon as they are taken' },
  { type: '12h', label: '12 Hours', description: 'Photos are revealed 12 hours after the event ends' },
  { type: '24h', label: '24 Hours', description: 'Photos are revealed 24 hours after the event ends' },
  { type: 'custom', label: 'Custom Time', description: 'Set a specific date and time for photo reveal' },
];

const DURATION_OPTIONS: DurationOption[] = [
  { hours: 6, label: '6 Hours', description: 'Perfect for parties and short events' },
  { hours: 12, label: '12 Hours', description: 'Great for day-long events' },
  { hours: 24, label: '24 Hours', description: 'Ideal for multi-day events' },
  { hours: 'custom', label: 'Custom', description: 'Set your own duration' },
];

interface CreateCameraScreenProps {
  isInstant?: boolean;
}

export default function CreateCameraScreen({ isInstant = false }: CreateCameraScreenProps) {
  const { addCamera, setCurrentCamera } = useCameraStore();
  const [cameraName, setCameraName] = useState('');
  const [selectedLimit, setSelectedLimit] = useState<20 | 25 | 30 | 50 | 999>(20);
  const [maxPhotosPerPerson, setMaxPhotosPerPerson] = useState<20 | 25 | 30 | 50>(20);
  const [filter, setFilter] = useState<'none' | 'disposable'>('disposable');
  const [allowCameraRoll, setAllowCameraRoll] = useState(true);
  const [revealDelayType, setRevealDelayType] = useState<'immediate' | '12h' | '24h' | 'custom'>('24h');
  const [customRevealAt, setCustomRevealAt] = useState<Date>(new Date(Date.now() + 48 * 60 * 60 * 1000)); // 48 hours from now
  const [startTime, setStartTime] = useState<Date>(new Date(Date.now() + 10 * 60 * 1000)); // 10 minutes from now
  const [durationHours, setDurationHours] = useState<number | 'custom'>(24);
  const [customDurationHours, setCustomDurationHours] = useState<number>(24);
  const [customEndTime, setCustomEndTime] = useState<Date>(new Date(Date.now() + 24 * 60 * 60 * 1000)); // 24 hours from now
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [createdCamera, setCreatedCamera] = useState<{ id: string; name: string } | null>(null);

  // Update custom end time when start time changes (for scheduled cameras)
  useEffect(() => {
    if (!isInstant && durationHours !== 'custom') {
      const newEndTime = new Date(startTime.getTime() + (durationHours as number) * 60 * 60 * 1000);
      setCustomEndTime(newEndTime);
    }
  }, [startTime, durationHours, isInstant]);

  
  // Create camera locally (offline mode)
  const createCameraLocally = (mutationData: any) => {
    console.log('Creating camera in offline mode...');
    
    const cameraId = generateOfflineCameraId();
    const localCamera = addCamera({
      name: mutationData.name,
      startDate: mutationData.startTime,
      endDate: mutationData.endTime,
      durationHours: mutationData.durationHours,
      maxPhotosPerPerson: maxPhotosPerPerson,
      allowCameraRoll: allowCameraRoll,
      revealDelayType: mutationData.revealDelayType,
      customRevealAt: mutationData.customRevealAt,
      filter: filter,
      maxGuests: mutationData.participantLimit,
      isActive: true,
      paidUpgrade: mutationData.paidUpgrade,
    }, cameraId);
    
    console.log('Adding camera to store with ID:', localCamera.id);
    
    // Set as current camera
    setCurrentCamera(localCamera);
    
    // Show QR modal with the created camera
    setCreatedCamera({ id: localCamera.id, name: localCamera.name });
    setShowQRModal(true);
  };

  // Handle direct Supabase creation (when backend is not available)
  const handleDirectSupabaseCreation = async (mutationData: any) => {
    try {
      console.log('Attempting direct Supabase camera creation...');
      
      const directResult = await supabaseDirect.createCamera({
        name: mutationData.name,
        endTime: mutationData.endTime,
        participantLimit: mutationData.participantLimit,
        maxPhotosPerPerson: mutationData.maxPhotosPerPerson,
        allowCameraRoll: mutationData.allowCameraRoll,
        filter: mutationData.filter,
        paidUpgrade: mutationData.paidUpgrade,
        revealDelayType: mutationData.revealDelayType,
        customRevealAt: mutationData.customRevealAt,
      });
      
      if (directResult.success) {
        console.log('Direct Supabase camera creation successful:', directResult);
        
        // Add camera to local store using the Supabase-generated ID
        const localCamera = addCamera({
          name: mutationData.name,
          startDate: mutationData.startTime,
          endDate: mutationData.endTime,
          durationHours: mutationData.durationHours,
          maxPhotosPerPerson: mutationData.maxPhotosPerPerson,
          allowCameraRoll: mutationData.allowCameraRoll,
          revealDelayType: mutationData.revealDelayType,
          customRevealAt: mutationData.customRevealAt,
          filter: mutationData.filter,
          maxGuests: mutationData.participantLimit,
          isActive: true,
          paidUpgrade: mutationData.paidUpgrade,
        }, directResult.cameraId);
        
        console.log('Local camera created with Supabase ID:', localCamera.id);
        
        setCurrentCamera(localCamera);
        setCreatedCamera({ id: localCamera.id, name: localCamera.name });
        setShowQRModal(true);
        
        Alert.alert(
          'Camera Created Successfully',
          'Camera was created and synced with the database.',
          [{ text: 'OK' }]
        );
        return;
      }
    } catch (directError) {
      console.error('Direct Supabase camera creation failed:', directError);
    }
    
    // Final fallback to local creation only
    console.log('Creating camera locally as final fallback...');
    createCameraLocally(mutationData);
    
    Alert.alert(
      'Camera Created Locally',
      'Camera was created on your device. Some features may be limited without server connection.',
      [{ text: 'OK' }]
    );
  };

  const createCameraMutation = trpc.camera.create.useMutation({
    onSuccess: async (data) => {
      console.log('Backend camera creation successful:', data);
      
      // Wait a moment for database consistency
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Verify the camera exists in Supabase before proceeding
      try {
        const verifyResult = await supabaseDirect.getCamera(data.cameraId);
        if (!verifyResult.success) {
          console.error('Camera verification failed after creation:', verifyResult);
          throw new Error('Camera was created but could not be verified');
        }
        console.log('Camera verified in Supabase:', verifyResult.camera);
      } catch (verifyError) {
        console.error('Camera verification error:', verifyError);
        // Continue anyway, but log the issue
      }
      
      // Add camera to local store using the backend-generated ID
      const newCamera = addCamera({
        name: cameraName.trim(),
        startDate: startTime,
        endDate: calculateEndTime(),
        durationHours: durationHours === 'custom' 
          ? Math.round((calculateEndTime().getTime() - startTime.getTime()) / (1000 * 60 * 60))
          : durationHours,
        maxPhotosPerPerson: maxPhotosPerPerson,
        allowCameraRoll: allowCameraRoll,
        revealDelayType,
        customRevealAt: revealDelayType === 'custom' ? customRevealAt : undefined,
        filter: filter,
        maxGuests: selectedLimit,
        isActive: true,
        paidUpgrade: selectedLimit > 20,
      }, data.cameraId); // Use the backend-generated camera ID
      
      console.log('Local camera created with backend ID:', newCamera.id);
      
      // Set as current camera
      setCurrentCamera(newCamera);
      
      // Show QR modal with the created camera
      setCreatedCamera({ id: newCamera.id, name: newCamera.name });
      setShowQRModal(true);
    },
    onError: async (error) => {
      console.error('Backend camera creation failed:', error);
      console.log('Error details:', {
        message: error.message,
        data: error.data,
        shape: error.shape
      });
      
      // Try direct Supabase creation as fallback
      try {
        console.log('Attempting direct Supabase camera creation as fallback...');
        
        const directResult = await supabaseDirect.createCamera({
          name: cameraName.trim(),
          endTime: calculateEndTime(),
          participantLimit: selectedLimit,
          maxPhotosPerPerson: maxPhotosPerPerson,
          allowCameraRoll: allowCameraRoll,
          filter: filter,
          paidUpgrade: selectedLimit > 20,
          revealDelayType: revealDelayType,
          customRevealAt: revealDelayType === 'custom' ? customRevealAt : undefined,
        });
        
        if (directResult.success) {
          console.log('Direct Supabase camera creation successful:', directResult);
          
          // Add camera to local store using the Supabase-generated ID
          const localCamera = addCamera({
            name: cameraName.trim(),
            startDate: isInstant ? new Date() : startTime,
            endDate: calculateEndTime(),
            durationHours: durationHours === 'custom' 
              ? Math.round((calculateEndTime().getTime() - startTime.getTime()) / (1000 * 60 * 60))
              : durationHours,
            maxPhotosPerPerson: maxPhotosPerPerson,
            allowCameraRoll: allowCameraRoll,
            revealDelayType,
            customRevealAt: revealDelayType === 'custom' ? customRevealAt : undefined,
            filter: filter,
            maxGuests: selectedLimit,
            isActive: true,
            paidUpgrade: selectedLimit > 20,
          }, directResult.cameraId); // Use the Supabase-generated camera ID
          
          console.log('Local camera created with Supabase ID:', localCamera.id);
          
          setCurrentCamera(localCamera);
          setCreatedCamera({ id: localCamera.id, name: localCamera.name });
          setShowQRModal(true);
          
          Alert.alert(
            'Camera Created Successfully',
            'Camera was created and synced with the database.',
            [{ text: 'OK' }]
          );
          return;
        }
      } catch (directError) {
        console.error('Direct Supabase camera creation also failed:', directError);
      }
      
      // Final fallback to local creation only
      console.log('Creating camera locally as final fallback...');
      
      const localCamera = addCamera({
        name: cameraName.trim(),
        startDate: isInstant ? new Date() : startTime,
        endDate: calculateEndTime(),
        durationHours: durationHours === 'custom' 
          ? Math.round((calculateEndTime().getTime() - startTime.getTime()) / (1000 * 60 * 60))
          : durationHours,
        maxPhotosPerPerson: maxPhotosPerPerson,
        allowCameraRoll: allowCameraRoll,
        revealDelayType,
        customRevealAt: revealDelayType === 'custom' ? customRevealAt : undefined,
        filter: filter,
        maxGuests: selectedLimit,
        isActive: true,
        paidUpgrade: selectedLimit > 20,
      });
      
      setCurrentCamera(localCamera);
      setCreatedCamera({ id: localCamera.id, name: localCamera.name });
      setShowQRModal(true);
      
      // Show a warning but don't block the user
      Alert.alert(
        'Camera Created Locally',
        'Camera was created on your device. Some features may be limited without server connection.',
        [{ text: 'OK' }]
      );
    },
  });

  const mockPurchase = async (productId: string): Promise<boolean> => {
    return new Promise((resolve) => {
      // Simulate purchase process with a delay
      setTimeout(() => {
        // Simulate 90% success rate for demo purposes
        const success = Math.random() > 0.1;
        resolve(success);
      }, 2000);
    });
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCustomTimeChange = (hours: number) => {
    const newTime = new Date(Date.now() + hours * 60 * 60 * 1000);
    setCustomRevealAt(newTime);
  };

  const calculateEndTime = () => {
    const baseTime = isInstant ? new Date() : startTime;
    if (durationHours === 'custom') {
      return customEndTime;
    }
    return new Date(baseTime.getTime() + (durationHours as number) * 60 * 60 * 1000);
  };

  const handleDurationChange = (hours: number | 'custom') => {
    setDurationHours(hours);
    if (hours !== 'custom') {
      // Update custom end time based on selected duration
      const baseTime = isInstant ? new Date() : startTime;
      const newEndTime = new Date(baseTime.getTime() + (hours as number) * 60 * 60 * 1000);
      setCustomEndTime(newEndTime);
    }
  };

  const formatDuration = (hours: number) => {
    if (hours < 24) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      if (remainingHours === 0) {
        return `${days} day${days !== 1 ? 's' : ''}`;
      } else {
        return `${days} day${days !== 1 ? 's' : ''} ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`;
      }
    }
  };

  const handleDateTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      setShowTimePicker(false);
    }
    
    if (selectedDate) {
      if (showDatePicker) {
        // Date was selected, now show time picker
        const newDate = new Date(customRevealAt);
        newDate.setFullYear(selectedDate.getFullYear());
        newDate.setMonth(selectedDate.getMonth());
        newDate.setDate(selectedDate.getDate());
        setCustomRevealAt(newDate);
        
        if (Platform.OS === 'ios') {
          // On iOS, both date and time are selected together
          setCustomRevealAt(selectedDate);
        } else {
          // On Android, show time picker after date selection
          setShowDatePicker(false);
          setShowTimePicker(true);
        }
      } else if (showTimePicker) {
        // Time was selected
        const newDate = new Date(customRevealAt);
        newDate.setHours(selectedDate.getHours());
        newDate.setMinutes(selectedDate.getMinutes());
        setCustomRevealAt(newDate);
        setShowTimePicker(false);
      }
    }
  };

  const handleStartDateTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartDatePicker(false);
      setShowStartTimePicker(false);
    }
    
    if (selectedDate) {
      if (showStartDatePicker) {
        // Date was selected, now show time picker
        const newDate = new Date(startTime);
        newDate.setFullYear(selectedDate.getFullYear());
        newDate.setMonth(selectedDate.getMonth());
        newDate.setDate(selectedDate.getDate());
        setStartTime(newDate);
        
        if (Platform.OS === 'ios') {
          // On iOS, both date and time are selected together
          setStartTime(selectedDate);
        } else {
          // On Android, show time picker after date selection
          setShowStartDatePicker(false);
          setShowStartTimePicker(true);
        }
      } else if (showStartTimePicker) {
        // Time was selected
        const newDate = new Date(startTime);
        newDate.setHours(selectedDate.getHours());
        newDate.setMinutes(selectedDate.getMinutes());
        setStartTime(newDate);
        setShowStartTimePicker(false);
      }
    }
  };

  const openDateTimePicker = () => {
    if (Platform.OS === 'ios') {
      setShowDatePicker(true);
    } else {
      // On Android, start with date picker
      setShowDatePicker(true);
    }
  };

  const openStartDateTimePicker = () => {
    if (Platform.OS === 'ios') {
      setShowStartDatePicker(true);
    } else {
      // On Android, start with date picker
      setShowStartDatePicker(true);
    }
  };

  const openEndDateTimePicker = () => {
    if (Platform.OS === 'ios') {
      setShowEndDatePicker(true);
    } else {
      // On Android, start with date picker
      setShowEndDatePicker(true);
    }
  };

  const handleEndDateTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndDatePicker(false);
      setShowEndTimePicker(false);
    }
    
    if (selectedDate) {
      if (showEndDatePicker) {
        // Date was selected, now show time picker
        const newDate = new Date(customEndTime);
        newDate.setFullYear(selectedDate.getFullYear());
        newDate.setMonth(selectedDate.getMonth());
        newDate.setDate(selectedDate.getDate());
        setCustomEndTime(newDate);
        
        if (Platform.OS === 'ios') {
          // On iOS, both date and time are selected together
          setCustomEndTime(selectedDate);
        } else {
          // On Android, show time picker after date selection
          setShowEndDatePicker(false);
          setShowEndTimePicker(true);
        }
      } else if (showEndTimePicker) {
        // Time was selected
        const newDate = new Date(customEndTime);
        newDate.setHours(selectedDate.getHours());
        newDate.setMinutes(selectedDate.getMinutes());
        setCustomEndTime(newDate);
        setShowEndTimePicker(false);
      }
    }
  };

  const handleCreateCamera = async () => {
    if (!cameraName.trim()) {
      Alert.alert('Error', 'Please enter a camera name');
      return;
    }

    if (revealDelayType === 'custom' && customRevealAt <= new Date()) {
      Alert.alert('Error', 'Custom reveal time must be in the future');
      return;
    }

    if (startTime < new Date(Date.now() - 2 * 60 * 1000)) { // Allow up to 2 minutes in the past
      Alert.alert('Error', 'Start time must be in the future');
      return;
    }

    const selectedOption = PARTICIPANT_OPTIONS.find(option => option.limit === selectedLimit)!;
    const requiresPurchase = selectedLimit > 20;

    if (requiresPurchase && selectedOption.productId) {
      setIsPurchasing(true);
      
      try {
        Alert.alert(
          'Purchase Required',
          `This upgrade costs $${selectedOption.price}. Proceed with purchase?`,
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => setIsPurchasing(false),
            },
            {
              text: 'Purchase',
              onPress: async () => {
                try {
                  // Mock purchase call - replace with actual RNIap.requestPurchase(selectedOption.productId) when available
                  const purchaseSuccess = await mockPurchase(selectedOption.productId!);
                  
                  if (purchaseSuccess) {
                    // Purchase successful, create camera
                    const endTime = calculateEndTime();
                    
                    const mutationData = {
                      name: cameraName.trim(),
                      startTime: isInstant ? new Date() : startTime,
                      endTime,
                      durationHours: durationHours === 'custom' 
                        ? Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60))
                        : durationHours,
                      participantLimit: selectedLimit,
                      maxPhotosPerPerson: maxPhotosPerPerson,
                      allowCameraRoll: allowCameraRoll,
                      filter: filter,
                      paidUpgrade: true,
                      revealDelayType,
                      customRevealAt: revealDelayType === 'custom' ? customRevealAt : undefined,
                    };
                    
                    console.log('Mutation data:', mutationData);
                    
                    // Check if backend is available, otherwise create directly in Supabase
                    if (isBackendAvailable()) {
                      createCameraMutation.mutate(mutationData);
                    } else {
                      handleDirectSupabaseCreation(mutationData);
                    }
                  } else {
                    Alert.alert(
                      'Purchase Failed',
                      'The purchase could not be completed. Please try again.',
                      [{ text: 'OK' }]
                    );
                  }
                } catch (error) {
                  Alert.alert(
                    'Purchase Error',
                    'An error occurred during purchase. Please try again.',
                    [{ text: 'OK' }]
                  );
                } finally {
                  setIsPurchasing(false);
                }
              },
            },
          ]
        );
      } catch (error) {
        setIsPurchasing(false);
        Alert.alert('Error', 'Failed to initiate purchase');
      }
    } else {
      // Free tier, create camera directly
      const endTime = calculateEndTime();
      
      const mutationData = {
        name: cameraName.trim(),
        startTime: isInstant ? new Date() : startTime,
        endTime,
        durationHours: durationHours === 'custom' 
          ? Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60))
          : durationHours,
        participantLimit: selectedLimit,
        maxPhotosPerPerson: maxPhotosPerPerson,
        allowCameraRoll: allowCameraRoll,
        filter: filter,
        paidUpgrade: false,
        revealDelayType,
        customRevealAt: revealDelayType === 'custom' ? customRevealAt : undefined,
      };
      
      console.log('Mutation data (free tier):', mutationData);
      
      // Check if backend is available first for faster fallback
      if (isBackendAvailable()) {
        console.log('Backend available, attempting camera creation via backend...');
        createCameraMutation.mutate(mutationData);
      } else {
        console.log('Backend not available, creating camera directly in Supabase...');
        // Directly create via Supabase without trying backend first
        handleDirectSupabaseCreation(mutationData);
      }
    }
  };

  const selectedOption = PARTICIPANT_OPTIONS.find(option => option.limit === selectedLimit)!;
  const selectedRevealOption = REVEAL_DELAY_OPTIONS.find(option => option.type === revealDelayType)!;
  const selectedPhotoTier = PHOTO_TIERS.find(tier => tier.count === maxPhotosPerPerson) || PHOTO_TIERS[0];
  const selectedFilterOption = FILTER_OPTIONS.find(option => option.value === filter)!;
  const totalCost = selectedOption.price + selectedPhotoTier.price + selectedFilterOption.price;
  const isProcessing = isPurchasing || createCameraMutation.isPending;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: isInstant ? 'Start Instant Camera' : 'Schedule a Znap Camera',
          headerStyle: {
            backgroundColor: theme.colors.background,
          },
          headerTitleStyle: {
            color: theme.colors.text,
          },
          headerTintColor: theme.colors.text,
        }}
      />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            {isInstant ? (
              <Zap size={32} color={theme.colors.primary} />
            ) : (
              <Calendar size={32} color={theme.colors.primary} />
            )}
          </View>
          <Text style={styles.title}>
            {isInstant ? 'Start Instant Camera' : 'Schedule a Znap Camera'}
          </Text>
          <Text style={styles.subtitle}>
            {isInstant 
              ? 'Create a camera that starts immediately'
              : 'Create a camera that starts at a specific time'
            }
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Camera Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter camera name"
              placeholderTextColor={theme.colors.textTertiary}
              value={cameraName}
              onChangeText={setCameraName}
              autoFocus
              editable={!isProcessing}
            />
          </View>

          {/* Participants */}
          <Card style={styles.settingCard}>
            <View style={styles.settingHeader}>
              <Users size={20} color={theme.colors.textSecondary} />
              <Text style={styles.settingTitle}>How many participants</Text>
              {selectedOption.price > 0 && (
                <View style={styles.priceBadge}>
                  <DollarSign size={12} color={theme.colors.text} />
                  <Text style={styles.priceText}>{selectedOption.price}</Text>
                </View>
              )}
            </View>
            <Text style={styles.description}>
              Choose how many people can join your camera
            </Text>
            
            <View style={styles.optionsContainer}>
              {PARTICIPANT_OPTIONS.map((option) => (
                <Pressable
                  key={option.limit}
                  style={[
                    styles.option,
                    selectedLimit === option.limit && styles.optionSelected,
                    isProcessing && styles.optionDisabled,
                  ]}
                  onPress={() => !isProcessing && setSelectedLimit(option.limit)}
                  disabled={isProcessing}
                >
                  <View style={styles.optionContent}>
                    <Text style={[
                      styles.optionText,
                      selectedLimit === option.limit && styles.optionTextSelected,
                    ]}>
                      {option.limit === 999 ? '∞' : option.limit.toString()}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </Card>

          {/* Photos per Person */}
          <Card style={styles.settingCard}>
            <View style={styles.settingHeader}>
              <Camera size={20} color={theme.colors.textSecondary} />
              <Text style={styles.settingTitle}>How many images per person</Text>
              {selectedPhotoTier.price > 0 && (
                <View style={styles.priceBadge}>
                  <DollarSign size={12} color={theme.colors.text} />
                  <Text style={styles.priceText}>{selectedPhotoTier.price}</Text>
                </View>
              )}
            </View>
            <Text style={styles.description}>
              Set the number of photos each person can take
            </Text>
            
            <View style={styles.photoOptions}>
              {PHOTO_TIERS.map((tier) => (
                <Pressable
                  key={tier.count}
                  style={[
                    styles.photoOption,
                    maxPhotosPerPerson === tier.count && styles.photoOptionSelected,
                    isProcessing && styles.optionDisabled,
                  ]}
                  onPress={() => !isProcessing && setMaxPhotosPerPerson(tier.count as 20 | 25 | 30 | 50)}
                  disabled={isProcessing}
                >
                  <Text style={[
                    styles.photoOptionText,
                    maxPhotosPerPerson === tier.count && styles.photoOptionTextSelected,
                  ]}>
                    {tier.count}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Card>

          {/* Filter */}
          <Card style={styles.settingCard}>
            <View style={styles.settingHeader}>
              <Image size={20} color={theme.colors.textSecondary} />
              <Text style={styles.settingTitle}>Filter</Text>
            </View>
            <Text style={styles.description}>
              Choose a visual filter for all photos
            </Text>
            
            <View style={styles.filterOptions}>
              {FILTER_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.filterOption,
                    filter === option.value && styles.filterOptionSelected,
                    isProcessing && styles.optionDisabled,
                  ]}
                  onPress={() => !isProcessing && setFilter(option.value)}
                  disabled={isProcessing}
                >
                  <Text style={[
                    styles.filterOptionText,
                    filter === option.value && styles.filterOptionTextSelected,
                  ]}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Card>

          {/* Camera Roll Toggle */}
          <Card style={styles.settingCard}>
            <View style={styles.toggleContainer}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleTitle}>Allow camera roll uploads</Text>
                <Text style={styles.toggleDescription}>
                  Let participants upload photos from their gallery
                </Text>
              </View>
              <Switch
                value={allowCameraRoll}
                onValueChange={setAllowCameraRoll}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={theme.colors.text}
                disabled={isProcessing}
              />
            </View>
          </Card>

          {/* Start Time - Only show for scheduled cameras */}
          {!isInstant && (
            <Card style={styles.settingCard}>
              <View style={styles.settingHeader}>
                <Clock size={20} color={theme.colors.textSecondary} />
                <Text style={styles.settingTitle}>When to start the camera</Text>
              </View>
              <Text style={styles.description}>
                When should the camera become available for taking photos?
              </Text>
              
              <Pressable 
                style={styles.customTimeDisplay}
                onPress={openStartDateTimePicker}
                disabled={isProcessing}
              >
                <Clock size={16} color={theme.colors.textSecondary} />
                <Text style={styles.customTimeText}>
                  {formatDateTime(startTime)}
                </Text>
              </Pressable>
              
              {showStartDatePicker && (
                <DateTimePicker
                  value={startTime}
                  mode={Platform.OS === 'ios' ? 'datetime' : 'date'}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleStartDateTimeChange}
                  minimumDate={new Date()}
                  themeVariant="dark"
                />
              )}

              {showStartTimePicker && Platform.OS === 'android' && (
                <DateTimePicker
                  value={startTime}
                  mode="time"
                  display="default"
                  onChange={handleStartDateTimeChange}
                  themeVariant="dark"
                />
              )}
            </Card>
          )}

          {/* Event Duration */}
          <Card style={styles.settingCard}>
            <View style={styles.settingHeader}>
              <Timer size={20} color={theme.colors.textSecondary} />
              <Text style={styles.settingTitle}>Event Duration</Text>
            </View>
            <Text style={styles.description}>
              How long should the event last?
            </Text>
            
            <View style={styles.durationOptionsContainer}>
              {DURATION_OPTIONS.map((option) => (
                <Pressable
                  key={option.hours}
                  style={[
                    styles.durationOption,
                    durationHours === option.hours && styles.durationOptionSelected,
                    isProcessing && styles.optionDisabled,
                  ]}
                  onPress={() => !isProcessing && handleDurationChange(option.hours)}
                  disabled={isProcessing}
                >
                  <View style={styles.durationOptionHeader}>
                    <Text style={[
                      styles.durationOptionTitle,
                      durationHours === option.hours && styles.durationOptionTitleSelected,
                    ]}>
                      {option.label}
                    </Text>
                  </View>
                  <Text style={[
                    styles.durationOptionDescription,
                    durationHours === option.hours && styles.durationOptionDescriptionSelected,
                  ]}>
                    {option.description}
                  </Text>
                </Pressable>
              ))}
            </View>

            {durationHours === 'custom' && (
              <View style={styles.customTimeContainer}>
                <Text style={styles.customTimeLabel}>Custom End Time</Text>
                <Pressable 
                  style={styles.customTimeDisplay}
                  onPress={openEndDateTimePicker}
                  disabled={isProcessing}
                >
                  <Clock size={16} color={theme.colors.textSecondary} />
                  <Text style={styles.customTimeText}>
                    {formatDateTime(customEndTime)}
                  </Text>
                </Pressable>
                
                <Text style={styles.durationPreview}>
                  Duration: {formatDuration(Math.round((customEndTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)))}
                </Text>

                {showEndDatePicker && (
                  <DateTimePicker
                    value={customEndTime}
                    mode={Platform.OS === 'ios' ? 'datetime' : 'date'}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleEndDateTimeChange}
                    minimumDate={new Date(startTime.getTime() + 60 * 60 * 1000)} // At least 1 hour after start
                    themeVariant="dark"
                  />
                )}

                {showEndTimePicker && Platform.OS === 'android' && (
                  <DateTimePicker
                    value={customEndTime}
                    mode="time"
                    display="default"
                    onChange={handleEndDateTimeChange}
                    themeVariant="dark"
                  />
                )}
              </View>
            )}
          </Card>

          {/* When photos will be revealed */}
          <Card style={styles.settingCard}>
            <View style={styles.settingHeader}>
              <Hourglass size={20} color={theme.colors.textSecondary} />
              <Text style={styles.settingTitle}>When photos will be revealed</Text>
            </View>
            <Text style={styles.description}>
              When should photos be revealed to participants?
            </Text>
            
            <View style={styles.revealOptionsContainer}>
              {REVEAL_DELAY_OPTIONS.map((option) => (
                <Pressable
                  key={option.type}
                  style={[
                    styles.revealOption,
                    revealDelayType === option.type && styles.revealOptionSelected,
                    isProcessing && styles.optionDisabled,
                  ]}
                  onPress={() => !isProcessing && setRevealDelayType(option.type)}
                  disabled={isProcessing}
                >
                  <View style={styles.revealOptionHeader}>
                    <Text style={[
                      styles.revealOptionTitle,
                      revealDelayType === option.type && styles.revealOptionTitleSelected,
                    ]}>
                      {option.label}
                    </Text>
                  </View>
                  <Text style={[
                    styles.revealOptionDescription,
                    revealDelayType === option.type && styles.revealOptionDescriptionSelected,
                  ]}>
                    {option.description}
                  </Text>
                </Pressable>
              ))}
            </View>

            {revealDelayType === 'custom' && (
              <View style={styles.customTimeContainer}>
                <Text style={styles.customTimeLabel}>Custom Reveal Time</Text>
                <Pressable 
                  style={styles.customTimeDisplay}
                  onPress={openDateTimePicker}
                  disabled={isProcessing}
                >
                  <Calendar size={16} color={theme.colors.textSecondary} />
                  <Text style={styles.customTimeText}>
                    {formatDateTime(customRevealAt)}
                  </Text>
                </Pressable>
                
                <View style={styles.quickTimeOptions}>
                  <Text style={styles.quickTimeLabel}>Quick Options:</Text>
                  <View style={styles.quickTimeButtons}>
                    {[12, 24, 48, 72].map((hours) => (
                      <Pressable
                        key={hours}
                        style={styles.quickTimeButton}
                        onPress={() => handleCustomTimeChange(hours)}
                        disabled={isProcessing}
                      >
                        <Text style={styles.quickTimeButtonText}>
                          {hours}h
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {showDatePicker && (
                  <DateTimePicker
                    value={customRevealAt}
                    mode={Platform.OS === 'ios' ? 'datetime' : 'date'}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateTimeChange}
                    minimumDate={new Date()}
                    themeVariant="dark"
                  />
                )}

                {showTimePicker && Platform.OS === 'android' && (
                  <DateTimePicker
                    value={customRevealAt}
                    mode="time"
                    display="default"
                    onChange={handleDateTimeChange}
                    themeVariant="dark"
                  />
                )}
              </View>
            )}
          </Card>

          {/* Pricing Summary */}
          {totalCost > 0 && (
            <View style={styles.pricingInfo}>
              <Text style={styles.pricingText}>
                💎 Premium upgrade selected: ${totalCost}
              </Text>
              <Text style={styles.pricingSubtext}>
                In-app purchase required
              </Text>
            </View>
          )}

          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Start Time:</Text>
              <Text style={styles.summaryValue}>
                {isInstant ? 'Immediately' : formatDateTime(startTime)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Duration:</Text>
              <Text style={styles.summaryValue}>
                {durationHours === 'custom' 
                  ? formatDuration(Math.round((customEndTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)))
                  : formatDuration(durationHours as number)
                }
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Participants:</Text>
              <Text style={styles.summaryValue}>
                {selectedLimit === 999 ? '∞' : `Up to ${selectedLimit}`}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Photos per person:</Text>
              <Text style={styles.summaryValue}>{maxPhotosPerPerson}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Filter:</Text>
              <Text style={styles.summaryValue}>{selectedFilterOption.label}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Camera roll:</Text>
              <Text style={styles.summaryValue}>{allowCameraRoll ? 'Allowed' : 'Not allowed'}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Reveal:</Text>
              <Text style={styles.summaryValue}>
                {selectedRevealOption.label}
                {revealDelayType === 'custom' && ` (${formatDateTime(customRevealAt)})`}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Cost:</Text>
              <Text style={styles.summaryValue}>
                {totalCost === 0 ? 'Free' : `${totalCost}`}
              </Text>
            </View>
          </View>
        </View>

        <Pressable
          style={[
            styles.createButton,
            isProcessing && styles.createButtonDisabled,
          ]}
          onPress={handleCreateCamera}
          disabled={isProcessing}
        >
          <Text style={styles.createButtonText}>
            {isPurchasing ? 'Processing Purchase...' : 
             createCameraMutation.isPending ? 'Creating Camera...' : 
             selectedOption.price > 0 ? `Purchase & Create ($${selectedOption.price})` : 'Create Camera'}
          </Text>
        </Pressable>

        {selectedOption.price > 0 && (
          <Text style={styles.disclaimer}>
            * This is a mock purchase flow. In production, this would use react-native-iap
          </Text>
        )}
      </ScrollView>

      {/* QR Code Modal */}
      {createdCamera && (
        <QRCodeModal
          visible={showQRModal}
          onClose={() => {
            setShowQRModal(false);
            router.back();
          }}
          cameraId={createdCamera.id}
          cameraName={createdCamera.name}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    alignItems: 'center',
    paddingTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: '700' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  scrollView: {
    flex: 1,
  },
  settingCard: {
    padding: theme.spacing.lg,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  settingTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.text,
    flex: 1,
  },
  priceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    gap: 2,
  },
  priceText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  form: {
    flex: 1,
    gap: theme.spacing.xl,
  },
  inputGroup: {
    gap: theme.spacing.sm,
  },
  label: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  description: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  option: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    alignItems: 'center',
    minHeight: 60,
    justifyContent: 'center',
  },
  optionSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  optionDisabled: {
    opacity: 0.6,
  },
  optionContent: {
    alignItems: 'center',
    gap: 2,
  },
  optionText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  optionTextSelected: {
    color: theme.colors.text,
  },
  optionPrice: {
    fontSize: theme.fontSize.xs,
    fontWeight: '500' as const,
    color: theme.colors.textSecondary,
  },
  optionPriceSelected: {
    color: theme.colors.text,
  },
  photoOptions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  photoOption: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    alignItems: 'center',
    minHeight: 60,
    justifyContent: 'center',
  },
  photoOptionSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  photoOptionText: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: 2,
  },
  photoOptionTextSelected: {
    color: theme.colors.text,
  },
  photoOptionPrice: {
    fontSize: theme.fontSize.xs,
    fontWeight: '500' as const,
    color: theme.colors.textTertiary,
  },
  photoOptionPriceSelected: {
    color: theme.colors.text,
  },
  photoOptionFree: {
    fontSize: theme.fontSize.xs,
    fontWeight: '500' as const,
    color: theme.colors.success,
  },
  photoOptionFreeSelected: {
    color: theme.colors.text,
  },
  filterOptions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  filterOption: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  filterOptionSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterOptionText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '500' as const,
    color: theme.colors.text,
  },
  filterOptionTextSelected: {
    color: theme.colors.text,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleInfo: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  toggleTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '500' as const,
    color: theme.colors.text,
    marginBottom: 2,
  },
  toggleDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  revealOptionsContainer: {
    gap: theme.spacing.sm,
  },
  revealOption: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  revealOptionSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  durationOptionsContainer: {
    gap: theme.spacing.sm,
  },
  durationOption: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  durationOptionSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  durationOptionHeader: {
    marginBottom: theme.spacing.xs,
  },
  durationOptionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  durationOptionTitleSelected: {
    color: theme.colors.text,
  },
  durationOptionDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  durationOptionDescriptionSelected: {
    color: theme.colors.text,
    opacity: 0.9,
  },
  durationPreview: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: '500' as const,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  revealOptionHeader: {
    marginBottom: theme.spacing.xs,
  },
  revealOptionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  revealOptionTitleSelected: {
    color: theme.colors.text,
  },
  revealOptionDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  revealOptionDescriptionSelected: {
    color: theme.colors.text,
    opacity: 0.9,
  },
  customTimeContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  customTimeLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  customTimeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  customTimeText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    fontWeight: '500' as const,
  },
  quickTimeOptions: {
    gap: theme.spacing.sm,
  },
  quickTimeLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: '500' as const,
  },
  quickTimeButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  quickTimeButton: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  quickTimeButtonText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    fontWeight: '500' as const,
  },
  pricingInfo: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  pricingText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600' as const,
    color: theme.colors.text,
    textAlign: 'center',
  },
  pricingSubtext: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.text,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
    opacity: 0.8,
  },
  summary: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  summaryTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  summaryLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  summaryValue: {
    fontSize: theme.fontSize.md,
    fontWeight: '500' as const,
    color: theme.colors.text,
  },
  summaryValueSmall: {
    fontSize: theme.fontSize.xs,
    fontWeight: '500' as const,
    color: theme.colors.text,
    fontFamily: 'monospace',
    flex: 1,
    textAlign: 'right',
  },
  createButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    marginTop: theme.spacing.xl,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700' as const,
    color: theme.colors.text,
  },
  disclaimer: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginTop: theme.spacing.md,
    fontStyle: 'italic',
  },

});