const OpenAIClient = require('./openai-client');

class ConnectionMapper {
  constructor(openaiClient, knowledgeGraphManager) {
    this.openai = openaiClient;
    this.knowledgeGraph = knowledgeGraphManager;
  }

  async mapNewConnections(newConcepts) {
    console.log('🔗 Mapping connections for new concepts...');
    
    await this.knowledgeGraph.addActivity({
      type: 'connection_mapping',
      agent: 'Connection Mapper',
      message: `Analyzing connections for ${newConcepts.length} new concepts`,
      status: 'in_progress'
    });

    const graph = await this.knowledgeGraph.loadKnowledgeGraph();
    const existingConcepts = graph.concepts.filter(c => !newConcepts.some(nc => nc.name === c.name));
    
    const allConnections = [];

    // Find connections between new concepts and existing ones
    for (const newConcept of newConcepts) {
      const connections = await this.findConnectionsForConcept(newConcept, existingConcepts);
      allConnections.push(...connections);
    }

    // Find connections between new concepts themselves
    for (let i = 0; i < newConcepts.length; i++) {
      for (let j = i + 1; j < newConcepts.length; j++) {
        const connections = await this.findConnectionsBetweenConcepts(newConcepts[i], newConcepts[j]);
        allConnections.push(...connections);
      }
    }

    // Apply connections to the knowledge graph
    const updatedConcepts = await this.applyConnections(newConcepts, allConnections);
    
    await this.knowledgeGraph.addActivity({
      type: 'connection_mapping',
      agent: 'Connection Mapper',
      message: `Mapped ${allConnections.length} connections between concepts`,
      status: 'completed',
      details: {
        new_concepts: newConcepts.length,
        connections_found: allConnections.length,
        connection_types: [...new Set(allConnections.map(c => c.relationship_type))]
      }
    });

    return {
      connections: allConnections,
      updatedConcepts: updatedConcepts
    };
  }

  async findConnectionsForConcept(concept, existingConcepts) {
    const connections = await this.openai.findConceptConnections([concept], existingConcepts);
    
    return connections.connections.map(conn => ({
      ...conn,
      from_concept: concept.name,
      discovered_at: new Date().toISOString()
    }));
  }

  async findConnectionsBetweenConcepts(concept1, concept2) {
    const connections = await this.openai.findConceptConnections([concept1], [concept2]);
    
    return connections.connections.map(conn => ({
      ...conn,
      discovered_at: new Date().toISOString()
    }));
  }

  async applyConnections(newConcepts, connections) {
    const updatedConcepts = [...newConcepts];
    
    for (const connection of connections) {
      // Update the 'from' concept
      const fromConcept = updatedConcepts.find(c => c.name === connection.from_concept);
      if (fromConcept) {
        if (!fromConcept.connections) {
          fromConcept.connections = [];
        }
        if (!fromConcept.connections.includes(connection.to_concept)) {
          fromConcept.connections.push(connection.to_concept);
        }
      }

      // Update the 'to' concept (if it's also a new concept)
      const toConcept = updatedConcepts.find(c => c.name === connection.to_concept);
      if (toConcept) {
        if (!toConcept.connections) {
          toConcept.connections = [];
        }
        if (!toConcept.connections.includes(connection.from_concept)) {
          toConcept.connections.push(connection.from_concept);
        }
      }
    }

    // Save updated concepts to knowledge graph
    for (const concept of updatedConcepts) {
      await this.knowledgeGraph.addConcept(concept);
    }

    return updatedConcepts;
  }

  async discoverHiddenConnections() {
    console.log('🔍 Discovering hidden connections in existing knowledge...');
    
    await this.knowledgeGraph.addActivity({
      type: 'connection_mapping',
      agent: 'Connection Mapper',
      message: 'Analyzing existing knowledge for hidden connections',
      status: 'in_progress'
    });

    const graph = await this.knowledgeGraph.loadKnowledgeGraph();
    const concepts = graph.concepts;
    
    const hiddenConnections = [];
    
    // Analyze concepts in batches to find potential connections
    const batchSize = 10;
    for (let i = 0; i < concepts.length; i += batchSize) {
      const batch = concepts.slice(i, i + batchSize);
      const otherConcepts = concepts.filter(c => !batch.includes(c));
      
      for (const concept of batch) {
        const connections = await this.findPotentialConnections(concept, otherConcepts);
        hiddenConnections.push(...connections);
      }
    }

    // Filter out connections that already exist
    const newConnections = hiddenConnections.filter(conn => {
      const fromConcept = concepts.find(c => c.name === conn.from_concept);
      return fromConcept && !fromConcept.connections?.includes(conn.to_concept);
    });

    // Apply new connections
    if (newConnections.length > 0) {
      await this.applyNewConnections(newConnections);
    }

    await this.knowledgeGraph.addActivity({
      type: 'connection_mapping',
      agent: 'Connection Mapper',
      message: `Discovered ${newConnections.length} hidden connections`,
      status: 'completed',
      details: {
        total_concepts_analyzed: concepts.length,
        new_connections_found: newConnections.length
      }
    });

    return newConnections;
  }

