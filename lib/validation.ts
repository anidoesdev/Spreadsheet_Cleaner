export interface ValidationError {
  type: 'error' | 'warning' | 'info';
  message: string;
  rowIndex?: number;
  column?: string;
  value?: any;
  severity: 'high' | 'medium' | 'low';
}

export interface ValidationResult {
  errors: ValidationError[];
  summary: {
    totalErrors: number;
    totalWarnings: number;
    errorTypes: Record<string, number>;
    affectedRows: number[];
  };
}

export interface ValidationRule {
  name: string;
  validate: (data: any[], entityType: string, crossEntityData?: CrossEntityData) => ValidationError[];
  description: string;
}

export interface CrossEntityData {
  clients?: any[];
  workers?: any[];
  tasks?: any[];
}

// Advanced validation interfaces
export interface TaskData {
  id: string;
  duration: number;
  preferredPhases: number[];
  requiredSkills: string[];
  maxConcurrent: number;
  phase: number;
}

export interface WorkerData {
  id: string;
  availableSlots: number[];
  skills: string[];
  maxLoadPerPhase: number;
}

// Helper functions for data parsing
function parseCommaSeparated(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    return value.split(',').map(s => s.trim()).filter(s => s.length > 0);
  }
  return [];
}

function parsePhaseRange(value: any): number[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    // Handle range syntax like "1-3" or "2-4,6"
    const parts = value.split(',');
    const phases: number[] = [];
    
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.includes('-')) {
        const [start, end] = trimmed.split('-').map(s => parseInt(s.trim()));
        if (!isNaN(start) && !isNaN(end) && start <= end) {
          for (let i = start; i <= end; i++) {
            phases.push(i);
          }
        }
      } else {
        const num = parseInt(trimmed);
        if (!isNaN(num)) {
          phases.push(num);
        }
      }
    }
    
    return phases;
  }
  return [];
}

function parseJSON(value: any): any {
  if (!value) return null;
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return null;
}

