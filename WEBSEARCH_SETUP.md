# Updated Cloudflare Worker Setup Instructions

## Option 1: Simple Setup (OpenAI Only) - RECOMMENDED

### 1. Create One Cloudflare Worker for Web Search

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & Pages**
3. Click **Create application** → **Create Worker**
4. Give your worker a name (e.g., `loreal-websearch-simple`)
5. Click **Deploy**

### 2. Configure the Simple Worker

1. In your worker's dashboard, click **Edit code**
2. Replace the default code with the content from `cloudflare-simple-websearch-worker.js`
3. Click **Save and deploy**

### 3. Set Environment Variables (Simple Setup)

1. In your worker's dashboard, go to **Settings** → **Variables**
2. Under **Environment Variables**, click **Add variable**
3. Add:
   - **Variable name**: `OPENAI_API_KEY`
   - **Value**: Your OpenAI API key (starts with `sk-`)
   - **Encrypt**: ✅

### 4. Update Your Frontend Code (Simple Setup)

1. In `script.js`, update the web search worker URL:
   ```javascript
   const WEB_SEARCH_WORKER_URL =
     "https://loreal-websearch-simple.your-username.workers.dev";
   ```

That's it! This simple setup only requires your OpenAI API key and uses free web search APIs.

---

## Option 2: Advanced Setup (Two Workers) - For More Features

### 1. Create Two Cloudflare Workers

#### Worker 1: Basic OpenAI API (for routine generation)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & Pages**
3. Click **Create application** → **Create Worker**
4. Give your worker a name (e.g., `loreal-routine-api`)
5. Click **Deploy**

#### Worker 2: Web-Searching AI (for chat responses)

1. Create another worker (e.g., `loreal-websearch-api`)
2. This will handle chat questions with real-time web search

### 2. Configure the Worker Code

#### For the basic worker:

1. In your worker's dashboard, click **Edit code**
2. Replace the default code with the content from `cloudflare-worker-example.js`
3. Click **Save and deploy**

#### For the web-search worker:

1. In your web-search worker's dashboard, click **Edit code**
2. Replace the default code with the content from `cloudflare-websearch-worker.js`
3. Click **Save and deploy**

### 3. Set Environment Variables

#### For both workers, add these variables:

1. In each worker's dashboard, go to **Settings** → **Variables**
2. Under **Environment Variables**, click **Add variable**
3. Add:
   - **Variable name**: `OPENAI_API_KEY`
   - **Value**: Your OpenAI API key (starts with `sk-`)
   - **Encrypt**: ✅

#### For the web-search worker, also add:

4. Add:
   - **Variable name**: `PERPLEXITY_API_KEY`
   - **Value**: Your Perplexity API key (get from https://www.perplexity.ai/)
   - **Encrypt**: ✅

### 4. Update Your Frontend Code

1. In `script.js`, update both worker URLs:
   ```javascript
   const CLOUDFLARE_WORKER_URL =
     "https://loreal-routine-api.your-username.workers.dev";
   const WEB_SEARCH_WORKER_URL =
     "https://loreal-websearch-api.your-username.workers.dev";
   ```

### 5. Get a Perplexity AI API Key

1. Go to [Perplexity AI](https://www.perplexity.ai/)
2. Sign up for an account
3. Navigate to API settings
4. Generate an API key
5. Add it to your web-search worker's environment variables

### 6. Test Your Setup

1. Open your website
2. Use the search field to find products by name or keyword
3. Select some products and generate a routine (uses basic worker)
4. Ask follow-up questions in the chat (uses web-search worker with real-time information)

## New Features Added

✅ **Product Search**: Type to filter products by name, brand, or keyword  
✅ **Web-Searching AI**: Chat responses include current L'Oréal information with citations  
✅ **Clickable Links**: AI responses automatically convert URLs to clickable links  
✅ **Citations**: References are highlighted and numbered for easy reading  
✅ **Combined Filtering**: Category dropdown works alongside text search

## Benefits of Using Two Workers

✅ **Security**: API keys are never exposed to the client  
✅ **Performance**: Different models optimized for different tasks  
✅ **Real-time Information**: Web search provides current product info and trends  
✅ **Cost Optimization**: Use cheaper models for routine generation, advanced models for search  
✅ **Scalability**: Each worker can be scaled independently

## Alternative Web Search APIs

If you prefer not to use Perplexity AI, you can modify the web-search worker to use:

- **Tavily AI**: Great for web search with citations
- **You.com API**: Comprehensive search with AI summaries
- **Bing Search API**: Microsoft's search API with AI integration
- **SerpAPI + OpenAI**: Combine search results with OpenAI processing

## Troubleshooting

- **Search not working**: Check that both worker URLs are correct in `script.js`
- **No web search results**: Verify Perplexity API key is set correctly
- **CORS errors**: Make sure both workers include proper CORS headers
- **Links not clickable**: Check that `formatAIResponse()` function is working
- **Citations not showing**: Ensure `return_citations: true` in Perplexity API call
