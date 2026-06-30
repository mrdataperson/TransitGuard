import { Linking } from 'react-native';
import { supabase } from './supabaseClient';

export interface EmergencyContact {
  id?: string;
  user_id?: string;
  name: string;
  relationship: string;
  phone_number: string;
}

export class EmergencyService {
  static async getContacts() {
    const { data, error } = await supabase
      .from('emergency_contacts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async addContact(contact: EmergencyContact) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('emergency_contacts')
      .insert([{ ...contact, user_id: userData.user.id }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateContact(id: string, contact: Partial<EmergencyContact>) {
    const { data, error } = await supabase
      .from('emergency_contacts')
      .update(contact)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteContact(id: string) {
    const { error } = await supabase
      .from('emergency_contacts')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  static callNumber(phone: string) {
    Linking.openURL(`tel:${phone}`);
  }

  static callEmergencyServices() {
    Linking.openURL('tel:911');
  }
}
