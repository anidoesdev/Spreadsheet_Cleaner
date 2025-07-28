import React from 'react';
import { ValidationResult, ValidationError } from '@/lib/validation';

interface ValidationSummaryProps {
  validationResult: ValidationResult | null;
  onErrorClick?: (error: ValidationError) => void;
}

export default function ValidationSummary({ validationResult, onErrorClick }: ValidationSummaryProps) {
  if (!validationResult) {
    return (
      <div className="text-gray-400 text-sm">
        No validation results available
      </div>
    );
  }

  const { errors, summary } = validationResult;

  if (errors.length === 0) {
    return (
      <div className="flex items-center gap-2 text-green-400">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <span>All validations passed! 🎉</span>
      </div>
    );
  }

  const errorsByType = errors.reduce((acc, error) => {
    const type = error.type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(error);
    return acc;
  }, {} as Record<string, ValidationError[]>);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🔵';
      default: return '⚪';
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-gray-900 rounded-lg border border-gray-700">
        <div className="text-center">
          <div className="text-2xl font-bold text-red-400">{summary.totalErrors}</div>
          <div className="text-xs text-gray-400">Errors</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-400">{summary.totalWarnings}</div>
          <div className="text-xs text-gray-400">Warnings</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-400">{summary.affectedRows.length}</div>
          <div className="text-xs text-gray-400">Affected Rows</div>
        </div>
      </div>

      {/* Error Types Summary */}
      {Object.keys(summary.errorTypes).length > 0 && (
        <div className="bg-gray-900 rounded-lg border border-gray-700 p-4">
          <h4 className="text-sm font-semibold text-gray-200 mb-3">Error Types</h4>
          <div className="space-y-2">
            {Object.entries(summary.errorTypes).map(([message, count]) => (
              <div key={message} className="flex justify-between items-center text-sm">
                <span className="text-gray-300 truncate flex-1">{message}</span>
                <span className="text-gray-400 ml-2">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Errors */}
      <div className="space-y-3">
        {Object.entries(errorsByType).map(([type, typeErrors]) => (
          <div key={type} className="bg-gray-900 rounded-lg border border-gray-700 p-4">
            <h4 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${
              type === 'error' ? 'text-red-400' : 'text-yellow-400'
            }`}>
              {type === 'error' ? '🔴' : '🟡'}
              {type === 'error' ? 'Errors' : 'Warnings'} ({typeErrors.length})
            </h4>
            
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {typeErrors.map((error, index) => (
                <div
                  key={index}
                  className={`p-3 rounded border-l-4 cursor-pointer hover:bg-gray-800 transition-colors ${
                    error.severity === 'high' ? 'border-l-red-500 bg-red-900/20' :
                    error.severity === 'medium' ? 'border-l-yellow-500 bg-yellow-900/20' :
                    'border-l-blue-500 bg-blue-900/20'
                  }`}
                  onClick={() => onErrorClick?.(error)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={getSeverityColor(error.severity)}>
                          {getSeverityIcon(error.severity)}
                        </span>
                        <span className="text-sm font-medium text-gray-200">
                          {error.message}
                        </span>
                      </div>
                      
                      {error.rowIndex !== undefined && (
                        <div className="text-xs text-gray-400">
                          Row {error.rowIndex + 1}
                          {error.column && ` • Column: ${error.column}`}
                          {error.value && ` • Value: ${JSON.stringify(error.value)}`}
                        </div>
                      )}
                    </div>
                    
                    {error.rowIndex !== undefined && (
                      <button
                        className="text-xs text-blue-400 hover:text-blue-300 ml-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          onErrorClick?.(error);
                        }}
                      >
                        Go to Row
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Affected Rows */}
      {summary.affectedRows.length > 0 && (
        <div className="bg-gray-900 rounded-lg border border-gray-700 p-4">
          <h4 className="text-sm font-semibold text-gray-200 mb-3">Affected Rows</h4>
          <div className="flex flex-wrap gap-2">
            {summary.affectedRows.map(rowIndex => (
              <span
                key={rowIndex}
                className="px-2 py-1 bg-red-900/30 text-red-300 text-xs rounded border border-red-700 cursor-pointer hover:bg-red-900/50"
                onClick={() => {
                  const rowError = errors.find(e => e.rowIndex === rowIndex);
                  if (rowError) onErrorClick?.(rowError);
                }}
              >
                Row {rowIndex + 1}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 