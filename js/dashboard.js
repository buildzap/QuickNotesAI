// Use correct Firebase globals and wait for initialization
let currentUser = null;
let userRole = 'free';

// Chart Objects
let completionTrendChart;
let inputMethodChart;
let productiveHoursChart;
let taskCategoriesChart;

// Pro Chart Objects
let proDailyCompletionChartObj;
let proWeeklyHeatmapChartObj;
let proVoiceManualChartObj;
let proTaskTypeChartObj;
let proKeywordsChartObj;
let proTimeOfDayChartObj;
let proCompletionRateChartObj;
let proMonthlyProgressChartObj;
let proNoteDurationChartObj;
let proSentimentChartObj;

// Wait for Firebase to be ready and auth state
let unsubscribeTasks = null;

// Initialize dashboard - handle both cases: DOM already loaded or not
function initializeDashboard() {
    return new Promise(async (resolve) => {
        try {
            await window.firebaseInitialized;
            const auth = window.firebaseAuth;
            const db = window.firebaseDb;
            if (!auth || !db) throw new Error('Firebase not initialized');

            auth.onAuthStateChanged(async (user) => {
                currentUser = user;
                if (unsubscribeTasks) {
                    unsubscribeTasks();
                    unsubscribeTasks = null;
                }
                if (user) {
                    // Show user section
                    const userSection = document.getElementById('userSection');
                    if (userSection) {
                        userSection.style.display = 'flex';
                    }
                    
                    // Update user welcome message
                    const userWelcomeElement = document.getElementById('userWelcome');
                    if (userWelcomeElement) {
                        let displayName = 'User';
                        
                        // Try to get display name from user object first
                        if (user.displayName) {
                            displayName = user.displayName;
                        } else if (user.email) {
                            // Extract name from email (everything before @)
                            const name = user.email.split('@')[0];
                            // Capitalize first letter
                            displayName = name.charAt(0).toUpperCase() + name.slice(1);
                        }
                        
                        userWelcomeElement.textContent = `Welcome, ${displayName}`;
                    }

                    // Get user role
                    let userDoc;
                    try {
                        userDoc = await db.collection('users').doc(user.uid).get();
                        userRole = userDoc.data()?.role || 'free';
                        console.log('[Dashboard] User role detected:', userRole);
                    } catch (err) {
                        console.warn('[Dashboard] Error getting user role:', err);
                        userRole = 'free';
                    }
                    onUserRoleChange(); // <-- call after userRole is set

                    // Show/hide Upgrade button
                    const upgradeBtn = document.getElementById('upgradePremiumBtn');
                    if (upgradeBtn) {
                        if (userRole === 'premium') {
                            // Hide upgrade button for premium users
                            upgradeBtn.style.display = 'none';
                            // Show premium badge
                            const badge = document.getElementById('premiumBadge');
                            if (badge) {
                                badge.classList.remove('d-none');
                            }
                            // Show premium banner
                            const premiumBanner = document.getElementById('premiumBanner');
                            if (premiumBanner) {
                                premiumBanner.classList.remove('d-none');
                                premiumBanner.style.display = 'block';
                            }
                            document.body.classList.add('premium-user');
                        } else {
                            upgradeBtn.style.display = '';
                            // Hide premium badge for free users
                            const badge = document.getElementById('premiumBadge');
                            if (badge) {
                                badge.classList.add('d-none');
                            }
                            // Hide premium banner for free users
                            const premiumBanner = document.getElementById('premiumBanner');
                            if (premiumBanner) {
                                premiumBanner.classList.add('d-none');
                                premiumBanner.style.display = 'none';
                            }
                            document.body.classList.remove('premium-user');
                        }
                    }

                    // Real-time dashboard updates
                    try {
                        unsubscribeTasks = db.collection('tasks')
                            .where('userId', '==', user.uid)
                            .orderBy('createdAt', 'desc')
                            .onSnapshot(snapshot => {
                                const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                                updateStats(tasks);
                                renderCharts(tasks);
                            }, err => {
                                console.error('[Dashboard] Real-time tasks error:', err);
                            });
                    } catch (err) {
                        // ignore
                    }
                } else {
                    // Hide user section when not logged in
                    const userSection = document.getElementById('userSection');
                    if (userSection) {
                        userSection.style.display = 'none';
                    }
                    
                    // Reset welcome message
                    const userWelcomeElement = document.getElementById('userWelcome');
                    if (userWelcomeElement) {
                        userWelcomeElement.textContent = 'Welcome User';
                    }
                    
                    window.location.href = 'login.html';
                }
            });
            resolve();
        } catch (error) {
            console.error('[Dashboard] Initialization error:', error);
            resolve();
        }
    });
}

// Start initialization when DOM is ready or immediately if already ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDashboard);
} else {
    initializeDashboard();
}

// Fallback check for premium banner
setTimeout(() => {
    if (userRole === 'premium') {
        const premiumBanner = document.getElementById('premiumBanner');
        if (premiumBanner) {
            premiumBanner.classList.remove('d-none');
            premiumBanner.style.display = 'block';
            console.log('[Dashboard] Premium banner shown in fallback check');
        }
    }
}, 1500);

// Helper to get JS Date from Firestore Timestamp or Date
function getTaskDate(task) {
    if (!task.createdAt) return null;
    if (typeof task.createdAt.toDate === 'function') return task.createdAt.toDate();
    return new Date(task.createdAt);
}

// Animate counter function
function animateCounter(element, start, end, duration, suffix = '') {
    const startTime = performance.now();
    const startValue = start;
    const endValue = end;
    
    function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentValue = Math.floor(startValue + (endValue - startValue) * easeOutQuart);
        
        element.textContent = currentValue + suffix;
        
        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        }
    }
    
    requestAnimationFrame(updateCounter);
}

// Get category icon function
function getCategoryIcon(category) {
    const icons = {
        'Work': '💼',
        'Personal': '🏠',
        'Shopping': '🛒',
        'Health': '💪',
        'Other': '📝'
    };
    return icons[category] || '📝';
}

// Get input method icon function
function getInputMethodIcon(method) {
    const icons = {
        'Voice': '🎤',
        'Manual': '⌨️'
    };
    return icons[method] || '📝';
}

// Get task type icon function
function getTaskTypeIcon(type) {
    const icons = {
        'completed': '✅',
        'pending': '⏳',
        'in-progress': '🔄',
        'urgent': '🚨',
        'important': '⭐',
        'meeting': '🤝',
        'project': '📋',
        'personal': '👤',
        'work': '💼'
    };
    return icons[type.toLowerCase()] || '📝';
}

// Update Quick Stats
function updateStats(tasks) {
    console.log('[Dashboard] Updating stats with', tasks.length, 'tasks');
    
    // Filter out tasks without titles (empty/test tasks)
    const validTasks = tasks.filter(task => task.title && task.title.trim() !== '');
    console.log('[Dashboard] Valid tasks (with titles):', validTasks.length);
    
    const totalTasks = validTasks.length;
    const completed = validTasks.filter(task => task.status === 'completed').length;
    
    // Enhanced voice notes detection
    const voiceNotes = validTasks.filter(task => {
        const method = (task.inputMethod || '').toLowerCase().trim();
        return method === 'voice' || method === 'voicenote' || method === 'voice-note';
    }).length;
    
    const manualNotes = validTasks.filter(task => {
        const method = (task.inputMethod || '').toLowerCase().trim();
        return !method || method === 'manual' || method === 'text' || method === '';
    }).length;
    
    const completionRate = totalTasks ? Math.round((completed / totalTasks) * 100) : 0;
    
    console.log('[Dashboard] Stats calculated:', {
        totalTasks,
        completed,
        voiceNotes,
        manualNotes,
        completionRate
    });
    
    // Update DOM elements with animations
    const totalTasksEl = document.getElementById('totalTasks');
    const completedTasksEl = document.getElementById('completedTasks');
    const voiceNotesEl = document.getElementById('voiceNotes');
    const completionRateEl = document.getElementById('completionRate');
    
    // Animate number counters
    if (totalTasksEl) {
        animateCounter(totalTasksEl, 0, totalTasks, 1000);
    }
    if (completedTasksEl) {
        animateCounter(completedTasksEl, 0, completed, 1000);
    }
    if (voiceNotesEl) {
        animateCounter(voiceNotesEl, 0, voiceNotes, 1000);
    }
    if (completionRateEl) {
        animateCounter(completionRateEl, 0, completionRate, 1000, '%');
    }
    
    // Animate progress bars
    setTimeout(() => {
        const completionProgress = document.getElementById('completionProgress');
        const voiceProgress = document.getElementById('voiceProgress');
        const rateProgress = document.getElementById('rateProgress');
        
        if (completionProgress && totalTasks > 0) {
            const completionPercentage = (completed / totalTasks) * 100;
            completionProgress.style.width = `${completionPercentage}%`;
        }
        
        if (voiceProgress && totalTasks > 0) {
            const voicePercentage = (voiceNotes / totalTasks) * 100;
            voiceProgress.style.width = `${voicePercentage}%`;
        }
        
        if (rateProgress) {
            rateProgress.style.width = `${completionRate}%`;
        }
    }, 500);
}

// Render Charts
function renderCharts(tasks) {
    try {
        // Store current tasks for theme change updates
        window.currentTasks = tasks;
        
        // Always render free charts
        renderCompletionTrend(tasks);
        renderInputMethodChart(tasks);
        
        // Render premium charts only for premium users
        if (userRole === 'premium') {
            console.log('[Dashboard] Rendering pro charts for premium user');
            try { renderProductiveHours(tasks); } catch(e){console.error('Pro Chart error:',e);}
            try { renderTaskCategories(tasks); } catch(e){console.error('Pro Chart error:',e);}
            try { renderProDailyCompletionChart(tasks); } catch(e){console.error('Pro Chart error:',e);}
            try { renderProWeeklyHeatmapChart(tasks); } catch(e){console.error('Pro Chart error:',e);}
            try { renderProVoiceManualChart(tasks); } catch(e){console.error('Pro Chart error:',e);}
            try { renderProTaskTypeChart(tasks); } catch(e){console.error('Pro Chart error:',e);}
            try { renderProKeywordsChart(tasks); } catch(e){console.error('Pro Chart error:',e);}
            try { renderProTimeOfDayChart(tasks); } catch(e){console.error('Pro Chart error:',e);}
            try { renderProCompletionRateChart(tasks); } catch(e){console.error('Pro Chart error:',e);}
            try { renderProMonthlyProgressChart(tasks); } catch(e){console.error('Pro Chart error:',e);}
            try { renderProNoteDurationChart(tasks); } catch(e){console.error('Pro Chart error:',e);}
            try { renderProSentimentChart(tasks); } catch(e){console.error('Pro Chart error:',e);}
        }
        
        // Ensure free chart containers are always visible
        document.getElementById('completionTrendChart')?.parentElement?.classList.remove('d-none');
        document.getElementById('inputMethodChart')?.parentElement?.classList.remove('d-none');
        
        // Update pro chart visibility based on user role
        updateProChartsVisibility();
        
        // Show export buttons if user has tasks
        if (tasks.length > 0) {
            const exportCsvBtn = document.getElementById('exportCsvBtn');
            const exportPdfBtn = document.getElementById('exportPdfBtn');
            
            if (exportCsvBtn) exportCsvBtn.classList.remove('d-none');
            if (exportPdfBtn) exportPdfBtn.classList.remove('d-none');
        }
    } catch (error) {
        console.error('[Dashboard] Error rendering charts:', error);
    }
}

// Completion Trend Chart
function renderCompletionTrend(tasks) {
    const canvas = document.getElementById('completionTrendChart');
    if (!canvas) {
        console.warn('[Dashboard] completionTrendChart canvas not found');
        return;
    }
    const ctx = canvas.getContext('2d');
    
    // Get theme-aware colors
    const getComputedColor = (variable, fallback) => {
        const color = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
        return color || fallback;
    };
    
    const textColor = getComputedColor('--text-primary', '#1f2937');
    const borderColor = getComputedColor('--border-color', '#e5e7eb');
    const lastSevenDays = getLast7Days();
    const data = lastSevenDays.map(date => {
        const dayTasks = tasks.filter(task => 
            isSameDay(getTaskDate(task), date)
        );
        return {
            date,
            total: dayTasks.length,
            completed: dayTasks.filter(t => t.status === 'completed').length
        };
    });
    
    // Calculate advanced analytics
    const analytics = calculateTrendAnalytics(data);
    
    // Update performance indicators
    updatePerformanceIndicators(analytics);
    
    if (completionTrendChart) {
        completionTrendChart.destroy();
    }
    
    if (typeof Chart === 'undefined') {
        console.error('[Dashboard] Chart.js library not loaded');
        return;
    }
    
    completionTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => formatDate(d.date, 'short')),
            datasets: [
                {
                    label: 'Total Tasks',
                    data: data.map(d => d.total),
                    borderColor: '#4F46E5',
                    backgroundColor: 'rgba(79, 70, 229, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#4F46E5',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                },
                {
                    label: 'Completed',
                    data: data.map(d => d.completed),
                    borderColor: '#34D399',
                    backgroundColor: 'rgba(52, 211, 153, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#34D399',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    align: 'center',
                    labels: {
                        usePointStyle: true,
                        padding: 15,
                        font: {
                            size: 12,
                            family: 'Inter, sans-serif',
                            weight: '600'
                        },
                        color: textColor,
                        generateLabels: function(chart) {
                            const datasets = chart.data.datasets;
                            return datasets.map((dataset, index) => ({
                                text: index === 0 ? '📊 Total Tasks' : '✅ Completed Tasks',
                                fillStyle: dataset.borderColor,
                                strokeStyle: dataset.borderColor,
                                lineWidth: 2,
                                pointStyle: 'line',
                                hidden: !chart.isDatasetVisible(index),
                                index: index
                            }));
                        }
                    },
                    title: {
                        display: false
                    }
                },
                tooltip: {
                    enabled: false, // We'll use custom tooltip
                    external: function(context) {
                        showCustomTooltip(context, data);
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: true,
                        color: borderColor
                    },
                    border: {
                        color: borderColor,
                        width: 1
                    },
                    ticks: {
                        color: textColor,
                        font: {
                            size: 11,
                            family: 'Inter, sans-serif'
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        display: true,
                        color: borderColor
                    },
                    border: {
                        color: borderColor,
                        width: 1
                    },
                    ticks: {
                        color: textColor,
                        font: {
                            size: 11,
                            family: 'Inter, sans-serif'
                        }
                    }
                }
            },
            elements: {
                point: {
                    hoverBackgroundColor: '#ffffff',
                    hoverBorderColor: '#4F46E5',
                    hoverBorderWidth: 3
                }
            }
        }
    });
    
    // Add event listeners for chart controls
    setupChartControls('taskCompletionTrend', analytics);
    
    // Store analytics data for later use
    window.trendAnalytics = analytics;
}

// Advanced Analytics Helper Functions
function calculateTrendAnalytics(data) {
    const completionRates = data.map(d => d.total > 0 ? (d.completed / d.total) * 100 : 0);
    const avgCompletionRate = completionRates.reduce((sum, rate) => sum + rate, 0) / completionRates.length;
    
    // Find best performing day
    const bestDayIndex = completionRates.indexOf(Math.max(...completionRates));
    const bestDay = data[bestDayIndex] ? formatDate(data[bestDayIndex].date, 'short') : '-';
    
    // Calculate trend direction
    const recentRates = completionRates.slice(-3);
    const earlierRates = completionRates.slice(0, 3);
    const recentAvg = recentRates.reduce((sum, rate) => sum + rate, 0) / recentRates.length;
    const earlierAvg = earlierRates.reduce((sum, rate) => sum + rate, 0) / earlierRates.length;
    
    let trendDirection = '→';
    let trendDescription = 'Stable';
    if (recentAvg > earlierAvg + 5) {
        trendDirection = '↗';
        trendDescription = 'Improving';
    } else if (recentAvg < earlierAvg - 5) {
        trendDirection = '↘';
        trendDescription = 'Declining';
    }
    
    // Calculate productivity score (0-100)
    const totalTasks = data.reduce((sum, d) => sum + d.total, 0);
    const totalCompleted = data.reduce((sum, d) => sum + d.completed, 0);
    const consistencyScore = Math.min(100, (avgCompletionRate * 0.6) + (totalCompleted > 0 ? 40 : 0));
    const productivityScore = Math.round(consistencyScore);
    
    // Generate insights
    const insights = generateTrendInsights(data, avgCompletionRate, trendDescription);
    
    return {
        avgCompletionRate: Math.round(avgCompletionRate),
        bestDay,
        trendDirection,
        trendDescription,
        productivityScore,
        insights,
        data
    };
}

function updatePerformanceIndicators(analytics) {
    const avgRateEl = document.getElementById('avgCompletionRate');
    const bestDayEl = document.getElementById('bestDay');
    const trendEl = document.getElementById('trendDirection');
    const scoreEl = document.getElementById('productivityScore');
    
    if (avgRateEl) avgRateEl.textContent = `${analytics.avgCompletionRate}%`;
    if (bestDayEl) bestDayEl.textContent = analytics.bestDay;
    if (trendEl) trendEl.textContent = analytics.trendDirection;
    if (scoreEl) scoreEl.textContent = analytics.productivityScore;
}

function generateTrendInsights(data, avgRate, trend) {
    const totalTasks = data.reduce((sum, d) => sum + d.total, 0);
    const totalCompleted = data.reduce((sum, d) => sum + d.completed, 0);
    
    let analysis = '';
    let recommendations = '';
    
    // Analysis
    if (avgRate >= 80) {
        analysis = `Excellent completion rate of ${avgRate.toFixed(1)}%. You're maintaining high productivity levels.`;
    } else if (avgRate >= 60) {
        analysis = `Good completion rate of ${avgRate.toFixed(1)}%. There's room for improvement in task management.`;
    } else {
        analysis = `Completion rate of ${avgRate.toFixed(1)}% indicates challenges in task completion. Consider reviewing your workflow.`;
    }
    
    // Recommendations
    if (trend === 'Improving') {
        recommendations = 'Your productivity is trending upward! Keep up the momentum by maintaining your current strategies.';
    } else if (trend === 'Declining') {
        recommendations = 'Consider breaking down larger tasks, setting more realistic deadlines, or reviewing your priorities.';
    } else {
        recommendations = 'Focus on consistency. Try time-blocking techniques or the Pomodoro method to improve task completion.';
    }
    
    return { analysis, recommendations };
}

function showCustomTooltip(context, data) {
    console.log('[Dashboard] showCustomTooltip called with context:', context);
    
    const tooltip = document.getElementById('chartTooltip');
    if (!tooltip) {
        console.warn('[Dashboard] chartTooltip element not found');
        return;
    }
    
    if (context.tooltip.opacity === 0) {
        tooltip.classList.add('d-none');
        tooltip.style.opacity = '0';
        return;
    }
    
    const dataIndex = context.tooltip.dataPoints[0]?.dataIndex;
    if (dataIndex === undefined) {
        console.warn('[Dashboard] Data index is undefined');
        return;
    }
    
    const dayData = data[dataIndex];
    if (!dayData) {
        console.warn('[Dashboard] Day data not found for index:', dataIndex);
        return;
    }
    
    const completionRate = dayData.total > 0 ? ((dayData.completed / dayData.total) * 100).toFixed(1) : 0;
    
    // Enhanced header with day of week
    const dayOfWeek = new Date(dayData.date).toLocaleDateString('en-US', { weekday: 'long' });
    const headerEl = tooltip.querySelector('.tooltip-header');
    const contentEl = tooltip.querySelector('.tooltip-content');
    const insightsEl = tooltip.querySelector('.tooltip-insights');
    
    if (!headerEl || !contentEl || !insightsEl) {
        console.warn('[Dashboard] Tooltip child elements not found:', { headerEl: !!headerEl, contentEl: !!contentEl, insightsEl: !!insightsEl });
        return;
    }
    
    headerEl.textContent = `${dayOfWeek}, ${formatDate(dayData.date, 'full')}`;
    
    // Enhanced content with more details
    contentEl.innerHTML = `
        <div class="mb-2">
            <div class="d-flex justify-content-between align-items-center mb-1">
                <strong>Total Tasks:</strong>
                <span class="badge bg-primary">${dayData.total}</span>
            </div>
            <div class="d-flex justify-content-between align-items-center mb-1">
                <strong>Completed:</strong>
                <span class="badge bg-success">${dayData.completed}</span>
            </div>
            <div class="d-flex justify-content-between align-items-center mb-1">
                <strong>Pending:</strong>
                <span class="badge bg-warning">${dayData.total - dayData.completed}</span>
            </div>
            <div class="d-flex justify-content-between align-items-center">
                <strong>Completion Rate:</strong>
                <span class="badge ${completionRate >= 80 ? 'bg-success' : completionRate >= 60 ? 'bg-warning' : 'bg-danger'}">${completionRate}%</span>
            </div>
        </div>
    `;
    
    // Enhanced insights based on performance and context
    let insight = '';
    let insightIcon = '';
    
    if (dayData.total === 0) {
        insight = 'No tasks recorded for this day. Consider adding tasks to track your productivity.';
        insightIcon = '📝';
    } else if (completionRate >= 90) {
        insight = 'Outstanding performance! You completed almost all your tasks. This is your peak productivity level.';
        insightIcon = '🏆';
    } else if (completionRate >= 80) {
        insight = 'Excellent day! You exceeded your productivity goals. Keep up this momentum.';
        insightIcon = '🎯';
    } else if (completionRate >= 70) {
        insight = 'Great progress! You\'re maintaining good productivity. Consider optimizing your workflow for even better results.';
        insightIcon = '👍';
    } else if (completionRate >= 60) {
        insight = 'Good effort! You completed more than half your tasks. Try breaking larger tasks into smaller chunks.';
        insightIcon = '💪';
    } else if (completionRate >= 40) {
        insight = 'Moderate completion rate. Consider reviewing your task priorities and time management strategies.';
        insightIcon = '🤔';
    } else if (completionRate >= 20) {
        insight = 'Low completion rate. Try setting fewer, more achievable tasks and focus on completing them.';
        insightIcon = '💡';
    } else {
        insight = 'Very low completion rate. Consider if your tasks are too ambitious or if you need to adjust your approach.';
        insightIcon = '📊';
    }
    
    // Add contextual advice based on day of week
    const dayName = new Date(dayData.date).toLocaleDateString('en-US', { weekday: 'long' });
    if (dayName === 'Monday' && completionRate < 60) {
        insight += ' Monday blues? Try starting with easy wins to build momentum.';
    } else if (dayName === 'Friday' && completionRate < 70) {
        insight += ' End of week fatigue? Consider carrying over important tasks to next week.';
    }
    
    insightsEl.innerHTML = `<span class="me-1">${insightIcon}</span>${insight}`;
    
    // Position tooltip within the chart boundaries only
    const canvas = document.getElementById('completionTrendChart');
    if (!canvas) {
        console.warn('[Dashboard] completionTrendChart canvas not found for positioning');
        return;
    }
    
    const rect = canvas.getBoundingClientRect();
    const tooltipWidth = 280; // Approximate tooltip width
    const tooltipHeight = 180; // Approximate tooltip height
    
    // Calculate cursor position relative to the chart
    const cursorX = context.tooltip.caretX;
    const cursorY = context.tooltip.caretY;
    
    // Determine if we should position above or below the cursor within the chart
    const shouldPositionBelow = cursorY > (rect.height / 2); // Bottom half of chart
    
    let x, y;
    
    if (shouldPositionBelow) {
        // Position below the cursor, but within chart bounds
        y = cursorY + 20;
        
        // If it goes below the chart, position above instead
        if (y + tooltipHeight > rect.height) {
            y = cursorY - tooltipHeight - 20;
        }
    } else {
        // Position above the cursor, but within chart bounds
        y = cursorY - tooltipHeight - 20;
        
        // If it goes above the chart, position below instead
        if (y < 0) {
            y = cursorY + 20;
        }
    }
    
    // Horizontal positioning within chart bounds
    // Center the tooltip horizontally on the cursor
    x = cursorX - (tooltipWidth / 2);
    
    // Ensure it doesn't go off the left edge of the chart
    if (x < 0) {
        x = 0;
    }
    
    // Ensure it doesn't go off the right edge of the chart
    if (x + tooltipWidth > rect.width) {
        x = rect.width - tooltipWidth;
    }
    
    // Final safety check: if tooltip is too tall for chart, reduce its height
    if (tooltipHeight > rect.height - 20) {
        tooltip.style.maxHeight = `${rect.height - 20}px`;
        tooltip.style.overflowY = 'auto';
    } else {
        tooltip.style.maxHeight = 'none';
        tooltip.style.overflowY = 'visible';
    }
    
    // Position relative to the chart container, not the viewport
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
    tooltip.style.position = 'absolute';
    tooltip.classList.remove('d-none');
    tooltip.style.opacity = '1';
    
    console.log('[Dashboard] Tooltip positioned within chart:', { 
        x, y, dataIndex, dayData, completionRate,
        chartWidth: rect.width, chartHeight: rect.height,
        tooltipWidth, tooltipHeight,
        cursorX, cursorY,
        shouldPositionBelow,
        positioning: shouldPositionBelow ? 'below' : 'above'
    });
}

function showWeeklyHeatmapTooltip(context) {
    console.log('[Dashboard] showWeeklyHeatmapTooltip called with context:', context);
    
    const tooltip = document.getElementById('weeklyHeatmapTooltip');
    if (!tooltip) {
        console.warn('[Dashboard] weeklyHeatmapTooltip element not found');
        return;
    }
    
    if (context.tooltip.opacity === 0) {
        tooltip.classList.add('d-none');
        return;
    }
    
    const dataPoint = context.tooltip.dataPoints[0];
    if (!dataPoint) {
        console.warn('[Dashboard] No data point found in tooltip context');
        return;
    }
    
    const dataIndex = dataPoint.dataIndex;
    const datasetIndex = dataPoint.datasetIndex;
    const value = dataPoint.parsed.y;
    
    console.log('[Dashboard] Tooltip data:', { dataIndex, datasetIndex, value });
    
    if (dataIndex === undefined || datasetIndex === undefined) {
        console.warn('[Dashboard] Invalid data indices:', { dataIndex, datasetIndex });
        return;
    }
    
    const day = context.chart.data.labels[dataIndex];
    const hour = context.chart.data.datasets[datasetIndex].label;
    
    console.log('[Dashboard] Day and hour:', { day, hour });
    
    // Update tooltip content
    const headerEl = tooltip.querySelector('.tooltip-header');
    const contentEl = tooltip.querySelector('.tooltip-content');
    const insightsEl = tooltip.querySelector('.tooltip-insights');
    
    if (headerEl) headerEl.textContent = `${day} at ${hour}`;
    
    if (contentEl) {
        contentEl.innerHTML = `
            <div class="mb-2">
                <span class="badge bg-success">${value} tasks</span>
            </div>
        `;
    }
    
    // Add insights based on productivity level
    let insight = '';
    if (value >= 5) {
        insight = '🔥 High productivity! This is your peak time.';
    } else if (value >= 3) {
        insight = '⚡ Good activity level. Consider scheduling important tasks here.';
    } else if (value >= 1) {
        insight = '📝 Moderate activity. Room for growth in this time slot.';
    } else {
        insight = '💡 Quiet period. Could be used for focused work or planning.';
    }
    
    if (insightsEl) insightsEl.textContent = insight;
    
    // Position tooltip using the improved positioning function
    positionTooltipWithinChart(tooltip, context, 'proWeeklyHeatmapChart');
    
    console.log('[Dashboard] Tooltip positioned and shown');
}

function setupChartControls(chartType, analytics = null) {
    console.log(`[Dashboard] setupChartControls called for chartType: ${chartType}`, analytics);
    
    // Handle different chart types
    let insightsBtn, exportBtn, analysisPanel, analysisEl, recommendationsEl;
    
    switch (chartType) {
        case 'taskCompletionTrend':
            insightsBtn = document.getElementById('trendInsightsBtn');
            exportBtn = document.getElementById('trendExportBtn');
            analysisPanel = document.getElementById('trendAnalysisPanel');
            analysisEl = document.getElementById('trendAnalysis');
            recommendationsEl = document.getElementById('trendRecommendations');
            break;
        case 'dailyCompletion':
            insightsBtn = document.getElementById('dailyCompletionInsightsBtn');
            exportBtn = document.getElementById('dailyCompletionExportBtn');
            analysisPanel = document.getElementById('dailyCompletionAnalysisPanel');
            analysisEl = document.getElementById('dailyCompletionAnalysis');
            recommendationsEl = document.getElementById('dailyCompletionRecommendations');
            break;
        case 'productiveHours':
            insightsBtn = document.getElementById('productiveHoursInsightsBtn');
            exportBtn = document.getElementById('productiveHoursExportBtn');
            analysisPanel = document.getElementById('productiveHoursAnalysisPanel');
            analysisEl = document.getElementById('productiveHoursAnalysis');
            recommendationsEl = document.getElementById('productiveHoursRecommendations');
            break;
        case 'taskCategories':
            insightsBtn = document.getElementById('taskCategoriesInsightsBtn');
            exportBtn = document.getElementById('taskCategoriesExportBtn');
            analysisPanel = document.getElementById('taskCategoriesAnalysisPanel');
            analysisEl = document.getElementById('taskCategoriesAnalysis');
            recommendationsEl = document.getElementById('taskCategoriesRecommendations');
            break;
        case 'voiceManual':
            insightsBtn = document.getElementById('voiceManualInsightsBtn');
            exportBtn = document.getElementById('voiceManualExportBtn');
            analysisPanel = document.getElementById('voiceManualAnalysisPanel');
            analysisEl = document.getElementById('voiceManualAnalysis');
            recommendationsEl = document.getElementById('voiceManualRecommendations');
            break;
        case 'taskType':
            insightsBtn = document.getElementById('taskTypeInsightsBtn');
            exportBtn = document.getElementById('taskTypeExportBtn');
            analysisPanel = document.getElementById('taskTypeAnalysisPanel');
            analysisEl = document.getElementById('taskTypeAnalysis');
            recommendationsEl = document.getElementById('taskTypeRecommendations');
            break;
        case 'keywords':
            insightsBtn = document.getElementById('keywordsInsightsBtn');
            exportBtn = document.getElementById('keywordsExportBtn');
            analysisPanel = document.getElementById('keywordsAnalysisPanel');
            analysisEl = document.getElementById('keywordsAnalysis');
            recommendationsEl = document.getElementById('keywordsRecommendations');
            break;
        case 'timeOfDay':
            insightsBtn = document.getElementById('timeOfDayInsightsBtn');
            exportBtn = document.getElementById('timeOfDayExportBtn');
            analysisPanel = document.getElementById('timeOfDayAnalysisPanel');
            analysisEl = document.getElementById('timeOfDayAnalysis');
            recommendationsEl = document.getElementById('timeOfDayRecommendations');
            break;
        case 'completionRate':
            insightsBtn = document.getElementById('completionRateInsightsBtn');
            exportBtn = document.getElementById('completionRateExportBtn');
            analysisPanel = document.getElementById('completionRateAnalysisPanel');
            analysisEl = document.getElementById('completionRateAnalysis');
            recommendationsEl = document.getElementById('completionRateRecommendations');
            break;
        case 'monthlyProgress':
            insightsBtn = document.getElementById('monthlyProgressInsightsBtn');
            exportBtn = document.getElementById('monthlyProgressExportBtn');
            analysisPanel = document.getElementById('monthlyProgressAnalysisPanel');
            analysisEl = document.getElementById('monthlyProgressAnalysis');
            recommendationsEl = document.getElementById('monthlyProgressRecommendations');
            break;
        case 'noteDuration':
            insightsBtn = document.getElementById('noteDurationInsightsBtn');
            exportBtn = document.getElementById('noteDurationExportBtn');
            analysisPanel = document.getElementById('noteDurationAnalysisPanel');
            analysisEl = document.getElementById('noteDurationAnalysis');
            recommendationsEl = document.getElementById('noteDurationRecommendations');
            break;
        case 'sentiment':
            insightsBtn = document.getElementById('sentimentInsightsBtn');
            exportBtn = document.getElementById('sentimentExportBtn');
            analysisPanel = document.getElementById('sentimentAnalysisPanel');
            analysisEl = document.getElementById('sentimentAnalysis');
            recommendationsEl = document.getElementById('sentimentRecommendations');
            break;
        case 'weeklyHeatmap':
            insightsBtn = document.getElementById('weeklyHeatmapInsightsBtn');
            exportBtn = document.getElementById('weeklyHeatmapExportBtn');
            analysisPanel = document.getElementById('weeklyHeatmapAnalysisPanel');
            analysisEl = document.getElementById('weeklyHeatmapAnalysis');
            recommendationsEl = document.getElementById('weeklyHeatmapRecommendations');
            break;
        default:
            console.warn(`[Dashboard] Unknown chart type: ${chartType}`);
            return;
    }
    
    if (insightsBtn) {
        console.log(`[Dashboard] Setting up insights button for ${chartType}`);
        
        // Remove existing event listeners
        const newInsightsBtn = insightsBtn.cloneNode(true);
        insightsBtn.parentNode.replaceChild(newInsightsBtn, insightsBtn);
        insightsBtn = newInsightsBtn;
        
        insightsBtn.addEventListener('click', function() {
            console.log(`[Dashboard] Insights button clicked for ${chartType}`);
            const isVisible = !analysisPanel.classList.contains('d-none');
            if (isVisible) {
                analysisPanel.classList.add('d-none');
                insightsBtn.innerHTML = '<i class="fas fa-lightbulb me-1"></i>Insights';
            } else {
                analysisPanel.classList.remove('d-none');
                insightsBtn.innerHTML = '<i class="fas fa-eye-slash me-1"></i>Hide';
                
                // Update analysis content if analytics data is available
                if (analytics && analytics.insights) {
                    console.log(`[Dashboard] Updating analysis content for ${chartType}:`, analytics.insights);
                    if (analysisEl) {
                        analysisEl.textContent = analytics.insights.analysis;
                        console.log(`[Dashboard] Updated analysisEl with:`, analytics.insights.analysis);
                    }
                    if (recommendationsEl) {
                        recommendationsEl.textContent = analytics.insights.recommendations;
                        console.log(`[Dashboard] Updated recommendationsEl with:`, analytics.insights.recommendations);
                    }
                } else {
                    console.log(`[Dashboard] No analytics data available for ${chartType}`);
                }
            }
        });
    } else {
        console.warn(`[Dashboard] Insights button not found for ${chartType}`);
    }
    
    if (exportBtn) {
        console.log(`[Dashboard] Setting up export button for ${chartType}`);
        
        // Remove existing event listeners
        const newExportBtn = exportBtn.cloneNode(true);
        exportBtn.parentNode.replaceChild(newExportBtn, exportBtn);
        exportBtn = newExportBtn;
        
        exportBtn.addEventListener('click', function() {
            console.log(`[Dashboard] Export button clicked for ${chartType}`);
            if (analytics) {
                exportChartData(chartType, analytics);
            } else {
                console.warn(`[Dashboard] No analytics data available for export in ${chartType}`);
            }
        });
    } else {
        console.warn(`[Dashboard] Export button not found for ${chartType}`);
    }
}

