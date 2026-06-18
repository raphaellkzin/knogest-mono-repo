import { PrismaClient } from "../../db/generated/prisma/client";

export interface HandlerContext {
  prisma: PrismaClient;
}

export interface ICreateEntityHandler<T> {
  data: T;
  context: HandlerContext;
}

export interface IUpdateEntityHandler<T, Y> {
  data: T;
  where: Y;
  context: HandlerContext;
}
export interface IViewEntityHandler<T> {
  context: HandlerContext;
  where: T;
}

export interface IListEntitiesHandler<T> {
  context: HandlerContext;
  cursor?:
    | {
        id: string;
        createdAt: string;
      }
    | string;
  where?: T;
  limit?: number;
  orderBy?: "asc" | "desc";
}

export interface IPaginatedResult<T> {
  data: T[];
  hasNextPage: boolean;
  nextCursor: {
    id: string;
    createdAt: string;
  } | null;
}
