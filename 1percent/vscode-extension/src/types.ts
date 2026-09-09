/* ============================================================
   Types — 1% Learn VS Code Extension
   ============================================================ */

export interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  challenge_type: string;
  coins_reward: number;
  expected_output: string;
  starter_code: string;
  course_id: string | null;
}

export interface FileItem {
  id: string;
  file_name: string;
  file_size: number;
  language: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface PremiumStatus {
  tier: {
    slug: string;
    name: string;
    price_usd: number;
    daily_downloads: number;
    full_course_download: boolean;
  };
  subscription: any;
  downloads_today: number;
  daily_limit: number;
  downloads_remaining: number;
  can_download: boolean;
  can_download_course: boolean;
}

export interface SubmissionResult {
  passed: boolean;
  output?: string;
  expected?: string;
  error?: string;
  coins_earned?: number;
}
