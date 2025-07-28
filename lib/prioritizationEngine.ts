export interface PrioritizationCriteria {
  id: string;
  name: string;
  description: string;
  category: 'client' | 'worker' | 'task' | 'constraint';
  weight: number;
  minWeight: number;
  maxWeight: number;
  unit?: string;
}

export interface PrioritizationProfile {
  id: string;
  name: string;
  description: string;
  criteria: PrioritizationCriteria[];
  isCustom: boolean;
}

export interface PairwiseComparison {
  criterion1: string;
  criterion2: string;
  value: number; // 1-9 scale where 1 = equal, 9 = extremely more important
}

export interface PrioritizationConfig {
  profile: PrioritizationProfile;
  pairwiseComparisons: PairwiseComparison[];
  consistencyRatio: number;
  isValid: boolean;
  exportData: {
    clients: any[];
    workers: any[];
    tasks: any[];
    rules: any[];
    prioritization: any;
  };
}

// Default criteria for resource allocation
export const defaultCriteria: PrioritizationCriteria[] = [
  {
    id: 'client_priority',
    name: 'Client Priority Level',
    description: 'Importance of client priority levels (1-5)',
    category: 'client',
    weight: 0.3,
    minWeight: 0,
    maxWeight: 1,
    unit: 'weight'
  },
  {
    id: 'task_fulfillment',
    name: 'Task Request Fulfillment',
    description: 'Percentage of requested tasks that get allocated',
    category: 'client',
    weight: 0.25,
    minWeight: 0,
    maxWeight: 1,
    unit: 'percentage'
  },
  {
    id: 'worker_fairness',
    name: 'Worker Fairness',
    description: 'Equal distribution of workload across workers',
    category: 'worker',
    weight: 0.2,
    minWeight: 0,
    maxWeight: 1,
    unit: 'fairness_score'
  },
  {
    id: 'skill_match',
    name: 'Skill Matching',
    description: 'Quality of skill alignment between tasks and workers',
    category: 'task',
    weight: 0.15,
    minWeight: 0,
    maxWeight: 1,
    unit: 'match_score'
  },
  {
    id: 'phase_efficiency',
    name: 'Phase Efficiency',
    description: 'Optimal utilization of available phases',
    category: 'constraint',
    weight: 0.1,
    minWeight: 0,
    maxWeight: 1,
    unit: 'efficiency_score'
  },
  {
    id: 'cost_minimization',
    name: 'Cost Minimization',
    description: 'Minimize overall allocation cost',
    category: 'constraint',
    weight: 0.1,
    minWeight: 0,
    maxWeight: 1,
    unit: 'cost_units'
  },
  {
    id: 'deadline_adherence',
    name: 'Deadline Adherence',
    description: 'Meeting task completion deadlines',
    category: 'constraint',
    weight: 0.15,
    minWeight: 0,
    maxWeight: 1,
    unit: 'timeliness_score'
  },
  {
    id: 'resource_utilization',
    name: 'Resource Utilization',
    description: 'Maximize use of available resources',
    category: 'constraint',
    weight: 0.1,
    minWeight: 0,
    maxWeight: 1,
    unit: 'utilization_rate'
  }
];

