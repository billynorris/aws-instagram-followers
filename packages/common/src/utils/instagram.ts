import axios from 'axios';
import { InstagramAPIError } from '../types/errors';

export const refreshAccessToken = async (
  accessToken: string
): Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
}> => {
  try {
    const response = await axios.get('https://graph.instagram.com/refresh_access_token', {
      params: {
        grant_type: 'ig_refresh_token',
        access_token: accessToken,
      },
    });
    return response.data;
  } catch (error) {
    throw new InstagramAPIError('Failed to refresh token', { error });
  }
};

export const getFollowerCount = async (accessToken: string): Promise<number> => {
  try {
    const response = await axios.get('https://graph.instagram.com/me', {
      params: {
        fields: 'followers_count',
        access_token: accessToken,
      },
    });
    return response.data.followers_count;
  } catch (error) {
    throw new InstagramAPIError('Failed to fetch follower count', { error });
  }
};
