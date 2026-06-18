type CursorInput<T> = {
  data: T[];
  take: number;
  getCursor: (item: T) => Record<string, unknown>;
};

type CursorOutput<T> = {
  data: T[];
  hasNextPage: boolean;
  length: number;
  nextCursor: string | null;
};

export const encodeCursor = (cursor: Record<string, unknown>) => {
  return Buffer.from(JSON.stringify(cursor)).toString("base64");
};

export const decodeCursor = <T = unknown>(cursor: string): T => {
  return JSON.parse(Buffer.from(cursor, "base64").toString("utf-8"));
};

export const buildCursorPagination = <T>({
  data,
  take,
  getCursor,
}: CursorInput<T>): CursorOutput<T> => {
  const hasNextPage = data.length > take;

  const slicedData = hasNextPage ? data.slice(0, take) : data;

  if (slicedData.length === 0) {
    return {
      data: [],
      hasNextPage: false,
      nextCursor: null,
      length: 0,
    };
  }

  const lastItem = slicedData[slicedData.length - 1];

  const nextCursor = hasNextPage ? encodeCursor(getCursor(lastItem)) : null;

  return {
    data: slicedData,
    hasNextPage,
    nextCursor,
    length: slicedData.length,
  };
};

export const isValidCursor = (value: string): boolean => {
  try {
    const decoded = Buffer.from(value, "base64").toString("utf8");

    const reEncoded = Buffer.from(decoded, "utf8").toString("base64");

    if (reEncoded !== value) {
      return false;
    }

    JSON.parse(decoded);

    return true;
  } catch {
    return false;
  }
};
