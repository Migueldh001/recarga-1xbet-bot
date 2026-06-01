import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

// Importar ws
const WebSocket = require('ws');

export class SupabaseService {
  private static instance: SupabaseService;
  public client: SupabaseClient;
  public adminClient: SupabaseClient;

  private constructor() {
    const url = process.env.SUPABASE_URL!;
    const anonKey = process.env.SUPABASE_ANON_KEY!;
    const serviceKey = process.env.SUPABASE_SERVICE_KEY!;

    if (!url || !anonKey || !serviceKey) {
      throw new Error('Faltan variables de entorno de Supabase');
    }

    const options = {
      auth: {
        persistSession: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 2,
        },
      },
      global: {
        headers: {},
      },
    };

    // @ts-ignore - Añadir WebSocket manualmente
    if (typeof globalThis.WebSocket === 'undefined') {
      // @ts-ignore
      globalThis.WebSocket = WebSocket;
    }

    this.client = createClient(url, anonKey, options);
    this.adminClient = createClient(url, serviceKey, options);

    console.log('✅ Supabase inicializado con ws');
  }

  public static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }
}

export const supabase = SupabaseService.getInstance().client;
export const supabaseAdmin = SupabaseService.getInstance().adminClient;
