export type AppMode = 'demo' | 'production';

export const APP_MODE: AppMode =
  process.env.NEXT_PUBLIC_APP_MODE === 'production' ? 'production' : 'demo';

export const isDemoMode = (): boolean => APP_MODE === 'demo';
export const isProductionMode = (): boolean => APP_MODE === 'production';
