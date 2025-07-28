export interface NaturalLanguageRule {
  text: string;
  entityType?: 'client' | 'worker' | 'task';
  context?: any;
}

export interface ParsedRule {
  type: 'coRun' | 'slotRestriction' | 'loadLimit' | 'phaseWindow' | 'patternMatch' | 'precedenceOverride';
  confidence: number;
  parameters: any;
  validation: {
    canApply: boolean;
    reason: string;
    suggestions: string[];
  };
}

// Natural language patterns for rule detection
const rulePatterns = {
  coRun: [
    /(?:tasks?|work)\s+(.+?)\s+(?:must|should|need to)\s+(?:run|execute|work)\s+together/gi,
    /(?:co-run|co run|concurrent)\s+(?:tasks?|work)\s+(.+)/gi,
    /(?:tasks?|work)\s+(.+?)\s+(?:are|is)\s+(?:always|usually)\s+(?:run|executed)\s+together/gi,
    /(?:group|bundle)\s+(?:tasks?|work)\s+(.+)/gi
  ],
  slotRestriction: [
    /(?:client|worker)\s+(?:group\s+)?(.+?)\s+(?:must|should|need to)\s+have\s+(?:at least\s+)?(\d+)\s+(?:common\s+)?slots?/gi,
    /(?:minimum|min)\s+(\d+)\s+(?:common\s+)?slots?\s+for\s+(?:client|worker)\s+(?:group\s+)?(.+)/gi,
    /(?:slot\s+)?restriction\s+for\s+(?:client|worker)\s+(?:group\s+)?(.+?)\s*:\s*(\d+)/gi
  ],
  loadLimit: [
    /(?:worker\s+)?group\s+(.+?)\s+(?:limited to|max|maximum)\s+(\d+)\s+(?:slots?|load)\s+per\s+phase/gi,
    /(?:load\s+)?limit\s+for\s+(?:worker\s+)?group\s+(.+?)\s*:\s*(\d+)/gi,
    /(?:worker\s+)?group\s+(.+?)\s+cannot\s+exceed\s+(\d+)\s+(?:slots?|load)/gi
  ],
  phaseWindow: [
    /(?:task|work)\s+(.+?)\s+(?:must|should|can only)\s+(?:run|execute|work)\s+(?:in|during|on)\s+(?:phases?|phase)\s+(.+)/gi,
    /(?:phase\s+)?window\s+for\s+(?:task|work)\s+(.+?)\s*:\s*(.+)/gi,
    /(?:task|work)\s+(.+?)\s+(?:restricted to|limited to)\s+(?:phases?|phase)\s+(.+)/gi
  ],
  patternMatch: [
    /(?:pattern|regex)\s+(.+?)\s+(?:for|matching)\s+(.+)/gi,
    /(?:rule|condition)\s+(?:when|if)\s+(.+?)\s+(?:then|apply)\s+(.+)/gi,
    /(?:custom|user-defined)\s+(?:rule|condition)\s+(.+)/gi
  ],
  precedenceOverride: [
    /(?:precedence|priority)\s+(?:order|override)\s+(.+)/gi,
    /(?:global|specific)\s+(?:rules?|rule)\s+(?:vs|versus)\s+(.+)/gi,
    /(?:rule\s+)?priority\s+(.+)/gi
  ]
};

// Keywords for entity detection
const entityKeywords = {
  client: ['client', 'customer', 'organization', 'company', 'enterprise', 'startup', 'smb'],
  worker: ['worker', 'employee', 'staff', 'developer', 'designer', 'manager', 'analyst'],
  task: ['task', 'work', 'job', 'project', 'assignment', 'activity']
};