// Preset profiles for different allocation strategies
export const presetProfiles: PrioritizationProfile[] = [
  {
    id: 'maximize_fulfillment',
    name: 'Maximize Fulfillment',
    description: 'Prioritize completing as many requested tasks as possible',
    criteria: [
      { ...defaultCriteria[0], weight: 0.2 }, // client_priority
      { ...defaultCriteria[1], weight: 0.4 }, // task_fulfillment
      { ...defaultCriteria[2], weight: 0.15 }, // worker_fairness
      { ...defaultCriteria[3], weight: 0.15 }, // skill_match
      { ...defaultCriteria[4], weight: 0.05 }, // phase_efficiency
      { ...defaultCriteria[5], weight: 0.05 }, // cost_minimization
      { ...defaultCriteria[6], weight: 0.1 }, // deadline_adherence
      { ...defaultCriteria[7], weight: 0.05 } // resource_utilization
    ],
    isCustom: false
  },
  {
    id: 'fair_distribution',
    name: 'Fair Distribution',
    description: 'Ensure equal workload distribution among workers',
    criteria: [
      { ...defaultCriteria[0], weight: 0.15 }, // client_priority
      { ...defaultCriteria[1], weight: 0.2 }, // task_fulfillment
      { ...defaultCriteria[2], weight: 0.35 }, // worker_fairness
      { ...defaultCriteria[3], weight: 0.15 }, // skill_match
      { ...defaultCriteria[4], weight: 0.05 }, // phase_efficiency
      { ...defaultCriteria[5], weight: 0.05 }, // cost_minimization
      { ...defaultCriteria[6], weight: 0.1 }, // deadline_adherence
      { ...defaultCriteria[7], weight: 0.05 } // resource_utilization
    ],
    isCustom: false
  },
  {
    id: 'minimize_workload',
    name: 'Minimize Workload',
    description: 'Reduce overall workload and resource usage',
    criteria: [
      { ...defaultCriteria[0], weight: 0.1 }, // client_priority
      { ...defaultCriteria[1], weight: 0.15 }, // task_fulfillment
      { ...defaultCriteria[2], weight: 0.2 }, // worker_fairness
      { ...defaultCriteria[3], weight: 0.1 }, // skill_match
      { ...defaultCriteria[4], weight: 0.15 }, // phase_efficiency
      { ...defaultCriteria[5], weight: 0.2 }, // cost_minimization
      { ...defaultCriteria[6], weight: 0.1 }, // deadline_adherence
      { ...defaultCriteria[7], weight: 0.2 } // resource_utilization
    ],
    isCustom: false
  },
  {
    id: 'quality_focused',
    name: 'Quality Focused',
    description: 'Prioritize high-quality matches and skill alignment',
    criteria: [
      { ...defaultCriteria[0], weight: 0.15 }, // client_priority
      { ...defaultCriteria[1], weight: 0.2 }, // task_fulfillment
      { ...defaultCriteria[2], weight: 0.15 }, // worker_fairness
      { ...defaultCriteria[3], weight: 0.3 }, // skill_match
      { ...defaultCriteria[4], weight: 0.1 }, // phase_efficiency
      { ...defaultCriteria[5], weight: 0.05 }, // cost_minimization
      { ...defaultCriteria[6], weight: 0.15 }, // deadline_adherence
      { ...defaultCriteria[7], weight: 0.1 } // resource_utilization
    ],
    isCustom: false
  },
  {
    id: 'balanced',
    name: 'Balanced Approach',
    description: 'Equal consideration of all factors',
    criteria: defaultCriteria.map(criterion => ({ ...criterion, weight: 1 / defaultCriteria.length })),
    isCustom: false
  }
];

// Pairwise comparison scale values
export const pairwiseScale = [
  { value: 1, label: 'Equal Importance' },
  { value: 2, label: 'Slightly More Important' },
  { value: 3, label: 'Moderately More Important' },
  { value: 4, label: 'More Important' },
  { value: 5, label: 'Much More Important' },
  { value: 6, label: 'Very Much More Important' },
  { value: 7, label: 'Extremely More Important' },
  { value: 8, label: 'Absolutely More Important' },
  { value: 9, label: 'Extremely More Important' }
];

// Generate all pairwise comparisons
export function generatePairwiseComparisons(criteria: PrioritizationCriteria[]): PairwiseComparison[] {
  const comparisons: PairwiseComparison[] = [];
  
  for (let i = 0; i < criteria.length; i++) {
    for (let j = i + 1; j < criteria.length; j++) {
      comparisons.push({
        criterion1: criteria[i].id,
        criterion2: criteria[j].id,
        value: 1 // Default to equal importance
      });
    }
  }
  
  return comparisons;
}

// Calculate weights from pairwise comparisons using AHP
export function calculateWeightsFromPairwise(comparisons: PairwiseComparison[], criteria: PrioritizationCriteria[]): number[] {
  const n = criteria.length;
  const matrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
  
  // Initialize diagonal with 1s
  for (let i = 0; i < n; i++) {
    matrix[i][i] = 1;
  }
  
  // Fill matrix with pairwise comparisons
  comparisons.forEach(comp => {
    const i = criteria.findIndex(c => c.id === comp.criterion1);
    const j = criteria.findIndex(c => c.id === comp.criterion2);
    
    if (i !== -1 && j !== -1) {
      matrix[i][j] = comp.value;
      matrix[j][i] = 1 / comp.value;
    }
  });
  
  // Calculate row sums
  const rowSums = matrix.map(row => row.reduce((sum, val) => sum + val, 0));
  const totalSum = rowSums.reduce((sum, val) => sum + val, 0);
  
  // Calculate weights
  const weights = rowSums.map(sum => sum / totalSum);
  
  return weights;
}

