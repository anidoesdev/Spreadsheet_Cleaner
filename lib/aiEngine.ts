export interface AIQuery {
  type: 'search' | 'modify' | 'correct';
  query: string;
  entityType: string;
}

export interface AISearchResult {
  matchedRows: number[];
  query: string;
  explanation: string;
}

export interface AIModificationSuggestion {
  rowIndex: number;
  column: string;
  currentValue: any;
  suggestedValue: any;
  confidence: number;
  reason: string;
}

export interface AICorrectionSuggestion {
  type: 'missing_value' | 'format_error' | 'range_error' | 'reference_error' | 'duplicate_error';
  rowIndex: number;
  column: string;
  currentValue: any;
  suggestedValue: any;
  confidence: number;
  reason: string;
  autoApply: boolean;
}

export interface AIValidationRule {
  name: string;
  description: string;
  validate: (data: any[], entityType: string) => AICorrectionSuggestion[];
}

// AI-powered validation rules that go beyond basic validation
export const aiValidationRules: AIValidationRule[] = [
  {
    name: 'smart_email_correction',
    description: 'AI-powered email format correction',
    validate: (data: any[], entityType: string) => {
      const suggestions: AICorrectionSuggestion[] = [];
      const emailColumn = findColumnByPattern(data, ['email']);
      
      if (!emailColumn) return suggestions;
      
      data.forEach((row, index) => {
        const email = row[emailColumn];
        if (email && typeof email === 'string') {
          // Common email corrections
          let correctedEmail = email.trim().toLowerCase();
          
          // Fix common domain typos
          const domainFixes: Record<string, string> = {
            'gmial.com': 'gmail.com',
            'gmal.com': 'gmail.com',
            'gmai.com': 'gmail.com',
            'hotmai.com': 'hotmail.com',
            'hotmal.com': 'hotmail.com',
            'yaho.com': 'yahoo.com',
            'outlok.com': 'outlook.com'
          };
          
          const domain = correctedEmail.split('@')[1];
          if (domain && domainFixes[domain]) {
            correctedEmail = correctedEmail.replace(domain, domainFixes[domain]);
          }
          
          // Add missing @ symbol
          if (!correctedEmail.includes('@') && correctedEmail.includes('.')) {
            const parts = correctedEmail.split('.');
            if (parts.length >= 2) {
              correctedEmail = parts[0] + '@' + parts.slice(1).join('.');
            }
          }
          
          if (correctedEmail !== email && isValidEmail(correctedEmail)) {
            suggestions.push({
              type: 'format_error',
              rowIndex: index,
              column: emailColumn,
              currentValue: email,
              suggestedValue: correctedEmail,
              confidence: 0.9,
              reason: 'Fixed common email format issues',
              autoApply: true
            });
          }
        }
      });
      
      return suggestions;
    }
  },
  {
    name: 'smart_phone_correction',
    description: 'AI-powered phone number format correction',
    validate: (data: any[], entityType: string) => {
      const suggestions: AICorrectionSuggestion[] = [];
      const phoneColumn = findColumnByPattern(data, ['phone', 'phone_number', 'contact']);
      
      if (!phoneColumn) return suggestions;
      
      data.forEach((row, index) => {
        const phone = row[phoneColumn];
        if (phone && typeof phone === 'string') {
          // Remove all non-digit characters
          const digits = phone.replace(/\D/g, '');
          
          if (digits.length === 10) {
            const formattedPhone = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
            if (formattedPhone !== phone) {
              suggestions.push({
                type: 'format_error',
                rowIndex: index,
                column: phoneColumn,
                currentValue: phone,
                suggestedValue: formattedPhone,
                confidence: 0.95,
                reason: 'Standardized phone number format',
                autoApply: true
              });
            }
          }
        }
      });
      
      return suggestions;
    }
  },
  {
    name: 'smart_skill_suggestions',
    description: 'AI-powered skill suggestions based on role',
    validate: (data: any[], entityType: string) => {
      const suggestions: AICorrectionSuggestion[] = [];
      const skillsColumn = findColumnByPattern(data, ['skills', 'requiredskills', 'required_skills']);
      const roleColumn = findColumnByPattern(data, ['role', 'position', 'job']);
      
      if (!skillsColumn || !roleColumn) return suggestions;
      
      const roleSkillMap: Record<string, string[]> = {
        'developer': ['javascript', 'python', 'java', 'react', 'node.js', 'sql'],
        'designer': ['figma', 'sketch', 'adobe', 'ui/ux', 'prototyping', 'wireframing'],
        'manager': ['leadership', 'project management', 'communication', 'agile', 'scrum'],
        'analyst': ['data analysis', 'sql', 'excel', 'python', 'statistics', 'reporting'],
        'engineer': ['java', 'python', 'c++', 'system design', 'algorithms', 'databases']
      };
      
      data.forEach((row, index) => {
        const role = row[roleColumn];
        const skills = row[skillsColumn];
        
        if (role && !skills) {
          const roleLower = role.toLowerCase();
          const suggestedSkills = roleSkillMap[roleLower] || [];
          
          if (suggestedSkills.length > 0) {
            suggestions.push({
              type: 'missing_value',
              rowIndex: index,
              column: skillsColumn,
              currentValue: null,
              suggestedValue: JSON.stringify(suggestedSkills),
              confidence: 0.8,
              reason: `Suggested skills based on role: ${role}`,
              autoApply: false
            });
          }
        }
      });
      
      return suggestions;
    }
  },
  {
    name: 'smart_duration_estimation',
    description: 'AI-powered task duration estimation',
    validate: (data: any[], entityType: string) => {
      const suggestions: AICorrectionSuggestion[] = [];
      const durationColumn = findColumnByPattern(data, ['duration']);
      const titleColumn = findColumnByPattern(data, ['title', 'name']);
      const priorityColumn = findColumnByPattern(data, ['prioritylevel', 'priority_level', 'priority']);
      
      if (!durationColumn || !titleColumn) return suggestions;
      
      data.forEach((row, index) => {
        const duration = durationColumn ? row[durationColumn] : null;
        const title = titleColumn ? row[titleColumn] : null;
        const priority = priorityColumn ? row[priorityColumn] : null;
        
        if (!duration && title) {
          // Simple duration estimation based on title keywords
          const titleLower = title.toLowerCase();
          let estimatedDuration = 5; // Default 5 days
          
          if (titleLower.includes('review') || titleLower.includes('test')) {
            estimatedDuration = 2;
          } else if (titleLower.includes('design') || titleLower.includes('plan')) {
            estimatedDuration = 7;
          } else if (titleLower.includes('implement') || titleLower.includes('develop')) {
            estimatedDuration = 10;
          } else if (titleLower.includes('research') || titleLower.includes('analysis')) {
            estimatedDuration = 5;
          }
          
          // Adjust based on priority
          if (priority) {
            const priorityNum = typeof priority === 'number' ? priority : parseInt(priority);
            if (priorityNum >= 4) {
              estimatedDuration = Math.max(1, estimatedDuration - 2);
            }
          }
          
          suggestions.push({
            type: 'missing_value',
            rowIndex: index,
            column: durationColumn,
            currentValue: null,
            suggestedValue: estimatedDuration,
            confidence: 0.7,
            reason: `Estimated duration based on task title: "${title}"`,
            autoApply: false
          });
        }
      });
      
      return suggestions;
    }
  }
];

