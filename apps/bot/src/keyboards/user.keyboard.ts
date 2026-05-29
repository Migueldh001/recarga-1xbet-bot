import { Markup } from 'telegraf';

export const mainMenuKeyboard = () => {
  return Markup.keyboard([
    ['💳 Nueva Recarga'],
    ['💲 Estado actual', '📋 Mis Recargas'],
    ['📞 Contactar Soporte', '⚙️ Configuración'],
  ]).resize();
};

export const yesNoKeyboard = () => {
  return Markup.keyboard([['Sí', 'No']]).resize();
};

export const backKeyboard = () => {
  return Markup.keyboard([['🔙 Volver al Menú']]).resize();
};

export const cancelKeyboard = () => {
  return Markup.keyboard([['❌ Cancelar']]).resize();
};

export const rechargeStatusKeyboard = () => {
  return Markup.keyboard([
    ['⏳ Pendientes', '✅ Aprobadas'],
    ['❌ Rechazadas', '📊 Todas'],
    ['🔙 Volver al Menú'],
  ]).resize();
};
