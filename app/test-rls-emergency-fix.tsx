import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { generateUUID, generatePhotoId } from '@/lib/uuid';

export default function TestRLSEmergencyFix() {
  const [results, setResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (message: string) => {
    console.log(message);
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testRLSFix = async () => {
    setIsLoading(true);
    setResults([]);
    
    try {
      addResult('🔧 Testing RLS Emergency Fix...');
      
      // Test 1: Check RLS status
      addResult('📊 Checking RLS status...');
      const { data: rlsStatus, error: rlsError } = await supabase.rpc('sql', {
        query: `
          SELECT 
            tablename,
            CASE 
              WHEN rowsecurity THEN 'ENABLED (BAD)' 
              ELSE 'DISABLED (GOOD)' 
            END as rls_status
          FROM pg_tables 
          WHERE tablename IN ('photos', 'cameras')
          ORDER BY tablename;
        `
      });
      
      if (rlsError) {
        addResult(`❌ RLS status check failed: ${rlsError.message}`);
      } else {
        addResult(`✅ RLS Status: ${JSON.stringify(rlsStatus)}`);
      }
      
      // Test 2: Try to create a test camera
      addResult('📷 Testing camera creation...');
      const testCameraId = generateUUID();
      const cameraData = {
        id: testCameraId,
        name: 'RLS Test Camera',
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        revealDelayType: 'immediate',
        customRevealAt: null,
        createdAt: new Date().toISOString(),
        createdBy: null,
        maxPhotosPerPerson: 20,
      };
      
      const { data: cameraResult, error: cameraError } = await supabase
        .from('cameras')
        .insert([cameraData])
        .select();
      
      if (cameraError) {
        addResult(`❌ Camera creation failed: ${cameraError.message}`);
        addResult(`🔍 Error details: ${JSON.stringify(cameraError)}`);
      } else {
        addResult(`✅ Camera created successfully: ${cameraResult[0]?.name}`);
        
        // Test 3: Try to create a test photo
        addResult('📸 Testing photo creation...');
        const photoData = {
          id: generatePhotoId(),
          cameraId: testCameraId,
          fileName: 'test-photo.jpg',
          publicUrl: 'https://example.com/test.jpg',
          userId: 'test-user',
          userName: 'Test User',
          uploadedAt: new Date().toISOString(),
          mimeType: 'image/jpeg',
          fileSize: 1024,
        };
        
        const { data: photoResult, error: photoError } = await supabase
          .from('photos')
          .insert([photoData])
          .select();
        
        if (photoError) {
          addResult(`❌ Photo creation failed: ${photoError.message}`);
          addResult(`🔍 Error details: ${JSON.stringify(photoError)}`);
        } else {
          addResult(`✅ Photo created successfully: ${photoResult[0]?.fileName}`);
          
          // Clean up test data
          addResult('🧹 Cleaning up test data...');
          await supabase.from('photos').delete().eq('id', photoData.id);
          await supabase.from('cameras').delete().eq('id', testCameraId);
          addResult('✅ Test data cleaned up');
        }
      }
      
      // Test 4: Check permissions
      addResult('🔐 Checking table permissions...');
      const { data: permissions, error: permError } = await supabase.rpc('sql', {
        query: `
          SELECT 
            grantee, 
            table_name, 
            privilege_type 
          FROM information_schema.table_privileges 
          WHERE table_name IN ('photos', 'cameras') 
            AND grantee IN ('anon', 'authenticated', 'service_role')
          ORDER BY grantee, table_name;
        `
      });
      
      if (permError) {
        addResult(`❌ Permission check failed: ${permError.message}`);
      } else {
        addResult(`✅ Permissions: ${JSON.stringify(permissions)}`);
      }
      
      addResult('🎉 RLS Emergency Fix test completed!');
      
    } catch (error) {
      addResult(`💥 Test failed with error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <ScrollView style={{ flex: 1, padding: 20, backgroundColor: '#f5f5f5' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' }}>
        🚨 RLS Emergency Fix Test
      </Text>
      
      <Text style={{ fontSize: 16, marginBottom: 20, textAlign: 'center', color: '#666' }}>
        This will test if the RLS emergency fix worked
      </Text>
      
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
        <TouchableOpacity
          onPress={testRLSFix}
          disabled={isLoading}
          style={{
            flex: 1,
            backgroundColor: isLoading ? '#ccc' : '#007AFF',
            padding: 15,
            borderRadius: 8,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>
            {isLoading ? '🔄 Testing...' : '🧪 Run RLS Test'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={clearResults}
          style={{
            backgroundColor: '#FF3B30',
            padding: 15,
            borderRadius: 8,
            alignItems: 'center',
            minWidth: 100,
          }}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>🗑️ Clear</Text>
        </TouchableOpacity>
      </View>
      
      <View style={{ backgroundColor: 'white', borderRadius: 8, padding: 15 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
          📋 Test Results:
        </Text>
        
        {results.length === 0 ? (
          <Text style={{ color: '#666', fontStyle: 'italic' }}>
            No results yet. Run the test to see results.
          </Text>
        ) : (
          results.map((result, index) => (
            <Text
              key={index}
              style={{
                fontSize: 14,
                marginBottom: 5,
                fontFamily: 'monospace',
                color: result.includes('❌') ? '#FF3B30' : 
                       result.includes('✅') ? '#34C759' : 
                       result.includes('🔍') ? '#FF9500' : '#333',
              }}
            >
              {result}
            </Text>
          ))
        )}
      </View>
      
      <View style={{ marginTop: 30, padding: 15, backgroundColor: '#fff3cd', borderRadius: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#856404', marginBottom: 10 }}>
          📝 Instructions:
        </Text>
        <Text style={{ color: '#856404', lineHeight: 20 }}>
          1. Copy the SUPABASE_EMERGENCY_RLS_FIX.sql script{'\n'}
          2. Go to your Supabase dashboard → SQL Editor{'\n'}
          3. Paste the entire script and run it{'\n'}
          4. Come back here and run this test{'\n'}
          5. All tests should pass with ✅ green checkmarks
        </Text>
      </View>
    </ScrollView>
  );
}