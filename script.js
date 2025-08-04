/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineBtn = document.getElementById("generateRoutine");
const userInput = document.getElementById("userInput");
const selectedProductsTitle = document.getElementById("selectedProductsTitle");
const productSearch = document.getElementById("productSearch");

/* Global variables to track state */
let allProducts = []; // Store all products for easy access
let selectedProducts = []; // Array to store selected product objects
let conversationHistory = []; // Store chat history for context
let routineGenerated = false; // Track if routine has been generated

/* LocalStorage key for saving selected products */
const SELECTED_PRODUCTS_KEY = "loreal-selected-products";

/* Cloudflare Worker endpoint for secure API calls */
/* Replace this with your actual Cloudflare Worker URL */
const CLOUDFLARE_WORKER_URL = "https://lorealpage.vt2162.workers.dev/";

/* Cloudflare Worker endpoint for web-searching AI */
/* This will be a separate worker that uses a web-searching model */
const WEB_SEARCH_WORKER_URL = "https://lorealwebsearch.vt2162.workers.dev/";

/* Current filter state */
let currentCategory = "";
let currentSearchTerm = "";

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Show initial chat placeholder */
chatWindow.innerHTML = `
  <div class="placeholder-message">
    Select products and generate a routine to start chatting with your AI advisor!
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  try {
    const response = await fetch("products.json");
    const data = await response.json();
    allProducts = data.products; // Store for global access
    return data.products;
  } catch (error) {
    console.error("Error loading products:", error);
    return [];
  }
}

/* Save selected products to localStorage */
function saveSelectedProducts() {
  const productIds = selectedProducts.map((product) => product.id);
  localStorage.setItem(SELECTED_PRODUCTS_KEY, JSON.stringify(productIds));
}

/* Load selected products from localStorage */
function loadSelectedProducts() {
  try {
    const savedProductIds = localStorage.getItem(SELECTED_PRODUCTS_KEY);
    if (savedProductIds) {
      const productIds = JSON.parse(savedProductIds);

      /* Find the actual product objects from allProducts */
      selectedProducts = productIds
        .map((id) => allProducts.find((product) => product.id === id))
        .filter((product) => product !== undefined); // Remove any products that no longer exist

      /* Update the display */
      updateSelectedProductsList();

      /* Apply visual selection to any visible product cards */
      applySelectionStyling();
    }
  } catch (error) {
    console.error("Error loading saved products:", error);
    selectedProducts = [];
  }
}

/* Apply selection styling to visible product cards */
function applySelectionStyling() {
  selectedProducts.forEach((selectedProduct) => {
    const productCard = document.querySelector(
      `[data-product-id="${selectedProduct.id}"]`
    );
    if (productCard) {
      productCard.classList.add("selected");
    }
  });
}

/* Filter products based on category and search term */
function filterProducts() {
  if (allProducts.length === 0) return;

  let filteredProducts = allProducts;

  /* Apply category filter */
  if (currentCategory) {
    filteredProducts = filteredProducts.filter(
      (product) => product.category === currentCategory
    );
  }

  /* Apply search filter */
  if (currentSearchTerm) {
    const searchLower = currentSearchTerm.toLowerCase();
    filteredProducts = filteredProducts.filter((product) => {
      return (
        product.name.toLowerCase().includes(searchLower) ||
        product.brand.toLowerCase().includes(searchLower) ||
        product.description.toLowerCase().includes(searchLower) ||
        product.category.toLowerCase().includes(searchLower)
      );
    });
  }

  /* Display filtered products */
  if (filteredProducts.length === 0) {
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        No products found matching your search criteria.
      </div>
    `;
  } else {
    displayProducts(filteredProducts);
    /* Re-apply selected styling */
    applySelectionStyling();
  }
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div class="product-card" data-product-id="${product.id}" onclick="toggleProductSelection(${product.id})">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
      </div>
      <div class="product-description-overlay">
        <p>${product.description}</p>
      </div>
    </div>
  `
    )
    .join("");
}

/* Toggle product selection when clicked */
function toggleProductSelection(productId) {
  const product = allProducts.find((p) => p.id === productId);
  if (!product) return;

  const productCard = document.querySelector(
    `[data-product-id="${productId}"]`
  );
  const existingIndex = selectedProducts.findIndex((p) => p.id === productId);

  if (existingIndex > -1) {
    /* Product is already selected, remove it */
    selectedProducts.splice(existingIndex, 1);
    productCard.classList.remove("selected");
  } else {
    /* Product is not selected, add it */
    selectedProducts.push(product);
    productCard.classList.add("selected");
  }

  /* Save to localStorage and update display */
  saveSelectedProducts();
  updateSelectedProductsList();
}

/* Update the selected products display */
function updateSelectedProductsList() {
  /* Update the title with count */
  const count = selectedProducts.length;
  selectedProductsTitle.textContent = `Selected Products (${count})`;

  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML =
      '<p class="no-products">No products selected</p>';
    return;
  }

  /* Create the products list with a clear all button */
  const productsHTML = selectedProducts
    .map(
      (product) => `
      <div class="selected-product-item">
        <span>${product.brand} - ${product.name}</span>
        <button onclick="removeSelectedProduct(${product.id})" class="remove-btn">×</button>
      </div>
    `
    )
    .join("");

  const clearAllButton = `
    <div class="clear-all-container">
      <button onclick="clearAllSelectedProducts()" class="clear-all-btn">
        <i class="fa-solid fa-trash"></i> Clear All
      </button>
    </div>
  `;

  selectedProductsList.innerHTML = productsHTML + clearAllButton;
}

/* Remove product from selected list */
function removeSelectedProduct(productId) {
  const index = selectedProducts.findIndex((p) => p.id === productId);
  if (index > -1) {
    selectedProducts.splice(index, 1);

    /* Also remove selection styling from product card */
    const productCard = document.querySelector(
      `[data-product-id="${productId}"]`
    );
    if (productCard) {
      productCard.classList.remove("selected");
    }

    /* Save to localStorage and update display */
    saveSelectedProducts();
    updateSelectedProductsList();
  }
}

/* Clear all selected products */
function clearAllSelectedProducts() {
  /* Confirm with user before clearing */
  if (confirm("Are you sure you want to clear all selected products?")) {
    /* Remove selection styling from all product cards */
    selectedProducts.forEach((product) => {
      const productCard = document.querySelector(
        `[data-product-id="${product.id}"]`
      );
      if (productCard) {
        productCard.classList.remove("selected");
      }
    });

    /* Clear the array and localStorage */
    selectedProducts = [];
    saveSelectedProducts();
    updateSelectedProductsList();
  }
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  if (allProducts.length === 0) {
    allProducts = await loadProducts();
  }

  currentCategory = e.target.value;
  filterProducts();
});

/* Filter products when search input changes */
productSearch.addEventListener("input", (e) => {
  currentSearchTerm = e.target.value.trim();

  /* If there's no category selected and user is searching, show all products */
  if (!currentCategory && currentSearchTerm) {
    currentCategory = ""; // This will show products from all categories
  }

  filterProducts();
});

/* Generate routine using OpenAI API */
async function generateRoutine() {
  if (selectedProducts.length === 0) {
    alert("Please select at least one product before generating a routine.");
    return;
  }

  /* Show loading message */
  chatWindow.innerHTML = `
    <div class="loading-message">
      <i class="fa-solid fa-spinner fa-spin"></i> Generating your personalized routine...
    </div>
  `;

  try {
    /* Prepare products data for AI */
    const productsForAI = selectedProducts.map((product) => ({
      name: product.name,
      brand: product.brand,
      category: product.category,
      description: product.description,
    }));

    /* Create the prompt for OpenAI */
    const systemMessage = {
      role: "system",
      content:
        "You are a professional beauty and skincare advisor for L'Oréal. Create personalized routines based on the products provided. Be knowledgeable about skincare, haircare, makeup, and beauty best practices. Provide step-by-step instructions and explain the benefits of each product in the routine. When using web search, include current information and cite any sources with links.",
    };

    const userMessage = {
      role: "user",
      content: `Please create a personalized beauty routine using these L'Oréal products: ${JSON.stringify(
        productsForAI
      )}. Provide a detailed step-by-step routine with timing recommendations and explain how each product works together.`,
    };

    /* Initialize conversation history */
    conversationHistory = [systemMessage, userMessage];

    /* Make API call to OpenAI via Cloudflare Worker */
    const response = await fetch(CLOUDFLARE_WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: conversationHistory,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`Cloudflare Worker error: ${response.status}`);
    }

    const data = await response.json();
    const routineText = data.choices[0].message.content;

    /* Add AI response to conversation history */
    conversationHistory.push({
      role: "assistant",
      content: routineText,
    });

    /* Display the routine in chat window */
    chatWindow.innerHTML = `
      <div class="ai-message">
        <strong>Your Personalized L'Oréal Routine:</strong><br><br>
        ${routineText.replace(/\n/g, "<br>")}
      </div>
    `;

    routineGenerated = true;
  } catch (error) {
    console.error("Error generating routine:", error);
    chatWindow.innerHTML = `
      <div class="error-message">
        Sorry, there was an error generating your routine. Please check your Cloudflare Worker configuration and try again.
      </div>
    `;
  }
}

/* Handle chat form submission for follow-up questions */
async function handleChatSubmission(e) {
  e.preventDefault();

  const message = userInput.value.trim();
  if (!message) return;

  if (!routineGenerated) {
    chatWindow.innerHTML = `
      <div class="info-message">
        Please generate a routine first by selecting products and clicking "Generate Routine".
      </div>
    `;
    return;
  }

  /* Add user message to chat window */
  const currentChat = chatWindow.innerHTML;
  chatWindow.innerHTML =
    currentChat +
    `
    <div class="user-message">
      <strong>You:</strong> ${message}
    </div>
  `;

  /* Add loading indicator */
  chatWindow.innerHTML += `
    <div class="loading-message">
      <i class="fa-solid fa-spinner fa-spin"></i> Thinking...
    </div>
  `;

  /* Clear input */
  userInput.value = "";

  /* Scroll to bottom */
  chatWindow.scrollTop = chatWindow.scrollHeight;

  try {
    /* Add user message to conversation history */
    conversationHistory.push({
      role: "user",
      content: message,
    });

    /* Make API call to Web-Searching AI via Cloudflare Worker with conversation history */
    const response = await fetch(WEB_SEARCH_WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: conversationHistory,
        max_tokens: 500,
        temperature: 0.7,
        web_search: true, // Enable web search for chat responses
      }),
    });

    if (!response.ok) {
      throw new Error(`Cloudflare Worker error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    /* Add AI response to conversation history */
    conversationHistory.push({
      role: "assistant",
      content: aiResponse,
    });

    /* Remove loading message and add AI response */
    const loadingMessage = chatWindow.querySelector(
      ".loading-message:last-child"
    );
    if (loadingMessage) {
      loadingMessage.remove();
    }

    chatWindow.innerHTML += `
      <div class="ai-message">
        <strong>AI Advisor:</strong> ${formatAIResponse(aiResponse)}
      </div>
    `;

    /* Scroll to bottom */
    chatWindow.scrollTop = chatWindow.scrollHeight;
  } catch (error) {
    console.error("Error in chat:", error);

    /* Remove loading message and show error */
    const loadingMessage = chatWindow.querySelector(
      ".loading-message:last-child"
    );
    if (loadingMessage) {
      loadingMessage.remove();
    }

    chatWindow.innerHTML += `
      <div class="error-message">
        Sorry, there was an error processing your message. Please try again.
      </div>
    `;
  }
}

/* Format AI response to handle links and citations */
function formatAIResponse(text) {
  /* Convert newlines to <br> tags */
  let formatted = text.replace(/\n/g, "<br>");

  /* Convert URLs to clickable links */
  const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g;
  formatted = formatted.replace(
    urlRegex,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="ai-link">$1</a>'
  );

  /* Format citations in square brackets */
  const citationRegex = /\[(\d+)\]/g;
  formatted = formatted.replace(
    citationRegex,
    '<span class="citation">[$1]</span>'
  );

  return formatted;
}

/* Event listeners */
generateRoutineBtn.addEventListener("click", generateRoutine);
chatForm.addEventListener("submit", handleChatSubmission);

/* Initialize the app */
document.addEventListener("DOMContentLoaded", async () => {
  /* Load products first */
  await loadProducts();

  /* Then load any saved selected products */
  loadSelectedProducts();
});
