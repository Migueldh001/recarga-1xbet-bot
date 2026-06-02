import { Context } from 'telegraf';
import { userService } from '../services/user.service';
import { rechargeService } from '../services/recharge.service';
import { settingsService } from '../services/settings.service';
import { adminMenuKeyboard, approveRejectKeyboard, viewReceiptKeyboard } from '../keyboards/admin.keyboard';
import { mainMenuKeyboard } from '../keyboards/user.keyboard';
import { sessionManager } from '../middlewares/session.middleware';

export class AdminHandler {
  private notificationService: any;

  setNotificationService(service: any): void {
    this.notificationService = service;
  }

  async showAdminMenu(ctx: Context): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const isAdmin = await userService.isAdmin(telegramId);
    if (!isAdmin) {
      await ctx.reply('❌ No tienes permisos de administrador.');
      return;
    }

    const pendingCount = (await rechargeService.getPendingRecharges()).length;
    
    await ctx.reply(
      `🔐 *Panel de Administración*\n\n` +
      `Solicitudes pendientes: ${pendingCount}`,
      { parse_mode: 'Markdown', ...adminMenuKeyboard(pendingCount) }
    );
  }

    async showPendingRecharges(ctx: Context): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const isAdmin = await userService.isAdmin(telegramId);
    if (!isAdmin) return;

    const pending = await rechargeService.getPendingRecharges();

    if (pending.length === 0) {
      await ctx.reply('✅ No hay solicitudes pendientes.', adminMenuKeyboard(0));
      return;
    }

    await ctx.reply(`📥 *Solicitudes Pendientes* (${pending.length})\n`, {
      parse_mode: 'Markdown',
    });

    for (const recharge of pending) {
      const date = new Date(recharge.created_at).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });

      let message = 
        `💰 Monto: $${recharge.amount.toFixed(2)} USD\n` +
        `💸 A transferir: ${recharge.amount_transferred.toFixed(2)} CUP\n` +
        `🎰 ID 1xBet: ${recharge.bet_id}\n` +
        `📅 Fecha: ${date}\n` +
        `📝 ID: \`${recharge.id.substring(0, 8)}...\``;

      const keyboard = approveRejectKeyboard(recharge.id);

      if (recharge.receipt_url) {
        try {
          await ctx.replyWithPhoto(
            recharge.receipt_url,
            {
              caption: message,
              parse_mode: 'Markdown',
              ...keyboard,
            }
          );
        } catch (error) {
          console.error('Error enviando foto:', error);
          // Si falla enviar la foto, enviar solo el texto con link
          message += `\n\n📸 [Ver comprobante](${recharge.receipt_url})`;
          await ctx.reply(message, { 
            parse_mode: 'Markdown', 
            ...keyboard,
            disable_web_page_preview: false
          });
        }
      } else {
        message += `\n\n⚠️ Sin comprobante`;
        await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });
      }
      
      // Pequeña pausa entre mensajes
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    }

  async approveRecharge(ctx: Context, rechargeId: string): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const isAdmin = await userService.isAdmin(telegramId);
    if (!isAdmin) return;

    const recharge = await rechargeService.getRechargeById(rechargeId);
    if (!recharge) {
      await ctx.answerCbQuery('❌ Recarga no encontrada');
      return;
    }

    const success = await rechargeService.updateStatus(rechargeId, 'approved');
    
    if (!success) {
      await ctx.answerCbQuery('❌ Error al aprobar');
      return;
    }

    const user = await userService.findByTelegramId(recharge.user_id as any);
    
    if (user?.telegram_id && this.notificationService) {
      await this.notificationService.notifyRechargeApproved(
        user.telegram_id,
        recharge.amount
      );
    }

    await ctx.answerCbQuery('✅ Recarga aprobada');
    
    try {
      await ctx.editMessageCaption(
        `✅ *APROBADA*\n\n` +
        `💰 Monto: $${recharge.amount.toFixed(2)} USD\n` +
        `🎰 ID 1xBet: ${recharge.bet_id}`,
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      console.error('Error editing message:', error);
    }
  }

  async rejectRecharge(ctx: Context, rechargeId: string): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const isAdmin = await userService.isAdmin(telegramId);
    if (!isAdmin) return;

    const recharge = await rechargeService.getRechargeById(rechargeId);
    if (!recharge) {
      await ctx.answerCbQuery('❌ Recarga no encontrada');
      return;
    }

    const success = await rechargeService.updateStatus(rechargeId, 'rejected');
    
    if (!success) {
      await ctx.answerCbQuery('❌ Error al rechazar');
      return;
    }

    const user = await userService.findByTelegramId(recharge.user_id as any);
    
    if (user?.telegram_id && this.notificationService) {
      await this.notificationService.notifyRechargeRejected(
        user.telegram_id,
        recharge.amount
      );
    }

    await ctx.answerCbQuery('❌ Recarga rechazada');
    
    try {
      await ctx.editMessageCaption(
        `❌ *RECHAZADA*\n\n` +
        `💰 Monto: $${recharge.amount.toFixed(2)} USD\n` +
        `🎰 ID 1xBet: ${recharge.bet_id}`,
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      console.error('Error editing message:', error);
    }
  }

  async showAllUsers(ctx: Context): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const isAdmin = await userService.isAdmin(telegramId);
    if (!isAdmin) return;

    const users = await userService.getAllUsers();

    let message = `👥 *Usuarios Registrados* (${users.length})\n\n`;

    users.slice(0, 20).forEach((user, index) => {
      const adminBadge = user.is_admin ? '👑 ' : '';
      message += `${index + 1}. ${adminBadge}${user.bet_id} - ${user.phone}\n`;
    });

    if (users.length > 20) {
      message += `\n_Mostrando los primeros 20 usuarios_`;
    }

    await ctx.reply(message, { parse_mode: 'Markdown' });
  }

  async viewAsUser(ctx: Context): Promise<void> {
    await ctx.reply(
      `👤 *Vista de Usuario*\n\n` +
      `Ahora estás viendo el bot como lo vería un usuario normal.`,
      { parse_mode: 'Markdown', ...mainMenuKeyboard() }
    );
  }

  async showStats(ctx: Context): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const isAdmin = await userService.isAdmin(telegramId);
    if (!isAdmin) return;

    const users = await userService.getAllUsers();
    const pending = await rechargeService.getRechargesByStatus('pending');
    const approved = await rechargeService.getRechargesByStatus('approved');
    const rejected = await rechargeService.getRechargesByStatus('rejected');

    const totalAmount = approved.reduce((sum, r) => sum + r.amount, 0);

    const message = 
      `📊 *Estadísticas Generales*\n\n` +
      `👥 Usuarios: ${users.length}\n` +
      `⏳ Pendientes: ${pending.length}\n` +
      `✅ Aprobadas: ${approved.length}\n` +
      `❌ Rechazadas: ${rejected.length}\n\n` +
      `💰 Total recargado: $${totalAmount.toFixed(2)} USD`;

    await ctx.reply(message, { parse_mode: 'Markdown' });
  }
}

export const adminHandler = new AdminHandler();
