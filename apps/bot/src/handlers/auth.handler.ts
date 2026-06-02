import { Context } from 'telegraf';
import { userService } from '../services/user.service';
import { sessionManager } from '../middlewares/session.middleware';
import { mainMenuKeyboard } from '../keyboards/user.keyboard';

export class AuthHandler {
  private notificationService: any;

  setNotificationService(service: any): void {
    this.notificationService = service;
  }

  // REGISTRO SIMPLIFICADO - SOLO ID 1xBet
  async handleRegisterBetId(ctx: Context, betId: string): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const existingUser = await userService.findByBetId(betId);
    if (existingUser) {
      await ctx.reply(
        `⚠️ Este ID de 1xBet ya está registrado.\n\n` +
        `Si es tuyo y quieres vincularlo, usa la opción de Iniciar Sesión.`
      );
      await sessionManager.clearSession(telegramId);
      return;
    }

    // Crear usuario directamente solo con ID 1xBet
    const user = await userService.createUserSimple({
      bet_id: betId,
      telegram_id: telegramId,
    });

    if (!user) {
      await ctx.reply(`❌ Error al crear la cuenta. Intenta nuevamente.`);
      await sessionManager.clearSession(telegramId);
      return;
    }

    await ctx.reply(
      `✅ *¡Registro exitoso!*\n\n` +
      `Tu ID de 1xBet: ${betId}\n\n` +
      `Ya puedes usar el bot para hacer recargas.`,
      { parse_mode: 'Markdown', ...mainMenuKeyboard() }
    );

    if (this.notificationService) {
      await this.notificationService.notifyNewUser(betId);
    }

    await sessionManager.clearSession(telegramId);
  }

  // LOGIN SIMPLIFICADO - SOLO ID 1xBet
  async handleLoginBetId(ctx: Context, betId: string): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const user = await userService.findByBetId(betId);
    if (!user) {
      await ctx.reply(
        `⚠️ No encontramos una cuenta con ese ID de 1xBet.\n\n` +
        `¿Quieres registrarte? Usa /start`
      );
      await sessionManager.clearSession(telegramId);
      return;
    }

    // Vincular Telegram ID directamente
    const linked = await userService.linkTelegramId(betId, telegramId);
    
    if (!linked) {
      await ctx.reply(`❌ Error al vincular la cuenta. Intenta nuevamente.`);
      await sessionManager.clearSession(telegramId);
      return;
    }

    await ctx.reply(
      `✅ *¡Sesión iniciada!*\n\n` +
      `Tu cuenta de Telegram ha sido vinculada correctamente.`,
      { parse_mode: 'Markdown', ...mainMenuKeyboard() }
    );

    await sessionManager.clearSession(telegramId);
  }
}

export const authHandler = new AuthHandler();
