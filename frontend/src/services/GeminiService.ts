import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Configure the safety settings
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

// A development API key for demo purposes - this should be replaced with a real key from environment variables
// in a production environment. Never include real API keys in client-side code.
const DEMO_API_KEY = "AIzaSyDxRpn-ycgSath1SoSJbH4hYYP1-PsEYLU"; // This is a placeholder, not a real key

export interface Message {
  role: 'user' | 'model' | 'assistant'; // Include 'assistant' for backend compatibility
  content: string;
}

class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any;
  private chatHistory: Message[] = [];
  private initialized = false;
  private isInitializing = false;
  private initializationError: string | null = null;
  private bookId: number | null = null; // Store book ID for API calls
  
  constructor() {
    // Initialize when service is created
    console.log('GeminiService constructor called');
    this.initializeAPI();
  }
  
  private async initializeAPI(): Promise<void> {
    if (this.initialized || this.isInitializing) {
      console.log('Gemini API already initialized or initializing, skipping');
      return;
    }
    
    this.isInitializing = true;
    console.log('Starting Gemini API initialization');
    
    try {
      // First try to get API key from backend
      let apiKey = "";
      try {
        console.log('Fetching Gemini API key from backend');
        const response = await fetch('/api/config/gemini-key');
        
        if (response.ok) {
          const data = await response.json();
          apiKey = data.apiKey;
        } else {
          console.warn("Couldn't fetch API key from backend:", await response.text());
        }
      } catch (error) {
        console.warn("Error fetching API key from backend:", error);
      }
      
      // If backend fails, use demo key for development
      if (!apiKey) {
        console.warn('Using environment variable API key');
        apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
        
        if (!apiKey) {
          console.error('No API key found in environment variables (VITE_GOOGLE_API_KEY)');
          throw new Error('No valid Gemini API key available');
        }
      }
      
      console.log('Initializing Gemini client');
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({
        model: "gemini-1.0-pro",
        safetySettings,
      });
      
      // Test the API with a simple query to verify the key works
      try {
        console.log("Testing Gemini API...");
        const result = await this.model.generateContent("Test message");
        const response = await result.response;
        const text = response.text();
        console.log("Gemini API test successful!");
      } catch (testError: any) {
        console.error("Gemini API test failed:", testError);
        throw new Error(`API key verification failed: ${testError.message || 'Unknown error'}`);
      }
      
      this.initialized = true;
      this.isInitializing = false;
      this.initializationError = null;
      console.log('Gemini API initialized successfully');
    } catch (error: any) {
      this.isInitializing = false;
      this.initialized = false;
      this.initializationError = error.message || 'Unknown error initializing Gemini API';
      console.error('Error initializing Gemini API:', error);
    }
  }
  
  private async ensureInitialized(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }
    
    if (this.isInitializing) {
      console.log('Waiting for initialization to complete...');
      // Wait for ongoing initialization to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      return this.ensureInitialized();
    }
    
    if (this.initializationError) {
      console.log('Previous initialization failed, retrying');
    }
    
    try {
      await this.initializeAPI();
      return this.initialized;
    } catch (error) {
      console.error('Failed to initialize Gemini API:', error);
      return false;
    }
  }
  
  // Initialize or reset chat with system prompt
  public async initChat(systemPrompt?: string, bookId?: number): Promise<void> {
    console.log('initChat called with prompt:', systemPrompt?.substring(0, 50) + '...');
    // Store the book ID
    this.bookId = bookId || null;
    
    // Reset chat history
    this.chatHistory = [];
    console.log('Chat history reset');
    
    if (systemPrompt) {
      // Add system prompt as first message, but don't display it in the UI
      const hiddenSystemMessage: Message = {
        role: 'user',
        content: systemPrompt
      };
      
      // Store internally but don't return in getChatHistory
      this._addInternalMessage(hiddenSystemMessage);
      console.log('System prompt added as internal message');
    }
  }
  
  // Internal method to add messages that won't be displayed in the UI
  private _addInternalMessage(message: Message): void {
    // Add special flag to mark system messages
    (message as any)._isSystemMessage = true;
    this.chatHistory.push(message);
  }
  
  // Send a message to the backend chat API
  public async sendMessage(message: string, contextualData?: string): Promise<string> {
    console.log('sendMessage called:', message?.substring(0, 50) + '...');
    
    try {
      // Check if the backend API is available
      let useBackendApi = true;
      try {
        // Try to ping the API
        const pingResponse = await fetch('/api/config/debug-keys', { method: 'GET' });
        useBackendApi = pingResponse.ok;
      } catch (error) {
        console.warn('Backend API unavailable, falling back to direct Gemini API');
        useBackendApi = false;
      }
      
      // If the backend API is available, use it
      if (useBackendApi) {
        // Prepare request payload
        const payload = {
          message: message,
          book_id: this.bookId,
          context: contextualData,
          history: this.chatHistory
            .filter(msg => !(msg as any)._isSystemMessage) // Filter out system messages
            .map(msg => ({
              role: msg.role === 'model' ? 'assistant' : msg.role, // Convert 'model' to 'assistant' for backend
              content: msg.content
            }))
        };
        
        console.log('Sending request to backend chat API', { 
          messageLength: message.length, 
          contextLength: contextualData ? contextualData.length : 0,
          bookId: this.bookId,
          historySize: this.chatHistory.length
        });
        
        // Call backend API
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        
        // Handle potential errors
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Chat API error:', errorText);
          throw new Error(`Chat API error: ${response.status} ${errorText}`);
        }
        
        // Parse response
        const data = await response.json();
        console.log('Received response from chat API');
        
        // Get system messages to preserve them
        const systemMessages = this.chatHistory.filter(msg => (msg as any)._isSystemMessage);
        
        // Update chat history from the response, but exclude system messages from UI
        this.chatHistory = [
          ...systemMessages,
          ...data.history.map((msg: any) => ({
            role: msg.role === 'assistant' ? 'model' : msg.role, // Convert 'assistant' to 'model' for frontend
            content: msg.content
          }))
        ];
        
        return data.response;
      } else {
        // If backend API is unavailable, fall back to direct Gemini API
        return this.sendMessageDirectToGemini(message, contextualData);
      }
    } catch (error: any) {
      // If backend API call fails, try Gemini API directly as fallback
      console.error('Error using backend chat API, falling back to direct Gemini API:', error);
      return this.sendMessageDirectToGemini(message, contextualData);
    }
  }
  
  // Fallback to direct Gemini API if backend fails
  private async sendMessageDirectToGemini(message: string, contextualData?: string): Promise<string> {
    console.log('Falling back to direct Gemini API');
    const isInitialized = await this.ensureInitialized();
    
    if (!isInitialized) {
      const errorMessage = "I'm sorry, I'm having trouble connecting to my knowledge base. Please try again later.";
      
      // Add user message to history (not marked as system)
      this.chatHistory.push({ role: 'user', content: message });
      
      // Add error response to history
      this.chatHistory.push({ role: 'model', content: errorMessage });
      return errorMessage;
    }
    
    try {
      // Add user message to history (not marked as system)
      this.chatHistory.push({
        role: 'user',
        content: message
      });
      
      // Trim history if needed, but preserve system messages
      const systemMessages = this.chatHistory.filter(msg => (msg as any)._isSystemMessage);
      const regularMessages = this.chatHistory.filter(msg => !(msg as any)._isSystemMessage);
      
      if (regularMessages.length > 18) {  // 18 + 2 system messages = 20 max
        this.chatHistory = [
          ...systemMessages,
          ...regularMessages.slice(regularMessages.length - 18)
        ];
      }
      
      // Prepare conversation history for Gemini's format, excluding system messages for the API call
      const history = this.chatHistory
        .filter(msg => !(msg as any)._isSystemMessage)
        .map(msg => ({
          role: msg.role,
          parts: [{ text: msg.content }]
        }));
      
      // Instead of using chat instance (which sometimes doesn't properly use history)
      // use generateContent with a properly formatted message
      let fullPrompt = "";
      
      // Add system message/context first
      const systemMessage = this.chatHistory.find(msg => (msg as any)._isSystemMessage);
      if (systemMessage) {
        fullPrompt += systemMessage.content + "\n\n";
      }
      
      // Add conversation history
      const userMessages = this.chatHistory
        .filter(msg => !(msg as any)._isSystemMessage)
        .slice(0, -1);  // exclude the most recent user message which we'll add manually
      
      if (userMessages.length > 0) {
        fullPrompt += "Previous conversation:\n";
        for (const msg of userMessages) {
          fullPrompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
        }
        fullPrompt += "\n";
      }
      
      // Add current question
      fullPrompt += `User's current question: ${message}\n\n`;
      
      // Add contextual data if provided
      if (contextualData) {
        fullPrompt += `Additional context: ${contextualData}\n\n`;
      }
      
      fullPrompt += "Assistant:";
      
      console.log('Sending message to Gemini directly with full prompt');
      const result = await this.model.generateContent(fullPrompt);
      const responseText = result.response.text();
      console.log('Received response from Gemini directly');
      
      // Add model's response to history
      this.chatHistory.push({
        role: 'model',
        content: responseText
      });
      
      return responseText;
    } catch (error) {
      console.error('Error sending message to Gemini directly:', error);
      const errorMessage = "I'm sorry, I encountered an error processing your request. Please try again.";
      
      this.chatHistory.push({
        role: 'model',
        content: errorMessage
      });
      
      return errorMessage;
    }
  }
  
  // Get the current chat history, filtering out system messages
  public getChatHistory(): Message[] {
    return this.chatHistory.filter(msg => !(msg as any)._isSystemMessage);
  }
  
  // Get initialization status
  public getInitializationStatus(): { initialized: boolean, error: string | null } {
    return {
      initialized: this.initialized,
      error: this.initializationError
    };
  }
}

// Create a singleton instance
const geminiService = new GeminiService();

export default geminiService; 