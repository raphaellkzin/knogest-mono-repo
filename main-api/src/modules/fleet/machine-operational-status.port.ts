export interface MachineOperationalStatus {
  hasOpenShift: boolean;
  hasPendingFinalReading: boolean;
}

export interface MachineOperationalStatusPort {
  getStatus(input: {
    corporationId: string;
    companyId: string;
    machineId: string;
  }): Promise<MachineOperationalStatus>;
}

export class MvpMachineOperationalStatusPort
  implements MachineOperationalStatusPort
{
  async getStatus(): Promise<MachineOperationalStatus> {
    return { hasOpenShift: false, hasPendingFinalReading: false };
  }
}
