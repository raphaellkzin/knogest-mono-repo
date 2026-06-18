/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  useState,
  useCallback,
  useTransition,
  useMemo,
  useEffect,
  useRef,
} from "react";
import type { IActionResponse } from "@/actions/actions.helper";

const PAGINATION_KEYS = [
  "data",
  "hasNextPage",
  "nextCursor",
  "prevCursor",
  "length",
] as const;
type PaginationKeys = (typeof PAGINATION_KEYS)[number];

type CleanResponse<T> = NonNullable<T>;
type ExtractItem<T> = CleanResponse<T> extends { data?: (infer U)[] } ? U : any;
type ExtractAvulse<T> = Omit<CleanResponse<T>, PaginationKeys>;

interface UseVirtualPaginationOptions<TParams, TResponse> {
  initialData?: TResponse;
  fetchAction: (
    params: TParams,
  ) => Promise<IActionResponse<TResponse | undefined | null>>;
  baseParams?: Omit<TParams, "cursor">;
  pageSize: number;
}

interface UseVirtualPaginationReturn<TItem, TAvulse> {
  /** Janela visivel. Ideal para cards, listas e rolagem infinita controlada. */
  visibleItems: TItem[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  isLoading: boolean;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  reset: (newInitialData?: any) => void;
  avulse: TAvulse;
}

export function useVirtualPagination<
  TParams extends Record<string, any>,
  TResponse extends { data?: any[] } & Record<string, any>,
>({
  initialData,
  fetchAction,
  baseParams,
  pageSize,
}: UseVirtualPaginationOptions<TParams, TResponse>): UseVirtualPaginationReturn<
  ExtractItem<TResponse>,
  ExtractAvulse<TResponse>
> {
  type TItem = ExtractItem<TResponse>;
  type TAvulse = ExtractAvulse<TResponse>;

  const [serverPages, setServerPages] = useState<TResponse[]>(
    initialData ? [initialData] : [],
  );
  const [displayOffset, setDisplayOffset] = useState(0);
  const [isPending, startTransition] = useTransition();
  const hasFetchedInitial = useRef(!!initialData);

  const [prevInitialData, setPrevInitialData] = useState(initialData);

  if (initialData !== prevInitialData) {
    setPrevInitialData(initialData);

    if (initialData) {
      setServerPages([initialData]);
      setDisplayOffset(0);
    }
  }

  useEffect(() => {
    if (hasFetchedInitial.current) return;
    hasFetchedInitial.current = true;

    startTransition(async () => {
      const params = { ...baseParams } as unknown as TParams;
      const response = await fetchAction(params);

      if (response.success && response.data) {
        setServerPages([response.data as TResponse]);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const allItems = useMemo(
    () => serverPages.flatMap((page) => (page.data ?? []) as TItem[]),
    [serverPages],
  );

  const lastServerPage = serverPages[serverPages.length - 1];
  const serverHasMore = lastServerPage?.hasNextPage ?? false;

  const visibleItems = allItems.slice(displayOffset, displayOffset + pageSize);

  const hasNextPage =
    displayOffset + pageSize < allItems.length || serverHasMore;
  const hasPreviousPage = displayOffset > 0;

  const avulse = useMemo(() => {
    const result = {} as Record<string, any>;

    if (!lastServerPage) return result as TAvulse;

    Object.keys(lastServerPage).forEach((key) => {
      if (!PAGINATION_KEYS.includes(key as any)) {
        result[key] = lastServerPage[key];
      }
    });

    return result as TAvulse;
  }, [lastServerPage]);

  const goToNextPage = useCallback(() => {
    if (isPending) return;

    const nextOffset = displayOffset + pageSize;
    const itemsNeeded = nextOffset + pageSize;
    const haveEnough = allItems.length >= itemsNeeded || !serverHasMore;

    if (haveEnough) {
      setDisplayOffset(nextOffset);
      return;
    }

    const cursor = lastServerPage?.nextCursor;

    startTransition(async () => {
      const params = {
        ...baseParams,
        cursor,
      } as unknown as TParams;

      const response = await fetchAction(params);

      if (response.success && response.data) {
        setServerPages((prev) => [...prev, response.data as TResponse]);
      }

      setDisplayOffset(nextOffset);
    });
  }, [
    isPending,
    displayOffset,
    pageSize,
    allItems.length,
    serverHasMore,
    lastServerPage,
    baseParams,
    fetchAction,
  ]);

  const goToPreviousPage = useCallback(() => {
    if (displayOffset <= 0) return;
    setDisplayOffset((prev) => Math.max(0, prev - pageSize));
  }, [displayOffset, pageSize]);

  const reset = useCallback(
    (newInitialData?: TResponse) => {
      if (isPending) return;

      if (newInitialData) {
        setServerPages([newInitialData]);
        setDisplayOffset(0);
        return;
      }

      let itemsCount = 0;
      const pagesToKeep: TResponse[] = [];

      for (const page of serverPages) {
        const pageLength = page.data?.length ?? 0;

        if (itemsCount + pageLength <= displayOffset) {
          pagesToKeep.push(page);
          itemsCount += pageLength;
        } else {
          break;
        }
      }

      const lastKeptPage = pagesToKeep[pagesToKeep.length - 1];
      const cursor = lastKeptPage?.nextCursor;

      setServerPages(pagesToKeep);
      setDisplayOffset(itemsCount);

      startTransition(async () => {
        const params = { ...baseParams } as Record<string, any>;
        if (cursor) {
          params.cursor = cursor;
        }

        const response = await fetchAction(params as TParams);

        if (response.success && response.data) {
          setServerPages((prev) => [...prev, response.data as TResponse]);
        }
      });
    },
    [isPending, serverPages, displayOffset, baseParams, fetchAction],
  );

  return {
    visibleItems,
    hasNextPage,
    hasPreviousPage,
    isLoading: isPending,
    goToNextPage,
    goToPreviousPage,
    reset,
    avulse,
  };
}
