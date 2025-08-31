import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface GuestSession {
  cameraId: string;
  guestName: string;
  email?: string;
  joinedAt: Date;
  isActive: boolean;
}

interface GuestStore {
  currentSession: GuestSession | null;
  sessions: GuestSession[];
  
  // Actions
  createSession: (cameraId: string, guestName: string, email?: string) => Promise<void>;
  getSession: (cameraId: string) => GuestSession | null;
  clearSession: () => void;
  loadSessions: () => Promise<void>;
  saveSessions: () => Promise<void>;
}

const STORAGE_KEY = 'znap-guest-sessions';

export const useGuestStore = create<GuestStore>((set, get) => {
  const saveSessionsAsync = async () => {
    try {
      const { sessions } = get();
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (error) {
      console.error('Failed to save guest sessions:', error);
    }
  };

  const loadSessionsAsync = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const sessions = JSON.parse(stored).map((session: any) => ({
          ...session,
          joinedAt: new Date(session.joinedAt),
        }));
        
        // Set the most recent active session as current
        const activeSession = sessions.find((session: GuestSession) => session.isActive);
        
        set({ 
          sessions,
          currentSession: activeSession || null
        });
      }
    } catch (error) {
      console.error('Failed to load guest sessions:', error);
    }
  };

  return {
    currentSession: null,
    sessions: [],

    createSession: async (cameraId: string, guestName: string, email?: string) => {
      const newSession: GuestSession = {
        cameraId,
        guestName,
        email,
        joinedAt: new Date(),
        isActive: true,
      };

      set((state) => ({
        currentSession: newSession,
        sessions: [
          ...state.sessions.filter(s => s.cameraId !== cameraId), // Remove existing session for this camera
          newSession,
        ],
      }));

      await saveSessionsAsync();
    },



    getSession: (cameraId: string) => {
      const { sessions } = get();
      return sessions.find(session => session.cameraId === cameraId && session.isActive) || null;
    },

    clearSession: () => {
      set({ currentSession: null });
    },

    loadSessions: loadSessionsAsync,
    saveSessions: saveSessionsAsync,
  };
});