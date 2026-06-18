import { Prisma } from "../../db/generated/prisma/client";
import { IViewEntityHandler } from "../../lib/utils/handler.dto";

export interface IViewUser<
  S extends Prisma.UserSelect,
> extends IViewEntityHandler<Prisma.UserWhereUniqueInput> {
  select: S;
}
