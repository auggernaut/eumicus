const fs = require('fs').promises;
const path = require('path');

class KnowledgeGraphManager {
  constructor(dataDir = './data') {
    this.dataDir = dataDir;
    this.knowledgeGraphPath = path.join(dataDir, 'knowledge-graph.json');
    this.activityLogPath = path.join(dataDir, 'activity-log.json');
    this.contentCachePath = path.join(dataDir, 'content-cache.json');
  }

  async initialize() {
    // Ensure data directory exists
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }

    // Initialize knowledge graph if it doesn't exist
    await this.initializeKnowledgeGraph();
    await this.initializeActivityLog();
    await this.initializeContentCache();
  }

  async initializeKnowledgeGraph() {
    try {
      await fs.access(this.knowledgeGraphPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        const initialGraph = {
          user_profile: {
            goals: [],
            interests: [],
            learning_style: '',
            time_commitment: '',
            created_at: new Date().toISOString()
          },
          concepts: [],
          content_items: [],
          reinforcement_sessions: [],
          exploration_suggestions: [],
          last_updated: new Date().toISOString()
        };
        await this.saveKnowledgeGraph(initialGraph);
      }
    }
  }

  async initializeActivityLog() {
    try {
      await fs.access(this.activityLogPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        const initialLog = {
          activities: [],
          last_updated: new Date().toISOString()
        };
        await this.saveActivityLog(initialLog);
      }
    }
  }

  async initializeContentCache() {
    try {
      await fs.access(this.contentCachePath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        const initialCache = {
          items: {},
          last_updated: new Date().toISOString()
        };
        await this.saveContentCache(initialCache);
      }
    }
  }

  async loadKnowledgeGraph() {
    try {
      const data = await fs.readFile(this.knowledgeGraphPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading knowledge graph:', error);
      throw error;
    }
  }

  async saveKnowledgeGraph(graph) {
    try {
      graph.last_updated = new Date().toISOString();
      await fs.writeFile(this.knowledgeGraphPath, JSON.stringify(graph, null, 2));
    } catch (error) {
      console.error('Error saving knowledge graph:', error);
      throw error;
    }
  }

  async loadActivityLog() {
    try {
      const data = await fs.readFile(this.activityLogPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading activity log:', error);
      throw error;
    }
  }

  async saveActivityLog(log) {
    try {
      log.last_updated = new Date().toISOString();
      await fs.writeFile(this.activityLogPath, JSON.stringify(log, null, 2));
    } catch (error) {
      console.error('Error saving activity log:', error);
      throw error;
    }
  }

  async loadContentCache() {
    try {
      const data = await fs.readFile(this.contentCachePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading content cache:', error);
      throw error;
    }
  }

  async saveContentCache(cache) {
    try {
      cache.last_updated = new Date().toISOString();
      await fs.writeFile(this.contentCachePath, JSON.stringify(cache, null, 2));
    } catch (error) {
      console.error('Error saving content cache:', error);
      throw error;
    }
  }

  async addActivity(activity) {
    const log = await this.loadActivityLog();
    const newActivity = {
      timestamp: new Date().toISOString(),
      ...activity
    };
    log.activities.push(newActivity);
    
    // Keep only last 1000 activities to prevent file from growing too large
    if (log.activities.length > 1000) {
      log.activities = log.activities.slice(-1000);
    }
    
    await this.saveActivityLog(log);
    return newActivity;
  }

  async addConcept(concept) {
    const graph = await this.loadKnowledgeGraph();
    
    // Check if concept already exists
    const existingIndex = graph.concepts.findIndex(c => c.name === concept.name);
    if (existingIndex >= 0) {
      // Update existing concept
      graph.concepts[existingIndex] = {
        ...graph.concepts[existingIndex],
        ...concept,
        last_updated: new Date().toISOString()
      };
    } else {
      // Add new concept
      graph.concepts.push({
        ...concept,
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString()
      });
    }
    
    await this.saveKnowledgeGraph(graph);
    return concept;
  }

  async addContentItem(contentItem) {
    const graph = await this.loadKnowledgeGraph();
    contentItem.id = contentItem.id || `content_${Date.now()}`;
    contentItem.processed_date = new Date().toISOString();
    
    graph.content_items.push(contentItem);
    await this.saveKnowledgeGraph(graph);
    return contentItem;
  }

  async addReinforcementSession(session) {
    const graph = await this.loadKnowledgeGraph();
    session.date = new Date().toISOString();
    graph.reinforcement_sessions.push(session);
    await this.saveKnowledgeGraph(graph);
    return session;
  }

  async addExplorationSuggestion(suggestion) {
    const graph = await this.loadKnowledgeGraph();
    suggestion.created_at = new Date().toISOString();
    graph.exploration_suggestions.push(suggestion);
    await this.saveKnowledgeGraph(graph);
    return suggestion;
  }

  async updateUserProfile(profile) {
    const graph = await this.loadKnowledgeGraph();
    graph.user_profile = {
      ...graph.user_profile,
      ...profile,
      last_updated: new Date().toISOString()
    };
    await this.saveKnowledgeGraph(graph);
    return graph.user_profile;
  }

  async getConceptsForReinforcement() {
    const graph = await this.loadKnowledgeGraph();
    const now = new Date();
    
    return graph.concepts.filter(concept => {
      if (!concept.reinforcement_schedule) return true;
      const scheduleDate = new Date(concept.reinforcement_schedule);
      return scheduleDate <= now;
    });
  }

  async getKnowledgeGaps() {
    const graph = await this.loadKnowledgeGraph();
    const lowConfidenceConcepts = graph.concepts.filter(c => c.confidence < 0.6);
    const recentContent = graph.content_items.slice(-10);
    
    return {
      low_confidence_concepts: lowConfidenceConcepts,
      recent_content: recentContent,
      total_concepts: graph.concepts.length,
      average_confidence: graph.concepts.reduce((sum, c) => sum + (c.confidence || 0), 0) / graph.concepts.length
    };
  }

  async getConceptConnections(conceptName) {
    const graph = await this.loadKnowledgeGraph();
    const concept = graph.concepts.find(c => c.name === conceptName);
    if (!concept) return [];
    
    return concept.connections || [];
  }

  async findRelatedConcepts(conceptName, limit = 5) {
    const graph = await this.loadKnowledgeGraph();
    const targetConcept = graph.concepts.find(c => c.name === conceptName);
    if (!targetConcept) return [];
    
    const related = graph.concepts.filter(c => 
      c.name !== conceptName && 
      (c.connections?.includes(conceptName) || targetConcept.connections?.includes(c.name))
    );
    
    return related.slice(0, limit);
  }
}

module.exports = KnowledgeGraphManager;