  async findPotentialConnections(concept, otherConcepts) {
    const messages = [
      {
        role: 'system',
        content: `You are a knowledge mapping expert. Analyze if there are meaningful connections between the given concept and the list of other concepts.
        
        Focus on:
        - Prerequisite relationships
        - Application relationships
        - Shared principles or patterns
        - Complementary knowledge areas
        
        Only suggest connections with strength >= 0.6`
      },
      {
        role: 'user',
        content: `Concept: ${JSON.stringify(concept)}
        Other concepts: ${JSON.stringify(otherConcepts.map(c => ({ name: c.name, category: c.category })))}`
      }
    ];

    const schema = {
      type: 'object',
      properties: {
        connections: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              from_concept: { type: 'string' },
              to_concept: { type: 'string' },
              relationship_type: { type: 'string' },
              strength: { type: 'number', minimum: 0.6, maximum: 1 },
              description: { type: 'string' }
            },
            required: ['from_concept', 'to_concept', 'relationship_type', 'strength']
          }
        }
      },
      required: ['connections']
    };

    try {
      const response = await this.openai.generateStructuredResponse(messages, schema);
      return response.connections.map(conn => ({
        ...conn,
        discovered_at: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error finding potential connections:', error);
      return [];
    }
  }

  async applyNewConnections(connections) {
    const graph = await this.knowledgeGraph.loadKnowledgeGraph();
    
    for (const connection of connections) {
      // Update the 'from' concept
      const fromConcept = graph.concepts.find(c => c.name === connection.from_concept);
      if (fromConcept) {
        if (!fromConcept.connections) {
          fromConcept.connections = [];
        }
        if (!fromConcept.connections.includes(connection.to_concept)) {
          fromConcept.connections.push(connection.to_concept);
        }
      }

      // Update the 'to' concept
      const toConcept = graph.concepts.find(c => c.name === connection.to_concept);
      if (toConcept) {
        if (!toConcept.connections) {
          toConcept.connections = [];
        }
        if (!toConcept.connections.includes(connection.from_concept)) {
          toConcept.connections.push(connection.from_concept);
        }
      }
    }

    await this.knowledgeGraph.saveKnowledgeGraph(graph);
  }

  async analyzeKnowledgeStructure() {
    console.log('📊 Analyzing knowledge structure...');
    
    const graph = await this.knowledgeGraph.loadKnowledgeGraph();
    const concepts = graph.concepts;
    
    const analysis = {
      total_concepts: concepts.length,
      connection_density: 0,
      isolated_concepts: 0,
      highly_connected_concepts: 0,
      knowledge_clusters: [],
      connection_types: {},
      average_connections_per_concept: 0
    };

    if (concepts.length === 0) {
      return analysis;
    }

    // Calculate connection statistics
    let totalConnections = 0;
    const connectionTypeCounts = {};
    
    concepts.forEach(concept => {
      const connectionCount = concept.connections?.length || 0;
      totalConnections += connectionCount;
      
      if (connectionCount === 0) {
        analysis.isolated_concepts++;
      } else if (connectionCount >= 5) {
        analysis.highly_connected_concepts++;
      }
    });

    analysis.average_connections_per_concept = totalConnections / concepts.length;
    analysis.connection_density = totalConnections / (concepts.length * (concepts.length - 1));

    // Identify knowledge clusters
    analysis.knowledge_clusters = await this.identifyKnowledgeClusters(concepts);

    return analysis;
  }

  async identifyKnowledgeClusters(concepts) {
    const clusters = [];
    const visited = new Set();
    
    for (const concept of concepts) {
      if (visited.has(concept.name)) continue;
      
      const cluster = await this.buildCluster(concept, concepts, visited);
      if (cluster.length > 1) {
        clusters.push({
          concepts: cluster.map(c => c.name),
          size: cluster.length,
          central_concepts: this.findCentralConcepts(cluster)
        });
      }
    }
    
    return clusters.sort((a, b) => b.size - a.size);
  }

  async buildCluster(startConcept, allConcepts, visited) {
    const cluster = [startConcept];
    const queue = [startConcept];
    visited.add(startConcept.name);
    
    while (queue.length > 0) {
      const current = queue.shift();
      const connections = current.connections || [];
      
      for (const connectionName of connections) {
        if (!visited.has(connectionName)) {
          const connectedConcept = allConcepts.find(c => c.name === connectionName);
          if (connectedConcept) {
            cluster.push(connectedConcept);
            queue.push(connectedConcept);
            visited.add(connectionName);
          }
        }
      }
    }
    
    return cluster;
  }

  findCentralConcepts(cluster) {
    // Find concepts with the most connections within the cluster
    const connectionCounts = cluster.map(concept => ({
      name: concept.name,
      connections: (concept.connections || []).filter(conn => 
        cluster.some(c => c.name === conn)
      ).length
    }));
    
    return connectionCounts
      .sort((a, b) => b.connections - a.connections)
      .slice(0, 3)
      .map(c => c.name);
  }

  async getConnectionStats() {
    const graph = await this.knowledgeGraph.loadKnowledgeGraph();
    const concepts = graph.concepts;
    
    if (concepts.length === 0) {
      return {
        total_concepts: 0,
        total_connections: 0,
        average_connections: 0,
        most_connected: [],
        least_connected: []
      };
    }

    const connectionStats = concepts.map(concept => ({
      name: concept.name,
      connections: concept.connections?.length || 0
    }));

    const totalConnections = connectionStats.reduce((sum, stat) => sum + stat.connections, 0);
    const averageConnections = totalConnections / concepts.length;

    const mostConnected = connectionStats
      .sort((a, b) => b.connections - a.connections)
      .slice(0, 5);

    const leastConnected = connectionStats
      .sort((a, b) => a.connections - b.connections)
      .slice(0, 5);

    return {
      total_concepts: concepts.length,
      total_connections: totalConnections,
      average_connections: averageConnections,
      most_connected: mostConnected,
      least_connected: leastConnected
    };
  }
}

module.exports = ConnectionMapper;
