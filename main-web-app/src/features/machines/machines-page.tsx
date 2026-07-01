import { createMachineAction } from "./machines.actions";
import { getInitialMachineActionState } from "./machines-action-state";
import {
  getMachinesList,
  parseMachinesSearchParams,
} from "./machines.server";
import { MachinesPageView } from "./components/machines-page";

export async function MachinesPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const query = parseMachinesSearchParams(searchParams);
  const page = await getMachinesList(query);
  return (
    <MachinesPageView
      action={createMachineAction}
      initialState={getInitialMachineActionState()}
      pageInfo={page.pageInfo}
      query={query}
      rows={page.data}
    />
  );
}
