# 🧠 Eumicus - AI Knowledge Reinforcement System

Eumicus is an AI-assisted self-guided knowledge reinforcement tool that helps you build and maintain a comprehensive understanding of your interests, goals, and learning journey.

## ✨ Features

- **🧠 Knowledge Graph**: Build a comprehensive, interconnected understanding of your learning
- **📚 Content Processing**: Process articles, videos, podcasts, and other content automatically
- **🔄 Spaced Repetition**: Reinforce knowledge through targeted questions and spaced repetition
- **🔍 Exploration Suggestions**: Discover new areas to explore based on knowledge gaps
- **🤔 Reflection Engine**: Connect new insights to existing knowledge through guided reflection
- **📊 Real-time Visualization**: Interactive knowledge graph with live updates
- **🌐 Web Interface**: Beautiful, modern UI with chat, graph visualization, and activity feed
- **💻 CLI Interface**: Command-line tools for power users

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd eumicus
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp env.example .env
# Edit .env and add your OpenAI API key
```

4. Start the web interface:
```bash
npm start
```

5. Open your browser to `http://localhost:3000`

## 🎯 Usage

### Web Interface

1. **Start Learning Profile**: Begin with a deep-dive conversation about your goals and interests
2. **Process Content**: Submit URLs, articles, or text to extract key concepts
3. **Reinforce Knowledge**: Answer targeted questions to strengthen your understanding
4. **Explore New Areas**: Get personalized suggestions for continued learning
5. **Reflect on Progress**: Connect insights and track your learning journey

### CLI Interface

```bash
# Start interactive CLI mode
npm run cli

# Or use specific commands
node src/cli.js interactive
```

### Available CLI Commands

```bash
# Process content from command line
node src/cli.js process "https://example.com/article"

# Run reinforcement session
node src/cli.js reinforce

# Generate exploration suggestions
node src/cli.js suggest

# View learning statistics
node src/cli.js stats

# Start user profiling
node src/cli.js profile
```

## 🏗️ Architecture

### Core Modules

- **Knowledge Graph Manager**: Handles JSON file persistence and data operations
- **User Profiler**: Conducts deep-dive conversations to understand learning goals
- **Content Processor**: Extracts concepts and insights from various content types
- **Knowledge Reinforcer**: Generates spaced repetition questions and tracks performance
- **Exploration Suggester**: Identifies knowledge gaps and suggests new learning areas
- **Connection Mapper**: Discovers relationships between concepts
- **Reflection Engine**: Guides users to connect new insights to existing knowledge

### Data Storage

All data is stored locally in JSON files:
- `data/knowledge-graph.json`: Main knowledge graph with concepts, connections, and user profile
- `data/activity-log.json`: Real-time activity feed and system logs
- `data/content-cache.json`: Cached content for faster processing

## 🔧 Configuration

### Environment Variables

```bash
OPENAI_API_KEY=your_openai_api_key_here
PORT=3000
NODE_ENV=development
MAX_CONTENT_LENGTH=50000
CONTENT_CACHE_TTL=86400000
```

### Customization

You can customize the system by modifying:
- **Learning schedules**: Adjust reinforcement timing in `modules/knowledge-reinforcer.js`
- **Content processing**: Add new content types in `modules/content-processor.js`
- **Question generation**: Modify prompts in `modules/openai-client.js`
- **UI styling**: Update CSS in `public/index.html`

## 📊 Data Model

### Knowledge Graph Structure

```json
{
  "user_profile": {
    "goals": ["become a better data scientist"],
    "interests": ["machine learning", "philosophy"],
    "learning_style": "visual + hands-on",
    "time_commitment": "30 minutes daily"
  },
  "concepts": [
    {
      "name": "neural networks",
      "confidence": 0.8,
      "connections": ["deep learning", "backpropagation"],
      "sources": ["article_1", "video_2"],
      "reinforcement_schedule": "2025-10-27"
    }
  ],
  "content_items": [...],
  "reinforcement_sessions": [...],
  "exploration_suggestions": [...]
}
```

## 🎨 User Interface

The web interface features:

- **Chat Tab**: Conversational interface for interactions and content submission
- **Graph Tab**: Interactive knowledge graph visualization with D3.js
- **Activity Feed**: Real-time display of AI background processes
- **Responsive Design**: Works on desktop and mobile devices

## 🔄 Learning Pipeline

The system runs continuous background processes:

- **Daily Analysis**: Identifies concepts needing reinforcement and generates suggestions
- **Weekly Reflection**: Provides comprehensive learning progress reports
- **Connection Discovery**: Finds hidden relationships between concepts
- **Health Checks**: Monitors knowledge graph integrity and performance

## 🛠️ Development

### Project Structure

```
eumicus/
├── src/
│   ├── index.js              # Main application entry point
│   ├── cli.js                # CLI interface
│   ├── web-server.js         # Web server with WebSocket support
│   └── learning-pipeline.js  # Background learning processes
├── modules/
│   ├── knowledge-graph.js    # Data persistence and management
│   ├── openai-client.js      # OpenAI API integration
│   ├── user-profiler.js      # User profiling and conversation
│   ├── content-processor.js  # Content analysis and extraction
│   ├── knowledge-reinforcer.js # Spaced repetition system
│   ├── exploration-suggester.js # Knowledge gap analysis
│   ├── connection-mapper.js  # Concept relationship discovery
│   └── reflection-engine.js  # Guided reflection sessions
├── public/
│   └── index.html            # Web interface
├── data/                     # Local data storage
└── package.json
```

### Adding New Features

1. **New Content Types**: Extend `ContentProcessor` to handle new formats
2. **Custom Questions**: Modify prompts in `OpenAIClient` for different question types
3. **Visualization**: Update D3.js code in `public/index.html` for new graph layouts
4. **API Endpoints**: Add new routes in `WebServer` for additional functionality

## 📈 Performance

- **Local Storage**: All data stored locally for privacy and speed
- **Efficient Processing**: Batched operations and caching for optimal performance
- **Real-time Updates**: WebSocket connections for live activity feed
- **Scalable Architecture**: Modular design allows for easy extension

## 🔒 Privacy & Security

- **Local-First**: All data stored on your machine
- **No External Dependencies**: Only OpenAI API calls for AI processing
- **Secure API Keys**: Environment variable configuration
- **Data Control**: Full control over your knowledge graph and learning data

## 🚧 Roadmap

### Version 1.1
- [ ] Enhanced content processing (PDF, audio transcripts)
- [ ] Advanced knowledge graph features (relationship strength, learning paths)
- [ ] Improved spaced repetition algorithms

### Version 2.0
- [ ] Social learning features
- [ ] Mobile companion app
- [ ] Collaborative knowledge graphs
- [ ] Advanced analytics and insights

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- OpenAI for providing the GPT-4 API
- D3.js for graph visualization
- The open-source community for inspiration and tools

---

**"The real measure of learning isn't consumption — it's connection and reinforcement."**

Start your knowledge reinforcement journey with Eumicus today! 🚀