// Phase range parsing
function parsePhaseRange(text: string): number[] {
  const phases: number[] = [];
  
  // Handle ranges like "1-3" or "phases 1 to 3"
  const rangeMatch = text.match(/(?:phases?\s+)?(\d+)\s*(?:to|-)\s*(\d+)/i);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1]);
    const end = parseInt(rangeMatch[2]);
    for (let i = start; i <= end; i++) {
      phases.push(i);
    }
    return phases;
  }
  
  // Handle lists like "1, 2, 3" or "phases 1, 2, 3"
  const listMatch = text.match(/(?:phases?\s+)?(\d+(?:\s*,\s*\d+)*)/i);
  if (listMatch) {
    const numbers = listMatch[1].split(',').map(n => parseInt(n.trim()));
    return numbers.filter(n => !isNaN(n));
  }
  
  // Handle single numbers
  const singleMatch = text.match(/(?:phase\s+)?(\d+)/i);
  if (singleMatch) {
    const phase = parseInt(singleMatch[1]);
    if (!isNaN(phase)) {
      phases.push(phase);
    }
  }
  
  return phases;
}

// Task ID extraction
function extractTaskIds(text: string, data: any): string[] {
  const taskIds: string[] = [];
  
  // Look for exact task IDs
  if (data.tasks) {
    const existingTaskIds = data.tasks.map((t: any) => t.taskid);
    const words = text.split(/\s+/);
    
    words.forEach(word => {
      const cleanWord = word.replace(/[^\w]/g, '');
      if (existingTaskIds.includes(cleanWord)) {
        taskIds.push(cleanWord);
      }
    });
  }
  
  // Look for task names and convert to IDs
  if (data.tasks) {
    const taskNameToId: Record<string, string> = {};
    data.tasks.forEach((task: any) => {
      if (task.taskname) {
        taskNameToId[task.taskname.toLowerCase()] = task.taskid;
      }
    });
    
    const words = text.toLowerCase().split(/\s+/);
    words.forEach(word => {
      if (taskNameToId[word]) {
        taskIds.push(taskNameToId[word]);
      }
    });
  }
  
  return [...new Set(taskIds)];
}

// Group name extraction
function extractGroupName(text: string, data: any, groupType: 'client' | 'worker'): string | null {
  const groups = groupType === 'client' 
    ? [...new Set(data.clients?.map((c: any) => c.grouptag) || [])]
    : [...new Set(data.workers?.map((w: any) => w.workergroup) || [])];
  
  const words = text.toLowerCase().split(/\s+/);
  
  for (const word of words) {
    const cleanWord = word.replace(/[^\w]/g, '');
    if (groups.includes(cleanWord)) {
      return cleanWord;
    }
  }
  
  // Try to match partial names
  for (const group of groups) {
    if (text.toLowerCase().includes(group.toLowerCase())) {
      return group;
    }
  }
  
  return null;
}

// Number extraction
function extractNumber(text: string): number | null {
  const match = text.match(/(\d+)/);
  return match ? parseInt(match[1]) : null;
}

