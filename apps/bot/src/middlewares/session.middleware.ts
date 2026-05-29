import { supabase } from '../services/supabase.service';
import { BotSession } from '../types';

export class SessionManager {
  async getSession(telegramId: number): Promise<BotSession> {
    const { data } = await supabase
      .from('bot_sessions')
      .select('*')
      .eq('telegram_id', telegramId)
      .single();

    if (!data) {
      const newSession: BotSession = {
        telegram_id: telegramId,
        session_data: {},
        updated_at: new Date().toISOString(),
      };
      await this.saveSession(newSession);
      return newSession;
    }

    return data;
  }

  async saveSession(session: BotSession): Promise<void> {
    await supabase
      .from('bot_sessions')
      .upsert({
        telegram_id: session.telegram_id,
        session_data: session.session_data,
        updated_at: new Date().toISOString(),
      });
  }

  async updateSession(telegramId: number, data: any): Promise<void> {
    const session = await this.getSession(telegramId);
    session.session_data = { ...session.session_data, ...data };
    await this.saveSession(session);
  }

  async clearSession(telegramId: number): Promise<void> {
    await supabase
      .from('bot_sessions')
      .update({ session_data: {}, updated_at: new Date().toISOString() })
      .eq('telegram_id', telegramId);
  }

  async getStep(telegramId: number): Promise<string | null> {
    const session = await this.getSession(telegramId);
    return session.session_data.step || null;
  }

  async setStep(telegramId: number, step: string): Promise<void> {
    await this.updateSession(telegramId, { step });
  }

  async getTempData(telegramId: number): Promise<any> {
    const session = await this.getSession(telegramId);
    return session.session_data.tempData || {};
  }

  async setTempData(telegramId: number, tempData: any): Promise<void> {
    await this.updateSession(telegramId, { tempData });
  }
}

export const sessionManager = new SessionManager();
