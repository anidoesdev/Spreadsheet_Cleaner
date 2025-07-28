import React, { useState } from 'react';
import { executeNaturalLanguageSearch, AISearchResult } from '@/lib/aiEngine';

interface AISearchProps {
  data: any[];
  onSearchResult: (result: AISearchResult) => void;
  onClearSearch: () => void;
}

export default function AISearch({ data, onSearchResult, onClearSearch }: AISearchProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  const handleSearch = async () => {
    if (!query.trim() || !data.length) return;

    setIsSearching(true);
    
    try {
      // Simulate AI processing delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const result = executeNaturalLanguageSearch(data, query);
      onSearchResult(result);
      
      // Add to search history
      if (!searchHistory.includes(query)) {
        setSearchHistory(prev => [query, ...prev.slice(0, 4)]);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    onClearSearch();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const exampleQueries = [
    'tasks with duration more than 5',
    'workers with role developer',
    'tasks with priority level greater than 3',
    'tasks with phase 2 in preferred phases',
    'workers with skills javascript',
    'tasks with duration less than 3 and priority greater than 4'
  ];

  return (
    <div className="space-y-4">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Search with natural language (e.g. 'tasks with duration more than 5')"
          className="w-full p-3 pr-20 border border-gray-700 rounded-lg bg-gray-900 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-900"
          disabled={isSearching}
        />
        
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-2">
          {query && (
            <button
              onClick={handleClear}
              className="px-2 py-1 text-gray-400 hover:text-gray-300 text-sm"
              title="Clear search"
            >
              ✕
            </button>
          )}
          
          <button
            onClick={handleSearch}
            disabled={!query.trim() || isSearching}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            {isSearching ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                <span>Searching...</span>
              </>
            ) : (
              <>
                <span>🔍</span>
                <span>Search</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Search History */}
      {searchHistory.length > 0 && (
        <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
          <h4 className="text-sm font-semibold text-gray-200 mb-2">Recent Searches</h4>
          <div className="space-y-1">
            {searchHistory.map((historyQuery, index) => (
              <button
                key={index}
                onClick={() => setQuery(historyQuery)}
                className="block w-full text-left text-xs text-gray-400 hover:text-gray-300 p-1 rounded hover:bg-gray-800"
              >
                {historyQuery}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Example Queries */}
      <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
        <h4 className="text-sm font-semibold text-gray-200 mb-2">Example Queries</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {exampleQueries.map((example, index) => (
            <button
              key={index}
              onClick={() => setQuery(example)}
              className="text-xs text-gray-400 hover:text-gray-300 p-2 rounded border border-gray-700 hover:border-gray-600 text-left"
            >
              "{example}"
            </button>
          ))}
        </div>
      </div>

      {/* AI Features Info */}
      <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3">
        <h4 className="text-sm font-semibold text-blue-300 mb-2">🤖 AI-Powered Search</h4>
        <p className="text-xs text-blue-200">
          Use natural language to search your data. The AI understands queries like:
        </p>
        <ul className="text-xs text-blue-200 mt-2 space-y-1">
          <li>• "tasks with duration more than 5"</li>
          <li>• "workers with role developer"</li>
          <li>• "tasks with priority greater than 3"</li>
          <li>• "tasks with phase 2 in preferred phases"</li>
        </ul>
      </div>
    </div>
  );
} 