// Main parsing function
export function parseNaturalLanguageRule(rule: NaturalLanguageRule, data: any): ParsedRule | null {
  const text = rule.text.toLowerCase();
  let bestMatch: ParsedRule | null = null;
  let highestConfidence = 0;

  // Try to match co-run rules
  for (const pattern of rulePatterns.coRun) {
    const matches = [...text.matchAll(pattern)];
    for (const match of matches) {
      const taskText = match[1];
      const taskIds = extractTaskIds(taskText, data);
      
      if (taskIds.length >= 2) {
        const confidence = Math.min(0.9, 0.5 + (taskIds.length * 0.1));
        if (confidence > highestConfidence) {
          bestMatch = {
            type: 'coRun',
            confidence,
            parameters: {
              tasks: taskIds,
              description: `Tasks ${taskIds.join(', ')} must run together`
            },
            validation: {
              canApply: taskIds.length >= 2,
              reason: taskIds.length >= 2 ? 'Valid co-run rule' : 'Need at least 2 tasks',
              suggestions: []
            }
          };
          highestConfidence = confidence;
        }
      }
    }
  }

  // Try to match slot restriction rules
  for (const pattern of rulePatterns.slotRestriction) {
    const matches = [...text.matchAll(pattern)];
    for (const match of matches) {
      const groupText = match[1];
      const slotsText = match[2];
      const minSlots = extractNumber(slotsText);
      
      if (minSlots && minSlots > 0) {
        // Try to determine group type
        const isClientGroup = text.includes('client') || text.includes('customer');
        const isWorkerGroup = text.includes('worker') || text.includes('employee');
        const groupType = isClientGroup ? 'client' : isWorkerGroup ? 'worker' : 'client';
        
        const groupName = extractGroupName(groupText, data, groupType);
        
        if (groupName) {
          const confidence = 0.8;
          if (confidence > highestConfidence) {
            bestMatch = {
              type: 'slotRestriction',
              confidence,
              parameters: {
                groupType,
                groupName,
                minCommonSlots: minSlots,
                description: `${groupType} group ${groupName} requires minimum ${minSlots} common slots`
              },
              validation: {
                canApply: true,
                reason: 'Valid slot restriction rule',
                suggestions: []
              }
            };
            highestConfidence = confidence;
          }
        }
      }
    }
  }

  // Try to match load limit rules
  for (const pattern of rulePatterns.loadLimit) {
    const matches = [...text.matchAll(pattern)];
    for (const match of matches) {
      const groupText = match[1];
      const limitText = match[2];
      const maxSlots = extractNumber(limitText);
      
      if (maxSlots && maxSlots > 0) {
        const groupName = extractGroupName(groupText, data, 'worker');
        
        if (groupName) {
          const confidence = 0.8;
          if (confidence > highestConfidence) {
            bestMatch = {
              type: 'loadLimit',
              confidence,
              parameters: {
                workerGroup: groupName,
                maxSlotsPerPhase: maxSlots,
                description: `Worker group ${groupName} limited to ${maxSlots} slots per phase`
              },
              validation: {
                canApply: true,
                reason: 'Valid load limit rule',
                suggestions: []
              }
            };
            highestConfidence = confidence;
          }
        }
      }
    }
  }

  // Try to match phase window rules
  for (const pattern of rulePatterns.phaseWindow) {
    const matches = [...text.matchAll(pattern)];
    for (const match of matches) {
      const taskText = match[1];
      const phaseText = match[2];
      const taskIds = extractTaskIds(taskText, data);
      const phases = parsePhaseRange(phaseText);
      
      if (taskIds.length > 0 && phases.length > 0) {
        const confidence = 0.7;
        if (confidence > highestConfidence) {
          bestMatch = {
            type: 'phaseWindow',
            confidence,
            parameters: {
              taskId: taskIds[0],
              allowedPhases: phases,
              description: `Task ${taskIds[0]} restricted to phases ${phases.join(', ')}`
            },
            validation: {
              canApply: taskIds.length > 0 && phases.length > 0,
              reason: taskIds.length > 0 && phases.length > 0 ? 'Valid phase window rule' : 'Need task ID and phases',
              suggestions: []
            }
          };
          highestConfidence = confidence;
        }
      }
    }
  }

  // Try to match pattern match rules
  for (const pattern of rulePatterns.patternMatch) {
    const matches = [...text.matchAll(pattern)];
    for (const match of matches) {
      const patternText = match[1];
      const actionText = match[2] || '';
      
      // Simple regex pattern detection
      let regex = '';
      if (patternText.includes('skill') || patternText.includes('javascript') || patternText.includes('python')) {
        regex = '.*(skill|javascript|python).*';
      } else if (patternText.includes('priority') || patternText.includes('high')) {
        regex = '.*(priority|high).*';
      } else {
        regex = '.*' + patternText.replace(/[^\w\s]/g, '.*') + '.*';
      }
      
      const confidence = 0.6;
      if (confidence > highestConfidence) {
        bestMatch = {
          type: 'patternMatch',
          confidence,
          parameters: {
            regex,
            ruleTemplate: 'skill-requirement',
            parameters: { requiredSkill: 'skill', minWorkers: 1 },
            description: `Pattern match rule: ${patternText}`
          },
          validation: {
            canApply: true,
            reason: 'Valid pattern match rule',
            suggestions: ['Consider refining the regex pattern for better accuracy']
          }
        };
        highestConfidence = confidence;
      }
    }
  }

  // Try to match precedence override rules
  for (const pattern of rulePatterns.precedenceOverride) {
    const matches = [...text.matchAll(pattern)];
    for (const match of matches) {
      const orderText = match[1];
      
      const confidence = 0.5;
      if (confidence > highestConfidence) {
        bestMatch = {
          type: 'precedenceOverride',
          confidence,
          parameters: {
            globalRules: [],
            specificRules: [],
            priorityOrder: [],
            description: `Precedence override: ${orderText}`
          },
          validation: {
            canApply: false,
            reason: 'Precedence override rules require manual configuration',
            suggestions: ['Please specify the exact rule priority order manually']
          }
        };
        highestConfidence = confidence;
      }
    }
  }

  return bestMatch;
}

