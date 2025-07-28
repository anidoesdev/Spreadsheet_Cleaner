import React, { useState, useEffect } from 'react';
import { 
  PrioritizationCriteria,
  PrioritizationProfile,
  PrioritizationConfig,
  PairwiseComparison,
  presetProfiles,
  defaultCriteria,
  generatePairwiseComparisons,
  calculateWeightsFromPairwise,
  calculateConsistencyRatio,
  normalizeWeights,
  validatePrioritization,
  createCustomProfile,
  exportPrioritizationConfig,
  generateExcelData,
  pairwiseScale
} from '@/lib/prioritizationEngine';

interface PrioritizationPanelProps {
  clients: any[];
  workers: any[];
  tasks: any[];
  rules: any[];
  onConfigChange: (config: PrioritizationConfig) => void;
}

export default function PrioritizationPanel({ 
  clients, 
  workers, 
  tasks, 
  rules, 
  onConfigChange 
}: PrioritizationPanelProps) {
  const [activeMethod, setActiveMethod] = useState<'sliders' | 'ranking' | 'pairwise' | 'profiles'>('profiles');
  const [selectedProfile, setSelectedProfile] = useState<PrioritizationProfile>(presetProfiles[0]);
  const [customCriteria, setCustomCriteria] = useState<PrioritizationCriteria[]>(defaultCriteria);
  const [pairwiseComparisons, setPairwiseComparisons] = useState<PairwiseComparison[]>([]);
  const [consistencyRatio, setConsistencyRatio] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    // Initialize pairwise comparisons
    const comparisons = generatePairwiseComparisons(customCriteria);
    setPairwiseComparisons(comparisons);
    
    // Calculate initial consistency ratio
    const ratio = calculateConsistencyRatio(comparisons, customCriteria);
    setConsistencyRatio(ratio);
  }, [customCriteria]);

  useEffect(() => {
    // Update configuration when any changes occur
    const config: PrioritizationConfig = {
      profile: selectedProfile,
      pairwiseComparisons,
      consistencyRatio,
      isValid: validationErrors.length === 0,
      exportData: {
        clients: [],
        workers: [],
        tasks: [],
        rules: [],
        prioritization: {}
      }
    };

    // Validate configuration
    const validation = validatePrioritization(config);
    setValidationErrors(validation.errors);

    // Update parent component
    onConfigChange(config);
  }, [selectedProfile, pairwiseComparisons, consistencyRatio]); // Removed onConfigChange from dependencies

  const handleProfileSelect = (profile: PrioritizationProfile) => {
    setSelectedProfile(profile);
    setCustomCriteria(profile.criteria);
  };

  const handleSliderChange = (criterionId: string, newWeight: number) => {
    const updatedCriteria = customCriteria.map(criterion => {
      if (criterion.id === criterionId) {
        return { ...criterion, weight: newWeight };
      }
      return criterion;
    });

    // Normalize weights to sum to 1
    const weights = updatedCriteria.map(c => c.weight);
    const normalizedWeights = normalizeWeights(weights);
    const normalizedCriteria = updatedCriteria.map((criterion, index) => ({
      ...criterion,
      weight: normalizedWeights[index]
    }));

    setCustomCriteria(normalizedCriteria);
    
    // Update selected profile
    const updatedProfile = {
      ...selectedProfile,
      criteria: normalizedCriteria
    };
    setSelectedProfile(updatedProfile);
  };

  const handleRankingChange = (criterionId: string, newRank: number) => {
    // Convert ranking to weights (higher rank = higher weight)
    const sortedCriteria = [...customCriteria].sort((a, b) => {
      const aRank = a.id === criterionId ? newRank : customCriteria.find(c => c.id === a.id)?.weight || 0;
      const bRank = b.id === criterionId ? newRank : customCriteria.find(c => c.id === b.id)?.weight || 0;
      return bRank - aRank;
    });

    // Convert ranks to weights (inverse relationship)
    const maxRank = customCriteria.length;
    const updatedCriteria = sortedCriteria.map((criterion, index) => ({
      ...criterion,
      weight: (maxRank - index) / maxRank
    }));

    // Normalize weights
    const weights = updatedCriteria.map(c => c.weight);
    const normalizedWeights = normalizeWeights(weights);
    const normalizedCriteria = updatedCriteria.map((criterion, index) => ({
      ...criterion,
      weight: normalizedWeights[index]
    }));

    setCustomCriteria(normalizedCriteria);
    
    const updatedProfile = {
      ...selectedProfile,
      criteria: normalizedCriteria
    };
    setSelectedProfile(updatedProfile);
  };

  const handlePairwiseChange = (criterion1: string, criterion2: string, value: number) => {
    const updatedComparisons = pairwiseComparisons.map(comp => {
      if ((comp.criterion1 === criterion1 && comp.criterion2 === criterion2) ||
          (comp.criterion1 === criterion2 && comp.criterion2 === criterion1)) {
        return { ...comp, value };
      }
      return comp;
    });

    setPairwiseComparisons(updatedComparisons);

    // Calculate new weights from pairwise comparisons
    const newWeights = calculateWeightsFromPairwise(updatedComparisons, customCriteria);
    const updatedCriteria = customCriteria.map((criterion, index) => ({
      ...criterion,
      weight: newWeights[index]
    }));

    setCustomCriteria(updatedCriteria);
    
    // Update consistency ratio
    const ratio = calculateConsistencyRatio(updatedComparisons, customCriteria);
    setConsistencyRatio(ratio);

    const updatedProfile = {
      ...selectedProfile,
      criteria: updatedCriteria
    };
    setSelectedProfile(updatedProfile);
  };

  const handleCreateCustomProfile = () => {
    const customProfile = createCustomProfile(
      'Custom Profile',
      'User-defined prioritization profile',
      customCriteria
    );
    setSelectedProfile(customProfile);
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const config: PrioritizationConfig = {
        profile: selectedProfile,
        pairwiseComparisons,
        consistencyRatio,
        isValid: validationErrors.length === 0,
        exportData: {
          clients: [],
          workers: [],
          tasks: [],
          rules: [],
          prioritization: {}
        }
      };

      const exportData = exportPrioritizationConfig(config, clients, workers, tasks, rules);
      const excelData = generateExcelData(exportData);

      // Export clients sheet
      const clientsBlob = new Blob([
        'ClientID,ClientName,PriorityLevel,RequestedTaskIDs,GroupTag,CalculatedPriority,AttributesJSON\n' +
        excelData.clients.map(client => 
          `"${client.ClientID}","${client.ClientName}",${client.PriorityLevel},"${client.RequestedTaskIDs}","${client.GroupTag}",${client.CalculatedPriority},"${client.AttributesJSON}"`
        ).join('\n')
      ], { type: 'text/csv' });

      // Export workers sheet
      const workersBlob = new Blob([
        'WorkerID,WorkerName,Skills,AvailableSlots,MaxLoadPerPhase,WorkerGroup,QualificationLevel,CalculatedCapacity\n' +
        excelData.workers.map(worker => 
          `"${worker.WorkerID}","${worker.WorkerName}","${worker.Skills}","${worker.AvailableSlots}",${worker.MaxLoadPerPhase},"${worker.WorkerGroup}","${worker.QualificationLevel}",${worker.CalculatedCapacity}`
        ).join('\n')
      ], { type: 'text/csv' });

      // Export tasks sheet
      const tasksBlob = new Blob([
        'TaskID,TaskName,Category,Duration,RequiredSkills,PreferredPhases,MaxConcurrent,CalculatedComplexity\n' +
        excelData.tasks.map(task => 
          `"${task.TaskID}","${task.TaskName}","${task.Category}",${task.Duration},"${task.RequiredSkills}","${task.PreferredPhases}",${task.MaxConcurrent},${task.CalculatedComplexity}`
        ).join('\n')
      ], { type: 'text/csv' });

      // Export prioritization config
      const configBlob = new Blob([
        JSON.stringify(exportData.prioritization, null, 2)
      ], { type: 'application/json' });

      // Download all files
      const downloadFile = (blob: Blob, filename: string) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      };

      downloadFile(clientsBlob, 'clients-prioritized.csv');
      downloadFile(workersBlob, 'workers-prioritized.csv');
      downloadFile(tasksBlob, 'tasks-prioritized.csv');
      downloadFile(configBlob, 'prioritization-config.json');

    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const totalWeight = customCriteria.reduce((sum, criterion) => sum + criterion.weight, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-200">Prioritization & Weights</h2>
        <button
          onClick={handleExport}
          disabled={isExporting || validationErrors.length > 0}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting ? 'Exporting...' : 'Export All Data'}
        </button>
      </div>

      {/* Method Selection */}
      <div className="flex space-x-1 bg-gray-800 rounded-lg p-1">
        {(['profiles', 'sliders', 'ranking', 'pairwise'] as const).map(method => (
          <button
            key={method}
            onClick={() => setActiveMethod(method)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeMethod === method 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-300 hover:text-white'
            }`}
          >
            {method === 'profiles' && '📋 Preset Profiles'}
            {method === 'sliders' && '🎚️ Sliders'}
            {method === 'ranking' && '📊 Drag & Drop'}
            {method === 'pairwise' && '⚖️ Pairwise'}
          </button>
        ))}
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
          <h3 className="text-red-300 font-medium mb-2">Validation Errors</h3>
          <ul className="text-red-200 text-sm space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Weight Summary */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-medium text-gray-200">Weight Summary</h3>
          <div className={`text-sm px-2 py-1 rounded ${
            Math.abs(totalWeight - 1) < 0.01 
              ? 'bg-green-900/20 text-green-300' 
              : 'bg-red-900/20 text-red-300'
          }`}>
            Total: {totalWeight.toFixed(3)}
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {customCriteria.map(criterion => (
            <div key={criterion.id} className="bg-gray-900 rounded p-3">
              <div className="text-sm font-medium text-gray-300">{criterion.name}</div>
              <div className="text-lg font-bold text-blue-400">{criterion.weight.toFixed(3)}</div>
              <div className="text-xs text-gray-400">{criterion.category}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Preset Profiles */}
      {activeMethod === 'profiles' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {presetProfiles.map(profile => (
              <div
                key={profile.id}
                onClick={() => handleProfileSelect(profile)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  selectedProfile.id === profile.id
                    ? 'border-blue-500 bg-blue-900/20'
                    : 'border-gray-600 hover:border-gray-500'
                }`}
              >
                <h4 className="font-medium text-gray-200 mb-2">{profile.name}</h4>
                <p className="text-sm text-gray-400 mb-3">{profile.description}</p>
                <div className="space-y-1">
                  {profile.criteria.slice(0, 3).map(criterion => (
                    <div key={criterion.id} className="flex justify-between text-xs">
                      <span className="text-gray-300">{criterion.name}</span>
                      <span className="text-blue-400">{criterion.weight.toFixed(2)}</span>
                    </div>
                  ))}
                  {profile.criteria.length > 3 && (
                    <div className="text-xs text-gray-500">
                      +{profile.criteria.length - 3} more criteria
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <button
            onClick={handleCreateCustomProfile}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Create Custom Profile
          </button>
        </div>
      )}

      {/* Sliders Method */}
      {activeMethod === 'sliders' && (
        <div className="space-y-4">
          {customCriteria.map(criterion => (
            <div key={criterion.id} className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="font-medium text-gray-200">{criterion.name}</h4>
                  <p className="text-sm text-gray-400">{criterion.description}</p>
                </div>
                <div className="text-lg font-bold text-blue-400">
                  {criterion.weight.toFixed(3)}
                </div>
              </div>
              
              <div className="space-y-2">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={criterion.weight}
                  onChange={(e) => handleSliderChange(criterion.id, parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>0.0</span>
                  <span>0.5</span>
                  <span>1.0</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drag & Drop Ranking */}
      {activeMethod === 'ranking' && (
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-200 mb-4">Rank Criteria by Importance</h3>
            <div className="space-y-2">
              {customCriteria
                .sort((a, b) => b.weight - a.weight)
                .map((criterion, index) => (
                  <div key={criterion.id} className="flex items-center justify-between bg-gray-900 rounded p-3">
                    <div className="flex items-center space-x-3">
                      <div className="text-lg font-bold text-blue-400 w-8">#{index + 1}</div>
                      <div>
                        <div className="font-medium text-gray-200">{criterion.name}</div>
                        <div className="text-sm text-gray-400">{criterion.description}</div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-300">
                      Weight: {criterion.weight.toFixed(3)}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Pairwise Comparison */}
      {activeMethod === 'pairwise' && (
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-200">Pairwise Comparison Matrix</h3>
              <div className={`text-sm px-2 py-1 rounded ${
                consistencyRatio < 0.1 
                  ? 'bg-green-900/20 text-green-300' 
                  : 'bg-red-900/20 text-red-300'
              }`}>
                Consistency: {consistencyRatio.toFixed(3)}
              </div>
            </div>
            
            <div className="space-y-4">
              {pairwiseComparisons.map((comparison, index) => {
                const criterion1 = customCriteria.find(c => c.id === comparison.criterion1);
                const criterion2 = customCriteria.find(c => c.id === comparison.criterion2);
                
                return (
                  <div key={index} className="bg-gray-900 rounded p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-medium text-gray-200">
                        {criterion1?.name}
                      </div>
                      <div className="text-sm text-gray-400">vs</div>
                      <div className="text-sm font-medium text-gray-200">
                        {criterion2?.name}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-center space-x-4">
                      <div className="text-sm text-gray-300">{criterion1?.name}</div>
                      <select
                        value={comparison.value}
                        onChange={(e) => handlePairwiseChange(
                          comparison.criterion1, 
                          comparison.criterion2, 
                          parseInt(e.target.value)
                        )}
                        className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-gray-200"
                      >
                        {pairwiseScale.map(scale => (
                          <option key={scale.value} value={scale.value}>
                            {scale.value} - {scale.label}
                          </option>
                        ))}
                      </select>
                      <div className="text-sm text-gray-300">{criterion2?.name}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700 rounded">
              <h4 className="text-blue-300 font-medium mb-2">How to Use Pairwise Comparison</h4>
              <p className="text-sm text-blue-200">
                For each pair, select how much more important the left criterion is compared to the right one. 
                Use the scale from 1 (equal importance) to 9 (extremely more important).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Export Summary */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-200 mb-3">Export Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">{clients.length}</div>
            <div className="text-gray-400">Clients</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{workers.length}</div>
            <div className="text-gray-400">Workers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">{tasks.length}</div>
            <div className="text-gray-400">Tasks</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">{rules.length}</div>
            <div className="text-gray-400">Rules</div>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-gray-900 rounded">
          <div className="text-sm text-gray-300">
            <strong>Selected Profile:</strong> {selectedProfile.name}
          </div>
          <div className="text-sm text-gray-400 mt-1">
            {selectedProfile.description}
          </div>
        </div>
      </div>
    </div>
  );
} 