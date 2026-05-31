import { Context } from 'telegraf';
import { userService } from '../services/user.service';
import { settingsService } from '../services/settings.service';
import { sessionManager } from '../middlewares/session.middleware';
import { adminMenuKeyboard } from '../keyboards/admin.keyboard';
import { Markup } from 'telegraf';

export class AdminConfigHandler {
  
  async showConfigMenu(ctx: Context): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const isAdmin = await userService.isAdmin(telegramId);
    if (!isAdmin) {
      await ctx.reply('❌ No tienes permisos de administrador.');
      return;
    }

    const rate = await settingsService.getExchangeRate();
    const commission = await settingsService.getCommission();
    const minRecharge = await settingsService.getMinRecharge();
    const maxRecharge = await settingsService.getMaxRecharge();
    const bankAccount = await settingsService.getBankAccount();
    const confirmPhone = await settingsService.getConfirmationPhone();

    const message = 
      `💱 *Configuración de Tasa*\n\n` +
      `📊 Tasa actual: 1 USD = ${rate} CUP\n` +
      `📈 Comisión: ${commission}%\n` +
      `💰 Monto mínimo: $${minRecharge} USD\n` +
      `💰 Monto máximo: $${maxRecharge} USD\n` +
      `🏦 Cuenta bancaria: ${bankAccount}\n` +
      `📞 Teléfono confirmación: ${confirmPhone}\n\n` +
      `Selecciona qué deseas cambiar:`;

    const keyboard = Markup.keyboard([
      ['💱 Tasa de Cambio', '📊 Comisión'],
      ['💵 Monto Mínimo', '💵 Monto Máximo'],
      ['🏦 Cuenta Bancaria', '📞 Teléfono Confirmación'],
      ['🔙 Volver al Panel Admin'],
    ]).resize();

