import { Context } from 'telegraf';
import { userService } from '../services/user.service';
import { sessionManager } from '../middlewares/session.middleware';
import { mainMenuKeyboard } from '../keyboards/user.keyboard';
import { adminMenuKeyboard } from '../keyboards/admin.keyboard';
import { rechargeService } from '../services/recharge.service';
import { yesNoKeyboard } from '../keyboards/user.keyboard';

export class StartHandler {
  async handle(ctx: Context): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    await sessionManager.clearSession(telegramId);

    const user = await userService.findByTelegramId(telegramId);

    if (user) {
      const isAdmin = await userService.isAdmin(telegramId);
      
      if (isAdmin) {
        const pendingCount = (await rechargeService.getPendingRecharges()).length;
        await ctx.reply(
          `👋 ¡Hola Admin!\n\n¿Qué deseas hacer?`,
          adminMenuKeyboard(pendingCount)
        );
      } else {
        await ctx.reply(
          `👋 ¡Bienvenido de nuevo!\n\n¿Qué deseas hacer?`,
          mainMenuKeyboard()
        );
      }
    } else {
      await ctx.reply(
        `👋 ¡Bienvenido a *Recarga 1xBet*!\n\n` +
        `¿Tienes cuenta en 1xBet?`,
        { parse_mode: 'Markdown', ...yesNoKeyboard() }
      );
      await sessionManager.setStep(telegramId, 'AWAITING_HAS_1XBET');
    }
  }

  async handleHas1xBet(ctx: Context, answer: string): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    if (answer.toLowerCase() === 'no') {
      await ctx.reply(
        `📱 *Primero necesitas una cuenta en 1xBet*\n\n` +
        `Puedes registrarte aquí:\n` +
        `🌐 Web: https://1xbet.com\n` +
        `📲 App: Descarga desde su sitio oficial\n\n` +
        `Cuando tengas tu cuenta, vuelve y escribe /start`,
        { parse_mode: 'Markdown' }
      );
      await sessionManager.clearSession(telegramId);
      return;
    }

    await ctx.reply(
      `¿Ya estás registrado en nuestra plataforma de Recarga?`,
      yesNoKeyboard()
    );
    await sessionManager.setStep(telegramId, 'AWAITING_HAS_ACCOUNT');
  }

  async handleHasAccount(ctx: Context, answer: string): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    if (answer.toLowerCase() === 'no') {
      await ctx.reply(
        `📝 *Proceso de Registro*\n\n` +
        `Por favor, envía tu *ID de 1xBet*`,
        { parse_mode: 'Markdown' }
      );
      await sessionManager.setStep(telegramId, 'REGISTER_AWAITING_BET_ID');
    } else {
      await ctx.reply(
        `🔐 *Iniciar Sesión*\n\n` +
        `Por favor, envía tu *ID de 1xBet*`,
        { parse_mode: 'Markdown' }
      );
      await sessionManager.setStep(telegramId, 'LOGIN_AWAITING_BET_ID');
    }
  }
}

export const startHandler = new StartHandler();
