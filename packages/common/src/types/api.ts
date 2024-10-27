export interface APIResponse {
  statusCode: number;
  body: string;
  headers: {
    [key: string]: string | number | boolean;
  };
}