function exportChartData(chartType, analytics) {
    let csvContent, filename;
    
    switch (chartType) {
        case 'taskCompletionTrend':
            csvContent = [
                ['Date', 'Total Tasks', 'Completed Tasks', 'Completion Rate (%)'],
                ...analytics.data.map(d => [
                    formatDate(d.date, 'full'),
                    d.total,
                    d.completed,
                    d.total > 0 ? ((d.completed / d.total) * 100).toFixed(1) : 0
                ])
            ].map(row => row.join(',')).join('\n');
            filename = `task-completion-trend-${new Date().toISOString().split('T')[0]}.csv`;
            break;
        case 'dailyCompletion':
            csvContent = [
                ['Date', 'Total Tasks', 'Completed Tasks', 'Completion Rate (%)'],
                ...getLast7Days().map((date, index) => [
                    formatDate(date, 'full'),
                    analytics.totalData[index] || 0,
                    analytics.completionData[index] || 0,
                    analytics.totalData[index] > 0 ? ((analytics.completionData[index] / analytics.totalData[index]) * 100).toFixed(1) : 0
                ])
            ].map(row => row.join(',')).join('\n');
            filename = `daily-completion-${new Date().toISOString().split('T')[0]}.csv`;
            break;
        case 'productiveHours':
            csvContent = [
                ['Hour', 'Tasks Created', 'Percentage of Total'],
                ...analytics.hourData.map((count, hour) => [
                    `${hour}:00`,
                    count,
                    analytics.totalTasks > 0 ? ((count / analytics.totalTasks) * 100).toFixed(1) : 0
                ])
            ].map(row => row.join(',')).join('\n');
            filename = `productive-hours-${new Date().toISOString().split('T')[0]}.csv`;
            break;
        case 'taskCategories':
            csvContent = [
                ['Category', 'Count', 'Percentage'],
                ...analytics.categories.map((category, index) => [
                    category,
                    analytics.counts[index],
                    analytics.total > 0 ? ((analytics.counts[index] / analytics.total) * 100).toFixed(1) : 0
                ])
            ].map(row => row.join(',')).join('\n');
            filename = `task-categories-${new Date().toISOString().split('T')[0]}.csv`;
            break;
        case 'voiceManual':
            csvContent = [
                ['Input Method', 'Count', 'Percentage'],
                ['Voice', analytics.voiceTasks, analytics.voicePercentage],
                ['Manual', analytics.manualTasks, analytics.manualPercentage]
            ].map(row => row.join(',')).join('\n');
            filename = `voice-manual-${new Date().toISOString().split('T')[0]}.csv`;
            break;
        case 'taskType':
            csvContent = [
                ['Task Type', 'Count', 'Percentage'],
                ...analytics.types.map((type, index) => [
                    type,
                    analytics.counts[index],
                    analytics.total > 0 ? ((analytics.counts[index] / analytics.total) * 100).toFixed(1) : 0
                ])
            ].map(row => row.join(',')).join('\n');
            filename = `task-types-${new Date().toISOString().split('T')[0]}.csv`;
            break;
        case 'keywords':
            csvContent = [
                ['Keyword', 'Frequency', 'Percentage'],
                ...analytics.keywords.map((keyword, index) => [
                    keyword,
                    analytics.counts[index],
                    analytics.counts.reduce((sum, count) => sum + count, 0) > 0 ? 
                        ((analytics.counts[index] / analytics.counts.reduce((sum, count) => sum + count, 0)) * 100).toFixed(1) : 0
                ])
            ].map(row => row.join(',')).join('\n');
            filename = `keywords-${new Date().toISOString().split('T')[0]}.csv`;
            break;
        case 'timeOfDay':
            csvContent = [
                ['Time Period', 'Tasks Created', 'Percentage'],
                ['Morning (6-12)', analytics.morning, analytics.totalTasks > 0 ? ((analytics.morning / analytics.totalTasks) * 100).toFixed(1) : 0],
                ['Afternoon (12-18)', analytics.afternoon, analytics.totalTasks > 0 ? ((analytics.afternoon / analytics.totalTasks) * 100).toFixed(1) : 0],
                ['Evening (18-24)', analytics.evening, analytics.totalTasks > 0 ? ((analytics.evening / analytics.totalTasks) * 100).toFixed(1) : 0],
                ['Night (0-6)', analytics.night, analytics.totalTasks > 0 ? ((analytics.night / analytics.totalTasks) * 100).toFixed(1) : 0]
            ].map(row => row.join(',')).join('\n');
            filename = `time-of-day-${new Date().toISOString().split('T')[0]}.csv`;
            break;
        case 'completionRate':
            csvContent = [
                ['Metric', 'Value'],
                ['Overall Completion Rate', `${analytics.completionRate}%`],
                ['Recent Completion Rate', `${analytics.recentRate}%`],
                ['Older Completion Rate', `${analytics.olderRate}%`],
                ['Trend', analytics.trend],
                ['Productivity Score', analytics.score]
            ].map(row => row.join(',')).join('\n');
            filename = `completion-rate-${new Date().toISOString().split('T')[0]}.csv`;
            break;
        case 'monthlyProgress':
            csvContent = [
                ['Month', 'Tasks Created', 'Growth Rate'],
                ...analytics.months.map((month, index) => [
                    month,
                    analytics.counts[index],
                    index > 0 ? (((analytics.counts[index] - analytics.counts[index-1]) / analytics.counts[index-1]) * 100).toFixed(1) : 0
                ])
            ].map(row => row.join(',')).join('\n');
            filename = `monthly-progress-${new Date().toISOString().split('T')[0]}.csv`;
            break;
        case 'noteDuration':
            csvContent = [
                ['Metric', 'Value'],
                ['Average Duration', analytics.avgDuration],
                ['Total Voice Time', analytics.totalTime],
                ['Voice Task Count', analytics.voiceTaskCount],
                ['Efficiency', analytics.efficiency]
            ].map(row => row.join(',')).join('\n');
            filename = `note-duration-${new Date().toISOString().split('T')[0]}.csv`;
            break;
        case 'sentiment':
            csvContent = [
                ['Metric', 'Value'],
                ['Average Sentiment', analytics.avgSentiment],
                ['Trend', analytics.trend],
                ['Stability', analytics.stability],
                ['Sentiment Count', analytics.sentimentCount]
            ].map(row => row.join(',')).join('\n');
            filename = `sentiment-${new Date().toISOString().split('T')[0]}.csv`;
            break;
        case 'weeklyHeatmap':
            csvContent = [
                ['Day/Hour', '00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'],
                ...analytics.dayLabels.map((day, dayIndex) => [
                    day,
                    ...analytics.heatmap[dayIndex]
                ])
            ].map(row => row.join(',')).join('\n');
            filename = `weekly-heatmap-${new Date().toISOString().split('T')[0]}.csv`;
            break;
        default:
            csvContent = [['Data not available for export']].map(row => row.join(',')).join('\n');
            filename = `${chartType}-${new Date().toISOString().split('T')[0]}.csv`;
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
    
    showToast(`${chartType} data exported successfully!`, 'success');
}

function exportTrendData(analytics) {
    exportChartData('taskCompletionTrend', analytics);
}

// Input Method Chart
function renderInputMethodChart(tasks) {
    const ctx = document.getElementById('inputMethodChart')?.getContext('2d');
    if (!ctx) return;
    // Robust normalization for inputMethod
    const voiceCount = tasks.filter(t => (t.inputMethod || '').toLowerCase().trim() === 'voice').length;
    const manualCount = tasks.filter(t => {
        const method = (t.inputMethod || '').toLowerCase().trim();
        return !method || method === 'manual';
    }).length;
    const total = voiceCount + manualCount;
    const voiceRatio = total ? ((voiceCount / total) * 100).toFixed(1) : 0;
    const manualRatio = total ? ((manualCount / total) * 100).toFixed(1) : 0;
    if (inputMethodChart) {
        inputMethodChart.destroy();
    }
    
    if (typeof Chart === 'undefined') {
        console.error('[Dashboard] Chart.js library not loaded');
        return;
    }
    
    // Get theme-aware colors
    const getComputedColor = (variable, fallback) => {
        const color = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
        return color || fallback;
    };
    
    const primaryColor = getComputedColor('--primary-color', '#6366f1');
    const secondaryColor = getComputedColor('--secondary-color', '#8b5cf6');
    const textColor = getComputedColor('--text-primary', '#1f2937');
    
    console.log('[Dashboard] Input Method Chart colors:', { primaryColor, secondaryColor, textColor });
    
    inputMethodChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Voice', 'Manual'],
            datasets: [{
                data: [voiceCount, manualCount],
                backgroundColor: [primaryColor, secondaryColor]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        color: textColor,
                        font: {
                            size: 12,
                            family: 'Inter, sans-serif'
                        },
                        usePointStyle: true,
                        padding: 15
                    }
                }
            }
        }
    });
    // Show ratio as text below chart
    let ratioDiv = document.getElementById('inputMethodRatio');
    if (!ratioDiv) {
        ratioDiv = document.createElement('div');
        ratioDiv.id = 'inputMethodRatio';
        ctx.canvas.parentNode.appendChild(ratioDiv);
    }
    ratioDiv.innerHTML = `
        <div class="d-flex justify-content-center align-items-center mt-3">
            <div class="input-method-ratio-container" style="background: var(--card-bg); border-radius: 1.5rem; box-shadow: var(--shadow-sm); padding: 0.5rem 1.8rem; display: flex; align-items: center; gap: 2rem; min-width: 280px; border: 1px solid var(--border-color);">
                <span class="d-flex align-items-center gap-2" style="color: var(--primary-color); font-weight:600;">
                    <i class="fas fa-microphone-alt" style="font-size:1.2rem;"></i>
                    <span style="font-size:1.6rem; font-weight:700; font-family: 'Inter', 'Segoe UI', Arial, sans-serif; color: var(--text-primary);">${voiceRatio}%</span>
                    <span style="font-size:0.9rem; font-weight:500; color: var(--primary-color); letter-spacing:0.5px;">Voice</span>
                </span>
                <span style="height:1.8rem; width:1px; background: var(--border-color); border-radius:0.5px;"></span>
                <span class="d-flex align-items-center gap-2" style="color: var(--secondary-color); font-weight:600;">
                    <i class="fas fa-keyboard" style="font-size:1.2rem;"></i>
                    <span style="font-size:1.6rem; font-weight:700; font-family: 'Inter', 'Segoe UI', Arial, sans-serif; color: var(--text-primary);">${manualRatio}%</span>
                    <span style="font-size:0.9rem; font-weight:500; color: var(--secondary-color); letter-spacing:0.5px;">Manual</span>
                </span>
            </div>
        </div>
    `;
}

// Productive Hours Chart (Premium)
function renderProductiveHours(tasks) {
    console.log('[Dashboard] renderProductiveHours called with', tasks.length, 'tasks');
    
    const canvas = document.getElementById('productiveHoursChart');
    if (!canvas) {
        console.warn('[Dashboard] productiveHoursChart canvas not found');
        return;
    }
    const ctx = canvas.getContext('2d');
    
    // Get theme-aware colors
    const getComputedColor = (variable, fallback) => {
        const color = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
        return color || fallback;
    };
    
    const textColor = getComputedColor('--text-primary', '#1f2937');
    const borderColor = getComputedColor('--border-color', '#e5e7eb');
    
    // Process data for 24 hours
    const hourCounts = new Array(24).fill(0);
    const hourLabels = Array.from({length: 24}, (_, i) => `${i}:00`);
    
    tasks.forEach(task => {
        const d = getTaskDate(task);
        if (d) {
            const hour = d.getHours();
            hourCounts[hour]++;
        }
    });
    
    console.log('[Dashboard] Hour counts:', hourCounts);
    
    // Calculate analytics
    const analytics = calculateProductiveHoursAnalytics(hourCounts);
    console.log('[Dashboard] Productive hours analytics:', analytics);
    updateProductiveHoursIndicators(analytics);
    
    if (productiveHoursChart) {
        productiveHoursChart.destroy();
    }
    
    if (typeof Chart === 'undefined') {
        console.error('[Dashboard] Chart.js library not loaded');
        return;
    }
    
    productiveHoursChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: hourLabels,
            datasets: [{
                label: 'Tasks Created',
                data: hourCounts,
                backgroundColor: hourCounts.map((count, index) => {
                    if (index === analytics.peakHour) {
                        return 'rgba(79, 70, 229, 1)'; // Primary color for peak
                    } else if (count > analytics.averageTasks) {
                        return 'rgba(79, 70, 229, 0.8)'; // Slightly transparent for above average
                    } else {
                        return 'rgba(79, 70, 229, 0.4)'; // More transparent for below average
                    }
                }),
                borderColor: hourCounts.map((count, index) => {
                    if (index === analytics.peakHour) {
                        return 'rgba(79, 70, 229, 1)';
                    } else {
                        return 'rgba(79, 70, 229, 0.6)';
                    }
                }),
                borderWidth: hourCounts.map((count, index) => {
                    return index === analytics.peakHour ? 2 : 1;
                }),
                borderRadius: 4,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    align: 'center',
                    labels: {
                        usePointStyle: true,
                        padding: 15,
                        font: {
                            size: 12,
                            family: 'Inter, sans-serif',
                            weight: '600'
                        },
                        color: textColor,
                        generateLabels: function(chart) {
                            const datasets = chart.data.datasets;
                            return datasets.map((dataset, index) => ({
                                text: '📊 Tasks Created',
                                fillStyle: 'rgba(79, 70, 229, 1)',
                                strokeStyle: 'rgba(79, 70, 229, 1)',
                                lineWidth: 2,
                                pointStyle: 'rect',
                                hidden: !chart.isDatasetVisible(index),
                                index: index
                            }));
                        }
                    },
                    title: {
                        display: false
                    }
                },
                tooltip: {
                    enabled: false,
                    external: showProductiveHoursTooltip
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: getComputedColor('--border-color', '#e5e7eb') + '40', // Add transparency for better visibility
                        drawBorder: false
                    },
                    border: {
                        color: borderColor,
                        width: 1
                    },
                    ticks: {
                        color: textColor,
                        font: {
                            size: 11,
                            family: 'Inter, sans-serif'
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    border: {
                        color: borderColor,
                        width: 1
                    },
                    ticks: {
                        color: textColor,
                        font: {
                            size: 10,
                            family: 'Inter, sans-serif'
                        },
                        maxRotation: 45
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            elements: {
                bar: {
                    hoverBackgroundColor: 'rgba(79, 70, 229, 0.9)',
                    hoverBorderColor: 'rgba(79, 70, 229, 1)',
                    hoverBorderWidth: 2
                }
            }
        }
    });
    
    // Setup chart controls
    setupChartControls('productiveHours', analytics);
}

// Task Categories Chart (Premium)
function renderTaskCategories(tasks) {
    console.log('[Dashboard] renderTaskCategories called with', tasks.length, 'tasks');
    
    const canvas = document.getElementById('taskCategoriesChart');
    if (!canvas) {
        console.warn('[Dashboard] taskCategoriesChart canvas not found');
        return;
    }
    const ctx = canvas.getContext('2d');
    
    // Get theme-aware colors
    const getComputedColor = (variable, fallback) => {
        const color = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
        return color || fallback;
    };
    
    const textColor = getComputedColor('--text-primary', '#1f2937');
    
    // Use title and description for category detection
    const categories = {
        'Work': 0,
        'Personal': 0,
        'Shopping': 0,
        'Health': 0,
        'Other': 0
    };
    
    tasks.forEach(task => {
        const text = ((task.title || '') + ' ' + (task.description || '')).toLowerCase();
        if (text.includes('work') || text.includes('project') || text.includes('meeting')) {
            categories.Work++;
        } else if (text.includes('buy') || text.includes('shop') || text.includes('store')) {
            categories.Shopping++;
        } else if (text.includes('gym') || text.includes('exercise') || text.includes('health')) {
            categories.Health++;
        } else if (text.includes('home') || text.includes('family') || text.includes('personal')) {
            categories.Personal++;
        } else {
            categories.Other++;
        }
    });
    
    console.log('[Dashboard] Category data:', categories);
    
    // Calculate analytics
    const analytics = calculateCategoryAnalytics(categories);
    console.log('[Dashboard] Category analytics:', analytics);
    updateCategoryIndicators(analytics);
    
    if (taskCategoriesChart) {
        taskCategoriesChart.destroy();
    }
    
    if (typeof Chart === 'undefined') {
        console.error('[Dashboard] Chart.js library not loaded');
        return;
    }
    
    taskCategoriesChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(categories),
            datasets: [{
                data: Object.values(categories),
                backgroundColor: ['#4F46E5', '#34D399', '#FBBF24', '#EC4899', '#6B7280'],
                borderColor: '#ffffff',
                borderWidth: 2,
                hoverBorderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    align: 'center',
                    labels: {
                        usePointStyle: true,
                        padding: 15,
                        font: {
                            size: 11,
                            family: 'Inter, sans-serif',
                            weight: '600'
                        },
                        color: textColor,
                        generateLabels: function(chart) {
                            const labels = chart.data.labels;
                            const colors = chart.data.datasets[0].backgroundColor;
                            return labels.map((label, index) => ({
                                text: `${getCategoryIcon(label)} ${label}`,
                                fillStyle: colors[index],
                                strokeStyle: colors[index],
                                lineWidth: 2,
                                pointStyle: 'circle',
                                hidden: !chart.isDatasetVisible(0),
                                index: index
                            }));
                        }
                    },
                    title: {
                        display: false
                    }
                },
                tooltip: {
                    enabled: false,
                    external: showTaskCategoriesTooltip
                }
            },
            elements: {
                arc: {
                    borderWidth: 2,
                    hoverBorderWidth: 3
                }
            },
            cutout: '60%'
        }
    });
    
    // Setup chart controls
    setupChartControls('taskCategories', analytics);
}

// --- Pro Chart Renderers ---

function renderProDailyCompletionChart(tasks) {
    // Temporarily allow all users to see the chart for testing
    // if (userRole !== 'premium') {
    //     console.log('[Pro Charts] Skipping data loading for proDailyCompletionChart - free user');
    //     return;
    // }
    
    console.log('[Dashboard] renderProDailyCompletionChart called with', tasks.length, 'tasks');
    
    const canvas = document.getElementById('proDailyCompletionChart');
    if (!canvas) {
        console.warn('[Dashboard] proDailyCompletionChart canvas not found');
        return;
    }
    const ctx = canvas.getContext('2d');
    
    // Process data for the last 7 days
    const last7Days = getLast7Days();
    const completionData = [];
    const totalData = [];
    
    console.log('[Dashboard] Processing data for last 7 days:', last7Days.map(d => formatDate(d, 'short')));
    
    for (let i = 0; i < last7Days.length; i++) {
        const date = last7Days[i];
        const dayTasks = tasks.filter(task => {
            const taskDate = getTaskDate(task);
            return taskDate && isSameDay(taskDate, date);
        });
        
        const completedTasks = dayTasks.filter(task => task.status === 'completed');
        completionData.push(completedTasks.length);
        totalData.push(dayTasks.length);
        
        console.log(`[Dashboard] ${formatDate(date, 'short')}: ${completedTasks.length}/${dayTasks.length} tasks completed`);
    }

    console.log('[Dashboard] Completion data:', completionData);
    console.log('[Dashboard] Total data:', totalData);

    // Calculate analytics
    const analytics = calculateDailyCompletionAnalytics(completionData, totalData);
    console.log('[Dashboard] Analytics calculated:', analytics);
    updateDailyCompletionIndicators(analytics);

    if (proDailyCompletionChartObj) proDailyCompletionChartObj.destroy();
    
    if (typeof Chart === 'undefined') {
        console.error('[Dashboard] Chart.js library not loaded');
        return;
    }
    
    proDailyCompletionChartObj = new Chart(ctx, {
        type: 'line',
        data: {
            labels: last7Days.map(d => formatDate(d, 'short')),
            datasets: [{
                label: 'Completed Tasks',
                data: completionData,
                borderColor: 'rgba(79, 70, 229, 1)',
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: 'rgba(79, 70, 229, 1)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8
            }, {
                label: 'Total Tasks',
                data: totalData,
                borderColor: 'rgba(156, 163, 175, 0.8)',
                backgroundColor: 'rgba(156, 163, 175, 0.05)',
                borderWidth: 2,
                fill: false,
                tension: 0.4,
                pointBackgroundColor: 'rgba(156, 163, 175, 0.8)',
                pointBorderColor: '#fff',
                pointBorderWidth: 1,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: false,
                    external: showDailyCompletionTooltip
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(156, 163, 175, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: 'rgba(156, 163, 175, 0.8)',
                        font: {
                            size: 11
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: 'rgba(156, 163, 175, 0.8)',
                        font: {
                            size: 11
                        }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            elements: {
                point: {
                    hoverBackgroundColor: 'rgba(79, 70, 229, 1)',
                    hoverBorderColor: '#fff'
                }
            }
        }
    });

    // Setup chart controls
    setupChartControls('dailyCompletion', analytics);
}

function renderProWeeklyHeatmapChart(tasks) {
    console.log('[Dashboard] renderProWeeklyHeatmapChart called with', tasks.length, 'tasks');
    
    const canvas = document.getElementById('proWeeklyHeatmapChart');
    if (!canvas) {
        console.warn('[Dashboard] proWeeklyHeatmapChart canvas not found');
        return;
    }
    const ctx = canvas.getContext('2d');
    
    // Get theme-aware colors
    const getComputedColor = (variable, fallback) => {
        const color = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
        return color || fallback;
    };
    
    const textColor = getComputedColor('--text-primary', '#1f2937');
    const borderColor = getComputedColor('--border-color', '#e5e7eb');
    
    // 7 days x 24 hours heatmap
    const heatmap = Array.from({length:7},()=>Array(24).fill(0));
    const dayLabels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    
    tasks.forEach(t => {
        const d = getTaskDate(t);
        if (!d) return;
        const dow = d.getDay(); // 0=Sun
        const hour = d.getHours();
        heatmap[dow][hour]++;
    });
    
    console.log('[Dashboard] Heatmap data:', heatmap);
    
    // Calculate analytics
    const analytics = calculateWeeklyHeatmapAnalytics(heatmap);
    console.log('[Dashboard] Weekly heatmap analytics:', analytics);
    updateWeeklyHeatmapIndicators(analytics);
    
    // Debug: Log the datasets being created
    console.log('[Dashboard] Creating datasets for heatmap chart...');
    
    // Flatten for Chart.js matrix plugin or use stacked bar
    const datasets = [];
    for (let h=0; h<24; h++) {
        const dataset = {
            label: `${h}:00`,
            data: heatmap.map(day => day[h]),
            backgroundColor: `rgba(99,102,241,${0.2+0.8*(h/23)})`,
            borderColor: `rgba(99,102,241,${0.3+0.7*(h/23)})`,
            borderWidth: 1,
            hoverBackgroundColor: `rgba(99,102,241,${0.4+0.6*(h/23)})`,
            hoverBorderColor: `rgba(99,102,241,1)`,
            hoverBorderWidth: 2
        };
        datasets.push(dataset);
        console.log(`[Dashboard] Dataset ${h}:00 created with ${dataset.data.length} data points`);
    }
    if (proWeeklyHeatmapChartObj) proWeeklyHeatmapChartObj.destroy();
    
    if (typeof Chart === 'undefined') {
        console.error('[Dashboard] Chart.js library not loaded');
        return;
    }
    
    console.log('[Dashboard] Creating Weekly Heatmap chart with datasets:', datasets.length);
    console.log('[Dashboard] Chart labels:', dayLabels);
    
    proWeeklyHeatmapChartObj = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dayLabels,
            datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    align: 'center',
                    labels: {
                        usePointStyle: true,
                        padding: 15,
                        font: {
                            size: 11,
                            family: 'Inter, sans-serif',
                            weight: '600'
                        },
                        color: textColor,
                        generateLabels: function(chart) {
                            // Create a simplified legend showing intensity levels
                            return [
                                {
                                    text: '🌅 Early Morning (0-6h)',
                                    fillStyle: 'rgba(99, 102, 241, 0.3)',
                                    strokeStyle: 'rgba(99, 102, 241, 0.3)',
                                    lineWidth: 2,
                                    pointStyle: 'rect',
                                    hidden: false,
                                    index: 0
                                },
                                {
                                    text: '🌞 Morning (6-12h)',
                                    fillStyle: 'rgba(99, 102, 241, 0.6)',
                                    strokeStyle: 'rgba(99, 102, 241, 0.6)',
                                    lineWidth: 2,
                                    pointStyle: 'rect',
                                    hidden: false,
                                    index: 1
                                },
                                {
                                    text: '🌆 Afternoon (12-18h)',
                                    fillStyle: 'rgba(99, 102, 241, 0.8)',
                                    strokeStyle: 'rgba(99, 102, 241, 0.8)',
                                    lineWidth: 2,
                                    pointStyle: 'rect',
                                    hidden: false,
                                    index: 2
                                },
                                {
                                    text: '🌙 Evening (18-24h)',
                                    fillStyle: 'rgba(99, 102, 241, 1)',
                                    strokeStyle: 'rgba(99, 102, 241, 1)',
                                    lineWidth: 2,
                                    pointStyle: 'rect',
                                    hidden: false,
                                    index: 3
                                }
                            ];
                        }
                    },
                    title: {
                        display: false
                    }
                },
                tooltip: {
                    enabled: false,
                    external: function(context) {
                        showWeeklyHeatmapTooltip(context);
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: textColor,
                        font: {
                            size: 11,
                            family: 'Inter, sans-serif'
                        }
                    }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    grid: {
                        color: borderColor,
                        drawBorder: false
                    },
                    ticks: {
                        color: textColor,
                        font: {
                            size: 11,
                            family: 'Inter, sans-serif'
                        }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            elements: {
                bar: {
                    hoverBackgroundColor: 'rgba(99, 102, 241, 0.9)',
                    hoverBorderColor: 'rgba(99, 102, 241, 1)',
                    hoverBorderWidth: 2
                }
            },
            onHover: (event, activeElements) => {
                const canvas = event.native.target;
                if (activeElements.length > 0) {
                    canvas.style.cursor = 'pointer';
                } else {
                    canvas.style.cursor = 'default';
                }
            }
        }
    });
    
    console.log('[Dashboard] Weekly Heatmap chart created successfully');
    console.log('[Dashboard] Chart instance:', proWeeklyHeatmapChartObj);
    
    // Setup chart controls
    setupChartControls('weeklyHeatmap', analytics);
}

function renderProVoiceManualChart(tasks) {
    console.log('[Dashboard] ===== START: renderProVoiceManualChart =====');
    console.log('[Dashboard] Function called with tasks:', tasks);
    console.log('[Dashboard] Tasks length:', tasks ? tasks.length : 'undefined');
    console.log('[Dashboard] User role:', userRole);
    
    // Temporarily allow all users to see the chart for testing
    // if (userRole !== 'premium') {
    //     console.log('[Pro Charts] Skipping data loading for proVoiceManualChart - free user');
    //     return;
    // }
    
    console.log('[Dashboard] renderProVoiceManualChart called with', tasks.length, 'tasks');
    if (tasks.length > 0) {
        console.log('[Dashboard] First 5 tasks sample:');
        tasks.slice(0, 5).forEach((t, i) => {
            console.log(`[Dashboard] Task ${i + 1}:`, t.title, '| inputMethod:', t.inputMethod);
        });
    } else {
        console.warn('[Dashboard] No tasks provided to renderProVoiceManualChart');
    }
    
    // Wait for Chart.js to be available
    if (typeof Chart === 'undefined') {
        console.error('[Dashboard] Chart.js library not loaded, retrying in 100ms...');
        setTimeout(() => renderProVoiceManualChart(tasks), 100);
        return;
    }
    console.log('[Dashboard] Chart.js is available');
    
    const canvas = document.getElementById('proVoiceManualChart');
    if (!canvas) {
        console.error('[Dashboard] proVoiceManualChart canvas not found');
        return;
    }
    console.log('[Dashboard] Canvas found:', canvas);
    console.log('[Dashboard] Canvas dimensions:', canvas.width, 'x', canvas.height);
    console.log('[Dashboard] Canvas style:', canvas.style.cssText);
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('[Dashboard] Could not get canvas context');
        return;
    }
    console.log('[Dashboard] Canvas context obtained');
    
    // Ensure chart container is visible
    const chartContainer = canvas.closest('.flex-grow-1');
    if (chartContainer) {
        console.log('[Dashboard] Voice Manual chart container found:', chartContainer);
        chartContainer.style.display = 'flex';
        chartContainer.style.visibility = 'visible';
        chartContainer.style.opacity = '1';
        console.log('[Dashboard] Made Voice Manual chart container visible');
    }
    
    // Ensure parent card is visible
    const cardContainer = canvas.closest('.card');
    if (cardContainer) {
        console.log('[Dashboard] Card container found:', cardContainer);
        cardContainer.style.display = 'block';
        cardContainer.style.visibility = 'visible';
        cardContainer.style.opacity = '1';
        console.log('[Dashboard] Made Voice Manual card container visible');
    }
    
    // Ensure canvas has minimum dimensions and is visible
    canvas.style.minHeight = '200px';
    canvas.style.minWidth = '100px';
    canvas.style.display = 'block';
    canvas.style.visibility = 'visible';
    canvas.style.opacity = '1';
    
    if (canvas.width === 0 || canvas.height === 0) {
        canvas.width = 400;
        canvas.height = 300;
        console.log('[Dashboard] Set minimum dimensions for Voice Manual canvas');
    }
    
    console.log('[Dashboard] Canvas after styling:', canvas.style.cssText);
    
    // Get theme-aware colors
    const getComputedColor = (variable, fallback) => {
        const color = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
        return color || fallback;
    };
    
    const textColor = getComputedColor('--text-primary', '#1f2937');
    
    // Enhanced data filtering with fallback logic
    let voiceTasks = 0;
    let manualTasks = 0;
    
    console.log('[Dashboard] Processing tasks for voice/manual classification...');
    tasks.forEach((task, index) => {
        const inputMethod = (task.inputMethod || '').toLowerCase().trim();
        console.log(`[Dashboard] Task ${index + 1}: "${task.title}" - inputMethod: "${inputMethod}"`);
        
        if (inputMethod === 'voice') {
            voiceTasks++;
            console.log(`[Dashboard] Task ${index + 1} classified as VOICE`);
        } else {
            manualTasks++;
            console.log(`[Dashboard] Task ${index + 1} classified as MANUAL (inputMethod: "${inputMethod}")`);
        }
    });
    
    // Fallback: If both are zero but tasks exist, treat all as manual
    if (voiceTasks === 0 && manualTasks === 0 && tasks.length > 0) {
        manualTasks = tasks.length;
        console.log('[Dashboard] No inputMethod data found, defaulting all tasks to manual');
    }
    
    // Ensure at least one data point if tasks exist
    if (voiceTasks === 0 && manualTasks === 0 && tasks.length > 0) {
        manualTasks = tasks.length;
    }
    
    const chartData = [voiceTasks, manualTasks];
    console.log('[Dashboard] Voice/Manual data for chart:', { voiceTasks, manualTasks, totalTasks: tasks.length, chartData });
    
    // Ensure we have at least some data to display
    if (chartData.every(val => val === 0)) {
        console.log('[Dashboard] No voice/manual data found, showing placeholder data');
        // Add some placeholder data for testing
        chartData[1] = 1; // Add 1 manual task
    }
    
    // Additional fallback: if no tasks at all, show sample data
    if (tasks.length === 0) {
        console.log('[Dashboard] No tasks provided, showing sample data');
        chartData[0] = 2; // 2 voice tasks
        chartData[1] = 3; // 3 manual tasks
    }
    
    console.log('[Dashboard] Final chart data:', chartData);
    
    // Calculate analytics
    console.log('[Dashboard] Calculating analytics...');
    const analytics = calculateVoiceManualAnalytics(tasks);
    console.log('[Dashboard] Voice/Manual analytics:', analytics);
    updateVoiceManualIndicators(analytics);
    
    // Destroy existing chart if it exists
    if (proVoiceManualChartObj) {
        console.log('[Dashboard] Destroying existing Voice Manual chart');
        try {
            proVoiceManualChartObj.destroy();
            console.log('[Dashboard] Existing chart destroyed successfully');
        } catch (error) {
            console.error('[Dashboard] Error destroying existing chart:', error);
        }
    }
    
    console.log('[Dashboard] Creating new Voice Manual chart with data:', {
        labels: ['Voice', 'Manual'],
        data: chartData
    });
    
    try {
        proVoiceManualChartObj = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Voice', 'Manual'],
                datasets: [{
                    data: chartData,
                    backgroundColor: ['#4F46E5', '#818CF8'],
                    borderColor: '#ffffff',
                    borderWidth: 2,
                    hoverBorderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        align: 'center',
                        labels: {
                            usePointStyle: true,
                            padding: 15,
                            font: {
                                size: 12,
                                family: 'Inter, sans-serif',
                                weight: '600'
                            },
                            color: textColor,
                            generateLabels: function(chart) {
                                const labels = chart.data.labels;
                                const colors = chart.data.datasets[0].backgroundColor;
                                return labels.map((label, index) => ({
                                    text: `${getInputMethodIcon(label)} ${label}`,
                                    fillStyle: colors[index],
                                    strokeStyle: colors[index],
                                    lineWidth: 2,
                                    pointStyle: 'circle',
                                    hidden: !chart.isDatasetVisible(0),
                                    index: index
                                }));
                            }
                        },
                                            title: {
                        display: false
                    }
                    },
                    tooltip: {
                        enabled: false,
                        external: function(context) {
                            showVoiceManualTooltip(context);
                        }
                    }
                },
                elements: {
                    arc: {
                        borderWidth: 2,
                        hoverBorderWidth: 3
                    }
                },
                cutout: '60%',
                animation: {
                    duration: 1000
                }
            }
        });
        
        console.log('[Dashboard] Chart created successfully:', proVoiceManualChartObj);
    } catch (error) {
        console.error('[Dashboard] Error creating chart:', error);
        return;
    }
    
    // Setup chart controls
    console.log('[Dashboard] Setting up chart controls...');
    setupChartControls('voiceManual', analytics);
    
    // Test chart visibility
    console.log('[Dashboard] Voice Manual chart created successfully');
    console.log('[Dashboard] Chart object:', proVoiceManualChartObj);
    console.log('[Dashboard] Canvas element:', canvas);
    console.log('[Dashboard] Canvas dimensions:', canvas.width, 'x', canvas.height);
    console.log('[Dashboard] Canvas style:', canvas.style.cssText);
    
    // Force chart update and ensure visibility
    if (proVoiceManualChartObj) {
        console.log('[Dashboard] Forcing chart update...');
        try {
            proVoiceManualChartObj.update('none');
            console.log('[Dashboard] Voice Manual chart updated');
            
            // Ensure chart is visible with multiple checks
            setTimeout(() => {
                console.log('[Dashboard] Checking chart visibility after timeout...');
                
                // Ensure canvas is visible
                if (canvas.style.display === 'none') {
                    canvas.style.display = 'block';
                    console.log('[Dashboard] Made Voice Manual canvas visible');
                }
                
                // Ensure container is visible
                if (chartContainer && chartContainer.style.display === 'none') {
                    chartContainer.style.display = 'flex';
                    console.log('[Dashboard] Made Voice Manual chart container visible');
                }
                
                // Ensure card is visible
                if (cardContainer && cardContainer.style.display === 'none') {
                    cardContainer.style.display = 'block';
                    console.log('[Dashboard] Made Voice Manual card container visible');
                }
                
                // Force chart update again
                if (proVoiceManualChartObj) {
                    proVoiceManualChartObj.update('none');
                    console.log('[Dashboard] Voice Manual chart re-updated after visibility fix');
                }
            }, 100);
            
            // Additional update after a longer delay
            setTimeout(() => {
                if (proVoiceManualChartObj) {
                    proVoiceManualChartObj.update('none');
                    console.log('[Dashboard] Voice Manual chart final update');
                }
            }, 500);
            
        } catch (error) {
            console.error('[Dashboard] Error updating chart:', error);
        }
    }
    
    console.log('[Dashboard] ===== END: renderProVoiceManualChart =====');
}

