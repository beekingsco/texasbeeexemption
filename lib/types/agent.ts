export interface Agent {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  brokerage: string;
  phone: string;
  licenseNumber: string;
  logoUrl?: string;
  subdomain?: string;
  licensedCounties: string[]; // e.g. ["TX-Van Zandt", "TX-Henderson"]
  lastCountyChange?: string; // ISO date of last county swap
  createdAt: string;
  subscription?: {
    status: 'trial' | 'active' | 'cancelled';
    stripeCustomerId?: string;
    currentPeriodEnd?: string;
  };
}

export interface AgentLead {
  id: string;
  agentId: string;
  propertyAddress: string;
  county: string;
  state: string;
  ownerName?: string;
  acres: number;
  appraisedValue: number;
  estimatedSavings: number;
  status: 'new' | 'contacted' | 'client' | 'closed';
  notes?: string;
  reportUrl?: string;
  createdAt: string;
}
