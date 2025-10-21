# Eumicus Usage Examples

## Example Learning Session

Here's what a typical learning session looks like:

### 1. Starting the Application

**CLI Interface:**
```bash
npm start
```

**Web Interface:**
```bash
npm run web
# Open http://localhost:3000
```

### 2. Learning Goal

**Input:** "I want to learn about machine learning"

### 3. Knowledge Profile Analysis

Eumicus analyzes your existing knowledge:
- **Learning Style:** Analytical
- **Complexity Level:** Beginner
- **Current Strengths:** Basic programming, mathematics
- **Knowledge Gaps:** AI concepts, algorithms, data science

### 4. Personalized Learning Plan

Eumicus creates a tailored curriculum:
1. **Introduction to Machine Learning** (5 min)
   - What is machine learning?
   - Types of machine learning
   - Real-world applications

2. **Core Concepts** (8 min)
   - Supervised vs unsupervised learning
   - Training and testing data
   - Model evaluation

3. **Practical Applications** (7 min)
   - Examples in daily life
   - Industry use cases
   - Getting started

### 5. Interactive Lesson

Eumicus teaches the first topic with:
- Clear explanations tailored to your level
- Examples that connect to your existing knowledge
- Interactive checkpoints and questions

### 6. Adaptive Quiz

Eumicus generates questions like:
- "What is the main difference between supervised and unsupervised learning?"
- "Give an example of a machine learning application you use daily"
- "True/False: Machine learning models always improve with more data"

### 7. Guided Reflection

Eumicus asks reflection questions:
- "How does machine learning connect to your programming experience?"
- "What surprised you most about machine learning?"
- "Where might you apply machine learning in your work?"

### 8. Memory Update

Eumicus updates your knowledge profile:
- **New Concepts:** machine learning, supervised learning, unsupervised learning
- **Confidence Levels:** Based on quiz performance
- **Reflection:** Your insights and connections
- **Progress:** Updated learning statistics

## Sample Memory File

After several sessions, your `data/memory.json` might look like:

```json
{
  "concepts": [
    {
      "name": "machine learning",
      "confidence": 0.8,
      "added": "2025-01-15T10:30:00Z",
      "lastUpdated": "2025-01-15T10:30:00Z"
    },
    {
      "name": "neural networks",
      "confidence": 0.6,
      "added": "2025-01-16T14:20:00Z",
      "lastUpdated": "2025-01-16T14:20:00Z"
    },
    {
      "name": "programming",
      "confidence": 0.9,
      "added": "2025-01-10T09:15:00Z",
      "lastUpdated": "2025-01-15T10:30:00Z"
    }
  ],
  "reflections": [
    {
      "date": "2025-01-16T14:20:00Z",
      "text": "I learned that neural networks are inspired by biological neurons and can learn patterns from data. This connects to my programming knowledge because both involve processing information step by step.",
      "topic": "neural networks",
      "id": "1642248600000"
    },
    {
      "date": "2025-01-15T10:30:00Z",
      "text": "Machine learning is like teaching a computer to recognize patterns, similar to how I learned to recognize patterns in code. I'm excited to explore how this applies to data analysis.",
      "topic": "machine learning",
      "id": "1642162200000"
    }
  ],
  "stats": {
    "totalSessions": 3,
    "totalQuizScore": 240,
    "averageQuizScore": 80,
    "totalLearningTime": 60,
    "conceptsLearned": 8,
    "lastSessionDate": "2025-01-16T14:20:00Z"
  },
  "lastUpdated": "2025-01-16T14:20:00Z"
}
```

## Learning Progress Over Time

After multiple sessions, Eumicus shows your progress:

```
📈 Your Learning Progress

Total Sessions: 5
Average Quiz Score: 85%
Total Learning Time: 120 minutes
Concepts Learned: 15

📊 Trends:
• Excellent quiz performance - strong understanding
• Quick learning pace - efficient sessions
• High concept acquisition rate

💡 Recommendations:
• Ready for more challenging topics
• Great depth of learning
• Excellent knowledge building
```

## Different Learning Styles

Eumicus adapts to different learning styles:

### Visual Learner
- Uses diagrams and visual metaphors
- Provides visual examples
- Creates mental models

### Analytical Learner
- Step-by-step logical explanations
- Detailed technical information
- Structured problem-solving approach

### Practical Learner
- Real-world examples and applications
- Hands-on exercises
- Industry use cases

### Conceptual Learner
- Big-picture understanding
- Connections between concepts
- Theoretical foundations

## Tips for Effective Learning

1. **Be Specific:** Instead of "learn programming," try "learn Python for data analysis"
2. **Regular Sessions:** Short, frequent sessions work better than long ones
3. **Reflect Honestly:** Take time with reflection questions
4. **Review Progress:** Check your learning profile regularly
5. **Connect Concepts:** Look for relationships between different topics

## Troubleshooting

### Common Issues

**"OpenAI API key not configured"**
- Set your `OPENAI_API_KEY` in the `.env` file
- Make sure the `.env` file is in the project root

**"Session failed"**
- Check your internet connection
- Verify your OpenAI API key is valid
- Try a simpler learning goal

**"Memory not updating"**
- Check file permissions in the `data/` directory
- Ensure the `data/` directory exists
- Restart the application

### Getting Help

- Check the README for detailed setup instructions
- Review the console output for error messages
- Ensure all dependencies are installed with `npm install`
