Collaborative Code Editor
A simple web app for real-time code editing with friends, offline support, and AI suggestions.

Setup

1.Clone & Install:
git clone <your-repo-url>
cd collaborative-code-editor
npm install

2.Add OpenAI Key:
Get a key from platform.openai.com.
Add to .env:
VITE_OPENAI_API_KEY=your-key

3.Run:
npm run dev

Open http://localhost:5173.

Core Features
Real-Time Collab: Edit code together instantly via Peer IDs.
Multi-Tab: Add/delete files (file1, file2, etc.), synced across users.
Offline Mode: Save changes offline, sync when back online.
AI Suggestions: Press Ctrl+Space for OpenAI-powered code completions.

Testing
Real-Time Collaboration
Open two browser windows at http://localhost:5173.
Copy Peer ID from Window 1, paste into Window 2, and click “Connect”.
Edit in one—see changes in the other. Add/delete files and watch them sync.

AI Features
Type code (e.g., function add(a, b) ), press Ctrl+Space.
See suggestions if online, or “Rate limit exceeded” (wait and retry if limited).
Go offline, test cached suggestions or offline message.