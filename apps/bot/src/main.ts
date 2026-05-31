import { Telegraf } from 'telegraf';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env') });

import { startHandler } from './handlers/start.handler';
import { authHandler } from './handlers/auth.handler';
import { rechargeHandler } from './handlers/recharge.handler';
import { menuHandler } from './handlers/menu.handler';
import { adminHandler } from './handlers/admin.handler';
import { sessionManager } from './middlewares/session.middleware';
import { NotificationService } from './services/notification.service';
import { userService } from './services/user.service';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN no está definido en .env');
}

const bot = new Telegraf(BOT_TOKEN);
const notificationService = new NotificationService(bot);
authHandler.setNotificationService(notificationService);
rechargeHandler.setNotificationService(notificationService);
adminHandler.setNotificationService(notificationService);

bot.command('start', async (ctx) => {
  await startHandler.handle(ctx);
});

bot.command('admin', async (ctx) => {
  await adminHandler.showAdminMenu(ctx);
});

bot.action(/approve_(.+)/, async (ctx) => {
  const rechargeId = ctx.match[1];
  await adminHandler.approveRecharge(ctx, rechargeId);
});

bot.action(/reject_(.+)/, async (ctx) => {
  const rechargeId = ctx.match[1];
  await adminHandler.rejectRecharge(ctx, rechargeId);
});

bot.on('text', async (ctx) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const text = ctx.message.text;
  const step = await sessionManager.getStep(telegramId);

  // FLUJOS DE BIENVENIDA
  if (step === 'AWAITING_HAS_1XBET') {
    await startHandler.handleHas1xBet(ctx, text);
    return;
  }

  if (step === 'AWAITING_HAS_ACCOUNT') {
    await startHandler.handleHasAccount(ctx, text);
    return;
  }

  // REGISTRO
  if (step === 'REGISTER_AWAITING_BET_ID') {
    await authHandler.handleRegisterBetId(ctx, text);
    return;
  }

  if (step === 'REGISTER_AWAITING_PHONE') {
    await authHandler.handleRegisterPhone(ctx, text);
    return;
  }

  if (step === 'REGISTER_AWAITING_PASSWORD') {
    await authHandler.handleRegisterPassword(ctx, text);
    return;
  }

  // LOGIN
  if (step === 'LOGIN_AWAITING_BET_ID') {
    await authHandler.handleLoginBetId(ctx, text);
    return;
  }

  if (step === 'LOGIN_AWAITING_PASSWORD') {
    await authHandler.handleLoginPassword(ctx, text);
    return;
  }

  // RECARGA
  if (step === 'RECHARGE_AWAITING_AMOUNT') {
    await rechargeHandler.handleAmount(ctx, text);
    return;
  }

  // CONFIGURACIÓN DE USUARIO
  if (step === 'SETTINGS_CHANGE_BET_ID') {
    await menuHandler.handleChangeBetId(ctx, text);
    return;
  }

  if (step === 'SETTINGS_CHANGE_PASSWORD') {
    await menuHandler.handleChangePassword(ctx, text);
    return;
  }

  const user = await userService.findByTelegramId(telegramId);
  const isAdmin = user ? await userService.isAdmin(telegramId) : false;

  // MENÚ DE USUARIO
  if (text === '💳 Nueva Recarga') {
    await rechargeHandler.startNewRecharge(ctx);
    return;
  }

  if (text === '💲 Estado actual') {
    await rechargeHandler.showLastRecharge(ctx);
    return;
  }

  if (text === '📋 Mis Recargas') {
    await rechargeHandler.showMyRecharges(ctx);
    return;
  }

  if (text === '📞 Contactar Soporte') {
    await menuHandler.showContactSupport(ctx);
    return;
  }

  if (text === '⚙️ Configuración') {
    await menuHandler.showSettings(ctx);
    return;
  }

  if (text === '🎰 Cambiar ID 1xBet') {
    await menuHandler.startChangeBetId(ctx);
    return;
  }

  if (text === '🔐 Cambiar Contraseña') {
    await menuHandler.startChangePassword(ctx);
    return;
  }

  if (text === '🔙 Volver al Menú') {
    await sessionManager.clearSession(telegramId);
    await startHandler.handle(ctx);
    return;
  }

  // MENÚ DE ADMIN
  if (isAdmin) {
    if (text.startsWith('📥 Solicitudes')) {
      await adminHandler.showPendingRecharges(ctx);
      return;
    }

    if (text === '👥 Usuarios') {
      await adminHandler.showAllUsers(ctx);
      return;
    }

    if (text === '📊 Estadísticas') {
      await adminHandler.showStats(ctx);
      return;
    }

    if (text === '👤 Ver como Usuario') {
      await adminHandler.viewAsUser(ctx);
      return;
    }

    if (text === '💱 Configurar Tasa') {
      await ctx.reply('⚙️ Función en desarrollo. Próximamente...');
      return;
    }

    if (text === '📞 Configurar Contacto') {
      await ctx.reply('⚙️ Función en desarrollo. Próximamente...');
      return;
    }

    if (text === '➕ Agregar Admin') {
      await ctx.reply('⚙️ Función en desarrollo. Próximamente...');
      return;
    }
  }

  await ctx.reply(
    '🤔 No entendí ese comando.\n\nUsa /start para ver el menú.',
    { reply_markup: { remove_keyboard: true } }
  );
});

bot.on('photo', async (ctx) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const step = await sessionManager.getStep(telegramId);

  if (step === 'RECHARGE_AWAITING_RECEIPT') {
    await rechargeHandler.handleReceipt(ctx);
    return;
  }

  await ctx.reply('🤔 No esperaba una foto en este momento.');
});

bot.catch((err, ctx) => {
  console.error('Error en el bot:', err);
  ctx.reply('❌ Ocurrió un error. Por favor intenta nuevamente o usa /start');
});

async function startBot() {
  try {
    console.log('🤖 Iniciando bot...');
    const botInfo = await bot.telegram.getMe();
    console.log(`✅ Bot conectado: @${botInfo.username}`);
    await bot.launch();
    console.log('🚀 Bot activo y escuchando mensajes...\n');
    
    process.once('SIGINT', () => {
      console.log('\n⚠️ Deteniendo bot (SIGINT)...');
      bot.stop('SIGINT');
    });
    
    process.once('SIGTERM', () => {
      console.log('\n⚠️ Deteniendo bot (SIGTERM)...');
      bot.stop('SIGTERM');
    });
  } catch (error) {
    console.error('❌ Error al iniciar el bot:', error);
    process.exit(1);
  }
}

startBot();
