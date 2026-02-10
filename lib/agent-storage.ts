import { del } from '@vercel/blob';
import { blobPut, blobRead } from './blob-helpers';
import { Agent, AgentLead } from './types/agent';

const AGENTS_BLOB_PATH = 'agents/agents.json';
const LEADS_BLOB_PATH_PREFIX = 'agents/leads/';

// Helper to get agents data
export async function getAgents(): Promise<Agent[]> {
  try {
    const data = await blobRead<{ agents: Agent[] }>('agents/agents');
    return data?.agents || [];
  } catch (error) {
    console.error('Error fetching agents:', error);
    return [];
  }
}

// Helper to save agents data
export async function saveAgents(agents: Agent[]): Promise<void> {
  const blob = await blobPut(AGENTS_BLOB_PATH, JSON.stringify({ agents }, null, 2));
  console.log('Agents saved to blob:', blob.url);
}

// Helper to get agent by email
export async function getAgentByEmail(email: string): Promise<Agent | null> {
  const agents = await getAgents();
  return agents.find(a => a.email.toLowerCase() === email.toLowerCase()) || null;
}

// Helper to get agent by ID
export async function getAgentById(id: string): Promise<Agent | null> {
  const agents = await getAgents();
  return agents.find(a => a.id === id) || null;
}

// Helper to create new agent
export async function createAgent(agent: Agent): Promise<Agent> {
  const agents = await getAgents();
  agents.push(agent);
  await saveAgents(agents);
  return agent;
}

// Helper to update agent
export async function updateAgent(id: string, updates: Partial<Agent>): Promise<Agent | null> {
  const agents = await getAgents();
  const index = agents.findIndex(a => a.id === id);
  if (index === -1) return null;
  
  agents[index] = { ...agents[index], ...updates };
  await saveAgents(agents);
  return agents[index];
}

// Helper to get leads for an agent
export async function getAgentLeads(agentId: string): Promise<AgentLead[]> {
  try {
    const data = await blobRead<{ leads: AgentLead[] }>(`${LEADS_BLOB_PATH_PREFIX}${agentId}`);
    return data?.leads || [];
  } catch (error) {
    console.error('Error fetching agent leads:', error);
    return [];
  }
}

// Helper to save leads for an agent
export async function saveAgentLeads(agentId: string, leads: AgentLead[]): Promise<void> {
  const blob = await blobPut(`${LEADS_BLOB_PATH_PREFIX}${agentId}.json`, JSON.stringify({ leads }, null, 2));
  console.log('Leads saved to blob:', blob.url);
}

// Helper to add a lead
export async function addAgentLead(agentId: string, lead: AgentLead): Promise<AgentLead> {
  const leads = await getAgentLeads(agentId);
  leads.push(lead);
  await saveAgentLeads(agentId, leads);
  return lead;
}

// Helper to update a lead
export async function updateAgentLead(agentId: string, leadId: string, updates: Partial<AgentLead>): Promise<AgentLead | null> {
  const leads = await getAgentLeads(agentId);
  const index = leads.findIndex(l => l.id === leadId);
  if (index === -1) return null;
  
  leads[index] = { ...leads[index], ...updates };
  await saveAgentLeads(agentId, leads);
  return leads[index];
}

// Helper to delete a lead
export async function deleteAgentLead(agentId: string, leadId: string): Promise<boolean> {
  const leads = await getAgentLeads(agentId);
  const filteredLeads = leads.filter(l => l.id !== leadId);
  if (filteredLeads.length === leads.length) return false;
  
  await saveAgentLeads(agentId, filteredLeads);
  return true;
}
