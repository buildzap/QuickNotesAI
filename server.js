// Load environment variables
require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');

// Use built-in fetch for Node.js 18+ or node-fetch for older versions
let fetch;
if (typeof globalThis.fetch === 'function') {
    fetch = globalThis.fetch;
} else {
    fetch = require('node-fetch');
}

// Initialize Resend if API key is available
let resend;
try {
    const { Resend } = require('resend');
    const resendApiKey = process.env.MAILERSEND_API_KEY; // Using the same env var
    console.log('[Email] Debug - RESEND_API_KEY:', resendApiKey ? 'Found' : 'Not found');
    console.log('[Email] Debug - RESEND_FROM_EMAIL:', process.env.MAILERSEND_FROM_EMAIL || 'Not found');
    
    if (resendApiKey) {
        resend = new Resend(resendApiKey);
        console.log('[Email] Resend configured successfully');
    } else {
        console.log('[Email] Resend API key not found, using mock mode');
        resend = null;
    }
} catch (error) {
    console.log('[Email] Resend not available, using mock mode');
    console.log('[Email] Error details:', error.message);
    resend = null;
}

const app = express();
const PORT = process.env.PORT || 5500;

// Enable CORS
app.use(cors());

// Serve static files from the root directory
app.use(express.static(__dirname));

