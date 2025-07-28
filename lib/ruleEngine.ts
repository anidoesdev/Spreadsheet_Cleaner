export interface BusinessRule {
  id: string;
  type: 'coRun' | 'slotRestriction' | 'loadLimit' | 'phaseWindow' | 'patternMatch' | 'precedenceOverride';
  name: string;
  description: string;
  priority: number;
  enabled: boolean;
  parameters: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface CoRunRule extends BusinessRule {
  type: 'coRun';
  parameters: {
    tasks: string[];
    description?: string;
  };
}

export interface SlotRestrictionRule extends BusinessRule {
  type: 'slotRestriction';
  parameters: {
    groupType: 'client' | 'worker';
    groupName: string;
    minCommonSlots: number;
    description?: string;
  };
}

export interface LoadLimitRule extends BusinessRule {
  type: 'loadLimit';
  parameters: {
    workerGroup: string;
    maxSlotsPerPhase: number;
    description?: string;
  };
}

export interface PhaseWindowRule extends BusinessRule {
  type: 'phaseWindow';
  parameters: {
    taskId: string;
    allowedPhases: number[];
    description?: string;
  };
}

export interface PatternMatchRule extends BusinessRule {
  type: 'patternMatch';
  parameters: {
    regex: string;
    ruleTemplate: string;
    parameters: any;
    description?: string;
  };
}

export interface PrecedenceOverrideRule extends BusinessRule {
  type: 'precedenceOverride';
  parameters: {
    globalRules: string[];
    specificRules: string[];
    priorityOrder: string[];
    description?: string;
  };
}

export interface RuleRecommendation {
  id: string;
  type: BusinessRule['type'];
  confidence: number;
  reason: string;
  suggestedRule: Partial<BusinessRule>;
  dataEvidence: any;
}

export interface RuleValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

// Rule templates for pattern matching
export const ruleTemplates = {
  'skill-requirement': {
    name: 'Skill Requirement',
    description: 'Tasks requiring specific skills must be assigned to qualified workers',
    parameters: {
      requiredSkill: { type: 'string', required: true },
      minWorkers: { type: 'number', required: true, default: 1 }
    }
  },
  'priority-allocation': {
    name: 'Priority Allocation',
    description: 'High priority clients get resource allocation preference',
    parameters: {
      minPriority: { type: 'number', required: true, default: 4 },
      allocationBoost: { type: 'number', required: true, default: 1.5 }
    }
  },
  'phase-constraint': {
    name: 'Phase Constraint',
    description: 'Tasks must be completed within specific phase windows',
    parameters: {
      phaseRange: { type: 'string', required: true },
      strictEnforcement: { type: 'boolean', required: false, default: true }
    }
  },
  'capacity-limit': {
    name: 'Capacity Limit',
    description: 'Workers cannot exceed their maximum capacity per phase',
    parameters: {
      maxLoadMultiplier: { type: 'number', required: true, default: 1.0 },
      allowOvertime: { type: 'boolean', required: false, default: false }
    }
  }
};

// Rule validation functions
export function validateCoRunRule(rule: CoRunRule, data: any): RuleValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  if (!rule.parameters.tasks || rule.parameters.tasks.length < 2) {
    errors.push('Co-run rule must specify at least 2 tasks');
  }

  if (rule.parameters.tasks && rule.parameters.tasks.length > 0) {
    // Check if all tasks exist
    const existingTasks = data.tasks?.map((t: any) => t.taskid) || [];
    const missingTasks = rule.parameters.tasks.filter(taskId => !existingTasks.includes(taskId));
    
    if (missingTasks.length > 0) {
      errors.push(`Tasks not found: ${missingTasks.join(', ')}`);
    }

    // Check for duplicate tasks
    const duplicates = rule.parameters.tasks.filter((taskId, index) => 
      rule.parameters.tasks.indexOf(taskId) !== index
    );
    
    if (duplicates.length > 0) {
      errors.push(`Duplicate tasks in co-run rule: ${duplicates.join(', ')}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions
  };
}

export function validateSlotRestrictionRule(rule: SlotRestrictionRule, data: any): RuleValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  if (!rule.parameters.groupName) {
    errors.push('Group name is required');
  }

  if (rule.parameters.minCommonSlots < 1) {
    errors.push('Minimum common slots must be at least 1');
  }

  if (rule.parameters.groupType === 'client') {
    const clientGroups = [...new Set(data.clients?.map((c: any) => c.grouptag) || [])];
    if (!clientGroups.includes(rule.parameters.groupName)) {
      warnings.push(`Client group "${rule.parameters.groupName}" not found in data`);
    }
  } else if (rule.parameters.groupType === 'worker') {
    const workerGroups = [...new Set(data.workers?.map((w: any) => w.workergroup) || [])];
    if (!workerGroups.includes(rule.parameters.groupName)) {
      warnings.push(`Worker group "${rule.parameters.groupName}" not found in data`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions
  };
}

export function validateLoadLimitRule(rule: LoadLimitRule, data: any): RuleValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  if (!rule.parameters.workerGroup) {
    errors.push('Worker group is required');
  }

  if (rule.parameters.maxSlotsPerPhase < 1) {
    errors.push('Maximum slots per phase must be at least 1');
  }

  const workerGroups = [...new Set(data.workers?.map((w: any) => w.workergroup) || [])];
  if (!workerGroups.includes(rule.parameters.workerGroup)) {
    warnings.push(`Worker group "${rule.parameters.workerGroup}" not found in data`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions
  };
}

export function validatePhaseWindowRule(rule: PhaseWindowRule, data: any): RuleValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  if (!rule.parameters.taskId) {
    errors.push('Task ID is required');
  }

  if (!rule.parameters.allowedPhases || rule.parameters.allowedPhases.length === 0) {
    errors.push('At least one allowed phase must be specified');
  }

  if (rule.parameters.taskId) {
    const existingTasks = data.tasks?.map((t: any) => t.taskid) || [];
    if (!existingTasks.includes(rule.parameters.taskId)) {
      errors.push(`Task "${rule.parameters.taskId}" not found`);
    }
  }

  if (rule.parameters.allowedPhases) {
    const invalidPhases = rule.parameters.allowedPhases.filter(phase => 
      typeof phase !== 'number' || phase < 1
    );
    
    if (invalidPhases.length > 0) {
      errors.push('All phases must be positive numbers');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions
  };
}

export function validatePatternMatchRule(rule: PatternMatchRule, data: any): RuleValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  if (!rule.parameters.regex) {
    errors.push('Regular expression is required');
  }

  if (!rule.parameters.ruleTemplate) {
    errors.push('Rule template is required');
  }

  if (rule.parameters.regex) {
    try {
      new RegExp(rule.parameters.regex);
    } catch (e) {
      errors.push('Invalid regular expression');
    }
  }

  if (rule.parameters.ruleTemplate && !ruleTemplates[rule.parameters.ruleTemplate as keyof typeof ruleTemplates]) {
    errors.push('Invalid rule template');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions
  };
}

export function validatePrecedenceOverrideRule(rule: PrecedenceOverrideRule, data: any): RuleValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  if (!rule.parameters.priorityOrder || rule.parameters.priorityOrder.length === 0) {
    errors.push('Priority order must be specified');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions
  };
}

// Main validation function
export function validateRule(rule: BusinessRule, data: any): RuleValidationResult {
  switch (rule.type) {
    case 'coRun':
      return validateCoRunRule(rule as CoRunRule, data);
    case 'slotRestriction':
      return validateSlotRestrictionRule(rule as SlotRestrictionRule, data);
    case 'loadLimit':
      return validateLoadLimitRule(rule as LoadLimitRule, data);
    case 'phaseWindow':
      return validatePhaseWindowRule(rule as PhaseWindowRule, data);
    case 'patternMatch':
      return validatePatternMatchRule(rule as PatternMatchRule, data);
    case 'precedenceOverride':
      return validatePrecedenceOverrideRule(rule as PrecedenceOverrideRule, data);
    default:
      return {
        isValid: false,
        errors: ['Unknown rule type'],
        warnings: [],
        suggestions: []
      };
  }
}

// Rule generation functions
export function generateRuleId(): string {
  return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function createCoRunRule(tasks: string[], name?: string): CoRunRule {
  return {
    id: generateRuleId(),
    type: 'coRun',
    name: name || `Co-run Rule ${Date.now()}`,
    description: `Tasks ${tasks.join(', ')} must run together`,
    priority: 1,
    enabled: true,
    parameters: {
      tasks,
      description: `Tasks ${tasks.join(', ')} must run together`
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

export function createSlotRestrictionRule(
  groupType: 'client' | 'worker',
  groupName: string,
  minCommonSlots: number,
  name?: string
): SlotRestrictionRule {
  return {
    id: generateRuleId(),
    type: 'slotRestriction',
    name: name || `Slot Restriction ${Date.now()}`,
    description: `${groupType} group ${groupName} requires minimum ${minCommonSlots} common slots`,
    priority: 1,
    enabled: true,
    parameters: {
      groupType,
      groupName,
      minCommonSlots,
      description: `${groupType} group ${groupName} requires minimum ${minCommonSlots} common slots`
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

export function createLoadLimitRule(
  workerGroup: string,
  maxSlotsPerPhase: number,
  name?: string
): LoadLimitRule {
  return {
    id: generateRuleId(),
    type: 'loadLimit',
    name: name || `Load Limit ${Date.now()}`,
    description: `Worker group ${workerGroup} limited to ${maxSlotsPerPhase} slots per phase`,
    priority: 1,
    enabled: true,
    parameters: {
      workerGroup,
      maxSlotsPerPhase,
      description: `Worker group ${workerGroup} limited to ${maxSlotsPerPhase} slots per phase`
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

export function createPhaseWindowRule(
  taskId: string,
  allowedPhases: number[],
  name?: string
): PhaseWindowRule {
  return {
    id: generateRuleId(),
    type: 'phaseWindow',
    name: name || `Phase Window ${Date.now()}`,
    description: `Task ${taskId} restricted to phases ${allowedPhases.join(', ')}`,
    priority: 1,
    enabled: true,
    parameters: {
      taskId,
      allowedPhases,
      description: `Task ${taskId} restricted to phases ${allowedPhases.join(', ')}`
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

export function createPatternMatchRule(
  regex: string,
  ruleTemplate: string,
  parameters: any,
  name?: string
): PatternMatchRule {
  return {
    id: generateRuleId(),
    type: 'patternMatch',
    name: name || `Pattern Match ${Date.now()}`,
    description: `Pattern match rule using ${ruleTemplate} template`,
    priority: 1,
    enabled: true,
    parameters: {
      regex,
      ruleTemplate,
      parameters,
      description: `Pattern match rule using ${ruleTemplate} template`
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

export function createPrecedenceOverrideRule(
  globalRules: string[],
  specificRules: string[],
  priorityOrder: string[],
  name?: string
): PrecedenceOverrideRule {
  return {
    id: generateRuleId(),
    type: 'precedenceOverride',
    name: name || `Precedence Override ${Date.now()}`,
    description: 'Precedence override rule for global and specific rules',
    priority: 1,
    enabled: true,
    parameters: {
      globalRules,
      specificRules,
      priorityOrder,
      description: 'Precedence override rule for global and specific rules'
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

// Generate rules configuration JSON
export function generateRulesConfig(rules: BusinessRule[]): string {
  const config = {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    rules: rules
      .filter(rule => rule.enabled)
      .sort((a, b) => b.priority - a.priority)
      .map(rule => ({
        id: rule.id,
        type: rule.type,
        name: rule.name,
        description: rule.description,
        priority: rule.priority,
        parameters: rule.parameters
      }))
  };

  return JSON.stringify(config, null, 2);
}

// AI rule recommendation functions
export function analyzeDataForRuleRecommendations(data: any): RuleRecommendation[] {
  const recommendations: RuleRecommendation[] = [];

  // Analyze for co-run patterns
  if (data.clients && data.tasks) {
    const clientTaskPatterns = analyzeClientTaskPatterns(data);
    recommendations.push(...clientTaskPatterns);
  }

  // Analyze for overloaded workers
  if (data.workers && data.tasks) {
    const overloadRecommendations = analyzeWorkerOverload(data);
    recommendations.push(...overloadRecommendations);
  }

  // Analyze for skill gaps
  if (data.workers && data.tasks) {
    const skillGapRecommendations = analyzeSkillGaps(data);
    recommendations.push(...skillGapRecommendations);
  }

  return recommendations;
}

function analyzeClientTaskPatterns(data: any): RuleRecommendation[] {
  const recommendations: RuleRecommendation[] = [];
  
  // Group clients by their requested tasks
  const taskGroups: Record<string, string[]> = {};
  
  data.clients.forEach((client: any) => {
    if (client.requestedtaskids) {
      const taskIds = client.requestedtaskids.split(',').map((id: string) => id.trim());
      const key = taskIds.sort().join(',');
      if (!taskGroups[key]) {
        taskGroups[key] = [];
      }
      taskGroups[key].push(client.clientid);
    }
  });

  // Find patterns where multiple clients request the same task combinations
  Object.entries(taskGroups).forEach(([taskCombination, clientIds]) => {
    if (clientIds.length > 1) {
      const taskIds = taskCombination.split(',');
      if (taskIds.length > 1) {
        recommendations.push({
          id: `co_run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'coRun',
          confidence: 0.8,
          reason: `Multiple clients (${clientIds.join(', ')}) request the same task combination (${taskIds.join(', ')})`,
          suggestedRule: createCoRunRule(taskIds, `Auto-generated Co-run for ${taskIds.join(', ')}`),
          dataEvidence: {
            clients: clientIds,
            tasks: taskIds,
            frequency: clientIds.length
          }
        });
      }
    }
  });

  return recommendations;
}