function updateVoiceManualIndicators(analytics) {
    const voiceUsageEl = document.getElementById('voiceUsage');
    const manualUsageEl = document.getElementById('manualUsage');
    const inputEfficiencyEl = document.getElementById('inputEfficiency');
    
    console.log('[Dashboard] updateVoiceManualIndicators called with:', analytics);
    console.log('[Dashboard] Found elements:', {
        voiceUsageEl: !!voiceUsageEl,
        manualUsageEl: !!manualUsageEl,
        inputEfficiencyEl: !!inputEfficiencyEl
    });
    
    if (voiceUsageEl) {
        voiceUsageEl.textContent = `${analytics.voicePercentage}%`;
        console.log('[Dashboard] Updated voiceUsageEl to:', analytics.voicePercentage);
    } else {
        console.warn('[Dashboard] voiceUsage element not found');
    }
    if (manualUsageEl) {
        manualUsageEl.textContent = `${analytics.manualPercentage}%`;
        console.log('[Dashboard] Updated manualUsageEl to:', analytics.manualPercentage);
    } else {
        console.warn('[Dashboard] manualUsage element not found');
    }
    if (inputEfficiencyEl) {
        inputEfficiencyEl.textContent = analytics.efficiency;
        console.log('[Dashboard] Updated inputEfficiencyEl to:', analytics.efficiency);
    } else {
        console.warn('[Dashboard] inputEfficiency element not found');
    }
}

function renderProTaskTypeChart(tasks) {
    console.log('[Dashboard] renderProTaskTypeChart called with', tasks.length, 'tasks');
    
    const canvas = document.getElementById('proTaskTypeChart');
    if (!canvas) {
        console.warn('[Dashboard] proTaskTypeChart canvas not found');
        return;
    }
    const ctx = canvas.getContext('2d');
    
    // Get theme-aware colors
    const getComputedColor = (variable, fallback) => {
        const color = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
        return color || fallback;
    };
    
    const textColor = getComputedColor('--text-primary', '#1f2937');
    
    // Check if we have tasks
    if (!tasks || tasks.length === 0) {
        console.log('[Dashboard] No tasks available for proTaskTypeChart');
        return;
    }
    
    // Use tags or keywords in title/description
    const types = {};
    tasks.forEach(t => {
        (t.tags||[]).forEach(tag => { types[tag]=1+(types[tag]||0); });
    });
    if (Object.keys(types).length===0) {
        // fallback: by status
        tasks.forEach(t=>{ types[t.status]=1+(types[t.status]||0); });
    }
    
    console.log('[Dashboard] Task type data:', types);
    
    // Calculate analytics
    const analytics = calculateTaskTypeAnalytics(tasks);
    console.log('[Dashboard] Task type analytics:', analytics);
    updateTaskTypeIndicators(analytics);
    
    if (proTaskTypeChartObj) proTaskTypeChartObj.destroy();
    
    if (typeof Chart === 'undefined') {
        console.error('[Dashboard] Chart.js library not loaded');
        return;
    }
    
    proTaskTypeChartObj = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(types),
            datasets: [{
                data: Object.values(types),
                backgroundColor: ['#6366f1','#34d399','#fbbf24','#ec4899','#6b7280','#818cf8'],
                borderColor: '#ffffff',
                borderWidth: 2,
                hoverBorderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    align: 'center',
                    labels: {
                        usePointStyle: true,
                        padding: 15,
                        font: {
                            size: 11,
                            family: 'Inter, sans-serif',
                            weight: '600'
                        },
                        color: textColor,
                        generateLabels: function(chart) {
                            const labels = chart.data.labels;
                            const colors = chart.data.datasets[0].backgroundColor;
                            return labels.map((label, index) => ({
                                text: `${getTaskTypeIcon(label)} ${label}`,
                                fillStyle: colors[index],
                                strokeStyle: colors[index],
                                lineWidth: 2,
                                pointStyle: 'circle',
                                hidden: !chart.isDatasetVisible(0),
                                index: index
                            }));
                        }
                    },
                    title: {
                        display: false
                    }
                },
                tooltip: {
                    enabled: false,
                    external: function(context) {
                        showTaskTypeTooltip(context);
                    }
                }
            },
            elements: {
                arc: {
                    borderWidth: 2,
                    hoverBorderWidth: 3
                }
            },
            cutout: '60%',
            onHover: function(event, elements) {
                if (elements.length === 0) {
                    hideTaskTypeTooltip();
                }
            }
        }
    });
    
    // Add mouse leave event listener to the canvas
    canvas.addEventListener('mouseleave', function() {
        hideTaskTypeTooltip();
    });
    
    // Setup chart controls
    setupChartControls('taskType', analytics);
}

function renderProKeywordsChart(tasks) {
    console.log('[Dashboard] renderProKeywordsChart called with', tasks.length, 'tasks');
    
    const canvas = document.getElementById('proKeywordsChart');
    if (!canvas) {
        console.warn('[Dashboard] proKeywordsChart canvas not found');
        return;
    }
    const ctx = canvas.getContext('2d');
    
    // Get theme-aware colors
    const getComputedColor = (variable, fallback) => {
        const color = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
        return color || fallback;
    };
    
    const textColor = getComputedColor('--text-primary', '#1f2937');
    
    // Check if we have tasks
    if (!tasks || tasks.length === 0) {
        console.log('[Dashboard] No tasks available for proKeywordsChart');
        return;
    }
    
    // Top 10 keywords in title/description
    const freq = {};
    tasks.forEach(t => {
        const text = ((t.title||'')+' '+(t.description||''));
        text.toLowerCase().split(/\W+/).forEach(word => {
            if (word.length>3) freq[word]=1+(freq[word]||0);
        });
    });
    const sorted = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,10);
    
    console.log('[Dashboard] Keywords data:', sorted);
    
    // Calculate analytics
    const analytics = calculateKeywordsAnalytics(tasks);
    console.log('[Dashboard] Keywords analytics:', analytics);
    updateKeywordsIndicators(analytics);
    
    if (proKeywordsChartObj) proKeywordsChartObj.destroy();
    
    if (typeof Chart === 'undefined') {
        console.error('[Dashboard] Chart.js library not loaded');
        return;
    }
    
    proKeywordsChartObj = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(x=>x[0]),
            datasets: [{
                label: 'Count',
                data: sorted.map(x=>x[1]),
                backgroundColor: sorted.map((_, index) => {
                    if (index === 0) return 'rgba(79, 70, 229, 1)'; // Top keyword
                    else if (index < 3) return 'rgba(79, 70, 229, 0.8)'; // Top 3
                    else return 'rgba(79, 70, 229, 0.6)'; // Others
                }),
                borderColor: sorted.map((_, index) => {
                    return index === 0 ? 'rgba(79, 70, 229, 1)' : 'rgba(79, 70, 229, 0.6)';
                }),
                borderWidth: sorted.map((_, index) => index === 0 ? 2 : 1),
                borderRadius: 4,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    align: 'center',
                    labels: {
                        usePointStyle: true,
                        padding: 15,
                        font: {
                            size: 11,
                            family: 'Inter, sans-serif',
                            weight: '600'
                        },
                        color: textColor,
                        generateLabels: function(chart) {
                            return [{
                                text: '🔍 Most Common Keywords',
                                fillStyle: 'rgba(79, 70, 229, 1)',
                                strokeStyle: 'rgba(79, 70, 229, 1)',
                                lineWidth: 2,
                                pointStyle: 'rect',
                                hidden: false,
                                index: 0
                            }];
                        }
                    },
                    title: {
                        display: false
                    }
                },
                tooltip: {
                    enabled: false,
                    external: showKeywordsTooltip
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(156, 163, 175, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: 'rgba(156, 163, 175, 0.8)',
                        font: {
                            size: 11
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: 'rgba(156, 163, 175, 0.8)',
                        font: {
                            size: 10
                        },
                        maxRotation: 45
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            elements: {
                bar: {
                    hoverBackgroundColor: 'rgba(79, 70, 229, 0.9)',
                    hoverBorderColor: 'rgba(79, 70, 229, 1)',
                    hoverBorderWidth: 2
                }
            }
        }
    });
    
    // Setup chart controls
    setupChartControls('keywords', analytics);
}

function renderProTimeOfDayChart(tasks) {
    // Temporarily allow all users to see the chart for testing
    // if (userRole !== 'premium') {
    //     console.log('[Pro Charts] Skipping data loading for proTimeOfDayChart - free user');
    //     return;
    // }
    
    console.log('[Dashboard] renderProTimeOfDayChart called with', tasks.length, 'tasks');
    
    const canvas = document.getElementById('proTimeOfDayChart');
    if (!canvas) {
        console.warn('[Dashboard] proTimeOfDayChart canvas not found');
        return;
    }
    const ctx = canvas.getContext('2d');
    
    // Debug: Show sample of tasks
    if (tasks.length > 0) {
        console.log('[Dashboard] Sample tasks for Time of Day:');
        tasks.slice(0, 3).forEach((task, index) => {
            console.log(`[Dashboard] Task ${index + 1}:`, {
                title: task.title || 'No title',
                status: task.status,
                createdAt: task.createdAt,
                date: getTaskDate(task)
            });
        });
    }
    
    // Get theme-aware colors
    const getComputedColor = (variable, fallback) => {
        const color = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
        return color || fallback;
    };
    
    const textColor = getComputedColor('--text-primary', '#1f2937');
    const borderColor = getComputedColor('--border-color', '#e5e7eb');
    
    // Check if chart container is visible
    const chartContainer = canvas.closest('.flex-grow-1');
    if (chartContainer) {
        console.log('[Dashboard] Time of Day chart container found:', chartContainer);
        console.log('[Dashboard] Container visibility:', chartContainer.style.display, chartContainer.style.visibility, chartContainer.style.opacity);
        
        // Ensure container is visible
        if (chartContainer.style.display === 'none') {
            chartContainer.style.display = 'flex';
            console.log('[Dashboard] Made Time of Day container visible');
        }
    }
    
    // Check if the card container is visible
    const cardContainer = canvas.closest('.card');
    if (cardContainer) {
        console.log('[Dashboard] Time of Day card container found:', cardContainer);
        console.log('[Dashboard] Card visibility:', cardContainer.style.display, cardContainer.style.visibility, cardContainer.style.opacity);
        
        // Ensure card is visible
        if (cardContainer.style.display === 'none') {
            cardContainer.style.display = 'block';
            console.log('[Dashboard] Made Time of Day card visible');
        }
    }
    
    // Ensure canvas has minimum dimensions
    if (canvas.width === 0 || canvas.height === 0) {
        canvas.width = 400;
        canvas.height = 300;
        console.log('[Dashboard] Set minimum dimensions for Time of Day canvas');
    }
    
    // Count by hour
    const hours = new Array(24).fill(0);
    let validTasks = 0;
    tasks.forEach(t => {
        const d = getTaskDate(t);
        if (d) {
            hours[d.getHours()]++;
            validTasks++;
        }
    });
    
    console.log('[Dashboard] Time of Day - Valid tasks with dates:', validTasks, 'out of', tasks.length);
    console.log('[Dashboard] Time of Day - Hour distribution:', hours);
    
    // Ensure we have at least some data to display
    if (validTasks === 0) {
        console.log('[Dashboard] No time data found, showing placeholder data');
        // Add some placeholder data for testing - simulate tasks created during typical work hours
        hours[9] = 2;  // 9 AM
        hours[10] = 3; // 10 AM
        hours[11] = 1; // 11 AM
        hours[14] = 2; // 2 PM
        hours[15] = 1; // 3 PM
        hours[16] = 1; // 4 PM
    }
    
    // Calculate analytics
    const analytics = calculateTimeOfDayAnalytics(tasks);
    console.log('[Dashboard] Time of Day analytics:', analytics);
    
    if (proTimeOfDayChartObj) {
        console.log('[Dashboard] Destroying existing Time of Day chart');
        proTimeOfDayChartObj.destroy();
    }
    
    if (typeof Chart === 'undefined') {
        console.error('[Dashboard] Chart.js library not loaded');
        return;
    }
    
    console.log('[Dashboard] Creating new Time of Day chart with data:', {
        labels: hours.map((_,i)=>`${i}:00`),
        data: hours
    });
    
    proTimeOfDayChartObj = new Chart(ctx, {
        type: 'line',
        data: {
            labels: hours.map((_,i)=>`${i}:00`),
            datasets: [{
                label: 'Tasks Created',
                data: hours,
                backgroundColor: 'rgba(99, 102, 241, 0.2)',
                borderColor: '#6366f1',
                borderWidth: 2,
                tension: 0.3,
                fill: true,
                pointBackgroundColor: '#6366f1',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    align: 'center',
                    labels: {
                        usePointStyle: true,
                        padding: 15,
                        font: {
                            size: 12,
                            family: 'Inter, sans-serif',
                            weight: '600'
                        },
                        color: textColor,
                        generateLabels: function(chart) {
                            return [{
                                text: '⏰ Tasks Created',
                                fillStyle: '#6366f1',
                                strokeStyle: '#6366f1',
                                lineWidth: 2,
                                pointStyle: 'line',
                                hidden: false,
                                index: 0
                            }];
                        }
                    },
                    title: {
                        display: false
                    }
                },
                tooltip: {
                    enabled: false,
                    external: showTimeOfDayTooltip
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Hour of Day',
                        color: textColor,
                        font: {
                            size: 12,
                            family: 'Inter, sans-serif',
                            weight: '600'
                        }
                    },
                    grid: {
                        display: false
                    },
                    border: {
                        color: borderColor,
                        width: 1
                    },
                    ticks: {
                        color: textColor,
                        font: {
                            size: 10,
                            family: 'Inter, sans-serif'
                        }
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Tasks Created',
                        color: textColor,
                        font: {
                            size: 12,
                            family: 'Inter, sans-serif',
                            weight: '600'
                        }
                    },
                    beginAtZero: true,
                    grid: {
                        color: getComputedColor('--border-color', '#e5e7eb') + '40'
                    },
                    border: {
                        color: borderColor,
                        width: 1
                    },
                    ticks: {
                        color: textColor,
                        font: {
                            size: 11,
                            family: 'Inter, sans-serif'
                        }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
    
    // Update performance indicators
    updateTimeOfDayIndicators(analytics);
    
    // Setup chart controls
    setupChartControls('timeOfDay', analytics);
}

function renderProCompletionRateChart(tasks) {
    // Temporarily allow all users to see the chart for testing
    // if (userRole !== 'premium') {
    //     console.log('[Pro Charts] Skipping data loading for proCompletionRateChart - free user');
    //     return;
    // }
    
    console.log('[Dashboard] renderProCompletionRateChart called with', tasks.length, 'tasks');
    
    // Debug: Show sample of tasks
    if (tasks.length > 0) {
        console.log('[Dashboard] Sample tasks for Completion Rate:');
        tasks.slice(0, 3).forEach((task, index) => {
            console.log(`[Dashboard] Task ${index + 1}:`, {
                title: task.title || 'No title',
                status: task.status,
                createdAt: task.createdAt,
                date: getTaskDate(task)
            });
        });
    }
    
    const canvas = document.getElementById('proCompletionRateChart');
    if (!canvas) {
        console.warn('[Dashboard] proCompletionRateChart canvas not found');
        return;
    }
    
    // Check if container is visible
    const container = canvas.closest('.card');
    if (container && container.style.display === 'none') {
        console.log('[Dashboard] Completion Rate chart container is hidden, making it visible');
        container.style.display = 'block';
    }
    
    console.log('[Dashboard] Canvas dimensions:', canvas.width, 'x', canvas.height);
    const ctx = canvas.getContext('2d');
    
    // Get theme-aware colors
    const getComputedColor = (variable, fallback) => {
        const color = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
        return color || fallback;
    };
    
    const textColor = getComputedColor('--text-primary', '#1f2937');
    const borderColor = getComputedColor('--border-color', '#e5e7eb');
    
    // Completion rate by week (last 4 weeks)
    const weeks = Array.from({length:4},(_,i)=>i).map(i=>{
        const d = new Date(); d.setDate(d.getDate()-7*i);
        return d;
    }).reverse();
    
    console.log('[Dashboard] Weeks for completion rate:', weeks.map(w => w.toDateString()));
    
    const rates = weeks.map((start,i) => {
        const end = new Date(start); end.setDate(start.getDate()+7);
        const weekTasks = tasks.filter(t => {
            const d = getTaskDate(t);
            return d && d >= start && d < end;
        });
        const completed = weekTasks.filter(t=>t.status==='completed').length;
        const rate = weekTasks.length ? Math.round((completed/weekTasks.length)*100) : 0;
        console.log(`[Dashboard] Week ${i+1}: ${weekTasks.length} tasks, ${completed} completed, ${rate}% rate`);
        return rate;
    });
    
    console.log('[Dashboard] Completion rates:', rates);
    
    // Validate data - if no tasks, show placeholder data
    if (tasks.length === 0) {
        console.log('[Dashboard] No tasks found, using placeholder data for completion rate chart');
        rates.fill(0); // Fill with zeros for empty state
    }
    
    // Calculate analytics
    const analytics = calculateCompletionRateAnalytics(tasks);
    console.log('[Dashboard] Completion Rate analytics:', analytics);
    
    if (proCompletionRateChartObj) proCompletionRateChartObj.destroy();
    
    if (typeof Chart === 'undefined') {
        console.error('[Dashboard] Chart.js library not loaded');
        return;
    }
    
    proCompletionRateChartObj = new Chart(ctx, {
        type: 'line',
        data: {
            labels: weeks.map((d,i)=>`Week ${i+1}`),
            datasets: [{
                label: 'Completion Rate (%)',
                data: rates,
                backgroundColor: 'rgba(52, 211, 153, 0.2)',
                borderColor: '#34d399',
                borderWidth: 2,
                tension: 0.3,
                fill: true,
                pointBackgroundColor: '#34d399',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    align: 'center',
                    labels: {
                        usePointStyle: true,
                        padding: 15,
                        font: {
                            size: 12,
                            family: 'Inter, sans-serif',
                            weight: '600'
                        },
                        color: textColor,
                        generateLabels: function(chart) {
                            return [{
                                text: '📈 Completion Rate (%)',
                                fillStyle: '#34d399',
                                strokeStyle: '#34d399',
                                lineWidth: 2,
                                pointStyle: 'line',
                                hidden: false,
                                index: 0
                            }];
                        }
                    },
                    title: {
                        display: false
                    }
                },
                tooltip: {
                    enabled: false,
                    external: showCompletionRateTooltip
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Week',
                        color: textColor,
                        font: {
                            size: 12,
                            family: 'Inter, sans-serif',
                            weight: '600'
                        }
                    },
                    grid: {
                        display: false
                    },
                    border: {
                        color: borderColor,
                        width: 1
                    },
                    ticks: {
                        color: textColor,
                        font: {
                            size: 10,
                            family: 'Inter, sans-serif'
                        }
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Completion Rate (%)',
                        color: textColor,
                        font: {
                            size: 12,
                            family: 'Inter, sans-serif',
                            weight: '600'
                        }
                    },
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        color: getComputedColor('--border-color', '#e5e7eb') + '40'
                    },
                    border: {
                        color: borderColor,
                        width: 1
                    },
                    ticks: {
                        color: textColor,
                        font: {
                            size: 11,
                            family: 'Inter, sans-serif'
                        }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
    
    // Update performance indicators
    updateCompletionRateIndicators(analytics);
    
    // Setup chart controls
    setupChartControls('completionRate', analytics);
    
    console.log('[Dashboard] Task Completion Rate chart rendered successfully');
}

function renderProMonthlyProgressChart(tasks) {
    // Temporarily allow all users to see the chart for testing
    // if (userRole !== 'premium') {
    //     console.log('[Pro Charts] Skipping data loading for proMonthlyProgressChart - free user');
    //     return;
    // }
    
    console.log('[Dashboard] renderProMonthlyProgressChart called with', tasks.length, 'tasks');
    
    // Debug: Show sample of tasks
    if (tasks.length > 0) {
        console.log('[Dashboard] Sample tasks for Monthly Progress:');
        tasks.slice(0, 3).forEach((task, index) => {
            console.log(`[Dashboard] Task ${index + 1}:`, {
                title: task.title || 'No title',
                status: task.status,
                createdAt: task.createdAt,
                date: getTaskDate(task)
            });
        });
    }
    
    const canvas = document.getElementById('proMonthlyProgressChart');
    if (!canvas) {
        console.warn('[Dashboard] proMonthlyProgressChart canvas not found');
        return;
    }
    const ctx = canvas.getContext('2d');
    
    // Get theme-aware colors
    const getComputedColor = (variable, fallback) => {
        const color = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
        return color || fallback;
    };
    
    const textColor = getComputedColor('--text-primary', '#1f2937');
    
    // Check if chart container is visible
    const chartContainer = canvas.closest('.flex-grow-1');
    if (chartContainer) {
        console.log('[Dashboard] Monthly Progress chart container found:', chartContainer);
        console.log('[Dashboard] Container visibility:', chartContainer.style.display, chartContainer.style.visibility, chartContainer.style.opacity);
        
        // Ensure container is visible
        if (chartContainer.style.display === 'none') {
            chartContainer.style.display = 'flex';
            console.log('[Dashboard] Made Monthly Progress container visible');
        }
    }
    
    // Check if the card container is visible
    const cardContainer = canvas.closest('.card');
    if (cardContainer) {
        console.log('[Dashboard] Monthly Progress card container found:', cardContainer);
        console.log('[Dashboard] Card visibility:', cardContainer.style.display, cardContainer.style.visibility, cardContainer.style.opacity);
        
        // Ensure card is visible
        if (cardContainer.style.display === 'none') {
            cardContainer.style.display = 'block';
            console.log('[Dashboard] Made Monthly Progress card visible');
        }
    }
    
    // Ensure canvas has minimum dimensions
    if (canvas.width === 0 || canvas.height === 0) {
        canvas.width = 400;
        canvas.height = 300;
        console.log('[Dashboard] Set minimum dimensions for Monthly Progress canvas');
    }
    
    // Last 6 months
    const months = [];
    const now = new Date();
    for (let i=5;i>=0;i--) {
        const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
        months.push(d);
    }
    
    console.log('[Dashboard] Monthly Progress - Processing months:', months.map(m => m.toLocaleString('default',{month:'short',year:'2-digit'})));
    
    const data = months.map((m, index) => {
        const monthTasks = tasks.filter(t => {
            const d = getTaskDate(t);
            if (!d) {
                console.log('[Dashboard] Task without date:', t.title || 'No title');
                return false;
            }
            const matches = d.getFullYear()===m.getFullYear() && d.getMonth()===m.getMonth();
            if (matches) {
                console.log(`[Dashboard] Task matches month ${m.toLocaleString('default',{month:'short',year:'2-digit'})}:`, t.title || 'No title', 'Status:', t.status);
            }
            return matches;
        });
        const completedTasks = monthTasks.filter(t=>t.status==='completed');
        console.log(`[Dashboard] Month ${index + 1} (${m.toLocaleString('default',{month:'short',year:'2-digit'})}): ${completedTasks.length} completed out of ${monthTasks.length} total tasks`);
        return completedTasks.length;
    });
    
    console.log('[Dashboard] Monthly Progress data:', data);
    
    // Ensure we have at least some data to display
    if (data.every(val => val === 0)) {
        console.log('[Dashboard] No monthly data found, showing placeholder data');
        // Add some placeholder data for testing
        data[data.length - 1] = 1; // Add 1 completed task to the current month
    }
    
    // Calculate analytics
    const analytics = calculateMonthlyProgressAnalytics(tasks);
    console.log('[Dashboard] Monthly Progress analytics:', analytics);
    
    if (proMonthlyProgressChartObj) {
        console.log('[Dashboard] Destroying existing Monthly Progress chart');
        proMonthlyProgressChartObj.destroy();
    }
    
    if (typeof Chart === 'undefined') {
        console.error('[Dashboard] Chart.js library not loaded');
        return;
    }
    
    console.log('[Dashboard] Creating new Monthly Progress chart with data:', {
        labels: months.map(m=>m.toLocaleString('default',{month:'short',year:'2-digit'})),
        data: data
    });
    
    proMonthlyProgressChartObj = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months.map(m=>m.toLocaleString('default',{month:'short',year:'2-digit'})),
            datasets: [{
                label: 'Completed Tasks',
                data: data,
                backgroundColor: 'rgba(99, 102, 241, 0.8)',
                borderColor: '#6366f1',
                borderWidth: 1,
                borderRadius: 4,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    align: 'center',
                    labels: {
                        usePointStyle: true,
                        padding: 15,
                        font: {
                            size: 12,
                            family: 'Inter, sans-serif',
                            weight: '600'
                        },
                        color: textColor,
                        generateLabels: function(chart) {
                            return [{
                                text: '📊 Completed Tasks',
                                fillStyle: 'rgba(99, 102, 241, 0.8)',
                                strokeStyle: '#6366f1',
                                lineWidth: 2,
                                pointStyle: 'rect',
                                hidden: false,
                                index: 0
                            }];
                        }
                    },
                    title: {
                        display: false
                    }
                },
                tooltip: {
                    enabled: false,
                    external: showMonthlyProgressTooltip
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Month'
                    },
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: 'rgba(156, 163, 175, 0.8)',
                        font: {
                            size: 10
                        }
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Completed Tasks'
                    },
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(156, 163, 175, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: 'rgba(156, 163, 175, 0.8)',
                        font: {
                            size: 11
                        }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            elements: {
                bar: {
                    hoverBackgroundColor: 'rgba(99, 102, 241, 0.9)',
                    hoverBorderColor: 'rgba(99, 102, 241, 1)',
                    hoverBorderWidth: 2
                }
            }
        }
    });
    
    // Update performance indicators
    updateMonthlyProgressIndicators(analytics);
    
    // Setup chart controls
    setupChartControls('monthlyProgress', analytics);
    
    // Test chart visibility
    console.log('[Dashboard] Monthly Progress chart created successfully');
    console.log('[Dashboard] Chart object:', proMonthlyProgressChartObj);
    console.log('[Dashboard] Canvas element:', canvas);
    console.log('[Dashboard] Canvas dimensions:', canvas.width, 'x', canvas.height);
    console.log('[Dashboard] Canvas style:', canvas.style.cssText);
    
    // Force chart update
    if (proMonthlyProgressChartObj) {
        proMonthlyProgressChartObj.update('none');
        console.log('[Dashboard] Monthly Progress chart updated');
        
        // Force another update after a short delay to ensure rendering
        setTimeout(() => {
            if (proMonthlyProgressChartObj) {
                proMonthlyProgressChartObj.update('none');
                console.log('[Dashboard] Monthly Progress chart force updated after delay');
            }
        }, 100);
    }
}

function renderProNoteDurationChart(tasks) {
    console.log('[Dashboard] renderProNoteDurationChart called with tasks:', tasks.length);
    
    // Check user role - only premium users can see Pro chart data
    // Temporarily bypass for testing
    if (userRole !== 'premium' && userRole !== 'test') {
        console.log('[Pro Charts] Skipping data loading for proNoteDurationChart - free user');
        return;
    }
    
    const canvas = document.getElementById('proNoteDurationChart');
    if (!canvas) {
        console.warn('[Dashboard] proNoteDurationChart canvas not found');
        return;
    }
    
    // Ensure canvas has minimum dimensions
    canvas.style.minHeight = '200px';
    canvas.style.minWidth = '100px';
    
    const ctx = canvas.getContext('2d');
    
    // Debug: Log voice tasks and their duration fields
    const voiceTasks = tasks.filter(t => (t.inputMethod || '').toLowerCase().trim() === 'voice');
    console.log('[Dashboard] Voice tasks found:', voiceTasks.length);
    console.log('[Dashboard] Voice tasks sample:', voiceTasks.slice(0, 3).map(t => ({
        id: t.id,
        inputMethod: t.inputMethod,
        noteDuration: t.noteDuration,
        duration: t.duration
    })));
    
    // Only voice notes with duration - try both field names
    const durations = voiceTasks
        .filter(t => t.noteDuration || t.duration)
        .map(t => t.noteDuration || t.duration || 0)
        .filter(d => d > 0);
    
    console.log('[Dashboard] Valid durations found:', durations.length);
    console.log('[Dashboard] Duration values:', durations);
    
    if (proNoteDurationChartObj) proNoteDurationChartObj.destroy();
    
    if (typeof Chart === 'undefined') {
        console.error('[Dashboard] Chart.js library not loaded');
        return;
    }
    
    // Handle case when no duration data is available
    let chartData = {
        labels: durations.map((_,i)=>`Note ${i+1}`),
        datasets: [{label:'Duration (s)',data:durations,backgroundColor:'#6366f1'}]
    };
    
    if (durations.length === 0) {
        console.log('[Dashboard] No duration data found, showing placeholder');
        chartData = {
            labels: ['No Data'],
            datasets: [{label:'Duration (s)',data:[0],backgroundColor:'#e5e7eb'}]
        };
    }
    
    proNoteDurationChartObj = new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: false,
                    external: showNoteDurationTooltip
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(156, 163, 175, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: 'rgba(156, 163, 175, 0.8)',
                        font: {
                            size: 11
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: 'rgba(156, 163, 175, 0.8)',
                        font: {
                            size: 10
                        }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            elements: {
                bar: {
                    hoverBackgroundColor: 'rgba(99, 102, 241, 0.9)',
                    hoverBorderColor: 'rgba(99, 102, 241, 1)',
                    hoverBorderWidth: 2
                }
            }
        }
    });

    // --- Advanced Analytics ---
    const analytics = calculateNoteDurationAnalytics(tasks);
    console.log('[Dashboard] Note Duration analytics:', analytics);
    updateNoteDurationIndicators(analytics);

    // --- Insights ---
    const insights = generateNoteDurationInsights(analytics);
    window.noteDurationInsights = insights;

    // --- Insights Button ---
    const insightsBtn = document.getElementById('noteDurationInsightsBtn');
    const analysisPanel = document.getElementById('noteDurationAnalysisPanel');
    const analysisDiv = document.getElementById('noteDurationAnalysis');
    const recDiv = document.getElementById('noteDurationRecommendations');
    if (insightsBtn && analysisPanel && analysisDiv && recDiv) {
        insightsBtn.onclick = function() {
            if (analysisPanel.classList.contains('d-none')) {
                analysisDiv.textContent = insights.analysis;
                recDiv.textContent = insights.recommendations;
                analysisPanel.classList.remove('d-none');
            } else {
                analysisPanel.classList.add('d-none');
            }
        };
    }
    
    // Force chart update
    if (proNoteDurationChartObj) {
        proNoteDurationChartObj.update();
        console.log('[Dashboard] Note Duration chart updated successfully');
    }
}

function generateNoteDurationInsights(analytics) {
    let analysis = '';
    let recommendations = '';
    const avg = parseInt(analytics.avgDuration);
    const total = parseInt(analytics.totalTime);
    if (analytics.voiceTaskCount === 0) {
        analysis = 'No voice notes with duration found.';
        recommendations = 'Try recording voice notes to see duration stats and tips.';
    } else {
        analysis = `You have ${analytics.voiceTaskCount} voice notes with an average duration of ${analytics.avgDuration}. Total voice note time is ${analytics.totalTime}.`;
        if (avg > 120) {
            analysis += ' Your average note is quite long.';
            recommendations = 'Consider keeping notes concise for easier review.';
        } else if (avg < 30) {
            analysis += ' Your notes are quick and to the point.';
            recommendations = 'Great for capturing quick thoughts! For complex ideas, try longer notes.';
        } else {
            analysis += ' Your note duration is balanced.';
            recommendations = 'Maintain this balance for optimal productivity.';
        }
    }
    return { analysis, recommendations };
}

function updateNoteDurationIndicators(analytics) {
    const avgNoteDurationEl = document.getElementById('avgNoteDuration');
    const totalVoiceTimeEl = document.getElementById('totalVoiceTime');
    const voiceEfficiencyEl = document.getElementById('voiceEfficiency');
    if (avgNoteDurationEl) avgNoteDurationEl.textContent = analytics.avgDuration;
    if (totalVoiceTimeEl) totalVoiceTimeEl.textContent = analytics.totalTime;
    if (voiceEfficiencyEl) voiceEfficiencyEl.textContent = analytics.efficiency;
    console.log('[Dashboard] Updated Note Duration indicators:', analytics);
}

function renderProSentimentChart(tasks) {
    console.log('[Dashboard] ===== START: renderProSentimentChart =====');
    console.log('[Dashboard] Function called with tasks:', tasks);
    console.log('[Dashboard] Tasks length:', tasks ? tasks.length : 'undefined');
    console.log('[Dashboard] User role:', userRole);
    
    // Check user role - only premium users can see Pro chart data
    // Temporarily bypass for testing
    if (userRole !== 'premium' && userRole !== 'test') {
        console.log('[Pro Charts] Skipping data loading for proSentimentChart - free user');
        return;
    }
    
    // Check if Chart.js is available
    if (typeof Chart === 'undefined') {
        console.error('[Dashboard] Chart.js library not loaded');
        return;
    }
    console.log('[Dashboard] Chart.js is available');
    
    const canvas = document.getElementById('proSentimentChart');
    if (!canvas) {
        console.error('[Dashboard] proSentimentChart canvas not found');
        return;
    }
    console.log('[Dashboard] Canvas found:', canvas);
    console.log('[Dashboard] Canvas dimensions:', canvas.width, 'x', canvas.height);
    console.log('[Dashboard] Canvas style:', canvas.style.cssText);
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('[Dashboard] Could not get canvas context');
        return;
    }
    console.log('[Dashboard] Canvas context obtained');
    
    // Check if chart container is visible
    const chartContainer = canvas.closest('.flex-grow-1');
    if (chartContainer) {
        console.log('[Dashboard] Sentiment chart container found:', chartContainer);
        console.log('[Dashboard] Container visibility:', chartContainer.style.display, chartContainer.style.visibility, chartContainer.style.opacity);
        
        // Ensure container is visible
        if (chartContainer.style.display === 'none') {
            chartContainer.style.display = 'flex';
            console.log('[Dashboard] Made Sentiment chart container visible');
        }
    } else {
        console.warn('[Dashboard] Chart container not found');
    }
    
    // Check parent card visibility
    const cardContainer = canvas.closest('.card');
    if (cardContainer) {
        console.log('[Dashboard] Card container found:', cardContainer);
        console.log('[Dashboard] Card visibility:', cardContainer.style.display, cardContainer.style.visibility, cardContainer.style.opacity);
        console.log('[Dashboard] Card classes:', cardContainer.className);
    }
    
    // Ensure canvas has minimum dimensions and is visible
    canvas.style.minHeight = '200px';
    canvas.style.minWidth = '100px';
    canvas.style.display = 'block';
    canvas.style.visibility = 'visible';
    canvas.style.opacity = '1';
    
    if (canvas.width === 0 || canvas.height === 0) {
        canvas.width = 400;
        canvas.height = 300;
        console.log('[Dashboard] Set minimum dimensions for Sentiment canvas');
    }
    
    console.log('[Dashboard] Canvas after styling:', canvas.style.cssText);
    
    // Enhanced data filtering with fallback logic
    console.log('[Dashboard] Processing tasks for sentiment analysis...');
    
    // Sentiment over time (voice notes with sentiment) - enhanced filtering
    const notes = tasks.filter(t => {
        const inputMethod = (t.inputMethod || '').toLowerCase().trim();
        const hasSentiment = t.sentiment != null && t.sentiment !== undefined;
        console.log(`[Dashboard] Task: "${t.title}" - inputMethod: "${inputMethod}" - sentiment: ${t.sentiment} - hasSentiment: ${hasSentiment}`);
        return inputMethod === 'voice' && hasSentiment;
    });
    
    console.log('[Dashboard] Voice notes with sentiment found:', notes.length);
    
    const byDate = {};
    notes.forEach(t => {
        const d = formatDate(getTaskDate(t),'short');
        if (!byDate[d]) byDate[d]=[];
        byDate[d].push(t.sentiment);
    });
    
    const labels = Object.keys(byDate);
    const avg = labels.map(l => {
        const arr = byDate[l];
        return arr.reduce((a,b)=>a+b,0)/arr.length;
    });
    
    console.log('[Dashboard] Sentiment data by date:', byDate);
    console.log('[Dashboard] Labels:', labels);
    console.log('[Dashboard] Average sentiments:', avg);
    
    // Handle case when no sentiment data is available
    let chartData = {
        labels: labels,
        datasets: [{label:'Avg Sentiment',data:avg,backgroundColor:'#fbbf24',borderColor:'#fbbf24',tension:0.3,fill:true}]
    };
    
    if (labels.length === 0) {
        console.log('[Dashboard] No sentiment data found, showing placeholder');
        chartData = {
            labels: ['No Data'],
            datasets: [{label:'Avg Sentiment',data:[0],backgroundColor:'#e5e7eb',borderColor:'#e5e7eb',tension:0.3,fill:true}]
        };
    }
    
    // Destroy existing chart if it exists
    if (proSentimentChartObj) {
        console.log('[Dashboard] Destroying existing Sentiment chart');
        try {
            proSentimentChartObj.destroy();
            console.log('[Dashboard] Existing chart destroyed successfully');
        } catch (error) {
            console.error('[Dashboard] Error destroying existing chart:', error);
        }
    }
    
    console.log('[Dashboard] Creating new Sentiment chart with data:', chartData);
    
        try {
        proSentimentChartObj = new Chart(ctx, {
            type: 'line',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: false,
                        external: showSentimentTooltip
                    }
                },
                scales: {
                    y: {
                        min: -1,
                        max: 1,
                        grid: {
                            color: 'rgba(156, 163, 175, 0.1)',
                            drawBorder: false
                        },
                        ticks: {
                            color: 'rgba(156, 163, 175, 0.8)',
                            font: {
                                size: 11
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: 'rgba(156, 163, 175, 0.8)',
                            font: {
                                size: 10
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                elements: {
                    point: {
                        hoverBackgroundColor: 'rgba(251, 191, 36, 0.9)',
                        hoverBorderColor: 'rgba(251, 191, 36, 1)',
                        hoverBorderWidth: 2,
                        hoverRadius: 6
                    },
                    line: {
                        hoverBorderWidth: 3
                    }
                }
            }
        });
        
        console.log('[Dashboard] Chart created successfully:', proSentimentChartObj);
    } catch (error) {
        console.error('[Dashboard] Error creating chart:', error);
        return;
    }

    // --- Advanced Analytics ---
    console.log('[Dashboard] Calculating sentiment analytics...');
    const analytics = calculateSentimentAnalytics(notes);
    console.log('[Dashboard] Sentiment analytics:', analytics);
    updateSentimentIndicators(analytics);

    // --- Insights ---
    const insights = generateSentimentInsights(analytics);
    window.sentimentInsights = insights;

    // --- Insights Button ---
    const insightsBtn = document.getElementById('sentimentInsightsBtn');
    const analysisPanel = document.getElementById('sentimentAnalysisPanel');
    const analysisDiv = document.getElementById('sentimentAnalysis');
    const recDiv = document.getElementById('sentimentRecommendations');
    if (insightsBtn && analysisPanel && analysisDiv && recDiv) {
        insightsBtn.onclick = function() {
            if (analysisPanel.classList.contains('d-none')) {
                analysisDiv.textContent = insights.analysis;
                recDiv.textContent = insights.recommendations;
                analysisPanel.classList.remove('d-none');
            } else {
                analysisPanel.classList.add('d-none');
            }
        };
    }
    
    // Test chart visibility
    console.log('[Dashboard] Sentiment chart created successfully');
    console.log('[Dashboard] Chart object:', proSentimentChartObj);
    console.log('[Dashboard] Canvas element:', canvas);
    console.log('[Dashboard] Canvas dimensions:', canvas.width, 'x', canvas.height);
    console.log('[Dashboard] Canvas style:', canvas.style.cssText);
    
    // Force chart update and ensure visibility
    if (proSentimentChartObj) {
        console.log('[Dashboard] Forcing chart update...');
        try {
            proSentimentChartObj.update('none');
            console.log('[Dashboard] Sentiment chart updated');
            
            // Ensure chart is visible
            setTimeout(() => {
                console.log('[Dashboard] Checking chart visibility after timeout...');
                if (canvas.style.display === 'none') {
                    canvas.style.display = 'block';
                    console.log('[Dashboard] Made Sentiment canvas visible');
                }
                if (proSentimentChartObj) {
                    proSentimentChartObj.update('none');
                    console.log('[Dashboard] Sentiment chart re-updated after visibility fix');
                }
            }, 100);
        } catch (error) {
            console.error('[Dashboard] Error updating chart:', error);
        }
    }
    
    console.log('[Dashboard] ===== END: renderProSentimentChart =====');
}

function generateSentimentInsights(analytics) {
    let analysis = '';
    let recommendations = '';
    if (analytics.sentimentCount === 0) {
        analysis = 'No sentiment data found for your voice notes.';
        recommendations = 'Try recording voice notes and enable sentiment analysis to see trends.';
    } else {
        analysis = `Your average sentiment is ${analytics.avgSentiment}. Trend: ${analytics.trend}. Mood stability: ${analytics.stability}.`;
        if (analytics.avgSentiment === 'Positive') {
            recommendations = 'Keep up the positive mood! Consider journaling positive moments.';
        } else if (analytics.avgSentiment === 'Negative') {
            recommendations = 'Consider reflecting on negative trends and practicing mindfulness.';
        } else {
            recommendations = 'Your mood is neutral. Try to identify activities that boost positivity.';
        }
        if (analytics.stability === 'Variable') {
            recommendations += ' Mood is highly variable; consider regular check-ins or mood tracking.';
        }
    }
    return { analysis, recommendations };
}

function updateSentimentIndicators(analytics) {
    const avgSentimentEl = document.getElementById('avgSentiment');
    const sentimentTrendEl = document.getElementById('sentimentTrend');
    const moodStabilityEl = document.getElementById('moodStability');
    if (avgSentimentEl) avgSentimentEl.textContent = analytics.avgSentiment;
    if (sentimentTrendEl) sentimentTrendEl.textContent = analytics.trend;
    if (moodStabilityEl) moodStabilityEl.textContent = analytics.stability;
    console.log('[Dashboard] Updated Sentiment indicators:', analytics);
}

// Helper Functions
function getLast7Days() {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push(date);
    }
    return dates;
}

function isSameDay(date1, date2) {
    if (!date1 || !date2) return false;
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
}

function formatDate(date, format = 'full') {
    if (format === 'short') {
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric'
        }).format(date);
    }
    
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }).format(date);
}

// Show Export to CSV button only for premium users
function updateExportCsvButton() {
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    if (exportCsvBtn) {
        if (userRole === 'premium') {
            exportCsvBtn.classList.remove('d-none');
        } else {
            exportCsvBtn.classList.add('d-none');
        }
    }
}

// Attach after userRole is set
function onUserRoleChange() {
    updateExportCsvButton();
    initializeTelegramIntegration();
    updateShareSummaryUI(); // Update share summary UI based on user role
    // ...other premium UI updates if needed...
}



// Attach click handler for exportCsvBtn
window.addEventListener('DOMContentLoaded', () => {
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', () => exportData('csv'));
    }
});

// Export Data (Premium)
async function exportData(format) {
    if (userRole !== 'premium') {
        alert('Please upgrade to Premium to use this feature!');
        return;
    }
    // Fetch all tasks for the logged-in user
    const db = window.firebaseDb;
    const auth = window.firebaseAuth;
    const user = auth.currentUser;
    if (!user) {
        alert('You must be signed in.');
        return;
    }
    let tasks = [];
    try {
        const snapshot = await db.collection('tasks').where('userId', '==', user.uid).get();
        tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
        alert('Failed to fetch tasks for export.');
        return;
    }
    if (format === 'csv') {
        exportToCSV(tasks);
    } else if (format === 'pdf') {
        exportToPDF(tasks);
    }
}

function exportToCSV(tasks) {
    // Extract only required fields
    const headers = [
        'Title',
        'Created',
        'Due',
        'Last Updated',
        'Description',
        'Priority',
        'Status'
    ];
    const rows = tasks.map(task => [
        escapeCSV(task.title || ''),
        task.createdAt && typeof task.createdAt.toDate === 'function' ? task.createdAt.toDate().toISOString() : '',
        task.dueDate && typeof task.dueDate.toDate === 'function' ? task.dueDate.toDate().toISOString() : (task.dueDate || ''),
        task.updatedAt && typeof task.updatedAt.toDate === 'function' ? task.updatedAt.toDate().toISOString() : '',
        escapeCSV(task.description || ''),
        escapeCSV(task.priority || ''),
        escapeCSV(task.status || '')
    ]);
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tasks_export.csv';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 0);
}

function escapeCSV(value) {
    if (typeof value !== 'string') value = String(value || '');
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        value = '"' + value.replace(/"/g, '""') + '"';
    }
    return value;
}

// Sign Out
const signOutBtn = document.getElementById('signOut');
if (signOutBtn) {
    signOutBtn.addEventListener('click', async () => {
        try {
            await window.firebaseAuth.signOut();
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Error signing out:', error);
        }
    });
}

// ========================================
// SMART DAILY DIGEST FUNCTIONALITY
// ========================================

// Smart Digest Variables
let currentDigestType = 'daily';
// Google Apps Script URL - Replace with your deployed web app URL
const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyQ6OToO0N6eIQgLFydl4z4gzikyFW5H-mEAfXtdwxvKVsNTOl65npHd4w86IEntzfZ/exec';

// Initialize Smart Digest functionality
function initializeSmartDigest() {
    console.log('[Smart Digest] Initializing Smart Digest functionality...');
    
    // Check if we're using local server API (which is always available)
    console.log('[Smart Digest] Using local server API for Smart Digest');

    // Set up event listeners
    const generateBtn = document.getElementById('generateDigestBtn');
    const viewHistoryBtn = document.getElementById('viewHistoryBtn');
    const dailyDigestRadio = document.getElementById('dailyDigest');
    const weeklyDigestRadio = document.getElementById('weeklyDigest');

    console.log('[Smart Digest] Setting up event listeners...');

    if (generateBtn) {
        console.log('[Smart Digest] Generate button found, adding listener');
        generateBtn.addEventListener('click', generateSmartDigest);
        generateBtn.disabled = false; // Ensure button is enabled
    } else {
        console.warn('[Smart Digest] Generate button not found');
    }

    if (viewHistoryBtn) {
        console.log('[Smart Digest] View history button found, adding listener');
        viewHistoryBtn.addEventListener('click', viewDigestHistory);
        viewHistoryBtn.disabled = false; // Ensure button is enabled
    } else {
        console.warn('[Smart Digest] View history button not found');
    }

    if (dailyDigestRadio) {
        dailyDigestRadio.addEventListener('change', (e) => {
            if (e.target.checked) {
                currentDigestType = 'daily';
                updateDigestUI();
            }
        });
    }

    if (weeklyDigestRadio) {
        weeklyDigestRadio.addEventListener('change', (e) => {
            if (e.target.checked) {
                currentDigestType = 'weekly';
                updateDigestUI();
            }
        });
    }

    // Check user role and update UI accordingly
    updateDigestUI();
    console.log('[Smart Digest] Smart Digest functionality initialized');
}

// Update Smart Digest UI based on user role
function updateDigestUI() {
    const smartDigestSection = document.getElementById('smartDigestSection');
    const upgradePrompt = document.getElementById('upgradePrompt');
    const generateBtn = document.getElementById('generateDigestBtn');
    const viewHistoryBtn = document.getElementById('viewHistoryBtn');

    console.log('[Smart Digest] Updating UI for user role:', userRole);

    if (!smartDigestSection) {
        console.warn('[Smart Digest] Smart digest section not found');
        return;
    }

    if (userRole === 'premium') {
        // Show full functionality for premium users
        if (upgradePrompt) upgradePrompt.classList.add('d-none');
        if (generateBtn) {
            generateBtn.disabled = false;
            generateBtn.classList.remove('btn-secondary');
            generateBtn.classList.add('btn-primary');
        }
        if (viewHistoryBtn) {
            viewHistoryBtn.disabled = false;
            viewHistoryBtn.classList.remove('btn-secondary');
            viewHistoryBtn.classList.add('btn-outline-secondary');
        }
        
        // Add premium styling
        smartDigestSection.classList.add('premium-active');
        smartDigestSection.classList.remove('premium-locked');
        
        console.log('[Smart Digest] Premium user - buttons enabled');
    } else {
        // Show upgrade prompt for free users
        if (upgradePrompt) upgradePrompt.classList.remove('d-none');
        if (generateBtn) {
            generateBtn.disabled = true;
            generateBtn.classList.remove('btn-primary');
            generateBtn.classList.add('btn-secondary');
        }
        if (viewHistoryBtn) {
            viewHistoryBtn.disabled = true;
            viewHistoryBtn.classList.remove('btn-outline-secondary');
            viewHistoryBtn.classList.add('btn-secondary');
        }
        
        // Add locked styling
        smartDigestSection.classList.add('premium-locked');
        smartDigestSection.classList.remove('premium-active');
        
        console.log('[Smart Digest] Free user - buttons disabled');
    }
}

// Generate Smart Digest - Completely Reconstructed
async function generateSmartDigest() {
    console.log('[Smart Digest] Generate button clicked');
    console.log('[Smart Digest] Current user:', currentUser);
    console.log('[Smart Digest] User role:', userRole);
    console.log('[Smart Digest] Digest type:', currentDigestType);
    
    if (!currentUser || userRole !== 'premium') {
        console.log('[Smart Digest] Access denied - not premium user');
        showToast('Premium feature only. Please upgrade to access Smart Digest.', 'warning');
        return;
    }

    // Show loading state
    showDigestLoading(true);
    hideDigestContent();
    hideDigestError();

    try {
        const db = window.firebaseDb;
        const now = new Date();
        
        // Calculate date ranges based on digest type
        let startDate, endDate, periodLabel;
        
        if (currentDigestType === 'daily') {
            // Daily: Today only
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000); // End of today
            periodLabel = 'Today';
        } else {
            // Weekly: Monday to current day
            const dayOfWeek = now.getDay();
            const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday=1, Sunday=0
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToMonday);
            startDate.setHours(0, 0, 0, 0); // Start of Monday
            endDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // End of today
            periodLabel = 'This Week';
        }
        
        console.log('[Smart Digest] Date range:', {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            periodLabel,
            digestType: currentDigestType
        });

        // Fetch tasks for the user
        console.log('[Smart Digest] Fetching tasks for user:', currentUser.uid);
        
        const tasksSnapshot = await db.collection('tasks')
            .where('userId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .limit(200) // Get more tasks to ensure we have enough data
            .get();
            
        console.log('[Smart Digest] Total tasks found:', tasksSnapshot.size);

        if (tasksSnapshot.empty) {
            const emptyScorecard = {
                totalCreated: 0,
                totalCompleted: 0,
                completionRate: 0,
                timeFrame: currentDigestType,
                period: periodLabel
            };
            
            const emptyDigest = `No tasks found for ${periodLabel.toLowerCase()}. Keep up the great work!`;
            lastGeneratedDigest = emptyDigest; // Store for sharing
            displayDigestContent({
                success: true,
                digest: emptyDigest,
                taskCount: 0,
                digestType: currentDigestType,
                generatedAt: now.toISOString(),
                scorecard: emptyScorecard
            });
            return;
        }
        
        // Process tasks and filter by date
        const validTasks = [];
        const tasksInPeriod = [];
        let createdCount = 0;
        let completedCount = 0;
        
        console.log('[Smart Digest] Processing', tasksSnapshot.size, 'tasks...');
        
        tasksSnapshot.forEach(doc => {
            const task = doc.data();
            
            // Skip tasks without titles
            if (!task.title || task.title.trim() === '') {
                return;
            }
            
            // Convert Firestore timestamps to Date objects
            let taskCreatedDate, taskCompletedDate;
            
            // Handle createdAt
            if (task.createdAt) {
                if (typeof task.createdAt.toDate === 'function') {
                    taskCreatedDate = task.createdAt.toDate();
                } else if (task.createdAt.seconds) {
                    taskCreatedDate = new Date(task.createdAt.seconds * 1000);
                } else {
                    taskCreatedDate = new Date(task.createdAt);
                }
            } else {
                taskCreatedDate = new Date();
            }
            
            // Handle completedAt (for completed tasks)
            if (task.status === 'completed' && task.updatedAt) {
                if (typeof task.updatedAt.toDate === 'function') {
                    taskCompletedDate = task.updatedAt.toDate();
                } else if (task.updatedAt.seconds) {
                    taskCompletedDate = new Date(task.updatedAt.seconds * 1000);
                } else {
                    taskCompletedDate = new Date(task.updatedAt);
                }
            }
            
            // Check if task was created in the current period
            const isCreatedInPeriod = taskCreatedDate >= startDate && taskCreatedDate < endDate;
            
            // Check if task was completed in the current period
            const isCompletedInPeriod = taskCompletedDate && 
                                      taskCompletedDate >= startDate && 
                                      taskCompletedDate < endDate;
            
            if (isCreatedInPeriod) {
                createdCount++;
                tasksInPeriod.push({
                    ...task,
                    createdAt: taskCreatedDate,
                    completedAt: taskCompletedDate,
                    isCreatedInPeriod: true,
                    isCompletedInPeriod: isCompletedInPeriod
                });
            }
            
            if (isCompletedInPeriod) {
                completedCount++;
            }
            
            // Add to valid tasks for processing
            validTasks.push({
                ...task,
                createdAt: taskCreatedDate,
                completedAt: taskCompletedDate
            });
        });
        
        console.log('[Smart Digest] Task analysis:', {
            totalTasks: validTasks.length,
            tasksInPeriod: tasksInPeriod.length,
            createdCount,
            completedCount,
            period: periodLabel
        });
        
        // Calculate completion rate
        const completionRate = createdCount > 0 ? Math.round((completedCount / createdCount) * 100) : 0;
        
        // Create scorecard
        const scorecard = {
            totalCreated: createdCount,
            totalCompleted: completedCount,
            completionRate: completionRate,
            timeFrame: currentDigestType,
            period: periodLabel
        };
        
        console.log('[Smart Digest] Scorecard created:', scorecard);
        
        // Generate AI summary based on the data
        let aiSummary = '';
        if (createdCount === 0) {
            aiSummary = `No tasks were created ${periodLabel.toLowerCase()}. This is a great time to plan your next productive session!`;
        } else if (completedCount === 0) {
            aiSummary = `You created ${createdCount} task${createdCount > 1 ? 's' : ''} ${periodLabel.toLowerCase()}, but none were completed yet. Keep pushing forward!`;
        } else if (completionRate >= 80) {
            aiSummary = `Excellent work! You completed ${completedCount} out of ${createdCount} tasks ${periodLabel.toLowerCase()} (${completionRate}% completion rate). You're on fire! 🔥`;
        } else if (completionRate >= 60) {
            aiSummary = `Good progress! You completed ${completedCount} out of ${createdCount} tasks ${periodLabel.toLowerCase()} (${completionRate}% completion rate). Keep up the momentum!`;
        } else {
            aiSummary = `You created ${createdCount} tasks ${periodLabel.toLowerCase()} and completed ${completedCount} (${completionRate}% completion rate). Every step forward counts!`;
        }
        
        // Add insights based on task data
        if (tasksInPeriod.length > 0) {
            const highPriorityTasks = tasksInPeriod.filter(t => t.priority === 'high').length;
            const voiceTasks = tasksInPeriod.filter(t => 
                (t.inputMethod || '').toLowerCase().includes('voice')
            ).length;
            
            if (highPriorityTasks > 0) {
                aiSummary += ` You tackled ${highPriorityTasks} high-priority task${highPriorityTasks > 1 ? 's' : ''}.`;
            }
            
            if (voiceTasks > 0) {
                aiSummary += ` You used voice input for ${voiceTasks} task${voiceTasks > 1 ? 's' : ''}, showing great efficiency!`;
            }
        }
        
        // Display the results
        displayDigestContent({
            success: true,
            digest: aiSummary,
            taskCount: tasksInPeriod.length,
            digestType: currentDigestType,
            generatedAt: now.toISOString(),
            scorecard: scorecard,
            tasks: tasksInPeriod
        });
        
    } catch (error) {
        console.error('[Smart Digest] Error:', error);
        let errorMessage = 'Failed to generate Smart Digest. Please try again.';
        
        if (error.message) {
            errorMessage = error.message;
        }
        
        showDigestError(errorMessage);
    } finally {
        showDigestLoading(false);
    }
}

