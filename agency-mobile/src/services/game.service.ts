import { getApiBaseUrl } from '../config/api';
import { authService } from './auth.service';

export interface PredictionData {
  roundId: string | null;
  phase: 'betting' | 'running' | 'crashed';
  currentCrashPoint: string | null;
  targetCrashPoint: string | null;
  nextQueuedCrashPoint: string | null;
  liveMultiplier: string;
  history: Array<{ roundId: string; crashPoint: string; crashedAt: string }>;
  timestamp: string;
}

export const gameService = {
  async getPrediction(): Promise<PredictionData> {
    const baseUrl = await getApiBaseUrl();
    const token = await authService.getToken();
    const endpoint = `${baseUrl.replace(/\/+$/, '')}/game/prediction`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token ?? ''}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch prediction (${response.status})`);
    }

    return (await response.json()) as PredictionData;
  },
};
