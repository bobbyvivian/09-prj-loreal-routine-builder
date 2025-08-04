// Cloudflare Worker for L'Oréal Routine Builder with Web Search
// This worker combines web search results with OpenAI processing

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // Only allow POST requests
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    try {
      // Parse the request body
      const requestData = await request.json();

      // Check if web search is requested
      const useWebSearch = requestData.web_search || false;

      if (useWebSearch) {
        // Extract the user's question from the conversation
        const userMessages = requestData.messages.filter(
          (msg) => msg.role === "user"
        );
        const latestQuestion =
          userMessages[userMessages.length - 1]?.content || "";

        // Create search query focused on L'Oréal and beauty topics
        const searchQuery = `L'Oréal ${latestQuestion} beauty skincare products routine`;

        // Perform web search using Tavily API (free tier available)
        const searchResults = await performWebSearch(
          searchQuery,
          env.TAVILY_API_KEY
        );

        // Combine search results with conversation context for OpenAI
        const enhancedMessages = [
          ...requestData.messages.slice(0, -1), // All messages except the last user message
          {
            role: "system",
            content: `You are a professional L'Oréal beauty advisor. Use the following current web search results to provide up-to-date information in your response. Include relevant links and cite your sources with [1], [2], etc.

Web Search Results:
${searchResults.formattedResults}

Source URLs:
${searchResults.sourceUrls
  .map((url, index) => `[${index + 1}] ${url}`)
  .join("\n")}`,
          },
          requestData.messages[requestData.messages.length - 1], // The latest user message
        ];

        // Use OpenAI to process the search results
        const openaiRequest = {
          model: "gpt-4o",
          messages: enhancedMessages,
          max_tokens: requestData.max_tokens || 500,
          temperature: requestData.temperature || 0.7,
        };

        const openaiResponse = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify(openaiRequest),
          }
        );

        if (!openaiResponse.ok) {
          throw new Error(`OpenAI API error: ${openaiResponse.status}`);
        }

        const openaiData = await openaiResponse.json();

        // Return the response with CORS headers
        return new Response(JSON.stringify(openaiData), {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        });
      } else {
        // Fall back to regular OpenAI for routine generation
        const openaiRequest = {
          model: "gpt-4o",
          messages: requestData.messages,
          max_tokens: requestData.max_tokens || 500,
          temperature: requestData.temperature || 0.7,
        };

        const openaiResponse = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify(openaiRequest),
          }
        );

        if (!openaiResponse.ok) {
          throw new Error(`OpenAI API error: ${openaiResponse.status}`);
        }

        const openaiData = await openaiResponse.json();

        return new Response(JSON.stringify(openaiData), {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        });
      }
    } catch (error) {
      console.error("Worker error:", error);

      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: error.message,
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }
      );
    }
  },
};

// Function to perform web search using Tavily API
async function performWebSearch(query, apiKey) {
  try {
    // Use Tavily API for web search (has a free tier)
    const tavilyResponse = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query: query,
        search_depth: "basic",
        include_answer: true,
        include_domains: [
          "loreal.com",
          "sephora.com",
          "ulta.com",
          "allure.com",
          "byrdie.com",
        ],
        max_results: 5,
      }),
    });

    if (!tavilyResponse.ok) {
      // Fallback to DuckDuckGo search if Tavily fails
      return await performDuckDuckGoSearch(query);
    }

    const tavilyData = await tavilyResponse.json();

    // Format the results for OpenAI
    const formattedResults = tavilyData.results
      .map(
        (result, index) =>
          `[${index + 1}] ${result.title}\n${result.content}\nSource: ${
            result.url
          }\n`
      )
      .join("\n");

    const sourceUrls = tavilyData.results.map((result) => result.url);

    return {
      formattedResults,
      sourceUrls,
    };
  } catch (error) {
    console.error("Search error:", error);
    // Return fallback message if search fails
    return {
      formattedResults:
        "Web search temporarily unavailable. Providing response based on training data.",
      sourceUrls: [],
    };
  }
}

// Fallback search function using DuckDuckGo (no API key required)
async function performDuckDuckGoSearch(query) {
  try {
    // Use DuckDuckGo Instant Answer API (free, no key required)
    const duckResponse = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(
        query
      )}&format=json&no_html=1&skip_disambig=1`
    );
    const duckData = await duckResponse.json();

    let formattedResults = "";
    let sourceUrls = [];

    if (duckData.Abstract) {
      formattedResults += `[1] ${duckData.Heading || "Search Result"}\n${
        duckData.Abstract
      }\nSource: ${duckData.AbstractURL}\n\n`;
      sourceUrls.push(duckData.AbstractURL);
    }

    if (duckData.RelatedTopics && duckData.RelatedTopics.length > 0) {
      duckData.RelatedTopics.slice(0, 3).forEach((topic, index) => {
        if (topic.Text && topic.FirstURL) {
          formattedResults += `[${index + 2}] ${topic.Text}\nSource: ${
            topic.FirstURL
          }\n\n`;
          sourceUrls.push(topic.FirstURL);
        }
      });
    }

    return {
      formattedResults:
        formattedResults ||
        "No specific search results found. Providing response based on training data.",
      sourceUrls,
    };
  } catch (error) {
    console.error("DuckDuckGo search error:", error);
    return {
      formattedResults:
        "Web search temporarily unavailable. Providing response based on training data.",
      sourceUrls: [],
    };
  }
}
