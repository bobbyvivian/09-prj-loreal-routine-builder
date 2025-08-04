# Cloudflare Worker Setup Instructions

## Setting up your Cloudflare Worker for secure OpenAI API calls

### 1. Create a Cloudflare Worker

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & Pages**
3. Click **Create application** → **Create Worker**
4. Give your worker a name (e.g., `loreal-routine-api`)
5. Click **Deploy**

### 2. Configure the Worker Code

1. In your worker's dashboard, click **Edit code**
2. Replace the default code with the content from `cloudflare-worker-example.js`
3. Click **Save and deploy**

### 3. Set Environment Variables

1. In your worker's dashboard, go to **Settings** → **Variables**
2. Under **Environment Variables**, click **Add variable**
3. Add:
   - **Variable name**: `OPENAI_API_KEY`
   - **Value**: Your OpenAI API key (starts with `sk-`)
   - **Encrypt**: ✅ (recommended for security)
4. Click **Save and deploy**

### 4. Update Your Frontend Code

1. In `script.js`, replace the `CLOUDFLARE_WORKER_URL` constant with your worker's URL:
   ```javascript
   const CLOUDFLARE_WORKER_URL =
     "https://your-worker-name.your-username.workers.dev";
   ```

### 5. Test Your Setup

1. Open your website
2. Select some products
3. Click "Generate Routine"
4. The app should now make secure API calls through your Cloudflare Worker

## Benefits of Using Cloudflare Worker

✅ **Security**: Your OpenAI API key is never exposed to the client
✅ **Performance**: Cloudflare's global network provides fast response times
✅ **Scalability**: Automatically scales with your traffic
✅ **Cost-effective**: Free tier includes 100,000 requests per day
✅ **CORS handling**: Built-in cross-origin request support

## Troubleshooting

- **CORS errors**: Make sure your worker includes the proper CORS headers
- **401 Unauthorized**: Check that your OpenAI API key is correctly set in environment variables
- **Worker not found**: Verify the worker URL in your `script.js` file
- **Rate limits**: OpenAI has rate limits based on your plan

## Security Notes

- Never commit your OpenAI API key to version control
- Use Cloudflare's encrypted environment variables
- Consider adding request validation and rate limiting to your worker
- Monitor your OpenAI usage in the OpenAI dashboard
