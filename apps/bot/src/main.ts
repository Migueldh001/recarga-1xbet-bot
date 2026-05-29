import { Telegraf } from 'telegraf';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Cargar variables de entorno
dotenv.config({ path: resolve(__dirname, '../.env') });

// Importar handlers
import { startHandler } from './handlers/start.handler';
import { authHandler } from './handlers/auth.handler';
import { rechargeHandler } from './handlers/recharge.handler';
import { menuHandler } from './handlers/menu.handler';
import { adminHandler } from './handlers/admin.handler';

// Importar servicios
import { sessionManager } from './middlewares/session.middleware';
import { NotificationService } from './services/notification.service';
import { userService } from './services/user.service';

// Verificar token
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN no está definido en .env');
}

// Crear instancia del bot
const bot = new Telegraf(BOT_TOKEN);

// Inicializar servicio de notificaciones
const notificationService = new NotificationService(bot);
authHandler.setNotificationService(notificationService);
rechargeHandler.setNotificationService(notificationService);
adminHandler.setNotificationService(notificationService);

// ========================================
// COMANDO /start
// ========================================
bot.command('start', async (ctx) => {
  await startHandler.handle(ctx);
});

// ========================================
// COMANDO /admin (acceso directo al panel admin)
// ========================================
bot.command('admin', async (ctx) => {
  await adminHandler.showAdminMenu(ctx);
});

// ========================================
// MANEJO DE CALLBACKS (botones inline)
// ========================================
bot.action(/approve_(.+)/, async (ctx) => {
  const rechargeId = ctx.match[1];
  await adminHandler.approveRecharge(ctx, rechargeId);
});

bot.action(/reject_(.+)/, async (ctx) => {
  const rechargeId = ctx.match[1];
  await adminHandler.rejectRecharge(ctx, rechargeId);
});

// ========================================
// MANEJO DE MENSAJES DE TEXTO
// ========================================
bot.on('text', async (ctx) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const text = ctx.message.text;
  const step = await sessionManager.getStep(telegramId);

  // ========================================
  // FLUJOS SEGÚN EL STEP (estado del usuario)
  // ========================================
  
  // BIENVENIDA
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

  // ========================================
  // MENÚS PRINCIPALES (sin step activo)
  // ========================================

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

  // Si no coincide con nada, mostrar menú
  await ctx.reply(
    '🤔 No entendí ese comando.\n\nUsa /start para ver el menú.',
    { reply_markup: { remove_keyboard: true } }
  );
});

// ========================================
// MANEJO DE FOTOS (comprobantes)
// ========================================
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

// ========================================
// MANEJO DE ERRORES
// ========================================
bot.catch((err, ctx) => {
  console.error('Error en el bot:', err);
  ctx.reply('❌ Ocurrió un error. Por favor intenta nuevamente o usa /start');
});

// ========================================
// INICIAR EL BOT
// ========================================
async function startBot() {
  try {
    console.log('🤖 Iniciando bot...');
    
    // Verificar conexión con Telegram
    const botInfo = await bot.telegram.getMe();
    console.log(`✅ Bot conectado: @${botInfo.username}`);
    
    // Iniciar polling
    await bot.launch();
    console.log('🚀 Bot activo y escuchando mensajes...\n');
    
    // Manejo de cierre graceful
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

// Iniciar
startBot();
