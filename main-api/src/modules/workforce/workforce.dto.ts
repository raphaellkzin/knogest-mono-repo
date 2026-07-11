import { z } from "zod";

const optionalSearch = z
  .string()
  .trim()
  .max(120)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

export const createEmployeeSchema = z
  .object({
    document: z.string().trim().min(1).max(32),
    fullName: z.string().trim().min(1).max(180),
    companyRegistrationNumber: z.string().trim().min(1).max(80),
    admissionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    jobRoleId: z.string().uuid(),
  })
  .strict();

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

export const createJobRoleSchema = z
  .object({ name: z.string().trim().min(1).max(120).refine((name) => name.normalize("NFC").toLocaleLowerCase("pt-BR").length <= 120, "Normalized name is too long") })
  .strict();
export type CreateJobRoleInput = z.infer<typeof createJobRoleSchema>;

export const updateJobRoleSchema = z
  .object({ name: z.string().trim().min(1).max(120).refine((name) => name.normalize("NFC").toLocaleLowerCase("pt-BR").length <= 120, "Normalized name is too long").optional(), isActive: z.boolean().optional() })
  .strict()
  .refine((value) => value.name !== undefined || value.isActive !== undefined);
export type UpdateJobRoleInput = z.infer<typeof updateJobRoleSchema>;

export const changeEmployeeJobRoleSchema = z
  .object({ jobRoleId: z.string().uuid(), reason: z.string().trim().min(1).max(240) })
  .strict();
export type ChangeEmployeeJobRoleInput = z.infer<typeof changeEmployeeJobRoleSchema>;

export const rehireEmployeeSchema = z.object({}).strict();

export type RehireEmployeeInput = z.infer<typeof rehireEmployeeSchema>;

export const listEmployeesQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(25),
    cursor: z.string().trim().min(1).max(2048).optional(),
    search: optionalSearch,
    state: z.enum(["active", "terminated"]).optional(),
    availability: z.enum(["available"]).optional(),
    sortBy: z.enum(["name", "createdAt"]).default("createdAt"),
    sortDirection: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict();

export type ListEmployeesQuery = z.infer<typeof listEmployeesQuerySchema>;
