import { Button } from "@/components/ui/button";
import { createJobRoleAction, deactivateJobRoleAction, renameJobRoleAction } from "./job-roles.actions";

export function JobRolesSettings({ roles }: { roles: Array<{ id: string; name: string; isActive: boolean }> }) {
  return <section className="rounded-lg border border-border bg-card p-5" aria-labelledby="job-roles-title">
    <h2 id="job-roles-title" className="text-lg font-bold">Funções da empresa</h2>
    <p className="mt-1 text-sm text-muted-foreground">A função é definida no vínculo do funcionário e confirmada na alocação da obra.</p>
    <form action={createJobRoleAction} className="mt-4 flex gap-2">
      <input name="name" required maxLength={120} placeholder="Ex.: Operador de máquina" className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm" />
      <Button type="submit">Adicionar</Button>
    </form>
    <ul className="mt-4 divide-y rounded-md border">
      {roles.map((role) => <li key={role.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm"><form action={renameJobRoleAction} className="flex flex-1 gap-2"><input type="hidden" name="jobRoleId" value={role.id} /><input name="name" defaultValue={role.name} disabled={!role.isActive} className="h-9 flex-1 rounded border px-2" /><Button type="submit" size="sm" variant="outline" disabled={!role.isActive}>Renomear</Button></form>{role.isActive && <form action={deactivateJobRoleAction}><input type="hidden" name="jobRoleId" value={role.id} /><Button type="submit" variant="outline" size="sm">Desativar</Button></form>}</li>)}
    </ul>
  </section>;
}
