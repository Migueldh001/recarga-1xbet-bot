import { Context } from 'telegraf';
import { userService } from '../services/user.service';
import { sessionManager } from '../middlewares/session.middleware';
import { mainMenuKeyboard } from '../keyboards/user.keyboard';
import { notificationService } from '../services/notification.service';

export class AuthHandler {
  private notificationService: any;

  setNotificationService(service: any): void {
    this.notificationService = service;
  }

  // REGISTRO
  async handleRegisterBetId(ctx: Context, betId: string): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const existingUser = await userService.findByBetId(betId);
    if (existingUser) {
      await ctx.reply(
        `⚠️ Este ID de 1xBet ya está registrado.\n\n` +
        `Si olvidaste tu contraseña, contacta con soporte.`
      );
      await sessionManager.clearSession(telegramId);
      return;
    }

    await sessionManager.setTempData(telegramId, { bet_id: betId });
    await ctx.reply(`📱 Ahora envía tu *número de teléfono*`, {
      parse_mode: 'Markdown',
    });
    await sessionManager.setStep(telegramId, 'REGISTER_AWAITING_PHONE');
  }

  async handleRegisterPhone(ctx: Context, phone: string): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const tempData = await sessionManager.getTempData(telegramId);
    tempData.phone = phone;
    await sessionManager.setTempData(telegramId, tempData);

    await ctx.reply(`🔐 Crea una *contraseña* para tu cuenta`, {
      parse_mode: 'Markdown',
    });
    await sessionManager.setStep(telegramId, 'REGISTER_AWAITING_PASSWORD');
  }

  async handleRegisterPassword(ctx: Context, password: string): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    if (password.length < 6) {
      await ctx.reply(`⚠️ La contraseña debe tener al menos 6 caracteres.`);
      return;
    }

    const tempData = await sessionManager.getTempData(telegramId);
    
    const user = await userService.createUser({
      bet_id: tempData.bet_id,
      phone: tempData.phone,
      password: password,
      telegram_id: telegramId,
    });

    if (!user) {
      await ctx.reply(`❌ Error al crear la cuenta. Intenta nuevamente.`);
      await sessionManager.clearSession(telegramId);
      return;
    }

    await ctx.reply(
      `✅ *¡Registro exitoso!*\n\n` +
      `Ya puedes usar el bot para hacer recargas.`,
      { parse_mode: 'Markdown', ...mainMenuKeyboard() }
    );

    if (this.notificationService) {
      await this.notificationService.notifyNewUser(tempData.bet_id);
    }

    await sessionManager.clearSession(telegramId);
  }

  // LOGIN
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

    await sessionManager.setTempData(telegramId, { bet_id: betId });
    await ctx.reply(`🔐 Envía tu *contraseña*`, { parse_mode: 'Markdown' });
    await sessionManager.setStep(telegramId, 'LOGIN_AWAITING_PASSWORD');
  }

  async handleLoginPassword(ctx: Context, password: string): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const tempData = await sessionManager.getTempData(telegramId);
    const isValid = await userService.verifyPassword(tempData.bet_id, password);

    if (!isValid) {
      await ctx.reply(
        `❌ Contraseña incorrecta.\n\n` +
        `Intenta nuevamente o contacta con soporte.`
      );
      await sessionManager.clearSession(telegramId);
      return;
    }

    const linked = await userService.linkTelegramId(tempData.bet_id, telegramId);
    
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
