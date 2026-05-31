import { Telegraf } from 'telegraf';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Cargar .env
dotenv.config({ path: resolve(__dirname, '../.env') });

console.log('📋 Cargando módulos...');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN no está definido');
  process.exit(1);
}

console.log('✅ Token encontrado');

const bot = new Telegraf(BOT_TOKEN);

console.log('📦 Importando handlers...');

// Importar después de verificar token
import('./handlers/start.handler.js').then(({ startHandler }) => {
  import('./handlers/auth.handler.js').then(({ authHandler }) => {
    import('./handlers/recharge.handler.js').then(({ rechargeHandler }) => {
      import('./handlers/menu.handler.js').then(({ menuHandler }) => {
        import('./handlers/admin.handler.js').then(({ adminHandler }) => {
  import('./handlers/admin-config.handler.js').then(({ adminConfigHandler }) => {
  import('./handlers/admin-contact.handler.js').then(({ adminContactHandler }) => {
    import('./middlewares/session.middleware.js').then(({ sessionManager }) => {
      import('./services/notification.service.js').then(({ NotificationService }) => {
        import('./services/user.service.js').then(({ userService }) => {

          console.log('✅ Todos los módulos cargados');

          const notificationService = new NotificationService(bot);
          authHandler.setNotificationService(notificationService);
          rechargeHandler.setNotificationService(notificationService);
          adminHandler.setNotificationService(notificationService);

          // Comandos
          bot.command('start', async (ctx) => {
            await startHandler.handle(ctx);
          });

          bot.command('admin', async (ctx) => {
            await adminHandler.showAdminMenu(ctx);
          });

          // Callbacks
          bot.action(/approve_(.+)/, async (ctx) => {
            const rechargeId = ctx.match[1];
            await adminHandler.approveRecharge(ctx, rechargeId);
          });

          bot.action(/reject_(.+)/, async (ctx) => {
            const rechargeId = ctx.match[1];
            await adminHandler.rejectRecharge(ctx, rechargeId);
          });

          // Mensajes de texto
          bot.on('text', async (ctx) => {
            const telegramId = ctx.from?.id;
            if (!telegramId) return;

            const text = ctx.message.text;
            const step = await sessionManager.getStep(telegramId);

            // FLUJOS
            if (step === 'AWAITING_HAS_1XBET') {
              await startHandler.handleHas1xBet(ctx, text);
              return;
            }

            if (step === 'AWAITING_HAS_ACCOUNT') {
              await startHandler.handleHasAccount(ctx, text);
              return;
            }

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

            if (step === 'LOGIN_AWAITING_BET_ID') {
              await authHandler.handleLoginBetId(ctx, text);
              return;
            }

            if (step === 'LOGIN_AWAITING_PASSWORD') {
              await authHandler.handleLoginPassword(ctx, text);
              return;
            }

            if (step === 'RECHARGE_AWAITING_AMOUNT') {
              await rechargeHandler.handleAmount(ctx, text);
              return;
            }

            if (step === 'SETTINGS_CHANGE_BET_ID') {
              await menuHandler.handleChangeBetId(ctx, text);
              return;
            }

            if (step === 'SETTINGS_CHANGE_PASSWORD') {
              await menuHandler.handleChangePassword(ctx, text);
              return;
            }

            // ADMIN CONFIG STEPS
            if (step === 'ADMIN_CONFIG_EXCHANGE_RATE') {
              await adminConfigHandler.handleExchangeRate(ctx, text);
              return;
            }

            if (step === 'ADMIN_CONFIG_COMMISSION') {
              await adminConfigHandler.handleCommission(ctx, text);
              return;
            }

            if (step === 'ADMIN_CONFIG_MIN_RECHARGE') {
              await adminConfigHandler.handleMinRecharge(ctx, text);
              return;
            }

            if (step === 'ADMIN_CONFIG_MAX_RECHARGE') {
              await adminConfigHandler.handleMaxRecharge(ctx, text);
              return;
            }

            if (step === 'ADMIN_CONFIG_BANK_ACCOUNT') {
              await adminConfigHandler.handleBankAccount(ctx, text);
              return;
            }

            if (step === 'ADMIN_CONFIG_CONFIRM_PHONE') {
              await adminConfigHandler.handleConfirmPhone(ctx, text);
              return;
            }

            const user = await userService.findByTelegramId(telegramId);
            const isAdmin = user ? await userService.isAdmin(telegramId) : false;

            // MENÚ USUARIO
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

            // MENÚ ADMIN
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
                await adminConfigHandler.showConfigMenu(ctx);
                return;
              }

              if (text === '🔙 Volver al Panel Admin') {
                await adminHandler.showAdminMenu(ctx);
                return;
              }

              // Opciones del menú de configuración
              if (text === '💱 Tasa de Cambio' || text === '📊 Comisión' || 
                  text === '💵 Monto Mínimo' || text === '💵 Monto Máximo' ||
                  text === '🏦 Cuenta Bancaria' || text === '📞 Teléfono Confirmación') {
                await adminConfigHandler.handleConfigOption(ctx, text);
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

            await ctx.reply('🤔 No entendí ese comando.\n\nUsa /start para ver el menú.');
          });

          // Fotos
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

          bot.catch((err:any) => {
            console.error('❌ Error en el bot:', err);
          });

          // INICIAR
          console.log('🤖 Iniciando bot...');
          bot.telegram.getMe().then((botInfo:any) => {
            console.log(`✅ Bot conectado: @${botInfo.username}`);
            bot.launch();
            console.log('🚀 Bot activo y escuchando mensajes...\n');
          }).catch((err:any) => {
            console.error('❌ Error al conectar:', err);
            process.exit(1);
          });

          process.once('SIGINT', () => bot.stop('SIGINT'));
          process.once('SIGTERM', () => bot.stop('SIGTERM'));

        });
      });
    });
  });
});
