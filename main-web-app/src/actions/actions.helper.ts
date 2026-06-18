import "server-only";

export type IActionResponse<T> =
  | { success: true; data: T }
  | { success: false; message: string; data: null };

export interface ICursorPaginationData {
  hasNextPage?: boolean;
  nextCursor?: string | null;
  length?: number | null;
}

export interface IPaginationParams {
  cursor?: string;
  limit?: number;
}

export const actionSuccess = <T>(data: T): IActionResponse<T> => ({
  success: true,
  data,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const actionError = (error: any): IActionResponse<null> => {
  let message =
    error.response?.data.message ||
    error.data?.message ||
    error.message ||
    "Não foi possível completar a ação";
  if (typeof error === "string") message = error;
  return {
    success: false,
    message,
    data: null,
  };
};
