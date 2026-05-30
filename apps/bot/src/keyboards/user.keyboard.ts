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

export const quickAmountsKeyboard = () => {
  return Markup.keyboard([
    ['💵 $5', '💵 $10', '💵 $20'],
    ['💵 $50', '💵 $75', '💵 $100'],
    ['✏️ Otro monto', '🔙 Volver al Menú'],
  ]).resize();
};

export const settingsMenuKeyboard = () => {
  return Markup.keyboard([
    ['🎰 Cambiar ID 1xBet'],
    ['🔐 Cambiar Contraseña'],
    ['🔙 Volver al Menú'],
  ]).resize();
};
