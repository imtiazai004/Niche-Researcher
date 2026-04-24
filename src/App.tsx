/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  Search, 
  BarChart3, 
  Youtube, 
  Flame, 
  Clock, 
  Users, 
  Eye, 
  ArrowUpRight,
  Loader2,
  AlertCircle,
  Sparkles,
  RefreshCcw,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import axios from 'axios';
import { GoogleGenAI } from "@google/genai";
import { cn, formatNumber } from './lib/utils';
import { YouTubeVideo, YouTubeChannel, TrendAnalysis } from './types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function App() {
  const [trendingVideos, setTrendingVideos] = useState<YouTubeVideo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<{ channel: YouTubeChannel, recentVideos: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<TrendAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetchTrending();
  }, []);

  const fetchTrending = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/youtube/trending');
      setTrendingVideos(response.data.items || []);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to fetch trending data. Is your API key configured?');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setSelectedChannel(null);
    setError(null);
    try {
      const response = await axios.get('/api/youtube/channel', {
        params: { handle: searchQuery }
      });
      setSelectedChannel(response.data);
      analyzeWithGemini(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Channel not found');
    } finally {
      setSearching(false);
    }
  };

  const analyzeWithGemini = async (channelData: { channel: YouTubeChannel, recentVideos: any[] }) => {
    setAnalyzing(true);
    try {
      const vids = channelData.recentVideos.map(v => v.snippet.title).join(', ');
      const desc = channelData.channel.snippet.description;
      const stats = `Subscribers: ${channelData.channel.statistics.subscriberCount}, Total Views: ${channelData.channel.statistics.viewCount}`;

      const prompt = `
        Analyze the following YouTube channel data and identify trends in the last 24-48 hours.
        Channel: ${channelData.channel.snippet.title}
        Description: ${desc}
        Stats: ${stats}
        Recent Videos: ${vids}

        Return a JSON object in this format:
        {
          "summary": "Brief analysis of channel performance and content strategy",
          "hotTopics": ["Topic 1", "Topic 2"],
          "viralPotential": "Low" | "Medium" | "High" | "Extreme",
          "score": 0-100 (overall trend score)
        }
      `;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const analysis = JSON.parse(result.text || '{}');
      // Sanitize the score to prevent NaN errors in React
      analysis.score = Number(analysis.score);
      if (isNaN(analysis.score)) {
        analysis.score = 0;
      }
      setAiAnalysis(analysis);
    } catch (err) {
      console.error('Gemini Analysis Error:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const trendChartData = useMemo(() => {
    return trendingVideos.slice(0, 10).map(v => ({
      name: v.snippet.title.substring(0, 20) + '...',
      views: parseInt(v.statistics.viewCount) || 0,
      likes: parseInt(v.statistics.likeCount || '0') || 0
    }));
  }, [trendingVideos]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-red-500/30">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-red-600 p-2 rounded-lg shadow-lg shadow-red-900/20">
              <Youtube className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Niche<span className="text-zinc-100 font-normal">Researcher</span></h1>
          </div>

          <form onSubmit={handleSearch} className="flex-1 max-w-md mx-8 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search niche, channel or keyword..."
              className="w-full bg-zinc-800 border border-zinc-700/50 rounded-full py-2 pl-10 pr-4 focus:ring-2 focus:ring-red-500 transition-all outline-none text-zinc-100 placeholder:text-zinc-600"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 animate-spin" />}
          </form>

          <div className="flex items-center gap-4">
            <button 
              onClick={fetchTrending}
              className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400"
              title="Refresh Global Trends"
            >
              <RefreshCcw className={cn("w-5 h-5", loading && "animate-spin")} />
            </button>
            <div className="h-8 w-[1px] bg-zinc-800" />
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/50 text-emerald-500 rounded-full text-sm font-medium border border-zinc-700/50">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
              Scraper Online
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 space-y-8">
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-4 p-4 bg-red-900/20 border border-red-900/30 rounded-xl text-red-200"
          >
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0 text-red-500" />
            <div>
              <p className="font-semibold">Action Required</p>
              <p className="text-sm opacity-90">{error}</p>
              <p className="text-xs mt-2 opacity-75">Make sure to set your YOUTUBE_API_KEY in the Secrets panel.</p>
            </div>
          </motion.div>
        )}

        {/* Hero Section / Trending Stats */}
        {!selectedChannel && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="lg:col-span-2 bg-zinc-900 rounded-3xl border border-zinc-800 p-8 shadow-xl"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <TrendingUp className="text-red-600" />
                    Global View Velocity
                  </h2>
                  <p className="text-zinc-500 text-sm mt-1">Top 10 trending videos performance (last 24h)</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold uppercase tracking-widest text-zinc-600">Status</span>
                  <div className="flex items-center gap-2 text-red-500 font-mono text-sm">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    REAL-TIME
                  </div>
                </div>
              </div>

              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendChartData}>
                    <defs>
                      <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272A" />
                    <XAxis 
                      dataKey="name" 
                      hide
                    />
                    <YAxis 
                      tickFormatter={(val) => formatNumber(val)} 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#71717A' }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181B', borderRadius: '12px', border: '1px solid #3F3F46', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)' }}
                      itemStyle={{ color: '#F4F4F5' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="views" 
                      stroke="#ef4444" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorViews)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            <div className="space-y-6">
              <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-6 shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-zinc-800 p-2 rounded-xl">
                    <Flame className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-bold">Hot Categories</h3>
                    <p className="text-xs text-zinc-500">Pulse of the platform</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {['Gaming', 'Education', 'Lifestyle', 'Tech'].map((cat, i) => (
                    <div key={cat} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/20">
                      <span className="font-medium text-sm text-zinc-300">{cat}</span>
                      <div className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-bold",
                        i === 0 ? "bg-red-900/30 text-red-500 border border-red-500/20" : "bg-zinc-700 text-zinc-400"
                      )}>
                        {i === 0 ? 'BOOMING' : 'STABLE'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-600/20 to-zinc-900 border border-red-900/30 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
                <Sparkles className="absolute top-4 right-4 w-6 h-6 text-red-500 animate-pulse" />
                <h3 className="text-lg font-bold mb-2">Niche Scraper AI</h3>
                <p className="text-zinc-400 text-sm mb-4 leading-relaxed">
                  Search a niche or channel to unlock deep intelligence about performance and viral potential.
                </p>
                <button 
                  onClick={() => document.querySelector('input')?.focus()}
                  className="w-full bg-red-600 text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-500 transition-colors shadow-lg shadow-red-900/20"
                >
                  Start Discovery
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Channel Selection View */}
        {selectedChannel && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Channel Header */}
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="relative">
                <img 
                  src={selectedChannel.channel.snippet.thumbnails.high.url} 
                  alt={selectedChannel.channel.snippet.title}
                  className="w-32 h-32 rounded-3xl shadow-xl border-4 border-zinc-800 object-cover"
                />
                <div className="absolute -bottom-2 -right-2 bg-red-600 p-2 rounded-xl shadow-lg border-2 border-zinc-950">
                  <Youtube className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h2 className="text-3xl font-black tracking-tight">{selectedChannel.channel.snippet.title}</h2>
                    <p className="text-zinc-500 font-mono text-sm mt-1">{selectedChannel.channel.snippet.customUrl}</p>
                  </div>
                  <div className="flex gap-2">
                    <div className="bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-2xl shadow-xl text-center">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Subs</p>
                      <p className="text-lg font-black italic">{formatNumber(selectedChannel.channel.statistics.subscriberCount)}</p>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-2xl shadow-xl text-center">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Videos</p>
                      <p className="text-lg font-black italic">{formatNumber(selectedChannel.channel.statistics.videoCount)}</p>
                    </div>
                  </div>
                </div>
                <p className="text-zinc-400 max-w-2xl text-sm leading-relaxed line-clamp-2">
                  {selectedChannel.channel.snippet.description}
                </p>
              </div>
            </div>

            {/* AI Insights & Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 space-y-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <BarChart3 className="text-blue-500 w-5 h-5" />
                    Niche Performance
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedChannel.recentVideos.slice(0, 4).map((vid, i) => (
                      <div key={i} className="group relative bg-zinc-800/30 border border-zinc-700/20 rounded-2xl p-3 hover:bg-zinc-800/60 transition-all cursor-pointer">
                        <img 
                          src={vid.snippet.thumbnails.high.url} 
                          className="w-full aspect-video rounded-xl object-cover mb-3 grayscale group-hover:grayscale-0 transition-all duration-500" 
                        />
                        <h4 className="font-bold text-sm line-clamp-1 text-zinc-200">{vid.snippet.title}</h4>
                        <div className="flex items-center gap-3 mt-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(vid.snippet.publishedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 space-y-6">
                <div className="bg-zinc-950 border border-red-900/50 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 bg-red-600 text-white rounded-bl-2xl">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-zinc-100">
                    Niche Insight
                  </h3>
                  
                  {analyzing ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-4 text-center">
                      <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
                      <p className="text-sm font-medium text-zinc-500 animate-pulse">Scanning niche data...</p>
                    </div>
                  ) : aiAnalysis ? (
                    <div className="space-y-6">
                      <div className="p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800">
                        <p className="text-sm italic text-zinc-300 leading-relaxed">
                          "{aiAnalysis.summary}"
                        </p>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-red-900/10 border border-red-900/20 rounded-2xl">
                        <div className="text-sm font-bold text-red-400">Viral Potential</div>
                        <div className="px-3 py-1 bg-red-600 text-white rounded-full text-xs font-black italic">
                          {aiAnalysis.viralPotential}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold uppercase text-zinc-500">
                          <span>Niche Score</span>
                          <span className="text-zinc-300">{aiAnalysis.score}%</span>
                        </div>
                        <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${aiAnalysis.score}%` }}
                            className="h-full bg-red-600 rounded-full"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Pulse Keywords</p>
                        <div className="flex flex-wrap gap-2">
                          {aiAnalysis.hotTopics.map(topic => (
                            <span key={topic} className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full text-[10px] font-bold text-zinc-400 shadow-sm uppercase tracking-tighter italic">
                              #{topic.replace(/\s+/g, '')}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-zinc-600">
                      <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin opacity-20" />
                      <p className="text-sm font-mono tracking-widest uppercase">Initializing AI...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Trending Grid */}
        {!selectedChannel && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Clock className="text-zinc-600 w-5 h-5" />
                Live Feed <span className="text-zinc-600 font-normal">| Global Trends</span>
              </h2>
            </div>
            
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                  <div key={i} className="bg-zinc-900 rounded-3xl p-4 border border-zinc-800 animate-pulse space-y-4">
                    <div className="aspect-video bg-zinc-800 rounded-2xl" />
                    <div className="h-4 bg-zinc-800 rounded w-3/4" />
                    <div className="h-3 bg-zinc-800 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {trendingVideos.map((video, idx) => (
                  <motion.div 
                    key={video.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group bg-zinc-900 rounded-3xl p-4 border border-zinc-800 shadow-xl hover:bg-zinc-800/80 hover:-translate-y-1 transition-all duration-300"
                  >
                    <div className="relative aspect-video rounded-2xl overflow-hidden mb-4">
                      <img 
                        src={video.snippet.thumbnails.high.url} 
                        alt={video.snippet.title}
                        className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700"
                      />
                      <div className="absolute top-2 left-2 bg-zinc-950/80 backdrop-blur-md px-2 py-1 rounded-lg text-white text-[10px] font-mono border border-zinc-800">
                        {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h3 className="font-bold text-sm line-clamp-2 min-h-[40px] leading-tight text-zinc-200 group-hover:text-red-500 transition-colors">
                        {video.snippet.title}
                      </h3>
                      <p className="text-zinc-500 text-xs font-semibold">{video.snippet.channelTitle}</p>
                      <div className="flex items-center justify-between pt-3 border-t border-zinc-800 flex-wrap gap-2">
                        <div className="flex items-center gap-1.5 text-zinc-500">
                          <Eye className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-mono italic">{formatNumber(video.statistics.viewCount)}</span>
                        </div>
                        <span className="text-[10px] font-black italic text-zinc-600 group-hover:text-red-600 transition-colors">HOT</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="mt-20 py-12 bg-zinc-900/50 border-t border-zinc-800 text-center text-zinc-600 text-xs tracking-widest uppercase">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Youtube className="w-4 h-4 text-red-600" />
          <span className="font-black text-zinc-400">Niche Researcher Intelligence</span>
        </div>
        <p>&copy; 2024 AI Trend Intelligence &bull; Quantum Scraper Online</p>
      </footer>
    </div>
  );
}
