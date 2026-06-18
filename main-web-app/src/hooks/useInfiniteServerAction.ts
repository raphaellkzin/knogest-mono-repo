/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useCallback, useTransition } from "react";
import type {
  IActionResponse,
  ICursorPaginationData,
} from "@/actions/actions.helper";

interface PaginatedData<TItem> extends ICursorPaginationData {
  data?: TItem[];
}

interface UseInfiniteServerActionOptions<TItem, TParams> {
  initialData: PaginatedData<TItem>;
  fetchAction: (
    params: TParams,
  ) => Promise<IActionResponse<PaginatedData<TItem> | undefined | null>>;
  baseParams?: Omit<TParams, "cursor">;
}

interface UseInfiniteServerActionReturn<TItem> {
  /** Itens da pagina atual. Ideal para tabelas paginadas por cursor. */
  items: TItem[];
  /** Pagina atual em indice zero. */
  currentPage: number;
  /** Pode ir para a proxima pagina. */
  hasNextPage: boolean;
  /** Pode voltar para a pagina anterior ja carregada. */
  hasPreviousPage: boolean;
  /** Indica chamada pendente para a Server Action. */
  isLoading: boolean;
  /** Vai para a proxima pagina e busca do servidor apenas quando ela ainda nao esta em cache. */
  goToNextPage: () => void;
  /** Volta para a pagina anterior sem refetch. */
  goToPreviousPage: () => void;
  /** Reseta a lista e reexecuta a Server Action da primeira pagina. */
  reset: (newInitialData?: PaginatedData<TItem>) => void;
}

export function useInfiniteServerAction<
  TItem,
  TParams extends Record<string, any>,
>({
  initialData,
  fetchAction,
  baseParams,
}: UseInfiniteServerActionOptions<
  TItem,
  TParams
>): UseInfiniteServerActionReturn<TItem> {
  const [pages, setPages] = useState<PaginatedData<TItem>[]>([initialData]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isPending, startTransition] = useTransition();

  const page = pages[currentPage];
  const items = page?.data ?? [];
  const isLastLoadedPage = currentPage === pages.length - 1;
  const hasNextPage = isLastLoadedPage ? (page?.hasNextPage ?? false) : true;
  const hasPreviousPage = currentPage > 0;

  const goToNextPage = useCallback(() => {
    if (isPending) return;

    if (currentPage < pages.length - 1) {
      setCurrentPage((prev) => prev + 1);
      return;
    }

    const cursor = page?.nextCursor;
    if (!cursor) return;

    startTransition(async () => {
      const params = { ...baseParams, cursor } as unknown as TParams;

      const response = await fetchAction(params);

      if (response.success && response.data) {
        setPages(
          (prev) =>
            [...prev, response.data].filter(Boolean) as PaginatedData<TItem>[],
        );
        setCurrentPage((prev) => prev + 1);
      }
    });
  }, [fetchAction, baseParams, isPending, currentPage, pages.length, page]);

  const goToPreviousPage = useCallback(() => {
    if (currentPage > 0) {
      setCurrentPage((prev) => prev - 1);
    }
  }, [currentPage]);

  const reset = useCallback(
    async (newInitialData?: PaginatedData<TItem>) => {
      setPages([newInitialData ?? { data: [], hasNextPage: false }]);
      setCurrentPage(0);

      startTransition(async () => {
        const params = { ...baseParams } as TParams;
        const response = await fetchAction(params);

        if (response.success && response.data) {
          setPages([response.data]);
          setCurrentPage(0);
        }
      });
    },
    [fetchAction, baseParams, startTransition],
  );

  return {
    items,
    currentPage,
    hasNextPage,
    hasPreviousPage,
    isLoading: isPending,
    goToNextPage,
    goToPreviousPage,
    reset,
  };
}
