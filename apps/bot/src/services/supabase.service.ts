import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { WebSocket } from 'ws';

dotenv.config({ path: resolve(__dirname, '../../.env') });

// Polyfill para WebSocket en Node 20
if (typeof global.WebSocket === 'undefined') {
  (global as any).WebSocket = WebSocket;
}

export class SupabaseService {
  private static instance: SupabaseService;
  public client: SupabaseClient;
  public adminClient: SupabaseClient;

  private constructor() {
    const url = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!url || !anonKey || !serviceKey) {
      throw new Error('Faltan variables de entorno de Supabase');
    }

    const options = {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    };

    this.client = createClient(url, anonKey, options);
    this.adminClient = createClient(url, serviceKey, options);

    console.log('✅ Supabase inicializado correctamente');
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
