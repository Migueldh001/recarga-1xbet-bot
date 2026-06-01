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
    // Verificar si ya existe
    const { data: existing, error: selectError } = await supabase
      .from('settings')
      .select('*')
      .eq('key', key)
      .maybeSingle();

    console.log(`Setting ${key}: existing =`, existing, 'error =', selectError);

    if (existing) {
      // Actualizar registro existente
      const { error } = await supabase
        .from('settings')
        .update({ value })
        .eq('key', key);
      
      if (error) {
        console.error(`Error updating ${key}:`, error);
        return false;
      }
      console.log(`✅ Updated ${key} = ${value}`);
    } else {
      // Insertar nuevo registro
      const { error } = await supabase
        .from('settings')
        .insert({ key, value });
      
      if (error) {
        console.error(`Error inserting ${key}:`, error);
        return false;
      }
      console.log(`✅ Inserted ${key} = ${value}`);
    }
    
    return true;
  } catch (error) {
    console.error(`Exception in setSetting(${key}):`, error);
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