// Calculate consistency ratio for AHP
export function calculateConsistencyRatio(comparisons: PairwiseComparison[], criteria: PrioritizationCriteria[]): number {
  const n = criteria.length;
  const weights = calculateWeightsFromPairwise(comparisons, criteria);
  
  // Calculate weighted sum
  const matrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
  comparisons.forEach(comp => {
    const i = criteria.findIndex(c => c.id === comp.criterion1);
    const j = criteria.findIndex(c => c.id === comp.criterion2);
    
    if (i !== -1 && j !== -1) {
      matrix[i][j] = comp.value;
      matrix[j][i] = 1 / comp.value;
    }
  });
  
  const weightedSums = matrix.map((row, i) => 
    row.reduce((sum, val, j) => sum + val * weights[j], 0)
  );
  
  const lambdaMax = weightedSums.reduce((sum, val, i) => sum + val / weights[i], 0) / n;
  
  // Random Index values for different matrix sizes
  const randomIndex = [0, 0, 0.58, 0.9, 1.12, 1.24, 1.32, 1.41, 1.45, 1.49];
  
  const consistencyIndex = (lambdaMax - n) / (n - 1);
  const consistencyRatio = consistencyIndex / randomIndex[Math.min(n, randomIndex.length - 1)];
  
  return consistencyRatio;
}

// Normalize weights to sum to 1
export function normalizeWeights(weights: number[]): number[] {
  const sum = weights.reduce((total, weight) => total + weight, 0);
  return weights.map(weight => weight / sum);
}