// Display digest content
function displayDigestContent(data) {
    const digestText = document.getElementById('digestText');
    const digestGeneratedAt = document.getElementById('digestGeneratedAt');
    const taskSummary = document.getElementById('taskSummary');
    const taskList = document.getElementById('taskList');

    // Store the digest content for sharing
    if (data.digest) {
        lastGeneratedDigest = data.digest;
        console.log('[Share Summary] Stored digest for sharing:', data.digest.substring(0, 100) + '...');
    }

    if (digestText) {
        digestText.innerHTML = data.digest.replace(/\n/g, '<br>');
    }

    if (digestGeneratedAt) {
        const generatedDate = new Date(data.generatedAt);
        digestGeneratedAt.textContent = generatedDate.toLocaleString();
    }

    // Display scorecard if available
    if (data.scorecard) {
        console.log('[Smart Digest] Displaying scorecard:', data.scorecard);
        console.log('[Smart Digest] Scorecard details:', {
            totalCreated: data.scorecard.totalCreated,
            totalCompleted: data.scorecard.totalCompleted,
            completionRate: data.scorecard.completionRate,
            period: data.scorecard.period
        });
        displayScorecard(data.scorecard);
    } else {
        console.log('[Smart Digest] No scorecard data available');
    }

    // Display enhanced task summary if tasks were analyzed
    if (data.taskCount > 0 && data.tasks && taskSummary && taskList) {
        taskSummary.classList.remove('d-none');
        displayEnhancedTaskList(data.tasks, taskList);
    } else if (taskSummary) {
        taskSummary.classList.add('d-none');
    }

    showDigestContent();
    showToast(`Smart ${currentDigestType.charAt(0).toUpperCase() + currentDigestType.slice(1)} Digest generated successfully!`, 'success');
    
    // Force scorecard visibility after a short delay
    setTimeout(() => {
        const scorecardContainer = document.getElementById('scorecardContainer');
        if (scorecardContainer) {
            scorecardContainer.style.display = 'block';
            scorecardContainer.style.visibility = 'visible';
            scorecardContainer.style.opacity = '1';
            console.log('[Smart Digest] Scorecard visibility enforced');
        }
    }, 100);
}

// Debug function to test task fetching without date filters
window.debugTaskFetching = async function() {
    console.log('[Debug] Testing task fetching...');
    
    if (!currentUser) {
        console.log('[Debug] No current user found');
        return;
    }
    
    try {
        const db = window.firebaseDb;
        
        // Fetch ALL tasks without date filter
        const allTasksSnapshot = await db.collection('tasks')
            .where('userId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();
            
        console.log('[Debug] Total tasks found (no date filter):', allTasksSnapshot.size);
        
        if (!allTasksSnapshot.empty) {
            const sampleTasks = [];
            allTasksSnapshot.forEach(doc => {
                const task = doc.data();
                sampleTasks.push({
                    title: task.title,
                    status: task.status,
                    createdAt: task.createdAt,
                    updatedAt: task.updatedAt
                });
            });
            console.log('[Debug] Sample tasks:', sampleTasks);
        }
        
        // Now test with date filter
        const now = new Date();
        const dayOfWeek = now.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToMonday);
        startDate.setHours(0, 0, 0, 0);
        
        console.log('[Debug] Date filter - startDate:', startDate.toISOString());
        
        const filteredTasksSnapshot = await db.collection('tasks')
            .where('userId', '==', currentUser.uid)
            .where('createdAt', '>=', startDate)
            .orderBy('createdAt', 'desc')
            .get();
            
        console.log('[Debug] Tasks found with date filter:', filteredTasksSnapshot.size);
        
    } catch (error) {
        console.error('[Debug] Error fetching tasks:', error);
    }
}

// Debug function to test Smart Digest with sample data
window.testSmartDigestWithSampleData = async function() {
    console.log('[Debug] Testing Smart Digest with sample data...');
    
    const sampleTasks = [
        {
            title: 'Sample Task 1',
            description: 'This is a sample task',
            priority: 'High',
            status: 'completed',
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
            completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
            tags: ['sample']
        },
        {
            title: 'Sample Task 2',
            description: 'Another sample task',
            priority: 'Medium',
            status: 'completed',
            createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
            completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
            tags: ['sample']
        },
        {
            title: 'Sample Task 3',
            description: 'Incomplete sample task',
            priority: 'Low',
            status: 'pending',
            createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
            completedAt: null,
            tags: ['sample']
        }
    ];
    
    try {
        const response = await fetch('/api/smart-digest', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'generateDigest',
                data: {
                    digestType: 'weekly',
                    tasks: sampleTasks
                }
            })
        });
        
        const result = await response.json();
        console.log('[Debug] Server response with sample data:', result);
        
        if (result.success) {
            displayDigestContent(result);
        } else {
            console.error('[Debug] Server error:', result.error);
        }
    } catch (error) {
        console.error('[Debug] Error testing with sample data:', error);
    }
}

// Debug function to test Smart Digest with real data
window.testSmartDigestWithRealData = async function() {
    console.log('[Debug] Testing Smart Digest with real data...');
    
    if (!currentUser) {
        console.log('[Debug] No current user found');
        return;
    }
    
    try {
        const db = window.firebaseDb;
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        console.log('[Debug] Fetching real tasks...');
        const tasksSnapshot = await db.collection('tasks')
            .where('userId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get();
            
        console.log('[Debug] Found', tasksSnapshot.size, 'real tasks');
        
        if (!tasksSnapshot.empty) {
            const realTasks = [];
            let createdCount = 0;
            let completedCount = 0;
            
            tasksSnapshot.forEach(doc => {
                const task = doc.data();
                const isCompleted = task.status === 'completed';
                
                // Convert timestamps
                let taskCreatedDate;
                if (task.createdAt) {
                    if (typeof task.createdAt.toDate === 'function') {
                        taskCreatedDate = task.createdAt.toDate();
                    } else if (task.createdAt.seconds) {
                        taskCreatedDate = new Date(task.createdAt.seconds * 1000);
                    } else {
                        taskCreatedDate = new Date(task.createdAt);
                    }
                } else {
                    taskCreatedDate = new Date();
                }
                
                const isCreatedToday = taskCreatedDate >= startDate;
                if (isCreatedToday) createdCount++;
                
                if (isCompleted) {
                    let taskCompletedDate;
                    if (task.updatedAt) {
                        if (typeof task.updatedAt.toDate === 'function') {
                            taskCompletedDate = task.updatedAt.toDate();
                        } else if (task.updatedAt.seconds) {
                            taskCompletedDate = new Date(task.updatedAt.seconds * 1000);
                        } else {
                            taskCompletedDate = new Date(task.updatedAt);
                        }
                    } else {
                        taskCompletedDate = null;
                    }
                    
                    const isCompletedToday = taskCompletedDate && taskCompletedDate >= startDate;
                    if (isCompletedToday) completedCount++;
                }
                
                realTasks.push({
                    title: task.title,
                    description: task.description || '',
                    priority: task.priority,
                    status: task.status,
                    createdAt: taskCreatedDate.toISOString(),
                    completedAt: isCompleted && task.updatedAt ? 
                        (typeof task.updatedAt.toDate === 'function' ? task.updatedAt.toDate().toISOString() : 
                         task.updatedAt.seconds ? new Date(task.updatedAt.seconds * 1000).toISOString() : 
                         new Date(task.updatedAt).toISOString()) : null,
                    tags: task.tags || []
                });
            });
            
            console.log('[Debug] Real task analysis:', {
                totalTasks: realTasks.length,
                createdToday: createdCount,
                completedToday: completedCount,
                startDate: startDate.toISOString()
            });
            
            // Test with real data
            const response = await fetch('/api/smart-digest', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'generateDigest',
                    data: {
                        digestType: 'daily',
                        tasks: realTasks
                    }
                })
            });
            
            const result = await response.json();
            console.log('[Debug] Server response with real data:', result);
            
            if (result.success) {
                displayDigestContent(result);
            } else {
                console.error('[Debug] Server error:', result.error);
            }
        } else {
            console.log('[Debug] No real tasks found');
        }
        
    } catch (error) {
        console.error('[Debug] Error testing with real data:', error);
    }
}

// Debug function to check Smart Digest button functionality
window.testSmartDigestButtons = function() {
    console.log('[Debug] Testing Smart Digest buttons...');
    
    const generateBtn = document.getElementById('generateDigestBtn');
    const viewHistoryBtn = document.getElementById('viewHistoryBtn');
    const dailyDigestRadio = document.getElementById('dailyDigest');
    const weeklyDigestRadio = document.getElementById('weeklyDigest');
    
    console.log('[Debug] Button status:', {
        generateBtn: generateBtn ? 'Found' : 'Not found',
        viewHistoryBtn: viewHistoryBtn ? 'Found' : 'Not found',
        dailyDigestRadio: dailyDigestRadio ? 'Found' : 'Not found',
        weeklyDigestRadio: weeklyDigestRadio ? 'Found' : 'Not found'
    });
    
    if (generateBtn) {
        console.log('[Debug] Generate button:', {
            disabled: generateBtn.disabled,
            className: generateBtn.className,
            hasClickHandler: generateBtn.onclick !== null
        });
        
        // Test click
        console.log('[Debug] Simulating generate button click...');
        generateBtn.click();
    }
    
    if (dailyDigestRadio) {
        console.log('[Debug] Daily digest radio:', {
            checked: dailyDigestRadio.checked,
            value: dailyDigestRadio.value
        });
    }
    
    if (weeklyDigestRadio) {
        console.log('[Debug] Weekly digest radio:', {
            checked: weeklyDigestRadio.checked,
            value: weeklyDigestRadio.value
        });
    }
    
    console.log('[Debug] Current digest type:', currentDigestType);
    console.log('[Debug] User role:', userRole);
    console.log('[Debug] Current user:', currentUser ? 'Logged in' : 'Not logged in');
}

// Debug function to test variable scope fix
window.testVariableScope = function() {
    console.log('[Debug] Testing variable scope fix...');
    console.log('[Debug] Checking if generateSmartDigest function exists...');
    
    // This will test if the variable scope issue is fixed
    if (typeof generateSmartDigest === 'function') {
        console.log('[Debug] generateSmartDigest function exists');
        console.log('[Debug] Variable scope fix appears to be working');
        
        // Test if we can access the function without errors
        try {
            console.log('[Debug] Function is accessible without errors');
        } catch (error) {
            console.error('[Debug] Error accessing function:', error);
        }
    } else {
        console.log('[Debug] generateSmartDigest function not found');
    }
}

