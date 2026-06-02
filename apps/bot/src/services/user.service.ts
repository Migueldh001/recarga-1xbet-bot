import { supabase } from './supabase.service';
import { User } from '../types';
import * as bcrypt from 'bcrypt';

export class UserService {
  async findByTelegramId(telegramId: number): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', telegramId)
      .single();

    if (error) return null;
    return data;
  }

  async findByBetId(betId: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('bet_id', betId)
      .single();

    if (error) return null;
    return data;
  }

  async createUser(userData: {
    bet_id: string;
    phone: string;
    password: string;
    telegram_id?: number;
  }): Promise<User | null> {
    const passwordHash = await bcrypt.hash(userData.password, 10);

    const { data, error } = await supabase
      .from('users')
      .insert({
        bet_id: userData.bet_id,
        phone: userData.phone,
        password_hash: passwordHash,
        telegram_id: userData.telegram_id,
        is_admin: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      return null;
    }
    return data;
  }
    async createUserSimple(userData: {
    bet_id: string;
    telegram_id: number;
  }): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .insert({
        bet_id: userData.bet_id,
        phone: 'N/A', // Por defecto
        telegram_id: userData.telegram_id,
        is_admin: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      return null;
    }
    return data;
    }

  async linkTelegramId(betId: string, telegramId: number): Promise<boolean> {
    const { error } = await supabase
      .from('users')
      .update({ telegram_id: telegramId, updated_at: new Date().toISOString() })
      .eq('bet_id', betId);

    return !error;
  }

  async verifyPassword(betId: string, password: string): Promise<boolean> {
    const { data } = await supabase
      .from('users')
      .select('password_hash')
      .eq('bet_id', betId)
      .single();

    if (!data?.password_hash) return false;
    return await bcrypt.compare(password, data.password_hash);
  }

  async isAdmin(telegramId: number): Promise<boolean> {
    if (telegramId.toString() === process.env.INITIAL_ADMIN_TELEGRAM_ID) {
      return true;
    }

    const user = await this.findByTelegramId(telegramId);
    return user?.is_admin || false;
  }

  async getAllUsers(): Promise<User[]> {
    const { data } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    return data || [];
  }

  async setAdmin(userId: string, isAdmin: boolean): Promise<boolean> {
    const { error } = await supabase
      .from('users')
      .update({ is_admin: isAdmin, updated_at: new Date().toISOString() })
      .eq('id', userId);

    return !error;
  }
}

export const userService = new UserService();