// Validation rules for different entity types
export const validationRules: Record<string, ValidationRule[]> = {
  client: [
    {
      name: 'required_columns',
      description: 'Check for missing required columns',
      validate: (data: any[], entityType: string) => {
        const errors: ValidationError[] = [];
        const requiredColumns = ['clientid', 'clientname', 'prioritylevel'];
        
        if (data.length === 0) return errors;
        
        const headers = Object.keys(data[0]);
        const missingColumns = requiredColumns.filter(col => 
          !headers.some(header => header.toLowerCase().includes(col.toLowerCase()))
        );
        
        if (missingColumns.length > 0) {
          errors.push({
            type: 'error',
            message: `Missing required columns: ${missingColumns.join(', ')}`,
            severity: 'high'
          });
        }
        
        return errors;
      }
    },
    {
      name: 'duplicate_client_ids',
      description: 'Check for duplicate ClientIDs',
      validate: (data: any[], entityType: string) => {
        const errors: ValidationError[] = [];
        const idColumn = findColumnByPattern(data, ['clientid', 'client_id', 'id']);
        
        if (!idColumn) return errors;
        
        const ids = data.map(row => row[idColumn]).filter(id => id !== undefined && id !== '');
        const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
        
        duplicates.forEach(duplicateId => {
          const duplicateRows = data
            .map((row, index) => ({ row, index }))
            .filter(({ row }) => row[idColumn] === duplicateId);
          
          duplicateRows.forEach(({ index }) => {
            errors.push({
              type: 'error',
              message: `Duplicate ClientID: ${duplicateId}`,
              rowIndex: index,
              column: idColumn,
              value: duplicateId,
              severity: 'high'
            });
          });
        });
        
        return errors;
      }
    },
    {
      name: 'priority_level_validation',
      description: 'Validate PriorityLevel is between 1-5',
      validate: (data: any[], entityType: string) => {
        const errors: ValidationError[] = [];
        const priorityColumn = findColumnByPattern(data, ['prioritylevel', 'priority_level', 'priority']);
        
        if (!priorityColumn) return errors;
        
        data.forEach((row, index) => {
          const priority = row[priorityColumn];
          if (priority !== undefined && priority !== '') {
            const priorityNum = typeof priority === 'number' ? priority : parseInt(priority);
            if (isNaN(priorityNum) || priorityNum < 1 || priorityNum > 5) {
              errors.push({
                type: 'error',
                message: 'PriorityLevel must be between 1 and 5',
                rowIndex: index,
                column: priorityColumn,
                value: priority,
                severity: 'medium'
              });
            }
          }
        });
        
        return errors;
      }
    },
    {
      name: 'requested_tasks_format',
      description: 'Validate RequestedTaskIDs format (comma-separated)',
      validate: (data: any[], entityType: string) => {
        const errors: ValidationError[] = [];
        const tasksColumn = findColumnByPattern(data, ['requestedtaskids', 'requested_task_ids', 'requestedtasks']);
        
        if (!tasksColumn) return errors;
        
        data.forEach((row, index) => {
          const tasks = row[tasksColumn];
          if (tasks && tasks !== '') {
            const taskIds = parseCommaSeparated(tasks);
            if (taskIds.length === 0) {
              errors.push({
                type: 'warning',
                message: 'RequestedTaskIDs should contain valid task IDs',
                rowIndex: index,
                column: tasksColumn,
                value: tasks,
                severity: 'medium'
              });
            }
          }
        });
        
        return errors;
      }
    },
    {
      name: 'attributes_json_validation',
      description: 'Validate AttributesJSON format',
      validate: (data: any[], entityType: string) => {
        const errors: ValidationError[] = [];
        const attributesColumn = findColumnByPattern(data, ['attributesjson', 'attributes_json', 'attributes']);
        
        if (!attributesColumn) return errors;
        
        data.forEach((row, index) => {
          const attributes = row[attributesColumn];
          if (attributes && attributes !== '') {
            const parsed = parseJSON(attributes);
            if (parsed === null) {
              errors.push({
                type: 'error',
                message: 'AttributesJSON must be valid JSON',
                rowIndex: index,
                column: attributesColumn,
                value: attributes,
                severity: 'medium'
              });
            }
          }
        });
        
        return errors;
      }
    }
  ],
  
  worker: [
    {
      name: 'required_columns',
      description: 'Check for missing required columns',
      validate: (data: any[], entityType: string) => {
        const errors: ValidationError[] = [];
        const requiredColumns = ['workerid', 'workername', 'skills', 'availableslots', 'maxloadperphase'];
        
        if (data.length === 0) return errors;
        
        const headers = Object.keys(data[0]);
        const missingColumns = requiredColumns.filter(col => 
          !headers.some(header => header.toLowerCase().includes(col.toLowerCase()))
        );
        
        if (missingColumns.length > 0) {
          errors.push({
            type: 'error',
            message: `Missing required columns: ${missingColumns.join(', ')}`,
            severity: 'high'
          });
        }
        
        return errors;
      }
    },
    {
      name: 'duplicate_worker_ids',
      description: 'Check for duplicate WorkerIDs',
      validate: (data: any[], entityType: string) => {
        const errors: ValidationError[] = [];
        const idColumn = findColumnByPattern(data, ['workerid', 'worker_id', 'id']);
        
        if (!idColumn) return errors;
        
        const ids = data.map(row => row[idColumn]).filter(id => id !== undefined && id !== '');
        const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
        
        duplicates.forEach(duplicateId => {
          const duplicateRows = data
            .map((row, index) => ({ row, index }))
            .filter(({ row }) => row[idColumn] === duplicateId);
          
          duplicateRows.forEach(({ index }) => {
            errors.push({
              type: 'error',
              message: `Duplicate WorkerID: ${duplicateId}`,
              rowIndex: index,
              column: idColumn,
              value: duplicateId,
              severity: 'high'
            });
          });
        });
        
        return errors;
      }
    },
    {
      name: 'skills_format',
      description: 'Validate Skills format (comma-separated)',
      validate: (data: any[], entityType: string) => {
        const errors: ValidationError[] = [];
        const skillsColumn = findColumnByPattern(data, ['skills']);
        
        if (!skillsColumn) return errors;
        
        data.forEach((row, index) => {
          const skills = row[skillsColumn];
          if (skills && skills !== '') {
            const skillList = parseCommaSeparated(skills);
            if (skillList.length === 0) {
              errors.push({
                type: 'warning',
                message: 'Skills should contain valid skill tags',
                rowIndex: index,
                column: skillsColumn,
                value: skills,
                severity: 'medium'
              });
            }
          }
        });
        
        return errors;
      }
    },
    {
      name: 'available_slots_format',
      description: 'Validate AvailableSlots format (array of phase numbers)',
      validate: (data: any[], entityType: string) => {
        const errors: ValidationError[] = [];
        const slotsColumn = findColumnByPattern(data, ['availableslots', 'available_slots', 'slots']);
        
        if (!slotsColumn) return errors;
        
        data.forEach((row, index) => {
          const slots = row[slotsColumn];
          if (slots) {
            try {
              const slotsArray = Array.isArray(slots) ? slots : JSON.parse(slots);
              if (!Array.isArray(slotsArray) || !slotsArray.every(slot => typeof slot === 'number' && slot > 0)) {
                errors.push({
                  type: 'error',
                  message: 'AvailableSlots must be an array of positive numbers',
                  rowIndex: index,
                  column: slotsColumn,
                  value: slots,
                  severity: 'medium'
                });
              }
            } catch (e) {
              errors.push({
                type: 'error',
                message: 'AvailableSlots must be a valid JSON array of numbers',
                rowIndex: index,
                column: slotsColumn,
                value: slots,
                severity: 'medium'
              });
            }
          }
        });
        
        return errors;
      }
    },
    {
      name: 'max_load_validation',
      description: 'Validate MaxLoadPerPhase is positive',
      validate: (data: any[], entityType: string) => {
        const errors: ValidationError[] = [];
        const maxLoadColumn = findColumnByPattern(data, ['maxloadperphase', 'max_load_per_phase', 'maxload']);
        
        if (!maxLoadColumn) return errors;
        
        data.forEach((row, index) => {
          const maxLoad = row[maxLoadColumn];
          if (maxLoad !== undefined && maxLoad !== '') {
            const maxLoadNum = typeof maxLoad === 'number' ? maxLoad : parseInt(maxLoad);
            if (isNaN(maxLoadNum) || maxLoadNum < 1) {
              errors.push({
                type: 'error',
                message: 'MaxLoadPerPhase must be >= 1',
                rowIndex: index,
                column: maxLoadColumn,
                value: maxLoad,
                severity: 'medium'
              });
            }
          }
        });
        
        return errors;
      }
    },
    {
      name: 'qualification_level_validation',
      description: 'Validate QualificationLevel format',
      validate: (data: any[], entityType: string) => {
        const errors: ValidationError[] = [];
        const qualColumn = findColumnByPattern(data, ['qualificationlevel', 'qualification_level', 'qualification']);
        
        if (!qualColumn) return errors;
        
        data.forEach((row, index) => {
          const qual = row[qualColumn];
          if (qual !== undefined && qual !== '') {
            // Assuming qualification levels are strings like "Junior", "Senior", "Expert"
            if (typeof qual !== 'string' || qual.trim().length === 0) {
              errors.push({
                type: 'warning',
                message: 'QualificationLevel should be a valid string',
                rowIndex: index,
                column: qualColumn,
                value: qual,
                severity: 'low'
              });
            }
          }
        });
        
        return errors;
      }
    }
  ],
  
  task: [
    {
      name: 'required_columns',
      description: 'Check for missing required columns',
      validate: (data: any[], entityType: string) => {
        const errors: ValidationError[] = [];
        const requiredColumns = ['taskid', 'taskname', 'duration', 'requiredskills', 'preferredphases', 'maxconcurrent'];
        
        if (data.length === 0) return errors;
        
        const headers = Object.keys(data[0]);
        const missingColumns = requiredColumns.filter(col => 
          !headers.some(header => header.toLowerCase().includes(col.toLowerCase()))
        );
        
        if (missingColumns.length > 0) {
          errors.push({
            type: 'error',
            message: `Missing required columns: ${missingColumns.join(', ')}`,
            severity: 'high'
          });
        }
        
        return errors;
      }
    },
    {
      name: 'duplicate_task_ids',
      description: 'Check for duplicate TaskIDs',
      validate: (data: any[], entityType: string) => {
        const errors: ValidationError[] = [];
        const idColumn = findColumnByPattern(data, ['taskid', 'task_id', 'id']);
        
        if (!idColumn) return errors;
        
        const ids = data.map(row => row[idColumn]).filter(id => id !== undefined && id !== '');
        const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
        
        duplicates.forEach(duplicateId => {
          const duplicateRows = data
            .map((row, index) => ({ row, index }))
            .filter(({ row }) => row[idColumn] === duplicateId);
          
          duplicateRows.forEach(({ index }) => {
            errors.push({
              type: 'error',
              message: `Duplicate TaskID: ${duplicateId}`,
              rowIndex: index,
              column: idColumn,
              value: duplicateId,
              severity: 'high'
            });
          });
        });
        
        return errors;
      }
    },
    {
      name: 'duration_validation',
      description: 'Validate Duration is >= 1',
      validate: (data: any[], entityType: string) => {
        const errors: ValidationError[] = [];
        const durationColumn = findColumnByPattern(data, ['duration']);
        
        if (!durationColumn) return errors;
        
        data.forEach((row, index) => {
          const duration = row[durationColumn];
          if (duration !== undefined && duration !== '') {
            const durationNum = typeof duration === 'number' ? duration : parseInt(duration);
            if (isNaN(durationNum) || durationNum < 1) {
              errors.push({
                type: 'error',
                message: 'Duration must be >= 1',
                rowIndex: index,
                column: durationColumn,
                value: duration,
                severity: 'medium'
              });
            }
          }
        });
        
        return errors;
      }
    },
    {
      name: 'required_skills_format',
      description: 'Validate RequiredSkills format (comma-separated)',
      validate: (data: any[], entityType: string) => {
        const errors: ValidationError[] = [];
        const skillsColumn = findColumnByPattern(data, ['requiredskills', 'required_skills', 'skills']);
        
        if (!skillsColumn) return errors;
        
        data.forEach((row, index) => {
          const skills = row[skillsColumn];
          if (skills && skills !== '') {
            const skillList = parseCommaSeparated(skills);
            if (skillList.length === 0) {
              errors.push({
                type: 'warning',
                message: 'RequiredSkills should contain valid skill tags',
                rowIndex: index,
                column: skillsColumn,
                value: skills,
                severity: 'medium'
              });
            }
          }
        });
        
        return errors;
      }
    },
    {
      name: 'preferred_phases_format',
      description: 'Validate PreferredPhases format (range or list)',
      validate: (data: any[], entityType: string) => {
        const errors: ValidationError[] = [];
        const phasesColumn = findColumnByPattern(data, ['preferredphases', 'preferred_phases', 'phases']);
        
        if (!phasesColumn) return errors;
        
        data.forEach((row, index) => {
          const phases = row[phasesColumn];
          if (phases && phases !== '') {
            const phaseList = parsePhaseRange(phases);
            if (phaseList.length === 0) {
              errors.push({
                type: 'warning',
                message: 'PreferredPhases should contain valid phase numbers or ranges',
                rowIndex: index,
                column: phasesColumn,
                value: phases,
                severity: 'medium'
              });
            }
          }
        });
        
        return errors;
      }
    },
    {
      name: 'max_concurrent_validation',
      description: 'Validate MaxConcurrent is positive',
      validate: (data: any[], entityType: string) => {
        const errors: ValidationError[] = [];
        const maxConcurrentColumn = findColumnByPattern(data, ['maxconcurrent', 'max_concurrent', 'concurrent']);
        
        if (!maxConcurrentColumn) return errors;
        
        data.forEach((row, index) => {
          const maxConcurrent = row[maxConcurrentColumn];
          if (maxConcurrent !== undefined && maxConcurrent !== '') {
            const maxConcurrentNum = typeof maxConcurrent === 'number' ? maxConcurrent : parseInt(maxConcurrent);
            if (isNaN(maxConcurrentNum) || maxConcurrentNum < 1) {
              errors.push({
                type: 'error',
                message: 'MaxConcurrent must be >= 1',
                rowIndex: index,
                column: maxConcurrentColumn,
                value: maxConcurrent,
                severity: 'medium'
              });
            }
          }
        });
        
        return errors;
      }
    },
    {
      name: 'category_validation',
      description: 'Validate Category format',
      validate: (data: any[], entityType: string) => {
        const errors: ValidationError[] = [];
        const categoryColumn = findColumnByPattern(data, ['category']);
        
        if (!categoryColumn) return errors;
        
        data.forEach((row, index) => {
          const category = row[categoryColumn];
          if (category !== undefined && category !== '') {
            if (typeof category !== 'string' || category.trim().length === 0) {
              errors.push({
                type: 'warning',
                message: 'Category should be a valid string',
                rowIndex: index,
                column: categoryColumn,
                value: category,
                severity: 'low'
              });
            }
          }
        });
        
        return errors;
      }
    }
  ]
};

