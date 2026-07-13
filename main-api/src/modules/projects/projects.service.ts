import type { HandlerContext } from "../../lib/utils/handler.dto";
import {
  ProjectsHandler,
  type ProjectScope,
} from "./handlers/projects.handler";
import type { ProjectCommand, ProjectListQuery } from "./projects.dto";

export type { ProjectScope } from "./handlers/projects.handler";

export class ProjectsService {
  private readonly handler: ProjectsHandler;

  constructor(context: HandlerContext) {
    this.handler = new ProjectsHandler(context);
  }

  finalize(
    scope: ProjectScope,
    expectedCompanyId: string,
    key: string,
    command: ProjectCommand,
  ) {
    return this.handler.finalize(scope, expectedCompanyId, key, command);
  }

  list(scope: ProjectScope, query: ProjectListQuery) {
    return this.handler.list(scope, query);
  }

  detail(scope: ProjectScope, projectId: string) {
    return this.handler.detail(scope, projectId);
  }
}
