import { AppError } from "../../lib/utils/appError";
import { HandlerContext } from "../../lib/utils/handler.dto";
import { getUserHandler } from "../user/handlers/user.handler";
import { verifySaltHash } from "../../lib/utils/utils";

export class AuthService {
  constructor(private readonly context: HandlerContext) {}

  public async verifyUserLogin({
    password,
    username,
  }: {
    username: string;
    password: string;
  }) {
    try {
      const {
        data: { password: userPass, ...restUser },
      } = await getUserHandler({
        context: this.context,
        select: { username: true, password: true, id: true },
        where: {
          username: username,
        },
      });

      if (!(await verifySaltHash({ hashed: userPass, value: password }))) {
        throw new AppError({
          code: "UNAUTHORIZED",
          message: "Usuario ou senha invalidos",
          statusCode: 401,
        });
      }

      return restUser;
    } catch {
      throw new AppError({
        code: "UNAUTHORIZED",
        message: "Usuario ou senha invalidos",
        statusCode: 401,
      });
    }
  }
}
