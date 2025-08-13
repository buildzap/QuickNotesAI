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
let resendApiKey;
let fromEmail;

try {
    const { Resend } = require('resend');
         // Use the provided Resend API key - This key appears to be invalid
     // Please replace with a valid API key from your Resend dashboard
     resendApiKey = process.env.RESEND_API_KEY || 're_5dq8thU2_Jgn7sYmMuXUc5K5kZ1WbC9jU';
     fromEmail = 'admin@softlabsmind.in';
    
    console.log('[Email] Debug - RESEND_API_KEY:', resendApiKey ? 'Configured' : 'Not found');
    console.log('[Email] Debug - RESEND_FROM_EMAIL:', fromEmail);
    console.log('[Email] Debug - Resend package loaded successfully');
    
    if (resendApiKey) {
        resend = new Resend(resendApiKey);
        console.log('[Email] Resend configured successfully');
        console.log('[Email] Debug - Resend instance created:', !!resend);
    } else {
        console.log('[Email] Resend API key not found, using mock mode');
        resend = null;
    }
} catch (error) {
    console.log('[Email] Resend not available, using mock mode');
    console.log('[Email] Error details:', error.message);
    console.log('[Email] Error stack:', error.stack);
    resend = null;
}

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Serve static files from the root directory
app.use(express.static(__dirname));

