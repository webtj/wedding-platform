import { LEAD_STATUS, PROJECT_STATUS, CONTRACT_STATUS, TASK_STATUS, ASSET_STATUS } from './business';

export const LEAD_STATUSES = Object.values(LEAD_STATUS) as readonly string[];

export const PROJECT_STATUSES = Object.values(PROJECT_STATUS) as readonly string[];

export const CONTRACT_STATUSES = Object.values(CONTRACT_STATUS) as readonly string[];

export const TASK_STATUSES = Object.values(TASK_STATUS) as readonly string[];

export const ASSET_STATUSES = Object.values(ASSET_STATUS) as readonly string[];
