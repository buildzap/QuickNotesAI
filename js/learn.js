// Microlearning Reminders - Premium Feature
class MicrolearningManager {
    constructor() {
        this.currentUser = null;
        this.userField = null;
        this.todayLesson = null;
        this.pastLessons = [];
        this.selectedTaskId = null;
        
        // Initialize the application
        this.init();
    }

    async init() {
        try {
            console.log('Initializing MicrolearningManager...');
            
            // Wait for Firebase to be initialized
            if (window.firebaseInitialized) {
                await window.firebaseInitialized;
                console.log('Firebase initialized successfully');
            }
            
            // Initialize AOS animations
            AOS.init({
                duration: 800,
                easing: 'ease-in-out',
                once: true
            });

            // Initialize theme
            this.initTheme();
            
            // Check authentication
            console.log('Checking authentication...');
            await this.checkAuth();
            
            // Initialize event listeners
            this.initEventListeners();
            
            console.log('MicrolearningManager initialization complete');
        } catch (error) {
            console.error('Error initializing microlearning:', error);
            this.showError('Failed to initialize microlearning system');
        }
    }

    initTheme() {
        const themeToggle = document.getElementById('themeToggle');
        const themeIcon = document.getElementById('themeIcon');
        
        // Set initial theme
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-bs-theme', savedTheme);
        this.updateThemeIcon(savedTheme);
        
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-bs-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            document.documentElement.setAttribute('data-bs-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            this.updateThemeIcon(newTheme);
        });
    }

    updateThemeIcon(theme) {
        const themeIcon = document.getElementById('themeIcon');
        themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    async checkAuth() {
        return new Promise((resolve, reject) => {
            const unsubscribe = firebase.auth().onAuthStateChanged(async (user) => {
                unsubscribe();
                
                if (user) {
                    console.log('User authenticated:', user.email);
                    this.currentUser = user;
                    await this.checkUserRole();
                    resolve();
                } else {
                    console.log('No user authenticated, redirecting to login');
                    // Redirect to login
                    window.location.href = 'login.html';
                    reject(new Error('User not authenticated'));
                }
            });
        });
    }

    async checkUserRole() {
        try {
            const userDoc = await firebase.firestore()
                .collection('users')
                .doc(this.currentUser.uid)
                .get();

            if (userDoc.exists) {
                const userData = userDoc.data();
                console.log('User data:', userData);
                
                if (userData.role === 'premium') {
                    // Premium user - show learning content
                    console.log('User is premium, showing main content');
                    this.showMainContent();
                    await this.loadUserField();
                    await this.loadTodayLesson();
                    await this.loadPastLessons();
                } else {
                    // Free user - show premium access control
                    console.log('User is not premium, showing premium access');
                    this.showPremiumAccess();
                }
            } else {
                // New user - show premium access control
                console.log('New user, showing premium access');
                this.showPremiumAccess();
            }
        } catch (error) {
            console.error('Error checking user role:', error);
            // For testing purposes, show main content even if there's an error
            console.log('Error occurred, showing main content for testing');
            this.showMainContent();
            await this.loadUserField();
            await this.loadTodayLesson();
            await this.loadPastLessons();
        }
    }

    showMainContent() {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('premiumAccessControl').style.display = 'none';
        document.getElementById('mainLearningContent').style.display = 'block';
        
        // Update user name in the header
        const userWelcomeElement = document.getElementById('userWelcome');
        if (userWelcomeElement) {
            userWelcomeElement.textContent = `Welcome ${this.currentUser.displayName || this.currentUser.email}`;
        }
        
        // Show user section in header
        const userSection = document.getElementById('userSection');
        if (userSection) {
            userSection.style.display = 'flex';
        }
    }

    showPremiumAccess() {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('mainLearningContent').style.display = 'none';
        document.getElementById('premiumAccessControl').style.display = 'block';
    }

    async loadUserField() {
        try {
            const userDoc = await firebase.firestore()
                .collection('users')
                .doc(this.currentUser.uid)
                .get();

            if (userDoc.exists) {
                const userData = userDoc.data();
                this.userField = userData.field || null;
                console.log('User field:', this.userField);
                
                if (this.userField) {
                    document.getElementById('userFieldDisplay').textContent = this.getFieldDisplayName(this.userField);
                    // Show change topic button when user has a field selected
                    document.getElementById('changeTopicBtn').style.display = 'inline-block';
                } else {
                    // Show field selection
                    console.log('No field selected, showing field selection');
                    this.showFieldSelection();
                    // Hide change topic button when no field is selected
                    document.getElementById('changeTopicBtn').style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Error loading user field:', error);
        }
    }

    showFieldSelection(isChangingTopic = false) {
        document.getElementById('fieldSelection').style.display = 'block';
        
        // Update title and description based on context
        const titleElement = document.getElementById('fieldSelectionTitle');
        const descriptionElement = document.getElementById('fieldSelectionDescription');
        const cancelBtn = document.getElementById('cancelFieldBtn');
        
        if (isChangingTopic) {
            titleElement.innerHTML = '<i class="fas fa-edit me-2"></i>Change Your Learning Topic';
            descriptionElement.textContent = 'Select a new field to receive different microlearning content. Your current progress will be saved.';
            cancelBtn.style.display = 'block';
            
            // Pre-select current field if changing topic
            if (this.userField) {
                const currentFieldOption = document.querySelector(`[data-field="${this.userField}"]`);
                if (currentFieldOption) {
                    currentFieldOption.classList.add('selected');
                }
            }
        } else {
            titleElement.innerHTML = '<i class="fas fa-graduation-cap me-2"></i>Choose Your Learning Field';
            descriptionElement.textContent = 'Select a field to receive personalized microlearning content daily.';
            cancelBtn.style.display = 'none';
        }
        
        // Add click handlers for field options
        document.querySelectorAll('.field-option').forEach(option => {
            option.addEventListener('click', () => {
                // Remove previous selection
                document.querySelectorAll('.field-option').forEach(opt => opt.classList.remove('selected'));
                // Add selection to clicked option
                option.classList.add('selected');
            });
        });
    }

    async saveFieldSelection() {
        const selectedField = document.querySelector('.field-option.selected');
        const selectedCustomTopic = document.querySelector('.custom-topic-item.selected');
        
        if (!selectedField && !selectedCustomTopic) {
            this.showError('Please select a learning field or add a custom topic');
            return;
        }

        let field;
        if (selectedCustomTopic) {
            field = selectedCustomTopic.querySelector('.topic-name').textContent;
        } else {
            field = selectedField.dataset.field;
        }
        
        const isChangingTopic = this.userField !== null;
        
        try {
            await firebase.firestore()
                .collection('users')
                .doc(this.currentUser.uid)
                .update({
                    field: field,
                    fieldUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

            this.userField = field;
            document.getElementById('userFieldDisplay').textContent = this.getFieldDisplayName(field);
            document.getElementById('fieldSelection').style.display = 'none';
            
            // Show change topic button after field is saved
            document.getElementById('changeTopicBtn').style.display = 'inline-block';
            
            // Force generate new lesson when topic changes
            if (isChangingTopic) {
                await this.forceGenerateNewLesson();
                this.showSuccess('Learning topic changed successfully! You\'ll receive new content based on your selection.');
            } else {
                // Load today's lesson after field is set
                await this.loadTodayLesson();
                this.showSuccess('Learning field saved successfully!');
            }
        } catch (error) {
            console.error('Error saving field:', error);
            this.showError('Failed to save learning field');
        }
    }

    changeTopic() {
        this.showFieldSelection(true);
    }

    cancelFieldSelection() {
        document.getElementById('fieldSelection').style.display = 'none';
        // Clear any selections
        document.querySelectorAll('.field-option').forEach(opt => opt.classList.remove('selected'));
        document.querySelectorAll('.custom-topic-item').forEach(opt => opt.classList.remove('selected'));
    }

    addCustomTopic() {
        const input = document.getElementById('customTopicInput');
        const topic = input.value.trim();
        
        if (!topic) {
            this.showError('Please enter a topic name');
            return;
        }
        
        if (topic.length < 3) {
            this.showError('Topic name must be at least 3 characters long');
            return;
        }
        
        // Check if topic already exists
        const existingTopics = document.querySelectorAll('.custom-topic-item .topic-name');
        for (let existing of existingTopics) {
            if (existing.textContent.toLowerCase() === topic.toLowerCase()) {
                this.showError('This topic already exists');
                return;
            }
        }
        
        // Add the custom topic
        this.createCustomTopicElement(topic);
        
        // Clear input
        input.value = '';
        
        this.showSuccess(`Topic "${topic}" added successfully!`);
    }

    createCustomTopicElement(topic) {
        const container = document.getElementById('customTopicsContainer');
        const topicElement = document.createElement('div');
        topicElement.className = 'custom-topic-item';
        topicElement.dataset.field = topic.toLowerCase().replace(/\s+/g, '-');
        topicElement.innerHTML = `
            <span class="topic-name">${topic}</span>
            <i class="fas fa-times remove-topic" title="Remove topic"></i>
        `;
        
        // Add click handler for selection
        topicElement.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-topic')) {
                return; // Don't select if clicking remove button
            }
            
            // Remove previous selections
            document.querySelectorAll('.field-option').forEach(opt => opt.classList.remove('selected'));
            document.querySelectorAll('.custom-topic-item').forEach(opt => opt.classList.remove('selected'));
            
            // Add selection to this topic
            topicElement.classList.add('selected');
        });
        
        // Add remove functionality
        const removeBtn = topicElement.querySelector('.remove-topic');
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            topicElement.remove();
        });
        
        container.appendChild(topicElement);
    }

    getFieldDisplayName(field) {
        const fieldNames = {
            'productivity': 'Productivity',
            'leadership': 'Leadership',
            'marketing': 'Marketing',
            'technology': 'Technology',
            'finance': 'Finance',
            'health': 'Health & Wellness'
        };
        return fieldNames[field] || field;
    }

    async loadTodayLesson() {
        if (!this.userField) {
            return;
        }

        try {
            const today = new Date().toISOString().split('T')[0];
            
            // Check if we already have a lesson for today
            const userLessonDoc = await firebase.firestore()
                .collection('users')
                .doc(this.currentUser.uid)
                .collection('microLessons')
                .doc(today)
                .get();

            if (userLessonDoc.exists) {
                // Load existing lesson
                this.todayLesson = userLessonDoc.data();
                this.displayTodayLesson();
            } else {
                // Generate new lesson for today
                await this.generateTodayLesson();
            }
        } catch (error) {
            console.error('Error loading today lesson:', error);
            this.showError('Failed to load today\'s lesson');
        }
    }

    async generateTodayLesson() {
        try {
            console.log('Generating today lesson for field:', this.userField);
            console.log('Field type:', typeof this.userField);
            console.log('Field value:', this.userField);
            
            // Show loading state
            const lessonSummary = document.getElementById('lessonSummary');
            if (lessonSummary) {
                lessonSummary.innerHTML = `
                    <div class="loading-spinner">
                        <div class="spinner-border" role="status">
                            <span class="visually-hidden">Generating lesson...</span>
                        </div>
                        <span class="ms-3">Generating latest insights on "${this.getFieldDisplayName(this.userField)}" using AI...</span>
                    </div>
                `;
            }
            
            // Get lesson from predefined lessons or generate new one
            const lesson = await this.getLessonForField(this.userField);
            console.log('Generated lesson:', lesson);
            
            if (lesson) {
                const today = new Date().toISOString().split('T')[0];
                
                // Save lesson to user's collection
                await firebase.firestore()
                    .collection('users')
                    .doc(this.currentUser.uid)
                    .collection('microLessons')
                    .doc(today)
                    .set({
                        ...lesson,
                        date: today,
                        status: 'new',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });

                this.todayLesson = { ...lesson, date: today, status: 'new' };
                console.log('Today lesson set:', this.todayLesson);
                this.displayTodayLesson();
            }
        } catch (error) {
            console.error('Error generating today lesson:', error);
            this.showError('Failed to generate today\'s lesson');
        }
    }

    async forceGenerateNewLesson() {
        try {
            console.log('Force generating new lesson for field:', this.userField);
            console.log('Current user field before generation:', this.userField);
            
            // Show loading state
            const lessonSummary = document.getElementById('lessonSummary');
            if (lessonSummary) {
                lessonSummary.innerHTML = `
                    <div class="loading-spinner">
                        <div class="spinner-border" role="status">
                            <span class="visually-hidden">Generating new lesson...</span>
                        </div>
                        <span class="ms-3">Generating new lesson for "${this.getFieldDisplayName(this.userField)}"...</span>
                    </div>
                `;
            }
            
            const today = new Date().toISOString().split('T')[0];
            
            // Delete existing lesson for today if it exists
            await firebase.firestore()
                .collection('users')
                .doc(this.currentUser.uid)
                .collection('microLessons')
                .doc(today)
                .delete();
            
            console.log('Deleted existing lesson for today');
            
            // Generate new lesson
            await this.generateTodayLesson();
            
            // Refresh past lessons
            await this.loadPastLessons();
            
        } catch (error) {
            console.error('Error force generating new lesson:', error);
            this.showError('Failed to generate new lesson');
        }
    }

    async getLessonForField(field) {
        console.log('Getting lesson for field:', field);
        
        // Generate dynamic bullet points for any topic
        const bulletPoints = await this.generateBulletPointsForTopic(field);
        console.log('Generated bullet points:', bulletPoints);
        console.log('Bullet points type:', typeof bulletPoints);
        console.log('Bullet points length:', bulletPoints ? bulletPoints.length : 'null/undefined');
        
        if (bulletPoints && typeof bulletPoints === 'string' && bulletPoints.trim().length > 0) {
            const lesson = {
                title: `Latest Insights on ${this.getFieldDisplayName(field)}`,
                summary: bulletPoints,
                field: field
            };
            console.log('Returning dynamic lesson:', lesson);
            return lesson;
        }

        console.log('No dynamic bullet points generated, using fallback lessons');
        // Fallback to predefined lessons for known fields
        const lessons = {
            productivity: [
                {
                    title: "Time Blocking for Focus",
                    summary: "Use time blocking to dedicate uninterrupted focus time to your most important tasks. Schedule 25-90 minute blocks for deep work, separated by short breaks. This technique helps you maintain concentration and avoid context switching.",
                    field: "productivity"
                },
                {
                    title: "The Two-Minute Rule",
                    summary: "If a task takes less than two minutes, do it immediately rather than adding it to your to-do list. This prevents small tasks from accumulating and reduces mental clutter.",
                    field: "productivity"
                },
                {
                    title: "Pomodoro Technique",
                    summary: "Work in focused 25-minute intervals followed by 5-minute breaks. After four pomodoros, take a longer 15-30 minute break. This method helps maintain high energy and focus throughout the day.",
                    field: "productivity"
                },
                {
                    title: "Eisenhower Matrix",
                    summary: "Prioritize tasks using urgency and importance. Focus on important, non-urgent tasks to prevent them from becoming urgent. Delegate or eliminate tasks that are neither important nor urgent.",
                    field: "productivity"
                },
                {
                    title: "Batch Similar Tasks",
                    summary: "Group similar tasks together and complete them in dedicated time blocks. This reduces mental overhead and increases efficiency by minimizing context switching.",
                    field: "productivity"
                }
            ],
            leadership: [
                {
                    title: "Active Listening Skills",
                    summary: "Practice active listening by giving full attention, asking clarifying questions, and reflecting back what you heard. This builds trust and helps you understand team members better.",
                    field: "leadership"
                },
                {
                    title: "Delegation Framework",
                    summary: "Use the RACI framework (Responsible, Accountable, Consulted, Informed) to clarify roles in delegated tasks. Provide clear expectations and support while avoiding micromanagement.",
                    field: "leadership"
                },
                {
                    title: "Constructive Feedback",
                    summary: "Give specific, actionable feedback using the SBI model (Situation, Behavior, Impact). Focus on behaviors, not personality, and provide suggestions for improvement.",
                    field: "leadership"
                },
                {
                    title: "Leading by Example",
                    summary: "Model the behaviors and values you want to see in your team. Your actions speak louder than words and set the standard for your organization's culture.",
                    field: "leadership"
                },
                {
                    title: "Emotional Intelligence",
                    summary: "Develop self-awareness and empathy to better understand and connect with your team. Emotional intelligence is crucial for building strong relationships and resolving conflicts.",
                    field: "leadership"
                }
            ],
            marketing: [
                {
                    title: "Customer Persona Development",
                    summary: "Create detailed customer personas based on research and data. Understanding your audience's needs, pain points, and behaviors helps create more effective marketing campaigns.",
                    field: "marketing"
                },
                {
                    title: "Content Marketing Strategy",
                    summary: "Develop valuable, relevant content that attracts and engages your target audience. Focus on solving problems and providing insights rather than just promoting your products.",
                    field: "marketing"
                },
                {
                    title: "Social Media Engagement",
                    summary: "Build authentic relationships with your audience through consistent, valuable content and genuine interactions. Focus on quality over quantity in your social media presence.",
                    field: "marketing"
                },
                {
                    title: "Email Marketing Best Practices",
                    summary: "Segment your email list and personalize content based on subscriber behavior and preferences. Use compelling subject lines and clear calls-to-action to improve open and click rates.",
                    field: "marketing"
                },
                {
                    title: "Data-Driven Marketing",
                    summary: "Use analytics to track campaign performance and make informed decisions. Focus on metrics that align with your business goals and continuously optimize based on data insights.",
                    field: "marketing"
                }
            ],
            technology: [
                {
                    title: "API Design Principles",
                    summary: "Design APIs with consistency, simplicity, and developer experience in mind. Use RESTful conventions, provide clear documentation, and handle errors gracefully.",
                    field: "technology"
                },
                {
                    title: "Code Review Best Practices",
                    summary: "Conduct thorough code reviews focusing on functionality, security, performance, and maintainability. Provide constructive feedback and use automated tools to catch common issues.",
                    field: "technology"
                },
                {
                    title: "Testing Strategies",
                    summary: "Implement comprehensive testing including unit, integration, and end-to-end tests. Use test-driven development to write better code and catch bugs early in the development process.",
                    field: "technology"
                },
                {
                    title: "Security Best Practices",
                    summary: "Follow security principles like least privilege, input validation, and secure authentication. Stay updated on security threats and regularly audit your applications for vulnerabilities.",
                    field: "technology"
                },
                {
                    title: "Performance Optimization",
                    summary: "Optimize application performance through caching, database indexing, and efficient algorithms. Monitor performance metrics and continuously improve based on real-world usage data.",
                    field: "technology"
                }
            ],
            finance: [
                {
                    title: "Budget Planning",
                    summary: "Create a realistic budget that accounts for all income and expenses. Track your spending regularly and adjust your budget as needed to achieve your financial goals.",
                    field: "finance"
                },
                {
                    title: "Emergency Fund",
                    summary: "Build an emergency fund covering 3-6 months of living expenses. This provides financial security and prevents you from going into debt during unexpected situations.",
                    field: "finance"
                },
                {
                    title: "Investment Diversification",
                    summary: "Spread your investments across different asset classes and sectors to reduce risk. Don't put all your eggs in one basket - diversification helps protect your portfolio.",
                    field: "finance"
                },
                {
                    title: "Compound Interest",
                    summary: "Start investing early to take advantage of compound interest. Even small amounts invested regularly can grow significantly over time due to the power of compounding.",
                    field: "finance"
                },
                {
                    title: "Debt Management",
                    summary: "Prioritize high-interest debt and consider debt consolidation strategies. Focus on paying off debts systematically while avoiding new debt accumulation.",
                    field: "finance"
                }
            ],
            health: [
                {
                    title: "Mindful Breathing",
                    summary: "Practice deep, mindful breathing to reduce stress and improve focus. Take regular breaks throughout the day to breathe deeply and center yourself.",
                    field: "health"
                },
                {
                    title: "Work-Life Balance",
                    summary: "Set clear boundaries between work and personal time. Schedule regular breaks, vacations, and activities that help you recharge and maintain perspective.",
                    field: "health"
                },
                {
                    title: "Ergonomic Workspace",
                    summary: "Set up your workspace to support good posture and reduce strain. Position your monitor at eye level, keep your feet flat on the floor, and take regular movement breaks.",
                    field: "health"
                },
                {
                    title: "Digital Wellness",
                    summary: "Practice mindful technology use by setting screen time limits, taking regular digital detoxes, and being intentional about when and how you use devices.",
                    field: "health"
                },
                {
                    title: "Sleep Hygiene",
                    summary: "Establish a consistent sleep schedule and create a relaxing bedtime routine. Avoid screens before bed and create a comfortable sleep environment.",
                    field: "health"
                }
            ]
        };

        const fieldLessons = lessons[field] || [];
        if (fieldLessons.length === 0) {
            return null;
        }

        // Get a random lesson from the field
        const randomIndex = Math.floor(Math.random() * fieldLessons.length);
        return fieldLessons[randomIndex];
    }

    /**
     * Generate dynamic bullet points for learning topics using OpenAI API
     * 
     * CURRENT STATUS: Using OpenAI API for real-time, personalized content
     * FALLBACK: Enhanced static content if OpenAI fails
     */
    async generateBulletPointsForTopic(topic) {
        console.log('🚀 Starting bullet point generation for topic:', topic);
        
        // Show loading message
        this.showSuccess(`Generating live content for "${topic}"... Please wait.`);
        
        // Get OpenAI API key
        const apiKey = this.getOpenAIKey();
        if (!apiKey) {
            console.error('❌ No OpenAI API key provided');
            this.showError('OpenAI API key is required for live content. Please provide your API key.');
            return null;
        }
        
        console.log('✅ API key found, making OpenAI call...');
        
        try {
            const openaiResponse = await this.callOpenAI(topic);
            
            if (openaiResponse && openaiResponse.trim()) {
                console.log('✅ OpenAI generated bullet points:', openaiResponse);
                this.showSuccess(`Live content generated successfully for "${topic}"!`);
                return openaiResponse;
            } else {
                throw new Error('OpenAI returned empty response');
            }
            
        } catch (error) {
            console.error('❌ Error generating bullet points via OpenAI:', error);
            this.showError(`Failed to generate live content for "${topic}". Please check your OpenAI API key and try again.`);
            return null;
        }
    }

    /**
     * Call OpenAI API directly to generate bullet points
     * This provides immediate live data without requiring Firebase Functions deployment
     */
    async callOpenAI(topic) {
        try {
            console.log('🚀 Making OpenAI API call for topic:', topic);
            
            // Get API key
            const apiKey = this.getOpenAIKey();
            if (!apiKey) {
                throw new Error('No OpenAI API key available');
            }
            
            // Create a prompt for OpenAI
            const prompt = `Generate exactly 5 bullet points with the most current and informative insights about "${topic}". Each bullet point should:
1. Start with a bullet point symbol (•)
2. Include specific, factual information with current statistics or data when possible
3. Focus on the latest trends, developments, or breakthroughs in 2024-2025
4. Be informative and educational
5. Be concise but comprehensive (1-2 sentences each)
6. Include specific numbers, percentages, or concrete examples when relevant

Format each bullet point on a separate line. Focus on providing valuable, actionable insights that someone learning about ${topic} would find useful.`;

            console.log('📝 Sending prompt to OpenAI:', prompt);

            // Make actual OpenAI API call
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a helpful assistant that provides current, factual insights with specific statistics and data.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: 500,
                    temperature: 0.7
                })
            });

            console.log('📡 API Response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ API Error response:', errorText);
                throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const data = await response.json();
            console.log('✅ OpenAI API response received:', data);
            
            if (data.choices && data.choices[0] && data.choices[0].message) {
                const content = data.choices[0].message.content.trim();
                console.log('📝 Generated content:', content);
                return content;
            } else {
                throw new Error('Invalid response format from OpenAI API');
            }
            
        } catch (error) {
            console.error('❌ Error in OpenAI API call:', error);
            throw error; // Re-throw to be handled by caller
        }
    }

    /**
     * Get OpenAI API key from localStorage or prompt user
     */
    getOpenAIKey() {
        // First try to get from localStorage
        let apiKey = localStorage.getItem('openai_api_key');
        
        if (!apiKey) {
            // Prompt user to enter API key
            apiKey = prompt('Please enter your OpenAI API key to get live topic insights:');
            if (apiKey && apiKey.trim()) {
                localStorage.setItem('openai_api_key', apiKey.trim());
                console.log('✅ API key saved to localStorage');
            } else {
                console.error('❌ No API key provided');
                return null;
            }
        }
        
        return apiKey;
    }

    displayTodayLesson() {
        console.log('Displaying today lesson:', this.todayLesson);
        if (!this.todayLesson) {
            console.log('No today lesson to display');
            return;
        }

        try {
            const titleElement = document.getElementById('lessonTitle');
            const dateElement = document.getElementById('lessonDate');
            const summaryElement = document.getElementById('lessonSummary');
            
            if (!titleElement || !dateElement || !summaryElement) {
                console.error('Required lesson display elements not found');
                return;
            }

            titleElement.textContent = this.todayLesson.title;
            dateElement.textContent = this.formatDate(this.todayLesson.date);
            
            // Always display as bullet points for better readability
            console.log('Displaying bullet points for topic:', this.todayLesson.title);
            
            // Clean and format the bullet points
            let bulletPoints = this.todayLesson.summary;
            
            // If content doesn't have bullet points, add them
            if (!bulletPoints.includes('•')) {
                // Split by newlines and add bullet points
                const points = bulletPoints.split('\n').filter(point => point.trim());
                bulletPoints = points.map(point => `• ${point.trim()}`).join('\n\n');
            }
            
            // Split into individual bullet points and format as HTML
            const formattedPoints = bulletPoints
                .split('\n\n')
                .filter(point => point.trim())
                .map(point => {
                    // Remove existing bullet point if present and clean up
                    const cleanPoint = point.replace(/^•\s*/, '').trim();
                    return `<li class="insight-point">${cleanPoint}</li>`;
                })
                .join('');
            
            summaryElement.innerHTML = `
                <h3><i class="fas fa-lightbulb me-2"></i>Latest Insights on ${this.todayLesson.title}</h3>
                <ul class="insights-list">
                    ${formattedPoints}
                </ul>
            `;
            
            console.log('Lesson displayed successfully');
        } catch (error) {
            console.error('Error displaying today lesson:', error);
        }
    }

    async loadPastLessons() {
        try {
            const pastLessonsSnapshot = await firebase.firestore()
                .collection('users')
                .doc(this.currentUser.uid)
                .collection('microLessons')
                .orderBy('date', 'desc')
                .limit(10)
                .get();

            this.pastLessons = [];
            pastLessonsSnapshot.forEach(doc => {
                if (doc.id !== new Date().toISOString().split('T')[0]) { // Exclude today's lesson
                    this.pastLessons.push({ id: doc.id, ...doc.data() });
                }
            });

            this.displayPastLessons();
        } catch (error) {
            console.error('Error loading past lessons:', error);
        }
    }

    displayPastLessons() {
        const container = document.getElementById('pastLessonsContainer');
        
        if (this.pastLessons.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i class="fas fa-book-open"></i>
                    </div>
                    <h4>No Past Lessons</h4>
                    <p>Your learning history will appear here as you complete lessons.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.pastLessons.map(lesson => `
            <div class="past-lesson-item">
                <div class="past-lesson-title">${lesson.title}</div>
                <div class="past-lesson-date">${this.formatDate(lesson.date)}</div>
                <span class="past-lesson-status status-${lesson.status}">
                    ${this.getStatusDisplayName(lesson.status)}
                </span>
            </div>
        `).join('');
    }

    getStatusDisplayName(status) {
        const statusNames = {
            'new': 'New',
            'read': 'Read',
            'linked': 'Linked to Task'
        };
        return statusNames[status] || status;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }

    async markAsRead() {
        if (!this.todayLesson) {
            return;
        }

        try {
            const today = new Date().toISOString().split('T')[0];
            
            await firebase.firestore()
                .collection('users')
                .doc(this.currentUser.uid)
                .collection('microLessons')
                .doc(today)
                .update({
                    status: 'read',
                    readAt: firebase.firestore.FieldValue.serverTimestamp()
                });

            this.todayLesson.status = 'read';
            this.showSuccess('Lesson marked as read!');
            
            // Refresh past lessons
            await this.loadPastLessons();
        } catch (error) {
            console.error('Error marking lesson as read:', error);
            this.showError('Failed to mark lesson as read');
        }
    }

    async remindLater() {
        this.showSuccess('We\'ll remind you about this lesson later!');
    }

    async linkToTask() {
        if (!this.todayLesson) {
            return;
        }

        try {
            // Load user's tasks
            const tasksSnapshot = await firebase.firestore()
                .collection('users')
                .doc(this.currentUser.uid)
                .collection('tasks')
                .where('status', '!=', 'completed')
                .get();

            const tasks = [];
            tasksSnapshot.forEach(doc => {
                tasks.push({ id: doc.id, ...doc.data() });
            });

            this.displayTaskOptions(tasks);
            
            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('taskLinkModal'));
            modal.show();
        } catch (error) {
            console.error('Error loading tasks:', error);
            this.showError('Failed to load tasks');
        }
    }

    displayTaskOptions(tasks) {
        const container = document.getElementById('taskOptionsContainer');
        
        if (tasks.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted">
                    <i class="fas fa-tasks fa-2x mb-3"></i>
                    <p>No active tasks found. Create a task first to link this lesson.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = tasks.map(task => `
            <div class="task-option" data-task-id="${task.id}">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${task.title}</strong>
                        <br>
                        <small class="text-muted">${task.description || 'No description'}</small>
                    </div>
                    <span class="badge bg-${this.getPriorityColor(task.priority)}">${task.priority}</span>
                </div>
            </div>
        `).join('');

        // Add click handlers
        document.querySelectorAll('.task-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.task-option').forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                this.selectedTaskId = option.dataset.taskId;
            });
        });
    }

    getPriorityColor(priority) {
        const colors = {
            'high': 'danger',
            'medium': 'warning',
            'low': 'success'
        };
        return colors[priority] || 'secondary';
    }

    async confirmLinkTask() {
        if (!this.selectedTaskId || !this.todayLesson) {
            this.showError('Please select a task to link');
            return;
        }

        try {
            const today = new Date().toISOString().split('T')[0];
            
            // Update lesson status
            await firebase.firestore()
                .collection('users')
                .doc(this.currentUser.uid)
                .collection('microLessons')
                .doc(today)
                .update({
                    status: 'linked',
                    linkedTaskId: this.selectedTaskId,
                    linkedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

            // Update task with lesson reference
            await firebase.firestore()
                .collection('users')
                .doc(this.currentUser.uid)
                .collection('tasks')
                .doc(this.selectedTaskId)
                .update({
                    linkedLessonId: today,
                    linkedLessonTitle: this.todayLesson.title
                });

            this.todayLesson.status = 'linked';
            this.showSuccess('Lesson linked to task successfully!');
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('taskLinkModal'));
            modal.hide();
            
            // Refresh past lessons
            await this.loadPastLessons();
        } catch (error) {
            console.error('Error linking lesson to task:', error);
            this.showError('Failed to link lesson to task');
        }
    }

    initEventListeners() {
        // Helper function to safely add event listener
        const safeAddEventListener = (elementId, event, handler) => {
            const element = document.getElementById(elementId);
            if (element) {
                element.addEventListener(event, handler);
            } else {
                console.warn(`Element with id '${elementId}' not found`);
            }
        };

        // Save field selection
        safeAddEventListener('saveFieldBtn', 'click', () => {
            this.saveFieldSelection();
        });

        // Change topic button
        safeAddEventListener('changeTopicBtn', 'click', () => {
            this.changeTopic();
        });

        // Cancel field selection
        safeAddEventListener('cancelFieldBtn', 'click', () => {
            this.cancelFieldSelection();
        });

        // Custom topic functionality
        safeAddEventListener('addCustomTopicBtn', 'click', () => {
            this.addCustomTopic();
        });

        safeAddEventListener('customTopicInput', 'keypress', (e) => {
            if (e.key === 'Enter') {
                this.addCustomTopic();
            }
        });

        // Lesson actions
        safeAddEventListener('markReadBtn', 'click', () => {
            this.markAsRead();
        });

        safeAddEventListener('remindLaterBtn', 'click', () => {
            this.remindLater();
        });

        safeAddEventListener('linkTaskBtn', 'click', () => {
            this.linkToTask();
        });

        // Confirm link task
        safeAddEventListener('confirmLinkBtn', 'click', () => {
            this.confirmLinkTask();
        });

        // Sign out button
        safeAddEventListener('signOutBtn', 'click', async () => {
            try {
                await firebase.auth().signOut();
                window.location.href = 'login.html';
            } catch (error) {
                console.error('Error signing out:', error);
            }
        });

        // Footer theme toggle
        safeAddEventListener('footerThemeToggle', 'click', () => {
            const currentTheme = document.documentElement.getAttribute('data-bs-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-bs-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            this.updateThemeIcon(newTheme);
        });

        // Add test button for debugging (temporary)
        const testBtn = document.createElement('button');
        testBtn.textContent = 'Test AI Lesson';
        testBtn.className = 'btn btn-warning btn-sm position-fixed top-0 start-0 m-3';
        testBtn.style.zIndex = '9999';
        testBtn.addEventListener('click', async () => {
            console.log('Test button clicked');
            this.userField = 'artificial intelligence';
            await this.generateTodayLesson();
        });
        document.body.appendChild(testBtn);
    }

    showSuccess(message) {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = 'toast align-items-center text-white bg-success border-0 position-fixed top-0 end-0 m-3';
        toast.style.zIndex = '9999';
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fas fa-check-circle me-2"></i>${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        
        document.body.appendChild(toast);
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
        
        // Remove toast after it's hidden
        toast.addEventListener('hidden.bs.toast', () => {
            document.body.removeChild(toast);
        });
    }

    showError(message) {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = 'toast align-items-center text-white bg-danger border-0 position-fixed top-0 end-0 m-3';
        toast.style.zIndex = '9999';
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fas fa-exclamation-circle me-2"></i>${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        
        document.body.appendChild(toast);
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
        
        // Remove toast after it's hidden
        toast.addEventListener('hidden.bs.toast', () => {
            document.body.removeChild(toast);
        });
    }
}

// Initialize the microlearning manager when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing MicrolearningManager...');
    new MicrolearningManager();
}); 