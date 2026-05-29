import { Context } from 'telegraf';
import { userService } from '../services/user.service';
import { rechargeService } from '../services/recharge.service';
import { settingsService } from '../services/settings.service';
import { sessionManager } from '../middlewares/session.middleware';
import { mainMenuKeyboard, backKeyboard } from '../keyboards/user.keyboard';
import { Message } from 'telegraf/types';

export class RechargeHandler {
  private notificationService: any;

  setNotificationService(service: any): void {
    this.notificationService = service;
  }

  async startNewRecharge(ctx: Context): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const user = await userService.findByTelegramId(telegramId);
    if (!user) {
      await ctx.reply('❌ Usuario no encontrado. Usa /start para registrarte.');
      return;
    }

    const minRecharge = await settingsService.getMinRecharge();
    const maxRecharge = await settingsService.getMaxRecharge();

    await ctx.reply(
      `💳 *Nueva Recarga*\n\n` +
      `💰 Monto mínimo: $${minRecharge} USD\n` +
      `💰 Monto máximo: $${maxRecharge} USD\n\n` +
      `¿Cuánto deseas recargar? (en USD)`,
      { parse_mode: 'Markdown', ...backKeyboard() }
    );

    await sessionManager.setStep(telegramId, 'RECHARGE_AWAITING_AMOUNT');
  }

  async handleAmount(ctx: Context, amountText: string): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    if (amountText === '🔙 Volver al Menú') {
      await ctx.reply('Volviendo al menú principal...', mainMenuKeyboard());
      await sessionManager.clearSession(telegramId);
      return;
    }

    const amount = parseFloat(amountText);

    if (isNaN(amount) || amount <= 0) {
      await ctx.reply('⚠️ Por favor ingresa un monto válido.');
      return;
    }

    const minRecharge = await settingsService.getMinRecharge();
    const maxRecharge = await settingsService.getMaxRecharge();

    if (amount < minRecharge || amount > maxRecharge) {
      await ctx.reply(
        `⚠️ El monto debe estar entre $${minRecharge} y $${maxRecharge} USD.`
      );
      return;
    }

    const user = await userService.findByTelegramId(telegramId);
    if (!user) return;

    const recharge = await rechargeService.createRecharge({
      user_id: user.id,
      bet_id: user.bet_id,
      amount: amount,
    });

    if (!recharge) {
      await ctx.reply('❌ Error al crear la recarga. Intenta nuevamente.');
      await sessionManager.clearSession(telegramId);
      return;
    }

    const amountTransferred = recharge.amount_transferred;
    const bankAccount = await settingsService.getBankAccount();
    const confirmationPhone = await settingsService.getConfirmationPhone();

    const message = 
      `💸 *Datos para la Transferencia*\n\n` +
      `💰 Monto a transferir: *${amountTransferred.toFixed(2)} CUP*\n` +
      `🏦 Cuenta bancaria: \`${bankAccount}\`\n` +
      `📞 Número a confirmar: \`${confirmationPhone}\`\n\n` +
      `📋 *Instrucciones:*\n` +
      `1️⃣ Realiza la transferencia\n` +
      `2️⃣ Toma captura de pantalla del comprobante\n` +
      `3️⃣ Envía la captura por aquí\n\n` +
      `_Toca los datos para copiarlos_`;

    await ctx.reply(message, { parse_mode: 'Markdown' });

    await sessionManager.setTempData(telegramId, { recharge_id: recharge.id });
    await sessionManager.setStep(telegramId, 'RECHARGE_AWAITING_RECEIPT');
  }

  async handleReceipt(ctx: Context): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const message = ctx.message as Message.PhotoMessage;
    if (!message?.photo) {
      await ctx.reply('⚠️ Por favor envía una imagen del comprobante.');
      return;
    }

    const tempData = await sessionManager.getTempData(telegramId);
    const rechargeId = tempData.recharge_id;

    if (!rechargeId) {
      await ctx.reply('❌ Error: No se encontró la recarga. Intenta nuevamente.');
      await sessionManager.clearSession(telegramId);
      return;
    }

    await ctx.reply('⏳ Procesando tu comprobante...');

    try {
      const photo = message.photo[message.photo.length - 1];
      const file = await ctx.telegram.getFile(photo.file_id);
      const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

      const response = await fetch(fileUrl);
      const buffer = Buffer.from(await response.arrayBuffer());

      const receiptUrl = await rechargeService.uploadReceipt(
        rechargeId,
        buffer,
        `receipt_${Date.now()}.jpg`
      );

      if (!receiptUrl) {
        await ctx.reply('❌ Error al subir el comprobante. Intenta nuevamente.');
        return;
      }

      await ctx.reply(
        `✅ *¡Recarga registrada exitosamente!*\n\n` +
        `El proceso de revisión se realiza de forma manual.\n` +
        `Te notificaremos cuando sea aprobada.\n\n` +
        `Puedes ver el estado en: 💲 Estado actual`,
        { parse_mode: 'Markdown', ...mainMenuKeyboard() }
      );

      const recharge = await rechargeService.getRechargeById(rechargeId);
      if (recharge && this.notificationService) {
        const user = await userService.findByTelegramId(telegramId);
        await this.notificationService.notifyNewRecharge(
          rechargeId,
          recharge.user_id,
          recharge.amount,
          user?.bet_id || ''
        );
      }

      await sessionManager.clearSession(telegramId);
    } catch (error) {
      console.error('Error handling receipt:', error);
      await ctx.reply('❌ Error al procesar el comprobante. Intenta nuevamente.');
    }
  }

  async showLastRecharge(ctx: Context): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const user = await userService.findByTelegramId(telegramId);
    if (!user) return;

    const lastRecharge = await rechargeService.getLastRecharge(user.id);

    if (!lastRecharge) {
      await ctx.reply(
        `ℹ️ No has realizado ninguna recarga.\n\n` +
        `Toca *💳 Nueva Recarga* para comenzar.`,
        { parse_mode: 'Markdown', ...mainMenuKeyboard() }
      );
      return;
    }

    const statusEmoji = {
      pending: '⏳',
      approved: '✅',
      rejected: '❌'
    };

    const statusText = {
      pending: 'Pendiente',
      approved: 'Aprobada',
      rejected: 'Rechazada'
    };

    const date = new Date(lastRecharge.created_at).toLocaleDateString('es-ES');

    const message = 
      `🔄 *Última Recarga*\n\n` +
      `💰 Monto: $${lastRecharge.amount.toFixed(2)} USD\n` +
      `💸 Transferido: ${lastRecharge.amount_transferred.toFixed(2)} CUP\n` +
      `${statusEmoji[lastRecharge.status]} Estado: *${statusText[lastRecharge.status]}*\n` +
      `📅 Fecha: ${date}`;

    await ctx.reply(message, { parse_mode: 'Markdown', ...mainMenuKeyboard() });
  }

  async showMyRecharges(ctx: Context): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const user = await userService.findByTelegramId(telegramId);
    if (!user) return;

    const recharges = await rechargeService.getUserRecharges(user.id);

    if (recharges.length === 0) {
      await ctx.reply(
        `ℹ️ No tienes recargas registradas.\n\n` +
        `Toca *💳 Nueva Recarga* para comenzar.`,
        { parse_mode: 'Markdown', ...mainMenuKeyboard() }
      );
      return;
    }

    const statusEmoji = {
      pending: '⏳',
      approved: '✅',
      rejected: '❌'
    };

    let message = `📋 *Mis Recargas* (${recharges.length})\n\n`;

    recharges.slice(0, 10).forEach((r, index) => {
      const date = new Date(r.created_at).toLocaleDateString('es-ES');
      message += 
        `${index + 1}. ${statusEmoji[r.status]} $${r.amount.toFixed(2)} USD - ${date}\n`;
    });

    if (recharges.length > 10) {
      message += `\n_Mostrando las últimas 10 recargas_`;
    }

    await ctx.reply(message, { parse_mode: 'Markdown', ...mainMenuKeyboard() });
  }
}

export const rechargeHandler = new RechargeHandler();
