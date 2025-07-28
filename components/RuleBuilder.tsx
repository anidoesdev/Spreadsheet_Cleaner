import React, { useState, useEffect } from 'react';
import { 
  BusinessRule, 
  CoRunRule, 
  SlotRestrictionRule, 
  LoadLimitRule, 
  PhaseWindowRule, 
  PatternMatchRule, 
  PrecedenceOverrideRule,
  createCoRunRule,
  createSlotRestrictionRule,
  createLoadLimitRule,
  createPhaseWindowRule,
  createPatternMatchRule,
  createPrecedenceOverrideRule,
  validateRule,
  generateRulesConfig,
  analyzeDataForRuleRecommendations,
  RuleRecommendation
} from '@/lib/ruleEngine';
import { 
  parseNaturalLanguageRule, 
  generateContextualSuggestions,
  validateRuleAgainstData,
  NaturalLanguageRule,
  ParsedRule
} from '@/lib/naturalLanguageRuleConverter';

interface RuleBuilderProps {
  data: any;
  onRulesChange: (rules: BusinessRule[]) => void;
}

export default function RuleBuilder({ data, onRulesChange }: RuleBuilderProps) {
  const [rules, setRules] = useState<BusinessRule[]>([]);
  const [activeTab, setActiveTab] = useState<'manual' | 'ai' | 'recommendations'>('manual');
  const [selectedRuleType, setSelectedRuleType] = useState<BusinessRule['type']>('coRun');
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('');
  const [parsedRule, setParsedRule] = useState<ParsedRule | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recommendations, setRecommendations] = useState<RuleRecommendation[]>([]);
  const [showRecommendations, setShowRecommendations] = useState(false);

  // Manual rule form states
  const [coRunTasks, setCoRunTasks] = useState<string[]>([]);
  const [slotRestrictionGroup, setSlotRestrictionGroup] = useState({ type: 'client' as 'client' | 'worker', name: '', minSlots: 1 });
  const [loadLimitGroup, setLoadLimitGroup] = useState({ name: '', maxSlots: 1 });
  const [phaseWindowTask, setPhaseWindowTask] = useState({ taskId: '', phases: [] as number[] });
  const [patternMatchRule, setPatternMatchRule] = useState({ regex: '', template: 'skill-requirement', parameters: {} });

  useEffect(() => {
    onRulesChange(rules);
  }, [rules]);

  useEffect(() => {
    if (data && Object.keys(data).length > 0) {
      const newRecommendations = analyzeDataForRuleRecommendations(data);
      setRecommendations(newRecommendations);
    }
  }, [data]);

  const handleAddRule = (rule: BusinessRule) => {
    setRules(prev => [...prev, rule]);
  };

  const handleRemoveRule = (ruleId: string) => {
    setRules(prev => prev.filter(rule => rule.id !== ruleId));
  };

  const handleToggleRule = (ruleId: string) => {
    setRules(prev => prev.map(rule => 
      rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
    ));
  };

  const handleUpdateRulePriority = (ruleId: string, priority: number) => {
    setRules(prev => prev.map(rule => 
      rule.id === ruleId ? { ...rule, priority } : rule
    ));
  };

  const handleNaturalLanguageParse = async () => {
    if (!naturalLanguageInput.trim()) return;

    setIsProcessing(true);
    
    try {
      // Simulate AI processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const nlRule: NaturalLanguageRule = {
        text: naturalLanguageInput,
        context: data
      };
      
      const parsed = parseNaturalLanguageRule(nlRule, data);
      if (parsed) {
        const validated = validateRuleAgainstData(parsed, data);
        setParsedRule(validated);
      } else {
        setParsedRule(null);
      }
    } catch (error) {
      console.error('Error parsing natural language rule:', error);
      setParsedRule(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyParsedRule = () => {
    if (!parsedRule || !parsedRule.validation.canApply) return;

    let newRule: BusinessRule;

    switch (parsedRule.type) {
      case 'coRun':
        newRule = createCoRunRule(parsedRule.parameters.tasks, `AI Generated Co-run Rule`);
        break;
      case 'slotRestriction':
        newRule = createSlotRestrictionRule(
          parsedRule.parameters.groupType,
          parsedRule.parameters.groupName,
          parsedRule.parameters.minCommonSlots,
          `AI Generated Slot Restriction`
        );
        break;
      case 'loadLimit':
        newRule = createLoadLimitRule(
          parsedRule.parameters.workerGroup,
          parsedRule.parameters.maxSlotsPerPhase,
          `AI Generated Load Limit`
        );
        break;
      case 'phaseWindow':
        newRule = createPhaseWindowRule(
          parsedRule.parameters.taskId,
          parsedRule.parameters.allowedPhases,
          `AI Generated Phase Window`
        );
        break;
      case 'patternMatch':
        newRule = createPatternMatchRule(
          parsedRule.parameters.regex,
          parsedRule.parameters.ruleTemplate,
          parsedRule.parameters.parameters,
          `AI Generated Pattern Match`
        );
        break;
      default:
        return;
    }

    handleAddRule(newRule);
    setNaturalLanguageInput('');
    setParsedRule(null);
  };

  const handleApplyRecommendation = (recommendation: RuleRecommendation) => {
    if (recommendation.suggestedRule) {
      const newRule = recommendation.suggestedRule as BusinessRule;
      handleAddRule(newRule);
    }
  };

  const handleGenerateConfig = () => {
    const config = generateRulesConfig(rules);
    const blob = new Blob([config], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'business-rules.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getAvailableTasks = () => {
    return data.tasks?.map((t: any) => ({ id: t.taskid, name: t.taskname })) || [];
  };

  const getAvailableGroups = (type: 'client' | 'worker') => {
    if (type === 'client') {
      return [...new Set(data.clients?.map((c: any) => c.grouptag) || [])];
    } else {
      return [...new Set(data.workers?.map((w: any) => w.workergroup) || [])];
    }
  };

  const getContextualSuggestions = () => {
    return generateContextualSuggestions(naturalLanguageInput, data);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-200">Business Rules Builder</h2>
        <button
          onClick={handleGenerateConfig}
          disabled={rules.length === 0}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Generate Rules Config
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-800 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('manual')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'manual' 
              ? 'bg-blue-600 text-white' 
              : 'text-gray-300 hover:text-white'
          }`}
        >
          Manual Builder
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'ai' 
              ? 'bg-blue-600 text-white' 
              : 'text-gray-300 hover:text-white'
          }`}
        >
          AI Natural Language
        </button>
        <button
          onClick={() => setActiveTab('recommendations')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'recommendations' 
              ? 'bg-blue-600 text-white' 
              : 'text-gray-300 hover:text-white'
          }`}
        >
          AI Recommendations ({recommendations.length})
        </button>
      </div>

      {/* Manual Rule Builder */}
      {activeTab === 'manual' && (
        <div className="space-y-6">
          {/* Rule Type Selector */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-200 mb-4">Select Rule Type</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {(['coRun', 'slotRestriction', 'loadLimit', 'phaseWindow', 'patternMatch', 'precedenceOverride'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setSelectedRuleType(type)}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    selectedRuleType === type
                      ? 'border-blue-500 bg-blue-600 text-white'
                      : 'border-gray-600 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  <div className="text-sm font-medium">{type}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Rule Forms */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-200 mb-4">Configure Rule</h3>
            
            {/* Co-run Rule Form */}
            {selectedRuleType === 'coRun' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Select Tasks to Run Together
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                    {getAvailableTasks().map(task => (
                      <label key={task.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={coRunTasks.includes(task.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCoRunTasks(prev => [...prev, task.id]);
                            } else {
                              setCoRunTasks(prev => prev.filter(t => t !== task.id));
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm text-gray-300">{task.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (coRunTasks.length >= 2) {
                      const rule = createCoRunRule(coRunTasks);
                      handleAddRule(rule);
                      setCoRunTasks([]);
                    }
                  }}
                  disabled={coRunTasks.length < 2}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Add Co-run Rule
                </button>
              </div>
            )}

            {/* Slot Restriction Rule Form */}
            {selectedRuleType === 'slotRestriction' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Group Type
                  </label>
                  <select
                    value={slotRestrictionGroup.type}
                    onChange={(e) => setSlotRestrictionGroup(prev => ({ ...prev, type: e.target.value as 'client' | 'worker' }))}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-gray-200"
                  >
                    <option value="client">Client Group</option>
                    <option value="worker">Worker Group</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Group Name
                  </label>
                  <select
                    value={slotRestrictionGroup.name}
                    onChange={(e) => setSlotRestrictionGroup(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-gray-200"
                  >
                    <option value="">Select a group</option>
                    {getAvailableGroups(slotRestrictionGroup.type).map(group => (
                      <option key={group} value={group}>{group}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Minimum Common Slots
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={slotRestrictionGroup.minSlots}
                    onChange={(e) => setSlotRestrictionGroup(prev => ({ ...prev, minSlots: parseInt(e.target.value) || 1 }))}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-gray-200"
                  />
                </div>
                <button
                  onClick={() => {
                    if (slotRestrictionGroup.name) {
                      const rule = createSlotRestrictionRule(
                        slotRestrictionGroup.type,
                        slotRestrictionGroup.name,
                        slotRestrictionGroup.minSlots
                      );
                      handleAddRule(rule);
                      setSlotRestrictionGroup({ type: 'client', name: '', minSlots: 1 });
                    }
                  }}
                  disabled={!slotRestrictionGroup.name}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Add Slot Restriction Rule
                </button>
              </div>
            )}

            {/* Load Limit Rule Form */}
            {selectedRuleType === 'loadLimit' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Worker Group
                  </label>
                  <select
                    value={loadLimitGroup.name}
                    onChange={(e) => setLoadLimitGroup(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-gray-200"
                  >
                    <option value="">Select a worker group</option>
                    {getAvailableGroups('worker').map(group => (
                      <option key={group} value={group}>{group}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Maximum Slots Per Phase
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={loadLimitGroup.maxSlots}
                    onChange={(e) => setLoadLimitGroup(prev => ({ ...prev, maxSlots: parseInt(e.target.value) || 1 }))}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-gray-200"
                  />
                </div>
                <button
                  onClick={() => {
                    if (loadLimitGroup.name) {
                      const rule = createLoadLimitRule(
                        loadLimitGroup.name,
                        loadLimitGroup.maxSlots
                      );
                      handleAddRule(rule);
                      setLoadLimitGroup({ name: '', maxSlots: 1 });
                    }
                  }}
                  disabled={!loadLimitGroup.name}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Add Load Limit Rule
                </button>
              </div>
            )}

            {/* Phase Window Rule Form */}
            {selectedRuleType === 'phaseWindow' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Task
                  </label>
                  <select
                    value={phaseWindowTask.taskId}
                    onChange={(e) => setPhaseWindowTask(prev => ({ ...prev, taskId: e.target.value }))}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-gray-200"
                  >
                    <option value="">Select a task</option>
                    {getAvailableTasks().map(task => (
                      <option key={task.id} value={task.id}>{task.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Allowed Phases (comma-separated or range like 1-3)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 1,2,3 or 1-3"
                    value={phaseWindowTask.phases.join(',')}
                    onChange={(e) => {
                      const input = e.target.value;
                      const phases: number[] = [];
                      
                      if (input.includes('-')) {
                        const [start, end] = input.split('-').map(n => parseInt(n.trim()));
                        if (!isNaN(start) && !isNaN(end)) {
                          for (let i = start; i <= end; i++) {
                            phases.push(i);
                          }
                        }
                      } else {
                        phases.push(...input.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n)));
                      }
                      
                      setPhaseWindowTask(prev => ({ ...prev, phases }));
                    }}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-gray-200"
                  />
                </div>
                <button
                  onClick={() => {
                    if (phaseWindowTask.taskId && phaseWindowTask.phases.length > 0) {
                      const rule = createPhaseWindowRule(
                        phaseWindowTask.taskId,
                        phaseWindowTask.phases
                      );
                      handleAddRule(rule);
                      setPhaseWindowTask({ taskId: '', phases: [] });
                    }
                  }}
                  disabled={!phaseWindowTask.taskId || phaseWindowTask.phases.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Add Phase Window Rule
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Natural Language */}
      {activeTab === 'ai' && (
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-200 mb-4">Natural Language Rule Input</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Describe your rule in plain English
                </label>
                <textarea
                  value={naturalLanguageInput}
                  onChange={(e) => setNaturalLanguageInput(e.target.value)}
                  placeholder="e.g., 'Tasks TASK001 and TASK002 must run together' or 'Worker group Development limited to 3 slots per phase'"
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded text-gray-200 h-24 resize-none"
                />
              </div>

              {/* Contextual Suggestions */}
              {naturalLanguageInput && (
                <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-blue-300 mb-2">💡 Suggestions</h4>
                  <ul className="text-sm text-blue-200 space-y-1">
                    {getContextualSuggestions().map((suggestion, index) => (
                      <li key={index}>• {suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={handleNaturalLanguageParse}
                disabled={!naturalLanguageInput.trim() || isProcessing}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isProcessing ? 'Processing...' : 'Parse Rule'}
              </button>
            </div>

            {/* Parsed Rule Display */}
            {parsedRule && (
              <div className="mt-6 bg-gray-900 rounded-lg p-4 border border-gray-700">
                <h4 className="text-lg font-medium text-gray-200 mb-3">Parsed Rule</h4>
                
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-400">Type:</span>
                    <span className="ml-2 text-gray-200">{parsedRule.type}</span>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium text-gray-400">Confidence:</span>
                    <span className="ml-2 text-gray-200">{(parsedRule.confidence * 100).toFixed(1)}%</span>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium text-gray-400">Parameters:</span>
                    <pre className="mt-1 p-2 bg-gray-800 rounded text-sm text-gray-200 overflow-x-auto">
                      {JSON.stringify(parsedRule.parameters, null, 2)}
                    </pre>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium text-gray-400">Validation:</span>
                    <div className={`mt-1 p-2 rounded text-sm ${
                      parsedRule.validation.canApply 
                        ? 'bg-green-900/20 text-green-200 border border-green-700' 
                        : 'bg-red-900/20 text-red-200 border border-red-700'
                    }`}>
                      {parsedRule.validation.reason}
                    </div>
                  </div>
                  
                  {parsedRule.validation.suggestions.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-gray-400">Suggestions:</span>
                      <ul className="mt-1 text-sm text-yellow-200">
                        {parsedRule.validation.suggestions.map((suggestion, index) => (
                          <li key={index}>• {suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <button
                    onClick={handleApplyParsedRule}
                    disabled={!parsedRule.validation.canApply}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    Apply Rule
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Recommendations */}
      {activeTab === 'recommendations' && (
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-200">AI Rule Recommendations</h3>
              <button
                onClick={() => setShowRecommendations(!showRecommendations)}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                {showRecommendations ? 'Hide' : 'Show'} Recommendations
              </button>
            </div>
            
            {showRecommendations && recommendations.length > 0 ? (
              <div className="space-y-4">
                {recommendations.map((recommendation) => (
                  <div key={recommendation.id} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-gray-300">{recommendation.type}</span>
                          <span className="text-xs px-2 py-1 bg-blue-900/20 text-blue-300 rounded">
                            {(recommendation.confidence * 100).toFixed(0)}% confidence
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-200 mb-2">{recommendation.reason}</p>
                        
                        <div className="text-xs text-gray-400">
                          <strong>Evidence:</strong> {JSON.stringify(recommendation.dataEvidence)}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleApplyRecommendation(recommendation)}
                        className="ml-4 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <div className="text-4xl mb-2">🤖</div>
                <p>No AI recommendations available</p>
                <p className="text-sm">Upload data to get intelligent rule suggestions</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rules List */}
      {rules.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-200 mb-4">Current Rules ({rules.length})</h3>
          
          <div className="space-y-3">
            {rules
              .sort((a, b) => b.priority - a.priority)
              .map((rule) => (
                <div key={rule.id} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-sm font-medium ${
                          rule.enabled ? 'text-green-300' : 'text-gray-500'
                        }`}>
                          {rule.name}
                        </span>
                        <span className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded">
                          {rule.type}
                        </span>
                        <span className="text-xs px-2 py-1 bg-blue-900/20 text-blue-300 rounded">
                          Priority: {rule.priority}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-300 mb-2">{rule.description}</p>
                      
                      <div className="text-xs text-gray-400">
                        <strong>Parameters:</strong> {JSON.stringify(rule.parameters)}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={() => handleToggleRule(rule.id)}
                        className="rounded"
                      />
                      
                      <select
                        value={rule.priority}
                        onChange={(e) => handleUpdateRulePriority(rule.id, parseInt(e.target.value))}
                        className="text-xs bg-gray-700 border border-gray-600 rounded px-2 py-1 text-gray-200"
                      >
                        {[1, 2, 3, 4, 5].map(priority => (
                          <option key={priority} value={priority}>{priority}</option>
                        ))}
                      </select>
                      
                      <button
                        onClick={() => handleRemoveRule(rule.id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
} 