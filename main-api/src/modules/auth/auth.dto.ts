import z from "zod";

export const loginRequestSchema = z.object({
  email: z.string().trim().min(3).max(254),
  password: z.string().min(1),
});

export type ILoginRequest = z.infer<typeof loginRequestSchema>;

export const selectCompanyRequestSchema = z.object({
  companyId: z.string().uuid(),
});

export type ISelectCompanyRequest = z.infer<typeof selectCompanyRequestSchema>;