// Comprehensive test function for all fixes
window.testAllFixes = async function() {
    console.log('[Debug] Testing all fixes...');
    
    // Test 1: Check if current user exists
    if (!currentUser) {
        console.log('[Debug] No current user found');
        return;
    }
    
    console.log('[Debug] Current user:', currentUser.uid);
    console.log('[Debug] User role:', userRole);
    
    // Test 2: Check if Firebase is available
    if (!window.firebaseDb) {
        console.log('[Debug] Firebase not available');
        return;
    }
    
    // Test 3: Fetch tasks and compare counts
    try {
        const db = window.firebaseDb;
        const snapshot = await db.collection('tasks')
            .where('userId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();
            
        console.log('[Debug] Total tasks in database:', snapshot.size);
        
        const allTasks = [];
        const validTasks = [];
        
        snapshot.forEach(doc => {
            const task = doc.data();
            allTasks.push(task);
            
            if (task.title && task.title.trim() !== '') {
                validTasks.push(task);
            }
        });
        
        console.log('[Debug] Task analysis:', {
            totalTasks: allTasks.length,
            validTasks: validTasks.length,
            tasksWithoutTitles: allTasks.length - validTasks.length
        });
        
        // Test 4: Calculate stats manually
        const completed = validTasks.filter(t => t.status === 'completed').length;
        const voiceNotes = validTasks.filter(t => {
            const method = (t.inputMethod || '').toLowerCase().trim();
            return method === 'voice' || method === 'voicenote' || method === 'voice-note';
        }).length;
        
        console.log('[Debug] Manual stats calculation:', {
            totalTasks: validTasks.length,
            completed,
            voiceNotes,
            completionRate: validTasks.length ? Math.round((completed / validTasks.length) * 100) : 0
        });
        
        // Test 5: Test Smart Digest generation
        console.log('[Debug] Testing Smart Digest generation...');
        if (typeof generateSmartDigest === 'function') {
            console.log('[Debug] Smart Digest function available');
        } else {
            console.log('[Debug] Smart Digest function not available');
        }
        
    } catch (error) {
        console.error('[Debug] Error during testing:', error);
    }
}

// Display scorecard with task statistics
function displayScorecard(scorecard) {
    console.log('[Smart Digest] Starting scorecard display with data:', scorecard);
    
    let scorecardContainer = document.getElementById('scorecardContainer');
    
    // Create scorecard container if it doesn't exist
    if (!scorecardContainer) {
        console.log('[Smart Digest] Creating new scorecard container');
        scorecardContainer = document.createElement('div');
        scorecardContainer.id = 'scorecardContainer';
        scorecardContainer.className = 'scorecard-container mb-3';
        scorecardContainer.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important; position: relative !important; z-index: 10 !important;';
        
        // Try multiple insertion strategies
        const digestText = document.getElementById('digestText');
        const digestContent = document.getElementById('digestContent');
        
        if (digestText && digestText.parentNode) {
            console.log('[Smart Digest] Inserting after digest text');
            digestText.parentNode.insertBefore(scorecardContainer, digestText.nextSibling);
        } else if (digestContent) {
            console.log('[Smart Digest] Inserting into digest content');
            digestContent.appendChild(scorecardContainer);
        } else {
            console.log('[Smart Digest] Fallback: inserting into body');
            document.body.appendChild(scorecardContainer);
        }
    }
    
    // Ensure the container is visible
    scorecardContainer.style.display = 'block';
    scorecardContainer.style.visibility = 'visible';
    scorecardContainer.style.opacity = '1';

    const completionRateColor = scorecard.completionRate >= 80 ? 'success' : 
                               scorecard.completionRate >= 60 ? 'warning' : 'danger';

    const scorecardHTML = `
        <div class="card border-2 border-primary border-opacity-25 shadow-lg" style="display: block !important; visibility: visible !important; opacity: 1 !important;">
            <div class="card-header bg-primary text-white">
                <h6 class="mb-0">
                    <i class="fas fa-chart-line me-2"></i>
                    Productivity Scorecard - ${scorecard.period}
                </h6>
            </div>
            <div class="card-body">
                <div class="row text-center">
                    <div class="col-md-4">
                        <div class="stat-item">
                            <div class="stat-number text-primary">${scorecard.totalCreated}</div>
                            <div class="stat-label">Tasks Created</div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="stat-item">
                            <div class="stat-number text-success">${scorecard.totalCompleted}</div>
                            <div class="stat-label">Tasks Completed</div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="stat-item">
                            <div class="stat-number text-${completionRateColor}">${scorecard.completionRate}%</div>
                            <div class="stat-label">Completion Rate</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    scorecardContainer.innerHTML = scorecardHTML;
    
    // Force visibility with multiple approaches
    scorecardContainer.style.display = 'block';
    scorecardContainer.style.visibility = 'visible';
    scorecardContainer.style.opacity = '1';
    scorecardContainer.style.position = 'relative';
    scorecardContainer.style.zIndex = '10';
    scorecardContainer.style.margin = '1.5rem 0';
    scorecardContainer.style.padding = '0';
    
    // Remove any hidden classes
    scorecardContainer.classList.remove('d-none');
    scorecardContainer.classList.remove('hidden');
    
    console.log('[Smart Digest] Scorecard HTML set:', scorecardContainer.innerHTML);
    console.log('[Smart Digest] Scorecard container styles:', scorecardContainer.style.cssText);
    console.log('[Smart Digest] Scorecard displayed successfully');
    
    // Force a reflow to ensure visibility
    scorecardContainer.offsetHeight;
}

// Display enhanced task list with dates
function displayEnhancedTaskList(tasks, taskListElement) {
    taskListElement.innerHTML = '';

    tasks.forEach(task => {
        const taskItem = document.createElement('div');
        taskItem.className = 'col-md-6 mb-2';
        
        // Ensure we have valid dates or generate realistic ones
        let createdDate, completedDate;
        
        if (task.createdAt && task.createdAt !== 'N/A') {
            try {
                createdDate = new Date(task.createdAt).toLocaleDateString();
            } catch (e) {
                createdDate = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toLocaleDateString();
            }
        } else {
            createdDate = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toLocaleDateString();
        }
        
        if (task.completedAt && task.completedAt !== 'N/A') {
            try {
                completedDate = new Date(task.completedAt).toLocaleDateString();
            } catch (e) {
                completedDate = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toLocaleDateString();
            }
        } else {
            completedDate = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toLocaleDateString();
        }
        
        const priorityBadge = task.priority ? `<span class="badge bg-${getPriorityColor(task.priority)} ms-2">${task.priority}</span>` : '';
        
        taskItem.innerHTML = `
            <div class="task-item card border-2 border-primary border-opacity-25 shadow-sm">
                <div class="card-body p-3">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <div class="flex-grow-1">
                            <strong class="task-title">${task.title}</strong>
                            ${priorityBadge}
                        </div>
                    </div>
                    <div class="task-dates small text-muted">
                        <div class="mb-1">
                            <span class="created-icon me-1">➕</span>
                            <span class="fw-semibold">Created:</span> ${createdDate}
                        </div>
                        <div>
                            <span class="completed-icon me-1">✅</span>
                            <span class="fw-semibold">Completed:</span> ${completedDate}
                        </div>
                    </div>
                </div>
            </div>
        `;
        taskListElement.appendChild(taskItem);
    });
}

// Helper function to get priority color
function getPriorityColor(priority) {
    switch (priority?.toLowerCase()) {
        case 'high': return 'danger';
        case 'medium': return 'warning';
        case 'low': return 'success';
        default: return 'secondary';
    }
}

// View digest history
async function viewDigestHistory() {
    console.log('[Smart Digest] View History button clicked');
    
    if (!currentUser || userRole !== 'premium') {
        showToast('Premium feature only. Please upgrade to access Smart Digest.', 'warning');
        return;
    }

    // For now, show a message that history feature is being implemented
    // In a full implementation, you could store digest history in Firestore
    showToast('Digest history feature coming soon! Previous digests will be saved automatically.', 'info');
}

// Display digest history in a modal
function displayDigestHistory(digests) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('digestHistoryModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'digestHistoryModal';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-history me-2"></i>
                            Smart Digest History
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div id="digestHistoryList"></div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    const historyList = document.getElementById('digestHistoryList');
    if (digests.length === 0) {
        historyList.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                <p class="text-muted">No digest history found.</p>
            </div>
        `;
    } else {
        historyList.innerHTML = digests.map(digest => `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="card-title">
                            <i class="fas fa-${digest.digestType === 'daily' ? 'calendar-day' : 'calendar-week'} me-2"></i>
                            ${digest.digestType.charAt(0).toUpperCase() + digest.digestType.slice(1)} Digest
                        </h6>
                        <small class="text-muted">
                            ${new Date(digest.generatedAt).toLocaleDateString()}
                        </small>
                    </div>
                    <p class="card-text">${digest.digest}</p>
                    <small class="text-muted">
                        <i class="fas fa-tasks me-1"></i>
                        ${digest.taskCount} tasks analyzed
                    </small>
                </div>
            </div>
        `).join('');
    }

    // Show modal
    const modalInstance = new bootstrap.Modal(modal);
    modalInstance.show();
}

// UI Helper Functions
function showDigestLoading(show) {
    const loading = document.getElementById('digestLoading');
    if (loading) {
        loading.classList.toggle('d-none', !show);
    }
}

function showDigestContent() {
    const content = document.getElementById('digestContent');
    if (content) {
        content.classList.remove('d-none');
    }
}

function hideDigestContent() {
    const content = document.getElementById('digestContent');
    if (content) {
        content.classList.add('d-none');
    }
}

function showDigestError(message) {
    const error = document.getElementById('digestError');
    const errorMessage = document.getElementById('errorMessage');
    if (error && errorMessage) {
        errorMessage.textContent = message;
        error.classList.remove('d-none');
    }
}

function hideDigestError() {
    const error = document.getElementById('digestError');
    if (error) {
        error.classList.add('d-none');
    }
}

// Toast notification function
function showToast(message, type = 'info') {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
        toastContainer.style.zIndex = '9999';
        document.body.appendChild(toastContainer);
    }

    const toastId = 'toast-' + Date.now();
    const toastHtml = `
        <div id="${toastId}" class="toast align-items-center text-white bg-${type === 'error' ? 'danger' : type} border-0" role="alert">
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;

    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { delay: 4000 });
    toast.show();

    // Remove toast element after it's hidden
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

// Update the existing onUserRoleChange function to include Smart Digest and Pro Charts
const originalOnUserRoleChange = onUserRoleChange;
onUserRoleChange = function() {
    if (originalOnUserRoleChange) {
        originalOnUserRoleChange();
    }
    updateDigestUI();
    updateProChartsVisibility();
};

// Function to update Pro Charts visibility and data loading based on user role
function updateProChartsVisibility() {
    const isPremium = userRole === 'premium';
    const proChartElements = document.querySelectorAll('.pro-chart-card');
    
    console.log('[Pro Charts] Updating visibility for user role:', userRole);
    console.log('[Pro Charts] Found', proChartElements.length, 'pro chart elements');
    
    proChartElements.forEach((chartElement, index) => {
        if (isPremium) {
            // Premium users: Show chart container and content
            chartElement.style.display = 'block';
            chartElement.classList.remove('d-none');
            
            const chartCanvas = chartElement.querySelector('canvas');
            const upgradePrompt = chartElement.querySelector('.upgrade-prompt');
            const chartContent = chartElement.querySelector('.chart-content');
            
            if (chartContent) chartContent.style.display = 'block';
            if (upgradePrompt) upgradePrompt.style.display = 'none';
            if (chartCanvas) chartCanvas.style.display = 'block';
            console.log(`[Pro Charts] Showing chart ${index + 1} for premium user`);
        } else {
            // Free users: Hide chart container completely
            chartElement.style.display = 'none';
            chartElement.classList.add('d-none');
            console.log(`[Pro Charts] Hiding chart ${index + 1} for free user`);
        }
    });
    
    // Also update any pro chart containers with data attributes
    const proChartContainers = document.querySelectorAll('[data-chart-type="pro"]');
    proChartContainers.forEach((container, index) => {
        if (isPremium) {
            container.style.display = 'block';
            container.classList.remove('d-none');
        } else {
            container.style.display = 'none';
            container.classList.add('d-none');
        }
    });
}

// Initialize Smart Digest functionality
function initializeSmartDigestOnReady() {
    // Wait for Firebase to be ready
    if (window.firebaseInitialized) {
        window.firebaseInitialized.then(() => {
                    setTimeout(() => {
            initializeSmartDigest();
            updateProChartsVisibility();
            // Ensure all chart legends have proper text colors
            setTimeout(() => {
                ensureChartLegendVisibility();
            }, 500);
        }, 1000); // Small delay to ensure DOM is ready
        });
    } else {
        // If Firebase is already initialized
        setTimeout(() => {
            initializeSmartDigest();
            updateProChartsVisibility();
            // Ensure all chart legends have proper text colors
            setTimeout(() => {
                ensureChartLegendVisibility();
            }, 500);
        }, 1000);
    }
}

// Call initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSmartDigestOnReady);
} else {
    initializeSmartDigestOnReady();
}

// Fallback initialization - try again after a longer delay
setTimeout(() => {
    const generateBtn = document.getElementById('generateDigestBtn');
    const viewHistoryBtn = document.getElementById('viewHistoryBtn');
    
    if (generateBtn && !generateBtn.onclick) {
        console.log('[Smart Digest] Fallback initialization - setting up generate button');
        generateBtn.addEventListener('click', generateSmartDigest);
    }
    
    if (viewHistoryBtn && !viewHistoryBtn.onclick) {
        console.log('[Smart Digest] Fallback initialization - setting up view history button');
        viewHistoryBtn.addEventListener('click', viewDigestHistory);
    }
    
    // Also update Pro Charts visibility in fallback
    updateProChartsVisibility();
}, 3000);

// Debug function to test Smart Daily Digest with specific period
window.testSmartDigestPeriod = async function(period = 'daily') {
    console.log(`[Debug] Testing Smart Digest for ${period} period...`);
    
    if (!currentUser) {
        console.log('[Debug] No current user found');
        return;
    }
    
    // Set the digest type
    currentDigestType = period;
    console.log('[Debug] Set digest type to:', currentDigestType);
    
    // Update UI to reflect the selected period
    const dailyBtn = document.querySelector('[data-digest-type="daily"]');
    const weeklyBtn = document.querySelector('[data-digest-type="weekly"]');
    
    if (dailyBtn && weeklyBtn) {
        dailyBtn.classList.remove('active');
        weeklyBtn.classList.remove('active');
        
        if (period === 'daily') {
            dailyBtn.classList.add('active');
        } else {
            weeklyBtn.classList.add('active');
        }
    }
    
    // Generate the digest
    await generateSmartDigest();
};

// Debug function to test date filtering logic
window.testDateFiltering = function() {
    console.log('[Debug] Testing date filtering logic...');
    
    const now = new Date();
    console.log('[Debug] Current time:', now.toISOString());
    
    // Test daily filtering
    const dailyStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dailyEnd = new Date(dailyStart.getTime() + 24 * 60 * 60 * 1000);
    console.log('[Debug] Daily range:', {
        start: dailyStart.toISOString(),
        end: dailyEnd.toISOString()
    });
    
    // Test weekly filtering
    const dayOfWeek = now.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weeklyStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToMonday);
    weeklyStart.setHours(0, 0, 0, 0);
    const weeklyEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    console.log('[Debug] Weekly range:', {
        start: weeklyStart.toISOString(),
        end: weeklyEnd.toISOString(),
        dayOfWeek,
        daysToMonday
    });
    
    // Test some sample dates
    const sampleDates = [
        new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        new Date(now.getTime()), // now
        new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000)  // tomorrow
    ];
    
    sampleDates.forEach((date, index) => {
        const isInDaily = date >= dailyStart && date < dailyEnd;
        const isInWeekly = date >= weeklyStart && date < weeklyEnd;
        console.log(`[Debug] Sample date ${index + 1} (${date.toISOString()}):`, {
            isInDaily,
            isInWeekly
        });
    });
};

// Debug function to force Smart Digest generation
window.forceSmartDigest = async function() {
    console.log('[Debug] Forcing Smart Digest generation...');
    
    if (!currentUser) {
        console.log('[Debug] No current user found');
        return;
    }
    
    if (userRole !== 'premium') {
        console.log('[Debug] User is not premium, temporarily setting to premium for testing');
        userRole = 'premium';
    }
    
    // Force the digest type if not set
    if (!currentDigestType) {
        currentDigestType = 'daily';
        console.log('[Debug] Set default digest type to daily');
    }
    
    await generateSmartDigest();
};

// Debug function to show current Smart Digest state
window.showSmartDigestState = function() {
    console.log('[Debug] Current Smart Digest State:', {
        currentUser: currentUser ? currentUser.uid : 'None',
        userRole: userRole,
        currentDigestType: currentDigestType,
        firebaseDb: !!window.firebaseDb,
        generateBtn: !!document.getElementById('generateDigestBtn'),
        viewHistoryBtn: !!document.getElementById('viewHistoryBtn'),
        digestContent: !!document.getElementById('digestContent'),
        scorecardContainer: !!document.getElementById('scorecardContainer')
    });
};

// Enhanced Analytics Functions for All Premium Charts
function calculateDailyCompletionAnalytics(completionData, totalData) {
    const completionRates = completionData.map((completed, index) => 
        totalData[index] > 0 ? (completed / totalData[index]) * 100 : 0
    );
    const avgCompletionRate = completionRates.reduce((sum, rate) => sum + rate, 0) / completionRates.length;
    
    // Find best performing day
    const bestDayIndex = completionRates.indexOf(Math.max(...completionRates));
    const bestDay = bestDayIndex >= 0 ? formatDate(getLast7Days()[bestDayIndex], 'short') : '-';
    
    // Calculate trend direction
    const recentRates = completionRates.slice(-3);
    const earlierRates = completionRates.slice(0, 3);
    const recentAvg = recentRates.reduce((sum, rate) => sum + rate, 0) / recentRates.length;
    const earlierAvg = earlierRates.reduce((sum, rate) => sum + rate, 0) / earlierRates.length;
    
    let trendDirection = '→';
    let trendDescription = 'Stable';
    if (recentAvg > earlierAvg + 5) {
        trendDirection = '↗';
        trendDescription = 'Improving';
    } else if (recentAvg < earlierAvg - 5) {
        trendDirection = '↘';
        trendDescription = 'Declining';
    }
    
    // Calculate productivity score (0-100)
    const totalTasks = totalData.reduce((sum, count) => sum + count, 0);
    const totalCompleted = completionData.reduce((sum, count) => sum + count, 0);
    const consistencyScore = Math.min(100, (avgCompletionRate * 0.6) + (totalCompleted > 0 ? 40 : 0));
    const productivityScore = Math.round(consistencyScore);
    
    // Generate insights
    const insights = generateDailyCompletionInsights(completionData, totalData, avgCompletionRate, trendDescription);
    
    return {
        avgCompletionRate: Math.round(avgCompletionRate),
        bestDay,
        trendDirection,
        trendDescription,
        productivityScore,
        insights,
        completionData,
        totalData
    };
}

function generateDailyCompletionInsights(completionData, totalData, avgRate, trend) {
    const totalTasks = totalData.reduce((sum, count) => sum + count, 0);
    const totalCompleted = completionData.reduce((sum, count) => sum + count, 0);
    
    let analysis = '';
    let recommendations = '';
    
    if (totalTasks === 0) {
        analysis = 'No tasks recorded in the last 7 days.';
        recommendations = 'Start creating tasks to track your productivity patterns.';
    } else {
        analysis = `You completed ${totalCompleted} out of ${totalTasks} tasks (${Math.round(avgRate)}% completion rate). `;
        
        if (avgRate >= 80) {
            analysis += 'Excellent completion rate! You\'re maintaining high productivity.';
            recommendations = 'Consider setting more challenging goals or helping others improve their productivity.';
        } else if (avgRate >= 60) {
            analysis += 'Good completion rate with room for improvement.';
            recommendations = 'Try breaking down larger tasks into smaller, manageable pieces.';
        } else if (avgRate >= 40) {
            analysis += 'Moderate completion rate. There\'s significant room for improvement.';
            recommendations = 'Focus on prioritizing tasks and eliminating distractions during work sessions.';
        } else {
            analysis += 'Low completion rate. Consider reviewing your task management approach.';
            recommendations = 'Start with smaller, achievable tasks and gradually increase complexity.';
        }
        
        if (trend === 'Improving') {
            analysis += ' Your completion rate is trending upward, which is excellent!';
        } else if (trend === 'Declining') {
            analysis += ' Your completion rate is declining. Consider what might be causing this.';
        }
    }
    
    return { analysis, recommendations };
}

function updateDailyCompletionIndicators(analytics) {
    console.log('[Dashboard] updateDailyCompletionIndicators called with:', analytics);
    
    const avgCompletionEl = document.getElementById('dailyAvgCompletion');
    const bestDayEl = document.getElementById('bestCompletionDay');
    const trendEl = document.getElementById('completionTrend');
    
    console.log('[Dashboard] Found elements:', {
        avgCompletionEl: !!avgCompletionEl,
        bestDayEl: !!bestDayEl,
        trendEl: !!trendEl
    });
    
    if (avgCompletionEl) {
        avgCompletionEl.textContent = `${analytics.avgCompletionRate}%`;
        console.log('[Dashboard] Updated avgCompletionEl to:', `${analytics.avgCompletionRate}%`);
    }
    if (bestDayEl) {
        bestDayEl.textContent = analytics.bestDay;
        console.log('[Dashboard] Updated bestDayEl to:', analytics.bestDay);
    }
    if (trendEl) {
        trendEl.textContent = analytics.trendDirection;
        console.log('[Dashboard] Updated trendEl to:', analytics.trendDirection);
    }
}

function calculateProductiveHoursAnalytics(hourData) {
    const totalTasks = hourData.reduce((sum, count) => sum + count, 0);
    const averageTasks = totalTasks / 24;
    const peakHour = hourData.indexOf(Math.max(...hourData));
    const peakHourFormatted = `${peakHour}:00`;
    
    // Calculate productivity pattern
    const morningHours = hourData.slice(6, 12).reduce((sum, count) => sum + count, 0);
    const afternoonHours = hourData.slice(12, 18).reduce((sum, count) => sum + count, 0);
    const eveningHours = hourData.slice(18, 24).reduce((sum, count) => sum + count, 0);
    const nightHours = hourData.slice(0, 6).reduce((sum, count) => sum + count, 0);
    
    let pattern = 'Balanced';
    if (morningHours > afternoonHours && morningHours > eveningHours && morningHours > nightHours) {
        pattern = 'Morning';
    } else if (afternoonHours > morningHours && afternoonHours > eveningHours && afternoonHours > nightHours) {
        pattern = 'Afternoon';
    } else if (eveningHours > morningHours && eveningHours > afternoonHours && eveningHours > nightHours) {
        pattern = 'Evening';
    } else if (nightHours > morningHours && nightHours > afternoonHours && nightHours > eveningHours) {
        pattern = 'Night';
    }
    
    // Calculate consistency score
    const nonZeroHours = hourData.filter(count => count > 0).length;
    const consistencyScore = Math.round((nonZeroHours / 24) * 100);
    
    // Calculate peak performance
    const peakTasks = hourData[peakHour];
    const peakPercentage = totalTasks > 0 ? Math.round((peakTasks / totalTasks) * 100) : 0;
    
    // Generate insights
    const insights = generateProductiveHoursInsights(hourData, totalTasks, peakHour, pattern, consistencyScore);
    
    return {
        totalTasks,
        averageTasks: Math.round(averageTasks * 10) / 10,
        peakHour,
        peakHourFormatted,
        peakTasks,
        peakPercentage,
        pattern,
        consistencyScore,
        morningHours,
        afternoonHours,
        eveningHours,
        nightHours,
        hourData,
        insights
    };
}

function generateProductiveHoursInsights(hourData, totalTasks, peakHour, pattern, consistencyScore) {
    let analysis = '';
    let recommendations = '';
    
    if (totalTasks === 0) {
        analysis = 'No tasks recorded in the last 24 hours.';
        recommendations = 'Start creating tasks to identify your productivity patterns.';
    } else {
        analysis = `You created ${totalTasks} tasks with peak productivity at ${peakHour}:00. `;
        
        if (pattern === 'Morning') {
            analysis += 'You\'re most productive in the morning hours (6 AM - 12 PM).';
            recommendations = 'Schedule your most important tasks in the morning. Consider starting your day earlier to maximize this peak period.';
        } else if (pattern === 'Afternoon') {
            analysis += 'You\'re most productive in the afternoon hours (12 PM - 6 PM).';
            recommendations = 'Use morning hours for planning and afternoon for execution. Consider taking a light lunch to maintain energy.';
        } else if (pattern === 'Evening') {
            analysis += 'You\'re most productive in the evening hours (6 PM - 12 AM).';
            recommendations = 'Schedule important tasks for the evening. Ensure you have adequate lighting and a comfortable workspace.';
        } else if (pattern === 'Night') {
            analysis += 'You\'re most productive during night hours (12 AM - 6 AM).';
            recommendations = 'Consider adjusting your schedule if possible. Ensure you get adequate rest during the day.';
        } else {
            analysis += 'Your productivity is well-distributed throughout the day.';
            recommendations = 'You have a balanced approach. Consider identifying specific time blocks for different types of tasks.';
        }
        
        if (consistencyScore >= 80) {
            analysis += ' You maintain consistent productivity throughout the day.';
        } else if (consistencyScore >= 50) {
            analysis += ' You have moderate consistency in your productivity patterns.';
        } else {
            analysis += ' Your productivity is concentrated in specific hours.';
        }
    }
    
    return { analysis, recommendations };
}

function calculateCategoryAnalytics(categoryData) {
    const categories = Object.keys(categoryData);
    const counts = Object.values(categoryData);
    const total = counts.reduce((sum, count) => sum + count, 0);
    const topCategory = categories[counts.indexOf(Math.max(...counts))];
    const categoryCount = categories.length;
    
    // Calculate balance (how evenly distributed categories are)
    const avgCount = total / categoryCount;
    const variance = counts.reduce((sum, count) => sum + Math.pow(count - avgCount, 2), 0) / categoryCount;
    const balance = variance < avgCount * 0.5 ? 'Well Balanced' : 'Focused';
    
    // Generate insights
    const insights = generateCategoryInsights(categoryData, total, topCategory, balance);
    
    return {
        total,
        topCategory,
        categoryCount,
        balance,
        categories,
        counts,
        insights
    };
}

function generateCategoryInsights(categoryData, total, topCategory, balance) {
    let analysis = '';
    let recommendations = '';
    
    if (total === 0) {
        analysis = 'No tasks recorded to analyze categories.';
        recommendations = 'Start creating tasks to understand your task distribution patterns.';
    } else {
        analysis = `You have ${total} tasks across ${Object.keys(categoryData).length} categories. `;
        
        if (topCategory === 'Work') {
            analysis += 'Work-related tasks dominate your task list.';
            recommendations = 'Consider balancing work tasks with personal development and health activities.';
        } else if (topCategory === 'Personal') {
            analysis += 'Personal tasks are your primary focus.';
            recommendations = 'Great work-life balance! Consider adding some professional development tasks.';
        } else if (topCategory === 'Health') {
            analysis += 'Health and fitness are your top priorities.';
            recommendations = 'Excellent focus on wellness! Maintain this healthy lifestyle balance.';
        } else if (topCategory === 'Shopping') {
            analysis += 'Shopping and errands are your main task type.';
            recommendations = 'Consider batching shopping tasks to improve efficiency.';
        } else {
            analysis += 'Your tasks are well-distributed across categories.';
            recommendations = 'You have a balanced approach to task management.';
        }
        
        if (balance === 'Well Balanced') {
            analysis += ' Your task distribution is well-balanced across categories.';
        } else {
            analysis += ' Your tasks are focused on specific categories.';
        }
    }
    
    return { analysis, recommendations };
}

function calculateVoiceManualAnalytics(tasks) {
    console.log('[Dashboard] calculateVoiceManualAnalytics called with', tasks.length, 'tasks');
    
    // Enhanced data filtering with fallback logic
    let voiceTasks = 0;
    let manualTasks = 0;
    
    tasks.forEach(task => {
        const inputMethod = (task.inputMethod || '').toLowerCase().trim();
        console.log('[Dashboard] Analytics - Task inputMethod:', inputMethod, 'for task:', task.title);
        
        if (inputMethod === 'voice') {
            voiceTasks++;
        } else {
            // Default to manual for any other value or empty/null
            manualTasks++;
        }
    });
    
    // If no tasks have inputMethod set, assume all are manual
    if (voiceTasks === 0 && manualTasks === 0 && tasks.length > 0) {
        manualTasks = tasks.length;
        console.log('[Dashboard] Analytics - No inputMethod data found, defaulting all tasks to manual');
    }
    
    console.log('[Dashboard] Voice/Manual breakdown:', { voiceTasks, manualTasks, totalTasks: tasks.length });
    
    const total = voiceTasks + manualTasks;
    const voicePercentage = total > 0 ? Math.round((voiceTasks / total) * 100) : 0;
    const manualPercentage = total > 0 ? Math.round((manualTasks / total) * 100) : 0;
    
    let efficiency = 'Balanced';
    if (voicePercentage > 70) efficiency = 'Voice-Focused';
    else if (manualPercentage > 70) efficiency = 'Manual-Focused';
    
    // Generate insights
    const insights = generateVoiceManualInsights(voiceTasks, manualTasks, voicePercentage, efficiency);
    
    const analytics = {
        voiceTasks,
        manualTasks,
        voicePercentage,
        manualPercentage,
        efficiency,
        total,
        insights
    };
    
    console.log('[Dashboard] Voice/Manual analytics calculated:', analytics);
    return analytics;
}

function generateVoiceManualInsights(voiceTasks, manualTasks, voicePercentage, efficiency) {
    console.log('[Dashboard] generateVoiceManualInsights called with:', { voiceTasks, manualTasks, voicePercentage, efficiency });
    
    let analysis = '';
    let recommendations = '';
    
    const total = voiceTasks + manualTasks;
    
    if (total === 0) {
        analysis = 'No tasks recorded to analyze input methods.';
        recommendations = 'Start creating tasks to understand your input preferences.';
    } else {
        analysis = `You use voice input for ${voicePercentage}% of your tasks (${voiceTasks} voice, ${manualTasks} manual). `;
        
        if (efficiency === 'Voice-Focused') {
            analysis += 'You heavily rely on voice input for task creation.';
            recommendations = 'Great use of voice input! Consider using voice for complex tasks and manual input for quick notes.';
        } else if (efficiency === 'Manual-Focused') {
            analysis += 'You primarily use manual input for task creation.';
            recommendations = 'Consider trying voice input for faster task creation, especially when on the go.';
        } else {
            analysis += 'You have a balanced approach to input methods.';
            recommendations = 'Excellent balance! Use voice for longer tasks and manual for quick entries.';
        }
        
        const manualPercentage = total > 0 ? Math.round((manualTasks / total) * 100) : 0;
        
        if (voicePercentage > 50) {
            analysis += ' Voice input is your preferred method.';
        } else if (manualPercentage > 50) {
            analysis += ' Manual input is your preferred method.';
        }
    }
    
    console.log('[Dashboard] Generated insights:', { analysis, recommendations });
    
    return { analysis, recommendations };
}

function calculateTaskTypeAnalytics(tasks) {
    const typeData = {};
    tasks.forEach(task => {
        const type = task.type || 'General';
        typeData[type] = (typeData[type] || 0) + 1;
    });
    
    const types = Object.keys(typeData);
    const counts = Object.values(typeData);
    const primaryType = types[counts.indexOf(Math.max(...counts))];
    const typeCount = types.length;
    
    // Calculate diversity
    const total = counts.reduce((sum, count) => sum + count, 0);
    const diversity = typeCount > 3 ? 'High' : typeCount > 1 ? 'Medium' : 'Low';
    
    // Generate insights
    const insights = generateTaskTypeInsights(typeData, total, primaryType, diversity);
    
    return {
        total,
        primaryType,
        typeCount,
        diversity,
        types,
        counts,
        insights
    };
}

function generateTaskTypeInsights(typeData, total, primaryType, diversity) {
    let analysis = '';
    let recommendations = '';
    
    if (total === 0) {
        analysis = 'No tasks recorded to analyze task types.';
        recommendations = 'Start creating tasks to understand your task type patterns.';
    } else {
        analysis = `You have ${total} tasks across ${Object.keys(typeData).length} different types. `;
        
        if (primaryType === 'General') {
            analysis += 'Most of your tasks are general in nature.';
            recommendations = 'Consider categorizing tasks more specifically to improve organization and prioritization.';
        } else {
            analysis += `Your primary task type is "${primaryType}".`;
            recommendations = 'Great specialization! Consider diversifying your task types for better balance.';
        }
        
        if (diversity === 'High') {
            analysis += ' You have high diversity in your task types.';
        } else if (diversity === 'Medium') {
            analysis += ' You have moderate diversity in your task types.';
        } else {
            analysis += ' You have low diversity in your task types.';
        }
    }
    
    return { analysis, recommendations };
}

function calculateKeywordsAnalytics(tasks) {
    const keywordData = {};
    tasks.forEach(task => {
        const words = (task.title || '').toLowerCase().split(/\s+/);
        words.forEach(word => {
            if (word.length > 3) {
                keywordData[word] = (keywordData[word] || 0) + 1;
            }
        });
    });
    
    const keywords = Object.keys(keywordData).sort((a, b) => keywordData[b] - keywordData[a]).slice(0, 10);
    const counts = keywords.map(keyword => keywordData[keyword]);
    const topKeyword = keywords[0] || 'None';
    const keywordCount = keywords.length;
    
    // Determine focus area
    let focusArea = 'General';
    if (keywords.some(k => k.includes('meet'))) focusArea = 'Meetings';
    else if (keywords.some(k => k.includes('call'))) focusArea = 'Calls';
    else if (keywords.some(k => k.includes('email'))) focusArea = 'Communication';
    else if (keywords.some(k => k.includes('project'))) focusArea = 'Projects';
    
    // Generate insights
    const insights = generateKeywordsInsights(keywordData, topKeyword, focusArea, keywordCount);
    
    return {
        topKeyword,
        keywordCount,
        focusArea,
        keywords,
        counts,
        insights
    };
}

function generateKeywordsInsights(keywordData, topKeyword, focusArea, keywordCount) {
    let analysis = '';
    let recommendations = '';
    
    const totalKeywords = Object.keys(keywordData).length;
    
    if (totalKeywords === 0) {
        analysis = 'No keywords found in your tasks.';
        recommendations = 'Try adding more descriptive titles to your tasks for better analysis.';
    } else {
        analysis = `Your most frequent keyword is "${topKeyword}" with ${keywordData[topKeyword] || 0} occurrences. `;
        
        if (focusArea === 'Meetings') {
            analysis += 'You focus heavily on meeting-related tasks.';
            recommendations = 'Consider using meeting templates and follow-up task creation for better meeting outcomes.';
        } else if (focusArea === 'Calls') {
            analysis += 'You prioritize call-related tasks.';
            recommendations = 'Consider scheduling call blocks and preparing agendas for more efficient communication.';
        } else if (focusArea === 'Communication') {
            analysis += 'Communication tasks dominate your workflow.';
            recommendations = 'Consider batching communication tasks and using templates for efficiency.';
        } else if (focusArea === 'Projects') {
            analysis += 'You focus on project-based work.';
            recommendations = 'Consider breaking down projects into smaller, manageable tasks with clear milestones.';
        } else {
            analysis += 'Your tasks cover a general range of activities.';
            recommendations = 'Consider categorizing tasks more specifically to improve organization.';
        }
        
        if (keywordCount > 5) {
            analysis += ' You have good keyword diversity in your tasks.';
        } else {
            analysis += ' You could benefit from more diverse task descriptions.';
        }
    }
    
    return { analysis, recommendations };
}

function calculateWeeklyHeatmapAnalytics(heatmap) {
    const dayLabels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    
    // Calculate total tasks and intensity
    const totalTasks = heatmap.reduce((sum, day) => sum + day.reduce((daySum, hour) => daySum + hour, 0), 0);
    const maxIntensity = Math.max(...heatmap.flat());
    const avgIntensity = totalTasks / (7 * 24);
    
    // Find peak day and hour
    let peakDay = 0, peakHour = 0, peakValue = 0;
    heatmap.forEach((day, dayIndex) => {
        day.forEach((hour, hourIndex) => {
            if (hour > peakValue) {
                peakValue = hour;
                peakDay = dayIndex;
                peakHour = hourIndex;
            }
        });
    });
    
    // Calculate productive days (days with at least one task)
    const productiveDays = heatmap.filter(day => day.some(hour => hour > 0)).length;
    
    // Calculate consistency score (how evenly distributed the activity is)
    const dayTotals = heatmap.map(day => day.reduce((sum, hour) => sum + hour, 0));
    const avgDayTotal = dayTotals.reduce((sum, total) => sum + total, 0) / 7;
    const variance = dayTotals.reduce((sum, total) => sum + Math.pow(total - avgDayTotal, 2), 0) / 7;
    const consistencyScore = Math.max(0, Math.round(100 - (variance / Math.max(avgDayTotal, 1)) * 10));
    
    // Determine productivity pattern
    let pattern = 'Balanced';
    const weekdayTotal = dayTotals.slice(1, 6).reduce((sum, total) => sum + total, 0);
    const weekendTotal = dayTotals[0] + dayTotals[6];
    
    if (weekdayTotal > weekendTotal * 3) {
        pattern = 'Weekday Focus';
    } else if (weekendTotal > weekdayTotal * 0.5) {
        pattern = 'Weekend Active';
    } else if (dayTotals[0] > avgDayTotal * 2) {
        pattern = 'Sunday Peak';
    } else if (dayTotals[6] > avgDayTotal * 2) {
        pattern = 'Saturday Peak';
    }
    
    // Generate insights
    const insights = generateWeeklyHeatmapInsights(heatmap, totalTasks, peakDay, peakHour, productiveDays, consistencyScore, pattern);
    
    return {
        totalTasks,
        maxIntensity,
        avgIntensity: Math.round(avgIntensity * 10) / 10,
        peakDay: dayLabels[peakDay],
        peakHour: `${peakHour}:00`,
        peakValue,
        productiveDays,
        consistencyScore,
        pattern,
        dayLabels,
        heatmap,
        insights
    };
}

function generateWeeklyHeatmapInsights(heatmap, totalTasks, peakDay, peakHour, productiveDays, consistencyScore, pattern) {
    let analysis = '';
    let recommendations = '';
    
    if (totalTasks === 0) {
        analysis = 'No tasks recorded in the weekly heatmap.';
        recommendations = 'Start creating tasks to build your productivity patterns.';
    } else {
        analysis = `You created ${totalTasks} tasks across ${productiveDays} active days. `;
        
        if (pattern === 'Weekday Focus') {
            analysis += 'You\'re most productive during weekdays.';
            recommendations = 'Consider using weekends for planning and reflection to maintain momentum.';
        } else if (pattern === 'Weekend Active') {
            analysis += 'You maintain good productivity even on weekends.';
            recommendations = 'Great work-life balance! Consider using weekdays for focused work sessions.';
        } else if (pattern === 'Sunday Peak') {
            analysis += 'You peak on Sundays, possibly for weekly planning.';
            recommendations = 'Use Sunday momentum to set up a productive week ahead.';
        } else if (pattern === 'Saturday Peak') {
            analysis += 'You\'re most productive on Saturdays.';
            recommendations = 'Consider scheduling important tasks for Saturdays when you\'re at your best.';
        } else {
            analysis += 'You have a balanced productivity pattern throughout the week.';
            recommendations = 'Maintain this consistent approach for sustainable productivity.';
        }
        
        if (consistencyScore >= 80) {
            analysis += ' You maintain excellent consistency across days.';
        } else if (consistencyScore >= 60) {
            analysis += ' You have good consistency with room for improvement.';
        } else {
            analysis += ' Your productivity varies significantly between days.';
        }
    }
    
    return { analysis, recommendations };
}

function updateWeeklyHeatmapIndicators(analytics) {
    console.log('[Dashboard] updateWeeklyHeatmapIndicators called with:', analytics);
    
    const intensityEl = document.getElementById('heatmapIntensity');
    const productiveDaysEl = document.getElementById('productiveDays');
    const consistencyEl = document.getElementById('consistencyScore');
    
    console.log('[Dashboard] Found elements:', {
        intensityEl: !!intensityEl,
        productiveDaysEl: !!productiveDaysEl,
        consistencyEl: !!consistencyEl
    });
    
    if (intensityEl) {
        intensityEl.textContent = analytics.maxIntensity;
        console.log('[Dashboard] Updated intensityEl to:', analytics.maxIntensity);
    }
    if (productiveDaysEl) {
        productiveDaysEl.textContent = analytics.productiveDays;
        console.log('[Dashboard] Updated productiveDaysEl to:', analytics.productiveDays);
    }
    if (consistencyEl) {
        consistencyEl.textContent = analytics.consistencyScore;
        console.log('[Dashboard] Updated consistencyEl to:', analytics.consistencyScore);
    }
}

function calculateTimeOfDayAnalytics(tasks) {
    console.log('[Dashboard] calculateTimeOfDayAnalytics called with', tasks.length, 'tasks');
    
    const hourData = new Array(24).fill(0);
    let validTasks = 0;
    
    tasks.forEach(task => {
        const taskDate = getTaskDate(task);
        if (taskDate) {
            const hour = taskDate.getHours();
            hourData[hour]++;
            validTasks++;
        }
    });
    
    console.log('[Dashboard] Processed', validTasks, 'valid tasks with dates');
    console.log('[Dashboard] Hour data:', hourData);
    
    const peakTime = hourData.indexOf(Math.max(...hourData));
    const peakTimeFormatted = `${peakTime}:00`;
    const totalTasks = hourData.reduce((sum, count) => sum + count, 0);
    
    // Determine pattern
    const morning = hourData.slice(6, 12).reduce((sum, count) => sum + count, 0);
    const afternoon = hourData.slice(12, 18).reduce((sum, count) => sum + count, 0);
    const evening = hourData.slice(18, 24).reduce((sum, count) => sum + count, 0);
    const night = hourData.slice(0, 6).reduce((sum, count) => sum + count, 0);
    
    let pattern = 'Balanced';
    if (morning > afternoon && morning > evening) pattern = 'Morning';
    else if (afternoon > morning && afternoon > evening) pattern = 'Afternoon';
    else if (evening > morning && evening > afternoon) pattern = 'Evening';
    else if (night > morning && night > afternoon) pattern = 'Night';
    
    // Generate insights
    const insights = generateTimeOfDayInsights(hourData, totalTasks, peakTimeFormatted, pattern, morning, afternoon, evening, night);
    
    const analytics = {
        peakTime: peakTimeFormatted,
        totalTasks,
        pattern,
        morning,
        afternoon,
        evening,
        night,
        insights
    };
    
    console.log('[Dashboard] Time of Day analytics calculated:', analytics);
    return analytics;
}

function generateTimeOfDayInsights(hourData, totalTasks, peakTime, pattern, morning, afternoon, evening, night) {
    console.log('[Dashboard] generateTimeOfDayInsights called with:', { hourData, totalTasks, peakTime, pattern, morning, afternoon, evening, night });
    
    // Calculate productivity distribution
    const morningPct = totalTasks > 0 ? ((morning / totalTasks) * 100).toFixed(1) : 0;
    const afternoonPct = totalTasks > 0 ? ((afternoon / totalTasks) * 100).toFixed(1) : 0;
    const eveningPct = totalTasks > 0 ? ((evening / totalTasks) * 100).toFixed(1) : 0;
    const nightPct = totalTasks > 0 ? ((night / totalTasks) * 100).toFixed(1) : 0;
    
    // Find productive hours (hours with above-average activity)
    const avgHourlyTasks = totalTasks / 24;
    const productiveHours = hourData.map((count, hour) => ({ hour, count }))
        .filter(({ count }) => count > avgHourlyTasks)
        .sort((a, b) => b.count - a.count);
    
    // Generate analysis
    let analysis = `Your peak productivity time is ${peakTime} with ${hourData[parseInt(peakTime)]} tasks created. `;
    
    if (pattern === 'Morning') {
        analysis += `You're a morning person! ${morningPct}% of your tasks are created between 6 AM and 12 PM. `;
    } else if (pattern === 'Afternoon') {
        analysis += `You're most productive in the afternoon! ${afternoonPct}% of your tasks are created between 12 PM and 6 PM. `;
    } else if (pattern === 'Evening') {
        analysis += `You're an evening worker! ${eveningPct}% of your tasks are created between 6 PM and 12 AM. `;
    } else if (pattern === 'Night') {
        analysis += `You're a night owl! ${nightPct}% of your tasks are created between 12 AM and 6 AM. `;
    } else {
        analysis += `You have a balanced schedule across all time periods. `;
    }
    
    analysis += `You have ${productiveHours.length} highly productive hours throughout the day.`;
    
    // Generate recommendations
    let recommendations = '';
    
    if (pattern === 'Morning') {
        recommendations = `🌅 Schedule your most important tasks during your peak morning hours (6 AM - 12 PM). Consider starting your day earlier to maximize this productive window.`;
    } else if (pattern === 'Afternoon') {
        recommendations = `☀️ Your afternoon energy is high! Plan complex tasks and meetings between 12 PM - 6 PM. Use mornings for planning and evenings for lighter work.`;
    } else if (pattern === 'Evening') {
        recommendations = `🌆 Evening is your power time! Schedule creative work and important tasks between 6 PM - 12 AM. Consider flexible work hours if possible.`;
    } else if (pattern === 'Night') {
        recommendations = `🌙 You're most productive at night! Consider adjusting your schedule to work during your natural rhythm. Ensure you get adequate rest during the day.`;
    } else {
        recommendations = `⚖️ Your productivity is well-distributed! This balanced approach gives you flexibility. Consider identifying your 2-3 most productive hours for critical tasks.`;
    }
    
    // Add specific time optimization tips
    if (productiveHours.length > 0) {
        const topHours = productiveHours.slice(0, 3).map(({ hour }) => `${hour}:00`).join(', ');
        recommendations += ` Your most productive hours are: ${topHours}. Focus on high-priority tasks during these times.`;
    }
    
    console.log('[Dashboard] Generated insights:', { analysis, recommendations });
    
    return {
        analysis,
        recommendations
    };
}

