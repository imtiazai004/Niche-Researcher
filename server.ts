import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Proxy for YouTube to hide the API key
  app.get('/api/youtube/trending', async (req, res) => {
    try {
      const apiKey = process.env.YOUTUBE_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'YOUTUBE_API_KEY not configured' });
      }

      const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
        params: {
          part: 'snippet,statistics,contentDetails',
          chart: 'mostPopular',
          regionCode: req.query.regionCode || 'US',
          maxResults: 20,
          key: apiKey,
        },
      });

      res.json(response.data);
    } catch (error: any) {
      console.error('YouTube API Error:', error.response?.data || error.message);
      res.status(error.response?.status || 500).json(error.response?.data || { error: 'Internal Server Error' });
    }
  });

  app.get('/api/youtube/channel', async (req, res) => {
    try {
      const apiKey = process.env.YOUTUBE_API_KEY;
      const { handle, id } = req.query;
      
      if (!apiKey) {
        return res.status(500).json({ error: 'YOUTUBE_API_KEY not configured' });
      }

      let channelId = id;

      // If handle is provided, we first need to find the channel ID
      if (handle && !id) {
        const searchResponse = await axios.get('https://www.googleapis.com/youtube/v3/search', {
          params: {
            part: 'snippet',
            q: handle,
            type: 'channel',
            maxResults: 1,
            key: apiKey,
          },
        });
        channelId = searchResponse.data.items[0]?.id?.channelId;
      }

      if (!channelId) {
        return res.status(404).json({ error: 'Channel not found' });
      }

      const channelResponse = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
        params: {
          part: 'snippet,statistics,brandingSettings',
          id: channelId,
          key: apiKey,
        },
      });

      // Get recent videos for trend analysis
      const videosResponse = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: {
          part: 'snippet',
          channelId: channelId,
          order: 'date',
          maxResults: 10,
          type: 'video',
          key: apiKey,
        },
      });

      res.json({
        channel: channelResponse.data.items[0],
        recentVideos: videosResponse.data.items
      });
    } catch (error: any) {
      console.error('YouTube API Error:', error.response?.data || error.message);
      res.status(error.response?.status || 500).json(error.response?.data || { error: 'Internal Server Error' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
