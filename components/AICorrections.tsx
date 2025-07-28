import React, { useState, useEffect } from 'react';
import { AICorrectionSuggestion, generateAIValidationSuggestions, applyAISuggestions } from '@/lib/aiEngine';

interface AICorrectionsProps {
  data: any[];
  entityType: string;
  onApplySuggestions: (newData: any[]) => void;
}

export default function AICorrections({ data, entityType, onApplySuggestions }: AICorrectionsProps) {
  const [suggestions, setSuggestions] = useState<AICorrectionSuggestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());
  const [showApplied, setShowApplied] = useState(false);

  useEffect(() => {
    if (data.length > 0 && entityType) {
      generateSuggestions();
    }
  }, [data, entityType]);

  const generateSuggestions = async () => {
    setIsGenerating(true);
    
    try {
      // Simulate AI processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const aiSuggestions = generateAIValidationSuggestions(data, entityType);
      setSuggestions(aiSuggestions);
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSuggestionToggle = (index: number) => {
    const newSelected = new Set(selectedSuggestions);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedSuggestions(newSelected);
  };

  const handleApplySelected = () => {
    const selectedSuggestionsList = suggestions.filter((_, index) => selectedSuggestions.has(index));
    const newData = applyAISuggestions(data, selectedSuggestionsList);
    onApplySuggestions(newData);
    setShowApplied(true);
    
    // Reset selection after applying
    setTimeout(() => {
      setSelectedSuggestions(new Set());
      setShowApplied(false);
    }, 2000);
  };

  const handleApplyAll = () => {
    const newData = applyAISuggestions(data, suggestions);
    onApplySuggestions(newData);
    setShowApplied(true);
    
    setTimeout(() => {
      setShowApplied(false);
    }, 2000);
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'missing_value': return '🔍';
      case 'format_error': return '🔧';
      case 'range_error': return '📊';
      case 'reference_error': return '🔗';
      case 'duplicate_error': return '🔄';
      default: return '💡';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-400';
    if (confidence >= 0.7) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.9) return 'High';
    if (confidence >= 0.7) return 'Medium';
    return 'Low';
  };

  if (suggestions.length === 0 && !isGenerating) {
    return (
      <div className="text-center py-8 text-gray-400">
        <div className="text-4xl mb-2">🤖</div>
        <p>No AI suggestions available</p>
        <p className="text-sm">Upload data and select entity type to get AI-powered corrections</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-200">🤖 AI Data Corrections</h3>
        <div className="flex gap-2">
          {suggestions.length > 0 && (
            <>
              <button
                onClick={handleApplySelected}
                disabled={selectedSuggestions.size === 0}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Apply Selected ({selectedSuggestions.size})
              </button>
              <button
                onClick={handleApplyAll}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
              >
                Apply All ({suggestions.length})
              </button>
            </>
          )}
        </div>
      </div>

      {/* Success Message */}
      {showApplied && (
        <div className="bg-green-900/20 border border-green-700 rounded-lg p-3 text-green-300">
          ✅ Suggestions applied successfully! Data has been updated.
        </div>
      )}

      {/* Loading State */}
      {isGenerating && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-2"></div>
          <p className="text-gray-400">AI is analyzing your data...</p>
        </div>
      )}

      {/* Suggestions List */}
      {!isGenerating && suggestions.length > 0 && (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border transition-colors ${
                selectedSuggestions.has(index)
                  ? 'border-blue-500 bg-blue-900/20'
                  : 'border-gray-700 bg-gray-900'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedSuggestions.has(index)}
                  onChange={() => handleSuggestionToggle(index)}
                  className="mt-1"
                />
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{getSuggestionIcon(suggestion.type)}</span>
                    <span className="text-sm font-medium text-gray-200">
                      {suggestion.reason}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${getConfidenceColor(suggestion.confidence)} bg-gray-800`}>
                      {getConfidenceText(suggestion.confidence)} Confidence
                    </span>
                    {suggestion.autoApply && (
                      <span className="text-xs px-2 py-1 rounded text-green-400 bg-green-900/20">
                        Auto-Apply
                      </span>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-400 mb-2">
                    Row {suggestion.rowIndex + 1}, Column: {suggestion.column}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Current:</span>
                      <div className="text-red-400 font-mono bg-red-900/20 p-1 rounded mt-1">
                        {suggestion.currentValue === null ? 'null' : JSON.stringify(suggestion.currentValue)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Suggested:</span>
                      <div className="text-green-400 font-mono bg-green-900/20 p-1 rounded mt-1">
                        {JSON.stringify(suggestion.suggestedValue)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Features Info */}
      <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-3">
        <h4 className="text-sm font-semibold text-purple-300 mb-2">🧠 AI-Powered Corrections</h4>
        <p className="text-xs text-purple-200 mb-2">
          The AI analyzes your data and suggests intelligent fixes for:
        </p>
        <ul className="text-xs text-purple-200 space-y-1">
          <li>• Email format corrections (fix typos, add missing @)</li>
          <li>• Phone number standardization</li>
          <li>• Skill suggestions based on role</li>
          <li>• Duration estimation based on task title</li>
          <li>• Missing value suggestions</li>
        </ul>
      </div>
    </div>
  );
} 