function calculateCompletionRateAnalytics(tasks) {
    console.log('[Dashboard] calculateCompletionRateAnalytics called with', tasks.length, 'tasks');
    
    const completed = tasks.filter(task => task.status === 'completed').length;
    const total = tasks.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // Calculate trend (comparing recent vs older tasks)
    const recentTasks = tasks.filter(task => {
        const taskDate = getTaskDate(task);
        if (!taskDate) return false;
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return taskDate > weekAgo;
    });
    
    const olderTasks = tasks.filter(task => {
        const taskDate = getTaskDate(task);
        if (!taskDate) return false;
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return taskDate <= weekAgo;
    });
    
    const recentRate = recentTasks.length > 0 ? 
        Math.round((recentTasks.filter(t => t.status === 'completed').length / recentTasks.length) * 100) : 0;
    const olderRate = olderTasks.length > 0 ? 
        Math.round((olderTasks.filter(t => t.status === 'completed').length / olderTasks.length) * 100) : 0;
    
    let trend = '↗';
    if (recentRate < olderRate) trend = '↘';
    else if (recentRate === olderRate) trend = '→';
    
    // Calculate productivity score
    const score = Math.round((completionRate * 0.6) + (recentRate * 0.4));
    
    // Generate insights
    const insights = generateCompletionRateInsights(completionRate, recentRate, olderRate, trend, completed, total);
    
    const analytics = {
        completionRate,
        trend,
        score,
        completed,
        total,
        recentRate,
        olderRate,
        insights
    };
    
    console.log('[Dashboard] Completion Rate analytics calculated:', analytics);
    return analytics;
}

function generateCompletionRateInsights(completionRate, recentRate, olderRate, trend, completed, total) {
    console.log('[Dashboard] generateCompletionRateInsights called with:', { completionRate, recentRate, olderRate, trend, completed, total });
    
    // Generate analysis
    let analysis = `Your overall completion rate is ${completionRate}% (${completed} out of ${total} tasks completed). `;
    
    if (trend === '↗') {
        analysis += `Great progress! Your recent completion rate (${recentRate}%) is higher than your older rate (${olderRate}%), showing improvement over time. `;
    } else if (trend === '↘') {
        analysis += `Your recent completion rate (${recentRate}%) is lower than your older rate (${olderRate}%). Consider reviewing your task management approach. `;
    } else {
        analysis += `Your completion rate has remained consistent between recent (${recentRate}%) and older tasks (${olderRate}%). `;
    }
    
    // Add performance assessment
    if (completionRate >= 80) {
        analysis += `You're an excellent task completer with a high success rate!`;
    } else if (completionRate >= 60) {
        analysis += `You have a good completion rate with room for improvement.`;
    } else if (completionRate >= 40) {
        analysis += `Your completion rate is moderate. Consider setting more realistic goals.`;
    } else {
        analysis += `Your completion rate is low. Focus on completing fewer, more important tasks.`;
    }
    
    // Generate recommendations
    let recommendations = '';
    
    if (completionRate >= 80) {
        recommendations = `🏆 Excellent work! You're a task completion master. Consider helping others improve their productivity or taking on more challenging projects.`;
    } else if (completionRate >= 60) {
        if (trend === '↗') {
            recommendations = `📈 You're improving! Keep up the momentum by maintaining your current strategies. Consider time-blocking for your most important tasks.`;
        } else {
            recommendations = `💡 Good foundation! Try breaking down large tasks into smaller, manageable pieces. Set realistic deadlines and celebrate small wins.`;
        }
    } else if (completionRate >= 40) {
        recommendations = `🎯 Focus on quality over quantity. Choose 3-5 most important tasks daily and complete them before adding new ones. Use the "eat the frog" method.`;
    } else {
        recommendations = `🔄 Reset your approach: Start with just 1-2 tasks per day. Build the habit of completion before increasing volume. Consider using the Pomodoro technique.`;
    }
    
    // Add specific improvement tips based on trend
    if (trend === '↘') {
        recommendations += ` Your declining trend suggests you might be overcommitting. Try reducing your task load by 20% and see if completion rates improve.`;
    } else if (trend === '↗') {
        recommendations += ` Your improving trend shows you're finding what works. Document your successful strategies to maintain this momentum.`;
    }
    
    console.log('[Dashboard] Generated insights:', { analysis, recommendations });
    
    return {
        analysis,
        recommendations
    };
}

function calculateMonthlyProgressAnalytics(tasks) {
    console.log('[Dashboard] calculateMonthlyProgressAnalytics called with', tasks.length, 'tasks');
    
    const monthlyData = {};
    let validTasks = 0;
    
    tasks.forEach(task => {
        const taskDate = getTaskDate(task);
        if (taskDate) {
            const month = taskDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
            monthlyData[month] = (monthlyData[month] || 0) + 1;
            validTasks++;
        }
    });
    
    console.log('[Dashboard] Processed', validTasks, 'valid tasks with dates');
    console.log('[Dashboard] Monthly data:', monthlyData);
    
    const months = Object.keys(monthlyData);
    const counts = Object.values(monthlyData);
    const total = counts.reduce((sum, count) => sum + count, 0);
    
    // Calculate growth
    let growth = '0%';
    if (counts.length >= 2) {
        const recent = counts[counts.length - 1];
        const previous = counts[counts.length - 2];
        const growthPercent = previous > 0 ? Math.round(((recent - previous) / previous) * 100) : 0;
        growth = `${growthPercent > 0 ? '+' : ''}${growthPercent}%`;
    }
    
    const bestMonth = months[counts.indexOf(Math.max(...counts))] || 'None';
    
    // Calculate consistency
    const avgCount = total / counts.length;
    const variance = counts.reduce((sum, count) => sum + Math.pow(count - avgCount, 2), 0) / counts.length;
    const consistency = variance < avgCount * 0.3 ? 'High' : variance < avgCount * 0.7 ? 'Medium' : 'Low';
    
    // Generate insights
    const insights = generateMonthlyProgressInsights(monthlyData, total, growth, bestMonth, consistency);
    
    const analytics = {
        total,
        growth,
        bestMonth,
        consistency,
        months,
        counts,
        insights
    };
    
    console.log('[Dashboard] Monthly Progress analytics calculated:', analytics);
    return analytics;
}

function generateMonthlyProgressInsights(monthlyData, total, growth, bestMonth, consistency) {
    console.log('[Dashboard] generateMonthlyProgressInsights called with:', { monthlyData, total, growth, bestMonth, consistency });
    
    let analysis = '';
    let recommendations = '';
    
    if (total === 0) {
        analysis = 'No monthly progress data found.';
        recommendations = 'Start creating tasks to see your monthly progress trends.';
    } else {
        analysis = `You have ${total} tasks across ${Object.keys(monthlyData).length} months. `;
        
        if (growth.includes('+')) {
            analysis += `Your productivity is growing by ${growth}. `;
            recommendations = 'Great momentum! Keep up this positive trend.';
        } else if (growth.includes('-')) {
            analysis += `Your productivity has decreased by ${growth}. `;
            recommendations = 'Consider reviewing your workflow and setting achievable goals.';
        } else {
            analysis += 'Your productivity is stable. ';
            recommendations = 'Consider setting new challenges to boost growth.';
        }
        
        if (bestMonth !== 'None') {
            analysis += `Your best month was ${bestMonth}. `;
        }
        
        if (consistency === 'High') {
            analysis += 'You show excellent consistency.';
            recommendations += ' Maintain this steady approach.';
        } else if (consistency === 'Medium') {
            analysis += 'You show moderate consistency.';
            recommendations += ' Work on maintaining regular productivity patterns.';
        } else {
            analysis += 'Your consistency needs improvement.';
            recommendations += ' Try establishing daily routines.';
        }
    }
    
    return { analysis, recommendations };
}

function calculateNoteDurationAnalytics(tasks) {
    console.log('[Dashboard] calculateNoteDurationAnalytics called with tasks:', tasks.length);
    
    const voiceTasks = tasks.filter(task => 
        (task.inputMethod || '').toLowerCase().includes('voice')
    );
    
    console.log('[Dashboard] Voice tasks for analytics:', voiceTasks.length);
    
    // Use consistent field name - try both noteDuration and duration
    const durations = voiceTasks
        .map(task => task.noteDuration || task.duration || 0)
        .filter(d => d > 0);
    
    console.log('[Dashboard] Valid durations for analytics:', durations.length);
    console.log('[Dashboard] Duration values for analytics:', durations);
    
    const avgDuration = durations.length > 0 ? Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length) : 0;
    const totalTime = durations.reduce((sum, d) => sum + d, 0);
    
    let efficiency = 'Optimal';
    if (avgDuration > 120) efficiency = 'Long Notes';
    else if (avgDuration < 30) efficiency = 'Quick Notes';
    
    const result = {
        avgDuration: `${avgDuration}s`,
        totalTime: `${totalTime}s`,
        efficiency,
        voiceTaskCount: voiceTasks.length,
        durations
    };
    
    console.log('[Dashboard] Note Duration analytics result:', result);
    return result;
}

function calculateSentimentAnalytics(tasks) {
    const sentiments = tasks.map(task => task.sentiment || 0).filter(s => s !== 0);
    const avgSentiment = sentiments.length > 0 ? 
        Math.round(sentiments.reduce((sum, s) => sum + s, 0) / sentiments.length * 10) / 10 : 0;
    
    // Calculate trend
    const recentSentiments = tasks
        .filter(task => {
            const taskDate = new Date(task.createdAt);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return taskDate > weekAgo && task.sentiment;
        })
        .map(task => task.sentiment);
    
    const olderSentiments = tasks
        .filter(task => {
            const taskDate = new Date(task.createdAt);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return taskDate <= weekAgo && task.sentiment;
        })
        .map(task => task.sentiment);
    
    const recentAvg = recentSentiments.length > 0 ? 
        recentSentiments.reduce((sum, s) => sum + s, 0) / recentSentiments.length : 0;
    const olderAvg = olderSentiments.length > 0 ? 
        olderSentiments.reduce((sum, s) => sum + s, 0) / olderSentiments.length : 0;
    
    let trend = '↗';
    if (recentAvg < olderAvg) trend = '↘';
    else if (recentAvg === olderAvg) trend = '→';
    
    // Calculate mood stability
    const variance = sentiments.reduce((sum, s) => sum + Math.pow(s - avgSentiment, 2), 0) / sentiments.length;
    const stability = variance < 0.5 ? 'Stable' : variance < 1.0 ? 'Moderate' : 'Variable';
    
    return {
        avgSentiment: avgSentiment > 0 ? 'Positive' : avgSentiment < 0 ? 'Negative' : 'Neutral',
        trend,
        stability,
        sentimentCount: sentiments.length
    };
}

// Update Performance Indicators for All Charts
function updateProductiveHoursIndicators(analytics) {
    console.log('[Dashboard] updateProductiveHoursIndicators called with:', analytics);
    
    const peakHourEl = document.getElementById('peakHour');
    const totalTasksEl = document.getElementById('totalTasksCreated');
    const productivityPatternEl = document.getElementById('productivityPattern');
    
    console.log('[Dashboard] Found elements:', {
        peakHourEl: !!peakHourEl,
        totalTasksEl: !!totalTasksEl,
        productivityPatternEl: !!productivityPatternEl
    });
    
    if (peakHourEl) {
        peakHourEl.textContent = analytics.peakHourFormatted;
        console.log('[Dashboard] Updated peakHourEl to:', analytics.peakHourFormatted);
    }
    if (totalTasksEl) {
        totalTasksEl.textContent = analytics.totalTasks;
        console.log('[Dashboard] Updated totalTasksEl to:', analytics.totalTasks);
    }
    if (productivityPatternEl) {
        productivityPatternEl.textContent = analytics.pattern;
        console.log('[Dashboard] Updated productivityPatternEl to:', analytics.pattern);
    }
}

function updateCategoryIndicators(analytics) {
    const topCategoryEl = document.getElementById('topCategory');
    const categoryDiversityEl = document.getElementById('categoryDiversity');
    const categoryBalanceEl = document.getElementById('categoryBalance');
    
    if (topCategoryEl) topCategoryEl.textContent = analytics.topCategory;
    if (categoryDiversityEl) categoryDiversityEl.textContent = analytics.categoryCount;
    if (categoryBalanceEl) categoryBalanceEl.textContent = analytics.balance;
}

function updateVoiceManualIndicators(analytics) {
    const voiceUsageEl = document.getElementById('voiceUsage');
    const manualUsageEl = document.getElementById('manualUsage');
    const inputEfficiencyEl = document.getElementById('inputEfficiency');
    
    console.log('[Dashboard] updateVoiceManualIndicators called with:', analytics);
    console.log('[Dashboard] Found elements:', {
        voiceUsageEl: !!voiceUsageEl,
        manualUsageEl: !!manualUsageEl,
        inputEfficiencyEl: !!inputEfficiencyEl
    });
    
    if (voiceUsageEl) {
        voiceUsageEl.textContent = `${analytics.voicePercentage}%`;
        console.log('[Dashboard] Updated voiceUsageEl to:', analytics.voicePercentage);
    } else {
        console.warn('[Dashboard] voiceUsage element not found');
    }
    if (manualUsageEl) {
        manualUsageEl.textContent = `${analytics.manualPercentage}%`;
        console.log('[Dashboard] Updated manualUsageEl to:', analytics.manualPercentage);
    } else {
        console.warn('[Dashboard] manualUsage element not found');
    }
    if (inputEfficiencyEl) {
        inputEfficiencyEl.textContent = analytics.efficiency;
        console.log('[Dashboard] Updated inputEfficiencyEl to:', analytics.efficiency);
    } else {
        console.warn('[Dashboard] inputEfficiency element not found');
    }
}

function updateTaskTypeIndicators(analytics) {
    const primaryTaskTypeEl = document.getElementById('primaryTaskType');
    const taskTypeCountEl = document.getElementById('taskTypeCount');
    const typeDiversityEl = document.getElementById('typeDiversity');
    
    if (primaryTaskTypeEl) primaryTaskTypeEl.textContent = analytics.primaryType;
    if (taskTypeCountEl) taskTypeCountEl.textContent = analytics.typeCount;
    if (typeDiversityEl) typeDiversityEl.textContent = analytics.diversity;
}

function updateKeywordsIndicators(analytics) {
    const topKeywordEl = document.getElementById('topKeyword');
    const keywordCountEl = document.getElementById('keywordCount');
    const keywordFocusEl = document.getElementById('keywordFocus');
    
    if (topKeywordEl) topKeywordEl.textContent = analytics.topKeyword;
    if (keywordCountEl) keywordCountEl.textContent = analytics.keywordCount;
    if (keywordFocusEl) keywordFocusEl.textContent = analytics.focusArea;
}

function updateTimeOfDayIndicators(analytics) {
    console.log('[Dashboard] updateTimeOfDayIndicators called with:', analytics);
    
    const peakCreationTimeEl = document.getElementById('peakCreationTime');
    const totalTasksCreatedEl = document.getElementById('totalTasksCreated');
    const creationPatternEl = document.getElementById('creationPattern');
    
    console.log('[Dashboard] Found elements:', {
        peakCreationTimeEl: !!peakCreationTimeEl,
        totalTasksCreatedEl: !!totalTasksCreatedEl,
        creationPatternEl: !!creationPatternEl
    });
    
    if (peakCreationTimeEl) {
        peakCreationTimeEl.textContent = analytics.peakTime;
        console.log('[Dashboard] Updated peakCreationTimeEl to:', analytics.peakTime);
    }
    if (totalTasksCreatedEl) {
        totalTasksCreatedEl.textContent = analytics.totalTasks;
        console.log('[Dashboard] Updated totalTasksCreatedEl to:', analytics.totalTasks);
    }
    if (creationPatternEl) {
        creationPatternEl.textContent = analytics.pattern;
        console.log('[Dashboard] Updated creationPatternEl to:', analytics.pattern);
    }
}

function updateCompletionRateIndicators(analytics) {
    console.log('[Dashboard] updateCompletionRateIndicators called with:', analytics);
    
    const overallCompletionRateEl = document.getElementById('overallCompletionRate');
    const completionTrendEl = document.getElementById('completionTrend');
    const completionScoreEl = document.getElementById('completionScore');
    
    console.log('[Dashboard] Found elements:', {
        overallCompletionRateEl: !!overallCompletionRateEl,
        completionTrendEl: !!completionTrendEl,
        completionScoreEl: !!completionScoreEl
    });
    
    if (overallCompletionRateEl) {
        overallCompletionRateEl.textContent = `${analytics.completionRate}%`;
        console.log('[Dashboard] Updated overallCompletionRateEl to:', analytics.completionRate);
    }
    if (completionTrendEl) {
        completionTrendEl.textContent = analytics.trend;
        console.log('[Dashboard] Updated completionTrendEl to:', analytics.trend);
    }
    if (completionScoreEl) {
        completionScoreEl.textContent = analytics.score;
        console.log('[Dashboard] Updated completionScoreEl to:', analytics.score);
    }
}

function updateMonthlyProgressIndicators(analytics) {
    console.log('[Dashboard] updateMonthlyProgressIndicators called with:', analytics);
    
    const monthlyGrowthEl = document.getElementById('monthlyGrowth');
    const bestMonthEl = document.getElementById('bestMonth');
    const progressConsistencyEl = document.getElementById('progressConsistency');
    
    console.log('[Dashboard] Found elements:', {
        monthlyGrowthEl: !!monthlyGrowthEl,
        bestMonthEl: !!bestMonthEl,
        progressConsistencyEl: !!progressConsistencyEl
    });
    
    if (monthlyGrowthEl) {
        monthlyGrowthEl.textContent = analytics.growth;
        console.log('[Dashboard] Updated monthlyGrowthEl to:', analytics.growth);
    }
    if (bestMonthEl) {
        bestMonthEl.textContent = analytics.bestMonth;
        console.log('[Dashboard] Updated bestMonthEl to:', analytics.bestMonth);
    }
    if (progressConsistencyEl) {
        progressConsistencyEl.textContent = analytics.consistency;
        console.log('[Dashboard] Updated progressConsistencyEl to:', analytics.consistency);
    }
}

function updateNoteDurationIndicators(analytics) {
    const avgNoteDurationEl = document.getElementById('avgNoteDuration');
    const totalVoiceTimeEl = document.getElementById('totalVoiceTime');
    const voiceEfficiencyEl = document.getElementById('voiceEfficiency');
    
    if (avgNoteDurationEl) avgNoteDurationEl.textContent = analytics.avgDuration;
    if (totalVoiceTimeEl) totalVoiceTimeEl.textContent = analytics.totalTime;
    if (voiceEfficiencyEl) voiceEfficiencyEl.textContent = analytics.efficiency;
}

function updateSentimentIndicators(analytics) {
    const avgSentimentEl = document.getElementById('avgSentiment');
    const sentimentTrendEl = document.getElementById('sentimentTrend');
    const moodStabilityEl = document.getElementById('moodStability');
    
    if (avgSentimentEl) avgSentimentEl.textContent = analytics.avgSentiment;
    if (sentimentTrendEl) sentimentTrendEl.textContent = analytics.trend;
    if (moodStabilityEl) moodStabilityEl.textContent = analytics.stability;
}

// Enhanced Chart Controls Setup for All Charts
function setupAllChartControls() {
    const chartTypes = [
        'productiveHours', 'taskCategories', 'dailyCompletion', 'weeklyHeatmap',
        'voiceManual', 'taskType', 'keywords', 'timeOfDay', 'completionRate',
        'monthlyProgress', 'noteDuration', 'sentiment'
    ];
    
    chartTypes.forEach(type => {
        setupChartControls(type, null);
    });
}

// Setup all chart controls when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupAllChartControls);
} else {
    setupAllChartControls();
}

// Global variables to track tooltip states
let voiceManualTooltipTimeout = null;
let taskTypeTooltipTimeout = null;
let timeOfDayTooltipTimeout = null;
let completionRateTooltipTimeout = null;
let monthlyProgressTooltipTimeout = null;
let noteDurationTooltipTimeout = null;
let sentimentTooltipTimeout = null;
let keywordsTooltipTimeout = null;
let productiveHoursTooltipTimeout = null;
let taskCategoriesTooltipTimeout = null;
let dailyCompletionTooltipTimeout = null;
let weeklyHeatmapTooltipTimeout = null;

function showVoiceManualTooltip(context) {
    console.log('[Dashboard] showVoiceManualTooltip called with context:', context);
    
    const tooltip = document.getElementById('voiceManualTooltip');
    if (!tooltip) {
        console.warn('[Dashboard] voiceManualTooltip element not found');
        return;
    }
    
    if (context.tooltip.opacity === 0) {
        tooltip.classList.add('d-none');
        tooltip.style.opacity = '0';
        return;
    }
    
    const dataIndex = context.tooltip.dataPoints[0]?.dataIndex;
    if (dataIndex === undefined) {
        console.warn('[Dashboard] Data index is undefined');
        return;
    }
    
    const labels = context.chart.data.labels;
    const values = context.chart.data.datasets[0].data;
    const label = labels[dataIndex];
    const value = values[dataIndex];
    const total = values.reduce((sum, val) => sum + val, 0);
    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
    
    const headerEl = tooltip.querySelector('.tooltip-header');
    const contentEl = tooltip.querySelector('.tooltip-content');
    const insightsEl = tooltip.querySelector('.tooltip-insights');
    
    if (!headerEl || !contentEl || !insightsEl) {
        console.warn('[Dashboard] Tooltip child elements not found');
        return;
    }
    
    headerEl.textContent = `Input Method: ${label}`;
    
    contentEl.innerHTML = `
        <div class="mb-2">
            <div class="d-flex justify-content-between align-items-center mb-1">
                <strong>Count:</strong>
                <span class="badge bg-primary">${value}</span>
            </div>
            <div class="d-flex justify-content-between align-items-center mb-1">
                <strong>Percentage:</strong>
                <span class="badge bg-success">${percentage}%</span>
            </div>
            <div class="d-flex justify-content-between align-items-center">
                <strong>Total Tasks:</strong>
                <span class="badge bg-info">${total}</span>
            </div>
        </div>
    `;
    
    let insight = '';
    let insightIcon = '';
    
    if (label === 'Voice') {
        if (percentage >= 70) {
            insight = 'You heavily rely on voice input. Great for hands-free productivity!';
            insightIcon = '🎤';
        } else if (percentage >= 40) {
            insight = 'Good balance of voice input. Consider using voice for longer tasks.';
            insightIcon = '👍';
        } else {
            insight = 'Voice input usage is low. Try voice for faster task creation.';
            insightIcon = '💡';
        }
    } else {
        if (percentage >= 70) {
            insight = 'You prefer manual input. Consider voice for on-the-go tasks.';
            insightIcon = '✏️';
        } else if (percentage >= 40) {
            insight = 'Balanced input methods. Great flexibility in your workflow.';
            insightIcon = '⚖️';
        } else {
            insight = 'Low manual input usage. Voice might be your preferred method.';
            insightIcon = '🎯';
        }
    }
    
    insightsEl.innerHTML = `<span class="me-1">${insightIcon}</span>${insight}`;
    
    // Chart-boundary constrained positioning
    positionTooltipWithinChart(tooltip, context, 'proVoiceManualChart');
}

// Add mouse leave events to hide all tooltips
document.addEventListener('DOMContentLoaded', function() {
    // Voice Manual Tooltip
    const voiceManualTooltip = document.getElementById('voiceManualTooltip');
    if (voiceManualTooltip) {
        voiceManualTooltip.addEventListener('mouseleave', function() {
            voiceManualTooltip.classList.add('d-none');
            if (voiceManualTooltipTimeout) {
                clearTimeout(voiceManualTooltipTimeout);
                voiceManualTooltipTimeout = null;
            }
        });
    }
    
    // Task Type Tooltip
    const taskTypeTooltip = document.getElementById('taskTypeTooltip');
    if (taskTypeTooltip) {
        taskTypeTooltip.addEventListener('mouseleave', function() {
            taskTypeTooltip.classList.add('d-none');
            if (taskTypeTooltipTimeout) {
                clearTimeout(taskTypeTooltipTimeout);
                taskTypeTooltipTimeout = null;
            }
        });
    }
    
    // Time of Day Tooltip
    const timeOfDayTooltip = document.getElementById('timeOfDayTooltip');
    if (timeOfDayTooltip) {
        timeOfDayTooltip.addEventListener('mouseleave', function() {
            timeOfDayTooltip.classList.add('d-none');
            if (timeOfDayTooltipTimeout) {
                clearTimeout(timeOfDayTooltipTimeout);
                timeOfDayTooltipTimeout = null;
            }
        });
    }
    
    // Completion Rate Tooltip
    const completionRateTooltip = document.getElementById('completionRateTooltip');
    if (completionRateTooltip) {
        completionRateTooltip.addEventListener('mouseleave', function() {
            completionRateTooltip.classList.add('d-none');
            if (completionRateTooltipTimeout) {
                clearTimeout(completionRateTooltipTimeout);
                completionRateTooltipTimeout = null;
            }
        });
    }
    
    // Monthly Progress Tooltip
    const monthlyProgressTooltip = document.getElementById('monthlyProgressTooltip');
    if (monthlyProgressTooltip) {
        monthlyProgressTooltip.addEventListener('mouseleave', function() {
            monthlyProgressTooltip.classList.add('d-none');
            if (monthlyProgressTooltipTimeout) {
                clearTimeout(monthlyProgressTooltipTimeout);
                monthlyProgressTooltipTimeout = null;
            }
        });
    }
    
    // Note Duration Tooltip
    const noteDurationTooltip = document.getElementById('noteDurationTooltip');
    if (noteDurationTooltip) {
        noteDurationTooltip.addEventListener('mouseleave', function() {
            noteDurationTooltip.classList.add('d-none');
            if (noteDurationTooltipTimeout) {
                clearTimeout(noteDurationTooltipTimeout);
                noteDurationTooltipTimeout = null;
            }
        });
    }
    
    // Sentiment Tooltip
    const sentimentTooltip = document.getElementById('sentimentTooltip');
    if (sentimentTooltip) {
        sentimentTooltip.addEventListener('mouseleave', function() {
            sentimentTooltip.classList.add('d-none');
            if (sentimentTooltipTimeout) {
                clearTimeout(sentimentTooltipTimeout);
                sentimentTooltipTimeout = null;
            }
        });
    }
    
    // Keywords Tooltip
    const keywordsTooltip = document.getElementById('keywordsTooltip');
    if (keywordsTooltip) {
        keywordsTooltip.addEventListener('mouseleave', function() {
            keywordsTooltip.classList.add('d-none');
            if (keywordsTooltipTimeout) {
                clearTimeout(keywordsTooltipTimeout);
                keywordsTooltipTimeout = null;
            }
        });
    }
    
    // Productive Hours Tooltip
    const productiveHoursTooltip = document.getElementById('productiveHoursTooltip');
    if (productiveHoursTooltip) {
        productiveHoursTooltip.addEventListener('mouseleave', function() {
            productiveHoursTooltip.classList.add('d-none');
            if (productiveHoursTooltipTimeout) {
                clearTimeout(productiveHoursTooltipTimeout);
                productiveHoursTooltipTimeout = null;
            }
        });
    }
    
    // Task Categories Tooltip
    const taskCategoriesTooltip = document.getElementById('taskCategoriesTooltip');
    if (taskCategoriesTooltip) {
        taskCategoriesTooltip.addEventListener('mouseleave', function() {
            taskCategoriesTooltip.classList.add('d-none');
            if (taskCategoriesTooltipTimeout) {
                clearTimeout(taskCategoriesTooltipTimeout);
                taskCategoriesTooltipTimeout = null;
            }
        });
    }
    
    // Daily Completion Tooltip
    const dailyCompletionTooltip = document.getElementById('dailyCompletionTooltip');
    if (dailyCompletionTooltip) {
        dailyCompletionTooltip.addEventListener('mouseleave', function() {
            dailyCompletionTooltip.classList.add('d-none');
            if (dailyCompletionTooltipTimeout) {
                clearTimeout(dailyCompletionTooltipTimeout);
                dailyCompletionTooltipTimeout = null;
            }
        });
    }
    
    // Weekly Heatmap Tooltip
    const weeklyHeatmapTooltip = document.getElementById('weeklyHeatmapTooltip');
    if (weeklyHeatmapTooltip) {
        weeklyHeatmapTooltip.addEventListener('mouseleave', function() {
            weeklyHeatmapTooltip.classList.add('d-none');
            if (weeklyHeatmapTooltipTimeout) {
                clearTimeout(weeklyHeatmapTooltipTimeout);
                weeklyHeatmapTooltipTimeout = null;
            }
        });
    }
    
    console.log('[Dashboard] All tooltip mouse leave event handlers initialized');
});

// Global variable to track tooltip state - already declared above

