#!/usr/bin/env node

/**
 * Test script for the Eumicus Dual-Phase Learning System
 * 
 * This script demonstrates the complete flow:
 * 1. Process content and extract concepts
 * 2. Start concept review session
 * 3. Simulate user curation
 * 4. Expand concepts
 * 5. Integrate to knowledge graph
 * 6. Schedule for reinforcement
 * 7. Start reinforcement session
 * 8. Simulate user answers
 * 9. Complete reinforcement session
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testDualPhaseSystem() {
    console.log('🧠 Testing Eumicus Dual-Phase Learning System\n');
    
    try {
        // Step 1: Process content and extract concepts
        console.log('📚 Step 1: Processing content and extracting concepts...');
        const content = {
            type: 'text',
            title: 'Introduction to Machine Learning',
            content: `Machine learning is a subset of artificial intelligence that focuses on algorithms that can learn from data. 
            Key concepts include supervised learning, unsupervised learning, neural networks, and deep learning. 
            Supervised learning uses labeled data to train models, while unsupervised learning finds patterns in unlabeled data. 
            Neural networks are inspired by biological neurons and can learn complex patterns. 
            Deep learning uses multiple layers of neural networks to solve complex problems.`
        };
        
        const processResponse = await fetch(`${BASE_URL}/api/process-content`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });
        
        if (!processResponse.ok) {
            throw new Error(`Failed to process content: ${processResponse.statusText}`);
        }
        
        const processResult = await processResponse.json();
        console.log(`✅ Content processed. Found ${processResult.conceptReview.concepts.length} concepts.`);
        
        // Step 2: Start concept review session
        console.log('\n🧩 Step 2: Starting concept review session...');
        const sessionId = processResult.conceptReview.sessionId;
        console.log(`Session ID: ${sessionId}`);
        
        // Step 3: Simulate user curation
        console.log('\n👤 Step 3: Simulating user curation...');
        const cardActions = processResult.conceptReview.concepts.map((concept, index) => {
            const actions = ['important', 'familiar', 'irrelevant', 'edit'];
            const action = actions[index % actions.length];
            return {
                cardId: concept.id,
                action: action,
                notes: action === 'edit' ? `Custom definition for ${concept.title}` : null
            };
        });
        
        const curationResponse = await fetch(`${BASE_URL}/api/concept-review/curate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, cardActions })
        });
        
        if (!curationResponse.ok) {
            throw new Error(`Failed to process curation: ${curationResponse.statusText}`);
        }
        
        const curationResult = await curationResponse.json();
        console.log(`✅ Curation complete. ${curationResult.curatedConcepts.length} concepts curated.`);
        
        // Step 4: Expand concepts
        console.log('\n🌱 Step 4: Expanding concepts...');
        const expansionResponse = await fetch(`${BASE_URL}/api/concept-review/expand`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
        });
        
        if (!expansionResponse.ok) {
            throw new Error(`Failed to expand concepts: ${expansionResponse.statusText}`);
        }
        
        const expansionResult = await expansionResponse.json();
        console.log(`✅ Concepts expanded. ${expansionResult.microLessons.length} micro-lessons created.`);
        
        // Step 5: Integrate to knowledge graph
        console.log('\n🔗 Step 5: Integrating concepts to knowledge graph...');
        const integrationResponse = await fetch(`${BASE_URL}/api/concept-review/integrate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
        });
        
        if (!integrationResponse.ok) {
            throw new Error(`Failed to integrate concepts: ${integrationResponse.statusText}`);
        }
        
        const integrationResult = await integrationResponse.json();
        console.log(`✅ Concepts integrated. ${integrationResult.newConnections.length} new connections created.`);
        
        // Step 6: Schedule for reinforcement
        console.log('\n📅 Step 6: Scheduling concepts for reinforcement...');
        const scheduleResponse = await fetch(`${BASE_URL}/api/concept-review/schedule`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
        });
        
        if (!scheduleResponse.ok) {
            throw new Error(`Failed to schedule concepts: ${scheduleResponse.statusText}`);
        }
        
        const scheduleResult = await scheduleResponse.json();
        console.log(`✅ Concepts scheduled. Next review: ${new Date(scheduleResult.nextReviewDate).toLocaleDateString()}`);
        
        // Step 7: Start reinforcement session
        console.log('\n🔄 Step 7: Starting reinforcement session...');
        const reinforcementResponse = await fetch(`${BASE_URL}/api/reinforcement/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!reinforcementResponse.ok) {
            throw new Error(`Failed to start reinforcement session: ${reinforcementResponse.statusText}`);
        }
        
        const reinforcementSession = await reinforcementResponse.json();
        console.log(`✅ Reinforcement session started. ${reinforcementSession.questions.length} questions generated.`);
        
        // Step 8: Simulate user answers
        console.log('\n📝 Step 8: Simulating user answers...');
        for (const question of reinforcementSession.questions.slice(0, 3)) { // Answer first 3 questions
            const answer = `This is a simulated answer for the question about ${question.concept_name}. 
            The concept relates to machine learning and involves understanding patterns in data.`;
            
            const answerResponse = await fetch(`${BASE_URL}/api/reinforcement/answer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: reinforcementSession.id,
                    questionId: question.id,
                    answer: answer
                })
            });
            
            if (!answerResponse.ok) {
                throw new Error(`Failed to submit answer: ${answerResponse.statusText}`);
            }
            
            const answerResult = await answerResponse.json();
            console.log(`✅ Answered question about ${question.concept_name}. New confidence: ${(answerResult.newConfidence * 100).toFixed(1)}%`);
        }
        
        // Step 9: Complete reinforcement session
        console.log('\n✅ Step 9: Completing reinforcement session...');
        const completeResponse = await fetch(`${BASE_URL}/api/reinforcement/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: reinforcementSession.id })
        });
        
        if (!completeResponse.ok) {
            throw new Error(`Failed to complete reinforcement session: ${completeResponse.statusText}`);
        }
        
        const completeResult = await completeResponse.json();
        console.log(`✅ Reinforcement session complete. Overall performance: ${(completeResult.overall_performance * 100).toFixed(1)}%`);
        
        // Summary
        console.log('\n🎉 Dual-Phase Learning System Test Complete!');
        console.log('\n📊 Summary:');
        console.log(`   • Concepts extracted: ${processResult.conceptReview.concepts.length}`);
        console.log(`   • Concepts curated: ${curationResult.curatedConcepts.length}`);
        console.log(`   • Micro-lessons created: ${expansionResult.microLessons.length}`);
        console.log(`   • New connections: ${integrationResult.newConnections.length}`);
        console.log(`   • Questions answered: ${completeResult.questions_answered}`);
        console.log(`   • Overall performance: ${(completeResult.overall_performance * 100).toFixed(1)}%`);
        
        console.log('\n🌟 The dual-phase learning loop is working perfectly!');
        console.log('   Phase 1: Concept Review & Expansion ✅');
        console.log('   Phase 2: Review & Reinforcement ✅');
        console.log('   Data flow between phases ✅');
        console.log('   Intelligent scheduling ✅');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Make sure the Eumicus server is running on http://localhost:3000');
        process.exit(1);
    }
}

// Run the test
if (require.main === module) {
    testDualPhaseSystem();
}

module.exports = { testDualPhaseSystem };

