import { supabase, supabaseAdmin } from './supabase.service';
import { Recharge } from '../types';
import { settingsService } from './settings.service';

export class RechargeService {
  async createRecharge(data: {
    user_id: string;
    bet_id: string;
    amount: number;
  }): Promise<Recharge | null> {
    const amountTransferred = await settingsService.calculateTransferAmount(
      data.amount
    );

    const { data: recharge, error } = await supabase
      .from('recharges')
      .insert({
        user_id: data.user_id,
        bet_id: data.bet_id,
        amount: data.amount,
        amount_transferred: amountTransferred,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating recharge:', error);
      return null;
    }
    return recharge;
  }

  async uploadReceipt(
    rechargeId: string,
    fileBuffer: Buffer,
    fileName: string
  ): Promise<string | null> {
    const filePath = `${rechargeId}/${Date.now()}_${fileName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(process.env.STORAGE_BUCKET!)
      .upload(filePath, fileBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading receipt:', uploadError);
      return null;
    }

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage
      .from(process.env.STORAGE_BUCKET!)
      .getPublicUrl(filePath);

    await supabase
      .from('recharges')
      .update({ receipt_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', rechargeId);

    return publicUrl;
  }

  async getUserRecharges(userId: string): Promise<Recharge[]> {
    const { data } = await supabase
      .from('recharges')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    return data || [];
  }

  async getLastRecharge(userId: string): Promise<Recharge | null> {
    const { data } = await supabase
      .from('recharges')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return data;
  }

  async getPendingRecharges(): Promise<Recharge[]> {
    const { data } = await supabase
      .from('recharges')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    return data || [];
  }

  async updateStatus(
    rechargeId: string,
    status: 'approved' | 'rejected'
  ): Promise<boolean> {
    const { error } = await supabase
      .from('recharges')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', rechargeId);

    return !error;
  }

  async getRechargeById(rechargeId: string): Promise<Recharge | null> {
    const { data } = await supabase
      .from('recharges')
      .select('*')
      .eq('id', rechargeId)
      .single();

    return data;
  }

  async getRechargesByStatus(status: 'pending' | 'approved' | 'rejected'): Promise<Recharge[]> {
    const { data } = await supabase
      .from('recharges')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    return data || [];
  }
}

export const rechargeService = new RechargeService();