    await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });
  }

  async handleConfigOption(ctx: Context, option: string): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const isAdmin = await userService.isAdmin(telegramId);
    if (!isAdmin) return;

    const backKeyboard = Markup.keyboard([['🔙 Cancelar']]).resize();

    switch (option) {
      case '💱 Tasa de Cambio':
        await ctx.reply(
          `💱 *Cambiar Tasa de Cambio*\n\n` +
          `Ingresa la nueva tasa (ejemplo: 550 para 1 USD = 550 CUP):`,
          { parse_mode: 'Markdown', ...backKeyboard }
        );
        await sessionManager.setStep(telegramId, 'ADMIN_CONFIG_EXCHANGE_RATE');
        break;

      case '📊 Comisión':
        await ctx.reply(
          `📊 *Cambiar Comisión*\n\n` +
          `Ingresa el nuevo porcentaje de comisión (ejemplo: 15 para 15%):`,
          { parse_mode: 'Markdown', ...backKeyboard }
        );
        await sessionManager.setStep(telegramId, 'ADMIN_CONFIG_COMMISSION');
        break;

      case '💵 Monto Mínimo':
        await ctx.reply(
          `💵 *Cambiar Monto Mínimo*\n\n` +
          `Ingresa el nuevo monto mínimo en USD (ejemplo: 5):`,
          { parse_mode: 'Markdown', ...backKeyboard }
        );
        await sessionManager.setStep(telegramId, 'ADMIN_CONFIG_MIN_RECHARGE');
        break;

      case '💵 Monto Máximo':
        await ctx.reply(
          `💵 *Cambiar Monto Máximo*\n\n` +
          `Ingresa el nuevo monto máximo en USD (ejemplo: 100):`,
          { parse_mode: 'Markdown', ...backKeyboard }
        );
        await sessionManager.setStep(telegramId, 'ADMIN_CONFIG_MAX_RECHARGE');
        break;

      case '🏦 Cuenta Bancaria':
        await ctx.reply(
          `🏦 *Cambiar Cuenta Bancaria*\n\n` +
          `Ingresa el nuevo número de cuenta (16 dígitos):`,
          { parse_mode: 'Markdown', ...backKeyboard }
        );
        await sessionManager.setStep(telegramId, 'ADMIN_CONFIG_BANK_ACCOUNT');
        break;

      case '📞 Teléfono Confirmación':
        await ctx.reply(
          `📞 *Cambiar Teléfono de Confirmación*\n\n` +
          `Ingresa el nuevo número de teléfono (ejemplo: +5353612074):`,
          { parse_mode: 'Markdown', ...backKeyboard }
        );
        await sessionManager.setStep(telegramId, 'ADMIN_CONFIG_CONFIRM_PHONE');
        break;
    }
  }

  async handleExchangeRate(ctx: Context, value: string): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    if (value === '🔙 Cancelar') {
      await this.showConfigMenu(ctx);
      await sessionManager.clearSession(telegramId);
      return;
    }

    const rate = parseFloat(value);
    if (isNaN(rate) || rate <= 0) {
      await ctx.reply('⚠️ Por favor ingresa un número válido.');
      return;
    }

    const success = await settingsService.setSetting('exchange_rate', rate.toString());
    
    if (success) {
      await ctx.reply(
        `✅ *Tasa de cambio actualizada*\n\n` +
        `Nueva tasa: 1 USD = ${rate} CUP`,
        { parse_mode: 'Markdown' }
      );
      await sessionManager.clearSession(telegramId);
      await this.showConfigMenu(ctx);
    } else {
      await ctx.reply('❌ Error al actualizar. Intenta nuevamente.');
    }
  }

  async handleCommission(ctx: Context, value: string): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    if (value === '🔙 Cancelar') {
      await this.showConfigMenu(ctx);
      await sessionManager.clearSession(telegramId);
      return;
    }

    const commission = parseFloat(value);
    if (isNaN(commission) || commission < 0 || commission > 100) {
      await ctx.reply('⚠️ Por favor ingresa un porcentaje válido (0-100).');
      return;
    }

    const success = await settingsService.setSetting('commission', commission.toString());
    
    if (success) {
      await ctx.reply(
        `✅ *Comisión actualizada*\n\n` +
        `Nueva comisión: ${commission}%`,
        { parse_mode: 'Markdown' }
      );
      await sessionManager.clearSession(telegramId);
      await this.showConfigMenu(ctx);
    } else {
      await ctx.reply('❌ Error al actualizar. Intenta nuevamente.');
    }
  }

  async handleMinRecharge(ctx: Context, value: string): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    if (value === '🔙 Cancelar') {
      await this.showConfigMenu(ctx);
      await sessionManager.clearSession(telegramId);
      return;
    }

    const minRecharge = parseFloat(value);
    if (isNaN(minRecharge) || minRecharge <= 0) {
      await ctx.reply('⚠️ Por favor ingresa un monto válido.');
      return;
    }

    const maxRecharge = await settingsService.getMaxRecharge();
    if (minRecharge >= maxRecharge) {
      await ctx.reply(`⚠️ El monto mínimo debe ser menor que el máximo ($${maxRecharge} USD).`);
      return;
    }

    const success = await settingsService.setSetting('min_recharge', minRecharge.toString());
    
    if (success) {
      await ctx.reply(
        `✅ *Monto mínimo actualizado*\n\n` +
        `Nuevo mínimo: $${minRecharge} USD`,
        { parse_mode: 'Markdown' }
      );
      await sessionManager.clearSession(telegramId);
      await this.showConfigMenu(ctx);
    } else {
      await ctx.reply('❌ Error al actualizar. Intenta nuevamente.');
    }
  }

  async handleMaxRecharge(ctx: Context, value: string): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    if (value === '🔙 Cancelar') {
      await this.showConfigMenu(ctx);
      await sessionManager.clearSession(telegramId);
      return;
    }

    const maxRecharge = parseFloat(value);
    if (isNaN(maxRecharge) || maxRecharge <= 0) {
      await ctx.reply('⚠️ Por favor ingresa un monto válido.');
      return;
    }

    const minRecharge = await settingsService.getMinRecharge();
    if (maxRecharge <= minRecharge) {
      await ctx.reply(`⚠️ El monto máximo debe ser mayor que el mínimo ($${minRecharge} USD).`);
      return;
    }

    const success = await settingsService.setSetting('max_recharge', maxRecharge.toString());
    
    if (success) {
      await ctx.reply(
        `✅ *Monto máximo actualizado*\n\n` +
        `Nuevo máximo: $${maxRecharge} USD`,
        { parse_mode: 'Markdown' }
      );
      await sessionManager.clearSession(telegramId);
      await this.showConfigMenu(ctx);
    } else {
      await ctx.reply('❌ Error al actualizar. Intenta nuevamente.');
    }
  }

  async handleBankAccount(ctx: Context, value: string): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    if (value === '🔙 Cancelar') {
      await this.showConfigMenu(ctx);
      await sessionManager.clearSession(telegramId);
      return;
    }

    if (value.length < 10) {
      await ctx.reply('⚠️ Por favor ingresa un número de cuenta válido.');
      return;
    }

    const success = await settingsService.setSetting('bank_account', value);
    
    if (success) {
      await ctx.reply(
        `✅ *Cuenta bancaria actualizada*\n\n` +
        `Nueva cuenta: ${value}`,
        { parse_mode: 'Markdown' }
      );
      await sessionManager.clearSession(telegramId);
      await this.showConfigMenu(ctx);
    } else {
      await ctx.reply('❌ Error al actualizar. Intenta nuevamente.');
    }
  }

  async handleConfirmPhone(ctx: Context, value: string): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    if (value === '🔙 Cancelar') {
      await this.showConfigMenu(ctx);
      await sessionManager.clearSession(telegramId);
      return;
    }

    if (value.length < 8) {
      await ctx.reply('⚠️ Por favor ingresa un número de teléfono válido.');
      return;
    }

    const success = await settingsService.setSetting('confirmation_phone', value);
    
    if (success) {
      await ctx.reply(
        `✅ *Teléfono de confirmación actualizado*\n\n` +
        `Nuevo teléfono: ${value}`,
        { parse_mode: 'Markdown' }
      );
      await sessionManager.clearSession(telegramId);
      await this.showConfigMenu(ctx);
    } else {
      await ctx.reply('❌ Error al actualizar. Intenta nuevamente.');
    }
  }
}

export const adminConfigHandler = new AdminConfigHandler();
