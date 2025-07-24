/**
 * Google Apps Script for Smart Daily Digest
 * Handles OpenAI API calls securely without requiring Firebase Blaze plan
 */

// Configuration
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const GPT_MODEL = 'gpt-3.5-turbo';

/**
 * Handle GET requests (for testing)
 */
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      message: 'Smart Daily Digest API is running',
      status: 'active',
      timestamp: new Date().toISOString(),
      instructions: 'Use POST requests with action and data parameters'
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Main function to handle HTTP requests
 */
function doPost(e) {
  try {
    // Check if event and postData exist
    if (!e || !e.postData || !e.postData.contents) {
      console.error('Invalid request: missing postData');
      return ContentService
        .createTextOutput(JSON.stringify({ error: 'Invalid request format' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Parse the incoming request
    const requestData = JSON.parse(e.postData.contents);
    const { action, data } = requestData;
    
    // Validate request
    if (!action) {
      return ContentService
        .createTextOutput(JSON.stringify({ error: 'Action parameter is required' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Route to appropriate handler
    switch (action) {
      case 'generateDigest':
        return handleGenerateDigest(data);
      case 'testConnection':
        return handleTestConnection();
      default:
        return ContentService
          .createTextOutput(JSON.stringify({ error: 'Invalid action' }))
          .setMimeType(ContentService.MimeType.JSON);
    }
    
  } catch (error) {
    console.error('Error in doPost:', error);
    return ContentService
      .createTextOutput(JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle digest generation request
 */
function handleGenerateDigest(data) {
  try {
    // Validate required data
    if (!data || !data.tasks || !data.digestType) {
      return ContentService
        .createTextOutput(JSON.stringify({ error: 'Missing required data: tasks, digestType' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Get OpenAI API key from script properties
    const openaiApiKey = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return ContentService
        .createTextOutput(JSON.stringify({ error: 'OpenAI API key not configured' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Prepare tasks for OpenAI
    const taskList = data.tasks.map((task, index) => {
      const tags = task.tags && task.tags.length > 0 ? ` (Tags: ${task.tags.join(', ')})` : '';
      const priority = task.priority ? ` [${task.priority} priority]` : '';
      return `${index + 1}. ${task.title}${priority}${tags}`;
    }).join('\n');
    
    // Create prompt for OpenAI
    const timeFrame = data.digestType === 'daily' ? 'today' : 'this week';
    const prompt = `
You are a productivity coach analyzing a user's completed tasks. Generate an encouraging and insightful summary of their accomplishments.

Completed tasks for ${timeFrame}:
${taskList}

Please provide:
1. A friendly, encouraging summary (2-3 sentences) highlighting their achievements
2. A brief productivity insight or pattern you notice
3. A motivational closing statement

Keep the tone positive, professional, and encouraging. Focus on accomplishments and progress.
`;

    // Call OpenAI API
    const openaiResponse = callOpenAI(openaiApiKey, prompt);
    
    if (openaiResponse.error) {
      return ContentService
        .createTextOutput(JSON.stringify({ error: 'OpenAI API error', details: openaiResponse.error }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Return successful response
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        digest: openaiResponse.content,
        taskCount: data.tasks.length,
        digestType: data.digestType,
        generatedAt: new Date().toISOString(),
        tasks: data.tasks.map(t => ({ title: t.title, priority: t.priority }))
      }))
      .setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    console.error('Error in handleGenerateDigest:', error);
    return ContentService
      .createTextOutput(JSON.stringify({ error: 'Failed to generate digest', details: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Call OpenAI API
 */
function callOpenAI(apiKey, prompt) {
  try {
    const payload = {
      model: GPT_MODEL,
      messages: [
        {
          role: "system",
          content: "You are a supportive productivity coach who helps users reflect on their accomplishments. Be encouraging, insightful, and professional."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 300,
      temperature: 0.7
    };
    
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload)
    };
    
    const response = UrlFetchApp.fetch(OPENAI_API_URL, options);
    const responseData = JSON.parse(response.getContentText());
    
    if (responseData.error) {
      return { error: responseData.error.message || 'OpenAI API error' };
    }
    
    if (!responseData.choices || !responseData.choices[0]) {
      return { error: 'Invalid response from OpenAI' };
    }
    
    return { content: responseData.choices[0].message.content.trim() };
    
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    return { error: error.message || 'Failed to call OpenAI API' };
  }
}

/**
 * Test connection function
 */
function handleTestConnection() {
  try {
    const openaiApiKey = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return ContentService
        .createTextOutput(JSON.stringify({ error: 'OpenAI API key not configured' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Test with a simple prompt
    const testPrompt = "Say 'Hello, Smart Digest is working!' in one sentence.";
    const testResponse = callOpenAI(openaiApiKey, testPrompt);
    
    if (testResponse.error) {
      return ContentService
        .createTextOutput(JSON.stringify({ error: 'OpenAI connection failed', details: testResponse.error }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'Connection successful',
        testResponse: testResponse.content
      }))
      .setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    console.error('Error in test connection:', error);
    return ContentService
      .createTextOutput(JSON.stringify({ error: 'Test connection failed', details: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Create HTTP response (deprecated - using direct ContentService calls now)
 */
function createResponse(statusCode, data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Setup function - run this once to configure the script
 */
function setup() {
  // Set your OpenAI API key here
  const openaiApiKey = 'YOUR_OPENAI_API_KEY_HERE'; // Replace with your actual key
  
  if (openaiApiKey === 'YOUR_OPENAI_API_KEY_HERE') {
    console.log('Please replace YOUR_OPENAI_API_KEY_HERE with your actual OpenAI API key');
    return;
  }
  
  PropertiesService.getScriptProperties().setProperty('OPENAI_API_KEY', openaiApiKey);
  console.log('OpenAI API key configured successfully');
  
  // Deploy as web app
  console.log('To deploy as web app:');
  console.log('1. Click "Deploy" > "New deployment"');
  console.log('2. Choose "Web app"');
  console.log('3. Set "Execute as" to "Me"');
  console.log('4. Set "Who has access" to "Anyone"');
  console.log('5. Click "Deploy"');
  console.log('6. Copy the Web App URL');
}

/**
 * Test function for development
 */
function testDigestGeneration() {
  const testData = {
    action: 'generateDigest',
    data: {
      digestType: 'daily',
      tasks: [
        { title: 'Complete project proposal', priority: 'high', tags: ['work', 'important'] },
        { title: 'Call with client', priority: 'medium', tags: ['meeting'] },
        { title: 'Review code changes', priority: 'low', tags: ['development'] }
      ]
    }
  };
  
  const mockEvent = {
    postData: {
      contents: JSON.stringify(testData)
    }
  };
  
  const response = doPost(mockEvent);
  console.log('Test response:', response.getContent());
} 