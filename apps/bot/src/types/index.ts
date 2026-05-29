export interface User {
  id: string;
  bet_id: string;
  phone: string;
  telegram_id?: number;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface Recharge {
  id: string;
  user_id: string;
  bet_id: string;
  amount: number;
  amount_transferred: number;
  receipt_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface Setting {
  id: number;
  key: string;
  value: string;
  updated_at: string;
}

export interface BotSession {
  telegram_id: number;
  session_data: {
    step?: string;
    tempData?: Record<string, any>;
  };
  updated_at: string;
}

export interface ActivityLog {
  id: number;
  user_id?: string;
  action: string;
  details?: Record<string, any>;
  created_at: string;
}
