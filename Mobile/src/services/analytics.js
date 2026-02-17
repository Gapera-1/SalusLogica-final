/**
 * Analytics Service for SalusLogica Mobile App
 * --------------------------------------------
 * Tracks user interactions and feature usage for improving UX
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

class AnalyticsService {
  constructor() {
    this.enabled = true;
    this.sessionId = this.generateSessionId();
  }

  generateSessionId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Track a search event
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
   * Track search result click
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
   */
  trackFeatureUsage(feature, metadata = {}) {
    this.track('feature_usage', {
      feature,
      ...metadata,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track filter usage
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
   */
  async track(eventType, data) {
    if (!this.enabled) return;

    const event = {
      type: eventType,
      session_id: this.sessionId,
      platform: 'mobile',
      ...data,
    };

    // Log in development
    if (__DEV__) {
      console.log('[Analytics]', eventType, data);
    }

    // Persist to AsyncStorage
    await this.persistToStorage(event);
  }

  /**
   * Persist event to AsyncStorage
   */
  async persistToStorage(event) {
    try {
      const key = '@saluslogica_analytics_queue';
      const stored = await AsyncStorage.getItem(key);
      const queue = stored ? JSON.parse(stored) : [];
      
      queue.push(event);
      
      // Keep only last 100 events
      if (queue.length > 100) {
        queue.shift();
      }
      
      await AsyncStorage.setItem(key, JSON.stringify(queue));
    } catch (error) {
      console.error('Failed to persist analytics:', error);
    }
  }

  /**
   * Get all analytics events from storage
   */
  async getStoredEvents() {
    try {
      const key = '@saluslogica_analytics_queue';
      const stored = await AsyncStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get stored analytics:', error);
      return [];
    }
  }

  /**
   * Clear analytics queue
   */
  async clearQueue() {
    try {
      await AsyncStorage.removeItem('@saluslogica_analytics_queue');
    } catch (error) {
      console.error('Failed to clear analytics:', error);
    }
  }

  /**
   * Get search analytics summary
   */
  async getSearchAnalytics() {
    const events = await this.getStoredEvents();
    const searchEvents = events.filter(e => e.type === 'search');
    
    if (searchEvents.length === 0) {
      return {
        total_searches: 0,
        average_results: 0,
        most_common_queries: [],
        empty_results_rate: 0,
      };
    }

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
}

// Create singleton instance
const analytics = new AnalyticsService();

export default analytics;
