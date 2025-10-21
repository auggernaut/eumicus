# 🧠 Eumicus - AI-Assisted Adaptive Learning

Eumicus is an AI-powered learning companion that adapts to what you already know, creating personalized learning experiences that build on your existing knowledge and help you make meaningful connections between concepts.

## ✨ Features

- **🧠 Adaptive Learning**: Analyzes your existing knowledge and creates personalized learning paths
- **📚 Interactive Lessons**: AI-generated lessons tailored to your learning style and level
- **📝 Smart Quizzes**: Adaptive quizzes that test understanding and provide detailed feedback
- **🤔 Guided Reflection**: Helps you connect new knowledge to existing understanding
- **💾 Persistent Memory**: Remembers what you've learned across sessions
- **📊 Progress Tracking**: Visualizes your learning journey and identifies patterns
- **🌐 Multiple Interfaces**: CLI and web interfaces for different preferences

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd eumicus
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure OpenAI API**
   ```bash
   cp env.example .env
   # Edit .env and add your OpenAI API key
   ```

4. **Start learning!**
   
   **CLI Interface:**
   ```bash
   npm start
   ```
   
   **Web Interface:**
   ```bash
   npm run web
   # Open http://localhost:3000 in your browser
   ```

## 🎯 How It Works

Eumicus follows a complete learning cycle:

1. **📊 Profile Analysis**: Analyzes your existing knowledge from memory
2. **📚 Curriculum Planning**: Creates a personalized learning plan
3. **🎓 Interactive Teaching**: Delivers tailored lessons with examples
4. **📝 Knowledge Testing**: Generates and grades adaptive quizzes
5. **🤔 Guided Reflection**: Helps you connect new knowledge to existing understanding
6. **💾 Memory Update**: Saves new concepts and insights for future sessions

## 📖 Usage Examples

### CLI Interface

```bash
# Start a learning session
npm start

# Choose "Start a new learning session"
# Enter your learning goal: "neural networks"
# Follow the interactive prompts
```

### Web Interface

```bash
# Start the web server
npm run web

# Open http://localhost:3000
# Enter your learning goal
# Watch the real-time progress
```

## 🏗️ Architecture

```
eumicus/
├── src/
│   ├── index.js              # CLI entry point
│   ├── cli.js                # CLI interface
│   ├── web-server.js         # Web server
│   └── learning-pipeline.js  # Main learning orchestration
├── modules/
│   ├── memory.js             # Memory management
│   ├── profiler.js           # Knowledge profiling
│   ├── planner.js            # Curriculum planning
│   ├── tutor.js              # Lesson generation
│   ├── quiz.js               # Quiz system
│   ├── reflection.js         # Reflection prompts
│   ├── assimilator.js        # Memory updates
│   └── openai-client.js      # OpenAI integration
├── data/
│   ├── memory.json           # Your learning memory
│   └── session.json          # Current session data
└── public/
    └── index.html            # Web interface
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file with:

```env
# Required
OPENAI_API_KEY=your_openai_api_key_here

# Optional
OPENAI_MODEL=gpt-4o
OPENAI_TEMPERATURE=0.7
PORT=3000
```

### Memory Structure

Your learning memory is stored in `data/memory.json`:

```json
{
  "concepts": [
    {
      "name": "neural networks",
      "confidence": 0.8,
      "added": "2025-01-15T10:30:00Z",
      "lastUpdated": "2025-01-15T10:30:00Z"
    }
  ],
  "reflections": [
    {
      "date": "2025-01-15T10:30:00Z",
      "text": "I learned that neural networks are inspired by biological neurons...",
      "topic": "neural networks",
      "id": "1642248600000"
    }
  ],
  "stats": {
    "totalSessions": 5,
    "averageQuizScore": 85,
    "totalLearningTime": 120,
    "conceptsLearned": 15
  }
}
```

## 🎨 Learning Styles Supported

- **Visual**: Uses diagrams, examples, and visual metaphors
- **Analytical**: Provides step-by-step logical explanations  
- **Practical**: Includes hands-on examples and real-world applications
- **Conceptual**: Focuses on big-picture understanding and connections

## 📊 Progress Tracking

Eumicus tracks your learning progress across multiple dimensions:

- **Session Statistics**: Total sessions, average scores, learning time
- **Concept Mastery**: Confidence levels for each learned concept
- **Learning Patterns**: Identifies your preferred learning style and pace
- **Knowledge Connections**: Maps relationships between concepts
- **Reflection Insights**: Captures your learning insights and connections

## 🔄 Learning Cycle

Each learning session follows this cycle:

1. **Goal Setting**: Define what you want to learn
2. **Memory Analysis**: Review your existing knowledge
3. **Plan Creation**: Generate a personalized learning path
4. **Interactive Learning**: Engage with tailored lessons
5. **Knowledge Testing**: Take adaptive quizzes
6. **Reflection**: Connect new knowledge to existing understanding
7. **Memory Update**: Save new concepts and insights

## 🛠️ Development

### Project Structure

- **`src/`**: Main application code
- **`modules/`**: Core learning modules
- **`data/`**: Local data storage
- **`public/`**: Web interface assets

### Key Modules

- **Memory System**: Manages persistent learning data
- **Profiler**: Analyzes existing knowledge and learning patterns
- **Planner**: Creates personalized learning curricula
- **Tutor**: Generates interactive lessons
- **Quiz System**: Creates and grades adaptive assessments
- **Reflection Engine**: Guides learning insights and connections
- **Assimilator**: Updates memory with new knowledge

### Adding New Features

1. Create new modules in `modules/`
2. Integrate with the learning pipeline in `src/learning-pipeline.js`
3. Update CLI and web interfaces as needed
4. Add tests and documentation

## 🚧 Roadmap

### Version 1.1
- [ ] Enhanced memory visualization
- [ ] Learning analytics dashboard
- [ ] Export/import learning data
- [ ] Multiple learning modes

### Version 1.2
- [ ] Integration with external knowledge bases
- [ ] Collaborative learning features
- [ ] Advanced progress tracking
- [ ] Learning recommendations engine

### Version 2.0
- [ ] Multi-user support
- [ ] Cloud synchronization
- [ ] Mobile app
- [ ] Advanced AI models integration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- OpenAI for providing the AI capabilities
- The learning science community for research insights
- Contributors and users for feedback and improvements

## 📞 Support

- **Issues**: Report bugs and request features on GitHub
- **Discussions**: Join community discussions
- **Documentation**: Check the wiki for detailed guides

---

**"The real measure of intelligence isn't recall — it's reflection."**

Start your adaptive learning journey with Eumicus today! 🚀
