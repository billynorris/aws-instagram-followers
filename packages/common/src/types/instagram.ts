export interface InstagramAuthResponse {
  access_token: string;
  user_id: string;
}

export interface InstagramUser {
  id: string;
  username: string;
  followers_count: number;
}