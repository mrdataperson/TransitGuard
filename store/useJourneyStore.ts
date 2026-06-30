import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocationService } from '../services/LocationService';
import { NotificationService } from '../services/NotificationService';
import { LiveLocationService } from '../services/LiveLocationService';
import * as TaskManager from 'expo-task-manager';
import { LOCATION_TRACKING_TASK } from '../services/LocationService';

interface Journey {
  id?: string;
  supabaseId?: string;
  shareId?: string;
  destinationName: string;
  destinationCoords: { latitude: number; longitude: number };
  alertDistance: number; // in meters
  isActive: boolean;
  alertTriggered: boolean;
}

interface JourneyState {
  currentJourney: Journey | null;
  currentLocation: { latitude: number; longitude: number } | null;
  startJourney: (destination: string, coords: { latitude: number; longitude: number }, alertDistance?: number) => Promise<void>;
  stopJourney: () => Promise<void>;
  setCurrentLocation: (coords: { latitude: number; longitude: number }) => void;
}

export const useJourneyStore = create<JourneyState>()(
  persist(
    (set, get) => ({
      currentJourney: null,
      currentLocation: null,
      startJourney: async (destination, coords, alertDistance = 500) => {
        const hasPermission = await LocationService.requestPermissions();
        if (!hasPermission) throw new Error('Location permission not granted');

        let supabaseJourney = null;
        try {
          supabaseJourney = await LiveLocationService.createJourney(
            destination,
            coords.latitude,
            coords.longitude
          );
        } catch (e) {
          console.error('Failed to create supabase journey:', e);
        }

        await LocationService.startTracking();
        set({
          currentJourney: {
            supabaseId: supabaseJourney?.id,
            shareId: supabaseJourney?.share_id,
            destinationName: destination,
            destinationCoords: coords,
            alertDistance,
            isActive: true,
            alertTriggered: false,
          },
        });
      },
      stopJourney: async () => {
        const { currentJourney } = get();
        if (currentJourney?.supabaseId) {
          await LiveLocationService.completeJourney(currentJourney.supabaseId);
        }
        await LocationService.stopTracking();
        set({ currentJourney: null });
      },
      setCurrentLocation: (coords) => {
        set({ currentLocation: coords });
        const { currentJourney } = get();
        if (currentJourney?.isActive) {
          if (currentJourney.supabaseId) {
            LiveLocationService.updateLocation(
              currentJourney.supabaseId,
              coords.latitude,
              coords.longitude
            );
          }

          const distance = LocationService.calculateDistance(
            coords.latitude,
            coords.longitude,
            currentJourney.destinationCoords.latitude,
            currentJourney.destinationCoords.longitude
          );

          if (distance <= currentJourney.alertDistance && !currentJourney.alertTriggered) {
            NotificationService.sendLocalNotification(
              'Arriving Soon!',
              `You are within ${currentJourney.alertDistance}m of ${currentJourney.destinationName}.`
            );
            set((state) => ({
              currentJourney: state.currentJourney ? { ...state.currentJourney, alertTriggered: true } : null,
            }));
          }
        }
      },
    }),
    {
      name: 'journey-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ currentJourney: state.currentJourney }),
    }
  )
);

TaskManager.defineTask(LOCATION_TRACKING_TASK, async ({ data, error }: any) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }
  if (data) {
    const { locations } = data;
    if (locations && locations.length > 0) {
      const location = locations[0];
      useJourneyStore.getState().setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    }
  }
});