// Context-aware rule suggestions
export function generateContextualSuggestions(text: string, data: any): string[] {
  const suggestions: string[] = [];
  const lowerText = text.toLowerCase();

  // Suggest task IDs if mentioning tasks
  if (lowerText.includes('task') && data.tasks) {
    const taskNames = data.tasks.slice(0, 3).map((t: any) => t.taskname).filter(Boolean);
    if (taskNames.length > 0) {
      suggestions.push(`Available tasks: ${taskNames.join(', ')}`);
    }
  }

  // Suggest group names if mentioning groups
  if (lowerText.includes('group') || lowerText.includes('client') || lowerText.includes('worker')) {
    if (data.clients) {
      const clientGroups = [...new Set(data.clients.map((c: any) => c.grouptag))].filter(Boolean);
      if (clientGroups.length > 0) {
        suggestions.push(`Client groups: ${clientGroups.join(', ')}`);
      }
    }
    
    if (data.workers) {
      const workerGroups = [...new Set(data.workers.map((w: any) => w.workergroup))].filter(Boolean);
      if (workerGroups.length > 0) {
        suggestions.push(`Worker groups: ${workerGroups.join(', ')}`);
      }
    }
  }

  // Suggest skills if mentioning skills
  if (lowerText.includes('skill') && data.workers) {
    const allSkills = new Set<string>();
    data.workers.forEach((worker: any) => {
      if (worker.skills) {
        const skills = worker.skills.split(',').map((s: string) => s.trim());
        skills.forEach(skill => allSkills.add(skill));
      }
    });
    
    const skillList = Array.from(allSkills).slice(0, 5);
    if (skillList.length > 0) {
      suggestions.push(`Available skills: ${skillList.join(', ')}`);
    }
  }

  return suggestions;
}

// Validate rule against current data
export function validateRuleAgainstData(rule: ParsedRule, data: any): ParsedRule {
  const validation = { ...rule.validation };

  switch (rule.type) {
    case 'coRun':
      if (rule.parameters.tasks) {
        const existingTasks = data.tasks?.map((t: any) => t.taskid) || [];
        const missingTasks = rule.parameters.tasks.filter((taskId: string) => !existingTasks.includes(taskId));
        
        if (missingTasks.length > 0) {
          validation.canApply = false;
          validation.reason = `Tasks not found: ${missingTasks.join(', ')}`;
        }
      }
      break;

    case 'slotRestriction':
      if (rule.parameters.groupType === 'client') {
        const clientGroups = [...new Set(data.clients?.map((c: any) => c.grouptag) || [])];
        if (!clientGroups.includes(rule.parameters.groupName)) {
          validation.canApply = false;
          validation.reason = `Client group "${rule.parameters.groupName}" not found`;
        }
      } else if (rule.parameters.groupType === 'worker') {
        const workerGroups = [...new Set(data.workers?.map((w: any) => w.workergroup) || [])];
        if (!workerGroups.includes(rule.parameters.groupName)) {
          validation.canApply = false;
          validation.reason = `Worker group "${rule.parameters.groupName}" not found`;
        }
      }
      break;

    case 'loadLimit':
      const workerGroups = [...new Set(data.workers?.map((w: any) => w.workergroup) || [])];
      if (!workerGroups.includes(rule.parameters.workerGroup)) {
        validation.canApply = false;
        validation.reason = `Worker group "${rule.parameters.workerGroup}" not found`;
      }
      break;

    case 'phaseWindow':
      const existingTasks = data.tasks?.map((t: any) => t.taskid) || [];
      if (!existingTasks.includes(rule.parameters.taskId)) {
        validation.canApply = false;
        validation.reason = `Task "${rule.parameters.taskId}" not found`;
      }
      break;
  }

  return {
    ...rule,
    validation
  };
} 