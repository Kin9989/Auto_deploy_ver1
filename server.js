import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load .env file
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'],
    credentials: true
}));
app.use(express.json());
app.use(express.static('public'));

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Kết nối MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Schema cho lịch sử deploy
const DeployHistorySchema = new mongoose.Schema({
    githubUrl: String,
    vercelUrls: {
        deployUrl: String,
        projectUrl: String
    },
    type: { type: String, enum: ['github', 'vercel', 'delete'], default: 'github' },
    timestamp: { type: Date, default: Date.now }
});

const DeployHistory = mongoose.model('DeployHistory', DeployHistorySchema);

// Config route
app.get('/api/config', (req, res) => {
    console.log('Config request received');
    try {
        if (!process.env.GITHUB_TOKEN) {
            throw new Error('GitHub token is missing');
        }
        res.json({
            githubToken: process.env.GITHUB_TOKEN,
            githubUsername: process.env.GITHUB_USERNAME,
            vercelToken: process.env.VERCEL_TOKEN
        });
    } catch (error) {
        console.error('Config error:', error);
        res.status(500).json({ error: error.message });
    }
});

// API endpoints
app.post('/api/history', async (req, res) => {
    try {
        const newHistory = new DeployHistory({
            githubUrl: req.body.githubUrl,
            vercelUrls: req.body.vercelUrls,
            type: req.body.type || 'github',
            timestamp: new Date()
        });
        await newHistory.save();
        res.status(201).json(newHistory);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/history', async (req, res) => {
    try {
        const history = await DeployHistory.find().sort({ timestamp: -1 });
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to access the application`);
}); 