// Cross-entity validation rules
export const crossEntityValidationRules: ValidationRule[] = [
  {
    name: 'client_task_references',
    description: 'Check if RequestedTaskIDs reference existing tasks',
    validate: (data: any[], entityType: string, crossEntityData?: CrossEntityData) => {
      const errors: ValidationError[] = [];
      
      if (!crossEntityData?.tasks || entityType !== 'client') return errors;
      
      const tasksColumn = findColumnByPattern(data, ['requestedtaskids', 'requested_task_ids', 'requestedtasks']);
      if (!tasksColumn) return errors;
      
             const existingTaskIds = new Set((crossEntityData.tasks || []).map(task => {
         const idColumn = findColumnByPattern(crossEntityData.tasks || [], ['taskid', 'task_id', 'id']);
         return idColumn ? task[idColumn] : null;
       }).filter(id => id !== null && id !== ''));
      
      data.forEach((row, index) => {
        const requestedTasks = row[tasksColumn];
        if (requestedTasks) {
          const taskIds = parseCommaSeparated(requestedTasks);
          const missingTasks = taskIds.filter(taskId => !existingTaskIds.has(taskId));
          
          if (missingTasks.length > 0) {
            errors.push({
              type: 'error',
              message: `RequestedTaskIDs reference non-existent tasks: ${missingTasks.join(', ')}`,
              rowIndex: index,
              column: tasksColumn,
              value: missingTasks,
              severity: 'high'
            });
          }
        }
      });
      
      return errors;
    }
  },
  {
    name: 'task_worker_skill_coverage',
    description: 'Check if every RequiredSkill maps to ≥1 worker',
    validate: (data: any[], entityType: string, crossEntityData?: CrossEntityData) => {
      const errors: ValidationError[] = [];
      
      if (!crossEntityData?.workers || entityType !== 'task') return errors;
      
      const skillsColumn = findColumnByPattern(data, ['requiredskills', 'required_skills', 'skills']);
      if (!skillsColumn) return errors;
      
             // Collect all worker skills
       const allWorkerSkills = new Set<string>();
       (crossEntityData.workers || []).forEach(worker => {
         const workerSkillsColumn = findColumnByPattern(crossEntityData.workers || [], ['skills']);
         if (workerSkillsColumn) {
           const skills = parseCommaSeparated(worker[workerSkillsColumn]);
           skills.forEach(skill => allWorkerSkills.add(skill.toLowerCase()));
         }
       });
      
      data.forEach((row, index) => {
        const requiredSkills = row[skillsColumn];
        if (requiredSkills) {
          const skillList = parseCommaSeparated(requiredSkills);
          const missingSkills = skillList.filter(skill => !allWorkerSkills.has(skill.toLowerCase()));
          
          if (missingSkills.length > 0) {
            errors.push({
              type: 'error',
              message: `RequiredSkills not covered by any worker: ${missingSkills.join(', ')}`,
              rowIndex: index,
              column: skillsColumn,
              value: missingSkills,
              severity: 'high'
            });
          }
        }
      });
      
      return errors;
    }
  },
  {
    name: 'phase_slot_saturation',
    description: 'Check if sum of task durations per phase ≤ total worker slots',
    validate: (data: any[], entityType: string, crossEntityData?: CrossEntityData) => {
      const errors: ValidationError[] = [];
      
      if (!crossEntityData?.workers || entityType !== 'task') return errors;
      
      const durationColumn = findColumnByPattern(data, ['duration']);
      const phasesColumn = findColumnByPattern(data, ['preferredphases', 'preferred_phases', 'phases']);
      
      if (!durationColumn || !phasesColumn) return errors;
      
             // Calculate total worker slots per phase
       const phaseSlots: Record<number, number> = {};
       (crossEntityData.workers || []).forEach(worker => {
         const slotsColumn = findColumnByPattern(crossEntityData.workers || [], ['availableslots', 'available_slots', 'slots']);
         if (slotsColumn) {
           try {
             const slots = Array.isArray(worker[slotsColumn]) ? worker[slotsColumn] : JSON.parse(worker[slotsColumn]);
             if (Array.isArray(slots)) {
               slots.forEach(phase => {
                 if (typeof phase === 'number' && phase > 0) {
                   phaseSlots[phase] = (phaseSlots[phase] || 0) + 1;
                 }
               });
             }
           } catch (e) {
             // Skip invalid slots
           }
         }
       });
      
      // Calculate task workload per phase
      const phaseWorkload: Record<number, number> = {};
      data.forEach((row, index) => {
        const duration = row[durationColumn];
        const phases = row[phasesColumn];
        
        if (duration && phases) {
          const durationNum = typeof duration === 'number' ? duration : parseInt(duration);
          const phaseList = parsePhaseRange(phases);
          
          if (!isNaN(durationNum) && phaseList.length > 0) {
            phaseList.forEach(phase => {
              phaseWorkload[phase] = (phaseWorkload[phase] || 0) + durationNum;
            });
          }
        }
      });
      
      // Check for saturation
      Object.entries(phaseWorkload).forEach(([phase, workload]) => {
        const phaseNum = parseInt(phase);
        const availableSlots = phaseSlots[phaseNum] || 0;
        
        if (workload > availableSlots * 2) { // Allow some flexibility
          errors.push({
            type: 'warning',
            message: `Phase ${phase} may be overloaded: ${workload} workload vs ${availableSlots} available slots`,
            severity: 'medium'
          });
        }
      });
      
      return errors;
    }
  },
  {
    name: 'max_concurrency_feasibility',
    description: 'Check if MaxConcurrent ≤ count of qualified, available workers',
    validate: (data: any[], entityType: string, crossEntityData?: CrossEntityData) => {
      const errors: ValidationError[] = [];
      
      if (!crossEntityData?.workers || entityType !== 'task') return errors;
      
      const maxConcurrentColumn = findColumnByPattern(data, ['maxconcurrent', 'max_concurrent', 'concurrent']);
      const skillsColumn = findColumnByPattern(data, ['requiredskills', 'required_skills', 'skills']);
      
      if (!maxConcurrentColumn || !skillsColumn) return errors;
      
      data.forEach((row, index) => {
        const maxConcurrent = row[maxConcurrentColumn];
        const requiredSkills = row[skillsColumn];
        
        if (maxConcurrent && requiredSkills) {
          const maxConcurrentNum = typeof maxConcurrent === 'number' ? maxConcurrent : parseInt(maxConcurrent);
          const skillList = parseCommaSeparated(requiredSkills);
          
          if (!isNaN(maxConcurrentNum) && skillList.length > 0) {
                         // Count qualified workers
             let qualifiedWorkers = 0;
             (crossEntityData.workers || []).forEach(worker => {
               const workerSkillsColumn = findColumnByPattern(crossEntityData.workers || [], ['skills']);
               if (workerSkillsColumn) {
                 const workerSkills = parseCommaSeparated(worker[workerSkillsColumn]);
                 const hasAllSkills = skillList.every(skill => 
                   workerSkills.some(ws => ws.toLowerCase() === skill.toLowerCase())
                 );
                 if (hasAllSkills) {
                   qualifiedWorkers++;
                 }
               }
             });
            
            if (maxConcurrentNum > qualifiedWorkers) {
              errors.push({
                type: 'warning',
                message: `MaxConcurrent (${maxConcurrentNum}) exceeds qualified workers (${qualifiedWorkers})`,
                rowIndex: index,
                column: maxConcurrentColumn,
                value: { maxConcurrent: maxConcurrentNum, qualifiedWorkers },
                severity: 'medium'
              });
            }
          }
        }
      });
      
      return errors;
    }
  }
];