// Natural language query parser
export function parseNaturalLanguageQuery(query: string): { operation: string; conditions: any[] } {
  const lowerQuery = query.toLowerCase();
  const conditions: any[] = [];
  
  // Parse duration conditions
  const durationMatch = lowerQuery.match(/duration\s+(?:of\s+)?(?:more\s+than|greater\s+than|>\s*)(\d+)/);
  if (durationMatch) {
    conditions.push({
      column: 'duration',
      operator: '>',
      value: parseInt(durationMatch[1])
    });
  }
  
  const durationLessMatch = lowerQuery.match(/duration\s+(?:of\s+)?(?:less\s+than|<\s*)(\d+)/);
  if (durationLessMatch) {
    conditions.push({
      column: 'duration',
      operator: '<',
      value: parseInt(durationLessMatch[1])
    });
  }
  
  // Parse priority conditions - FIXED REGEX PATTERNS
  const priorityGreaterMatch = lowerQuery.match(/(?:.*\s+)?priority\s+(?:level\s+)?(?:greater\s+than|more\s+than|>\s*)\s*(\d+)/);
  if (priorityGreaterMatch) {
    conditions.push({
      column: 'prioritylevel',
      operator: '>',
      value: parseInt(priorityGreaterMatch[1])
    });
  }
  
  const priorityLessMatch = lowerQuery.match(/(?:.*\s+)?priority\s+(?:level\s+)?(?:less\s+than|<\s*)\s*(\d+)/);
  if (priorityLessMatch) {
    conditions.push({
      column: 'prioritylevel',
      operator: '<',
      value: parseInt(priorityLessMatch[1])
    });
  }
  
  // Parse exact priority level (only if no other priority conditions found)
  if (!priorityGreaterMatch && !priorityLessMatch) {
    const priorityExactMatch = lowerQuery.match(/(?:.*\s+)?priority\s+(?:level\s+)?(\d+)/);
    if (priorityExactMatch) {
      conditions.push({
        column: 'prioritylevel',
        operator: '=',
        value: parseInt(priorityExactMatch[1])
      });
    }
  }
  
  // Parse phase conditions
  const phaseMatch = lowerQuery.match(/phase\s+(\d+)/);
  if (phaseMatch) {
    conditions.push({
      column: 'preferredphases',
      operator: 'includes',
      value: parseInt(phaseMatch[1])
    });
  }
  
  // Parse skill conditions
  const skillMatch = lowerQuery.match(/skill[s]?\s+(?:of\s+)?([a-zA-Z\s,]+)/);
  if (skillMatch) {
    const skills = skillMatch[1].split(/[,\s]+/).filter(s => s.length > 0);
    skills.forEach(skill => {
      conditions.push({
        column: 'requiredskills',
        operator: 'includes',
        value: skill.trim()
      });
    });
  }
  
  // Parse role/group conditions
  const roleMatch = lowerQuery.match(/role\s+(?:of\s+)?([a-zA-Z\s]+)/);
  if (roleMatch) {
    conditions.push({
      column: 'workergroup',
      operator: '=',
      value: roleMatch[1].trim()
    });
  }
  
  // Parse group conditions
  const groupMatch = lowerQuery.match(/group\s+(?:of\s+)?([a-zA-Z\s]+)/);
  if (groupMatch) {
    conditions.push({
      column: 'grouptag',
      operator: '=',
      value: groupMatch[1].trim()
    });
  }
  
  // Parse specific group keywords
  if (lowerQuery.includes('enterprise')) {
    conditions.push({
      column: 'grouptag',
      operator: '=',
      value: 'enterprise'
    });
  }
  
  if (lowerQuery.includes('startup')) {
    conditions.push({
      column: 'grouptag',
      operator: '=',
      value: 'startup'
    });
  }
  
  if (lowerQuery.includes('small')) {
    conditions.push({
      column: 'grouptag',
      operator: '=',
      value: 'small'
    });
  }
  
  // Parse category conditions
  const categoryMatch = lowerQuery.match(/category\s+(?:of\s+)?([a-zA-Z\s]+)/);
  if (categoryMatch) {
    conditions.push({
      column: 'category',
      operator: '=',
      value: categoryMatch[1].trim()
    });
  }
  
  return {
    operation: 'AND',
    conditions
  };
}

