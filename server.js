const path = require('path');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve frontend files

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// 1. Generate Word Endpoint
// 1. Generate Word Batch Endpoint
app.post('/api/learn', async (req, res) => {
    try {
        const { difficulty, count } = req.body;
        
        // Input validation
        const numWords = count || 5;
        const level = difficulty || 'simple';

        const prompt = `Generate ${numWords} distinct English words of ${level} difficulty. 
        Return strictly a JSON array of objects. 
        Each object must have: "word", "definition", "synonyms" (array of 2 strings), "example" (sentence). 
        Do not use markdown formatting.`;

        const result = await model.generateContent(prompt);
        const response = result.response.text();
        const cleanJson = response.replace(/```json|```/g, ''); 
        res.json(JSON.parse(cleanJson));
    } catch (error) {
        console.error("SERVER ERROR:", error);
        res.status(500).send(error.toString());
    }
});

// 2. Generate Quiz Endpoint
app.post('/api/quiz', async (req, res) => {
    try {
        const prompt = `Generate 5 multiple-choice questions about English vocabulary and grammar. Return strictly a JSON array of objects. Each object must have: "question", "options" (array of 4 strings), "correctIndex" (0-3). Do not use markdown formatting.`;
        const result = await model.generateContent(prompt);
        const response = result.response.text();
        const cleanJson = response.replace(/```json|```/g, '');
        res.json(JSON.parse(cleanJson));
    } catch (error) {
        res.status(500).send(error.toString());
    }
});

// 3. Generate Grammar Card Endpoint
app.post('/api/grammar', async (req, res) => {
    try {
        const prompt = `Generate a short, helpful grammar rule card (e.g., about Tenses, Punctuation, Active/Passive voice, or other grammar rules of English). Return strictly a JSON object with keys: "title", "rule", "example". Do not use markdown formatting.`;
        const result = await model.generateContent(prompt);
        const response = result.response.text();
        const cleanJson = response.replace(/```json|```/g, '');
        res.json(JSON.parse(cleanJson));
    } catch (error) {
        res.status(500).send(error.toString());
    }
});

// 4. Explain Specific Grammar Topic Endpoint
app.post('/api/explain-grammar', async (req, res) => {
    try {
        const { topic } = req.body; // Get the user's search term
        
        const prompt = `Explain the English grammar rule or topic: "${topic}". 
        Keep it concise and helpful for a student.
        Return strictly a JSON object with these keys: 
        "title" (Capitalized Topic Name), 
        "explanation" (A clear 1-2 sentence definition), 
        "examples" (An array of 2 example sentences). 
        Do not use markdown.`;

        const result = await model.generateContent(prompt);
        const response = result.response.text();
        const cleanJson = response.replace(/```json|```/g, '');
        res.json(JSON.parse(cleanJson));
    } catch (error) {
        console.error("SERVER ERROR:", error);
        res.status(500).send(error.toString());
    }
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

// Export the app for Vercel
module.exports = app;