// Helper function to find column by pattern
function findColumnByPattern(data: any[], patterns: string[]): string | null {
  if (data.length === 0) return null;
  
  const headers = Object.keys(data[0]);
  for (const pattern of patterns) {
    const found = headers.find(header => 
      header.toLowerCase().includes(pattern.toLowerCase())
    );
    if (found) return found;
  }
  return null;
}

// Main validation function
export function validateData(data: any[], entityType: string, crossEntityData?: CrossEntityData): ValidationResult {
  const allErrors: ValidationError[] = [];
  
  // Run entity-specific validations
  const entityRules = validationRules[entityType] || [];
  entityRules.forEach(rule => {
    const ruleErrors = rule.validate(data, entityType, crossEntityData);
    allErrors.push(...ruleErrors);
  });
  
  // Run cross-entity validations
  crossEntityValidationRules.forEach(rule => {
    const ruleErrors = rule.validate(data, entityType, crossEntityData);
    allErrors.push(...ruleErrors);
  });
  
  // Generate summary
  const errorTypes: Record<string, number> = {};
  const affectedRows = new Set<number>();
  
  allErrors.forEach(error => {
    errorTypes[error.message] = (errorTypes[error.message] || 0) + 1;
    if (error.rowIndex !== undefined) {
      affectedRows.add(error.rowIndex);
    }
  });
  
  const summary = {
    totalErrors: allErrors.filter(e => e.type === 'error').length,
    totalWarnings: allErrors.filter(e => e.type === 'warning').length,
    errorTypes,
    affectedRows: Array.from(affectedRows).sort((a, b) => a - b)
  };
  
  return {
    errors: allErrors,
    summary
  };
}

// Function to get errors for a specific row
export function getRowErrors(errors: ValidationError[], rowIndex: number): ValidationError[] {
  return errors.filter(error => error.rowIndex === rowIndex);
}

// Function to get errors for a specific cell
export function getCellErrors(errors: ValidationError[], rowIndex: number, column: string): ValidationError[] {
  return errors.filter(error => 
    error.rowIndex === rowIndex && error.column === column
  );
} 