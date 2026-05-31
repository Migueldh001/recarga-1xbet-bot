import { Context } from 'telegraf';
import { settingsService } from '../services/settings.service';
import { userService } from '../services/user.service';
import { sessionManager } from '../middlewares/session.middleware';
import { mainMenuKeyboard, settingsMenuKeyboard, backKeyboard } from '../keyboards/user.keyboard';
import { supabase } from '../services/supabase.service';
import * as bcrypt from 'bcrypt';

export class MenuHandler {
  async showContactSupport(ctx: Context): Promise<void> {
    const contacts = await settingsService.getContactInfo();

    let message = `📞 *Contactar Soporte*\n\n`;

    if (contacts.telegram) {
      message += `📱 Telegram: ${contacts.telegram}\n`;
    }
    if (contacts.whatsapp) {
      message += `💬 WhatsApp: ${contacts.whatsapp}\n`;
    }
    if (contacts.phone) {
      message += `☎️ Teléfono: ${contacts.phone}\n`;
    }

    if (!contacts.telegram && !contacts.whatsapp && !contacts.phone) {
      message += `_No hay información de contacto configurada._`;
    }

    await ctx.reply(message, { parse_mode: 'Markdown', ...mainMenuKeyboard() });
  }

  async showSettings(ctx: Context): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const user = await userService.findByTelegramId(telegramId);
    if (!user) return;

    const message = 
      `⚙️ *Mi Perfil*\n\n` +
      `🎰 ID 1xBet: \`${user.bet_id}\`\n` +
      `📱 Teléfono: ${user.phone}\n` +
      `📅 Registrado: ${new Date(user.created_at).toLocaleDateString('es-ES')}\n\n` +
      `¿Qué deseas cambiar?`;

    await ctx.reply(message, { parse_mode: 'Markdown', ...settingsMenuKeyboard() });
  }

  async startChangeBetId(ctx: Context): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    await ctx.reply(
      `🎰 *Cambiar ID de 1xBet*\n\n` +
      `Ingresa tu nuevo ID de 1xBet:`,
      { parse_mode: 'Markdown', ...backKeyboard() }
    );

    await sessionManager.setStep(telegramId, 'SETTINGS_CHANGE_BET_ID');
  }

  async handleChangeBetId(ctx: Context, newBetId: string): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    if (newBetId === '🔙 Volver al Menú') {
      await this.showSettings(ctx);
      await sessionManager.clearSession(telegramId);
      return;
    }

    const existingUser = await userService.findByBetId(newBetId);
    if (existingUser) {
      await ctx.reply(
        `⚠️ Este ID de 1xBet ya está siendo usado por otra cuenta.\n\n` +
        `Si es tuyo, contacta con soporte.`
      );
      return;
    }

    const user = await userService.findByTelegramId(telegramId);
    if (!user) return;

    const { error } = await supabase
      .from('users')
      .update({ bet_id: newBetId, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (error) {
      await ctx.reply('❌ Error al actualizar el ID. Intenta nuevamente.');
      return;
    }

    await ctx.reply(
      `✅ *ID de 1xBet actualizado*\n\n` +
      `Nuevo ID: \`${newBetId}\``,
      { parse_mode: 'Markdown', ...mainMenuKeyboard() }
    );

    await sessionManager.clearSession(telegramId);
  }

  async startChangePassword(ctx: Context): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    await ctx.reply(
      `🔐 *Cambiar Contraseña*\n\n` +
      `Ingresa tu nueva contraseña (mínimo 6 caracteres):`,
      { parse_mode: 'Markdown', ...backKeyboard() }
    );

    await sessionManager.setStep(telegramId, 'SETTINGS_CHANGE_PASSWORD');
  }

  async handleChangePassword(ctx: Context, newPassword: string): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    if (newPassword === '🔙 Volver al Menú') {
      await this.showSettings(ctx);
      await sessionManager.clearSession(telegramId);
      return;
    }

    if (newPassword.length < 6) {
      await ctx.reply('⚠️ La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    const user = await userService.findByTelegramId(telegramId);
    if (!user) return;

    const passwordHash = await bcrypt.hash(newPassword, 10);

    const { error } = await supabase
      .from('users')
      .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (error) {
      await ctx.reply('❌ Error al actualizar la contraseña. Intenta nuevamente.');
      return;
    }

    await ctx.reply(
      `✅ *Contraseña actualizada*\n\n` +
      `Tu contraseña ha sido cambiada exitosamente.`,
      { parse_mode: 'Markdown', ...mainMenuKeyboard() }
    );

    await sessionManager.clearSession(telegramId);
  }
}

export const menuHandler = new MenuHandler();
