import { Context } from 'telegraf';
import { userService } from '../services/user.service';
import { settingsService } from '../services/settings.service';
import { sessionManager } from '../middlewares/session.middleware';
import { Markup } from 'telegraf';

export class AdminContactHandler {
  
  async showContactMenu(ctx: Context): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const isAdmin = await userService.isAdmin(telegramId);
    if (!isAdmin) {
      await ctx.reply('❌ No tienes permisos de administrador.');
      return;
    }

    const contacts = await settingsService.getContactInfo();

    const message = 
      `📞 *Configurar Información de Contacto*\n\n` +
      `📱 Telegram: ${contacts.telegram || 'No configurado'}\n` +
      `💬 WhatsApp: ${contacts.whatsapp || 'No configurado'}\n` +
      `☎️ Teléfono: ${contacts.phone || 'No configurado'}\n\n` +
      `Selecciona qué deseas cambiar:`;

    const keyboard = Markup.keyboard([
      ['📱 Telegram', '💬 WhatsApp'],
      ['☎️ Teléfono'],
      ['🔙 Volver al Panel Admin'],
    ]).resize();

    await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });
  }

  async handleContactOption(ctx: Context, option: string): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const isAdmin = await userService.isAdmin(telegramId);
    if (!isAdmin) return;

    const backKeyboard = Markup.keyboard([['🔙 Cancelar']]).resize();

    switch (option) {
      case '📱 Telegram':
        await ctx.reply(
          `📱 *Cambiar Telegram de Soporte*\n\n` +
          `Ingresa el usuario de Telegram (ejemplo: @Migueldh001):`,
          { parse_mode: 'Markdown', ...backKeyboard }
        );
        await sessionManager.setStep(telegramId, 'ADMIN_CONTACT_TELEGRAM');
        break;

      case '💬 WhatsApp':
        await ctx.reply(
          `💬 *Cambiar WhatsApp de Soporte*\n\n` +
          `Ingresa el número de WhatsApp con código de país (ejemplo: +5353612074):`,
          { parse_mode: 'Markdown', ...backKeyboard }
        );
        await sessionManager.setStep(telegramId, 'ADMIN_CONTACT_WHATSAPP');
        break;

      case '☎️ Teléfono':
        await ctx.reply(
          `☎️ *Cambiar Teléfono de Soporte*\n\n` +
          `Ingresa el número de teléfono (ejemplo: +5353612074):`,
          { parse_mode: 'Markdown', ...backKeyboard }
        );
        await sessionManager.setStep(telegramId, 'ADMIN_CONTACT_PHONE');
        break;
    }
  }

  async handleTelegram(ctx: Context, value: string): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    if (value === '🔙 Cancelar') {
      await this.showContactMenu(ctx);
      await sessionManager.clearSession(telegramId);
      return;
    }

    // Validar formato @username
    if (!value.startsWith('@') || value.length < 4) {
      await ctx.reply('⚠️ Por favor ingresa un usuario válido de Telegram (ejemplo: @usuario).');
      return;
    }

    const success = await settingsService.setSetting('contact_telegram', value);
    
    if (success) {
      await ctx.reply(
        `✅ *Telegram de soporte actualizado*\n\n` +
        `Nuevo Telegram: ${value}`,
        { parse_mode: 'Markdown' }
      );
      await sessionManager.clearSession(telegramId);
      await this.showContactMenu(ctx);
    } else {
      await ctx.reply('❌ Error al actualizar. Intenta nuevamente.');
    }
  }

  async handleWhatsApp(ctx: Context, value: string): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    if (value === '🔙 Cancelar') {
      await this.showContactMenu(ctx);
      await sessionManager.clearSession(telegramId);
      return;
    }

    // Validar formato de teléfono
    if (!value.startsWith('+') || value.length < 10) {
      await ctx.reply('⚠️ Por favor ingresa un número válido con código de país (ejemplo: +5353612074).');
      return;
    }

    const success = await settingsService.setSetting('contact_whatsapp', value);
    
    if (success) {
      await ctx.reply(
        `✅ *WhatsApp de soporte actualizado*\n\n` +
        `Nuevo WhatsApp: ${value}`,
        { parse_mode: 'Markdown' }
      );
      await sessionManager.clearSession(telegramId);
      await this.showContactMenu(ctx);
    } else {
      await ctx.reply('❌ Error al actualizar. Intenta nuevamente.');
    }
  }

  async handlePhone(ctx: Context, value: string): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    if (value === '🔙 Cancelar') {
      await this.showContactMenu(ctx);
      await sessionManager.clearSession(telegramId);
      return;
    }

    // Validar formato de teléfono
    if (value.length < 8) {
      await ctx.reply('⚠️ Por favor ingresa un número de teléfono válido.');
      return;
    }

    const success = await settingsService.setSetting('contact_phone', value);
    
    if (success) {
      await ctx.reply(
        `✅ *Teléfono de soporte actualizado*\n\n` +
        `Nuevo teléfono: ${value}`,
        { parse_mode: 'Markdown' }
      );
      await sessionManager.clearSession(telegramId);
      await this.showContactMenu(ctx);
    } else {
      await ctx.reply('❌ Error al actualizar. Intenta nuevamente.');
    }
  }
}

export const adminContactHandler = new AdminContactHandler();
