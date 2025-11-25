const path = require('path');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.static(path.join(process.cwd(), 'public'))); // Serve frontend files
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// ... (Your imports remain the same)

// --- INTERNAL RANDOMIZERS (To force variety) ---
const themes = [
    "Nature & Environment", "Technology & Innovation", "Emotions & Psychology", 
    "Business & Leadership", "Travel & Adventure", "Art & Culture", 
    "Science & Space", "Food & Culinary", "History & Time", 
    "Health & Wellness", "Urban Life", "Mystery & Fiction"
];

const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// 1. Generate Word Batch Endpoint (Updated with Seed)
app.post('/api/learn', async (req, res) => {
    try {
        const { difficulty, count } = req.body;
        const numWords = count || 5;
        const level = difficulty || 'moderate';
        
        // Randomizers
        const randomTheme = themes[Math.floor(Math.random() * themes.length)];
        const randomSeed = Math.floor(Math.random() * 999999);
        const randomLetter = letters[Math.floor(Math.random() * letters.length)];

        // Enhanced Prompt
        const prompt = `Generate ${numWords} distinct English words of ${level} difficulty.
        
        Directives for Variety:
        1. Focus loosely on the theme: "${randomTheme}".
        2. Ensure the words are NOT the most common ones (like 'happy' or 'run').
        3. Random Seed ID: ${randomSeed} (Use this to diverge from previous outputs).
        
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

// 2. Generate Quiz Endpoint (Updated with Seed)
app.post('/api/quiz', async (req, res) => {
    try {
        // Randomizers
        const randomTheme = themes[Math.floor(Math.random() * themes.length)];
        const randomSeed = Math.floor(Math.random() * 999999);

        const prompt = `Generate 5 multiple-choice questions about English vocabulary and grammar.
        
        Directives:
        1. Mix of Vocabulary (Theme: ${randomTheme}) and Grammar rules.
        2. Random Seed: ${randomSeed}.
        3. Make the questions diverse (not just "what does X mean").
        
        Return strictly a JSON array of objects. Each object must have: "question", "options" (array of 4 strings), "correctIndex" (0-3). Do not use markdown formatting.`;

        const result = await model.generateContent(prompt);
        const response = result.response.text();
        const cleanJson = response.replace(/```json|```/g, '');
        res.json(JSON.parse(cleanJson));
    } catch (error) {
        console.error("SERVER ERROR:", error);
        res.status(500).send(error.toString());
    }
});

// 3. Explain Grammar Endpoint (Updated with Seed)
app.post('/api/grammar', async (req, res) => {
    try {
        const randomSeed = Math.floor(Math.random() * 999999);
        
        const prompt = `Generate a short, helpful grammar rule card.
        Random Seed: ${randomSeed}.
        Pick a RANDOM topic from: Tenses, Punctuation, Voice, Prepositions, or Idioms.
        Return strictly a JSON object with keys: "title", "rule", "example". Do not use markdown formatting.`;
        
        const result = await model.generateContent(prompt);
        const response = result.response.text();
        const cleanJson = response.replace(/```json|```/g, '');
        res.json(JSON.parse(cleanJson));
    } catch (error) {
        res.status(500).send(error.toString());
    }
});

app.post('/api/explain-grammar', async (req, res) => {
    try {
        const { topic } = req.body;
        const prompt = `Explain the English grammar rule or topic: "${topic}". 
        Keep it concise. Return strictly a JSON object with: "title", "explanation", "examples" (array of 2). No markdown.`;

        const result = await model.generateContent(prompt);
        const response = result.response.text();
        const cleanJson = response.replace(/```json|```/g, '');
        res.json(JSON.parse(cleanJson));
    } catch (error) {
        res.status(500).send(error.toString());
    }
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

// Export the app for Vercel
module.exports = app;