// Test endpoint for email API
app.get('/api/test-email', async (req, res) => {
  console.log('[Test Email] Resend configuration:', {
    resendConfigured: !!resend,
    apiKey: resendApiKey ? 'Configured' : 'Missing',
    fromEmail: fromEmail,
    resendInstance: typeof resend,
    resendMethods: resend ? Object.keys(resend) : 'N/A'
  });
  
  try {
    if (resend) {
      console.log('[Test Email] Testing Resend API...');
      console.log('[Test Email] API Key: Configured');
              console.log('[Test Email] From Email:', fromEmail);
      
             console.log('[Test Email] About to send email via Resend...');
       console.log('[Test Email] From:', fromEmail);
       console.log('[Test Email] To: chandrumcspeaks@gmail.com');
       
              const testResponse = await resend.emails.send({
         from: fromEmail,
         to: 'chandrumcspeaks@gmail.com',
         subject: 'Test Email from QuickNotesAI',
         html: '<h1>Test Email</h1><p>This is a test email to verify Resend is working.</p><p>Sent at: ' + new Date().toISOString() + '</p>',
       });
       
       console.log('[Test Email] Resend test response:', JSON.stringify(testResponse, null, 2));
       
               // Check if the response has an error
        if (testResponse.error) {
          return res.json({
            success: false,
            message: `Resend API error: ${testResponse.error.message}`,
            error: testResponse.error.message,
            provider: 'Resend',
            timestamp: new Date().toISOString(),
            response: testResponse
          });
        }
        
        // Check if we have a successful response with data
        if (testResponse.data && testResponse.data.id) {
          res.json({
            success: true,
            message: 'Test email sent via Resend',
            emailId: testResponse.data.id,
            provider: 'Resend',
            timestamp: new Date().toISOString(),
            response: testResponse
          });
        } else {
          return res.json({
            success: false,
            message: 'Invalid response from Resend API',
            error: 'No email ID in response',
            provider: 'Resend',
            timestamp: new Date().toISOString(),
            response: testResponse
          });
        }
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
         from: fromEmail,
         to: email,
         subject: 'Test Email from QuickNotesAI',
         html: `<h1>Test Email</h1><p>This is a test email sent to ${email}.</p><p>Sent at: ${new Date().toISOString()}</p>`,
       });
       
       console.log('[Test Email To] Resend test response:', JSON.stringify(testResponse, null, 2));
       
               // Check if the response has an error
        if (testResponse.error) {
          return res.json({
            success: false,
            message: `Resend API error: ${testResponse.error.message}`,
            error: testResponse.error.message,
            provider: 'Resend',
            timestamp: new Date().toISOString(),
            response: testResponse
          });
        }
        
        // Check if we have a successful response with data
        if (testResponse.data && testResponse.data.id) {
          res.json({
            success: true,
            message: `Test email sent to ${email} via Resend`,
            emailId: testResponse.data.id,
            provider: 'Resend',
            timestamp: new Date().toISOString(),
            response: testResponse
          });
        } else {
          return res.json({
            success: false,
            message: 'Invalid response from Resend API',
            error: 'No email ID in response',
            provider: 'Resend',
            timestamp: new Date().toISOString(),
            response: testResponse
          });
        }
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

// Test Resend API key status
app.get('/api/test-resend-key', async (req, res) => {
  console.log('[Test Resend Key] Testing Resend API key status...');
  
  try {
    if (!resend) {
      return res.json({
        success: false,
        message: 'Resend not configured',
        status: 'not_configured',
        timestamp: new Date().toISOString()
      });
    }
    
    // Test the API key by trying to get account info
    const accountResponse = await resend.accounts.get();
    
    console.log('[Test Resend Key] Account response:', JSON.stringify(accountResponse, null, 2));
    
    if (accountResponse.error) {
      return res.json({
        success: false,
        message: `API key error: ${accountResponse.error.message || 'Unknown error'}`,
        status: 'invalid_key',
        error: accountResponse.error,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      success: true,
      message: 'API key is valid',
      status: 'valid',
      account: accountResponse.data,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Test Resend Key] Error:', error);
    res.json({
      success: false,
      message: `API key test failed: ${error.message}`,
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test domain verification
app.get('/api/test-domain', async (req, res) => {
  console.log('[Test Domain] Testing domain verification...');
  
  try {
    if (!resend) {
      return res.json({
        success: false,
        message: 'Resend not configured',
        status: 'not_configured',
        timestamp: new Date().toISOString()
      });
    }
    
         // Test sending a simple email to verify domain
     const testResponse = await resend.emails.send({
       from: fromEmail,
       to: 'chandrumcspeaks@gmail.com', // Send to account owner for testing
       subject: 'Domain Verification Test',
       html: '<h1>Domain Test</h1><p>Testing if domain is properly verified.</p><p>Current from email: ' + fromEmail + '</p>',
     });
    
    console.log('[Test Domain] Response:', JSON.stringify(testResponse, null, 2));
    
    if (testResponse.error) {
      return res.json({
        success: false,
        message: `Domain verification failed: ${testResponse.error.message || testResponse.error.error}`,
        status: 'domain_error',
        error: testResponse.error,
        fromEmail: fromEmail,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      success: true,
      message: 'Domain verification successful',
      status: 'verified',
      fromEmail: fromEmail,
      emailId: testResponse.data?.id,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Test Domain] Error:', error);
    res.json({
      success: false,
      message: `Domain test failed: ${error.message}`,
      status: 'error',
      error: error.message,
      fromEmail: fromEmail,
      timestamp: new Date().toISOString()
    });
  }
});

// Test enhanced email functionality with task data
app.post('/api/test-enhanced-email', express.json(), async (req, res) => {
  console.log('[Test Enhanced Email] Testing email with task data...');
  
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.json({
        success: false,
        message: 'Email address is required',
        timestamp: new Date().toISOString()
      });
    }
    
    // Sample task data for testing
    const sampleTasks = [
      {
        title: 'Complete project documentation',
        status: 'completed',
        priority: 'High',
        category: 'Work',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        completedAt: new Date().toISOString()
      },
      {
        title: 'Review code changes',
        status: 'completed',
        priority: 'Medium',
        category: 'Development',
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        completedAt: new Date().toISOString()
      },
      {
        title: 'Plan next sprint',
        status: 'pending',
        priority: 'High',
        category: 'Planning',
        createdAt: new Date().toISOString()
      },
      {
        title: 'Update dependencies',
        status: 'pending',
        priority: 'Low',
        category: 'Maintenance',
        createdAt: new Date().toISOString()
      }
    ];
    
    const summaryContent = 'This is a test email with enhanced task details. You can see your task statistics and recent tasks below.';
    const summaryType = 'daily';
    const recipientName = email.split('@')[0];
    
    // Generate task details HTML
    const generateTaskDetailsHTML = (tasks) => {
      if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
        return `
          <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin-top: 20px;">
            <h3 style="color: #1e293b; margin-top: 0; font-size: 18px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
              📋 Task Details
            </h3>
            <div style="text-align: center; padding: 20px; color: #64748b;">
              <p>No tasks available for this period.</p>
            </div>
          </div>
        `;
      }
      
      // Calculate task statistics
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(task => task.status === 'completed').length;
      const pendingTasks = totalTasks - completedTasks;
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      
      // Generate task list HTML
      const taskListHTML = tasks.slice(0, 10).map((task, index) => {
        const statusColor = task.status === 'completed' ? '#10b981' : '#f59e0b';
        const statusIcon = task.status === 'completed' ? '✅' : '⏳';
        const priorityColor = task.priority === 'High' ? '#ef4444' : task.priority === 'Medium' ? '#f59e0b' : '#10b981';
        
        return `
          <div style="padding: 12px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; gap: 12px;">
            <div style="color: ${statusColor}; font-size: 16px;">${statusIcon}</div>
            <div style="flex: 1;">
              <div style="font-weight: 600; color: #1e293b; margin-bottom: 4px;">${task.title || 'Untitled Task'}</div>
              <div style="font-size: 12px; color: #64748b;">
                <span style="background: ${priorityColor}; color: white; padding: 2px 6px; border-radius: 4px; margin-right: 8px;">
                  ${task.priority || 'Medium'}
                </span>
                ${task.category ? `<span style="background: #e2e8f0; color: #64748b; padding: 2px 6px; border-radius: 4px;">${task.category}</span>` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('');
      
      return `
        <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin-top: 20px;">
          <h3 style="color: #1e293b; margin-top: 0; font-size: 18px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
            📋 Task Details
          </h3>
          
          <!-- Task Summary -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 20px;">
            <div style="background: white; padding: 15px; border-radius: 6px; text-align: center; border-left: 4px solid #6366f1;">
              <div style="font-size: 24px; font-weight: bold; color: #6366f1;">${totalTasks}</div>
              <div style="font-size: 12px; color: #64748b;">Total Tasks</div>
            </div>
            <div style="background: white; padding: 15px; border-radius: 6px; text-align: center; border-left: 4px solid #10b981;">
              <div style="font-size: 24px; font-weight: bold; color: #10b981;">${completedTasks}</div>
              <div style="font-size: 12px; color: #64748b;">Completed</div>
            </div>
            <div style="background: white; padding: 15px; border-radius: 6px; text-align: center; border-left: 4px solid #f59e0b;">
              <div style="font-size: 24px; font-weight: bold; color: #f59e0b;">${pendingTasks}</div>
              <div style="font-size: 12px; color: #64748b;">Pending</div>
            </div>
            <div style="background: white; padding: 15px; border-radius: 6px; text-align: center; border-left: 4px solid #8b5cf6;">
              <div style="font-size: 24px; font-weight: bold; color: #8b5cf6;">${completionRate}%</div>
              <div style="font-size: 12px; color: #64748b;">Success Rate</div>
            </div>
          </div>
          
          <!-- Task List -->
          <div style="background: white; padding: 20px; border-radius: 8px;">
            <h4 style="color: #1e293b; margin-top: 0; font-size: 16px; margin-bottom: 15px;">
              📝 Recent Tasks (${tasks.length > 10 ? `Showing first 10 of ${tasks.length}` : 'All tasks'})
            </h4>
            <div style="max-height: 300px; overflow-y: auto;">
              ${taskListHTML}
            </div>
          </div>
        </div>
      `;
    };
    
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">📊 Test Enhanced Email</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">QuickNotesAI Productivity Report</p>
          <p style="margin: 5px 0 0 0; opacity: 0.8; font-size: 14px;">Generated on ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0;">
          <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #1e293b; margin-top: 0;">Hello ${recipientName}! 👋</h2>
            <p style="color: #64748b; line-height: 1.6; font-size: 16px; margin-bottom: 20px;">${summaryContent}</p>
            
            ${generateTaskDetailsHTML(sampleTasks)}
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="http://localhost:5500/dashboard.html" style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: 600;">View Full Dashboard</a>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 14px;">
            <p>This is a test email with enhanced task details</p>
            <p>Keep up the great work! 🚀</p>
          </div>
        </div>
      </div>
    `;
    
    if (resend) {
      console.log(`[Test Enhanced Email] Sending test email to ${email} via Resend`);
      
      const resendResponse = await resend.emails.send({
        from: fromEmail,
        to: email,
        subject: '🧪 Test Enhanced Email - QuickNotesAI',
        html: emailContent,
      });
      
      console.log('[Test Enhanced Email] Resend response:', JSON.stringify(resendResponse, null, 2));
      
      if (resendResponse.error) {
        return res.json({
          success: false,
          message: `Resend API error: ${resendResponse.error.message || resendResponse.error.error}`,
          error: resendResponse.error,
          provider: 'Resend',
          timestamp: new Date().toISOString(),
          response: resendResponse
        });
      }
      
      if (resendResponse.data && resendResponse.data.id) {
        res.json({
          success: true,
          message: `Test enhanced email sent to ${email} via Resend`,
          emailId: resendResponse.data.id,
          provider: 'Resend',
          timestamp: new Date().toISOString(),
          response: resendResponse
        });
      } else {
        return res.json({
          success: false,
          message: 'Invalid response from Resend API',
          error: 'No email ID in response',
          provider: 'Resend',
          timestamp: new Date().toISOString(),
          response: resendResponse
        });
      }
    } else {
      res.json({
        success: false,
        message: 'Resend not configured',
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('[Test Enhanced Email] Error:', error);
    res.json({
      success: false,
      message: `Test enhanced email failed: ${error.message}`,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
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

// Send email endpoint
app.post('/api/send-email', async (req, res) => {
  console.log('[Email API] Received email request');
  
  try {
    const { email, summaryContent, summaryType, recipientName, tasks } = req.body;
    
    if (!email || !summaryContent || !summaryType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: email, summaryContent, summaryType'
      });
    }

    console.log('[Email API] Parsed data:', {
      email,
      summaryType,
      recipientName: recipientName || 'User',
      contentLength: summaryContent.length
    });

    // Generate task details HTML (similar to server.js)
    const generateTaskDetailsHTML = (tasks) => {
      if (!tasks || tasks.length === 0) {
        return `
          <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 25px;">
            <div style="font-size: 48px; margin-bottom: 15px;">📝</div>
            <h4 style="color: #92400e; margin-top: 0; font-size: 20px; font-weight: 600; margin-bottom: 10px;">No Tasks Available</h4>
            <p style="color: #b45309; font-size: 16px; margin-bottom: 0;">Start adding tasks to see your productivity insights!</p>
          </div>
        `;
      }

      // Calculate task statistics
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(task => task.status === 'completed').length;
      const pendingTasks = totalTasks - completedTasks;
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Generate performance feedback
      let performanceFeedback = '';
      if (completionRate >= 80) {
        performanceFeedback = '🎉 Outstanding performance! You\'re crushing your goals!';
      } else if (completionRate >= 60) {
        performanceFeedback = '🚀 Great progress! Keep up the momentum!';
      } else if (completionRate >= 40) {
        performanceFeedback = '💪 Good effort! Focus on completing more tasks.';
      } else {
        performanceFeedback = '📈 Room for improvement. Let\'s boost your productivity!';
      }

      // Generate task list HTML
      const taskListHTML = tasks.slice(0, 5).map((task, index) => {
        const statusColor = task.status === 'completed' ? '#10b981' : '#f59e0b';
        const statusIcon = task.status === 'completed' ? '✅' : '⏳';
        const priorityColor = task.priority === 'High' ? '#ef4444' : task.priority === 'Medium' ? '#f59e0b' : '#10b981';
        const priorityIcon = task.priority === 'High' ? '🔥' : task.priority === 'Medium' ? '⚡' : '🌱';
        const categoryIcon = task.category ? (task.category.toLowerCase().includes('work') ? '💼' :
                                              task.category.toLowerCase().includes('personal') ? '👤' :
                                              task.category.toLowerCase().includes('health') ? '🏃‍♂️' :
                                              task.category.toLowerCase().includes('learning') ? '📚' : '📋') : '📋';

        // Enhanced task details
        const isTeamTask = task.teamAssignment && task.teamAssignment.assignedToTeam;
        const teamName = isTeamTask ? (task.teamAssignment.teamName || 'Unknown Team') : '';
        const memberName = isTeamTask ? (task.teamAssignment.memberName || 'Unassigned') : '';

        // Check for recurring task
        let isRecurring = false;
        let recurringType = '';
        if (task.recurring) {
          if (typeof task.recurring === 'string' && task.recurring !== 'none') {
            isRecurring = true;
            recurringType = task.recurring;
          } else if (typeof task.recurring === 'boolean' && task.recurring === true) {
            isRecurring = true;
            recurringType = 'recurring';
          } else if (typeof task.recurring === 'object' && task.recurring.recurring === true) {
            isRecurring = true;
            recurringType = task.recurring.recurrence?.type || 'recurring';
          }
        }

        // Format recurring text
        const formatRecurringText = (type) => {
          switch (type) {
            case 'daily': return '🔄 Daily';
            case 'weekly': return '🔄 Weekly';
            case 'monthly': return '🔄 Monthly';
            case 'yearly': return '🔄 Yearly';
            case 'custom':
              if (task.recurring && typeof task.recurring === 'object' && task.recurring.recurrence) {
                const interval = task.recurring.recurrence.interval || 7;
                return `🔄 Every ${interval} Days`;
              }
              return '🔄 Custom';
            case 'recurring': return '🔄 Recurring';
            default: return `🔄 ${type.charAt(0).toUpperCase() + type.slice(1)}`;
          }
        };

        // Format due date
        const formatDueDate = (dueDate) => {
          if (!dueDate) return '';
          try {
            const date = new Date(dueDate);
            if (isNaN(date.getTime())) return '';
            return date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
            });
          } catch (e) {
            return dueDate;
          }
        };

        return `
          <div style="padding: 20px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: flex-start; gap: 15px; transition: all 0.3s ease; background: ${task.status === 'completed' ? '#f0fdf4' : '#fefce8'}; border-radius: 12px; margin: 6px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
            <div style="color: ${statusColor}; font-size: 24px; min-width: 35px; text-align: center; margin-top: 2px;">${statusIcon}</div>
            <div style="flex: 1;">
              <div style="font-weight: 600; color: #1e293b; margin-bottom: 8px; font-size: 16px; line-height: 1.4;">
                ${task.title || 'Untitled Task'}
                ${task.status === 'completed' ? '<span style="color: #10b981; font-size: 12px; margin-left: 8px; background: #d1fae5; padding: 2px 6px; border-radius: 4px;">✓ Completed</span>' : ''}
              </div>

              <!-- Primary badges row -->
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px;">
                <span style="background: ${priorityColor}; color: white; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; display: flex; align-items: center; gap: 4px;">
                  ${priorityIcon} ${task.priority || 'Medium'}
                </span>
                ${task.category ? `<span style="background: #e2e8f0; color: #64748b; padding: 4px 10px; border-radius: 6px; font-size: 11px; display: flex; align-items: center; gap: 4px;">${categoryIcon} ${task.category}</span>` : ''}
                ${task.dueDate ? `<span style="background: #fef3c7; color: #92400e; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 500;">📅 Due: ${formatDueDate(task.dueDate)}</span>` : ''}
              </div>

              <!-- Secondary details row -->
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px;">
                ${isTeamTask ? `<span style="background: #dbeafe; color: #1e40af; padding: 4px 10px; border-radius: 6px; font-size: 11px; display: flex; align-items: center; gap: 4px;">👥 ${teamName} • ${memberName}</span>` : ''}
                ${isRecurring ? `<span style="background: #fef3c7; color: #92400e; padding: 4px 10px; border-radius: 6px; font-size: 11px; display: flex; align-items: center; gap: 4px;">${formatRecurringText(recurringType)}</span>` : ''}
                ${task.inputMethod ? `<span style="background: #f3e8ff; color: #7c3aed; padding: 4px 10px; border-radius: 6px; font-size: 11px; display: flex; align-items: center; gap: 4px;">📝 ${task.inputMethod}</span>` : ''}
              </div>

              ${task.description ? `<div style="color: #64748b; font-size: 14px; margin-top: 8px; line-height: 1.5; font-style: italic; background: #f8fafc; padding: 10px; border-radius: 6px; border-left: 3px solid #e2e8f0;">"${task.description}"</div>` : ''}
            </div>
          </div>
        `;
      }).join('');

      return `
        <div style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); padding: 30px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #e2e8f0;">
          <div style="background: white; padding: 25px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <h3 style="color: #1e293b; margin-top: 0; font-size: 20px; font-weight: 600; margin-bottom: 20px; text-align: center;">
              📊 Task Details Overview
            </h3>
            
            <!-- Task Statistics -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 15px; margin-bottom: 25px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; text-align: center; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                <div style="font-size: 28px; font-weight: 700; margin-bottom: 5px;">${totalTasks}</div>
                <div style="font-size: 12px; opacity: 0.9;">Total Tasks</div>
              </div>
              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 10px; text-align: center; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                <div style="font-size: 28px; font-weight: 700; margin-bottom: 5px;">${completedTasks}</div>
                <div style="font-size: 12px; opacity: 0.9;">Completed</div>
              </div>
              <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 20px; border-radius: 10px; text-align: center; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                <div style="font-size: 28px; font-weight: 700; margin-bottom: 5px;">${pendingTasks}</div>
                <div style="font-size: 12px; opacity: 0.9;">Pending</div>
              </div>
              <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 20px; border-radius: 10px; text-align: center; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                <div style="font-size: 28px; font-weight: 700; margin-bottom: 5px;">${completionRate}%</div>
                <div style="font-size: 12px; opacity: 0.9;">Success Rate</div>
              </div>
            </div>
            
            <!-- Performance Feedback -->
            <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 15px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
              <p style="color: #92400e; font-size: 16px; font-weight: 600; margin: 0;">${performanceFeedback}</p>
            </div>
            
            <!-- Recent Tasks -->
            <h4 style="color: #1e293b; margin-top: 0; font-size: 18px; font-weight: 600; margin-bottom: 20px; text-align: center;">
              📝 Recent Tasks (${tasks.length > 5 ? `Showing first 5 of ${tasks.length} tasks` : `All ${tasks.length} tasks`})
            </h4>
            <div style="max-height: 400px; overflow-y: auto; border-radius: 8px; border: 1px solid #e2e8f0;">
              ${taskListHTML}
            </div>
            ${tasks.length > 5 ? `
              <div style="text-align: center; margin-top: 15px; padding: 10px; background: #f1f5f9; border-radius: 8px; color: #64748b; font-size: 14px;">
                💡 View all ${tasks.length} tasks in your dashboard for complete details
              </div>
            ` : ''}
          </div>
        </div>
      `;
    };

    // Enhanced email content with task details
    const emailContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; padding: 20px; background: #f8fafc;">
        <!-- Header Section -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; border-radius: 15px 15px 0 0; text-align: center; position: relative; overflow: hidden;">
          <div style="position: absolute; top: -50px; right: -50px; width: 100px; height: 100px; background: rgba(255,255,255,0.1); border-radius: 50%;"></div>
          <div style="position: absolute; bottom: -30px; left: -30px; width: 60px; height: 60px; background: rgba(255,255,255,0.1); border-radius: 50%;"></div>
          <h1 style="margin: 0; font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">🚀 Your ${summaryType.charAt(0).toUpperCase() + summaryType.slice(1)} Productivity Report</h1>
          <p style="margin: 15px 0 0 0; opacity: 0.95; font-size: 18px; font-weight: 500;">QuickNotesAI - Smart Task Management</p>
          <p style="margin: 8px 0 0 0; opacity: 0.8; font-size: 14px;">📅 Generated on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        
        <!-- Main Content -->
        <div style="background: white; padding: 35px; border-radius: 0 0 15px 15px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
          
          <!-- Greeting Section -->
          <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 25px; border-radius: 12px; margin-bottom: 25px; text-align: center;">
            <h2 style="margin: 0; font-size: 22px; font-weight: 600;">Hello ${recipientName || 'there'}! 👋</h2>
            <p style="margin: 10px 0 0 0; opacity: 0.95; font-size: 16px; line-height: 1.5;">Here's your comprehensive ${summaryType} productivity overview</p>
          </div>
          
          <!-- Summary Content -->
          <div style="background: #f8fafc; padding: 25px; border-radius: 10px; margin-bottom: 25px; border-left: 4px solid #667eea;">
            <h3 style="color: #1e293b; margin-top: 0; font-size: 18px; font-weight: 600; margin-bottom: 15px;">📋 Executive Summary</h3>
            <p style="color: #475569; line-height: 1.7; font-size: 16px; margin-bottom: 0;">${summaryContent}</p>
          </div>
          
          <!-- Productivity Insights -->
          <div style="background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); padding: 25px; border-radius: 12px; margin-bottom: 25px;">
            <h3 style="color: #1e293b; margin-top: 0; font-size: 18px; font-weight: 600; margin-bottom: 15px; text-align: center;">💡 Productivity Insights</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
              <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <div style="font-size: 24px; margin-bottom: 8px;">🎯</div>
                <div style="font-weight: 600; color: #1e293b; margin-bottom: 5px;">Focus Areas</div>
                <div style="font-size: 14px; color: #64748b;">Prioritize high-impact tasks</div>
              </div>
              <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <div style="font-size: 24px; margin-bottom: 8px;">⚡</div>
                <div style="font-weight: 600; color: #1e293b; margin-bottom: 5px;">Efficiency Tips</div>
                <div style="font-size: 14px; color: #64748b;">Batch similar tasks together</div>
              </div>
              <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <div style="font-size: 24px; margin-bottom: 8px;">📈</div>
                <div style="font-weight: 600; color: #1e293b; margin-bottom: 5px;">Growth Metrics</div>
                <div style="font-size: 14px; color: #64748b;">Track progress over time</div>
              </div>
            </div>
          </div>
          
          <!-- Task Details Section -->
          ${generateTaskDetailsHTML(tasks)}
          
          <!-- Action Section -->
          <div style="text-align: center; margin-top: 35px; padding: 25px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px;">
            <h3 style="color: white; margin-top: 0; font-size: 20px; font-weight: 600; margin-bottom: 15px;">Ready to Boost Your Productivity?</h3>
            <p style="color: rgba(255,255,255,0.9); margin-bottom: 20px; font-size: 16px;">Access your full dashboard for detailed analytics and task management</p>
            <a href="http://localhost:5500/dashboard.html" style="background: white; color: #667eea; padding: 15px 35px; text-decoration: none; border-radius: 30px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); transition: all 0.3s ease;">🚀 View Full Dashboard</a>
          </div>
          
          <!-- Footer -->
          <div style="margin-top: 35px; padding-top: 25px; border-top: 2px solid #e2e8f0; text-align: center;">
            <div style="background: #f1f5f9; padding: 20px; border-radius: 10px;">
              <p style="color: #64748b; font-size: 14px; margin-bottom: 10px; font-weight: 500;">💼 Powered by QuickNotesAI - Your Smart Productivity Companion</p>
              <div style="display: flex; justify-content: center; gap: 20px; margin-top: 15px;">
                <div style="text-align: center;">
                  <div style="font-size: 20px; margin-bottom: 5px;">📊</div>
                  <div style="font-size: 12px; color: #94a3b8;">Analytics</div>
                </div>
                <div style="text-align: center;">
                  <div style="font-size: 20px; margin-bottom: 5px;">🎯</div>
                  <div style="font-size: 12px; color: #94a3b8;">Task Management</div>
                </div>
                <div style="text-align: center;">
                  <div style="font-size: 20px; margin-bottom: 5px;">📈</div>
                  <div style="font-size: 12px; color: #94a3b8;">Progress Tracking</div>
                </div>
              </div>
              <p style="color: #94a3b8; font-size: 12px; margin-top: 15px; margin-bottom: 0;">Keep up the amazing work! Your productivity journey continues... 🌟</p>
            </div>
          </div>
          
        </div>
      </div>
    `;
   
    try {
      console.log('[Email API] Sending real ${summaryType} summary to ${email} via Resend');
      
      // Check if we're trying to send to a different email than the account owner
      const isAccountOwnerEmail = email === 'chandrumcspeaks@gmail.com';
      
      if (!isAccountOwnerEmail) {
        console.log('[Email API] Warning: Attempting to send to non-account owner email');
        console.log('[Email API] Account owner email: chandrumcspeaks@gmail.com');
        console.log('[Email API] Requested email: ${email}');
      }
      
      console.log('[Email API] Sending email with details:', {
        from: fromEmail,
        to: email,
        subject: `📊 Your ${summaryType.charAt(0).toUpperCase() + summaryType.slice(1)} Summary - QuickNotesAI`,
        contentLength: emailContent.length,
        hasTasks: !!tasks
      });
      
      // Retry mechanism for network issues
      let resendResponse;
      let retryCount = 0;
      const maxRetries = 2;

      while (retryCount <= maxRetries) {
        try {
          resendResponse = await resend.emails.send({
            from: fromEmail,
            to: email,
            subject: `📊 Your ${summaryType.charAt(0).toUpperCase() + summaryType.slice(1)} Summary - QuickNotesAI`,
            html: emailContent,
          });

          // If we get here, the request was successful
          break;
        } catch (retryError) {
          retryCount++;
          console.log(`[Email API] Attempt ${retryCount} failed:`, retryError.message);

          if (retryCount > maxRetries) {
            throw retryError;
          }

          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }

      console.log('[Email API] Resend response:', JSON.stringify(resendResponse, null, 2));
      console.log('[Email API] Resend response type:', typeof resendResponse);
      console.log('[Email API] Resend response keys:', Object.keys(resendResponse));

      // Check if the response has an error
      if (resendResponse.error) {
        console.log('[Email API] Resend returned error:', resendResponse.error);
        
        // Handle specific error types
        if (resendResponse.error.statusCode === 403) {
          return res.json({
            success: false,
            message: 'Email sending failed: Resend free tier restriction. You can only send emails to your account owner email address.',
            error: resendResponse.error.message,
            provider: 'Resend'
          });
        }
        
        if (resendResponse.error.statusCode === 422) {
          let errorMessage = 'Email sending failed: Validation error';
          if (resendResponse.error.message) {
            if (resendResponse.error.message.includes('from')) {
              errorMessage = 'Email sending failed: Invalid sender email address';
            } else if (resendResponse.error.message.includes('to')) {
              errorMessage = 'Email sending failed: Invalid recipient email address';
            } else if (resendResponse.error.message.includes('subject')) {
              errorMessage = 'Email sending failed: Invalid subject line';
            } else if (resendResponse.error.message.includes('html')) {
              errorMessage = 'Email sending failed: Invalid email content';
            }
          }
          return res.json({
            success: false,
            message: errorMessage,
            error: resendResponse.error.message,
            provider: 'Resend'
          });
        }
        
        return res.json({
          success: false,
          message: `Email sending failed: ${resendResponse.error.message || 'Unknown Resend API error'}`,
          error: resendResponse.error.message || 'Unknown error',
          provider: 'Resend'
        });
      }
      
      // Check if we have a successful response with data
      if (resendResponse.data && resendResponse.data.id) {
        console.log('[Email API] Sending success response');
        res.json({
          success: true,
          message: `Summary sent successfully to ${email}`,
          emailId: resendResponse.data.id,
          provider: 'Resend'
        });
      } else {
        console.log('[Email API] Unexpected response format:', resendResponse);
        res.json({
          success: false,
          message: 'Email sending failed: Unexpected response from email service',
          error: 'Invalid response format',
          provider: 'Resend'
        });
      }
      
    } catch (error) {
      console.error('[Email API] Error sending email:', error);
      
      // Handle specific network errors
      const errorMessage = error.message || 'Unknown error';
      if (errorMessage.includes('Unable to fetch data') || 
          errorMessage.includes('request could not be resolved') ||
          errorMessage.includes('network') ||
          errorMessage.includes('timeout')) {
        return res.json({
          success: false,
          message: 'Email sending failed: Network connectivity issue. Please check your internet connection and try again.',
          error: errorMessage,
          provider: 'Resend'
        });
      }
      
      res.json({
        success: false,
        message: `Email sending failed: ${errorMessage}`,
        error: errorMessage,
        provider: 'Resend'
      });
    }
    
  } catch (error) {
    console.error('[Email API] Request parsing error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Send Slack message endpoint
app.post('/api/send-slack', async (req, res) => {
  console.log('[Slack API] Received Slack request');
  
  try {
    const { webhookUrl, summaryContent, summaryType, tasks } = req.body;
    
    if (!webhookUrl || !summaryContent || !summaryType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: webhookUrl, summaryContent, summaryType'
      });
    }

    // Validate webhook URL
    if (!webhookUrl.startsWith('https://hooks.slack.com/')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Slack webhook URL format'
      });
    }

    console.log('[Slack API] Sending message to Slack webhook');

    // Generate detailed task information for Slack
    const generateSlackTaskDetails = (tasks) => {
      if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
        return [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*📋 Task Details*\nNo tasks available for this period."
            }
          }
        ];
      }

      // Calculate task statistics
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(task => task.status === 'completed').length;
      const pendingTasks = totalTasks - completedTasks;
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Generate performance feedback
      let performanceFeedback = '';
      if (completionRate >= 80) {
        performanceFeedback = '🎉 Outstanding performance! You\'re crushing your goals!';
      } else if (completionRate >= 60) {
        performanceFeedback = '🚀 Great progress! Keep up the momentum!';
      } else if (completionRate >= 40) {
        performanceFeedback = '💪 Good effort! Focus on completing more tasks.';
      } else {
        performanceFeedback = '📈 Room for improvement. Let\'s boost your productivity!';
      }

      // Helper functions
      const formatRecurringText = (type) => {
        switch (type) {
          case 'daily': return '🔄 Daily';
          case 'weekly': return '🔄 Weekly';
          case 'monthly': return '🔄 Monthly';
          case 'yearly': return '🔄 Yearly';
          case 'custom':
            if (task.recurring && typeof task.recurring === 'object' && task.recurring.recurrence) {
              const interval = task.recurring.recurrence.interval || 7;
              return `🔄 Every ${interval} Days`;
            }
            return '🔄 Custom';
          case 'recurring': return '🔄 Recurring';
          default: return `🔄 ${type.charAt(0).toUpperCase() + type.slice(1)}`;
        }
      };

      const formatDueDate = (dueDate) => {
        if (!dueDate) return '';
        try {
          const date = new Date(dueDate);
          if (isNaN(date.getTime())) return '';
          return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
          });
        } catch (e) {
          return dueDate;
        }
      };

      const blocks = [];

      // Task Statistics Section
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*📊 Task Details Overview*"
        }
      });

      // Statistics in a table format
      const statsText = `*Task Statistics:*\n` +
        `• Total Tasks: ${totalTasks}\n` +
        `• Completed: ${completedTasks}\n` +
        `• Pending: ${pendingTasks}\n` +
        `• Success Rate: ${completionRate}%`;

      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: statsText
        }
      });

      // Performance Feedback
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${performanceFeedback}*`
        }
      });

      // Recent Tasks Section
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*📝 Recent Tasks* (${tasks.length > 5 ? `Showing first 5 of ${tasks.length}` : `All ${tasks.length} tasks`})`
        }
      });

      // Generate task list (up to 5 tasks)
      const recentTasks = tasks.slice(0, 5);
      recentTasks.forEach((task, index) => {
        const statusIcon = task.status === 'completed' ? '✅' : '⏳';
        const priorityIcon = task.priority === 'High' ? '🔥' : task.priority === 'Medium' ? '⚡' : '🌱';
        const categoryIcon = task.category ? (task.category.toLowerCase().includes('work') ? '💼' :
                                              task.category.toLowerCase().includes('personal') ? '👤' :
                                              task.category.toLowerCase().includes('health') ? '🏃‍♂️' :
                                              task.category.toLowerCase().includes('learning') ? '📚' : '📋') : '📋';

        // Enhanced task details
        const isTeamTask = task.teamAssignment && task.teamAssignment.assignedToTeam;
        const teamName = isTeamTask ? (task.teamAssignment.teamName || 'Unknown Team') : '';
        const memberName = isTeamTask ? (task.teamAssignment.memberName || 'Unassigned') : '';

        // Check for recurring task
        let isRecurring = false;
        let recurringType = '';
        if (task.recurring) {
          if (typeof task.recurring === 'string' && task.recurring !== 'none') {
            isRecurring = true;
            recurringType = task.recurring;
          } else if (typeof task.recurring === 'boolean' && task.recurring === true) {
            isRecurring = true;
            recurringType = 'recurring';
          } else if (typeof task.recurring === 'object' && task.recurring.recurring === true) {
            isRecurring = true;
            recurringType = task.recurring.recurrence?.type || 'recurring';
          }
        }

        let taskText = `${statusIcon} *${task.title || 'Untitled Task'}*\n`;
        taskText += `• Priority: ${priorityIcon} ${task.priority || 'Medium'}\n`;
        
        if (task.category) {
          taskText += `• Category: ${categoryIcon} ${task.category}\n`;
        }
        
        if (task.dueDate) {
          taskText += `• Due Date: 📅 ${formatDueDate(task.dueDate)}\n`;
        }
        
        if (isTeamTask) {
          taskText += `• Team: 👥 ${teamName} • ${memberName}\n`;
        }
        
        if (isRecurring) {
          taskText += `• Recurring: ${formatRecurringText(recurringType)}\n`;
        }
        
        if (task.inputMethod) {
          taskText += `• Input Method: 📝 ${task.inputMethod}\n`;
        }
        
        if (task.description) {
          taskText += `• Description: "${task.description}"\n`;
        }

        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: taskText
          }
        });

        // Add divider between tasks (except for the last one)
        if (index < recentTasks.length - 1) {
          blocks.push({
            type: "divider"
          });
        }
      });

      // Add note if there are more tasks
      if (tasks.length > 5) {
        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `💡 View all ${tasks.length} tasks in your dashboard for complete details`
          }
        });
      }

      return blocks;
    };

    // Format Slack message
    const typeLabel = summaryType === 'daily' ? 'Daily Digest' : 'Weekly Recap';
    const emoji = summaryType === 'daily' ? '📊' : '📈';
    
    const slackMessage = {
      text: `${emoji} *${typeLabel} - QuickNotes AI*`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `${emoji} ${typeLabel} - QuickNotes AI`,
            emoji: true
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: summaryContent
          }
        },
        {
          type: "divider"
        },
        ...generateSlackTaskDetails(tasks),
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`
            }
          ]
        }
      ]
    };

    // Send to Slack webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(slackMessage)
    });

    if (response.ok) {
      console.log('[Slack API] Message sent successfully');
      res.json({
        success: true,
        message: 'Summary sent successfully to Slack!',
        provider: 'Slack'
      });
    } else {
      const errorText = await response.text();
      console.error('[Slack API] Slack error:', response.status, errorText);
      throw new Error(`Slack API error: ${response.status} - ${errorText}`);
    }

  } catch (error) {
    console.error('[Slack API] Error:', error);
    res.json({
      success: false,
      message: `Failed to send to Slack: ${error.message}`,
      error: error.message,
      provider: 'Slack'
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