// Validate prioritization configuration
export function validatePrioritization(config: PrioritizationConfig): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check if weights sum to 1 (with tolerance)
  const totalWeight = config.profile.criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
  if (Math.abs(totalWeight - 1) > 0.01) {
    errors.push(`Weights must sum to 1.0 (current sum: ${totalWeight.toFixed(3)})`);
  }
  
  // Check for negative weights
  const negativeWeights = config.profile.criteria.filter(criterion => criterion.weight < 0);
  if (negativeWeights.length > 0) {
    errors.push('All weights must be non-negative');
  }
  
  // Check consistency ratio for pairwise comparisons
  if (config.consistencyRatio > 0.1) {
    errors.push(`Consistency ratio (${config.consistencyRatio.toFixed(3)}) is too high. Consider revising pairwise comparisons.`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Create custom profile
export function createCustomProfile(name: string, description: string, criteria: PrioritizationCriteria[]): PrioritizationProfile {
  return {
    id: `custom_${Date.now()}`,
    name,
    description,
    criteria: criteria.map(criterion => ({ ...criterion })),
    isCustom: true
  };
}

// Export prioritization configuration
export function exportPrioritizationConfig(
  config: PrioritizationConfig,
  clients: any[],
  workers: any[],
  tasks: any[],
  rules: any[]
): PrioritizationConfig['exportData'] {
  return {
    clients: clients.map(client => ({
      ...client,
      // Add calculated priority score
      calculatedPriority: calculateClientPriority(client, config.profile.criteria)
    })),
    workers: workers.map(worker => ({
      ...worker,
      // Add calculated capacity score
      calculatedCapacity: calculateWorkerCapacity(worker, config.profile.criteria)
    })),
    tasks: tasks.map(task => ({
      ...task,
      // Add calculated complexity score
      calculatedComplexity: calculateTaskComplexity(task, config.profile.criteria)
    })),
    rules,
    prioritization: {
      profile: config.profile,
      pairwiseComparisons: config.pairwiseComparisons,
      consistencyRatio: config.consistencyRatio,
      criteria: config.profile.criteria,
      metadata: {
        generatedAt: new Date().toISOString(),
        version: '1.0',
        totalWeight: config.profile.criteria.reduce((sum, c) => sum + c.weight, 0)
      }
    }
  };
}

// Helper functions for calculating scores
function calculateClientPriority(client: any, criteria: PrioritizationCriteria[]): number {
  const priorityWeight = criteria.find(c => c.id === 'client_priority')?.weight || 0;
  const fulfillmentWeight = criteria.find(c => c.id === 'task_fulfillment')?.weight || 0;
  
  let score = 0;
  
  // Priority level score (1-5 scale)
  if (client.prioritylevel) {
    const priority = parseInt(client.prioritylevel);
    if (!isNaN(priority) && priority >= 1 && priority <= 5) {
      score += priorityWeight * (priority / 5);
    }
  }
  
  // Task fulfillment score (based on number of requested tasks)
  if (client.requestedtaskids) {
    const requestedTasks = client.requestedtaskids.split(',').filter((t: string) => t.trim());
    score += fulfillmentWeight * Math.min(requestedTasks.length / 5, 1); // Normalize to 0-1
  }
  
  return score;
}

function calculateWorkerCapacity(worker: any, criteria: PrioritizationCriteria[]): number {
  const fairnessWeight = criteria.find(c => c.id === 'worker_fairness')?.weight || 0;
  const utilizationWeight = criteria.find(c => c.id === 'resource_utilization')?.weight || 0;
  
  let score = 0;
  
  // Fairness score (based on available slots vs max load)
  if (worker.availableslots && worker.maxloadperphase) {
    try {
      const slots = JSON.parse(worker.availableslots);
      const maxLoad = parseInt(worker.maxloadperphase);
      
      if (Array.isArray(slots) && !isNaN(maxLoad)) {
        const availabilityRatio = slots.length / Math.max(maxLoad, 1);
        score += fairnessWeight * Math.min(availabilityRatio, 1);
      }
    } catch (e) {
      // Invalid JSON, skip
    }
  }
  
  // Utilization score (based on skills diversity)
  if (worker.skills) {
    const skills = worker.skills.split(',').filter((s: string) => s.trim());
    score += utilizationWeight * Math.min(skills.length / 5, 1); // Normalize to 0-1
  }
  
  return score;
}

function calculateTaskComplexity(task: any, criteria: PrioritizationCriteria[]): number {
  const skillMatchWeight = criteria.find(c => c.id === 'skill_match')?.weight || 0;
  const efficiencyWeight = criteria.find(c => c.id === 'phase_efficiency')?.weight || 0;
  const deadlineWeight = criteria.find(c => c.id === 'deadline_adherence')?.weight || 0;
  
  let score = 0;
  
  // Skill match score (based on number of required skills)
  if (task.requiredskills) {
    const skills = task.requiredskills.split(',').filter((s: string) => s.trim());
    score += skillMatchWeight * Math.min(skills.length / 3, 1); // Normalize to 0-1
  }
  
  // Phase efficiency score (based on preferred phases)
  if (task.preferredphases) {
    try {
      const phases = JSON.parse(task.preferredphases);
      if (Array.isArray(phases)) {
        score += efficiencyWeight * Math.min(phases.length / 5, 1); // Normalize to 0-1
      }
    } catch (e) {
      // Try parsing as range
      const phaseMatch = task.preferredphases.match(/(\d+)-(\d+)/);
      if (phaseMatch) {
        const start = parseInt(phaseMatch[1]);
        const end = parseInt(phaseMatch[2]);
        const range = end - start + 1;
        score += efficiencyWeight * Math.min(range / 5, 1);
      }
    }
  }
  
  // Deadline adherence score (based on duration)
  if (task.duration) {
    const duration = parseInt(task.duration);
    if (!isNaN(duration)) {
      score += deadlineWeight * Math.min(duration / 10, 1); // Normalize to 0-1
    }
  }
  
  return score;
}

// Generate Excel-compatible data for export
export function generateExcelData(exportData: PrioritizationConfig['exportData']) {
  return {
    clients: exportData.clients.map(client => ({
      ClientID: client.clientid,
      ClientName: client.clientname,
      PriorityLevel: client.prioritylevel,
      RequestedTaskIDs: client.requestedtaskids,
      GroupTag: client.grouptag,
      CalculatedPriority: client.calculatedPriority?.toFixed(3) || '0.000',
      AttributesJSON: client.attributesjson
    })),
    workers: exportData.workers.map(worker => ({
      WorkerID: worker.workerid,
      WorkerName: worker.workername,
      Skills: worker.skills,
      AvailableSlots: worker.availableslots,
      MaxLoadPerPhase: worker.maxloadperphase,
      WorkerGroup: worker.workergroup,
      QualificationLevel: worker.qualificationlevel,
      CalculatedCapacity: worker.calculatedCapacity?.toFixed(3) || '0.000'
    })),
    tasks: exportData.tasks.map(task => ({
      TaskID: task.taskid,
      TaskName: task.taskname,
      Category: task.category,
      Duration: task.duration,
      RequiredSkills: task.requiredskills,
      PreferredPhases: task.preferredphases,
      MaxConcurrent: task.maxconcurrent,
      CalculatedComplexity: task.calculatedComplexity?.toFixed(3) || '0.000'
    })),
    prioritization: {
      Profile: exportData.prioritization.profile.name,
      Description: exportData.prioritization.profile.description,
      Criteria: exportData.prioritization.criteria.map(c => ({
        Criterion: c.name,
        Weight: c.weight.toFixed(3),
        Category: c.category,
        Description: c.description
      })),
      ConsistencyRatio: exportData.prioritization.consistencyRatio.toFixed(3),
      GeneratedAt: exportData.prioritization.metadata.generatedAt
    }
  };
} 