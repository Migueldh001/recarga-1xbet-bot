import { Telegraf } from 'telegraf';
import { userService } from './user.service';

export class NotificationService {
  private bot: Telegraf;

  constructor(bot: Telegraf) {
    this.bot = bot;
  }

  async notifyAdmins(message: string, extra?: any): Promise<void> {
    const users = await userService.getAllUsers();
    const admins = users.filter((u) => u.is_admin && u.telegram_id);

    for (const admin of admins) {
      try {
        await this.bot.telegram.sendMessage(admin.telegram_id!, message, extra);
      } catch (error) {
        console.error(`Error notifying admin ${admin.telegram_id}:`, error);
      }
    }
  }

  async notifyUser(telegramId: number, message: string, extra?: any): Promise<void> {
    try {
      await this.bot.telegram.sendMessage(telegramId, message, extra);
    } catch (error) {
      console.error(`Error notifying user ${telegramId}:`, error);
    }
  }

  async notifyNewRecharge(rechargeId: string, userId: string, amount: number, betId: string): Promise<void> {
    const message = `🔔 *Nueva solicitud de recarga*\n\n` +
      `💰 Monto: $${amount.toFixed(2)} USD\n` +
      `🎰 ID 1xBet: ${betId}\n` +
      `📝 ID Recarga: ${rechargeId.substring(0, 8)}...\n\n` +
      `Revisa las solicitudes pendientes.`;

    await this.notifyAdmins(message, { parse_mode: 'Markdown' });
  }

  async notifyRechargeApproved(telegramId: number, amount: number): Promise<void> {
    const message = `✅ *Tu recarga fue APROBADA*\n\n` +
      `💰 Monto: $${amount.toFixed(2)} USD\n` +
      `¡Tu saldo debería estar disponible pronto!`;

    await this.notifyUser(telegramId, message, { parse_mode: 'Markdown' });
  }

  async notifyRechargeRejected(telegramId: number, amount: number): Promise<void> {
    const message = `❌ *Tu recarga fue RECHAZADA*\n\n` +
      `💰 Monto: $${amount.toFixed(2)} USD\n` +
      `Por favor contacta con soporte para más información.`;

    await this.notifyUser(telegramId, message, { parse_mode: 'Markdown' });
  }

  async notifyNewUser(betId: string): Promise<void> {
    const message = `👤 *Nuevo usuario registrado*\n\n` +
      `🎰 ID 1xBet: ${betId}`;

    await this.notifyAdmins(message, { parse_mode: 'Markdown' });
  }
}
