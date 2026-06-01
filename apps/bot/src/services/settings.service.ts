import { supabase } from './supabase.service';
import { Setting } from '../types';

export class SettingsService {
  async getSetting(key: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', key)
      .single();

    if (error) return null;
    return data?.value || null;
  }

  async setSetting(key: string, value: string): Promise<boolean> {
    try {
      // Primero verificar si existe
      const { data: existing } = await supabase
        .from('settings')
        .select('id')
        .eq('key', key)
        .single();

      if (existing) {
        // Si existe, actualizar
        const { error } = await supabase
          .from('settings')
          .update({ value, updated_at: new Date().toISOString() })
          .eq('key', key);
        
        if (error) {
          console.error('Error updating setting:', error);
          return false;
        }
      } else {
        // Si no existe, insertar
        const { error } = await supabase
          .from('settings')
          .insert({ key, value, updated_at: new Date().toISOString() });
        
        if (error) {
          console.error('Error inserting setting:', error);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error in setSetting:', error);
      return false;
    }
  }

  async getExchangeRate(): Promise<number> {
    const rate = await this.getSetting('exchange_rate');
    return parseFloat(rate || '550');
  }

  async getCommission(): Promise<number> {
    const commission = await this.getSetting('commission');
    return parseFloat(commission || '15');
  }

  async getMinRecharge(): Promise<number> {
    const min = await this.getSetting('min_recharge');
    return parseFloat(min || '5');
  }

  async getMaxRecharge(): Promise<number> {
    const max = await this.getSetting('max_recharge');
    return parseFloat(max || '100');
  }

  async getBankAccount(): Promise<string> {
    return (await this.getSetting('bank_account')) || 'No configurado';
  }

  async getConfirmationPhone(): Promise<string> {
    return (await this.getSetting('confirmation_phone')) || 'No configurado';
  }

  async getContactInfo(): Promise<{
    telegram?: string;
    whatsapp?: string;
    phone?: string;
  }> {
    const telegram = await this.getSetting('contact_telegram');
    const whatsapp = await this.getSetting('contact_whatsapp');
    const phone = await this.getSetting('contact_phone');

    return { 
      telegram: telegram || undefined, 
      whatsapp: whatsapp || undefined, 
      phone: phone || undefined 
    };
  }

  async calculateTransferAmount(amountUSD: number): Promise<number> {
    const rate = await this.getExchangeRate();
    const commission = await this.getCommission();
    
    return Math.round(amountUSD * rate * (1 + commission / 100));
  }
}

export const settingsService = new SettingsService();
