import axios from "axios";

import { API_URL } from "@/lib/api/config";
import {
  clearMobileTokens,
  getRefreshToken,
  saveMobileTokens,
} from "@/lib/auth/token-store";
import type { ApiSuccessResponse } from "@/types/api";
import type { MobileAuthData } from "@/types/auth";

export const restoreMobileSession =
  async (): Promise<MobileAuthData | null> => {
    const refreshToken = await getRefreshToken();

    if (!refreshToken) {
      return null;
    }

    try {
      const { data } = await axios.post<ApiSuccessResponse<MobileAuthData>>(
        `${API_URL}/auth/mobile/refresh`,
        {
          refreshToken,
        },
      );

      await saveMobileTokens(data.data.accessToken, data.data.refreshToken);

      return data.data;
    } catch (error) {
      await clearMobileTokens();

      throw error;
    }
  };
