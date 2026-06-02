import { supabase } from './supabase.service';
import { rechargeService } from './recharge.service';
import { userService } from './user.service';
import { Telegraf } from 'telegraf';

export class ReminderService {
  private bot: Telegraf;
  private intervalId?: NodeJS.Timeout;

  constructor(bot: Telegraf) {
    this.bot = bot;
  }

  // Iniciar sistema de recordatorios (revisar cada 1 hora)
  start(): void {
    console.log('📅 Sistema de recordatorios iniciado');
    
    // Ejecutar al inicio
    this.checkPendingRecharges();
    
    // Luego cada 1 hora
    this.intervalId = setInterval(() => {
      this.checkPendingRecharges();
    }, 60 * 60 * 1000); // 1 hora
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      console.log('📅 Sistema de recordatorios detenido');
    }
  }

  private async checkPendingRecharges(): Promise<void> {
    try {
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Obtener recargas pendientes de más de 24 horas
      const { data: oldPending } = await supabase
        .from('recharges')
        .select('*')
        .eq('status', 'pending')
        .lt('created_at', twentyFourHoursAgo.toISOString());

      if (!oldPending || oldPending.length === 0) {
        console.log('📅 No hay recargas pendientes antiguas');
        return;
      }

      console.log(`📅 ${oldPending.length} recargas pendientes >24h`);

      // Notificar a admins
      const admins = (await userService.getAllUsers()).filter(u => u.is_admin && u.telegram_id);

      for (const admin of admins) {
        try {
          let message = `⏰ *Recordatorio de Recargas Pendientes*\n\n`;
          message += `Hay ${oldPending.length} recarga(s) pendiente(s) de más de 24 horas:\n\n`;

          oldPending.slice(0, 5).forEach((r, i) => {
            const hours = Math.floor((now.getTime() - new Date(r.created_at).getTime()) / (1000 * 60 * 60));
            message += `${i + 1}. 🎰 ${r.bet_id} - $${r.amount} USD (${hours}h)\n`;
          });

          if (oldPending.length > 5) {
            message += `\n...y ${oldPending.length - 5} más`;
          }

          message += `\n\n💡 Revisa las solicitudes pendientes.`;

          await this.bot.telegram.sendMessage(admin.telegram_id!, message, {
            parse_mode: 'Markdown'
          });
        } catch (error) {
          console.error(`Error notificando admin ${admin.telegram_id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error en checkPendingRecharges:', error);
    }
  }

  // Recordatorio manual (llamado desde admin)
  async sendManualReminder(ctx: any): Promise<void> {
    await ctx.reply('⏰ Verificando recargas pendientes...');
    await this.checkPendingRecharges();
    await ctx.reply('✅ Recordatorios enviados si hay recargas pendientes >24h');
  }
                                                               }
