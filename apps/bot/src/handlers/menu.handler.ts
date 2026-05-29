import { Context } from 'telegraf';
import { settingsService } from '../services/settings.service';
import { userService } from '../services/user.service';
import { mainMenuKeyboard } from '../keyboards/user.keyboard';

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
      `_Próximamente más opciones..._`;

    await ctx.reply(message, { parse_mode: 'Markdown', ...mainMenuKeyboard() });
  }
}

export const menuHandler = new MenuHandler();
