export type ApiSuccess<T> = { success: true; data: T };
export type ApiError = {
  success: false;
  error: { code: string; message: string; details?: unknown };
};

export const ok = <T>(data: T): ApiSuccess<T> => ({ success: true, data });

export const fail = (code: string, message: string, details?: unknown): ApiError => ({
  success: false,
  error: { code, message, details },
});
