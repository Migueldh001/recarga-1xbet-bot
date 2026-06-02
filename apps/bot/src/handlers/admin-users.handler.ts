import { Context } from 'telegraf';
import { userService } from '../services/user.service';
import { sessionManager } from '../middlewares/session.middleware';
import { adminMenuKeyboard } from '../keyboards/admin.keyboard';
import { Markup } from 'telegraf';

export class AdminUsersHandler {
  
  async startAddAdmin(ctx: Context): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const isAdmin = await userService.isAdmin(telegramId);
    if (!isAdmin) {
      await ctx.reply('❌ No tienes permisos de administrador.');
      return;
    }

    const backKeyboard = Markup.keyboard([['🔙 Cancelar']]).resize();

    await ctx.reply(
      `➕ *Agregar Administrador*\n\n` +
      `Ingresa el *ID de 1xBet* del usuario que deseas promover a administrador:`,
      { parse_mode: 'Markdown', ...backKeyboard }
    );

    await sessionManager.setStep(telegramId, 'ADMIN_ADD_ADMIN_BET_ID');
  }

  async handleAddAdminBetId(ctx: Context, betId: string): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    if (betId === '🔙 Cancelar') {
      const pendingCount = 0; // Podrías calcularlo si quieres
      await ctx.reply('Operación cancelada.', adminMenuKeyboard(pendingCount));
      await sessionManager.clearSession(telegramId);
      return;
    }

    // Buscar usuario
    const user = await userService.findByBetId(betId);

    if (!user) {
      await ctx.reply(
        `⚠️ No se encontró ningún usuario con el ID de 1xBet: ${betId}\n\n` +
        `Asegúrate de que el usuario esté registrado en el sistema.`
      );
      return;
    }

    // Verificar si ya es admin
    if (user.is_admin) {
      await ctx.reply(
        `ℹ️ El usuario con ID ${betId} ya es administrador.`
      );
      await sessionManager.clearSession(telegramId);
      return;
    }

    // Guardar temporalmente el user_id
    await sessionManager.setTempData(telegramId, { 
      user_id_to_promote: user.id,
      bet_id: betId 
    });

    // Pedir confirmación
    const confirmKeyboard = Markup.keyboard([
      ['✅ Confirmar', '❌ Cancelar'],
    ]).resize();

    await ctx.reply(
      `👤 *Usuario encontrado:*\n\n` +
      `🎰 ID 1xBet: ${user.bet_id}\n` +
      `📱 Teléfono: ${user.phone}\n` +
      `📅 Registrado: ${new Date(user.created_at).toLocaleDateString('es-ES')}\n\n` +
      `¿Confirmas que deseas promover a este usuario a *Administrador*?`,
      { parse_mode: 'Markdown', ...confirmKeyboard }
    );

    await sessionManager.setStep(telegramId, 'ADMIN_ADD_ADMIN_CONFIRM');
  }

  async handleAddAdminConfirm(ctx: Context, confirmation: string): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const tempData = await sessionManager.getTempData(telegramId);
    const userIdToPromote = tempData.user_id_to_promote;
    const betId = tempData.bet_id;

    if (confirmation === '❌ Cancelar') {
      await ctx.reply('Operación cancelada. El usuario NO fue promovido.');
      await sessionManager.clearSession(telegramId);
      return;
    }

    if (confirmation !== '✅ Confirmar') {
      await ctx.reply('⚠️ Por favor selecciona ✅ Confirmar o ❌ Cancelar');
      return;
    }

    // Promover a admin
    const success = await userService.setAdmin(userIdToPromote, true);

    if (!success) {
      await ctx.reply('❌ Error al promover el usuario. Intenta nuevamente.');
      await sessionManager.clearSession(telegramId);
      return;
    }

    // Notificar al nuevo admin si tiene telegram_id
    const user = await userService.findByBetId(betId);
    if (user?.telegram_id) {
      try {
        await ctx.telegram.sendMessage(
          user.telegram_id,
          `🎉 *¡Felicidades!*\n\n` +
          `Has sido promovido a *Administrador*.\n\n` +
          `Ahora tienes acceso al panel de administración.\n` +
          `Usa /admin para acceder.`,
          { parse_mode: 'Markdown' }
        );
      } catch (error) {
        console.error('Error notificando al nuevo admin:', error);
      }
    }

    const pendingCount = 0;
    await ctx.reply(
      `✅ *Usuario promovido exitosamente*\n\n` +
      `El usuario con ID ${betId} ahora es administrador.`,
      { parse_mode: 'Markdown', ...adminMenuKeyboard(pendingCount) }
    );

    await sessionManager.clearSession(telegramId);
  }

  async showManageAdmins(ctx: Context): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const isAdmin = await userService.isAdmin(telegramId);
    if (!isAdmin) return;

    const users = await userService.getAllUsers();
    const admins = users.filter(u => u.is_admin);

    if (admins.length === 0) {
      await ctx.reply('ℹ️ No hay administradores registrados (aparte del inicial).');
      return;
    }

    let message = `👑 *Administradores actuales* (${admins.length})\n\n`;

    admins.forEach((admin, index) => {
      message += `${index + 1}. 🎰 ${admin.bet_id} - 📱 ${admin.phone}\n`;
    });

    await ctx.reply(message, { parse_mode: 'Markdown' });
  }
}

export const adminUsersHandler = new AdminUsersHandler();