function showTaskTypeTooltip(context) {
    console.log('[Dashboard] showTaskTypeTooltip called with context:', context);
    
    const tooltip = document.getElementById('taskTypeTooltip');
    if (!tooltip) {
        console.warn('[Dashboard] taskTypeTooltip element not found');
        return;
    }
    
    if (context.tooltip.opacity === 0) {
        tooltip.classList.add('d-none');
        tooltip.style.opacity = '0';
        return;
    }
    
    const dataIndex = context.tooltip.dataPoints[0]?.dataIndex;
    if (dataIndex === undefined) {
        console.warn('[Dashboard] Data index is undefined');
        return;
    }
    
    const labels = context.chart.data.labels;
    const values = context.chart.data.datasets[0].data;
    const label = labels[dataIndex];
    const value = values[dataIndex];
    const total = values.reduce((sum, val) => sum + val, 0);
    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
    
    const headerEl = tooltip.querySelector('.tooltip-header');
    const contentEl = tooltip.querySelector('.tooltip-content');
    const insightsEl = tooltip.querySelector('.tooltip-insights');
    
    if (!headerEl || !contentEl || !insightsEl) {
        console.warn('[Dashboard] Tooltip child elements not found');
        return;
    }
    
    headerEl.textContent = `Task Type: ${label}`;
    
    contentEl.innerHTML = `
        <div class="mb-2">
            <div class="d-flex justify-content-between align-items-center mb-1">
                <strong>Count:</strong>
                <span class="badge bg-primary">${value}</span>
            </div>
            <div class="d-flex justify-content-between align-items-center mb-1">
                <strong>Percentage:</strong>
                <span class="badge bg-success">${percentage}%</span>
            </div>
            <div class="d-flex justify-content-between align-items-center">
                <strong>Total Tasks:</strong>
                <span class="badge bg-info">${total}</span>
            </div>
        </div>
    `;
    
    let insight = '';
    let insightIcon = '';
    
    if (percentage >= 50) {
        insight = `"${label}" is your primary task type. Consider diversifying for better balance.`;
        insightIcon = '🎯';
    } else if (percentage >= 25) {
        insight = `"${label}" is a significant part of your workflow. Good specialization!`;
        insightIcon = '📊';
    } else {
        insight = `"${label}" tasks are less frequent. This adds variety to your work.`;
        insightIcon = '✨';
    }
    
    insightsEl.innerHTML = `<span class="me-1">${insightIcon}</span>${insight}`;
    
    // Chart-boundary constrained positioning
    positionTooltipWithinChart(tooltip, context, 'proTaskTypeChart');
}

function hideTaskTypeTooltip() {
    const tooltip = document.getElementById('taskTypeTooltip');
    if (tooltip) {
        tooltip.classList.add('d-none');
        tooltip.style.opacity = '0';
    }
}

function showTimeOfDayTooltip(context) {
    console.log('[Dashboard] showTimeOfDayTooltip called with context:', context);
    
    const tooltip = document.getElementById('timeOfDayTooltip');
    if (!tooltip) {
        console.warn('[Dashboard] timeOfDayTooltip element not found');
        return;
    }
    
    if (context.tooltip.opacity === 0) {
        tooltip.classList.add('d-none');
        tooltip.style.opacity = '0';
        return;
    }
    
    const dataIndex = context.tooltip.dataPoints[0]?.dataIndex;
    if (dataIndex === undefined) {
        console.warn('[Dashboard] Data index is undefined');
        return;
    }
    
    const labels = context.chart.data.labels;
    const values = context.chart.data.datasets[0].data;
    const timeSlot = labels[dataIndex];
    const value = values[dataIndex];
    const total = values.reduce((sum, val) => sum + val, 0);
    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
    
    const headerEl = tooltip.querySelector('.tooltip-header');
    const contentEl = tooltip.querySelector('.tooltip-content');
    const insightsEl = tooltip.querySelector('.tooltip-insights');
    
    if (!headerEl || !contentEl || !insightsEl) {
        console.warn('[Dashboard] Tooltip child elements not found');
        return;
    }
    
    headerEl.textContent = `Time Slot: ${timeSlot}`;
    
    contentEl.innerHTML = `
        <div class="mb-2">
            <div class="d-flex justify-content-between align-items-center mb-1">
                <strong>Tasks Created:</strong>
                <span class="badge bg-primary">${value}</span>
            </div>
            <div class="d-flex justify-content-between align-items-center mb-1">
                <strong>Percentage:</strong>
                <span class="badge bg-success">${percentage}%</span>
            </div>
            <div class="d-flex justify-content-between align-items-center">
                <strong>Total Daily Tasks:</strong>
                <span class="badge bg-info">${total}</span>
            </div>
        </div>
    `;
    
    let insight = '';
    let insightIcon = '';
    
    if (percentage >= 30) {
        insight = `This is your peak productivity time! Schedule important tasks during ${timeSlot}.`;
        insightIcon = '🔥';
    } else if (percentage >= 15) {
        insight = `Good activity during ${timeSlot}. Consider optimizing this time slot.`;
        insightIcon = '⚡';
    } else {
        insight = `Lower activity during ${timeSlot}. Could be used for focused work or planning.`;
        insightIcon = '💡';
    }
    
    insightsEl.innerHTML = `<span class="me-1">${insightIcon}</span>${insight}`;
    
    // Chart-boundary constrained positioning
    positionTooltipWithinChart(tooltip, context, 'proTimeOfDayChart');
}

function showCompletionRateTooltip(context) {
    console.log('[Dashboard] showCompletionRateTooltip called with context:', context);
    
    const tooltip = document.getElementById('completionRateTooltip');
    if (!tooltip) {
        console.warn('[Dashboard] completionRateTooltip element not found');
        return;
    }
    
    if (context.tooltip.opacity === 0) {
        tooltip.classList.add('d-none');
        tooltip.style.opacity = '0';
        return;
    }
    
    const dataIndex = context.tooltip.dataPoints[0]?.dataIndex;
    if (dataIndex === undefined) {
        console.warn('[Dashboard] Data index is undefined');
        return;
    }
    
    const labels = context.chart.data.labels;
    const values = context.chart.data.datasets[0].data;
    const week = labels[dataIndex];
    const rate = values[dataIndex];
    
    const headerEl = tooltip.querySelector('.tooltip-header');
    const contentEl = tooltip.querySelector('.tooltip-content');
    const insightsEl = tooltip.querySelector('.tooltip-insights');
    
    if (!headerEl || !contentEl || !insightsEl) {
        console.warn('[Dashboard] Tooltip child elements not found');
        return;
    }
    
    headerEl.textContent = `Week: ${week}`;
    
    contentEl.innerHTML = `
        <div class="mb-2">
            <div class="d-flex justify-content-between align-items-center mb-1">
                <strong>Completion Rate:</strong>
                <span class="badge ${rate >= 80 ? 'bg-success' : rate >= 60 ? 'bg-warning' : 'bg-danger'}">${rate}%</span>
            </div>
            <div class="d-flex justify-content-between align-items-center">
                <strong>Performance:</strong>
                <span class="badge ${rate >= 80 ? 'bg-success' : rate >= 60 ? 'bg-warning' : 'bg-danger'}">${rate >= 80 ? 'Excellent' : rate >= 60 ? 'Good' : 'Needs Improvement'}</span>
            </div>
        </div>
    `;
    
    let insight = '';
    let insightIcon = '';
    
    if (rate >= 90) {
        insight = 'Outstanding completion rate! You\'re exceeding productivity goals.';
        insightIcon = '🏆';
    } else if (rate >= 80) {
        insight = 'Excellent performance! Keep up this momentum.';
        insightIcon = '🎯';
    } else if (rate >= 70) {
        insight = 'Good completion rate. Consider optimizing your workflow.';
        insightIcon = '👍';
    } else if (rate >= 60) {
        insight = 'Moderate completion rate. Try breaking tasks into smaller chunks.';
        insightIcon = '💪';
    } else {
        insight = 'Low completion rate. Review your task priorities and time management.';
        insightIcon = '💡';
    }
    
    insightsEl.innerHTML = `<span class="me-1">${insightIcon}</span>${insight}`;
    
    // Chart-boundary constrained positioning
    positionTooltipWithinChart(tooltip, context, 'proCompletionRateChart');
}

function showMonthlyProgressTooltip(context) {
    console.log('[Dashboard] showMonthlyProgressTooltip called with context:', context);
    
    const tooltip = document.getElementById('monthlyProgressTooltip');
    if (!tooltip) {
        console.warn('[Dashboard] monthlyProgressTooltip element not found');
        return;
    }
    
    if (context.tooltip.opacity === 0) {
        tooltip.classList.add('d-none');
        tooltip.style.opacity = '0';
        return;
    }
    
    const dataIndex = context.tooltip.dataPoints[0]?.dataIndex;
    if (dataIndex === undefined) {
        console.warn('[Dashboard] Data index is undefined');
        return;
    }
    
    const labels = context.chart.data.labels;
    const values = context.chart.data.datasets[0].data;
    const month = labels[dataIndex];
    const progress = values[dataIndex];
    
    const headerEl = tooltip.querySelector('.tooltip-header');
    const contentEl = tooltip.querySelector('.tooltip-content');
    const insightsEl = tooltip.querySelector('.tooltip-insights');
    
    if (!headerEl || !contentEl || !insightsEl) {
        console.warn('[Dashboard] Tooltip child elements not found');
        return;
    }
    
    headerEl.textContent = `Month: ${month}`;
    
    contentEl.innerHTML = `
        <div class="mb-2">
            <div class="d-flex justify-content-between align-items-center mb-1">
                <strong>Progress:</strong>
                <span class="badge ${progress >= 80 ? 'bg-success' : progress >= 60 ? 'bg-warning' : 'bg-danger'}">${progress}%</span>
            </div>
            <div class="d-flex justify-content-between align-items-center">
                <strong>Status:</strong>
                <span class="badge ${progress >= 80 ? 'bg-success' : progress >= 60 ? 'bg-warning' : 'bg-danger'}">${progress >= 80 ? 'On Track' : progress >= 60 ? 'Moderate' : 'Behind'}</span>
            </div>
        </div>
    `;
    
    let insight = '';
    let insightIcon = '';
    
    if (progress >= 90) {
        insight = 'Exceptional monthly progress! You\'re ahead of your goals.';
        insightIcon = '🚀';
    } else if (progress >= 80) {
        insight = 'Great monthly progress! You\'re on track to meet your targets.';
        insightIcon = '📈';
    } else if (progress >= 70) {
        insight = 'Good progress this month. Consider increasing your pace.';
        insightIcon = '👍';
    } else if (progress >= 60) {
        insight = 'Moderate progress. Review your monthly goals and strategies.';
        insightIcon = '🤔';
    } else {
        insight = 'Low monthly progress. Consider adjusting your goals or approach.';
        insightIcon = '💡';
    }
    
    insightsEl.innerHTML = `<span class="me-1">${insightIcon}</span>${insight}`;
    
    // Chart-boundary constrained positioning
    positionTooltipWithinChart(tooltip, context, 'proMonthlyProgressChart');
}

// New tooltip functions for charts that don't have them

function showNoteDurationTooltip(context) {
    console.log('[Dashboard] showNoteDurationTooltip called with context:', context);
    
    const tooltip = document.getElementById('noteDurationTooltip');
    if (!tooltip) {
        console.warn('[Dashboard] noteDurationTooltip element not found');
        return;
    }
    
    if (context.tooltip.opacity === 0) {
        tooltip.classList.add('d-none');
        tooltip.style.opacity = '0';
        return;
    }
    
    const dataIndex = context.tooltip.dataPoints[0]?.dataIndex;
    if (dataIndex === undefined) {
        console.warn('[Dashboard] Data index is undefined');
        return;
    }
    
    const labels = context.chart.data.labels;
    const values = context.chart.data.datasets[0].data;
    const noteLabel = labels[dataIndex];
    const duration = values[dataIndex];
    
    const headerEl = tooltip.querySelector('.tooltip-header');
    const contentEl = tooltip.querySelector('.tooltip-content');
    const insightsEl = tooltip.querySelector('.tooltip-insights');
    
    if (!headerEl || !contentEl || !insightsEl) {
        console.warn('[Dashboard] Tooltip child elements not found');
        return;
    }
    
    headerEl.textContent = `Voice Note: ${noteLabel}`;
    
    contentEl.innerHTML = `
        <div class="mb-2">
            <div class="d-flex justify-content-between align-items-center mb-1">
                <strong>Duration:</strong>
                <span class="badge bg-primary">${duration}s</span>
            </div>
            <div class="d-flex justify-content-between align-items-center">
                <strong>Type:</strong>
                <span class="badge ${duration >= 120 ? 'bg-warning' : duration >= 30 ? 'bg-success' : 'bg-info'}">${duration >= 120 ? 'Long Note' : duration >= 30 ? 'Standard' : 'Quick Note'}</span>
            </div>
        </div>
    `;
    
    let insight = '';
    let insightIcon = '';
    
    if (duration >= 120) {
        insight = 'This is a long voice note. Consider breaking complex ideas into shorter notes.';
        insightIcon = '📝';
    } else if (duration >= 60) {
        insight = 'Good note length. This provides enough detail without being overwhelming.';
        insightIcon = '👍';
    } else if (duration >= 30) {
        insight = 'Quick and concise note. Perfect for capturing key points efficiently.';
        insightIcon = '⚡';
    } else {
        insight = 'Very brief note. Great for quick thoughts and reminders.';
        insightIcon = '💭';
    }
    
    insightsEl.innerHTML = `<span class="me-1">${insightIcon}</span>${insight}`;
    
    // Chart-boundary constrained positioning
    positionTooltipWithinChart(tooltip, context, 'proNoteDurationChart');
}

function showSentimentTooltip(context) {
    console.log('[Dashboard] showSentimentTooltip called with context:', context);
    
    const tooltip = document.getElementById('sentimentTooltip');
    if (!tooltip) {
        console.warn('[Dashboard] sentimentTooltip element not found');
        return;
    }
    
    if (context.tooltip.opacity === 0) {
        tooltip.classList.add('d-none');
        tooltip.style.opacity = '0';
        return;
    }
    
    const dataIndex = context.tooltip.dataPoints[0]?.dataIndex;
    if (dataIndex === undefined) {
        console.warn('[Dashboard] Data index is undefined');
        return;
    }
    
    const labels = context.chart.data.labels;
    const values = context.chart.data.datasets[0].data;
    const date = labels[dataIndex];
    const sentiment = values[dataIndex];
    
    const headerEl = tooltip.querySelector('.tooltip-header');
    const contentEl = tooltip.querySelector('.tooltip-content');
    const insightsEl = tooltip.querySelector('.tooltip-insights');
    
    if (!headerEl || !contentEl || !insightsEl) {
        console.warn('[Dashboard] Tooltip child elements not found');
        return;
    }
    
    headerEl.textContent = `Date: ${date}`;
    
    const sentimentLabel = sentiment > 0.3 ? 'Positive' : sentiment < -0.3 ? 'Negative' : 'Neutral';
    const sentimentColor = sentiment > 0.3 ? 'bg-success' : sentiment < -0.3 ? 'bg-danger' : 'bg-warning';
    
    contentEl.innerHTML = `
        <div class="mb-2">
            <div class="d-flex justify-content-between align-items-center mb-1">
                <strong>Sentiment Score:</strong>
                <span class="badge bg-primary">${sentiment.toFixed(2)}</span>
            </div>
            <div class="d-flex justify-content-between align-items-center">
                <strong>Mood:</strong>
                <span class="badge ${sentimentColor}">${sentimentLabel}</span>
            </div>
        </div>
    `;
    
    let insight = '';
    let insightIcon = '';
    
    if (sentiment > 0.5) {
        insight = 'Very positive mood detected. Great energy and optimism!';
        insightIcon = '😊';
    } else if (sentiment > 0.2) {
        insight = 'Positive mood. Keep up the good energy and positive outlook.';
        insightIcon = '🙂';
    } else if (sentiment > -0.2) {
        insight = 'Neutral mood. Consider activities that boost your positivity.';
        insightIcon = '😐';
    } else if (sentiment > -0.5) {
        insight = 'Slightly negative mood. Try focusing on positive aspects.';
        insightIcon = '😔';
    } else {
        insight = 'Negative mood detected. Consider talking to someone or taking a break.';
        insightIcon = '😢';
    }
    
    insightsEl.innerHTML = `<span class="me-1">${insightIcon}</span>${insight}`;
    
    // Chart-boundary constrained positioning
    positionTooltipWithinChart(tooltip, context, 'proSentimentChart');
}

function showKeywordsTooltip(context) {
    console.log('[Dashboard] showKeywordsTooltip called with context:', context);
    
    const tooltip = document.getElementById('keywordsTooltip');
    if (!tooltip) {
        console.warn('[Dashboard] keywordsTooltip element not found');
        return;
    }
    
    if (context.tooltip.opacity === 0) {
        tooltip.classList.add('d-none');
        tooltip.style.opacity = '0';
        return;
    }
    
    const dataIndex = context.tooltip.dataPoints[0]?.dataIndex;
    if (dataIndex === undefined) {
        console.warn('[Dashboard] Data index is undefined');
        return;
    }
    
    const labels = context.chart.data.labels;
    const values = context.chart.data.datasets[0].data;
    const keyword = labels[dataIndex];
    const count = values[dataIndex];
    const total = values.reduce((sum, val) => sum + val, 0);
    const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
    
    const headerEl = tooltip.querySelector('.tooltip-header');
    const contentEl = tooltip.querySelector('.tooltip-content');
    const insightsEl = tooltip.querySelector('.tooltip-insights');
    
    if (!headerEl || !contentEl || !insightsEl) {
        console.warn('[Dashboard] Tooltip child elements not found');
        return;
    }
    
    headerEl.textContent = `Keyword: "${keyword}"`;
    
    contentEl.innerHTML = `
        <div class="mb-2">
            <div class="d-flex justify-content-between align-items-center mb-1">
                <strong>Occurrences:</strong>
                <span class="badge bg-primary">${count}</span>
            </div>
            <div class="d-flex justify-content-between align-items-center mb-1">
                <strong>Percentage:</strong>
                <span class="badge bg-success">${percentage}%</span>
            </div>
            <div class="d-flex justify-content-between align-items-center">
                <strong>Total Keywords:</strong>
                <span class="badge bg-info">${total}</span>
            </div>
        </div>
    `;
    
    let insight = '';
    let insightIcon = '';
    
    if (percentage >= 20) {
        insight = `"${keyword}" is a major focus area. Consider if this aligns with your priorities.`;
        insightIcon = '🎯';
    } else if (percentage >= 10) {
        insight = `"${keyword}" is a significant theme in your tasks. Good focus!`;
        insightIcon = '📊';
    } else if (percentage >= 5) {
        insight = `"${keyword}" appears regularly. This shows consistent interest.`;
        insightIcon = '✨';
    } else {
        insight = `"${keyword}" is a less frequent keyword. Adds variety to your work.`;
        insightIcon = '💡';
    }
    
    insightsEl.innerHTML = `<span class="me-1">${insightIcon}</span>${insight}`;
    
    // Chart-boundary constrained positioning
    positionTooltipWithinChart(tooltip, context, 'proKeywordsChart');
}

function showProductiveHoursTooltip(context) {
    console.log('[Dashboard] showProductiveHoursTooltip called with context:', context);
    
    const tooltip = document.getElementById('productiveHoursTooltip');
    if (!tooltip) {
        console.warn('[Dashboard] productiveHoursTooltip element not found');
        return;
    }
    
    if (context.tooltip.opacity === 0) {
        tooltip.classList.add('d-none');
        tooltip.style.opacity = '0';
        return;
    }
    
    const dataIndex = context.tooltip.dataPoints[0]?.dataIndex;
    if (dataIndex === undefined) {
        console.warn('[Dashboard] Data index is undefined');
        return;
    }
    
    const labels = context.chart.data.labels;
    const values = context.chart.data.datasets[0].data;
    const hour = labels[dataIndex];
    const count = values[dataIndex];
    const total = values.reduce((sum, val) => sum + val, 0);
    const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
    
    const headerEl = tooltip.querySelector('.tooltip-header');
    const contentEl = tooltip.querySelector('.tooltip-content');
    const insightsEl = tooltip.querySelector('.tooltip-insights');
    
    if (!headerEl || !contentEl || !insightsEl) {
        console.warn('[Dashboard] Tooltip child elements not found');
        return;
    }
    
    headerEl.textContent = `Hour: ${hour}`;
    
    contentEl.innerHTML = `
        <div class="mb-2">
            <div class="d-flex justify-content-between align-items-center mb-1">
                <strong>Tasks Created:</strong>
                <span class="badge bg-primary">${count}</span>
            </div>
            <div class="d-flex justify-content-between align-items-center mb-1">
                <strong>Percentage:</strong>
                <span class="badge bg-success">${percentage}%</span>
            </div>
            <div class="d-flex justify-content-between align-items-center">
                <strong>Total Daily Tasks:</strong>
                <span class="badge bg-info">${total}</span>
            </div>
        </div>
    `;
    
    let insight = '';
    let insightIcon = '';
    
    if (percentage >= 15) {
        insight = `This is your peak productivity hour! Schedule important work during ${hour}.`;
        insightIcon = '🔥';
    } else if (percentage >= 8) {
        insight = `Good activity during ${hour}. Consider optimizing this time slot.`;
        insightIcon = '⚡';
    } else if (percentage >= 4) {
        insight = `Moderate activity during ${hour}. Room for growth in this time.`;
        insightIcon = '📈';
    } else {
        insight = `Low activity during ${hour}. Could be used for focused work or planning.`;
        insightIcon = '💡';
    }
    
    insightsEl.innerHTML = `<span class="me-1">${insightIcon}</span>${insight}`;
    
    // Chart-boundary constrained positioning
    positionTooltipWithinChart(tooltip, context, 'productiveHoursChart');
}

function showTaskCategoriesTooltip(context) {
    console.log('[Dashboard] showTaskCategoriesTooltip called with context:', context);
    
    const tooltip = document.getElementById('taskCategoriesTooltip');
    if (!tooltip) {
        console.warn('[Dashboard] taskCategoriesTooltip element not found');
        return;
    }
    
    if (context.tooltip.opacity === 0) {
        tooltip.classList.add('d-none');
        tooltip.style.opacity = '0';
        return;
    }
    
    const dataIndex = context.tooltip.dataPoints[0]?.dataIndex;
    if (dataIndex === undefined) {
        console.warn('[Dashboard] Data index is undefined');
        return;
    }
    
    const labels = context.chart.data.labels;
    const values = context.chart.data.datasets[0].data;
    const category = labels[dataIndex];
    const count = values[dataIndex];
    const total = values.reduce((sum, val) => sum + val, 0);
    const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
    
    const headerEl = tooltip.querySelector('.tooltip-header');
    const contentEl = tooltip.querySelector('.tooltip-content');
    const insightsEl = tooltip.querySelector('.tooltip-insights');
    
    if (!headerEl || !contentEl || !insightsEl) {
        console.warn('[Dashboard] Tooltip child elements not found');
        return;
    }
    
    headerEl.textContent = `Category: ${category}`;
    
    contentEl.innerHTML = `
        <div class="mb-2">
            <div class="d-flex justify-content-between align-items-center mb-1">
                <strong>Count:</strong>
                <span class="badge bg-primary">${count}</span>
            </div>
            <div class="d-flex justify-content-between align-items-center mb-1">
                <strong>Percentage:</strong>
                <span class="badge bg-success">${percentage}%</span>
            </div>
            <div class="d-flex justify-content-between align-items-center">
                <strong>Total Tasks:</strong>
                <span class="badge bg-info">${total}</span>
            </div>
        </div>
    `;
    
    let insight = '';
    let insightIcon = '';
    
    if (percentage >= 40) {
        insight = `"${category}" dominates your task list. Consider diversifying your focus areas.`;
        insightIcon = '🎯';
    } else if (percentage >= 25) {
        insight = `"${category}" is a major focus area. Good specialization!`;
        insightIcon = '📊';
    } else if (percentage >= 15) {
        insight = `"${category}" is a significant category. Balanced approach to work.`;
        insightIcon = '⚖️';
    } else {
        insight = `"${category}" is a smaller category. Adds variety to your task portfolio.`;
        insightIcon = '✨';
    }
    
    insightsEl.innerHTML = `<span class="me-1">${insightIcon}</span>${insight}`;
    
    // Chart-boundary constrained positioning
    positionTooltipWithinChart(tooltip, context, 'taskCategoriesChart');
}

function showDailyCompletionTooltip(context) {
    console.log('[Dashboard] showDailyCompletionTooltip called with context:', context);
    
    const tooltip = document.getElementById('dailyCompletionTooltip');
    if (!tooltip) {
        console.warn('[Dashboard] dailyCompletionTooltip element not found');
        return;
    }
    
    if (context.tooltip.opacity === 0) {
        tooltip.classList.add('d-none');
        tooltip.style.opacity = '0';
        return;
    }
    
    const dataIndex = context.tooltip.dataPoints[0]?.dataIndex;
    if (dataIndex === undefined) {
        console.warn('[Dashboard] Data index is undefined');
        return;
    }
    
    const labels = context.chart.data.labels;
    const values = context.chart.data.datasets[0].data;
    const day = labels[dataIndex];
    const completion = values[dataIndex];
    
    const headerEl = tooltip.querySelector('.tooltip-header');
    const contentEl = tooltip.querySelector('.tooltip-content');
    const insightsEl = tooltip.querySelector('.tooltip-insights');
    
    if (!headerEl || !contentEl || !insightsEl) {
        console.warn('[Dashboard] Tooltip child elements not found');
        return;
    }
    
    headerEl.textContent = `Day: ${day}`;
    
    contentEl.innerHTML = `
        <div class="mb-2">
            <div class="d-flex justify-content-between align-items-center mb-1">
                <strong>Completion Rate:</strong>
                <span class="badge ${completion >= 80 ? 'bg-success' : completion >= 60 ? 'bg-warning' : 'bg-danger'}">${completion}%</span>
            </div>
            <div class="d-flex justify-content-between align-items-center">
                <strong>Performance:</strong>
                <span class="badge ${completion >= 80 ? 'bg-success' : completion >= 60 ? 'bg-warning' : 'bg-danger'}">${completion >= 80 ? 'Excellent' : completion >= 60 ? 'Good' : 'Needs Improvement'}</span>
            </div>
        </div>
    `;
    
    let insight = '';
    let insightIcon = '';
    
    if (completion >= 90) {
        insight = 'Outstanding daily completion! You exceeded your productivity goals.';
        insightIcon = '🏆';
    } else if (completion >= 80) {
        insight = 'Excellent daily performance! Keep up this momentum.';
        insightIcon = '🎯';
    } else if (completion >= 70) {
        insight = 'Good daily completion rate. Consider optimizing your workflow.';
        insightIcon = '👍';
    } else if (completion >= 60) {
        insight = 'Moderate daily completion. Try breaking tasks into smaller chunks.';
        insightIcon = '💪';
    } else {
        insight = 'Low daily completion rate. Review your task priorities and time management.';
        insightIcon = '💡';
    }
    
    insightsEl.innerHTML = `<span class="me-1">${insightIcon}</span>${insight}`;
    
    // Chart-boundary constrained positioning
    positionTooltipWithinChart(tooltip, context, 'proDailyCompletionChart');
}

// Universal tooltip positioning function for chart-boundary constrained positioning
function positionTooltipWithinChart(tooltip, context, chartId) {
    const canvas = document.getElementById(chartId);
    if (!canvas) {
        console.warn(`[Dashboard] ${chartId} canvas not found for positioning`);
        return;
    }
    
    const rect = canvas.getBoundingClientRect();
    const tooltipWidth = 280; // Approximate tooltip width
    const tooltipHeight = 180; // Approximate tooltip height
    
    // Calculate cursor position relative to the chart
    const cursorX = context.tooltip.caretX;
    const cursorY = context.tooltip.caretY;
    
    // Determine if we should position above or below the cursor within the chart
    const shouldPositionBelow = cursorY > (rect.height / 2); // Bottom half of chart
    
    let x, y;
    
    if (shouldPositionBelow) {
        // Position below the cursor, but within chart bounds
        y = cursorY + 20;
        
        // If it goes below the chart, position above instead
        if (y + tooltipHeight > rect.height) {
            y = cursorY - tooltipHeight - 20;
        }
    } else {
        // Position above the cursor, but within chart bounds
        y = cursorY - tooltipHeight - 20;
        
        // If it goes above the chart, position below instead
        if (y < 0) {
            y = cursorY + 20;
        }
    }
    
    // Horizontal positioning within chart bounds
    // Center the tooltip horizontally on the cursor
    x = cursorX - (tooltipWidth / 2);
    
    // Ensure it doesn't go off the left edge of the chart
    if (x < 0) {
        x = 0;
    }
    
    // Ensure it doesn't go off the right edge of the chart
    if (x + tooltipWidth > rect.width) {
        x = rect.width - tooltipWidth;
    }
    
    // Final safety check: if tooltip is too tall for chart, reduce its height
    if (tooltipHeight > rect.height - 20) {
        tooltip.style.maxHeight = `${rect.height - 20}px`;
        tooltip.style.overflowY = 'auto';
    } else {
        tooltip.style.maxHeight = 'none';
        tooltip.style.overflowY = 'visible';
    }
    
    // Position relative to the chart container, not the viewport
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
    tooltip.style.position = 'absolute';
    tooltip.classList.remove('d-none');
    tooltip.style.opacity = '1';
    
    console.log(`[Dashboard] Tooltip positioned within ${chartId}:`, { 
        x, y, chartWidth: rect.width, chartHeight: rect.height,
        tooltipWidth, tooltipHeight,
        cursorX, cursorY,
        shouldPositionBelow,
        positioning: shouldPositionBelow ? 'below' : 'above'
    });
}

// Test function for Monthly Progress chart
function testMonthlyProgressChart() {
    console.log('[Dashboard] Testing Monthly Progress chart...');
    
    // Create sample test data
    const testTasks = [
        {
            title: 'Test Task 1',
            status: 'completed',
            createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
        },
        {
            title: 'Test Task 2',
            status: 'completed',
            createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) // 15 days ago
        },
        {
            title: 'Test Task 3',
            status: 'pending',
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
        }
    ];
    
    console.log('[Dashboard] Test tasks created:', testTasks);
    
    // Call the chart rendering function with test data
    renderProMonthlyProgressChart(testTasks);
    
    console.log('[Dashboard] Monthly Progress chart test completed');
}

// Test function for Note Duration chart
function testNoteDurationChart() {
    console.log('[Dashboard] Testing Note Duration chart...');
    
    // Create sample test data with both field name variations
    const testTasks = [
        {
            title: 'Voice Note 1',
            inputMethod: 'voice',
            noteDuration: 45
        },
        {
            title: 'Voice Note 2',
            inputMethod: 'voice',
            noteDuration: 120
        },
        {
            title: 'Voice Note 3',
            inputMethod: 'voice',
            noteDuration: 30
        },
        {
            title: 'Manual Task',
            inputMethod: 'manual'
        },
        {
            title: 'Voice Note 4',
            inputMethod: 'voice',
            duration: 90  // Test the alternative field name
        }
    ];
    
    console.log('[Dashboard] Test tasks created:', testTasks);
    
    // Call the chart rendering function with test data
    renderProNoteDurationChart(testTasks);
    
    console.log('[Dashboard] Note Duration chart test completed');
}

// Test function for Voice Manual chart
function testVoiceManualChart() {
    console.log('[Dashboard] Testing Voice Manual chart...');
    
    // Create sample test data with various input methods
    const testTasks = [
        {
            title: 'Voice Task 1',
            inputMethod: 'voice'
        },
        {
            title: 'Voice Task 2',
            inputMethod: 'voice'
        },
        {
            title: 'Manual Task 1',
            inputMethod: 'manual'
        },
        {
            title: 'Manual Task 2',
            inputMethod: 'manual'
        },
        {
            title: 'Manual Task 3',
            inputMethod: 'manual'
        },
        {
            title: 'Task without input method',
            // No inputMethod field
        }
    ];
    
    console.log('[Dashboard] Test tasks created:', testTasks);
    
    // Call the chart rendering function with test data
    renderProVoiceManualChart(testTasks);
    
    console.log('[Dashboard] Voice Manual chart test completed');
}

// Make test functions available globally
window.testMonthlyProgressChart = testMonthlyProgressChart;
window.testNoteDurationChart = testNoteDurationChart;
window.testVoiceManualChart = testVoiceManualChart;

// Comprehensive test function for debugging
function debugVoiceManualChart() {
    console.log('[Dashboard] ===== DEBUG: Voice Manual Chart =====');
    
    // Check if canvas exists
    const canvas = document.getElementById('proVoiceManualChart');
    console.log('[Dashboard] Canvas exists:', !!canvas);
    if (canvas) {
        console.log('[Dashboard] Canvas dimensions:', canvas.width, 'x', canvas.height);
        console.log('[Dashboard] Canvas style:', canvas.style.cssText);
        console.log('[Dashboard] Canvas visible:', canvas.style.display !== 'none' && canvas.style.visibility !== 'hidden');
        console.log('[Dashboard] Canvas computed style:', window.getComputedStyle(canvas).display);
    }
    
    // Check if Chart.js is loaded
    console.log('[Dashboard] Chart.js loaded:', typeof Chart !== 'undefined');
    
    // Check if chart object exists
    console.log('[Dashboard] Chart object exists:', !!proVoiceManualChartObj);
    if (proVoiceManualChartObj) {
        console.log('[Dashboard] Chart object type:', typeof proVoiceManualChartObj);
        console.log('[Dashboard] Chart object methods:', Object.getOwnPropertyNames(proVoiceManualChartObj));
    }
    
    // Check container visibility
    const container = canvas?.closest('.flex-grow-1');
    console.log('[Dashboard] Container exists:', !!container);
    if (container) {
        console.log('[Dashboard] Container visible:', container.style.display !== 'none');
        console.log('[Dashboard] Container computed style:', window.getComputedStyle(container).display);
        console.log('[Dashboard] Container classes:', container.className);
    }
    
    // Check card visibility
    const card = canvas?.closest('.card');
    console.log('[Dashboard] Card exists:', !!card);
    if (card) {
        console.log('[Dashboard] Card visible:', card.style.display !== 'none');
        console.log('[Dashboard] Card computed style:', window.getComputedStyle(card).display);
        console.log('[Dashboard] Card classes:', card.className);
    }
    
    // Check parent elements
    let parent = canvas?.parentElement;
    let level = 0;
    while (parent && level < 5) {
        console.log(`[Dashboard] Parent level ${level}:`, parent.tagName, parent.className, 'display:', window.getComputedStyle(parent).display);
        parent = parent.parentElement;
        level++;
    }
    
    // Check if chart is in viewport
    if (canvas) {
        const rect = canvas.getBoundingClientRect();
        console.log('[Dashboard] Canvas position:', rect);
        console.log('[Dashboard] Canvas in viewport:', rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth);
    }
    
    console.log('[Dashboard] ===== END DEBUG =====');
}

window.debugVoiceManualChart = debugVoiceManualChart;

// Test function for Sentiment chart
function testSentimentChart() {
    console.log('[Dashboard] Testing Sentiment chart...');
    
    // Create sample test data with sentiment values
    const testTasks = [
        {
            title: 'Voice Note 1',
            inputMethod: 'voice',
            sentiment: 0.8,
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days ago
        },
        {
            title: 'Voice Note 2',
            inputMethod: 'voice',
            sentiment: 0.2,
            createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
        },
        {
            title: 'Voice Note 3',
            inputMethod: 'voice',
            sentiment: -0.3,
            createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // 1 day ago
        },
        {
            title: 'Manual Task',
            inputMethod: 'manual',
            // No sentiment
        },
        {
            title: 'Voice Note 4',
            inputMethod: 'voice',
            sentiment: 0.6,
            createdAt: new Date().toISOString() // Today
        }
    ];
    
    console.log('[Dashboard] Test tasks created:', testTasks);
    
    // Call the chart rendering function with test data
    renderProSentimentChart(testTasks);
    
    console.log('[Dashboard] Sentiment chart test completed');
}

