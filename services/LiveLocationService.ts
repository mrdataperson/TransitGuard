import { supabase } from './supabaseClient';

export class LiveLocationService {
  static async createJourney(destinationName: string, latitude: number, longitude: number) {
    const { data: userData } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('journeys')
      .insert([
        {
          user_id: userData.user?.id,
          destination_name: destinationName,
          destination_latitude: latitude,
          destination_longitude: longitude,
          status: 'active',
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateLocation(journeyId: string, latitude: number, longitude: number) {
    const { error } = await supabase
      .from('shared_locations')
      .insert([
        {
          journey_id: journeyId,
          latitude,
          longitude,
        },
      ]);

    if (error) {
        console.error('Error updating live location:', error);
    }
  }

  static async completeJourney(journeyId: string) {
    const { error } = await supabase
      .from('journeys')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', journeyId);

    if (error) throw error;
  }

  static getShareUrl(shareId: string) {
    return `https://transitguard.app/track/${shareId}`;
  }
}
