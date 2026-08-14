import express from 'express';
import { chat, listTools } from '../controllers/chat.controller.js';

export const chatRoutes = express.Router();

// POST /api/chat  - streaming chat (SSE)
chatRoutes.post('/chat', express.json({ limit: '1mb' }), chat);
// GET /api/tools  - list the MCP tools currently visible to the AI
chatRoutes.get('/tools', listTools);