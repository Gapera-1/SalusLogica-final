import React, { useState, useCallback, useEffect, useRef } from 'react';
import { medicineAPI } from '../services/api';
import analytics from '../services/analytics';

/**
 * MedicineSearchAutocomplete Component
 * ------------------------------------
 * Provides an autocomplete/typeahead search input for medicines.
 * Features:
 * - Debounced search to reduce API calls
 * - Dropdown with suggestions
 * - Keyboard navigation (arrow keys, enter, escape)
 * - Loading and error states
 * - Accessible (ARIA)
 * - Analytics tracking
 */
const MedicineSearchAutocomplete = ({
  onSelect,
  placeholder = 'Search medicines...',
  activeOnly = false,
  className = '',
  minSearchLength = 2,
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceTimerRef = useRef(null);

  /**
   * Search medicines with debouncing
   */
  const searchMedicines = useCallback(async (searchQuery) => {
    if (searchQuery.length < minSearchLength) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await medicineAPI.search(searchQuery, activeOnly);
      const results = response.data?.results || [];
      
      setSuggestions(results);
      setIsOpen(results.length > 0);
      
      // Track search analytics
      analytics.trackAutocomplete(searchQuery, results.length, false);
      
      if (results.length === 0) {
        analytics.trackEmptySearchResults(searchQuery);
      }
    } catch (err) {
      setError('Failed to search medicines');
      console.error('Search error:', err);
      setSuggestions([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, [activeOnly, minSearchLength]);

  /**
   * Handle input change with debouncing
   */
  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      searchMedicines(value);
    }, 300); // 300ms debounce
  };

  /**
   * Handle suggestion selection
   */
  const handleSelect = (medicine, position) => {
    setQuery(medicine.name);
    setSuggestions([]);
    setIsOpen(false);
    setSelectedIndex(-1);
    
    // Track analytics
    analytics.trackAutocomplete(query, suggestions.length, true);
    analytics.trackSearchResultClick(query, medicine, position);
    
    if (onSelect) {
      onSelect(medicine);
    }
  };

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (e) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelect(suggestions[selectedIndex], selectedIndex);
        }
        break;
      
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
      
      default:
        break;
    }
  };

  /**
   * Close dropdown when clicking outside
   */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        !inputRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  /**
   * Cleanup debounce timer on unmount
   */
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent pr-10"
          aria-label="Search medicines"
          aria-autocomplete="list"
          aria-controls="search-suggestions"
          aria-expanded={isOpen}
          autoComplete="off"
        />
        
        {/* Search Icon / Loading Spinner */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {isLoading ? (
            <svg className="animate-spin h-5 w-5 text-teal-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-2 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          id="search-suggestions"
          role="listbox"
          className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto"
        >
          {suggestions.map((medicine, index) => (
            <div
              key={medicine.id}
              role="option"
              aria-selected={index === selectedIndex}
              onClick={() => handleSelect(medicine, index)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                index === selectedIndex
                  ? 'bg-teal-50 text-teal-700'
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="font-medium">{medicine.name}</div>
              {medicine.scientific_name && (
                <div className="text-sm text-gray-500 italic">
                  {medicine.scientific_name}
                </div>
              )}
              <div className="flex items-center gap-2 mt-1">
                {medicine.dosage && (
                  <span className="text-xs text-gray-600">
                    {medicine.dosage}
                  </span>
                )}
                {!medicine.is_active && (
                  <span className="text-xs text-red-600 font-medium">
                    Inactive
                  </span>
                )}
                {medicine.stock !== undefined && medicine.stock <= 10 && (
                  <span className="text-xs text-orange-600">
                    Low stock: {medicine.stock}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Results Message */}
      {isOpen && !isLoading && query.length >= minSearchLength && suggestions.length === 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg px-4 py-3">
          <p className="text-gray-500 text-sm">
            No medicines found for "{query}"
          </p>
        </div>
      )}
    </div>
  );
};

export default MedicineSearchAutocomplete;