// Test endpoint for email API
app.get('/api/test-email', async (req, res) => {
  console.log('[Test Email] GET request received at /api/test-email');
  
  try {
    if (resend) {
      console.log('[Test Email] Testing Resend API...');
      console.log('[Test Email] API Key:', process.env.MAILERSEND_API_KEY ? 'Present' : 'Missing');
      console.log('[Test Email] From Email:', process.env.MAILERSEND_FROM_EMAIL);
      
      const testResponse = await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: 'chandrumcspeaks@gmail.com',
        subject: 'Test Email from QuickNotesAI',
        html: '<h1>Test Email</h1><p>This is a test email to verify Resend is working.</p><p>Sent at: ' + new Date().toISOString() + '</p>',
      });
      
      console.log('[Test Email] Resend test response:', JSON.stringify(testResponse, null, 2));
      
      res.json({
        success: true,
        message: 'Test email sent via Resend',
        emailId: testResponse.id,
        provider: 'Resend',
        timestamp: new Date().toISOString(),
        response: testResponse
      });
    } else {
      res.json({
        success: false,
        message: 'Resend not configured',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('[Test Email] Error details:', error);
    console.error('[Test Email] Error message:', error.message);
    console.error('[Test Email] Error stack:', error.stack);
    
    res.json({
      success: false,
      message: 'Test email failed',
      error: error.message,
      errorDetails: error.toString(),
      timestamp: new Date().toISOString()
    });
  }
});

// Test endpoint for different email addresses
app.post('/api/test-email-to', express.json(), async (req, res) => {
  console.log('[Test Email To] POST request received at /api/test-email-to');
  const { email } = req.body;
  
  if (!email) {
    return res.json({
      success: false,
      message: 'Email address is required',
      timestamp: new Date().toISOString()
    });
  }
  
  try {
    if (resend) {
      console.log(`[Test Email To] Testing Resend API with email: ${email}`);
      
      const testResponse = await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: email,
        subject: 'Test Email from QuickNotesAI',
        html: `<h1>Test Email</h1><p>This is a test email sent to ${email}.</p><p>Sent at: ${new Date().toISOString()}</p>`,
      });
      
      console.log('[Test Email To] Resend test response:', JSON.stringify(testResponse, null, 2));
      
      res.json({
        success: true,
        message: `Test email sent to ${email} via Resend`,
        emailId: testResponse.id,
        provider: 'Resend',
        timestamp: new Date().toISOString(),
        response: testResponse
      });
    } else {
      res.json({
        success: false,
        message: 'Resend not configured',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('[Test Email To] Error details:', error);
    console.error('[Test Email To] Error message:', error.message);
    
    res.json({
      success: false,
      message: `Test email to ${email} failed`,
      error: error.message,
      errorDetails: error.toString(),
      timestamp: new Date().toISOString()
    });
  }
});

// Debug endpoint to test routing
app.get('/api/debug', (req, res) => {
  console.log('[Debug] GET request received at /api/debug');
  res.json({
    success: true,
    message: 'Debug endpoint is working',
    serverTime: new Date().toISOString(),
    routes: ['/api/test-email', '/api/send-email', '/api/smart-digest']
  });
});

// Test endpoint for Google Apps Script
app.get('/api/test-gas', async (req, res) => {
  try {
    console.log('[Test] Testing Google Apps Script connection...');
    
    const response = await fetch('https://script.google.com/macros/s/AKfycbyQ6OToO0N6eIQgLFydl4z4gzikyFW5H-mEAfXtdwxvKVsNTOl65npHd4w86IEntzfZ/exec', {
      method: 'GET'
    });
    
    console.log('[Test] Response status:', response.status);
    const data = await response.text();
    console.log('[Test] Response data:', data);
    
    res.json({
      status: response.status,
      data: data,
      headers: Object.fromEntries(response.headers.entries())
    });
  } catch (err) {
    console.error('[Test] Error:', err);
    res.status(500).json({ 
      error: 'Test failed', 
      details: err.message,
      stack: err.stack 
    });
  }
});

// Email API endpoint for fallback email sending
app.post('/api/send-email', express.json(), async (req, res) => {
  console.log('[Email API] POST request received at /api/send-email');
  console.log('[Email API] Request headers:', req.headers);
  console.log('[Email API] Request body:', req.body);
  
  try {
    const { email, summaryContent, summaryType, recipientName } = req.body;
    
    console.log('[Email API] Parsed data:', { email, summaryType, recipientName, contentLength: summaryContent?.length });
    
    // Validate input
    if (!email || !summaryContent) {
      console.log('[Email API] Validation failed - missing email or summary content');
      return res.status(400).json({ 
        success: false, 
        message: 'Email and summary content are required' 
      });
    }

    // Send real email if Resend is configured, otherwise use mock
    if (resend) {
      console.log(`[Email API] Sending real ${summaryType} summary to ${email} via Resend`);
      
      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">📊 Your ${summaryType.charAt(0).toUpperCase() + summaryType.slice(1)} Summary</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">QuickNotesAI Productivity Report</p>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0;">
            <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h2 style="color: #1e293b; margin-top: 0;">Hello ${recipientName || 'there'}! 👋</h2>
              <p style="color: #64748b; line-height: 1.6; font-size: 16px;">${summaryContent}</p>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="http://localhost:5500/dashboard.html" style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: 600;">View Full Dashboard</a>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 14px;">
              <p>This summary was generated by QuickNotesAI</p>
              <p>Keep up the great work! 🚀</p>
            </div>
          </div>
        </div>
      `;
      
      try {
        const resendResponse = await resend.emails.send({
          from: process.env.MAILERSEND_FROM_EMAIL || 'onboarding@resend.dev',
          to: email,
          subject: `📊 Your ${summaryType.charAt(0).toUpperCase() + summaryType.slice(1)} Summary - QuickNotesAI`,
          html: emailContent,
        });
        
        console.log('[Email API] Resend response:', resendResponse);
        
        const response = {
          success: true,
          message: `Summary sent successfully to ${email}`,
          emailId: resendResponse.id || `email-${Date.now()}`,
          provider: 'Resend'
        };
        
        console.log('[Email API] Sending response:', response);
        res.json(response);
        return;
        
      } catch (resendError) {
        console.error('[Email API] Resend error:', resendError);
        // Fall back to mock mode if Resend fails
        console.log('[Email API] Falling back to mock mode due to Resend error');
      }
    }
    
    // Mock email sending (fallback when Resend is not configured or fails)
    console.log(`[Email API] Mock sending ${summaryType} summary to ${email}`);
    console.log(`[Email API] Content preview: ${summaryContent.substring(0, 100)}...`);
    
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const response = {
      success: true,
      message: `Summary sent successfully to ${email}`,
      emailId: `mock-email-${Date.now()}`,
      provider: 'Mock (Resend not configured)'
    };
    
    console.log('[Email API] Sending response:', response);
    res.json(response);
    
  } catch (error) {
    console.error('[Email API] Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send email',
      error: error.message 
    });
  }
});

// Smart Digest API (Mock implementation for now)
app.post('/api/smart-digest', express.json(), async (req, res) => {
  try {
    console.log('[Smart Digest] Request received:', JSON.stringify(req.body, null, 2));
    
    const { action, data } = req.body;
    
    if (action === 'testConnection') {
      res.json({
        success: true,
        message: 'Connection successful',
        testResponse: 'Smart Digest is working! (Mock mode)'
      });
      return;
    }
    
    if (action === 'generateDigest') {
      console.log('[Smart Digest] Generating digest with data:', JSON.stringify(data, null, 2));
      
      const { digestType, tasks } = data;
      
      if (!tasks || !Array.isArray(tasks)) {
        console.error('[Smart Digest] Invalid tasks data:', tasks);
        return res.status(400).json({ error: 'Invalid tasks data' });
      }
      
      // Create a mock digest based on the tasks
      const taskCount = tasks.length;
      const timeFrame = digestType === 'daily' ? 'today' : 'this week';
      
      console.log('[Smart Digest] Processing', taskCount, 'tasks for', timeFrame);
      console.log('[Smart Digest] Raw tasks data:', JSON.stringify(tasks, null, 2));
      
      // Calculate scorecard statistics
      const now = new Date();
      let startDate, endDate;
      if (digestType === 'daily') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
      } else {
        // Start of week (Monday) - fix the calculation
        const dayOfWeek = now.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday=1, Sunday=0
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToMonday);
        startDate.setHours(0, 0, 0, 0); // Start of Monday
        endDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // End of today
      }
      
      console.log('[Smart Digest] Date analysis:', {
        now: now.toISOString(),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        digestType
      });
      
      // Enhance tasks with proper date handling first
      const enhancedTasks = tasks.map((task, index) => {
        try {
          // Handle Firestore timestamp conversion properly
          let createdDate, completedDate;
          
          // Handle createdAt (preserve original dates, don't generate fake ones)
          if (task.createdAt) {
            if (typeof task.createdAt.toDate === 'function') {
              createdDate = task.createdAt.toDate();
            } else if (task.createdAt.seconds) {
              createdDate = new Date(task.createdAt.seconds * 1000);
            } else {
              createdDate = new Date(task.createdAt);
            }
          } else {
            // Only generate a date if there's no createdAt at all
            // Use a date that's clearly not today to avoid false positives
            const now = new Date();
            createdDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
          }
          
          // Handle completedAt (this should be the actual completion date)
          if (task.completedAt && task.status === 'completed') {
            if (typeof task.completedAt.toDate === 'function') {
              completedDate = task.completedAt.toDate();
            } else if (task.completedAt.seconds) {
              completedDate = new Date(task.completedAt.seconds * 1000);
            } else {
              completedDate = new Date(task.completedAt);
            }
          } else {
            // Only set completion date if task is actually completed
            completedDate = null;
          }
          
          // Ensure created date is valid
          if (isNaN(createdDate.getTime())) {
            createdDate = new Date();
          }
          
          // Ensure completed date is valid (only if task is completed)
          if (completedDate && isNaN(completedDate.getTime())) {
            completedDate = null;
          }
          
          // Ensure created date is before completed date (only if both dates exist)
          if (completedDate && createdDate > completedDate) {
            createdDate = new Date(completedDate.getTime() - 24 * 60 * 60 * 1000);
          }
          
          return {
            ...task,
            createdAt: createdDate.toISOString(),
            completedAt: completedDate ? completedDate.toISOString() : null
          };
        } catch (error) {
          console.error(`[Smart Digest] Error processing task ${index}:`, error);
          // Return a safe fallback task
          const now = new Date();
          return {
            title: task.title || 'Unknown Task',
            priority: task.priority || 'Medium',
            createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
            completedAt: now.toISOString()
          };
        }
      });
      
      console.log('[Smart Digest] Enhanced tasks created:', enhancedTasks.length);
      console.log('[Smart Digest] Enhanced tasks data:', JSON.stringify(enhancedTasks.map(t => ({
        title: t.title,
        createdAt: t.createdAt,
        completedAt: t.completedAt
      })), null, 2));
      
      // Count tasks actually created and completed in the period
      let totalCreatedPeriod = 0;
      let totalCompletedPeriod = 0;
      enhancedTasks.forEach((task, index) => {
        try {
          const createdDate = new Date(task.createdAt);
          const isCreatedInPeriod = createdDate >= startDate && createdDate < endDate;
          
          if (isCreatedInPeriod) {
            totalCreatedPeriod++;
          }
          
          // Only count as completed if task has a completion date and is marked as completed
          if (task.completedAt && task.status === 'completed') {
            const completedDate = new Date(task.completedAt);
            const isCompletedInPeriod = completedDate >= startDate && completedDate < endDate;
            
            if (isCompletedInPeriod) {
              totalCompletedPeriod++;
            }
          }
        } catch (error) {
          console.error(`[Smart Digest] Error processing task ${index} dates for counting:`, error);
        }
      });
      const totalCreated = totalCreatedPeriod;
      const totalCompleted = totalCompletedPeriod;
      
      // Calculate completion rate with proper logic:
      // - If no tasks created today but tasks completed: 100% (completed all available tasks)
      // - If tasks created today: calculate as completed/created
      let completionRate;
      if (totalCreated === 0 && totalCompleted > 0) {
        completionRate = 100; // Completed all available tasks
      } else if (totalCreated > 0) {
        completionRate = Math.round((totalCompleted / totalCreated) * 100);
      } else {
        completionRate = 0; // No tasks created or completed
      }
      
      console.log('[Smart Digest] Final counts:', {
        totalCreated,
        totalCompleted,
        completionRate,
        completionRateLogic: totalCreated === 0 && totalCompleted > 0 ? '100% (completed all available)' : 
                             totalCreated > 0 ? `${totalCompleted}/${totalCreated} = ${completionRate}%` : '0% (no tasks)',
        taskCount: taskCount, // This is the original count from the request
        period: digestType === 'daily' ? 'Today' : 'This Week',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      
      // Create scorecard
      const scorecard = {
        totalCreated: totalCreated,
        totalCompleted: totalCompleted,
        completionRate: completionRate,
        timeFrame: digestType,
        period: digestType === 'daily' ? 'Today' : 'This Week'
      };
      
      console.log('[Smart Digest] Scorecard created:', scorecard);
      console.log('[Smart Digest] Date analysis - Start date:', startDate.toISOString());
      console.log('[Smart Digest] Tasks created today:', totalCreatedPeriod);
      console.log('[Smart Digest] Tasks completed today:', totalCompletedPeriod);
      console.log('[Smart Digest] SUMMARY - Tasks created today:', totalCreatedPeriod, 'Tasks completed today:', totalCompletedPeriod);
      
      let digest = '';
      if (taskCount === 0) {
        digest = `No completed tasks found for ${timeFrame}. Keep up the great work!`;
      } else {
        const taskList = enhancedTasks.map((task, index) => {
          const createdDate = new Date(task.createdAt).toLocaleDateString();
          const completedDate = new Date(task.completedAt).toLocaleDateString();
          return `${index + 1}. ${task.title} (Created: ${createdDate}, Completed: ${completedDate})`;
        }).join('\n');
        
        digest = `Great job completing ${taskCount} tasks ${timeFrame}! Here's what you accomplished:\n\n${taskList}\n\nYou're making excellent progress. Keep up the momentum!`;
      }
      
      res.json({
        success: true,
        digest: digest,
        taskCount: taskCount,
        digestType: digestType,
        generatedAt: new Date().toISOString(),
        scorecard: scorecard,
        tasks: enhancedTasks.map(t => ({ 
          title: t.title, 
          priority: t.priority || 'Medium',
          createdAt: t.createdAt,
          completedAt: t.completedAt,
          description: t.description || '',
          tags: t.tags || []
        })),
        note: 'This is a mock response. Set up Google Apps Script for AI-powered digests.'
      });
      return;
    }
    
    res.status(400).json({ error: 'Invalid action' });
    
  } catch (err) {
    console.error('[Smart Digest] Error:', err);
    res.status(500).json({ 
      error: 'Smart Digest error', 
      details: err.message
    });
  }
});

// Root route redirects to login
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// Handle 404s by serving login.html
app.use((req, res, next) => {
    // Don't handle API routes - let them return 404
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ 
            error: 'API endpoint not found',
            path: req.path 
        });
    }
    
    // If the request is for a file that exists, express.static will handle it
    // Only handle missing routes here
    if (!req.path.includes('.')) {
        res.sendFile(path.join(__dirname, 'login.html'));
    } else {
        next();
    }
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Server also accessible at http://127.0.0.1:${PORT}`);
    console.log('Static files served from:', __dirname);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please try a different port.`);
    } else {
        console.error('Server error:', err);
    }
    process.exit(1);
});
