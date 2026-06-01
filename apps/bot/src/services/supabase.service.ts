import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import ws from 'ws';

dotenv.config({ path: resolve(__dirname, '../../.env') });

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

    // Configuración con WebSocket para Node.js 20
    const supabaseOptions = {
      auth: {
        persistSession: false,
      },
      global: {
        fetch: fetch.bind(globalThis),
      },
      realtime: {
        transport: ws as any,
      },
    };

    this.client = createClient(url, anonKey, supabaseOptions);
    this.adminClient = createClient(url, serviceKey, supabaseOptions);
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
