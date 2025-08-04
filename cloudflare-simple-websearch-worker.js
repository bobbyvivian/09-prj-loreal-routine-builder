// Simplified Cloudflare Worker using only OpenAI + Free Web Search
// This version only requires your OpenAI API key

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

        // Perform simple web search
        const searchResults = await searchWeb(latestQuestion);

        // Create enhanced prompt with search results
        const enhancedMessages = [
          {
            role: "system",
            content: `You are a professional L'Oréal beauty advisor. I've searched the web for current information related to the user's question. Use this information to provide an up-to-date response. Include relevant links and cite sources when mentioning specific information.

Current Web Search Results:
${searchResults}

Please provide a helpful response based on both this current information and your knowledge of L'Oréal products and beauty routines.`,
          },
          ...requestData.messages.filter((msg) => msg.role !== "system"), // Keep user messages but replace system message
        ];

        // Use OpenAI to process everything
        const openaiRequest = {
          model: "gpt-4o",
          messages: enhancedMessages,
          max_tokens: requestData.max_tokens || 600,
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
      } else {
        // Regular OpenAI request (for routine generation)
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

// Simple web search function using free APIs
async function searchWeb(query) {
  try {
    // Create search query focused on beauty and L'Oréal
    const beautyQuery = `L'Oréal ${query} beauty skincare routine products`;

    // Try multiple free search sources
    const searchPromises = [
      searchDuckDuckGo(beautyQuery),
      searchWikipedia(query),
    ];

    const results = await Promise.allSettled(searchPromises);
    let combinedResults = "";

    results.forEach((result, index) => {
      if (result.status === "fulfilled" && result.value) {
        combinedResults += result.value + "\n\n";
      }
    });

    return (
      combinedResults ||
      "No current web information available. Providing response based on training data."
    );
  } catch (error) {
    console.error("Web search error:", error);
    return "Web search temporarily unavailable. Providing response based on training data.";
  }
}

// DuckDuckGo search (free, no API key)
async function searchDuckDuckGo(query) {
  try {
    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(
        query
      )}&format=json&no_html=1&skip_disambig=1`
    );
    const data = await response.json();

    let results = "";

    if (data.Abstract) {
      results += `Source: DuckDuckGo\nTitle: ${
        data.Heading || "Search Result"
      }\nInfo: ${data.Abstract}\nURL: ${data.AbstractURL}\n`;
    }

    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      data.RelatedTopics.slice(0, 2).forEach((topic) => {
        if (topic.Text && topic.FirstURL) {
          results += `Related: ${topic.Text.substring(0, 200)}...\nURL: ${
            topic.FirstURL
          }\n`;
        }
      });
    }

    return results;
  } catch (error) {
    console.error("DuckDuckGo search failed:", error);
    return "";
  }
}

// Wikipedia search (free, no API key)
async function searchWikipedia(query) {
  try {
    // Search for beauty/cosmetics related terms
    const beautyTerms = ["cosmetics", "skincare", "beauty", "makeup"];
    const searchTerm =
      beautyTerms.find((term) => query.toLowerCase().includes(term)) ||
      "cosmetics";

    const response = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
        searchTerm
      )}`
    );
    const data = await response.json();

    if (data.extract) {
      return `Source: Wikipedia\nTitle: ${data.title}\nSummary: ${
        data.extract
      }\nURL: ${data.content_urls?.desktop?.page || ""}\n`;
    }

    return "";
  } catch (error) {
    console.error("Wikipedia search failed:", error);
    return "";
  }
}