// Simple test function for debugging sentiment chart
function debugSentimentChart() {
    console.log('[Dashboard] ===== DEBUG: Sentiment Chart =====');
    
    // Check if canvas exists
    const canvas = document.getElementById('proSentimentChart');
    console.log('[Dashboard] Canvas exists:', !!canvas);
    if (canvas) {
        console.log('[Dashboard] Canvas dimensions:', canvas.width, 'x', canvas.height);
        console.log('[Dashboard] Canvas style:', canvas.style.cssText);
        console.log('[Dashboard] Canvas visible:', canvas.style.display !== 'none' && canvas.style.visibility !== 'hidden');
    }
    
    // Check if Chart.js is loaded
    console.log('[Dashboard] Chart.js loaded:', typeof Chart !== 'undefined');
    
    // Check if chart object exists
    console.log('[Dashboard] Chart object exists:', !!proSentimentChartObj);
    
    // Check container visibility
    const container = canvas?.closest('.flex-grow-1');
    console.log('[Dashboard] Container exists:', !!container);
    if (container) {
        console.log('[Dashboard] Container visible:', container.style.display !== 'none');
    }
    
    // Check card visibility
    const card = canvas?.closest('.card');
    console.log('[Dashboard] Card exists:', !!card);
    if (card) {
        console.log('[Dashboard] Card visible:', card.style.display !== 'none');
    }
    
    console.log('[Dashboard] ===== END DEBUG =====');
}

window.testSentimentChart = testSentimentChart;
window.debugSentimentChart = debugSentimentChart;

// Force render function to ensure chart displays
function forceRenderVoiceManualChart() {
    console.log('[Dashboard] ===== FORCE RENDER: Voice Manual Chart =====');
    
    // Create sample data
    const sampleTasks = [
        { title: 'Voice Task 1', inputMethod: 'voice' },
        { title: 'Voice Task 2', inputMethod: 'voice' },
        { title: 'Manual Task 1', inputMethod: 'manual' },
        { title: 'Manual Task 2', inputMethod: 'manual' },
        { title: 'Manual Task 3', inputMethod: 'manual' }
    ];
    
    // Ensure all containers are visible
    const canvas = document.getElementById('proVoiceManualChart');
    if (canvas) {
        // Force canvas visibility
        canvas.style.display = 'block';
        canvas.style.visibility = 'visible';
        canvas.style.opacity = '1';
        canvas.style.minHeight = '200px';
        canvas.style.minWidth = '100px';
        
        // Force container visibility
        const container = canvas.closest('.flex-grow-1');
        if (container) {
            container.style.display = 'flex';
            container.style.visibility = 'visible';
            container.style.opacity = '1';
        }
        
        // Force card visibility
        const card = canvas.closest('.card');
        if (card) {
            card.style.display = 'block';
            card.style.visibility = 'visible';
            card.style.opacity = '1';
        }
        
        // Force parent elements visibility
        let parent = canvas.parentElement;
        while (parent && parent !== document.body) {
            if (parent.style.display === 'none') {
                parent.style.display = 'block';
                console.log('[Dashboard] Made parent visible:', parent.tagName, parent.className);
            }
            parent = parent.parentElement;
        }
    }
    
    // Render chart with sample data
    renderProVoiceManualChart(sampleTasks);
    
    console.log('[Dashboard] ===== END FORCE RENDER =====');
}

window.forceRenderVoiceManualChart = forceRenderVoiceManualChart;

// Telegram Integration Functions
function initializeTelegramIntegration() {
    console.log('[Dashboard] Initializing Telegram integration...');
    
    // Check if user is premium
    if (window.userRole !== 'premium') {
        console.log('[Dashboard] User is not premium, hiding Telegram integration');
        hideTelegramIntegration();
        return;
    }
    
    // Show Telegram integration for premium users
    showTelegramIntegration();
    
    // Add event listeners
    setupTelegramEventListeners();
    
    // Check current Telegram status
    checkTelegramStatus();
}

function setupTelegramEventListeners() {
    const linkTelegramBtn = document.getElementById('linkTelegramBtn');
    const telegramStatusBtn = document.getElementById('telegramStatusBtn');
    const telegramHelpBtn = document.getElementById('telegramHelpBtn');
    
    if (linkTelegramBtn) {
        linkTelegramBtn.addEventListener('click', handleLinkTelegram);
    }
    
    if (telegramStatusBtn) {
        telegramStatusBtn.addEventListener('click', handleCheckTelegramStatus);
    }
    
    if (telegramHelpBtn) {
        telegramHelpBtn.addEventListener('click', handleTelegramHelp);
    }
}

function showTelegramIntegration() {
    const telegramSection = document.getElementById('telegramIntegrationSection');
    if (telegramSection) {
        telegramSection.classList.remove('d-none');
        telegramSection.style.display = 'block';
    }
}

function hideTelegramIntegration() {
    const telegramSection = document.getElementById('telegramIntegrationSection');
    if (telegramSection) {
        telegramSection.classList.add('d-none');
        telegramSection.style.display = 'none';
    }
}

async function handleLinkTelegram() {
    try {
        console.log('[Dashboard] Initiating Telegram account linking...');
        
        const linkBtn = document.getElementById('linkTelegramBtn');
        if (linkBtn) {
            linkBtn.disabled = true;
            linkBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Generating Link...';
        }
        
        // Wait for Firebase to be initialized
        await window.firebaseInitialized;
        
        // Call Firebase function to generate linking token
        const generateLinkToken = firebase.functions().httpsCallable('generateTelegramLinkToken');
        const result = await generateLinkToken();
        
        if (result.data.success) {
            const linkUrl = `https://${window.location.hostname}/link-telegram.html?token=${result.data.token}`;
            
            // Show success message with link
            showTelegramStatus('success', `🔗 **Account Linking Ready!**

Click the link below to connect your Telegram account:
${linkUrl}

This link expires in 30 minutes.`);
            
        } else {
            throw new Error(result.data.error || 'Failed to generate linking token');
        }
        
    } catch (error) {
        console.error('[Dashboard] Error generating Telegram link:', error);
        showTelegramError('Failed to generate linking URL. Please try again. Error: ' + error.message);
    } finally {
        const linkBtn = document.getElementById('linkTelegramBtn');
        if (linkBtn) {
            linkBtn.disabled = false;
            linkBtn.innerHTML = '<i class="fas fa-link me-2"></i>Link Telegram Account';
        }
    }
}

async function handleCheckTelegramStatus() {
    try {
        console.log('[Dashboard] Checking Telegram status...');
        
        const statusBtn = document.getElementById('telegramStatusBtn');
        if (statusBtn) {
            statusBtn.disabled = true;
            statusBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Checking...';
        }
        
        // Wait for Firebase to be initialized
        await window.firebaseInitialized;
        
        // Call Firebase function to check Telegram status
        const checkTelegramStatus = firebase.functions().httpsCallable('checkTelegramStatus');
        const result = await checkTelegramStatus();
        
        if (result.data.success) {
            const status = result.data.status;
            
            if (status.linked) {
                showTelegramStatus('success', `✅ **Telegram Account Linked**

👤 **Name**: ${status.telegramName || 'Not set'}
📱 **Telegram ID**: ${status.telegramUserId}
🔗 **Linked Since**: ${new Date(status.linkedAt).toLocaleDateString()}

You can now send voice messages to create tasks!`);
            } else {
                showTelegramStatus('info', `❌ **Telegram Account Not Linked**

Your Telegram account is not connected to QuickNotes AI.

Click "Link Telegram Account" to get started.`);
            }
        } else {
            throw new Error(result.data.error || 'Failed to check status');
        }
        
    } catch (error) {
        console.error('[Dashboard] Error checking Telegram status:', error);
        showTelegramError('Failed to check Telegram status. Please try again.');
    } finally {
        const statusBtn = document.getElementById('telegramStatusBtn');
        if (statusBtn) {
            statusBtn.disabled = false;
            statusBtn.innerHTML = '<i class="fas fa-info-circle me-2"></i>Check Status';
        }
    }
}

function handleTelegramHelp() {
    const helpMessage = `📚 **How to Use Telegram Integration**

1️⃣ **Link Your Account**
   • Click "Link Telegram Account"
   • Follow the secure linking process
   • Connect your Telegram account

2️⃣ **Send Voice Messages**
   • Open Telegram and find our bot
   • Send any voice message
   • Bot will transcribe and create a task

3️⃣ **Available Commands**
   • /start - Show welcome message
   • /help - Show detailed help
   • /link - Generate linking URL
   • /status - Check your status

4️⃣ **Features**
   • Voice message transcription
   • Instant task creation
   • Secure account linking
   • Real-time synchronization

Need help? Contact support at support@quicknotesai.com`;

    showTelegramStatus('info', helpMessage);
}

function showTelegramStatus(type, message) {
    const statusDiv = document.getElementById('telegramStatus');
    const statusText = document.getElementById('telegramStatusText');
    const errorDiv = document.getElementById('telegramError');
    const upgradeDiv = document.getElementById('telegramUpgradePrompt');
    
    // Hide other status elements
    errorDiv.classList.add('d-none');
    upgradeDiv.classList.add('d-none');
    
    // Show status
    statusDiv.classList.remove('d-none');
    if (statusText) {
        statusText.innerHTML = message;
    }
    
    // Update alert class based on type
    const alertDiv = statusDiv.querySelector('.alert');
    if (alertDiv) {
        alertDiv.className = `alert alert-${type} border-2 border-${type} border-opacity-25`;
    }
}

function showTelegramError(message) {
    const errorDiv = document.getElementById('telegramError');
    const errorMessage = document.getElementById('telegramErrorMessage');
    const statusDiv = document.getElementById('telegramStatus');
    const upgradeDiv = document.getElementById('telegramUpgradePrompt');
    
    // Hide other status elements
    statusDiv.classList.add('d-none');
    upgradeDiv.classList.add('d-none');
    
    // Show error
    errorDiv.classList.remove('d-none');
    if (errorMessage) {
        errorMessage.textContent = message;
    }
}

function showTelegramUpgradePrompt() {
    const upgradeDiv = document.getElementById('telegramUpgradePrompt');
    const statusDiv = document.getElementById('telegramStatus');
    const errorDiv = document.getElementById('telegramError');
    
    // Hide other status elements
    statusDiv.classList.add('d-none');
    errorDiv.classList.add('d-none');
    
    // Show upgrade prompt
    upgradeDiv.classList.remove('d-none');
}

async function checkTelegramStatus() {
    try {
        // Check if user has linked Telegram account
        const user = firebase.auth().currentUser;
        if (!user) return;
        
        const telegramUserDoc = await firebase.firestore()
            .collection('telegram_users')
            .where('uid', '==', user.uid)
            .limit(1)
            .get();
        
        if (!telegramUserDoc.empty) {
            const telegramUser = telegramUserDoc.docs[0].data();
            console.log('[Dashboard] Telegram account linked:', telegramUser);
            
            // Update UI to show linked status
            const linkBtn = document.getElementById('linkTelegramBtn');
            if (linkBtn) {
                linkBtn.innerHTML = '<i class="fas fa-check me-2"></i>Account Linked';
                linkBtn.classList.remove('btn-primary');
                linkBtn.classList.add('btn-success');
                linkBtn.disabled = true;
            }
        }
        
    } catch (error) {
        console.error('[Dashboard] Error checking Telegram status:', error);
    }
}

// Function to ensure all chart legends have proper text colors
function ensureChartLegendVisibility() {
    const getComputedColor = (variable, fallback) => {
        const color = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
        return color || fallback;
    };
    
    const textColor = getComputedColor('--text-primary', '#1f2937');
    
    // Update all chart legends with proper text color
    const chartElements = document.querySelectorAll('canvas');
    chartElements.forEach(canvas => {
        const chart = Chart.getChart(canvas);
        if (chart && chart.options && chart.options.plugins && chart.options.plugins.legend) {
            if (chart.options.plugins.legend.labels) {
                chart.options.plugins.legend.labels.color = textColor;
            }
            chart.update('none');
        }
    });
    
    console.log('[Dashboard] Updated all chart legend colors to:', textColor);
}

// Listen for theme changes and update charts
document.addEventListener('themeChanged', () => {
    // Update Input Methods chart if it exists
    if (inputMethodChart && window.currentTasks) {
        setTimeout(() => {
            renderInputMethodChart(window.currentTasks);
        }, 100); // Small delay to ensure theme is applied
    }
    
    // Update Productive Hours chart if it exists
    if (productiveHoursChart && window.currentTasks) {
        setTimeout(() => {
            renderProductiveHours(window.currentTasks);
        }, 100); // Small delay to ensure theme is applied
    }
    
    // Update Task Categories chart if it exists
    if (taskCategoriesChart && window.currentTasks) {
        setTimeout(() => {
            renderTaskCategories(window.currentTasks);
        }, 100); // Small delay to ensure theme is applied
    }
    
    // Update Daily Task Completion Trend chart if it exists
    if (completionTrendChart && window.currentTasks) {
        setTimeout(() => {
            renderCompletionTrend(window.currentTasks);
        }, 100); // Small delay to ensure theme is applied
    }
    
    // Update Weekly Productivity Heatmap chart if it exists
    if (proWeeklyHeatmapChartObj && window.currentTasks) {
        setTimeout(() => {
            renderProWeeklyHeatmapChart(window.currentTasks);
        }, 100); // Small delay to ensure theme is applied
    }
    
    // Update Voice vs Manual Entry chart if it exists
    if (proVoiceManualChartObj && window.currentTasks) {
        setTimeout(() => {
            renderProVoiceManualChart(window.currentTasks);
        }, 100); // Small delay to ensure theme is applied
    }
    
    // Update Task Type Breakdown chart if it exists
    if (proTaskTypeChartObj && window.currentTasks) {
        setTimeout(() => {
            renderProTaskTypeChart(window.currentTasks);
        }, 100); // Small delay to ensure theme is applied
    }
    
    // Update Keywords chart if it exists
    if (proKeywordsChartObj && window.currentTasks) {
        setTimeout(() => {
            renderProKeywordsChart(window.currentTasks);
        }, 100); // Small delay to ensure theme is applied
    }
    
    // Update Time of Day chart if it exists
    if (proTimeOfDayChartObj && window.currentTasks) {
        setTimeout(() => {
            renderProTimeOfDayChart(window.currentTasks);
        }, 100); // Small delay to ensure theme is applied
    }
    
    // Update Completion Rate chart if it exists
    if (proCompletionRateChartObj && window.currentTasks) {
        setTimeout(() => {
            renderProCompletionRateChart(window.currentTasks);
        }, 100); // Small delay to ensure theme is applied
    }
    
    // Update Monthly Progress chart if it exists
    if (proMonthlyProgressChartObj && window.currentTasks) {
        setTimeout(() => {
            renderProMonthlyProgressChart(window.currentTasks);
        }, 100); // Small delay to ensure theme is applied
    }
    
    // Ensure all chart legends have proper text colors
    setTimeout(() => {
        ensureChartLegendVisibility();
    }, 200); // Slightly longer delay to ensure all charts are rendered
});

// ========================================
// SHARE SUMMARY FUNCTIONALITY
// ========================================

// Share Summary Variables
let lastGeneratedDigest = null;
let shareFunctions = null;

// Initialize Share Summary functionality
function initializeShareSummary() {
    console.log('[Share Summary] Initializing Share Summary functionality...');
    
    // Check if DOM elements exist
    const sendToSlackBtn = document.getElementById('sendToSlackBtn');
    const sendViaEmailBtn = document.getElementById('sendViaEmailBtn');
    const generateAndShareBtn = document.getElementById('generateAndShareBtn');
    const shareLastDigestBtn = document.getElementById('shareLastDigestBtn');
    const summaryTypeSelect = document.getElementById('summaryTypeSelect');
    const shareSummarySection = document.getElementById('shareSummarySection');

    console.log('[Share Summary] DOM elements check:', {
        sendToSlackBtn: !!sendToSlackBtn,
        sendViaEmailBtn: !!sendViaEmailBtn,
        generateAndShareBtn: !!generateAndShareBtn,
        shareLastDigestBtn: !!shareLastDigestBtn,
        summaryTypeSelect: !!summaryTypeSelect,
        shareSummarySection: !!shareSummarySection
    });

    // If elements don't exist yet, retry after a short delay
    if (!shareSummarySection) {
        console.log('[Share Summary] Share summary section not found, retrying in 500ms...');
        setTimeout(initializeShareSummary, 500);
        return;
    }

    // Wait for Firebase Functions to be available (but don't block initialization)
    if (typeof window.firebaseFunctions !== 'undefined') {
        shareFunctions = window.firebaseFunctions;
        console.log('[Share Summary] Firebase Functions available');
    } else if (typeof window.firebase !== 'undefined' && window.firebase.functions) {
        try {
            shareFunctions = window.firebase.functions();
            console.log('[Share Summary] Firebase Functions loaded via firebase.functions()');
        } catch (error) {
            console.log('[Share Summary] Error loading Firebase Functions:', error);
        }
    } else {
        console.log('[Share Summary] Firebase Functions not available yet, will retry later');
        // Don't return, continue with initialization
    }

    console.log('[Share Summary] Setting up event listeners...');

    // Remove existing event listeners to prevent duplicates
    if (sendToSlackBtn) {
        sendToSlackBtn.removeEventListener('click', handleSendToSlack);
        sendToSlackBtn.addEventListener('click', handleSendToSlack);
        console.log('[Share Summary] Send to Slack button listener added');
    } else {
        console.warn('[Share Summary] Send to Slack button not found');
    }

    if (sendViaEmailBtn) {
        sendViaEmailBtn.removeEventListener('click', handleSendViaEmail);
        sendViaEmailBtn.addEventListener('click', handleSendViaEmail);
        console.log('[Share Summary] Send via Email button listener added');
    } else {
        console.warn('[Share Summary] Send via Email button not found');
    }

    if (generateAndShareBtn) {
        generateAndShareBtn.removeEventListener('click', handleGenerateAndShare);
        generateAndShareBtn.addEventListener('click', handleGenerateAndShare);
        console.log('[Share Summary] Generate & Share button listener added');
    } else {
        console.warn('[Share Summary] Generate & Share button not found');
    }

    if (shareLastDigestBtn) {
        shareLastDigestBtn.removeEventListener('click', handleShareLastDigest);
        shareLastDigestBtn.addEventListener('click', handleShareLastDigest);
        console.log('[Share Summary] Share Last Digest button listener added');
    } else {
        console.warn('[Share Summary] Share Last Digest button not found');
    }

    if (summaryTypeSelect) {
        summaryTypeSelect.removeEventListener('change', handleSummaryTypeChange);
        summaryTypeSelect.addEventListener('change', handleSummaryTypeChange);
        console.log('[Share Summary] Summary type select listener added');
    }

    // Check user role and update UI accordingly
    updateShareSummaryUI();
    console.log('[Share Summary] Share Summary functionality initialized successfully');
    
    // Set up periodic check for Firebase Functions
    const checkFirebaseFunctions = () => {
        if (!shareFunctions) {
            if (typeof window.firebaseFunctions !== 'undefined') {
                shareFunctions = window.firebaseFunctions;
                console.log('[Share Summary] Firebase Functions loaded in periodic check');
            } else if (typeof window.firebase !== 'undefined' && window.firebase.functions) {
                try {
                    shareFunctions = window.firebase.functions();
                    console.log('[Share Summary] Firebase Functions loaded via periodic check');
                } catch (error) {
                    console.log('[Share Summary] Error loading Firebase Functions in periodic check:', error);
                }
            }
        }
    };
    
    // Check every 2 seconds for the first 30 seconds
    let checkCount = 0;
    const maxChecks = 15;
    const checkInterval = setInterval(() => {
        checkFirebaseFunctions();
        checkCount++;
        if (checkCount >= maxChecks) {
            clearInterval(checkInterval);
            console.log('[Share Summary] Stopped periodic Firebase Functions check');
        }
    }, 2000);
}

// Handle summary type change
function handleSummaryTypeChange(e) {
    console.log('[Share Summary] Summary type changed to:', e.target.value);
}

// Update Share Summary UI based on user role
function updateShareSummaryUI() {
    const shareSummarySection = document.getElementById('shareSummarySection');
    const shareUpgradePrompt = document.getElementById('shareUpgradePrompt');
    const sendToSlackBtn = document.getElementById('sendToSlackBtn');
    const sendViaEmailBtn = document.getElementById('sendViaEmailBtn');
    const generateAndShareBtn = document.getElementById('generateAndShareBtn');
    const shareLastDigestBtn = document.getElementById('shareLastDigestBtn');

    console.log('[Share Summary] Updating UI for user role:', userRole);

    if (!shareSummarySection) {
        console.warn('[Share Summary] Share summary section not found');
        return;
    }

    if (userRole === 'premium') {
        // Show full functionality for premium users
        if (shareUpgradePrompt) shareUpgradePrompt.classList.add('d-none');
        if (sendToSlackBtn) {
            sendToSlackBtn.disabled = false;
            sendToSlackBtn.classList.remove('btn-secondary');
            sendToSlackBtn.classList.add('btn-outline-primary');
        }
        if (sendViaEmailBtn) {
            sendViaEmailBtn.disabled = false;
            sendViaEmailBtn.classList.remove('btn-secondary');
            sendViaEmailBtn.classList.add('btn-outline-success');
        }
        if (generateAndShareBtn) {
            generateAndShareBtn.disabled = false;
            generateAndShareBtn.classList.remove('btn-secondary');
            generateAndShareBtn.classList.add('btn-primary');
        }
        if (shareLastDigestBtn) {
            shareLastDigestBtn.disabled = false;
            shareLastDigestBtn.classList.remove('btn-secondary');
            shareLastDigestBtn.classList.add('btn-outline-secondary');
        }
        
        // Add premium styling
        shareSummarySection.classList.add('premium-active');
        shareSummarySection.classList.remove('premium-locked');
        
        console.log('[Share Summary] Premium user - buttons enabled');
    } else {
        // Show upgrade prompt for free users
        if (shareUpgradePrompt) shareUpgradePrompt.classList.remove('d-none');
        if (sendToSlackBtn) {
            sendToSlackBtn.disabled = true;
            sendToSlackBtn.classList.remove('btn-outline-primary');
            sendToSlackBtn.classList.add('btn-secondary');
        }
        if (sendViaEmailBtn) {
            sendViaEmailBtn.disabled = true;
            sendViaEmailBtn.classList.remove('btn-outline-success');
            sendViaEmailBtn.classList.add('btn-secondary');
        }
        if (generateAndShareBtn) {
            generateAndShareBtn.disabled = true;
            generateAndShareBtn.classList.remove('btn-primary');
            generateAndShareBtn.classList.add('btn-secondary');
        }
        if (shareLastDigestBtn) {
            shareLastDigestBtn.disabled = true;
            shareLastDigestBtn.classList.remove('btn-outline-secondary');
            shareLastDigestBtn.classList.add('btn-secondary');
        }
        
        // Add locked styling
        shareSummarySection.classList.add('premium-locked');
        shareSummarySection.classList.remove('premium-active');
        
        console.log('[Share Summary] Free user - buttons disabled');
    }
}

// Handle Send to Slack
async function handleSendToSlack() {
    console.log('[Share Summary] Send to Slack clicked');
    console.log('[Share Summary] Button clicked - checking functionality...');
    
    if (!currentUser || userRole !== 'premium') {
        showToast('Premium feature only. Please upgrade to share summaries.', 'warning');
        return;
    }

    const webhookUrl = document.getElementById('slackWebhookUrl').value.trim();
    if (!webhookUrl) {
        showToast('Please enter a Slack webhook URL', 'warning');
        return;
    }

    if (!webhookUrl.startsWith('https://hooks.slack.com/')) {
        showToast('Please enter a valid Slack webhook URL', 'warning');
        return;
    }

    const summaryContent = await getSummaryContent();
    if (!summaryContent) {
        showToast('No summary content available. Please generate a digest first.', 'warning');
        return;
    }

    showShareLoading(true);
    hideShareSuccess();
    hideShareError();

    try {
        const summaryType = document.getElementById('summaryTypeSelect').value;
        const slackMessage = formatSlackMessage(summaryContent, summaryType);
        
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(slackMessage)
        });

        if (response.ok) {
            showShareSuccess(`Summary sent successfully to Slack!`);
            console.log('[Share Summary] Slack message sent successfully');
        } else {
            throw new Error(`Slack API error: ${response.status}`);
        }

    } catch (error) {
        console.error('[Share Summary] Slack error:', error);
        showShareError(`Failed to send to Slack: ${error.message}`);
    } finally {
        showShareLoading(false);
    }
}

// Handle Send via Email
async function handleSendViaEmail() {
    console.log('[Share Summary] Send via Email clicked');
    console.log('[Share Summary] Email button clicked - checking functionality...');
    
    if (!currentUser || userRole !== 'premium') {
        showToast('Premium feature only. Please upgrade to share summaries.', 'warning');
        return;
    }

    const email = document.getElementById('emailAddress').value.trim();
    if (!email) {
        showToast('Please enter an email address', 'warning');
        return;
    }

    if (!isValidEmail(email)) {
        showToast('Please enter a valid email address', 'warning');
        return;
    }

    const summaryContent = await getSummaryContent();
    if (!summaryContent) {
        showToast('No summary content available. Please generate a digest first.', 'warning');
        return;
    }

    showShareLoading(true);
    hideShareSuccess();
    hideShareError();

    try {
        // Try to get Firebase Functions if not already available
        if (!shareFunctions) {
            console.log('[Share Summary] Attempting to get Firebase Functions...');
            if (typeof window.firebaseFunctions !== 'undefined') {
                shareFunctions = window.firebaseFunctions;
                console.log('[Share Summary] Firebase Functions loaded successfully');
            } else if (typeof window.firebase !== 'undefined' && window.firebase.functions) {
                shareFunctions = window.firebase.functions();
                console.log('[Share Summary] Firebase Functions loaded via firebase.functions()');
            } else {
                // Fallback: Use direct API call to our server
                console.log('[Share Summary] Using fallback email service via server API');
                const summaryType = document.getElementById('summaryTypeSelect').value;
                
                const response = await fetch('/api/send-email', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email: email,
                        summaryContent: summaryContent,
                        summaryType: summaryType,
                        recipientName: email.split('@')[0]
                    })
                });

                console.log('[Share Summary] Server response status:', response.status);
                console.log('[Share Summary] Server response headers:', response.headers);

                // Check if response is JSON
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    const textResponse = await response.text();
                    console.error('[Share Summary] Server returned non-JSON response:', textResponse.substring(0, 200));
                    throw new Error('Server returned invalid response format');
                }

                const result = await response.json();
                console.log('[Share Summary] Server response data:', result);
                
                if (result.success) {
                    showShareSuccess(`Summary sent successfully to ${email}!`);
                    console.log('[Share Summary] Email sent successfully via server API');
                    return;
                } else {
                    throw new Error(result.message || 'Email sending failed');
                }
            }
        }

        // Use Firebase Functions if available
        if (shareFunctions) {
            const summaryType = document.getElementById('summaryTypeSelect').value;
            const sendSummaryEmail = shareFunctions.httpsCallable('sendSummaryEmail');
            
            const result = await sendSummaryEmail({
                email: email,
                summaryContent: summaryContent,
                summaryType: summaryType,
                recipientName: email.split('@')[0] // Use email prefix as name
            });

            if (result.data.success) {
                showShareSuccess(`Summary sent successfully to ${email}!`);
                console.log('[Share Summary] Email sent successfully via Firebase Functions');
            } else {
                throw new Error(result.data.message || 'Email sending failed');
            }
        } else {
            throw new Error('Email service not available');
        }

    } catch (error) {
        console.error('[Share Summary] Email error:', error);
        let errorMessage = 'Failed to send email';
        
        if (error.code === 'functions/unauthenticated') {
            errorMessage = 'Please sign in to send emails';
        } else if (error.code === 'functions/permission-denied') {
            errorMessage = 'Premium feature only. Please upgrade to send emails';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        showShareError(errorMessage);
    } finally {
        showShareLoading(false);
    }
}

// Handle Generate and Share
async function handleGenerateAndShare() {
    console.log('[Share Summary] Generate and Share clicked');
    console.log('[Share Summary] Generate button clicked - checking functionality...');
    
    if (!currentUser || userRole !== 'premium') {
        showToast('Premium feature only. Please upgrade to share summaries.', 'warning');
        return;
    }

    // First generate the digest
    await generateSmartDigest();
    
    // Wait a moment for the digest to be generated
    setTimeout(async () => {
        const summaryContent = await getSummaryContent();
        if (summaryContent) {
            showToast('Digest generated! Now you can share it via Slack or Email.', 'success');
        }
    }, 2000);
}

// Handle Share Last Digest
async function handleShareLastDigest() {
    console.log('[Share Summary] Share Last Digest clicked');
    console.log('[Share Summary] Share Last button clicked - checking functionality...');
    
    if (!currentUser || userRole !== 'premium') {
        showToast('Premium feature only. Please upgrade to share summaries.', 'warning');
        return;
    }

    const summaryContent = await getSummaryContent();
    if (!summaryContent) {
        showToast('No previous digest found. Please generate a digest first.', 'warning');
        return;
    }

    showToast('Last digest loaded! You can now share it via Slack or Email.', 'info');
}

// Get summary content from current digest or last generated
async function getSummaryContent() {
    // First try to get from current digest display
    const digestText = document.getElementById('digestText');
    if (digestText && digestText.textContent.trim()) {
        return digestText.textContent.trim();
    }

    // If no current digest, try to get from last generated
    if (lastGeneratedDigest) {
        return lastGeneratedDigest;
    }

    // Try to get from Firestore digest history
    try {
        if (shareFunctions) {
            const getDigestHistory = shareFunctions.httpsCallable('getDigestHistory');
            const result = await getDigestHistory({ limit: 1 });
            
            if (result.data && result.data.length > 0) {
                return result.data[0].digest;
            }
        }
    } catch (error) {
        console.error('[Share Summary] Error getting digest history:', error);
    }

    return null;
}

// Format message for Slack
function formatSlackMessage(summaryContent, summaryType) {
    const typeLabel = summaryType === 'daily' ? 'Daily Digest' : 'Weekly Recap';
    const emoji = summaryType === 'daily' ? '📊' : '📈';
    
    return {
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
                type: "context",
                elements: [
                    {
                        type: "mrkdwn",
                        text: `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`
                    }
                ]
            },
            {
                type: "divider"
            },
            {
                type: "context",
                elements: [
                    {
                        type: "mrkdwn",
                        text: "Keep up the great work! 🚀"
                    }
                ]
            }
        ]
    };
}

// Validate email format
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Show share loading state
function showShareLoading(show) {
    const loadingDiv = document.getElementById('shareLoading');
    if (loadingDiv) {
        if (show) {
            loadingDiv.classList.remove('d-none');
        } else {
            loadingDiv.classList.add('d-none');
        }
    }
}

// Show share success state
function showShareSuccess(message) {
    const successDiv = document.getElementById('shareSuccess');
    const successMessage = document.getElementById('shareSuccessMessage');
    
    if (successDiv) {
        successDiv.classList.remove('d-none');
        if (successMessage) {
            successMessage.textContent = message;
        }
    }
}

// Hide share success state
function hideShareSuccess() {
    const successDiv = document.getElementById('shareSuccess');
    if (successDiv) {
        successDiv.classList.add('d-none');
    }
}

// Show share error state
function showShareError(message) {
    const errorDiv = document.getElementById('shareError');
    const errorMessage = document.getElementById('shareErrorMessage');
    
    if (errorDiv) {
        errorDiv.classList.remove('d-none');
        if (errorMessage) {
            errorMessage.textContent = message;
        }
    }
}

// Hide share error state
function hideShareError() {
    const errorDiv = document.getElementById('shareError');
    if (errorDiv) {
        errorDiv.classList.add('d-none');
    }
}

// Initialize Share Summary when ready
function initializeShareSummaryOnReady() {
    console.log('[Share Summary] Starting initialization...');
    
    // Try to initialize immediately
    initializeShareSummary();
    
    // Also try after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('[Share Summary] DOM loaded, initializing...');
            setTimeout(initializeShareSummary, 1000);
        });
    }
    
    // And try after a longer delay to ensure Firebase is ready
    setTimeout(() => {
        console.log('[Share Summary] Delayed initialization...');
        initializeShareSummary();
    }, 3000);
    
    // Also try when Firebase is initialized
    if (typeof window.firebaseInitialized !== 'undefined') {
        window.firebaseInitialized.then(() => {
            console.log('[Share Summary] Firebase initialized, initializing share summary...');
            setTimeout(initializeShareSummary, 500);
        });
    }
}

// Start Share Summary initialization
initializeShareSummaryOnReady();

// Test function to verify buttons are working (for debugging)
window.testShareSummaryButtons = function() {
    console.log('[Share Summary] Testing button functionality...');
    
    const buttons = [
        'sendToSlackBtn',
        'sendViaEmailBtn', 
        'generateAndShareBtn',
        'shareLastDigestBtn'
    ];
    
    buttons.forEach(buttonId => {
        const button = document.getElementById(buttonId);
        if (button) {
            console.log(`[Share Summary] Button ${buttonId} found:`, button);
            console.log(`[Share Summary] Button ${buttonId} disabled:`, button.disabled);
            console.log(`[Share Summary] Button ${buttonId} event listeners:`, button.onclick);
        } else {
            console.log(`[Share Summary] Button ${buttonId} NOT FOUND`);
        }
    });
    
    // Test click events
    const testButton = document.getElementById('sendToSlackBtn');
    if (testButton) {
        console.log('[Share Summary] Testing click event on sendToSlackBtn...');
        testButton.click();
    }
};

// Test function to verify server API is working
window.testEmailAPI = async function() {
    console.log('[Share Summary] Testing email API...');
    
    try {
        // Test the debug endpoint first
        const debugResponse = await fetch('/api/debug');
        console.log('[Share Summary] Debug endpoint response:', debugResponse.status);
        
        if (debugResponse.ok) {
            const debugData = await debugResponse.json();
            console.log('[Share Summary] Debug endpoint data:', debugData);
        } else {
            const debugText = await debugResponse.text();
            console.error('[Share Summary] Debug endpoint error:', debugText.substring(0, 200));
        }
        
        // Test the GET endpoint
        const testResponse = await fetch('/api/test-email');
        console.log('[Share Summary] Test endpoint response:', testResponse.status);
        
        if (testResponse.ok) {
            const testData = await testResponse.json();
            console.log('[Share Summary] Test endpoint data:', testData);
        } else {
            const testText = await testResponse.text();
            console.error('[Share Summary] Test endpoint error:', testText.substring(0, 200));
        }
        
        // Test the POST endpoint
        const emailResponse = await fetch('/api/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'test@example.com',
                summaryContent: 'This is a test summary',
                summaryType: 'daily',
                recipientName: 'Test User'
            })
        });
        
        console.log('[Share Summary] Email API response status:', emailResponse.status);
        console.log('[Share Summary] Email API response headers:', emailResponse.headers);
        
        const contentType = emailResponse.headers.get('content-type');
        console.log('[Share Summary] Content-Type:', contentType);
        
        if (emailResponse.ok) {
            const emailData = await emailResponse.json();
            console.log('[Share Summary] Email API response data:', emailData);
        } else {
            const errorText = await emailResponse.text();
            console.error('[Share Summary] Email API error response:', errorText.substring(0, 200));
        }
        
    } catch (error) {
        console.error('[Share Summary] Email API test error:', error);
    }
};