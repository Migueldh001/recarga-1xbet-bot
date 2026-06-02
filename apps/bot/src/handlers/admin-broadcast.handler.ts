import { Context } from 'telegraf';
import { userService } from '../services/user.service';
import { sessionManager } from '../middlewares/session.middleware';
import { adminMenuKeyboard } from '../keyboards/admin.keyboard';
import { Markup } from 'telegraf';
import { Message } from 'telegraf/types';

export class AdminBroadcastHandler {
  
  async startBroadcast(ctx: Context): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const isAdmin = await userService.isAdmin(telegramId);
    if (!isAdmin) {
      await ctx.reply('❌ No tienes permisos de administrador.');
      return;
    }

    const keyboard = Markup.keyboard([
      ['📝 Solo Texto', '📸 Solo Imagen'],
      ['📝📸 Texto + Imagen'],
      ['🔙 Cancelar'],
    ]).resize();

    await ctx.reply(
      `📢 *Sistema de Difusión Masiva*\n\n` +
      `Selecciona el tipo de mensaje que deseas enviar a todos los usuarios:`,
      { parse_mode: 'Markdown', ...keyboard }
    );

    await sessionManager.setStep(telegramId, 'BROADCAST_SELECT_TYPE');
  }

  async handleSelectType(ctx: Context, type: string): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    if (type === '🔙 Cancelar') {
      const pendingCount = 0;
      await ctx.reply('Operación cancelada.', adminMenuKeyboard(pendingCount));
      await sessionManager.clearSession(telegramId);
      return;
    }

    const backKeyboard = Markup.keyboard([['🔙 Cancelar']]).resize();

    await sessionManager.setTempData(telegramId, { broadcast_type: type });

    if (type === '📝 Solo Texto') {
      await ctx.reply(
        `📝 *Envía el mensaje de texto*\n\n` +
        `Escribe el mensaje que deseas enviar a todos los usuarios:`,
        { parse_mode: 'Markdown', ...backKeyboard }
      );
      await sessionManager.setStep(telegramId, 'BROADCAST_TEXT');
    } else if (type === '📸 Solo Imagen') {
      await ctx.reply(
        `📸 *Envía la imagen*\n\n` +
        `Sube la imagen que deseas enviar a todos los usuarios:`,
        { parse_mode: 'Markdown', ...backKeyboard }
      );
      await sessionManager.setStep(telegramId, 'BROADCAST_PHOTO');
    } else if (type === '📝📸 Texto + Imagen') {
      await ctx.reply(
        `📝 *Primero envía el texto*\n\n` +
        `Escribe el mensaje que acompañará la imagen:`,
        { parse_mode: 'Markdown', ...backKeyboard }
      );
      await sessionManager.setStep(telegramId, 'BROADCAST_TEXT_FOR_PHOTO');
    }
  }

  async handleText(ctx: Context, text: string): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    if (text === '🔙 Cancelar') {
      await this.startBroadcast(ctx);
      return;
    }

    const tempData = await sessionManager.getTempData(telegramId);
    tempData.broadcast_text = text;
    await sessionManager.setTempData(telegramId, tempData);

    const confirmKeyboard = Markup.inlineKeyboard([
      [Markup.button.callback('📢 Difundir', 'broadcast_confirm')],
      [Markup.button.callback('❌ Cancelar', 'broadcast_cancel')],
    ]);

    await ctx.reply(
      `📝 *Vista previa del mensaje:*\n\n` +
      `${text}\n\n` +
      `¿Confirmas enviar este mensaje a todos los usuarios?`,
      { parse_mode: 'Markdown', ...confirmKeyboard }
    );

    await sessionManager.setStep(telegramId, 'BROADCAST_CONFIRM');
  }

  async handleTextForPhoto(ctx: Context, text: string): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    if (text === '🔙 Cancelar') {
      await this.startBroadcast(ctx);
      return;
    }

    const tempData = await sessionManager.getTempData(telegramId);
    tempData.broadcast_text = text;
    await sessionManager.setTempData(telegramId, tempData);

    const backKeyboard = Markup.keyboard([['🔙 Cancelar']]).resize();

    await ctx.reply(
      `📸 *Ahora envía la imagen*\n\n` +
      `Sube la imagen que acompañará el mensaje:`,
      { parse_mode: 'Markdown', ...backKeyboard }
    );

    await sessionManager.setStep(telegramId, 'BROADCAST_PHOTO_WITH_TEXT');
  }

  async handlePhoto(ctx: Context): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const message = ctx.message as Message.PhotoMessage;
    if (!message?.photo) {
      await ctx.reply('⚠️ Por favor envía una imagen.');
      return;
    }

    const photo = message.photo[message.photo.length - 1];
    const fileId = photo.file_id;

    const tempData = await sessionManager.getTempData(telegramId);
    tempData.broadcast_photo = fileId;
    await sessionManager.setTempData(telegramId, tempData);

    const text = tempData.broadcast_text || '';

    const confirmKeyboard = Markup.inlineKeyboard([
      [Markup.button.callback('📢 Difundir', 'broadcast_confirm')],
      [Markup.button.callback('❌ Cancelar', 'broadcast_cancel')],
    ]);

    if (text) {
      await ctx.replyWithPhoto(fileId, {
        caption: `📝 *Vista previa:*\n\n${text}\n\n¿Confirmas difundir este mensaje?`,
        parse_mode: 'Markdown',
        ...confirmKeyboard,
      });
    } else {
      await ctx.replyWithPhoto(fileId, {
        caption: '📸 ¿Confirmas difundir esta imagen?',
        ...confirmKeyboard,
      });
    }

    await sessionManager.setStep(telegramId, 'BROADCAST_CONFIRM');
  }

  async confirmBroadcast(ctx: Context): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    await ctx.answerCbQuery('Difundiendo mensaje...');

    const tempData = await sessionManager.getTempData(telegramId);
    const text = tempData.broadcast_text;
    const photoFileId = tempData.broadcast_photo;

    // Obtener todos los usuarios
    const users = await userService.getAllUsers();
    const usersWithTelegram = users.filter(u => u.telegram_id);

    let successCount = 0;
    let failCount = 0;

    await ctx.editMessageCaption(
      `📢 Difundiendo a ${usersWithTelegram.length} usuarios...\n\n⏳ Por favor espera...`,
      { parse_mode: 'Markdown' }
    );

    for (const user of usersWithTelegram) {
      try {
        if (photoFileId && text) {
          // Foto con texto
          await ctx.telegram.sendPhoto(user.telegram_id!, photoFileId, {
            caption: text,
            parse_mode: 'Markdown',
          });
        } else if (photoFileId) {
          // Solo foto
          await ctx.telegram.sendPhoto(user.telegram_id!, photoFileId);
        } else if (text) {
          // Solo texto
          await ctx.telegram.sendMessage(user.telegram_id!, text, {
            parse_mode: 'Markdown',
          });
        }
        successCount++;
        // Pequeña pausa para no saturar la API de Telegram
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.error(`Error enviando a ${user.telegram_id}:`, error);
        failCount++;
      }
    }

    const pendingCount = 0;
    await ctx.telegram.sendMessage(
      telegramId,
      `✅ *Difusión completada*\n\n` +
      `📤 Enviados: ${successCount}\n` +
      `❌ Fallidos: ${failCount}\n` +
      `👥 Total: ${usersWithTelegram.length}`,
      { parse_mode: 'Markdown', ...adminMenuKeyboard(pendingCount) }
    );

    await sessionManager.clearSession(telegramId);
  }

  async cancelBroadcast(ctx: Context): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    await ctx.answerCbQuery('Difusión cancelada');

    const pendingCount = 0;
    await ctx.telegram.sendMessage(
      telegramId,
      '❌ Difusión cancelada.',
      adminMenuKeyboard(pendingCount)
    );

    await sessionManager.clearSession(telegramId);
  }
}

export const adminBroadcastHandler = new AdminBroadcastHandler();
