export interface PlanItem {
  date: string;
  tooth: string;
  treatment: string;
  cost: number | string;
  paid: number | string;
  remaining: number | string;
  doctor: string;
}

export interface DentalRecord {
  id: number;
  name: string;
  phone: string;
  address: string;
  dob: string; // Age (Tuổi)
  visitDate: string;
  appointment: string;
  plan: PlanItem[];
}

export interface SessionInfo {
  isLoggedIn: boolean;
  expireAt: number;
}
