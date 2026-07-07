/**
 * Arquivo principal do pacote n8n-nodes-rd-station-crm
 * Este arquivo exporta todos os nós e credenciais para o n8n
 *
 * IMPORTANTE: Este arquivo deve exportar nodeTypes e credentialTypes
 * como arrays de classes para que o n8n possa carregá-los corretamente
 */

// Importação das credenciais
import { RdStationCrmApi } from "./credentials/RdStationCrmApi.credentials";

// Importação de todos os nós do RD Station CRM
import { RdStationCrmContacts } from "./nodes/RdStationCrmContacts.node";
import { RdStationCrmDeals } from "./nodes/RdStationCrmDeals.node";
import { RdStationCrmTasks } from "./nodes/RdStationCrmTasks.node";
import { RdStationCrmNotes } from "./nodes/RdStationCrmNotes.node";
import { RdStationCrmCompanies } from "./nodes/RdStationCrmCompanies.node";
import { RdStationCrmDealProducts } from "./nodes/RdStationCrmDealProducts.node";
import { RdStationCrmUsers } from "./nodes/RdStationCrmUsers.node";
import { RdStationCrmTeams } from "./nodes/RdStationCrmTeams.node";
import { RdStationCrmPipelines } from "./nodes/RdStationCrmPipelines.node";
import { RdStationCrmLossReasons } from "./nodes/RdStationCrmLossReasons.node";
import { RdStationCrmCampaigns } from "./nodes/RdStationCrmCampaigns.node";
import { RdStationCrmSources } from "./nodes/RdStationCrmSources.node";
import { RdStationCrmWebhooks } from "./nodes/RdStationCrmWebhooks.node";

// Array com todas as classes de nós disponíveis
// O n8n usa este array para registrar os nós no sistema
const nodeTypes = [
  RdStationCrmContacts,
  RdStationCrmDeals,
  RdStationCrmTasks,
  RdStationCrmNotes,
  RdStationCrmCompanies,
  RdStationCrmDealProducts,
  RdStationCrmUsers,
  RdStationCrmTeams,
  RdStationCrmPipelines,
  RdStationCrmLossReasons,
  RdStationCrmCampaigns,
  RdStationCrmSources,
  RdStationCrmWebhooks,
];

// Array com todas as classes de credenciais disponíveis
// O n8n usa este array para registrar as credenciais no sistema
const credentialTypes = [RdStationCrmApi];

// Exportação das constantes para o n8n
export { nodeTypes, credentialTypes };