// Execute natural language search
export function executeNaturalLanguageSearch(data: any[], query: string): AISearchResult {
  const parsed = parseNaturalLanguageQuery(query);
  const matchedRows: number[] = [];
  
  data.forEach((row, index) => {
    let matches = true;
    
    for (const condition of parsed.conditions) {
      const value = row[condition.column];
      
      if (!matchesCondition(value, condition)) {
        matches = false;
        break;
      }
    }
    
    if (matches) {
      matchedRows.push(index);
    }
  });
  
  return {
    matchedRows,
    query,
    explanation: `Found ${matchedRows.length} rows matching: ${query}`
  };
}

// Apply AI suggestions
export function applyAISuggestions(data: any[], suggestions: AICorrectionSuggestion[]): any[] {
  const newData = [...data];
  
  suggestions.forEach(suggestion => {
    if (suggestion.autoApply || suggestion.confidence > 0.8) {
      newData[suggestion.rowIndex] = {
        ...newData[suggestion.rowIndex],
        [suggestion.column]: suggestion.suggestedValue
      };
    }
  });
  
  return newData;
}

// Generate AI validation suggestions
export function generateAIValidationSuggestions(data: any[], entityType: string): AICorrectionSuggestion[] {
  const suggestions: AICorrectionSuggestion[] = [];
  
  aiValidationRules.forEach(rule => {
    const ruleSuggestions = rule.validate(data, entityType);
    suggestions.push(...ruleSuggestions);
  });
  
  return suggestions;
}

// Helper functions
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

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function matchesCondition(value: any, condition: any): boolean {
  switch (condition.operator) {
    case '>':
      const numValue = typeof value === 'string' ? parseInt(value) : value;
      return typeof numValue === 'number' && !isNaN(numValue) && numValue > condition.value;
    case '<':
      const numValue2 = typeof value === 'string' ? parseInt(value) : value;
      return typeof numValue2 === 'number' && !isNaN(numValue2) && numValue2 < condition.value;
    case '=':
      return value === condition.value;
    case 'includes':
      if (Array.isArray(value)) {
        return value.includes(condition.value);
      }
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) && parsed.includes(condition.value);
        } catch {
          return value.toLowerCase().includes(condition.value.toLowerCase());
        }
      }
      return false;
    default:
      return false;
  }
} 