function analyzeWorkerOverload(data: any): RuleRecommendation[] {
  const recommendations: RuleRecommendation[] = [];
  
  // Group workers by their group
  const workerGroups: Record<string, any[]> = {};
  
  data.workers.forEach((worker: any) => {
    const group = worker.workergroup || 'Unknown';
    if (!workerGroups[group]) {
      workerGroups[group] = [];
    }
    workerGroups[group].push(worker);
  });

  // Analyze each group for potential overload
  Object.entries(workerGroups).forEach(([group, workers]) => {
    const avgMaxLoad = workers.reduce((sum, worker) => sum + (worker.maxloadperphase || 0), 0) / workers.length;
    const totalSlots = workers.reduce((sum, worker) => {
      try {
        const slots = JSON.parse(worker.availableslots || '[]');
        return sum + slots.length;
      } catch {
        return sum;
      }
    }, 0);

    if (avgMaxLoad > totalSlots * 0.8) {
      recommendations.push({
        id: `load_limit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'loadLimit',
        confidence: 0.7,
        reason: `Worker group "${group}" appears to be overloaded (avg max load: ${avgMaxLoad.toFixed(1)}, total slots: ${totalSlots})`,
        suggestedRule: createLoadLimitRule(group, Math.floor(totalSlots * 0.8), `Load limit for ${group}`),
        dataEvidence: {
          group,
          avgMaxLoad,
          totalSlots,
          workerCount: workers.length
        }
      });
    }
  });

  return recommendations;
}

function analyzeSkillGaps(data: any): RuleRecommendation[] {
  const recommendations: RuleRecommendation[] = [];
  
  // Collect all required skills from tasks
  const requiredSkills = new Set<string>();
  data.tasks.forEach((task: any) => {
    if (task.requiredskills) {
      const skills = task.requiredskills.split(',').map((skill: string) => skill.trim());
      skills.forEach((skill: string) => requiredSkills.add(skill));
    }
  });

  // Collect all available skills from workers
  const availableSkills = new Set<string>();
  data.workers.forEach((worker: any) => {
    if (worker.skills) {
      const skills = worker.skills.split(',').map((skill: string) => skill.trim());
      skills.forEach((skill: string) => availableSkills.add(skill));
    }
  });

  // Find missing skills
  const missingSkills = Array.from(requiredSkills).filter(skill => !availableSkills.has(skill));
  
  if (missingSkills.length > 0) {
    recommendations.push({
      id: `skill_gap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'patternMatch',
      confidence: 0.9,
      reason: `Skills required by tasks but not available in workers: ${missingSkills.join(', ')}`,
      suggestedRule: createPatternMatchRule(
        `.*(${missingSkills.join('|')}).*`,
        'skill-requirement',
        { requiredSkill: missingSkills[0], minWorkers: 1 },
        `Skill requirement for ${missingSkills.join(', ')}`
      ),
      dataEvidence: {
        missingSkills,
        requiredSkillsCount: requiredSkills.size,
        availableSkillsCount: availableSkills.size
      }
    });
  }

  return recommendations;
} 