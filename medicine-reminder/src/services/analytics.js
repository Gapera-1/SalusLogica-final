/**
 * Analytics Service for SalusLogica
 * ---------------------------------
 * Tracks user interactions, search queries, and feature usage
 * for improving UX and understanding user behavior.
 */

class AnalyticsService {
  constructor() {
    this.enabled = true;
    this.queue = [];
    this.sessionId = this.generateSessionId();
  }

  generateSessionId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Track a search event
   * @param {string} query - The search query
   * @param {number} resultsCount - Number of results returned
   * @param {boolean} activeOnly - Whether active-only filter was used
   */
  trackSearch(query, resultsCount = 0, activeOnly = false) {
    this.track('search', {
      query,
      results_count: resultsCount,
      active_only: activeOnly,
      query_length: query.length,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track autocomplete usage
   * @param {string} query - The autocomplete query
   * @param {number} suggestionCount - Number of suggestions shown
   * @param {boolean} selected - Whether a suggestion was selected
   */
  trackAutocomplete(query, suggestionCount = 0, selected = false) {
    this.track('autocomplete', {
      query,
      suggestion_count: suggestionCount,
      selected,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track search result click
   * @param {string} query - The search query that led to this result
   * @param {object} medicine - The medicine that was clicked
   * @param {number} position - Position in search results (0-indexed)
   */
  trackSearchResultClick(query, medicine, position) {
    this.track('search_result_click', {
      query,
      medicine_id: medicine.id,
      medicine_name: medicine.name,
      position,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track medicine view
   * @param {object} medicine - The medicine that was viewed
   * @param {string} source - How the user got to this medicine (e.g., 'search', 'list', 'direct')
   */
  trackMedicineView(medicine, source = 'unknown') {
    this.track('medicine_view', {
      medicine_id: medicine.id,
      medicine_name: medicine.name,
      source,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track feature usage
   * @param {string} feature - Feature name (e.g., 'active_filter', 'low_stock_filter')
   * @param {object} metadata - Additional feature metadata
   */
  trackFeatureUsage(feature, metadata = {}) {
    this.track('feature_usage', {
      feature,
      ...metadata,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track search filter usage
   * @param {string} filterType - Type of filter applied
   * @param {any} filterValue - Value of the filter
   */
  trackFilterUsage(filterType, filterValue) {
    this.track('filter_usage', {
      filter_type: filterType,
      filter_value: filterValue,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track empty search results
   * @param {string} query - The query that returned no results
   */
  trackEmptySearchResults(query) {
    this.track('empty_search_results', {
      query,
      query_length: query.length,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Base tracking method
   * @param {string} eventType - Type of event
   * @param {object} data - Event data
   */
  track(eventType, data) {
    if (!this.enabled) return;

    const event = {
      type: eventType,
      session_id: this.sessionId,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      platform: this.getPlatform(),
      ...data,
    };

    // Add to queue
    this.queue.push(event);

    // Log in development (using import.meta.env for Vite)
    if (import.meta.env.DEV) {
      console.log('[Analytics]', eventType, data);
    }

    // Persist to localStorage for later syncing
    this.persistToStorage(event);

    // Try to send to backend (optional - implement when backend endpoint is ready)
    // this.sendToBackend(event);
  }

  getPlatform() {
    if (typeof window === 'undefined') return 'unknown';
    
    const userAgent = navigator.userAgent.toLowerCase();
    if (/mobile|android|iphone|ipad|ipod/.test(userAgent)) {
      return 'mobile';
    }
    return 'web';
  }

  /**
   * Persist event to localStorage
   */
  persistToStorage(event) {
    try {
      const key = 'saluslogica_analytics_queue';
      const stored = localStorage.getItem(key);
      const queue = stored ? JSON.parse(stored) : [];
      
      queue.push(event);
      
      // Keep only last 100 events
      if (queue.length > 100) {
        queue.shift();
      }
      
      localStorage.setItem(key, JSON.stringify(queue));
    } catch (error) {
      console.error('Failed to persist analytics:', error);
    }
  }

  /**
   * Get all analytics events from storage
   */
  getStoredEvents() {
    try {
      const key = 'saluslogica_analytics_queue';
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get stored analytics:', error);
      return [];
    }
  }

  /**
   * Clear analytics queue
   */
  clearQueue() {
    this.queue = [];
    try {
      localStorage.removeItem('saluslogica_analytics_queue');
    } catch (error) {
      console.error('Failed to clear analytics:', error);
    }
  }

  /**
   * Get search analytics summary
   */
  getSearchAnalytics() {
    const events = this.getStoredEvents();
    const searchEvents = events.filter(e => e.type === 'search');
    
    if (searchEvents.length === 0) {
      return {
        total_searches: 0,
        average_results: 0,
        most_common_queries: [],
        empty_results_rate: 0,
      };
    }

    // Calculate statistics
    const totalSearches = searchEvents.length;
    const totalResults = searchEvents.reduce((sum, e) => sum + (e.results_count || 0), 0);
    const averageResults = totalResults / totalSearches;
    const emptyResults = searchEvents.filter(e => e.results_count === 0).length;
    const emptyResultsRate = (emptyResults / totalSearches) * 100;

    // Count query frequency
    const queryCount = {};
    searchEvents.forEach(e => {
      const query = e.query.toLowerCase();
      queryCount[query] = (queryCount[query] || 0) + 1;
    });

    // Get most common queries
    const mostCommonQueries = Object.entries(queryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }));

    return {
      total_searches: totalSearches,
      average_results: averageResults.toFixed(2),
      most_common_queries: mostCommonQueries,
      empty_results_rate: emptyResultsRate.toFixed(2),
      empty_results_count: emptyResults,
    };
  }

  /**
   * Enable/disable analytics
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Future: Send analytics to backend
   * Implement this when backend analytics endpoint is ready
   */
  // eslint-disable-next-line no-unused-vars
  async sendToBackend(event) {
    // TODO: Implement when backend endpoint is ready
    // try {
    //   await fetch('/api/analytics/', {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json',
    //       'Authorization': `Token ${getAuthToken()}`,
    //     },
    //     body: JSON.stringify(event),
    //   });
    // } catch (error) {
    //   console.error('Failed to send analytics:', error);
    // }
  }
}

// Create singleton instance
const analytics = new AnalyticsService();

export default analytics;
