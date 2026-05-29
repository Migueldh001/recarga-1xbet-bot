import { Markup } from 'telegraf';

export const adminMenuKeyboard = (pendingCount: number = 0) => {
  return Markup.keyboard([
    [`📥 Solicitudes (${pendingCount})`],
    ['👥 Usuarios', '💱 Configurar Tasa'],
    ['📊 Estadísticas', '📞 Configurar Contacto'],
    ['➕ Agregar Admin', '👤 Ver como Usuario'],
  ]).resize();
};

export const approveRejectKeyboard = (rechargeId: string) => {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ Aprobar', `approve_${rechargeId}`),
      Markup.button.callback('❌ Rechazar', `reject_${rechargeId}`),
    ],
  ]);
};

export const viewReceiptKeyboard = (receiptUrl: string) => {
  return Markup.inlineKeyboard([
    [Markup.button.url('📸 Ver Comprobante', receiptUrl)],
  ]);
};
