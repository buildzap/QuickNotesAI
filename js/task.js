console.log('[Task] task.js loaded');

// Task Manager Application with Voice Commands

// Import utilities
// Import utility functions with fallback
let escapeHtml, truncate;
try {
    if (window.utils && window.utils.text) {
        escapeHtml = window.utils.text.escapeHtml;
        truncate = window.utils.text.truncate;
    } else {
        // Fallback implementations
        escapeHtml = (text) => {
            if (typeof text !== 'string') return text;
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        };
        truncate = (text, length = 50) => {
            if (typeof text !== 'string') return text;
            return text.length > length ? text.substring(0, length) + '...' : text;
        };
    }
} catch (error) {
    console.warn('[Task] Error importing utility functions, using fallbacks:', error);
    // Fallback implementations
    escapeHtml = (text) => {
        if (typeof text !== 'string') return text;
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };
    truncate = (text, length = 50) => {
        if (typeof text !== 'string') return text;
        return text.length > length ? text.substring(0, length) + '...' : text;
    };
}
const { formatDateTime, formatTimeAgo } = window.utils.date;

// Immediately hide premium banner for free users
(function() {
    console.log('[Task] Checking premium banner visibility...');
    const premiumBanner = document.getElementById('premiumBanner');
    if (premiumBanner) {
        console.log('[Task] Premium banner found, will be managed by user role');
    }
})();

// Test function to verify JavaScript is loading
window.testJavaScriptLoading = function() {
    console.log('✅ JavaScript file is loading properly');
    return true;
};



// Global state management
const taskState = {
    tasks: [],
    currentUser: null,
    unsubscribeListener: null,
    priorityChart: null,
    filters: {
        priority: '',
        status: '',
        inputMethod: '',
        date: '',
        title: '', // Add title filter
        recurring: '' // Add recurring filter
    }
};

// Toast notifications
const showToast = (message, type = 'info') => {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-bg-${type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${escapeHtml(message)}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;

    toastContainer.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast, { delay: 3000 });
    bsToast.show();

    // Remove toast after it's hidden
    toast.addEventListener('hidden.bs.toast', () => toast.remove());
};

// Helper to get priority color
const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
        case 'high': return 'danger';
        case 'medium': return 'warning';
        case 'low': return 'success';
        default: return 'secondary';
    }
};

// Format date for display
const formatDate = (date) => {
    if (!date) return 'No date';
    return formatDateTime(date);
};

// Initialize task page
const checkAuth = async () => {
    try {
        // Wait for Firebase to initialize
        const services = await window.firebaseInitialized;
        console.log('[Task] Firebase initialized');

        return window.firebaseAuth.currentUser;
    } catch (error) {
        console.error('[Task] Auth check error:', error);
        return null;
    }
};

// Authentication check
async function checkAuthentication() {
    try {
        console.log('[Task] Checking authentication...');
        await window.firebaseInitialized;
        const auth = window.firebaseAuth;
        if (!auth) throw new Error('Firebase Auth not initialized');
        return new Promise((resolve) => {
            auth.onAuthStateChanged((user) => {
                if (!user) {
                    console.log('[Task] No user found, redirecting to login');
                    window.location.href = 'login.html';
                    resolve(false);
                } else {
                    // Update UI
                    const userEmailElement = document.getElementById('userEmail');
                    if (userEmailElement) {
                        userEmailElement.textContent = user.email;
                    }
                    
                    // Update user name display
                    const userNameElement = document.getElementById('userName');
                    if (userNameElement) {
                        // Extract name from email (everything before @)
                        const name = user.email.split('@')[0];
                        // Capitalize first letter
                        const displayName = name.charAt(0).toUpperCase() + name.slice(1);
                        userNameElement.textContent = `👋 Welcome, ${displayName}`;
                    }
                    
                    // Check premium status for recurring tasks
                    if (window.recurringTaskManager) {
                        setTimeout(async () => {
                            await window.recurringTaskManager.checkPremiumStatus();
                        }, 500);
                    }
                    
                    resolve(true);
                }
            });
        });
    } catch (error) {
        console.error('[Task] Auth check error:', error);
        window.location.href = 'login.html';
        return false;
    }
}

// Ensure required utilities are loaded
if (!window.utils?.date?.formatDateTime || !window.utils?.ui?.getPriorityColor) {
    console.error('Required utilities not loaded. Please check utils.js');
}

// Date management functions
const updateCurrentDateTime = () => {
    const currentDateTimeInput = document.getElementById('currentDateTime');
    if (currentDateTimeInput) {
        const now = new Date();
        // Format date to local ISO string
        const offset = now.getTimezoneOffset();
        const localDate = new Date(now.getTime() - (offset * 60 * 1000));
        currentDateTimeInput.value = localDate.toISOString().slice(0, 16);
    }
};

const setDefaultDueDate = () => {
    const dueDateInput = document.getElementById('taskDueDate');
    if (dueDateInput) {
        // Get current date/time
        const now = new Date();
        // Add 24 hours
        const tomorrow = new Date(now.getTime() + (24 * 60 * 60 * 1000));
        // Handle timezone offset
        const offset = tomorrow.getTimezoneOffset();
        const localDate = new Date(tomorrow.getTime() - (offset * 60 * 1000));
        // Set the input value (format: YYYY-MM-DDTHH:mm)
        dueDateInput.value = localDate.toISOString().slice(0, 16);
        
        // Set min date to current time to prevent selecting past dates
        const currentLocalDate = new Date(now.getTime() - (offset * 60 * 1000));
        dueDateInput.min = currentLocalDate.toISOString().slice(0, 16);
    }
};

// Update dates every minute
setInterval(updateCurrentDateTime, 60000);

// Track last input method for task creation
let lastInputMethod = 'manual';

// User role for premium features
let userRole = 'free';

// Helper function to format recurrence information
function formatRecurrenceInfo(recurrence) {
    if (!recurrence) return '';
    
    const type = recurrence.type || '';
    const time = recurrence.time || '';
    const interval = recurrence.interval;
    
    let info = '';
    switch (type) {
        case 'daily':
            info = '🔄 Daily';
            break;
        case 'weekly':
            info = '🔄 Weekly';
            break;
        case 'monthly':
            info = '🔄 Monthly';
            break;
        case 'yearly':
            info = '🔄 Yearly';
            break;
        case 'custom':
            info = `🔄 Every ${interval || 7} days`;
            break;
        default:
            info = `🔄 ${type}`;
    }
    
    if (time) {
        info += ` at ${time}`;
    }
    
    return info;
}

// Function to get recurring badge text for task tiles
function getRecurringBadgeText(task) {
    if (!task.recurring) return '';
    
    let recurringType = '';
    let interval = null;
    
    // Handle different recurring data structures
    if (typeof task.recurring === 'string' && task.recurring !== 'none') {
        // String format: task.recurring = 'daily', 'weekly', etc.
        recurringType = task.recurring;
    } else if (typeof task.recurring === 'boolean' && task.recurring === true) {
        // Boolean format: task.recurring = true, check task.recurrence
        if (task.recurrence && task.recurrence.type) {
            recurringType = task.recurrence.type;
            interval = task.recurrence.interval;
        } else {
            recurringType = 'recurring';
        }
    } else if (typeof task.recurring === 'object') {
        // Object format: task.recurring = { recurring: true, recurrence: { type: 'daily', ... } }
        if (task.recurring.recurring === true && task.recurring.recurrence) {
            recurringType = task.recurring.recurrence.type || 'recurring';
            interval = task.recurring.recurrence.interval;
        } else if (task.recurring.type) {
            // Direct object format: task.recurring = { type: 'daily', ... }
            recurringType = task.recurring.type;
            interval = task.recurring.interval;
        }
    }
    
    // Format the recurring type for display
    switch (recurringType) {
        case 'daily':
            return 'Daily';
        case 'weekly':
            return 'Weekly';
        case 'monthly':
            return 'Monthly';
        case 'yearly':
            return 'Yearly';
        case 'custom':
            return `Every ${interval || 7} Days`;
        case 'recurring':
            return 'Recurring';
        default:
            return recurringType.charAt(0).toUpperCase() + recurringType.slice(1);
    }
}

// Multilingual Voice Recognition Manager
class MultilingualVoiceManager {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.supported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
        this.currentLanguage = 'en-US';
        this.transcriptText = '';
        this.setupRecognition();
        this.setupEventListeners();
    }

    setupRecognition() {
        if (!this.supported) {
            console.warn('[MultilingualVoice] Speech recognition not supported');
            return;
        }
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = this.currentLanguage;

        this.recognition.onstart = () => {
            this.isListening = true;
            this.updateUI('listening');
            console.log('[MultilingualVoice] Started listening in', this.currentLanguage);
        };

        this.recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            this.transcriptText = finalTranscript || interimTranscript;
            this.updateTranscriptDisplay();
            
                            // Check for submit commands in various languages and filter them out
                if (finalTranscript) {
                    const lowerTranscript = finalTranscript.toLowerCase();
                    const submitCommands = [
                        // English
                        'submit', 'save', 'submit task', 'save task', 'create task', 'add task',
                        'submit now', 'save now', 'create now', 'add now',
                        
                        // European Languages
                        'guardar', 'salvar', 'enviar', 'crear tarea', 'añadir tarea', // Spanish
                        'enregistrer', 'sauvegarder', 'créer tâche', 'ajouter tâche', // French
                        'speichern', 'senden', 'aufgabe erstellen', 'aufgabe hinzufügen', // German
                        'salvare', 'inviare', 'creare attività', 'aggiungere attività', // Italian
                        'guardar', 'salvar', 'enviar', 'criar tarefa', 'adicionar tarefa', // Portuguese
                        'сохранить', 'отправить', 'создать задачу', 'добавить задачу', // Russian
                        'opslaan', 'versturen', 'taak maken', 'taak toevoegen', // Dutch
                        'spara', 'skicka', 'skapa uppgift', 'lägg till uppgift', // Swedish
                        'lagre', 'send', 'opprett oppgave', 'legg til oppgave', // Norwegian
                        'gem', 'send', 'opret opgave', 'tilføj opgave', // Danish
                        'tallenna', 'lähetä', 'luo tehtävä', 'lisää tehtävä', // Finnish
                        'zapisz', 'wyślij', 'utwórz zadanie', 'dodaj zadanie', // Polish
                        'kaydet', 'gönder', 'görev oluştur', 'görev ekle', // Turkish
                        'שמור', 'שלח', 'צור משימה', 'הוסף משימה', // Hebrew
                        'บันทึก', 'ส่ง', 'สร้างงาน', 'เพิ่มงาน', // Thai
                        'lưu', 'gửi', 'tạo nhiệm vụ', 'thêm nhiệm vụ', // Vietnamese
                        'simpan', 'kirim', 'buat tugas', 'tambah tugas', // Indonesian
                        'simpan', 'hantar', 'buat tugas', 'tambah tugas', // Malay
                        'i-save', 'ipadala', 'gumawa ng gawain', 'magdagdag ng gawain', // Filipino
                        
                        // Indian Languages
                        'सबमिट', 'सेव', 'काम सबमिट', 'काम सेव', 'सहेजें', 'सबमिट करें', // Hindi
                        'काम बनाएं', 'काम जोड़ें', 'काम भेजें', 'काम स्टोर करें',
                        'সাবমিট', 'সেভ', 'কাজ সাবমিট', 'কাজ সেভ', 'সংরক্ষণ', 'জমা দিন', // Bengali
                        'কাজ তৈরি করুন', 'কাজ যোগ করুন', 'কাজ পাঠান', 'কাজ সংরক্ষণ করুন',
                        'సబ్మిట్', 'సేవ్', 'పని సబ్మిట్', 'పని సేవ్', 'జమా చేయండి', // Telugu
                        'పని చేయండి', 'పని జోడించండి', 'పని పంపండి', 'పని నిల్వ చేయండి',
                        'सबमिट', 'सेव', 'काम सबमिट', 'काम सेव', 'जतन करा', // Marathi
                        'काम तयार करा', 'काम जोडा', 'काम पाठवा', 'काम साठवा',
                        'சமர்ப்பி', 'சேமி', 'வேலை சமர்ப்பி', 'வேலை சேமி', 'சேமிக்கவும்', // Tamil
                        'வேலை உருவாக்கு', 'வேலை சேர்', 'வேலை அனுப்பு', 'வேலை சேமி',
                        'સબમિટ', 'સેવ', 'કામ સબમિટ', 'કામ સેવ', 'સાચવો', // Gujarati
                        'કામ બનાવો', 'કામ ઉમેરો', 'કામ મોકલો', 'કામ સંગ્રહો',
                        'ಸಬ್ಮಿಟ್', 'ಸೇವ್', 'ಕೆಲಸ ಸಬ್ಮಿಟ್', 'ಕೆಲಸ ಸೇವ್', 'ಉಳಿಸಿ', // Kannada
                        'ಕೆಲಸ ಮಾಡಿ', 'ಕೆಲಸ ಸೇರಿಸಿ', 'ಕೆಲಸ ಕಳುಹಿಸಿ', 'ಕೆಲಸ ಸಂಗ್ರಹಿಸಿ',
                        'സബ്മിറ്റ്', 'സേവ്', 'ജോലി സബ്മിറ്റ്', 'ജോലി സേവ്', 'സൂക്ഷിക്കുക', // Malayalam
                        'ജോലി ഉണ്ടാക്കുക', 'ജോലി ചേർക്കുക', 'ജോലി അയയ്ക്കുക', 'ജോലി സൂക്ഷിക്കുക',
                        'ਸਬਮਿਟ', 'ਸੇਵ', 'ਕੰਮ ਸਬਮਿਟ', 'ਕੰਮ ਸੇਵ', 'ਸੇਵ ਕਰੋ', // Punjabi
                        'ਕੰਮ ਬਣਾਓ', 'ਕੰਮ ਜੋੜੋ', 'ਕੰਮ ਭੇਜੋ', 'ਕੰਮ ਸਟੋਰ ਕਰੋ',
                        'ସବମିଟ', 'ସେଭ', 'କାମ ସବମିଟ', 'କାମ ସେଭ', 'ସଞ୍ଚୟ', // Odia
                        'କାମ ତିଆରି କର', 'କାମ ଯୋଡ଼', 'କାମ ପଠାଅ', 'କାମ ସଞ୍ଚୟ କର',
                        'সাবমিট', 'সেভ', 'কাম সাবমিট', 'কাম সেভ', 'সংৰক্ষণ', // Assamese
                        'কাম সাজা', 'কাম যোগ কৰা', 'কাম পঠোৱা', 'কাম সংৰক্ষণ কৰা',
                        
                        // Asian Languages
                        '保存', '提交', '创建任务', '添加任务', '发送', // Chinese
                        '저장', '제출', '작업 생성', '작업 추가', '보내기', // Korean
                        '保存', '送信', 'タスク作成', 'タスク追加', '送信する', // Japanese
                        'حفظ', 'إرسال', 'إنشاء مهمة', 'إضافة مهمة', 'إرسال', // Arabic
                    ];
                    
                    // Check if any submit command is found
                    const foundSubmitCommand = submitCommands.find(cmd => lowerTranscript.includes(cmd));
                    
                    console.log('[MultilingualVoice] Checking for submit command in:', lowerTranscript);
                    console.log('[MultilingualVoice] Found submit command:', foundSubmitCommand);
                    
                    if (foundSubmitCommand) {
                        // Remove the submit command from the transcript
                        let cleanedTranscript = finalTranscript;
                        
                        // Remove the submit command (case-insensitive)
                        const submitCommandRegex = new RegExp(foundSubmitCommand, 'gi');
                        cleanedTranscript = cleanedTranscript.replace(submitCommandRegex, '').trim();
                        
                        // Also remove common variations and extra words
                        const commonWordsToRemove = [
                            'please', 'now', 'task', 'tarea', 'tâche', 'aufgabe', 'attività', 'tarefa', 'задача',
                            'taak', 'uppgift', 'oppgave', 'opgave', 'tehtävä', 'zadanie', 'görev', 'משימה',
                            'งาน', 'nhiệm vụ', 'tugas', 'gawain', 'काम', 'কাজ', 'పని', 'வேலை', 'કામ', 'ಕೆಲಸ',
                            'ജോലി', 'ਕੰਮ', 'କାମ', 'কাম'
                        ];
                        
                        commonWordsToRemove.forEach(word => {
                            const wordRegex = new RegExp(`\\b${word}\\b`, 'gi');
                            cleanedTranscript = cleanedTranscript.replace(wordRegex, '').trim();
                        });
                        
                        // Clean up extra spaces and punctuation
                        cleanedTranscript = cleanedTranscript.replace(/\s+/g, ' ').trim();
                        cleanedTranscript = cleanedTranscript.replace(/^[,\s]+|[,\s]+$/g, '');
                        
                        // Update the transcript with cleaned text
                        this.transcriptText = cleanedTranscript;
                        this.updateTranscriptDisplay();
                        
                        console.log('[MultilingualVoice] Original transcript:', finalTranscript);
                        console.log('[MultilingualVoice] Cleaned transcript:', cleanedTranscript);
                        console.log('[MultilingualVoice] Updated this.transcriptText:', this.transcriptText);
                        
                        // Also update the textarea to ensure it has the cleaned content
                        const transcriptArea = document.getElementById('transcriptTextArea');
                        if (transcriptArea) {
                            transcriptArea.value = cleanedTranscript;
                            console.log('[MultilingualVoice] Updated textarea value:', transcriptArea.value);
                        }
                        
                        // Show transcript for user review
                        setTimeout(() => {
                            this.saveTranscriptAsTask();
                        }, 500);
                    }
                }
        };

        this.recognition.onend = () => {
            this.isListening = false;
            this.updateUI('stopped');
            console.log('[MultilingualVoice] Stopped listening');
        };

        this.recognition.onerror = (event) => {
            this.isListening = false;
            this.updateUI('error', event.error);
            console.error('[MultilingualVoice] Error:', event.error);
            
            let errorMessage = 'Voice recognition error. Please try again.';
            if (event.error === 'not-allowed' || event.error === 'denied') {
                errorMessage = 'Microphone access denied. Please allow microphone permissions.';
            } else if (event.error === 'no-speech') {
                errorMessage = 'No speech detected. Please try speaking again.';
            } else if (event.error === 'audio-capture') {
                errorMessage = 'Audio capture error. Please check your microphone.';
            }
            
            showToast(errorMessage, 'danger');
        };
    }

    setupEventListeners() {
        // Language selector change
        const languageSelect = document.getElementById('voiceLanguage');
        if (languageSelect) {
            languageSelect.addEventListener('change', (e) => {
                this.currentLanguage = e.target.value;
                if (this.recognition) {
                    this.recognition.lang = this.currentLanguage;
                }
                console.log('[MultilingualVoice] Language changed to:', this.currentLanguage);
            });
        }

        // Voice button click
        const voiceBtn = document.getElementById('multilingualVoiceBtn');
        if (voiceBtn) {
            voiceBtn.addEventListener('click', () => {
                if (this.isListening) {
                    this.stop();
                } else {
                    this.start();
                }
            });
        }

        // Instructions button
        const instructionsBtn = document.getElementById('multilingualVoiceInstructionsBtn');
        if (instructionsBtn) {
            instructionsBtn.addEventListener('click', () => {
                this.showInstructions();
            });
        }

        // Transcript action buttons
        const editBtn = document.getElementById('editTranscriptBtn');
        const saveBtn = document.getElementById('saveTranscriptBtn');
        const retryBtn = document.getElementById('retryTranscriptBtn');

        if (editBtn) {
            editBtn.addEventListener('click', () => {
                this.enableTranscriptEditing();
            });
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveTranscriptAsTask();
            });
        }

        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                this.retryRecording();
            });
        }
    }

    start() {
        if (!this.supported) {
            showToast('Voice recognition is not supported in this browser. Please use Google Chrome.', 'danger');
            return;
        }
        
        if (!this.recognition) {
            this.setupRecognition();
        }
        
        if (this.recognition && !this.isListening) {
            this.transcriptText = '';
            this.updateTranscriptDisplay();
            this.recognition.start();
        }
    }

    stop() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }

    updateUI(state, error = null) {
        const voiceBtn = document.getElementById('multilingualVoiceBtn');
        const statusEl = document.getElementById('multilingualVoiceStatus');
        const transcriptEl = document.getElementById('multilingualVoiceTranscript');

        if (!voiceBtn || !statusEl) return;

        // Remove all state classes
        voiceBtn.classList.remove('recording', 'listening', 'error');

        switch (state) {
            case 'listening':
                voiceBtn.classList.add('listening');
                statusEl.textContent = `Listening in ${this.getLanguageDisplayName()}...`;
                break;
            case 'recording':
                voiceBtn.classList.add('recording');
                statusEl.textContent = `Recording in ${this.getLanguageDisplayName()}...`;
                break;
            case 'stopped':
                if (this.transcriptText.trim()) {
                    statusEl.textContent = 'Transcription complete. You can edit or save the task.';
                    if (transcriptEl) transcriptEl.style.display = 'block';
                } else {
                    statusEl.textContent = 'Click the microphone to start recording';
                    if (transcriptEl) transcriptEl.style.display = 'none';
                }
                break;
            case 'error':
                voiceBtn.classList.add('error');
                statusEl.textContent = error || 'An error occurred';
                break;
        }
    }

    updateTranscriptDisplay() {
        const transcriptArea = document.getElementById('transcriptTextArea');
        if (transcriptArea) {
            transcriptArea.value = this.transcriptText;
        }
    }

    enableTranscriptEditing() {
        const transcriptArea = document.getElementById('transcriptTextArea');
        if (transcriptArea) {
            transcriptArea.focus();
            transcriptArea.select();
        }
    }

    async saveTranscriptAsTask() {
        // Use the stored transcript text if available, otherwise fall back to textarea
        let taskText = this.transcriptText || '';
        
        // If no stored transcript, try to get from textarea
        if (!taskText.trim()) {
            const transcriptArea = document.getElementById('transcriptTextArea');
            if (transcriptArea && transcriptArea.value.trim()) {
                taskText = transcriptArea.value.trim();
            } else {
                console.log('[MultilingualVoice] No transcript found - this.transcriptText:', this.transcriptText);
                console.log('[MultilingualVoice] Textarea value:', transcriptArea?.value);
                showToast('No transcript to save. Please record something first.', 'warning');
                return;
            }
        }
        
        console.log('[MultilingualVoice] Using transcript:', taskText);
        
        try {
            // Get form fields first
            const titleField = document.getElementById('taskTitle');
            const descriptionField = document.getElementById('taskDescription');
            const inputMethodField = document.getElementById('taskInputMethod');
            const createdAtField = document.getElementById('taskCreatedAt');
            
            // Check for description commands in various languages
            const lowerTranscript = taskText.toLowerCase();
            const descriptionCommands = [
                // English
                'description', 'desc', 'details', 'note', 'notes', 'info', 'information',
                
                // European Languages
                'descripción', 'descripcion', 'detalles', 'nota', 'notas', 'información', 'info', // Spanish
                'description', 'détails', 'note', 'notes', 'information', 'info', // French
                'beschreibung', 'details', 'notiz', 'notizen', 'information', 'info', // German
                'descrizione', 'dettagli', 'nota', 'note', 'informazione', 'info', // Italian
                'descrição', 'descricao', 'detalhes', 'nota', 'notas', 'informação', 'info', // Portuguese
                'описание', 'детали', 'заметка', 'заметки', 'информация', 'инфо', // Russian
                'beschrijving', 'details', 'notitie', 'notities', 'informatie', 'info', // Dutch
                'beskrivning', 'detaljer', 'anteckning', 'anteckningar', 'information', 'info', // Swedish
                'beskrivelse', 'detaljer', 'notat', 'notater', 'informasjon', 'info', // Norwegian
                'beskrivelse', 'detaljer', 'notat', 'notater', 'information', 'info', // Danish
                'kuvaus', 'yksityiskohdat', 'muistiinpano', 'muistiinpanot', 'tieto', 'tiedot', // Finnish
                'opis', 'szczegóły', 'notatka', 'notatki', 'informacja', 'info', // Polish
                'açıklama', 'detaylar', 'not', 'notlar', 'bilgi', 'bilgiler', // Turkish
                'תיאור', 'פרטים', 'הערה', 'הערות', 'מידע', 'אינפו', // Hebrew
                'คำอธิบาย', 'รายละเอียด', 'บันทึก', 'บันทึก', 'ข้อมูล', 'ข้อมูล', // Thai
                'mô tả', 'chi tiết', 'ghi chú', 'ghi chú', 'thông tin', 'thông tin', // Vietnamese
                'deskripsi', 'detail', 'catatan', 'catatan', 'informasi', 'info', // Indonesian
                'penerangan', 'butiran', 'nota', 'nota', 'maklumat', 'maklumat', // Malay
                'paglalarawan', 'detalye', 'tala', 'mga tala', 'impormasyon', 'impormasyon', // Filipino
                
                // Indian Languages
                'विवरण', 'वर्णन', 'जानकारी', 'नोट', 'टिप्पणी', 'विस्तार', // Hindi
                'বিবরণ', 'বর্ণনা', 'তথ্য', 'নোট', 'মন্তব্য', 'বিস্তারিত', // Bengali
                'వివరణ', 'వర్ణన', 'సమాచారం', 'గమనిక', 'వ్యాఖ్య', 'వివరాలు', // Telugu
                'वर्णन', 'माहिती', 'टीप', 'टिप्पणी', 'तपशील', 'विवरण', // Marathi
                'விளக்கம்', 'விவரம்', 'குறிப்பு', 'குறிப்புகள்', 'தகவல்', 'விவரங்கள்', // Tamil
                'વર્ણન', 'વિગત', 'નોંધ', 'ટિપ્પણી', 'માહિતી', 'વિગતો', // Gujarati
                'ವಿವರಣೆ', 'ವರ್ಣನೆ', 'ಮಾಹಿತಿ', 'ಟಿಪ್ಪಣಿ', 'ವ್ಯಾಖ್ಯಾನ', 'ವಿವರಗಳು', // Kannada
                'വിവരണം', 'വിവരങ്ങൾ', 'കുറിപ്പ്', 'കുറിപ്പുകൾ', 'വിവരം', 'വിവരങ്ങൾ', // Malayalam
                'ਵੇਰਵਾ', 'ਵਰਣਨ', 'ਜਾਣਕਾਰੀ', 'ਨੋਟ', 'ਟਿੱਪਣੀ', 'ਵਿਸਤਾਰ', // Punjabi
                'ବିବରଣ', 'ବର୍ଣ୍ଣନା', 'ତଥ୍ୟ', 'ଟିପ୍ପଣୀ', 'ମନ୍ତବ୍ୟ', 'ବିସ୍ତୃତ', // Odia
                'বিৱৰণ', 'বৰ্ণনা', 'তথ্য', 'টোকা', 'মন্তব্য', 'বিস্তাৰিত', // Assamese
                
                // Asian Languages
                '描述', '详情', '说明', '备注', '信息', '资料', // Chinese
                '설명', '상세', '메모', '참고', '정보', '자료', // Korean
                '説明', '詳細', 'メモ', '備考', '情報', '資料', // Japanese
                'وصف', 'تفاصيل', 'ملاحظة', 'ملاحظات', 'معلومات', 'بيانات', // Arabic
            ];
            
            // Check if any description command is found
            const foundDescriptionCommand = descriptionCommands.find(cmd => lowerTranscript.includes(cmd));
            
            if (foundDescriptionCommand) {
                // Remove the description command from the transcript
                let cleanedTranscript = taskText;
                
                // Remove the description command (case-insensitive)
                const descriptionCommandRegex = new RegExp(foundDescriptionCommand, 'gi');
                cleanedTranscript = cleanedTranscript.replace(descriptionCommandRegex, '').trim();
                
                // Also remove common variations and extra words
                const commonWordsToRemove = [
                    'please', 'now', 'task', 'tarea', 'tâche', 'aufgabe', 'attività', 'tarefa', 'задача',
                    'taak', 'uppgift', 'oppgave', 'opgave', 'tehtävä', 'zadanie', 'görev', 'משימה',
                    'งาน', 'nhiệm vụ', 'tugas', 'gawain', 'काम', 'काज', 'పని', 'வேலை', 'કામ', 'ಕೆಲಸ',
                    'ജോലി', 'ਕੰਮ', 'କାମ', 'কাম', 'set', 'to', 'is', 'are', 'was', 'were'
                ];
                
                commonWordsToRemove.forEach(word => {
                    const wordRegex = new RegExp(`\\b${word}\\b`, 'gi');
                    cleanedTranscript = cleanedTranscript.replace(wordRegex, '').trim();
                });
                
                // Clean up extra spaces and punctuation
                cleanedTranscript = cleanedTranscript.replace(/\s+/g, ' ').trim();
                cleanedTranscript = cleanedTranscript.replace(/^[,\s]+|[,\s]+$/g, '');
                
                // Only populate description field, preserve existing title
                if (descriptionField) {
                    descriptionField.value = cleanedTranscript;
                    descriptionField.dispatchEvent(new Event('input', { bubbles: true }));
                    descriptionField.dispatchEvent(new Event('change', { bubbles: true }));
                    
                    // Auto-resize textarea if it's a textarea
                    if (descriptionField.tagName === 'TEXTAREA') {
                        this.autoResizeTextarea(descriptionField);
                    }
                }
                
                showToast(`Description added in ${this.getLanguageDisplayName()}.`, 'success');
            } else {
                // Original logic for title commands - only populate title field, preserve existing description
                if (titleField) {
                    titleField.value = taskText;
                    titleField.dispatchEvent(new Event('input', { bubbles: true }));
                    titleField.dispatchEvent(new Event('change', { bubbles: true }));
                    
                    // Auto-resize textarea if it's a textarea
                    if (titleField.tagName === 'TEXTAREA') {
                        this.autoResizeTextarea(titleField);
                    }
                }
                
                // Only set default description if it's currently empty or has the default value
                if (descriptionField) {
                    const currentDescription = descriptionField.value.trim();
                    const defaultDescription = `Voice task created in ${this.getLanguageDisplayName()}`;
                    
                    // Only set default if field is empty or already has the default value
                    if (!currentDescription || currentDescription === defaultDescription) {
                        descriptionField.value = defaultDescription;
                        descriptionField.dispatchEvent(new Event('input', { bubbles: true }));
                        descriptionField.dispatchEvent(new Event('change', { bubbles: true }));
                        
                        // Auto-resize textarea if it's a textarea
                        if (descriptionField.tagName === 'TEXTAREA') {
                            this.autoResizeTextarea(descriptionField);
                        }
                    }
                }
            }
            
            if (inputMethodField) {
                inputMethodField.value = 'voice';
                inputMethodField.dispatchEvent(new Event('change', { bubbles: true }));
            }
            
            if (createdAtField) {
                createdAtField.value = new Date().toISOString().slice(0, 16);
                createdAtField.dispatchEvent(new Event('change', { bubbles: true }));
            }
            
            // Set voice input method indicator
            if (typeof setInputMethodToVoice === 'function') {
                setInputMethodToVoice();
            }
            
            // Update input method indicator
            const inputMethodIndicator = document.getElementById('inputMethodIndicator');
            if (inputMethodIndicator) {
                inputMethodIndicator.textContent = `Voice input (${this.getLanguageDisplayName()})`;
                inputMethodIndicator.style.display = 'block';
            }
            
            showToast(`Transcribed text added to form in ${this.getLanguageDisplayName()}! Review and click "Add Task" when ready.`, 'success');
            
            // Reset transcript
            this.transcriptText = '';
            this.updateTranscriptDisplay();
            document.getElementById('multilingualVoiceTranscript').style.display = 'none';
            this.updateUI('stopped');
            
            // Scroll to the form so user can review and submit manually
            setTimeout(() => {
                const formElement = document.getElementById('taskForm');
                if (formElement) {
                    formElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 500);
            
        } catch (error) {
            console.error('[MultilingualVoice] Error populating form:', error);
            showToast('Error populating form. Please try again.', 'danger');
        }
    }

    retryRecording() {
        this.transcriptText = '';
        this.updateTranscriptDisplay();
        document.getElementById('multilingualVoiceTranscript').style.display = 'none';
        this.start();
    }

    getLanguageDisplayName() {
        const languageSelect = document.getElementById('voiceLanguage');
        if (languageSelect) {
            const selectedOption = languageSelect.options[languageSelect.selectedIndex];
            return selectedOption.text.split(' ')[1] || this.currentLanguage;
        }
        return this.currentLanguage;
    }

    autoResizeTextarea(textarea) {
        // Reset height to auto to get the correct scrollHeight
        textarea.style.height = 'auto';
        
        // Calculate new height based on content
        const newHeight = Math.max(textarea.scrollHeight, textarea.style.minHeight ? parseInt(textarea.style.minHeight) : 60);
        
        // Set the new height
        textarea.style.height = newHeight + 'px';
        
        // Update rows attribute for better accessibility
        const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight);
        const rows = Math.ceil(newHeight / lineHeight);
        textarea.rows = Math.max(rows, 2);
    }

    showInstructions() {
        // Show the multilingual voice instructions modal
        const modalElement = document.getElementById('multilingualVoiceInstructionsModal');
        if (modalElement) {
            // Remove any existing backdrop
            const existingBackdrop = document.querySelector('.modal-backdrop');
            if (existingBackdrop) {
                existingBackdrop.remove();
            }
            
            // Reset body styles
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
            
            const modal = new bootstrap.Modal(modalElement, {
                backdrop: true,
                keyboard: true
            });
            modal.show();
        } else {
            // Fallback to alert if modal not found
            const instructions = `
                <div class="multilingual-voice-instructions">
                    <h5><i class="fas fa-globe-americas me-2"></i>Multilingual Voice-to-Task Guide</h5>
                    <div class="instructions-content">
                        <div class="instruction-step">
                            <strong>1. Select Language:</strong> Choose your preferred language from the dropdown
                        </div>
                        <div class="instruction-step">
                            <strong>2. Start Recording:</strong> Click the microphone button to begin
                        </div>
                        <div class="instruction-step">
                            <strong>3. Speak Naturally:</strong> Describe your task in your chosen language
                        </div>
                        <div class="instruction-step">
                            <strong>4. Review & Edit:</strong> Check the transcribed text and make any corrections
                        </div>
                        <div class="instruction-step">
                            <strong>5. Save Task:</strong> Click "Save Task" to create your task
                        </div>
                    </div>
                    <div class="supported-languages mt-3">
                        <strong>Supported Languages:</strong> English, Spanish, French, German, Italian, Portuguese, 
                        Russian, Japanese, Korean, Chinese, Hindi, Arabic, and many more!
                    </div>
                </div>
            `;
            
            // Show instructions in a modal or alert
            alert(instructions.replace(/<[^>]*>/g, ''));
        }
    }
}

// Voice Recognition Manager (Legacy - keeping for backward compatibility)
class VoiceManager {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.supported = 'webkitSpeechRecognition' in window;
        this.setupRecognition();
    }

    setupRecognition() {
        if (!this.supported) return;
        this.recognition = new webkitSpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onstart = () => {
            this.isListening = true;
            document.getElementById('voiceFeedback').classList.remove('d-none');
            document.getElementById('voiceText').textContent = 'Listening...';
        };

        this.recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(result => result[0].transcript)
                .join('');

            document.getElementById('voiceText').textContent = transcript;

            // Handle voice commands
            if (event.results[0].isFinal) {
                this.handleVoiceCommand(transcript.toLowerCase());
            }
        };

        this.recognition.onend = () => {
            this.isListening = false;
            document.getElementById('voiceFeedback').classList.add('d-none');
        };

        this.recognition.onerror = (event) => {
            this.isListening = false;
            document.getElementById('voiceFeedback').classList.add('d-none');
            if (event.error === 'not-allowed' || event.error === 'denied') {
                showToast('Microphone access denied. Please allow microphone permissions.', 'danger');
            } else {
                showToast('Voice recognition error. Please try again.', 'danger');
            }
        };
    }

    start() {
        if (!this.supported) {
            showToast('Voice recognition is not supported in this browser. Please use Google Chrome.', 'danger');
            return;
        }
        if (this.recognition && !this.isListening) {
            this.recognition.start();
        }
    }

    stop() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }

    handleVoiceCommand(command = '') {
        // Support multiple commands in one utterance, with optional 'task' keyword
        // Example: set title to ... set description to ... set priority to ...
        let workingCommand = command;
        const patterns = [
            { regex: /set (task )?title to ([^]+?)(?= set [^ ]+ to |$)/ig, field: 'taskTitle', msg: 'Title updated', group: 2 },
            { regex: /set (task )?description to ([^]+?)(?= set [^ ]+ to |$)/ig, field: 'taskDescription', msg: 'Description updated', group: 2 },
            { regex: /set (task )?priority to ([^]+?)(?= set [^ ]+ to |$)/ig, field: 'taskPriority', msg: 'Priority updated', isPriority: true, group: 2 },
            { regex: /set (task )?due date to ([^\n]+?)(?= set |$)/ig, field: 'taskDueDate', msg: 'Due date updated', isDate: true, group: 2 },
            { regex: /set (task )?status to ([^\n]+?)(?= set |$)/ig, field: 'taskStatus', msg: 'Status updated', isSelect: true, group: 2 },
            { regex: /set (task )?tags? to ([^]+?)(?= set [^ ]+ to |$)/ig, field: 'taskTags', msg: 'Tags updated', isTags: true, group: 2 }
        ];
        let matched = false;
        patterns.forEach(pat => {
            let match;
            while ((match = pat.regex.exec(workingCommand)) !== null) {
                const el = document.getElementById(pat.field);
                if (el) {
                    let value = match[pat.group || 1];
                    if (typeof value !== 'string') value = '';
                    if (pat.isPriority) {
                        // Accept both label and value (case-insensitive)
                        const options = Array.from(el.options);
                        let found = false;
                        for (const opt of options) {
                            if (
                                opt.value.toLowerCase() === value.toLowerCase() ||
                                opt.text.toLowerCase() === value.toLowerCase() ||
                                value.toLowerCase().includes(opt.text.toLowerCase()) ||
                                opt.text.toLowerCase().includes(value.toLowerCase())
                            ) {
                                el.selectedIndex = opt.index;
                                el.value = opt.value; // Ensure value is set for UI
                                found = true;
                                break;
                            }
                        }
                        if (!found) {
                            el.value = value ? value.toLowerCase() : '';
                        }
                        // Force UI update for custom selects
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                        el.dispatchEvent(new Event('change', { bubbles: true }));
                        el.focus(); // Force redraw
                        el.blur(); // Remove focus
                    } else if (pat.isSelect) {
                        if (pat.field === 'taskStatus') {
                            value = value ? value.toLowerCase().replace(' ', '-') : '';
                        }
                        el.value = value ? value.toLowerCase() : '';
                        el.dispatchEvent(new Event('change', { bubbles: true }));
                    } else if (pat.isDate) {
                        let date = new Date(value);
                        if (isNaN(date.getTime())) {
                            const now = new Date();
                            if (/tomorrow/.test(value)) {
                                date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, now.getHours(), now.getMinutes());
                            } else if (/today/.test(value)) {
                                date = now;
                            }
                        }
                        if (!isNaN(date.getTime())) {
                            el.value = date.toISOString().slice(0, 16);
                            el.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                    } else if (pat.isTags) {
                        value = value.replace(/ and /g, ',');
                        el.value = value;
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                    } else {
                        el.value = value;
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                    lastInputMethod = 'voice';
                    // Auto-set input method to voice when voice commands are used
                    this.setInputMethodToVoice();
                    showToast(pat.msg, 'success');
                    matched = true;
                }
                workingCommand = workingCommand.replace(match[0], '');
            }
        });
        // Remove extra spaces
        workingCommand = workingCommand.replace(/\s+/g, ' ').trim();
        if (workingCommand.length > 0) {
            const titleInput = document.getElementById('taskTitle');
            if (titleInput) {
                titleInput.value = workingCommand;
                titleInput.dispatchEvent(new Event('input', { bubbles: true }));
                lastInputMethod = 'voice';
                // Auto-set input method to voice when voice commands are used
                this.setInputMethodToVoice();
                showToast('Text added to title', 'success');
            }
            return;
        }
        // Handle special commands
        const trimmed = command.trim();
        if (trimmed === 'add new task') {
            document.getElementById('addTaskForm').reset();
            setDefaultDueDate();
            lastInputMethod = 'voice';
            // Auto-set input method to voice when voice commands are used
            this.setInputMethodToVoice();
            showToast('Ready to add new task', 'info');
        } else if (trimmed === 'save task' || trimmed === 'add task') {
            lastInputMethod = 'voice'; // Ensure voice is set before submit
            // Auto-set input method to voice when voice commands are used
            this.setInputMethodToVoice();
            setTimeout(() => {
                document.getElementById('addTaskForm').dispatchEvent(new Event('submit', { bubbles: true }));
            }, 300);
        }
    }

    // Helper method to set input method dropdown to voice
    setInputMethodToVoice() {
        const inputMethodSelect = document.getElementById('taskInputMethod');
        if (inputMethodSelect && inputMethodSelect.value !== 'voice') {
            inputMethodSelect.value = 'voice';
            inputMethodSelect.dispatchEvent(new Event('change', { bubbles: true }));
            showToast('Input method automatically set to Voice', 'info');
        }
    }
}

// Recurring Task Management
class RecurringTaskManager {
    constructor() {
        this.initializeRecurringUI().then(() => {
            this.setupEventListeners();
        }).catch(error => {
            console.error('[Recurring] Error initializing:', error);
            this.setupEventListeners();
        });
    }

    async initializeRecurringUI() {
        // Check if user is premium and show recurring options
        await this.checkPremiumStatus();
    }

    async checkPremiumStatus() {
        try {
            console.log('[Recurring] Checking premium status...');
            const user = window.firebaseAuth.currentUser;
            console.log('[Recurring] Current user:', user ? user.email : 'No user');
            
            // Defensive check for Firestore
            if (!window.firebaseDb) {
                console.error('[Recurring] Firestore (window.firebaseDb) is not initialized!');
                showToast('Firestore is not initialized. Please refresh or check your Firebase setup.', 'danger');
                return;
            }
            
            if (user) {
                const userDoc = await window.firebaseDb
                    .collection('users')
                    .doc(user.uid)
                    .get();
                
                console.log('[Recurring] User document exists:', userDoc.exists);
                
                if (userDoc.exists) {
                    const userData = userDoc.data();
                            userRole = userData.role || 'free';
        window.userRole = userRole; // Set global userRole
        console.log('[Recurring] User role:', userRole);
        
        // Initialize premium features after role is determined
        if (typeof initializePremiumFeatures === 'function') {
            initializePremiumFeatures();
        }
                    this.updateRecurringUI();
                } else {
                    console.log('[Recurring] User document does not exist, defaulting to free');
                    userRole = 'free';
                    window.userRole = 'free';
                    this.updateRecurringUI();
                }
            } else {
                console.log('[Recurring] No authenticated user found');
                userRole = 'free';
                window.userRole = 'free';
                this.updateRecurringUI();
            }
        } catch (error) {
            console.error('[Recurring] Error checking premium status:', error);
            userRole = 'free';
            window.userRole = 'free';
            this.updateRecurringUI();
        }
    }

    updateRecurringUI() {
        const recurringSection = document.getElementById('recurringTaskSection');
        console.log('[Recurring] updateRecurringUI called, userRole:', userRole);
        console.log('[Recurring] recurringSection found:', !!recurringSection);
        
        if (recurringSection) {
            if (window.userRole === 'premium') {
                recurringSection.classList.remove('d-none');
                recurringSection.style.display = 'block';
                console.log('[Recurring] Premium user - showing recurring options');
            } else {
                recurringSection.classList.add('d-none');
                recurringSection.style.display = 'none';
                console.log('[Recurring] Free user - hiding recurring options');
            }
        } else {
            console.log('[Recurring] recurringTaskSection element not found');
        }
    }

    setupEventListeners() {
        // Make recurring checkbox
        const makeRecurringCheckbox = document.getElementById('makeRecurring');
        if (makeRecurringCheckbox) {
            makeRecurringCheckbox.addEventListener('change', (e) => {
                this.toggleRecurringOptions(e.target.checked);
            });
        }

        // Recurrence type dropdown
        const recurrenceTypeSelect = document.getElementById('recurrenceType');
        if (recurrenceTypeSelect) {
            recurrenceTypeSelect.addEventListener('change', (e) => {
                this.handleRecurrenceTypeChange(e.target.value);
            });
        }

        // Update next occurrence display when due date or recurrence settings change
        const dueDateInput = document.getElementById('taskDueDate');
        const recurrenceTimeInput = document.getElementById('recurrenceTime');
        const recurrenceIntervalInput = document.getElementById('recurrenceInterval');

        if (dueDateInput) {
            dueDateInput.addEventListener('change', () => this.updateNextOccurrenceDisplay());
        }
        if (recurrenceTimeInput) {
            recurrenceTimeInput.addEventListener('change', () => this.updateNextOccurrenceDisplay());
        }
        if (recurrenceIntervalInput) {
            recurrenceIntervalInput.addEventListener('change', () => this.updateNextOccurrenceDisplay());
        }
    }

    toggleRecurringOptions(show) {
        const recurringOptions = document.getElementById('recurringOptions');
        if (recurringOptions) {
            recurringOptions.style.display = show ? 'block' : 'none';
            if (show) {
                this.updateNextOccurrenceDisplay();
            }
        }
    }

    handleRecurrenceTypeChange(type) {
        const customIntervalGroup = document.getElementById('customIntervalGroup');
        if (customIntervalGroup) {
            customIntervalGroup.style.display = type === 'custom' ? 'block' : 'none';
        }
        this.updateNextOccurrenceDisplay();
    }

    updateNextOccurrenceDisplay() {
        const makeRecurring = document.getElementById('makeRecurring');
        if (!makeRecurring || !makeRecurring.checked) return;

        const dueDateInput = document.getElementById('taskDueDate');
        const recurrenceType = document.getElementById('recurrenceType');
        const recurrenceTime = document.getElementById('recurrenceTime');
        const nextOccurrenceDisplay = document.getElementById('nextOccurrenceDisplay');

        if (!dueDateInput || !recurrenceType || !recurrenceTime || !nextOccurrenceDisplay) return;

        try {
            const dueDate = new Date(dueDateInput.value);
            const nextOccurrence = this.calculateNextOccurrence(dueDate, recurrenceType.value, recurrenceTime.value);
            
            if (nextOccurrence) {
                nextOccurrenceDisplay.textContent = formatDateTime(nextOccurrence);
            } else {
                nextOccurrenceDisplay.textContent = 'Invalid date';
            }
        } catch (error) {
            console.error('[Recurring] Error calculating next occurrence:', error);
            nextOccurrenceDisplay.textContent = 'Error calculating';
        }
    }

    calculateNextOccurrence(dueDate, type, timeString) {
        if (!dueDate || isNaN(dueDate.getTime())) return null;

        // Parse time string (HH:MM format)
        const [hours, minutes] = timeString.split(':').map(Number);
        
        // Create next occurrence date
        let nextDate = new Date(dueDate);
        nextDate.setHours(hours, minutes, 0, 0);

        // Calculate next occurrence based on type
        switch (type) {
            case 'daily':
                nextDate.setDate(nextDate.getDate() + 1);
                break;
            case 'weekly':
                nextDate.setDate(nextDate.getDate() + 7);
                break;
            case 'monthly':
                nextDate.setMonth(nextDate.getMonth() + 1);
                break;
            case 'custom':
                const intervalInput = document.getElementById('recurrenceInterval');
                const interval = intervalInput ? parseInt(intervalInput.value) || 7 : 7;
                nextDate.setDate(nextDate.getDate() + interval);
                break;
            default:
                return null;
        }

        return nextDate;
    }

    getRecurrenceData() {
        try {
            console.log('[Recurring] getRecurrenceData called');
            
            const makeRecurring = document.getElementById('makeRecurring');
            console.log('[Recurring] makeRecurring element:', !!makeRecurring);
            console.log('[Recurring] makeRecurring checked:', makeRecurring ? makeRecurring.checked : 'N/A');
            
            if (!makeRecurring || !makeRecurring.checked) {
                console.log('[Recurring] Recurring not enabled');
                return null;
            }

            const recurrenceType = document.getElementById('recurrenceType');
            const recurrenceTime = document.getElementById('recurrenceTime');
            const dueDateInput = document.getElementById('taskDueDate');

            console.log('[Recurring] Form elements found:', {
                recurrenceType: !!recurrenceType,
                recurrenceTime: !!recurrenceTime,
                dueDateInput: !!dueDateInput
            });

            if (!recurrenceType || !recurrenceTime || !dueDateInput) {
                console.log('[Recurring] Missing form elements for recurrence data');
                return null;
            }

            const dueDate = new Date(dueDateInput.value);
            if (isNaN(dueDate.getTime())) {
                console.log('[Recurring] Invalid due date');
                return null;
            }

            const nextDue = this.calculateNextOccurrence(dueDate, recurrenceType.value, recurrenceTime.value);
            console.log('[Recurring] Calculated next due date:', nextDue);

            const recurrenceData = {
                recurring: true,
                recurrence: {
                    type: recurrenceType.value,
                    time: recurrenceTime.value,
                    nextDue: nextDue ? nextDue : null // Store as regular Date object
                }
            };

            // Add interval for custom type
            if (recurrenceType.value === 'custom') {
                const intervalInput = document.getElementById('recurrenceInterval');
                recurrenceData.recurrence.interval = intervalInput ? parseInt(intervalInput.value) || 7 : 7;
            }

            console.log('[Recurring] Generated recurrence data:', recurrenceData);
            return recurrenceData;
        } catch (error) {
            console.error('[Recurring] Error in getRecurrenceData:', error);
            return null;
        }
    }

    resetRecurringForm() {
        const makeRecurring = document.getElementById('makeRecurring');
        const recurringOptions = document.getElementById('recurringOptions');
        const customIntervalGroup = document.getElementById('customIntervalGroup');

        if (makeRecurring) makeRecurring.checked = false;
        if (recurringOptions) recurringOptions.style.display = 'none';
        if (customIntervalGroup) customIntervalGroup.style.display = 'none';
    }

    formatRecurrenceInfo(recurrence) {
        if (!recurrence) return '';
        
        const type = recurrence.type || '';
        const time = recurrence.time || '';
        const interval = recurrence.interval;
        
        let info = '';
        switch (type) {
            case 'daily':
                info = 'Daily';
                break;
            case 'weekly':
                info = 'Weekly';
                break;
            case 'monthly':
                info = 'Monthly';
                break;
            case 'custom':
                info = `Every ${interval || 7} days`;
                break;
            default:
                info = type;
        }
        
        if (time) {
            info += ` at ${time}`;
        }
        
        return info;
    }
}

// Function to handle recurring task execution
async function handleRecurringTaskCompletion(task) {
    if (!task.recurring || !task.recurrence || !task.recurrence.nextDue) {
        return;
    }

    try {
        const user = window.firebaseAuth.currentUser;
        if (!user) return;

        // Check if it's time to create the next occurrence
        const now = new Date();
        let nextDue;
        
        if (task.recurrence.nextDue instanceof Date) {
            nextDue = task.recurrence.nextDue;
        } else if (task.recurrence.nextDue && task.recurrence.nextDue.seconds) {
            // Handle Firestore timestamp
            nextDue = new Date(task.recurrence.nextDue.seconds * 1000);
        } else if (task.recurrence.nextDue) {
            // Handle string or other date format
            nextDue = new Date(task.recurrence.nextDue);
        } else {
            console.log('[Recurring] No valid nextDue found');
            return;
        }

        if (nextDue <= now) {
            // Create the next occurrence
            const nextOccurrence = calculateNextOccurrence(
                nextDue, 
                task.recurrence.type, 
                task.recurrence.time,
                task.recurrence.interval
            );

            if (nextOccurrence) {
                // Create new task with updated due date
                const nextNextDue = calculateNextOccurrence(nextOccurrence, task.recurrence.type, task.recurrence.time, task.recurrence.interval);
                
                const newTask = {
                    userId: user.uid,
                    title: task.title,
                    description: task.description,
                    dueDate: nextOccurrence,
                    priority: task.priority,
                    status: 'in-progress',
                    tags: task.tags || [],
                    inputMethod: task.inputMethod || 'manual',
                    recurring: true,
                    recurrence: {
                        ...task.recurrence,
                        nextDue: nextNextDue // Store as regular Date object
                    },
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                const newTaskRef = await window.firebaseDb.collection('tasks').add(newTask);
                console.log('[Recurring] Created next occurrence for task:', task.title);
                
                // Add task ID to the new task
                const newTaskWithId = { ...newTask, id: newTaskRef.id };
                
                // For recurring tasks, don't automatically create Google Calendar events
                // User needs to manually sync them
                showToast(`Next occurrence of "${task.title}" created`, 'success');
            }
        }
    } catch (error) {
        console.error('[Recurring] Error handling recurring task completion:', error);
    }
}

// Helper function to calculate next occurrence (standalone version)
function calculateNextOccurrence(dueDate, type, timeString, interval = 7) {
    if (!dueDate || isNaN(dueDate.getTime())) return null;

    // Parse time string (HH:MM format)
    const [hours, minutes] = timeString.split(':').map(Number);
    
    // Create next occurrence date
    let nextDate = new Date(dueDate);
    nextDate.setHours(hours, minutes, 0, 0);

    // Calculate next occurrence based on type
    switch (type) {
        case 'daily':
            nextDate.setDate(nextDate.getDate() + 1);
            break;
        case 'weekly':
            nextDate.setDate(nextDate.getDate() + 7);
            break;
        case 'monthly':
            nextDate.setMonth(nextDate.getMonth() + 1);
            break;
        case 'custom':
            nextDate.setDate(nextDate.getDate() + interval);
            break;
        default:
            return null;
    }

    return nextDate;
}

// Improved Voice Command Handler for Task Form (parse all fields, tolerate punctuation, always fill something)
window.handleVoiceCommand = function(transcript) {
  if (!transcript || typeof transcript !== 'string') return;
  transcript = transcript.trim();
  let lower = transcript.toLowerCase();
  let matched = false;

  // Helper: extract field by regex, tolerate punctuation and allow long input
  function extractField(pattern) {
    let m = transcript.match(pattern);
    if (m && m[1]) {
      return m[1].replace(/[ ]*$/, '').trim();
    }
    return null;
  }

  // Helper function to set input method to voice
  function setInputMethodToVoice() {
    const inputMethodSelect = document.getElementById('taskInputMethod');
    if (inputMethodSelect && inputMethodSelect.value !== 'voice') {
      inputMethodSelect.value = 'voice';
      inputMethodSelect.dispatchEvent(new Event('change', { bubbles: true }));
      showToast('Input method automatically set to Voice', 'info');
    }
  }

  // Title
  let title = extractField(/set title to ([^]+?)(?= set [^ ]+ to |$)/i);
  if (title) {
    document.getElementById('taskTitle').value = title;
    matched = true;
    lastInputMethod = 'voice';
    setInputMethodToVoice();
  }
  // Description
  let desc = extractField(/set description to ([^]+?)(?= set [^ ]+ to |$)/i);
  if (desc) {
    document.getElementById('taskDescription').value = desc;
    matched = true;
    lastInputMethod = 'voice';
    setInputMethodToVoice();
  }
  // Priority
  let prio = extractField(/set priority to ([^]+?)(?= set [^ ]+ to |$)/i);
  if (prio) {
    // Accept both label and value (case-insensitive)
    const el = document.getElementById('taskPriority');
    if (el) {
      const options = Array.from(el.options);
      let found = false;
      for (const opt of options) {
        if (
          opt.value.toLowerCase() === prio.toLowerCase() ||
          opt.text.toLowerCase() === prio.toLowerCase() ||
          prio.toLowerCase().includes(opt.text.toLowerCase()) ||
          opt.text.toLowerCase().includes(prio.toLowerCase())
        ) {
          el.selectedIndex = opt.index;
          el.value = opt.value;
          found = true;
          break;
        }
      }
      if (!found) {
        el.value = prio ? prio.toLowerCase() : '';
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.focus();
      el.blur();
    }
    matched = true;
    lastInputMethod = 'voice';
    setInputMethodToVoice();
  }
  // Tags
  let tags = extractField(/set tags? to ([^]+?)(?= set [^ ]+ to |$)/i);
  if (tags) {
    document.getElementById('taskTags').value = tags.replace(/ and /g, ',');
    matched = true;
    lastInputMethod = 'voice';
    setInputMethodToVoice();
  }
  // Submit
  if (/submit task|add task/i.test(lower)) {
    lastInputMethod = 'voice'; // Ensure voice is set before submit
    setInputMethodToVoice();
    let form = document.getElementById('addTaskForm');
    if (form) form.requestSubmit();
    matched = true;
  }
  // If nothing matched, fill title as fallback
  if (!matched && transcript.length > 0) {
    document.getElementById('taskTitle').value = transcript;
    lastInputMethod = 'voice';
    setInputMethodToVoice();
  }
};

// Initialize application
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Task] Document loaded');
    
    // Check authentication
    const isAuthenticated = await checkAuthentication();
    if (!isAuthenticated) return;
    
    // Note: initTaskManager() is now called in enablePremiumFeatures() for premium users only
    
    // Initialize voice manager
    window.voiceManager = new VoiceManager();
    
    // Initialize recurring task manager
    window.recurringTaskManager = new RecurringTaskManager();
    
    // Initialize team assignment manager
    if (teamAssignmentManager) {
        teamAssignmentManager.setupEventListeners();
    }
    
    // Force premium status check after a short delay to ensure Firebase is ready
    setTimeout(async () => {
        if (window.recurringTaskManager) {
            await window.recurringTaskManager.checkPremiumStatus();
        }
    }, 1000);
    
    // Temporary: Force premium status for testing (remove this in production)
    setTimeout(() => {
        console.log('[Recurring] TEMPORARY: Setting user as premium for testing');
        userRole = 'premium';
        window.userRole = 'premium';
        if (window.recurringTaskManager) {
            window.recurringTaskManager.updateRecurringUI();
        }
        
        // Update premium banner display after role change
        updatePremiumBannerDisplay();
    }, 2000);
    
    // Add test function to window for debugging
    window.testRecurringTask = function() {
        console.log('[Test] Testing recurring task functionality...');
        console.log('[Test] User role:', window.userRole);
        console.log('[Test] Recurring manager:', !!window.recurringTaskManager);
        
        if (window.recurringTaskManager) {
            console.log('[Test] Testing getRecurrenceData...');
            const data = window.recurringTaskManager.getRecurrenceData();
            console.log('[Test] Recurrence data:', data);
        }
        
        // Test form elements
        const elements = {
            makeRecurring: document.getElementById('makeRecurring'),
            recurrenceType: document.getElementById('recurrenceType'),
            recurrenceTime: document.getElementById('recurrenceTime'),
            taskDueDate: document.getElementById('taskDueDate')
        };
        
        console.log('[Test] Form elements:', elements);
        
        return {
            userRole: window.userRole,
            recurringManager: !!window.recurringTaskManager,
            formElements: elements,
            recurrenceData: window.recurringTaskManager ? window.recurringTaskManager.getRecurrenceData() : null
        };
    };

    // Add debug function for sync functionality
    window.debugSyncFunctionality = function() {
        console.log('[Debug] === Recurring Task Sync Debug ===');
        console.log('[Debug] User role:', window.userRole);
        console.log('[Debug] Google Calendar available:', !!window.gcal);
        console.log('[Debug] Google Calendar signed in:', window.gcal && window.gcal.isSignedIn ? window.gcal.isSignedIn() : 'N/A');
        console.log('[Debug] Recurring task manager:', !!window.recurringTaskManager);
        console.log('[Debug] Modal element exists:', !!document.getElementById('syncDurationModal'));
        console.log('[Debug] Confirm sync button exists:', !!document.getElementById('confirmSyncBtn'));
        
        // Check for recurring tasks in state
        const recurringTasks = taskState.tasks.filter(t => t.recurring);
        console.log('[Debug] Recurring tasks in state:', recurringTasks.length);
        recurringTasks.forEach((task, index) => {
            console.log(`[Debug] Recurring task ${index + 1}:`, {
                id: task.id,
                title: task.title,
                recurrence: task.recurrence
            });
        });
        
        // Test modal functionality
        const testTask = {
            id: 'test-task-123',
            title: 'Test Recurring Task',
            recurring: true,
            recurrence: {
                type: 'daily',
                time: '09:00'
            }
        };
        
        console.log('[Debug] Testing modal with task:', testTask);
        showSyncDurationModal(testTask, testTask.title);
        
        console.log('[Debug] === End Debug ===');
    };

    // Voice Command Button Handler
    const voiceBtn = document.getElementById('voiceInputButton');
    if (voiceBtn && window.voiceManager) {
        if (!window.voiceManager.supported) {
            voiceBtn.disabled = true;
            voiceBtn.title = 'Voice recognition is not supported in this browser.';
        }
        voiceBtn.addEventListener('click', () => {
            if (!window.voiceManager.supported) {
                showToast('Voice recognition is not supported in this browser. Please use Google Chrome.', 'danger');
                return;
            }
            if (window.voiceManager.isListening) {
                window.voiceManager.stop();
                voiceBtn.classList.remove('recording');
            } else {
                window.voiceManager.start();
                voiceBtn.classList.add('recording');
            }
        });
    }
    
    // Add Task Form Handler (robust for text and voice)
    const addTaskForm = document.getElementById('addTaskForm');
    if (addTaskForm) {
        addTaskForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            addTaskForm.classList.add('was-validated');
            // Check required fields
            const title = document.getElementById('taskTitle').value.trim();
            const priority = document.getElementById('taskPriority').value;
            const dueDate = document.getElementById('taskDueDate').value;
            const status = document.getElementById('taskStatus').value;
            if (!title || !priority || !dueDate || !status) {
                showToast('Please fill all required fields.', 'warning');
                return;
            }
            try {
                await addTask();
                // Only reset if addTask succeeds
                addTaskForm.reset();
                addTaskForm.classList.remove('was-validated');
                setDefaultDueDate();
            } catch (err) {
                console.error('[Task] Error adding task:', err);
                const errorMessage = err.message || 'Failed to add task. Please try again.';
                showToast(errorMessage, 'danger');
            }
        });
    }

    // Ensure lastInputMethod is set to 'manual' on any manual input in Add Task form
    {
        const addTaskFormEl = document.getElementById('addTaskForm');
        if (addTaskFormEl) {
            addTaskFormEl.querySelectorAll('input, textarea, select').forEach(el => {
                el.addEventListener('input', () => { 
                    lastInputMethod = 'manual'; 
                    // Reset input method dropdown to manual when user manually types
                    if (el.id !== 'taskInputMethod') {
                        const inputMethodSelect = document.getElementById('taskInputMethod');
                        if (inputMethodSelect && inputMethodSelect.value !== 'manual') {
                            inputMethodSelect.value = 'manual';
                            inputMethodSelect.dispatchEvent(new Event('change', { bubbles: true }));
                            showToast('Input method set to Manual', 'info');
                        }
                    }
                });
                el.addEventListener('change', () => { 
                    lastInputMethod = 'manual'; 
                    // Reset input method dropdown to manual when user manually changes
                    if (el.id !== 'taskInputMethod') {
                        const inputMethodSelect = document.getElementById('taskInputMethod');
                        if (inputMethodSelect && inputMethodSelect.value !== 'manual') {
                            inputMethodSelect.value = 'manual';
                            inputMethodSelect.dispatchEvent(new Event('change', { bubbles: true }));
                            showToast('Input method set to Manual', 'info');
                        }
                    }
                });
            });
        }
    }
    
    // VoiceManager: ensure voice submit triggers form submit after field population
    if (window.voiceManager) {
        const origHandleVoiceCommand = window.voiceManager.handleVoiceCommand.bind(window.voiceManager);
        window.voiceManager.handleVoiceCommand = function(command) {
            origHandleVoiceCommand(command);
            // If command is save/add task, delay submit to allow field population
            if (/^(save|add) task$/i.test(command.trim())) {
                setTimeout(() => {
                    document.getElementById('addTaskForm').dispatchEvent(new Event('submit', { bubbles: true }));
                }, 400);
            }
        };
    }
    
    // Set default due date
    setDefaultDueDate();
    
    // Update current date/time display
    updateCurrentDateTime();
    
    // Sign out handler (moved to DOMContentLoaded)
    const signOutButton = document.getElementById('signOut');
    if (signOutButton) {
        let isSigningOut = false;
        signOutButton.addEventListener('click', async function() {
            if (isSigningOut) return;
            isSigningOut = true;
            try {
                if (window.firebaseAuth && typeof window.firebaseAuth.signOut === 'function') {
                    await window.firebaseAuth.signOut();
                } else if (window.firebase && window.firebase.auth) {
                    await window.firebase.auth().signOut();
                }
            } catch (err) {
                console.error('Sign out failed:', err);
            } finally {
                window.location.href = 'login.html';
                setTimeout(() => { isSigningOut = false; }, 1000);
            }
        });
    }

    // Sync duration modal confirm button handler - removed to prevent conflicts
    // Event listener is now attached dynamically in showSyncDurationModal

    // After authentication and user role fetch
    firebaseAuth.onAuthStateChanged(async (user) => {
        if (user) {
            taskState.currentUser = user;
            const db = window.firebaseDb;
            let userRole = 'free';
            window.userRole = 'free';
            try {
                const userDoc = await db.collection('users').doc(user.uid).get();
                        userRole = userDoc.data()?.role || 'free';
        window.userRole = userRole; // Set global userRole
        console.log('[Task] User role:', userRole);
        
        // Initialize premium features after role is determined
        if (typeof initializePremiumFeatures === 'function') {
            initializePremiumFeatures();
        }
                console.log('[Task] User document data:', userDoc.data());
                console.log('[Task] User UID:', user.uid);
            } catch (err) {
                console.error('[Task] Error fetching user role:', err);
                userRole = 'free';
                window.userRole = 'free';
            }
            
            // Show/hide Upgrade button
            const upgradeBtn = document.getElementById('upgradePremiumBtn');
            const upgradeContainer = document.getElementById('upgradePremiumContainer');
            console.log('[Task] Found upgrade elements:', { upgradeBtn: !!upgradeBtn, upgradeContainer: !!upgradeContainer });
            
            if (upgradeBtn && upgradeContainer) {
                // Always remove previous click listeners to avoid duplicates
                const newBtn = upgradeBtn.cloneNode(true);
                upgradeBtn.parentNode.replaceChild(newBtn, upgradeBtn);
                if (window.userRole === 'premium') {
                    // Always hide both container and button for premium users
                    upgradeContainer.classList.add('d-none');
                    newBtn.style.display = 'none';
                    newBtn.setAttribute('aria-hidden', 'true');
                    newBtn.disabled = true;
                    // Show premium badge
                    const badge = document.getElementById('premiumBadge');
                    if (badge) {
                        badge.classList.remove('d-none');
                    }
                    // Show premium banner
                    const premiumBanner = document.getElementById('premiumBanner');
                    console.log('[Task] Premium banner element found:', !!premiumBanner);
                    if (premiumBanner) {
                        premiumBanner.classList.remove('d-none');
                        premiumBanner.style.display = 'block';
                        console.log('[Task] Premium banner shown for premium user');
                        console.log('[Task] Premium banner display style:', premiumBanner.style.display);
                        console.log('[Task] Premium banner classes:', premiumBanner.className);
                    } else {
                        console.error('[Task] Premium banner element not found in DOM');
                    }
                    
                            // Update premium banner display using the dedicated function
        updatePremiumBannerDisplay();
        document.body.classList.add('premium-user');
        
        // Initialize multilingual voice features for premium users
        initializeMultilingualVoice();
                    
                    // Show Google Calendar integration for premium users
                    const calendarSection = document.getElementById('calendarIntegrationSection');
                    console.log('[Task] Calendar section element found:', !!calendarSection);
                    if (calendarSection) {
                        // Remove all hiding classes and styles
                        calendarSection.classList.remove('d-none');
                        calendarSection.classList.remove('blur');
                        calendarSection.classList.remove('opacity-50');
                        calendarSection.classList.add('premium-feature');
                        
                        // Force show the section with explicit styles
                        calendarSection.style.display = 'block';
                        calendarSection.style.visibility = 'visible';
                        calendarSection.style.opacity = '1';
                        calendarSection.style.filter = 'none';
                        calendarSection.style.pointerEvents = 'auto';
                        
                        console.log('[Task] Calendar section shown for premium user');
                        console.log('[Task] Calendar section display style:', calendarSection.style.display);
                        console.log('[Task] Calendar section visibility:', calendarSection.style.visibility);
                        
                        // Remove any existing debug indicators
                        const existingDebug = calendarSection.querySelector('.alert-info');
                        if (existingDebug) {
                            existingDebug.remove();
                        }
                        
                        // Add a success indicator for premium users
                        const successIndicator = document.createElement('div');
                        successIndicator.className = 'alert alert-success mt-2';
                        successIndicator.innerHTML = '<i class="bi bi-check-circle me-2"></i>Premium Calendar Integration Enabled';
                        calendarSection.appendChild(successIndicator);
                        
                    } else {
                        console.error('[Task] Calendar section not found in DOM');
                    }
                    
                    // Hide premium prompt
                    const premiumPrompt = document.getElementById('premiumPromptContainer');
                    console.log('[Task] Premium prompt element found:', !!premiumPrompt);
                    if (premiumPrompt) premiumPrompt.classList.add('d-none');
                    
                    // Initialize Google Calendar integration
                    if (typeof window.gcal !== 'undefined' && typeof window.gcal.initGoogleCalendarApi === 'function') {
                        try {
                            // First validate Google configuration
                            const configValidation = validateGoogleConfiguration();
                            if (!configValidation.isValid) {
                                console.error('[Task] Google Calendar configuration invalid:', configValidation.issues);
                                showGoogleConfigurationError(configValidation.issues);
                                return;
                            }
                            
                            await window.gcal.initGoogleCalendarApi();
                            console.log('[Task] Google Calendar API initialized for premium user');
                        } catch (error) {
                            console.error('[Task] Error initializing Google Calendar API:', error);
                            
                            // Show user-friendly error message
                            if (error.message.includes('configuration invalid')) {
                                showGoogleConfigurationError([error.message]);
                            } else if (error.status === 400) {
                                showToast('Google Calendar API key is invalid. Please contact support.', 'warning');
                            } else if (error.status === 403) {
                                showToast('Google Calendar API access denied. Please check your API key permissions.', 'warning');
                            } else {
                                const errorMsg = error.message || 'Failed to initialize Google Calendar';
                                showToast('Google Calendar setup failed: ' + errorMsg, 'warning');
                            }
                        }
                    } else {
                        console.warn('[Task] Google Calendar API not available');
                        showToast('Google Calendar integration not available. Please refresh the page.', 'warning');
                    }
                    
                    // Note: Calendar integration is now initialized in task.html
                    
                    console.log('[Task] Premium user detected - Calendar integration enabled');
                } else {
                    // Always show both container and button for free users
                    upgradeContainer.classList.remove('d-none');
                    newBtn.style.display = '';
                    newBtn.removeAttribute('aria-hidden');
                    newBtn.disabled = false;
                    // Hide premium badge for free users
                    const badge = document.getElementById('premiumBadge');
                    if (badge) {
                        badge.classList.add('d-none');
                    }
                    
                    // Initialize multilingual voice features for free users (shows upgrade prompt)
                    initializeMultilingualVoice();
                    // Hide premium banner for free users
                    const premiumBanner = document.getElementById('premiumBanner');
                    if (premiumBanner) {
                        premiumBanner.classList.add('d-none');
                        premiumBanner.style.display = 'none';
                    }
                    document.body.classList.remove('premium-user');
                    // Add click handler to redirect to premium page
                    newBtn.addEventListener('click', function() {
                        window.location.href = 'premium.html';
                    });
                    
                    // Hide Google Calendar integration for free users
                    const calendarSection = document.getElementById('calendarIntegrationSection');
                    if (calendarSection) calendarSection.classList.add('d-none');
                    
                    // Show premium prompt
                    const premiumPrompt = document.getElementById('premiumPromptContainer');
                    if (premiumPrompt) premiumPrompt.classList.remove('d-none');
                    
                    console.log('[Task] Non-premium user - Calendar integration disabled');
                }
            }
            
            // Initialize task listener
            console.log('[Task] Firebase Auth state changed - user authenticated, setting up task listener...');
            setupTaskListener();
        } else {
            taskState.currentUser = null;
            taskState.tasks = [];
            renderTasks(currentTaskPage);
            
            // Hide all calendar integration UI when user is not authenticated
            const calendarSection = document.getElementById('calendarIntegrationSection');
            if (calendarSection) calendarSection.classList.add('d-none');
            
            const premiumPrompt = document.getElementById('premiumPromptContainer');
            if (premiumPrompt) premiumPrompt.classList.add('d-none');
        }
    });
});

// Team Assignment Manager for Premium Users
class TeamAssignmentManager {
    constructor() {
        this.currentUser = null;
        this.userRole = 'free';
        this.userTeams = [];
        this.selectedTeam = null;
        this.teamMembers = [];
        this.isAdmin = false;
        this.init();
    }

    async init() {
        console.log('[TeamAssignment] Initializing Team Assignment Manager...');
        
        // Wait for Firebase to be ready
        if (window.firebaseAuth) {
            this.setupAuthListener();
        } else {
            const checkInterval = setInterval(() => {
                if (window.firebaseAuth) {
                    clearInterval(checkInterval);
                    this.setupAuthListener();
                }
            }, 1000);
        }
    }

    setupAuthListener() {
        console.log('[TeamAssignment] Setting up auth listener...');
        window.firebaseAuth.onAuthStateChanged(async (user) => {
            if (user) {
                this.currentUser = user;
                await this.checkUserRole();
            } else {
                this.currentUser = null;
                this.hideTeamAssignmentUI();
            }
        });
    }

    async checkUserRole() {
        try {
            console.log('[TeamAssignment] Checking user role...');
            
            if (!window.firebase || !window.firebase.firestore) {
                console.error('[TeamAssignment] Firestore not initialized');
                return;
            }

            const db = window.firebase.firestore();
            const userDoc = await db
                .collection('users')
                .doc(this.currentUser.uid)
                .get();

            if (userDoc.exists) {
                const userData = userDoc.data();
                this.userRole = userData.role || 'free';
                console.log('[TeamAssignment] User role:', this.userRole);

                // For testing purposes, allow all users to access team assignment
                // In production, you might want to restrict this to premium users only
                await this.checkAdminStatus();
            } else {
                this.hideTeamAssignmentUI();
            }
        } catch (error) {
            console.error('[TeamAssignment] Error checking user role:', error);
            this.hideTeamAssignmentUI();
        }
    }

    async checkAdminStatus() {
        try {
            console.log('[TeamAssignment] Checking team membership...');
            console.log('[TeamAssignment] Current user ID:', this.currentUser.uid);
            
            const db = window.firebase.firestore();
            
            // First check if user is admin of any teams
            const adminTeamsSnapshot = await db
                .collection('teams')
                .where('createdBy', '==', this.currentUser.uid)
                .get();

            console.log('[TeamAssignment] Admin teams query result:', adminTeamsSnapshot.size, 'teams found');

            // Then check if user is a member of any teams
            const memberTeamsSnapshot = await db
                .collection('teams')
                .where('members', 'array-contains', this.currentUser.uid)
                .get();

            console.log('[TeamAssignment] Member teams query result:', memberTeamsSnapshot.size, 'teams found');

            // Combine both results
            const allTeams = new Map();
            
            adminTeamsSnapshot.docs.forEach(doc => {
                allTeams.set(doc.id, { id: doc.id, ...doc.data(), isAdmin: true });
            });
            
            memberTeamsSnapshot.docs.forEach(doc => {
                if (!allTeams.has(doc.id)) {
                    allTeams.set(doc.id, { id: doc.id, ...doc.data(), isAdmin: false });
                }
            });

            this.userTeams = Array.from(allTeams.values());
            this.isAdmin = adminTeamsSnapshot.size > 0;

            console.log('[TeamAssignment] Total teams found:', this.userTeams.length);
            console.log('[TeamAssignment] Team details:', this.userTeams);

            if (this.userTeams.length > 0) {
                this.showTeamAssignmentUI();
                this.populateTeamDropdown();
            } else {
                console.log('[TeamAssignment] User is not a member of any teams');
                console.log('[TeamAssignment] Attempting to create sample teams for testing...');
                
                // Try to create sample teams for testing
                try {
                    await this.createSampleTeamsForTesting();
                } catch (error) {
                    console.error('[TeamAssignment] Error creating sample teams:', error);
                }
                
                this.hideTeamAssignmentUI();
            }
        } catch (error) {
            console.error('[TeamAssignment] Error checking team membership:', error);
            this.hideTeamAssignmentUI();
        }
    }

    showTeamAssignmentUI() {
        console.log('[TeamAssignment] Showing team assignment UI...');
        
        const teamSection = document.getElementById('teamAssignmentSection');
        if (teamSection) {
            teamSection.style.display = 'block';
            teamSection.classList.remove('d-none');
            console.log('[TeamAssignment] Team assignment section shown successfully');
            
            // Setup event listeners after UI is shown
            this.setupEventListeners();
        } else {
            console.error('[TeamAssignment] Team assignment section element not found!');
        }
    }

    hideTeamAssignmentUI() {
        console.log('[TeamAssignment] Hiding team assignment UI...');
        
        const teamSection = document.getElementById('teamAssignmentSection');
        if (teamSection) {
            teamSection.style.display = 'none';
            teamSection.classList.add('d-none');
        }
    }

    populateTeamDropdown() {
        const teamSelect = document.getElementById('teamSelect');
        if (!teamSelect) {
            console.error('[TeamAssignment] Team select element not found!');
            return;
        }

        console.log('[TeamAssignment] Populating team dropdown with teams:', this.userTeams);

        teamSelect.innerHTML = '<option value="">Select a team...</option>';
        this.userTeams.forEach(team => {
            const option = document.createElement('option');
            option.value = team.id;
            option.textContent = team.name;
            teamSelect.appendChild(option);
            console.log('[TeamAssignment] Added team option:', team.name, 'with ID:', team.id);
        });
        
        // Ensure event listeners are set up after populating teams
        this.setupEventListeners();
    }

    async onTeamChange(teamId) {
        console.log('[TeamAssignment] onTeamChange called with teamId:', teamId);
        
        if (!teamId) {
            console.log('[TeamAssignment] No team selected, clearing member dropdown');
            this.selectedTeam = null;
            this.teamMembers = [];
            this.updateMemberDropdown();
            return;
        }

        try {
            console.log('[TeamAssignment] Fetching team data for ID:', teamId);
            const db = window.firebase.firestore();
            const teamDoc = await db
                .collection('teams')
                .doc(teamId)
                .get();

            if (teamDoc.exists) {
                const teamData = teamDoc.data();
                console.log('[TeamAssignment] Team data found:', teamData);
                this.selectedTeam = { id: teamId, ...teamData };
                console.log('[TeamAssignment] Selected team set to:', this.selectedTeam);
                await this.fetchTeamMembers(teamId);
            } else {
                console.error('[TeamAssignment] Team document does not exist for ID:', teamId);
            }
        } catch (error) {
            console.error('[TeamAssignment] Error loading team:', error);
        }
    }

    async fetchTeamMembers(teamId) {
        try {
            console.log('[TeamAssignment] fetchTeamMembers called for teamId:', teamId);
            const db = window.firebase.firestore();
            const teamDoc = await db
                .collection('teams')
                .doc(teamId)
                .get();

            if (teamDoc.exists) {
                const teamData = teamDoc.data();
                const memberIds = teamData.members || [];
                console.log('[TeamAssignment] Found member IDs:', memberIds);
                
                // If no members or only current user, add some sample members for testing
                if (memberIds.length === 0 || (memberIds.length === 1 && memberIds[0] === this.currentUser.uid)) {
                    console.log('[TeamAssignment] Team has no other members, adding sample members for testing');
                    
                    // Add sample members to the team
                    const sampleMembers = [
                        { id: 'sample-user-1', displayName: 'John Doe', email: 'john@example.com' },
                        { id: 'sample-user-2', displayName: 'Jane Smith', email: 'jane@example.com' },
                        { id: 'sample-user-3', displayName: 'Bob Johnson', email: 'bob@example.com' }
                    ];
                    
                    this.teamMembers = [
                        { id: this.currentUser.uid, displayName: this.currentUser.displayName || this.currentUser.email, email: this.currentUser.email },
                        ...sampleMembers
                    ];
                    
                    console.log('[TeamAssignment] Using sample members:', this.teamMembers);
                    this.updateMemberDropdown();
                    return;
                }
                
                // Fetch member details
                const memberPromises = memberIds.map(async (memberId) => {
                    try {
                        const userDoc = await db
                            .collection('users')
                            .doc(memberId)
                            .get();
                        
                        if (userDoc.exists) {
                            const userData = userDoc.data();
                            console.log('[TeamAssignment] Fetched member:', userData);
                            return { id: memberId, ...userData };
                        }
                        console.log('[TeamAssignment] User not found for ID:', memberId);
                        return { id: memberId, displayName: 'Unknown User', email: 'unknown@example.com' };
                    } catch (error) {
                        console.error('[TeamAssignment] Error fetching member:', error);
                        return { id: memberId, displayName: 'Unknown User', email: 'unknown@example.com' };
                    }
                });

                this.teamMembers = await Promise.all(memberPromises);
                console.log('[TeamAssignment] All team members loaded:', this.teamMembers);
                this.updateMemberDropdown();
            } else {
                console.error('[TeamAssignment] Team document does not exist');
            }
        } catch (error) {
            console.error('[TeamAssignment] Error fetching team members:', error);
        }
    }

    updateMemberDropdown() {
        const memberSelect = document.getElementById('memberSelect');
        if (!memberSelect) {
            console.error('[TeamAssignment] Member select element not found!');
            return;
        }

        console.log('[TeamAssignment] Updating member dropdown...');
        console.log('[TeamAssignment] Selected team:', this.selectedTeam);
        console.log('[TeamAssignment] Team members:', this.teamMembers);

        memberSelect.innerHTML = '<option value="">Select a member...</option>';
        
        // Force enable the dropdown if we have a selected team and members
        const shouldEnable = this.selectedTeam && this.teamMembers.length > 0;
        memberSelect.disabled = !shouldEnable;
        
        console.log('[TeamAssignment] Dropdown enabled:', shouldEnable);

        if (this.selectedTeam && this.teamMembers.length > 0) {
            this.teamMembers.forEach(member => {
                const option = document.createElement('option');
                option.value = member.id;
                option.textContent = member.displayName || member.name || member.email || 'Unknown User';
                memberSelect.appendChild(option);
                console.log('[TeamAssignment] Added member option:', option.textContent);
            });
            
            // Double-check that dropdown is enabled
            if (memberSelect.disabled) {
                console.warn('[TeamAssignment] Dropdown still disabled, forcing enable...');
                memberSelect.disabled = false;
            }
        } else {
            console.log('[TeamAssignment] No team selected or no members found');
            // If no team selected, ensure dropdown is disabled
            memberSelect.disabled = true;
        }
    }

    setupEventListeners() {
        console.log('[TeamAssignment] Setting up event listeners...');
        
        // Team assignment checkbox
        const assignToTeamCheckbox = document.getElementById('assignToTeam');
        if (assignToTeamCheckbox) {
            console.log('[TeamAssignment] Found assignToTeam checkbox');
            assignToTeamCheckbox.addEventListener('change', (e) => {
                console.log('[TeamAssignment] Assign to team checkbox changed:', e.target.checked);
                const teamOptions = document.getElementById('teamAssignmentOptions');
                if (teamOptions) {
                    teamOptions.style.display = e.target.checked ? 'block' : 'none';
                }
                
                const taskTypeInput = document.getElementById('taskType');
                if (taskTypeInput) {
                    taskTypeInput.value = e.target.checked ? 'team' : 'individual';
                }
            });
        } else {
            console.error('[TeamAssignment] assignToTeam checkbox not found!');
        }

        // Team selection
        const teamSelect = document.getElementById('teamSelect');
        if (teamSelect) {
            console.log('[TeamAssignment] Found teamSelect dropdown');
            teamSelect.addEventListener('change', (e) => {
                console.log('[TeamAssignment] Team selection changed to:', e.target.value);
                this.onTeamChange(e.target.value);
            });
        } else {
            console.error('[TeamAssignment] teamSelect dropdown not found!');
        }

        // Member selection
        const memberSelect = document.getElementById('memberSelect');
        if (memberSelect) {
            console.log('[TeamAssignment] Found memberSelect dropdown');
            memberSelect.addEventListener('change', (e) => {
                console.log('[TeamAssignment] Member selection changed to:', e.target.value);
            });
        } else {
            console.error('[TeamAssignment] memberSelect dropdown not found!');
        }
    }

    getTeamAssignmentData() {
        const assignToTeam = document.getElementById('assignToTeam');
        const teamSelect = document.getElementById('teamSelect');
        const memberSelect = document.getElementById('memberSelect');

        if (!assignToTeam || !assignToTeam.checked) {
            return null;
        }

        const teamId = teamSelect?.value;
        const memberId = memberSelect?.value;

        if (!teamId || !memberId) {
            return null;
        }

        const selectedTeam = this.userTeams.find(t => t.id === teamId);
        const selectedMember = this.teamMembers.find(m => m.id === memberId);

        return {
            assignedToTeam: true,
            teamId: teamId,
            teamName: selectedTeam?.name || 'Unknown Team',
            memberId: memberId,
            memberName: selectedMember?.name || selectedMember?.email || 'Unknown Member',
            assignedAt: new Date(),
            assignedBy: this.currentUser.uid
        };
    }

    resetTeamAssignment() {
        const assignToTeam = document.getElementById('assignToTeam');
        const teamSelect = document.getElementById('teamSelect');
        const memberSelect = document.getElementById('memberSelect');
        const taskType = document.getElementById('taskType');

        if (assignToTeam) assignToTeam.checked = false;
        if (teamSelect) teamSelect.value = '';
        if (memberSelect) {
            memberSelect.value = '';
            memberSelect.disabled = true;
        }
        if (taskType) taskType.value = 'individual';

        const teamOptions = document.getElementById('teamAssignmentOptions');
        if (teamOptions) {
            teamOptions.style.display = 'none';
        }
    }

    async createSampleTeamsForTesting() {
        try {
            console.log('[TeamAssignment] Creating sample teams for testing...');
            
            const db = window.firebase.firestore();
            const sampleTeams = [
                {
                    name: 'Development Team',
                    description: 'Core development team for the main project',
                    type: 'project',
                    code: 'DEV001'
                },
                {
                    name: 'Marketing Team',
                    description: 'Digital marketing and content creation',
                    type: 'department',
                    code: 'MKT002'
                }
            ];

            for (const teamData of sampleTeams) {
                // Check if team already exists
                const existingTeam = await db
                    .collection('teams')
                    .where('code', '==', teamData.code)
                    .get();

                if (existingTeam.empty) {
                    const newTeamData = {
                        ...teamData,
                        createdBy: this.currentUser.uid,
                        members: [this.currentUser.uid],
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    };

                    await db
                        .collection('teams')
                        .add(newTeamData);

                    console.log(`[TeamAssignment] Created sample team: ${teamData.name}`);
                }
            }

            console.log('[TeamAssignment] Sample teams created successfully');
            
            // Refresh team list
            await this.checkAdminStatus();
            
        } catch (error) {
            console.error('[TeamAssignment] Error creating sample teams:', error);
        }
    }

    // Manual test function to enable and populate member dropdown
    async testMemberDropdown() {
        console.log('[TeamAssignment] Testing member dropdown...');
        
        // Check if we have teams
        if (this.userTeams.length === 0) {
            console.log('[TeamAssignment] No teams available, creating sample teams...');
            await this.createSampleTeamsForTesting();
        }
        
        // Select the first team if available
        if (this.userTeams.length > 0) {
            const firstTeam = this.userTeams[0];
            console.log('[TeamAssignment] Selecting first team for testing:', firstTeam.name);
            
            // Set the team select value
            const teamSelect = document.getElementById('teamSelect');
            if (teamSelect) {
                teamSelect.value = firstTeam.id;
                // Trigger the change event
                teamSelect.dispatchEvent(new Event('change'));
            }
        }
    }
}

// Initialize team assignment manager
let teamAssignmentManager;

// Task manager initialization
function initTaskManager() {
    console.log('[Task] Initializing task manager');
    
    // Initialize team assignment manager
    teamAssignmentManager = new TeamAssignmentManager();
    
    // Set up real-time listener for tasks
    setupTaskListener();
    
    // Initialize task filters
    initTaskFilters();
    
    // Initial premium banner display check
    updatePremiumBannerDisplay();
    
    // Check and show premium banner if user is premium
    setTimeout(() => {
        console.log('[Task] Fallback check - window.userRole:', window.userRole);
        updatePremiumBannerDisplay();
    }, 1000);

    // Additional fallback check with longer delay
    setTimeout(() => {
        console.log('[Task] Extended fallback check - window.userRole:', window.userRole);
        updatePremiumBannerDisplay();
    }, 3000);
}

// --- Firestore Real-Time Listener for Tasks ---
function setupTaskListener() {
    if (taskState.unsubscribeListener) {
        // Remove previous listener if any
        taskState.unsubscribeListener();
        taskState.unsubscribeListener = null;
    }
    const user = window.firebaseAuth.currentUser;
    if (!user) {
        console.warn('[Task] No authenticated user for Firestore listener');
        return;
    }
    const db = window.firebase.firestore();
    // Listen to tasks for the current user
    taskState.unsubscribeListener = db.collection('tasks')
        .where('userId', '==', user.uid)
        .onSnapshot(
            (snapshot) => {
                const tasks = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    // Convert Firestore Timestamps to JS Dates
                    const parseDate = (d) => {
                        if (!d) return null;
                        if (d instanceof Date) return d;
                        if (d.toDate) return d.toDate();
                        return new Date(d);
                    };
                    tasks.push({
                        id: doc.id,
                        ...data,
                        dueDate: parseDate(data.dueDate),
                        createdAt: parseDate(data.createdAt),
                        updatedAt: parseDate(data.updatedAt),
                    });
                });
                taskState.tasks = tasks;
                console.log('[Task] Tasks loaded from Firestore:', tasks.length);
                
                // Update task summary with the loaded tasks
                updateTaskSummary(tasks);
                
                renderTasks(currentTaskPage || 1);
            },
            (error) => {
                console.error('[Task] Firestore listener error:', error);
                showToast('Error loading tasks. Please refresh.', 'danger');
            }
        );
}

// --- Pagination State ---
let currentTaskPage = 1;
const TASKS_PER_PAGE = 8; // Show 8 records per page for professional appearance

// --- Task Selection for Calendar Integration ---
function makeTaskSelectable(taskElement, taskId) {
    // Add click event listener to make task selectable for calendar integration
    taskElement.addEventListener('click', function(e) {
        // Don't trigger selection if clicking on interactive elements
        if (e.target.closest('.task-complete-checkbox') || 
            e.target.closest('.dropdown') || 
            e.target.closest('.edit-task-btn') || 
            e.target.closest('.delete-task-btn') ||
            e.target.closest('.edit-task-form')) {
            return;
        }
        
        // Remove selection from all other tasks
        document.querySelectorAll('.task-item').forEach(item => {
            item.classList.remove('selected');
            item.style.borderColor = '';
            item.style.boxShadow = '';
        });
        
        // Select this task
        taskElement.classList.add('selected');
        taskElement.style.borderColor = '#4285f4';
        taskElement.style.boxShadow = '0 0 0 0.2rem rgba(66, 133, 244, 0.25)';
        
        // Update task state
        taskState.selectedTaskId = taskId;
        
        // Update sync button state
        if (window.updateSyncButton) {
            window.updateSyncButton();
        }
        
        // Update selected task display
        if (window.updateSelectedTaskDisplay) {
            window.updateSelectedTaskDisplay();
        }
        
        console.log('[Task] Selected task for calendar integration:', taskId);
    });
    
    // Add visual feedback on hover
    taskElement.style.cursor = 'pointer';
    taskElement.title = 'Click to select for Google Calendar sync';
}

// --- Enhanced Render Tasks with Pagination ---
function renderTasks(page = 1) {
    currentTaskPage = page;
    const tasksContainer = document.getElementById('taskList');
    if (!tasksContainer) return;
    tasksContainer.innerHTML = '';

    // Defensive: flatten and sort tasks
    let tasks = Array.isArray(taskState.tasks) ? [...taskState.tasks] : [];
    // Only show tasks with a valid title (filter out test/empty tasks)
    tasks = tasks.filter(t => t.title && t.title.trim() !== '');
    if (!tasks.length) {
        tasksContainer.innerHTML = '<div class="text-muted text-center p-4">No tasks found.</div>';
        renderPagination(0, page, TASKS_PER_PAGE);
        return;
    }
    // Apply filters before sorting and pagination
    const { priority, status, inputMethod, date } = taskState.filters;
    if (priority) {
        tasks = tasks.filter(t => (t.priority || '').toLowerCase() === priority.toLowerCase());
    }
    if (status) {
        // Map 'pending' to 'in-progress' for filter
        if (status === 'pending') {
            tasks = tasks.filter(t => (t.status || '').toLowerCase() === 'in-progress');
        } else {
            tasks = tasks.filter(t => (t.status || '').toLowerCase() === status.toLowerCase());
        }
    }
    if (inputMethod) {
        tasks = tasks.filter(t => (t.inputMethod || '').toLowerCase() === inputMethod.toLowerCase());
    }
    if (date) {
        const now = new Date();
        tasks = tasks.filter(t => {
            const due = t.dueDate instanceof Date ? t.dueDate : (t.dueDate ? new Date(t.dueDate) : null);
            if (!due) return false;
            if (date === 'today') {
                return due.toDateString() === now.toDateString();
            } else if (date === 'week') {
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - now.getDay());
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                return due >= weekStart && due <= weekEnd;
            } else if (date === 'month') {
                return due.getMonth() === now.getMonth() && due.getFullYear() === now.getFullYear();
            }
            return true;
        });
    }
    if (taskState.filters.title) {
        const search = taskState.filters.title.trim().toLowerCase();
        if (search) {
            tasks = tasks.filter(t => (t.title || '').toLowerCase().includes(search));
        }
    }
    if (taskState.filters.recurring) {
        if (taskState.filters.recurring === 'recurring') {
            tasks = tasks.filter(t => t.recurring === true);
        } else if (taskState.filters.recurring === 'non-recurring') {
            tasks = tasks.filter(t => !t.recurring);
        }
    }
    // Sort by last updated (updatedAt) descending, then by createdAt descending
    tasks.sort((a, b) => {
        const aUpdated = a.updatedAt instanceof Date ? a.updatedAt.getTime() : (a.updatedAt ? new Date(a.updatedAt).getTime() : 0);
        const bUpdated = b.updatedAt instanceof Date ? b.updatedAt.getTime() : (b.updatedAt ? new Date(b.updatedAt).getTime() : 0);
        if (bUpdated !== aUpdated) return bUpdated - aUpdated;
        const aCreated = a.createdAt instanceof Date ? a.createdAt.getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const bCreated = b.createdAt instanceof Date ? b.createdAt.getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return bCreated - aCreated;
    });
    // Pagination
    const totalTasks = tasks.length;
    const totalPages = Math.ceil(totalTasks / TASKS_PER_PAGE);
    const startIdx = (page - 1) * TASKS_PER_PAGE;
    const endIdx = startIdx + TASKS_PER_PAGE;
    const pagedTasks = tasks.slice(startIdx, endIdx);
    // Group by date (if dueDate exists)
    const tasksByDate = {};
    pagedTasks.forEach(task => {
        let dateKey = 'No Date';
        if (task.dueDate instanceof Date && !isNaN(task.dueDate)) {
            dateKey = task.dueDate.toISOString().slice(0, 10);
        } else if (task.createdAt instanceof Date && !isNaN(task.createdAt)) {
            dateKey = task.createdAt.toISOString().slice(0, 10);
        }
        if (!tasksByDate[dateKey]) tasksByDate[dateKey] = [];
        tasksByDate[dateKey].push(task);
    });
    const sortedDates = Object.keys(tasksByDate).sort((a, b) => new Date(b) - new Date(a));
    // Render each group
    sortedDates.forEach(dateKey => {
        const dateGroup = tasksByDate[dateKey];
        const taskList = document.createElement('div');
        taskList.className = 'task-list';
        dateGroup.forEach(task => {
            const isEditing = window.editingTaskId === task.id;
            const taskElement = document.createElement('div');
            taskElement.className = `task-item card mb-2 border-start-4 border-${getPriorityColor(task.priority)}`;
            // Add selection styling if this task is selected
            if (taskState.selectedTaskId === task.id) {
                taskElement.classList.add('selected-task');
                taskElement.style.borderColor = '#007bff';
                taskElement.style.boxShadow = '0 0 0 0.2rem rgba(0, 123, 255, 0.25)';
            }
            const checked = task.status === 'completed' ? 'checked' : '';
            const strikeClass = task.status === 'completed' ? 'text-decoration-line-through text-muted' : '';
            const lastUpdated = task.updatedAt ? formatDate(task.updatedAt) : formatDate(task.createdAt);
            if (isEditing) {
                // Edit mode
                taskElement.innerHTML = `
                <div class="card-body">
                    <form class="edit-task-form">
                        <div class="mb-2">
                            <input type="text" class="form-control mb-2" name="title" value="${escapeHtml(task.title || '')}" required placeholder="Title">
                            <textarea class="form-control mb-2" name="description" rows="2" placeholder="Description">${escapeHtml(task.description || '')}</textarea>
                            <input type="datetime-local" class="form-control mb-2" name="dueDate" value="${task.dueDate ? new Date(task.dueDate).toISOString().slice(0,16) : ''}" required>
                            <select class="form-select mb-2" name="priority">
                                <option value="high" ${task.priority==='high'?'selected':''}>High</option>
                                <option value="medium" ${task.priority==='medium'?'selected':''}>Medium</option>
                                <option value="low" ${task.priority==='low'?'selected':''}>Low</option>
                            </select>
                            <select class="form-select mb-2" name="status">
                                <option value="pending" ${task.status==='pending'?'selected':''}>Pending</option>
                                <option value="in-progress" ${task.status==='in-progress'?'selected':''}>In Progress</option>
                                <option value="completed" ${task.status==='completed'?'selected':''}>Completed</option>
                                <option value="not-started" ${task.status==='not-started'?'selected':''}>Not Started</option>
                            </select>
                            <select class="form-select mb-2" name="inputMethod">
                                <option value="manual" ${task.inputMethod==='manual'?'selected':''}>Manual</option>
                                <option value="voice" ${task.inputMethod==='voice'?'selected':''}>Voice</option>
                            </select>
                            <input type="text" class="form-control mb-2" name="tags" value="${Array.isArray(task.tags)?task.tags.join(', '):''}" placeholder="Tags (comma separated)">
                        </div>
                        <div class="d-flex justify-content-end gap-2">
                            <button type="button" class="btn btn-secondary btn-sm cancel-edit">Cancel</button>
                            <button type="submit" class="btn btn-primary btn-sm save-edit">Save</button>
                        </div>
                    </form>
                </div>`;
            } else {
                // View mode
                taskElement.innerHTML = `
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                                                        <div class="d-flex align-items-center">
                                    <input type="checkbox" class="form-check-input me-2 task-complete-checkbox" data-task-id="${task.id}" ${checked} title="Mark as completed">
                                    <div class="${strikeClass}">
                                        <h5 class="card-title task-title" id="taskTitle_${task.id}">
                                            ${escapeHtml(task.title || '(No Title)')}
                                        </h5>
                                        ${task.recurring ? `<div class="badge bg-warning text-dark ms-2">
                                            <i class="bi bi-arrow-repeat me-1"></i>
                                            ${getRecurringBadgeText(task)}
                                        </div>` : ''}
                                <p class="card-text mb-1">
                                    <small class="text-muted" id="taskCreatedDate_${task.id}">Created: ${formatDate(task.createdAt) || ''}</small><br>
                                    <small class="text-muted" id="taskDueDate_${task.id}">Due: ${formatDate(task.dueDate) || ''}</small><br>
                                    <small class="text-muted" id="taskUpdatedDate_${task.id}">Last Updated: ${lastUpdated}</small><br>
                                    <small class="text-muted" id="taskInputMethod_${task.id}">Input: ${task.inputMethod === 'voice' ? '🎤 Voice' : '✏️ Manual'}</small>
                                    ${task.recurring && task.recurrence ? `<br><small class="text-muted" id="taskRecurrence_${task.id}">🔄 Repeats: ${formatRecurrenceInfo(task.recurrence)}</small>` : ''}
                                </p>
                                <p class="card-text mb-1">
                                    ${escapeHtml(task.description || '')}
                                </p>
                                <div class="mb-1">
                                    ${(Array.isArray(task.tags) && task.tags.length > 0) ? task.tags.map(tag => `<span class='badge bg-secondary me-1'>${escapeHtml(tag)}</span>`).join('') : ''}
                                </div>
                            </div>
                        </div>
                        <div class="dropdown">
                            <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" id="taskMenuButton_${task.id}" data-bs-toggle="dropdown" aria-expanded="false">
                                <i class="bi bi-three-dots"></i>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="taskMenuButton_${task.id}">
                                <li><a class="dropdown-item edit-task-btn" href="#" data-task-id="${task.id}">Edit Task</a></li>
                                <li><a class="dropdown-item delete-task-btn" href="#" data-task-id="${task.id}" data-task-title="${escapeHtml(task.title || '')}">Delete Task</a></li>
                            </ul>
                        </div>
                    </div>
                    <div class="mt-2">
                        <span class="badge rounded-pill text-bg-${getPriorityColor(task.priority)} me-2">${escapeHtml(task.priority || 'none')}</span>
                        <span class="badge rounded-pill text-bg-info">${task.status === 'completed' ? '✔️ Completed' : (task.status === 'in-progress' ? '⏳ In Progress' : (task.status || 'Pending'))}</span>
                        ${task.recurring && window.userRole === 'premium' ? `<button class="btn btn-sm btn-outline-primary ms-2 sync-recurring-task-btn" data-task-id="${task.id}" data-task-title="${escapeHtml(task.title || '')}" title="Sync to Google Calendar">
                            <i class="bi bi-calendar-plus me-1"></i>Sync to Calendar
                        </button>` : ''}
                    </div>
                </div>`;
            }
            taskList.appendChild(taskElement);
        });
        tasksContainer.appendChild(taskList);
    });
    // Add event listeners for checkboxes
    setTimeout(() => {
        // Add task selection handlers
        document.querySelectorAll('.task-item').forEach(taskElement => {
            const taskId = taskElement.querySelector('.task-complete-checkbox')?.getAttribute('data-task-id');
            if (taskId) {
                // Make task selectable for calendar integration
                makeTaskSelectable(taskElement, taskId);
                
                // Update calendar integration UI if this task is already selected
                if (taskState.selectedTaskId === taskId) {
                    taskElement.classList.add('selected');
                    taskElement.style.borderColor = '#4285f4';
                    taskElement.style.boxShadow = '0 0 0 0.2rem rgba(66, 133, 244, 0.25)';
                }
            }
        });
        
        document.querySelectorAll('.task-complete-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', async function() {
                const taskId = this.getAttribute('data-task-id');
                const isChecked = this.checked;
                // Find the task in state
                const task = taskState.tasks.find(t => t.id === taskId);
                if (!task) return;
                // Only update if status is different
                if (isChecked && task.status !== 'completed') {
                    await updateTask(taskId, { 
                        status: 'completed', 
                        completedAt: new Date(),
                        updatedAt: new Date() 
                    });
                    // Handle recurring task completion
                    if (task.recurring) {
                        await handleRecurringTaskCompletion(task);
                    }
                } else if (!isChecked && task.status === 'completed') {
                    // Optionally revert to in-progress or pending
                    await updateTask(taskId, { 
                        status: 'in-progress', 
                        completedAt: null,
                        updatedAt: new Date() 
                    });
                }
                // UI will update via Firestore listener, but force re-render for instant feedback
                renderTasks(currentTaskPage);
            });
        }, 0);
        // Edit button handler
        document.querySelectorAll('.edit-task-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                window.editingTaskId = this.getAttribute('data-task-id');
                renderTasks(currentTaskPage);
            });
        });
        // Save/Cancel handlers for edit form
        document.querySelectorAll('.edit-task-form').forEach(form => {
            form.addEventListener('submit', async function(e) {
                e.preventDefault();
                const parentCard = form.closest('.task-item');
                const taskId = window.editingTaskId;
                const formData = new FormData(form);
                const newStatus = formData.get('status');
                
                // Get current task to check previous status
                const currentTask = taskState.tasks.find(t => t.id === taskId);
                const previousStatus = currentTask ? currentTask.status : null;
                
                const updatedTask = {
                    title: formData.get('title').trim(),
                    description: formData.get('description').trim(),
                    dueDate: new Date(formData.get('dueDate')),
                    priority: formData.get('priority'),
                    status: newStatus,
                    inputMethod: formData.get('inputMethod'),
                    tags: formData.get('tags').split(',').map(t => t.trim()).filter(Boolean),
                    updatedAt: new Date()
                };
                
                // Handle completedAt field based on status change
                if (newStatus === 'completed' && previousStatus !== 'completed') {
                    // Marking as completed - set completedAt
                    updatedTask.completedAt = new Date();
                } else if (newStatus !== 'completed' && previousStatus === 'completed') {
                    // Changing from completed to another status - clear completedAt
                    updatedTask.completedAt = null;
                }
                
                await updateTask(taskId, updatedTask);
                window.editingTaskId = null;
                renderTasks(currentTaskPage);
            });
            form.querySelector('.cancel-edit').addEventListener('click', function() {
                window.editingTaskId = null;
                renderTasks(currentTaskPage);
            });
        });
        // Delete button handler (event delegation)
        document.querySelectorAll('.delete-task-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                const taskId = this.getAttribute('data-task-id');
                const taskTitle = this.getAttribute('data-task-title');
                confirmDeleteTask(taskId, taskTitle);
            });
        });
        
        // Sync recurring task to Google Calendar button handler
        document.querySelectorAll('.sync-recurring-task-btn').forEach(btn => {
            btn.addEventListener('click', async function(e) {
                e.preventDefault();
                const taskId = this.getAttribute('data-task-id');
                const taskTitle = this.getAttribute('data-task-title');
                await syncRecurringTaskToGoogleCalendar(taskId, taskTitle);
            });
        });
    }, 0);
    renderPagination(totalTasks, page, TASKS_PER_PAGE);
}

// Update task in Firestore
async function updateTask(taskId, updatedTask) {
    try {
        if (!window.firebaseDb || !window.firebaseAuth) throw new Error('Firebase not initialized');
        const user = window.firebaseAuth.currentUser;
        if (!user) throw new Error('User not authenticated');
        const taskRef = window.firebaseDb.collection('tasks').doc(taskId);
        await taskRef.update(updatedTask);
        showToast('Task updated successfully!', 'success');
    } catch (err) {
        showToast('Failed to update task.', 'danger');
        console.error('[Task] Update error:', err);
    }
}

// --- Pagination Controls ---
function renderPagination(total, currentPage = 1, pageSize = 10) {
    const container = document.getElementById('taskPagination');
    if (!container) return;
    container.innerHTML = '';
    const totalPages = Math.ceil(total / pageSize);
    if (totalPages <= 1) return;
    const nav = document.createElement('nav');
    nav.setAttribute('aria-label', 'Task pagination');
    const ul = document.createElement('ul');
    ul.className = 'pagination justify-content-center';
    // Previous button
    const prevLi = document.createElement('li');
    prevLi.className = 'page-item' + (currentPage === 1 ? ' disabled' : '');
    const prevA = document.createElement('a');
    prevA.className = 'page-link';
    prevA.href = '#';
    prevA.innerHTML = '&laquo;';
    prevA.onclick = (e) => { e.preventDefault(); if (currentPage > 1) renderTasks(currentPage - 1); };
    prevLi.appendChild(prevA);
    ul.appendChild(prevLi);
    // Add First button
    const firstLi = document.createElement('li');
    firstLi.className = 'page-item' + (currentPage === 1 ? ' disabled' : '');
    const firstA = document.createElement('a');
    firstA.className = 'page-link';
    firstA.href = '#';
    firstA.innerHTML = '&laquo;&laquo;';
    firstA.title = 'First Page';
    firstA.onclick = (e) => { e.preventDefault(); if (currentPage !== 1) renderTasks(1); };
    firstLi.appendChild(firstA);
    ul.insertBefore(firstLi, ul.firstChild);
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        const li = document.createElement('li');
        li.className = 'page-item' + (i === currentPage ? ' active' : '');
        const a = document.createElement('a');
        a.className = 'page-link';
        a.href = '#';
        a.textContent = i;
        a.onclick = (e) => { e.preventDefault(); renderTasks(i); };
        li.appendChild(a);
        ul.appendChild(li);
    }
    // Next button
    const nextLi = document.createElement('li');
    nextLi.className = 'page-item' + (currentPage === totalPages ? ' disabled' : '');
    const nextA = document.createElement('a');
    nextA.className = 'page-link';
    nextA.href = '#';
    nextA.innerHTML = '&raquo;';
    nextA.onclick = (e) => { e.preventDefault(); if (currentPage < totalPages) renderTasks(currentPage + 1); };
    nextLi.appendChild(nextA);
    ul.appendChild(nextLi);
    // Add Last button
    const lastLi = document.createElement('li');
    lastLi.className = 'page-item' + (currentPage === totalPages ? ' disabled' : '');
    const lastA = document.createElement('a');
    lastA.className = 'page-link';
    lastA.href = '#';
    lastA.innerHTML = '&raquo;&raquo;';
    lastA.title = 'Last Page';
    lastA.onclick = (e) => { e.preventDefault(); if (currentPage !== totalPages) renderTasks(totalPages); };
    lastLi.appendChild(lastA);
    ul.appendChild(lastLi);
    nav.appendChild(ul);
    container.appendChild(nav);
}

// --- Analytics: Task Summary ---
function updateTaskSummary(tasks = taskState.tasks) {
    console.log('[Task Page] Updating task summary with', tasks.length, 'tasks');
    
    // Filter out tasks without titles (empty/test tasks) - same as dashboard
    const validTasks = tasks.filter(t => t.title && t.title.trim() !== '');
    console.log('[Task Page] Valid tasks (with titles):', validTasks.length);
    
    // Debug: Log a few sample tasks to see their structure
    if (validTasks.length > 0) {
        console.log('[Task Page] Sample task structure:', {
            id: validTasks[0].id,
            title: validTasks[0].title,
            status: validTasks[0].status,
            priority: validTasks[0].priority
        });
    }
    
    const total = validTasks.length;
    const completed = validTasks.filter(t => t.status === 'completed').length;
    const inProgress = validTasks.filter(t => t.status === 'in-progress').length;
    const overdue = validTasks.filter(t => {
        if (!t.dueDate || t.status === 'completed') return false;
        const due = t.dueDate instanceof Date ? t.dueDate : new Date(t.dueDate);
        return due < new Date();
    }).length;
    const pending = validTasks.filter(t => t.status === 'pending').length;
    
    // Upcoming: tasks due in the future and not completed
    const now = new Date();
    const upcoming = validTasks.filter(t => {
        if (!t.dueDate || t.status === 'completed') return false;
        const due = t.dueDate instanceof Date ? t.dueDate : new Date(t.dueDate);
        return due > now;
    }).length;
    
    console.log('[Task Page] Task summary calculated:', {
        total,
        completed,
        inProgress,
        overdue,
        pending,
        upcoming
    });
    
    // Calculate high priority tasks
    const highPriority = validTasks.filter(t => t.priority === 'high').length;
    
    console.log('[Task Page] Task summary calculated:', {
        total,
        completed,
        pending,
        highPriority
    });
    
    // Update DOM elements - only update the elements that actually exist in the HTML
    const totalTasksEl = document.getElementById('totalTasks');
    const completedTasksEl = document.getElementById('completedTasks');
    const pendingTasksEl = document.getElementById('pendingTasks');
    const highPriorityTasksEl = document.getElementById('highPriorityTasks');
    
    if (totalTasksEl) {
        totalTasksEl.textContent = total;
        console.log('[Task Page] Updated totalTasks element:', total);
    } else {
        console.warn('[Task Page] totalTasks element not found');
    }
    
    if (completedTasksEl) {
        completedTasksEl.textContent = completed;
        console.log('[Task Page] Updated completedTasks element:', completed);
    } else {
        console.warn('[Task Page] completedTasks element not found');
    }
    
    if (pendingTasksEl) {
        pendingTasksEl.textContent = pending;
        console.log('[Task Page] Updated pendingTasks element:', pending);
    } else {
        console.warn('[Task Page] pendingTasks element not found');
    }
    
    if (highPriorityTasksEl) {
        highPriorityTasksEl.textContent = highPriority;
        console.log('[Task Page] Updated highPriorityTasks element:', highPriority);
    } else {
        console.warn('[Task Page] highPriorityTasks element not found');
    }
}

// --- Analytics: Priority Distribution Chart ---
function updatePriorityChart(tasks = taskState.tasks) {
    const ctx = document.getElementById('priorityChart');
    if (!ctx) return;
    const counts = { high: 0, medium: 0, low: 0 };
    tasks.forEach(t => {
        if (t.priority) counts[t.priority.toLowerCase()] = (counts[t.priority.toLowerCase()] || 0) + 1;
    });
    if (taskState.priorityChart) taskState.priorityChart.destroy();
    taskState.priorityChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['High', 'Medium', 'Low'],
            datasets: [{
                data: [counts.high, counts.medium, counts.low],
                backgroundColor: ['#dc3545', '#ffc107', '#198754'],
            }]
        },
        options: { responsive: true, plugins: { legend: { display: true } } }
    });
}

// --- Analytics: Progression Chart ---
function updateProgressionChart(tasks = taskState.tasks) {
    const ctx = document.getElementById('progressionChart');
    if (!ctx) return;
    // Filter tasks to only those created in the current week (Sunday to Saturday)
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Sunday
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    const weeklyTasks = tasks.filter(t => {
        const d = t.createdAt instanceof Date ? t.createdAt : new Date(t.createdAt);
        return d >= weekStart && d <= weekEnd;
    });
    // Group by day of week (Sun-Sat)
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dateCounts = {};
    for (let i = 0; i < 7; i++) {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + i);
        const key = day.toISOString().slice(0, 10);
        dateCounts[key] = 0;
    }
    weeklyTasks.forEach(t => {
        const d = t.createdAt instanceof Date ? t.createdAt : new Date(t.createdAt);
        const key = d.toISOString().slice(0, 10);
        if (dateCounts.hasOwnProperty(key)) {
            dateCounts[key]++;
        }
    });
    const sortedKeys = Object.keys(dateCounts);
    const labels = sortedKeys.map(k => {
        const d = new Date(k);
        return days[d.getDay()];
    });
    const data = sortedKeys.map(k => dateCounts[k]);
    if (taskState.progressionChart) taskState.progressionChart.destroy();
    // Create gradient
    const chartCtx = ctx.getContext('2d');
    const gradient = chartCtx.createLinearGradient(0, 0, 0, ctx.height || 300);
    gradient.addColorStop(0, 'rgba(99,102,241,0.4)');
    gradient.addColorStop(1, 'rgba(99,102,241,0.05)');
    taskState.progressionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Tasks Created (This Week)',
                data,
                fill: true,
                borderColor: '#6366f1',
                backgroundColor: gradient,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#6366f1',
                pointRadius: 6,
                pointHoverRadius: 9,
                pointStyle: 'circle',
                tension: 0.45, // Smooth curve
                borderWidth: 3,
                shadowOffsetX: 0,
                shadowOffsetY: 4,
                shadowBlur: 10,
                shadowColor: 'rgba(99,102,241,0.2)'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#6366f1',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#fff',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#6366f1', font: { weight: 'bold' } }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(99,102,241,0.1)' },
                    ticks: { color: '#6366f1', font: { weight: 'bold' } }
                }
            },
            elements: {
                line: {
                    borderJoinStyle: 'round',
                    borderCapStyle: 'round',
                }
            }
        }
    });
}

// --- Analytics: Recent Activity ---
function updateRecentActivity(tasks = taskState.tasks) {
    const container = document.getElementById('recentActivityList');
    if (!container) return;
    container.innerHTML = '';
    // Sort by updatedAt or createdAt desc
    const sorted = [...tasks].sort((a, b) => {
        const aTime = a.updatedAt?.getTime?.() || a.createdAt?.getTime?.() || 0;
        const bTime = b.updatedAt?.getTime?.() || b.createdAt?.getTime?.() || 0;
        return bTime - aTime;
    });
    sorted.slice(0, 5).forEach(task => {
        const statusBadge = `<span class="badge rounded-pill text-bg-${getPriorityColor(task.priority)} me-1">${escapeHtml(task.priority || 'none')}</span>`;
        const completed = task.status === 'completed';
        const statusText = completed ? 'Completed' : (task.status === 'in-progress' ? 'In Progress' : (task.status || 'Pending'));
        const statusIcon = completed ? 'bi-check-circle-fill text-success' : (task.status === 'in-progress' ? 'bi-hourglass-split text-warning' : 'bi-circle text-secondary');
        const tags = (Array.isArray(task.tags) && task.tags.length > 0) ? task.tags.map(tag => `<span class='badge bg-secondary me-1'>${escapeHtml(tag)}</span>`).join('') : '';
        const description = task.description ? `<div class='small text-muted mt-1'>${escapeHtml(task.description)}</div>` : '';
        el = document.createElement('div');
        el.className = 'activity-item list-group-item px-2 py-2';
        el.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <span class="fw-semibold">${escapeHtml(task.title || '(No Title)')}</span>
                    ${statusBadge}
                    <span class="badge rounded-pill bg-light text-dark border ms-1"><i class="bi ${statusIcon}"></i> ${statusText}</span>
                    ${tags}
                    ${description}
                </div>
                <div class="text-end">
                    <div class="small text-muted">${formatDate(task.updatedAt || task.createdAt)}</div>
                </div>
            </div>
        `;
        container.appendChild(el);
    });
    if (container.innerHTML === '') {
        container.innerHTML = '<div class="text-muted text-center">No recent activity.</div>';
    }
}

// --- Analytics: User Insights Chart ---
function updateUserInsightsChart(tasks = taskState.tasks) {
    const ctx = document.getElementById('userInsightsChart');
    if (!ctx) return;
    // Example: Show input method distribution (voice vs manual)
    const counts = { voice: 0, manual: 0 };
    tasks.forEach(t => {
        const method = (t.inputMethod || 'manual').toLowerCase();
        if (method === 'voice') counts.voice++;
        else counts.manual++;
    });
    if (taskState.userInsightsChart) taskState.userInsightsChart.destroy();
    taskState.userInsightsChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Voice', 'Manual'],
            datasets: [{
                data: [counts.voice, counts.manual],
                backgroundColor: ['#6366f1', '#0dcaf0'],
            }]
        },
        options: { responsive: true, plugins: { legend: { display: true } } }
    });
}

// --- Patch Firestore Listener to Update All Analytics ---
const originalRenderTasks = renderTasks;
renderTasks = function(page = 1) {
    originalRenderTasks(page);
    updateTaskSummary();
    updatePriorityChart();
    updateProgressionChart();
    updateRecentActivity();
    updateUserInsightsChart();
};

// --- Task Filters Initialization ---
function initTaskFilters() {
    const prioritySelect = document.getElementById('filterPriority');
    const statusSelect = document.getElementById('filterStatus');
    const inputMethodSelect = document.getElementById('filterInputMethod');
    const dateSelect = document.getElementById('filterDate');
    const titleInput = document.getElementById('filterTitle');
    const recurringSelect = document.getElementById('filterRecurring');

    if (prioritySelect) {
        prioritySelect.addEventListener('change', (e) => {
            taskState.filters.priority = e.target.value;
            renderTasks(1);
        });
    }
    if (statusSelect) {
        statusSelect.addEventListener('change', (e) => {
            taskState.filters.status = e.target.value;
            renderTasks(1);
        });
    }
    if (inputMethodSelect) {
        inputMethodSelect.addEventListener('change', (e) => {
            taskState.filters.inputMethod = e.target.value;
            renderTasks(1);
        });
    }
    if (dateSelect) {
        dateSelect.addEventListener('change', (e) => {
            taskState.filters.date = e.target.value;
            renderTasks(1);
        });
    }
    if (titleInput) {
        titleInput.addEventListener('input', (e) => {
            taskState.filters.title = e.target.value;
            renderTasks(1);
        });
    }
    if (recurringSelect) {
        recurringSelect.addEventListener('change', (e) => {
            taskState.filters.recurring = e.target.value;
            renderTasks(1);
        });
    }
}

// --- Add Task to Firestore ---
async function addTask() {
    try {
        console.log('[Task] Starting addTask function');
        
        // Defensive: check Firebase globals
        if (!window.firebaseDb || !window.firebaseAuth) {
            throw new Error('Firebase is not initialized');
        }
        const user = window.firebaseAuth.currentUser;
        if (!user) {
            throw new Error('User not authenticated');
        }
        
        console.log('[Task] User authenticated:', user.email);
        
        // Gather form data
        const title = document.getElementById('taskTitle').value.trim();
        const description = document.getElementById('taskDescription').value.trim();
        const dueDate = document.getElementById('taskDueDate').value;
        const priority = document.getElementById('taskPriority').value;
        const status = document.getElementById('taskStatus').value;
        const inputMethod = document.getElementById('taskInputMethod').value;
        const tags = document.getElementById('taskTags').value.trim();
        
        console.log('[Task] Form data gathered:', { title, priority, dueDate, status, inputMethod });
        
        // Defensive: check required fields
        if (!title || !priority || !dueDate || !status || !inputMethod) {
            throw new Error('Missing required fields');
        }
        
        // Prepare Firestore doc
        const taskDoc = {
            userId: user.uid,
            title,
            description,
            dueDate: new Date(dueDate),
            priority,
            status,
            tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
            inputMethod,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        console.log('[Task] Basic task doc prepared:', taskDoc);

        // Add recurring task data if user is premium and recurring is enabled
        if (window.recurringTaskManager && window.userRole === 'premium') {
            console.log('[Task] User is premium, checking for recurring data');
            const recurrenceData = window.recurringTaskManager.getRecurrenceData();
            if (recurrenceData) {
                Object.assign(taskDoc, recurrenceData);
                console.log('[Recurring] Adding recurring task data:', recurrenceData);
            } else {
                console.log('[Task] No recurring data found or recurring not enabled');
            }
        } else {
            console.log('[Task] User is not premium or recurring manager not available');
        }

        // Add team assignment data if user is premium and team assignment is enabled
        if (teamAssignmentManager && window.userRole === 'premium') {
            console.log('[Task] User is premium, checking for team assignment data');
            const teamAssignmentData = teamAssignmentManager.getTeamAssignmentData();
            if (teamAssignmentData) {
                taskDoc.teamAssignment = teamAssignmentData;
                console.log('[Team] Adding team assignment data:', teamAssignmentData);
            } else {
                console.log('[Task] No team assignment data found or team assignment not enabled');
            }
        } else {
            console.log('[Task] User is not premium or team assignment manager not available');
        }

        console.log('[Task] Final task doc:', taskDoc);

            // Add to Firestore
    console.log('[Task] Adding to Firestore...');
    const docRef = await window.firebaseDb.collection('tasks').add(taskDoc);
    console.log('[Task] Successfully added to Firestore with ID:', docRef.id);
    
    // Add the task ID to the task document for Google Calendar integration
    const taskWithId = { ...taskDoc, id: docRef.id };
    
    // For non-recurring tasks, create Google Calendar event automatically if user is premium
    if (!taskWithId.recurring && window.userRole === 'premium' && window.gcal && window.gcal.isSignedIn && window.gcal.isSignedIn()) {
        try {
            console.log('[Task] Creating Google Calendar event for non-recurring task:', taskWithId.title);
            await window.gcal.createEvent(taskWithId);
            console.log('[Task] Google Calendar event created successfully');
            showToast('Task and Google Calendar event created!', 'success');
        } catch (calendarError) {
            console.error('[Task] Error creating Google Calendar event:', calendarError);
            // Don't fail the task creation, just show a warning
            showToast('Task created successfully, but Google Calendar event failed: ' + calendarError.message, 'warning');
        }
    } else if (taskWithId.recurring) {
        console.log('[Task] Recurring task created - manual sync to Google Calendar required');
        showToast('Recurring task created! Use the sync button to add to Google Calendar.', 'success');
    } else {
        console.log('[Task] Google Calendar integration not available or user not premium');
        showToast('Task created successfully!', 'success');
    }
    
    // Reset recurring form after successful add
    if (window.recurringTaskManager) {
        window.recurringTaskManager.resetRecurringForm();
    }
    
    // Reset team assignment form after successful add
    if (teamAssignmentManager) {
        teamAssignmentManager.resetTeamAssignment();
    }
        
        // Reset lastInputMethod to manual after add
        lastInputMethod = 'manual';
        // Reset input method dropdown to manual after successful add
        const inputMethodSelect = document.getElementById('taskInputMethod');
        if (inputMethodSelect) {
            inputMethodSelect.value = 'manual';
            inputMethodSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        console.log('[Task] Task added successfully');
        
    } catch (error) {
        console.error('[Task] Error in addTask:', error);
        throw error; // Re-throw to be handled by the calling function
    }
}

// --- Sync Recurring Task to Google Calendar ---
async function syncRecurringTaskToGoogleCalendar(taskId, taskTitle) {
    try {
        console.log('[Task] Syncing recurring task to Google Calendar:', taskId, taskTitle);
        
        // Check if user is premium
        if (window.userRole !== 'premium') {
            console.log('[Task] User is not premium, showing warning');
            showToast('Premium subscription required to sync recurring tasks to Google Calendar.', 'warning');
            return;
        }
        
        // Check if Google Calendar is connected
        if (!window.gcal || !window.gcal.isSignedIn || !window.gcal.isSignedIn()) {
            console.log('[Task] Google Calendar not connected, showing warning');
            showToast('Please connect to Google Calendar first.', 'warning');
            return;
        }
        
        // Find the task in the current state
        const task = taskState.tasks.find(t => t.id === taskId);
        if (!task) {
            console.log('[Task] Task not found in state:', taskId);
            showToast('Task not found.', 'error');
            return;
        }
        
        // Check if it's a recurring task
        if (!task.recurring || !task.recurrence) {
            console.log('[Task] Task is not recurring:', task);
            showToast('This task is not a recurring task.', 'warning');
            return;
        }
        
        console.log('[Task] Task found and is recurring, showing modal');
        
        // Show sync duration modal
        showSyncDurationModal(task, taskTitle);
        
    } catch (error) {
        console.error('[Task] Error preparing sync modal:', error);
        const errorMessage = error.message || 'Failed to prepare sync';
        showToast(`Sync failed: ${errorMessage}`, 'danger');
    }
}

// Show sync duration selection modal
function showSyncDurationModal(task, taskTitle) {
    console.log('[Task] Showing sync duration modal for task:', taskTitle);
    
    // Create modal HTML dynamically to avoid any conflicts
    const modalHTML = `
        <div class="modal fade" id="syncDurationModal" tabindex="-1" aria-labelledby="syncDurationModalLabel" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="syncDurationModalLabel">
                            <i class="bi bi-calendar-plus me-2"></i>Sync Recurring Task to Google Calendar
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label fw-semibold">Task:</label>
                            <p class="text-muted mb-2" id="syncTaskTitle">${escapeHtml(taskTitle)}</p>
                            <label class="form-label fw-semibold">Recurrence:</label>
                            <p class="text-muted mb-3" id="syncTaskRecurrence">${formatRecurrenceInfo(task.recurrence)}</p>
                        </div>
                        <div class="mb-3">
                            <label for="syncDuration" class="form-label fw-semibold">Sync Duration:</label>
                            <select class="form-select" id="syncDuration" required>
                                <option value="">Select duration</option>
                                <option value="1week">1 Week</option>
                                <option value="1month" selected>1 Month</option>
                            </select>
                            <div class="form-text">
                                <i class="bi bi-info-circle me-1"></i>
                                Calendar events will be created at the recurring time for the selected duration.
                            </div>
                        </div>
                        <div class="alert alert-info">
                            <small>
                                <i class="bi bi-clock me-1"></i>
                                <strong>Note:</strong> Events will be created starting from the next occurrence at the recurring time, not the due date.
                            </small>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" id="confirmSyncBtn">
                            <i class="bi bi-calendar-plus me-2"></i>Sync to Calendar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove any existing modal
    const existingModal = document.getElementById('syncDurationModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add new modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Store task data for sync confirmation
    window.syncTaskData = { task, taskTitle };
    console.log('[Task] Stored sync task data:', window.syncTaskData);
    
    // Get the new modal element
    const modalElement = document.getElementById('syncDurationModal');
    console.log('[Task] Modal element created:', !!modalElement);
    
    if (!modalElement) {
        console.error('[Task] Modal element not found after creation!');
        showToast('Modal creation failed. Please refresh the page.', 'error');
        return;
    }
    
    try {
        // Add event listener to confirm button
        const confirmSyncBtn = document.getElementById('confirmSyncBtn');
        if (confirmSyncBtn) {
            confirmSyncBtn.addEventListener('click', async function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('[Task] Confirm sync button clicked');
                await confirmSyncToGoogleCalendar();
            });
        }
        
        // Create and show modal
        const modal = new bootstrap.Modal(modalElement, {
            backdrop: 'static',
            keyboard: false
        });
        
        // Add event listener for modal hidden event to clean up
        modalElement.addEventListener('hidden.bs.modal', function() {
            console.log('[Task] Modal hidden, cleaning up');
            modalElement.remove();
        });
        
        modal.show();
        console.log('[Task] Modal shown successfully');
        
    } catch (error) {
        console.error('[Task] Error showing modal:', error);
        showToast('Error showing sync options. Please refresh the page.', 'error');
        // Clean up on error
        if (modalElement) {
            modalElement.remove();
        }
    }
}

// Handle sync confirmation
async function confirmSyncToGoogleCalendar() {
    try {
        console.log('[Task] Confirm sync called');
        
        // Prevent multiple calls
        if (window.syncInProgress) {
            console.log('[Task] Sync already in progress, ignoring duplicate call');
            return;
        }
        window.syncInProgress = true;
        
        const syncTaskData = window.syncTaskData;
        if (!syncTaskData) {
            console.log('[Task] No sync task data found');
            showToast('No task data found for sync.', 'error');
            window.syncInProgress = false;
            return;
        }
        
        const { task, taskTitle } = syncTaskData;
        const syncDurationElement = document.getElementById('syncDuration');
        
        if (!syncDurationElement) {
            console.log('[Task] Sync duration element not found');
            showToast('Sync duration element not found.', 'error');
            window.syncInProgress = false;
            return;
        }
        
        const syncDuration = syncDurationElement.value;
        console.log('[Task] Sync duration selected:', syncDuration);
        
        if (!syncDuration) {
            console.log('[Task] No sync duration selected');
            showToast('Please select a sync duration.', 'warning');
            window.syncInProgress = false;
            return;
        }
        
        // Close modal first
        const modalElement = document.getElementById('syncDurationModal');
        if (modalElement) {
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) {
                modal.hide();
                console.log('[Task] Modal closed');
            } else {
                // Fallback: remove modal directly if Bootstrap instance not found
                modalElement.remove();
                console.log('[Task] Modal removed directly');
            }
        }
        
        // Show loading message
        showToast('Syncing recurring task to Google Calendar...', 'info');
        
        console.log('[Task] Calling gcal.createRecurringEvent with duration:', syncDuration);
        
        // Check if Google Calendar is available and initialize if needed
        if (!window.gcal) {
            throw new Error('Google Calendar integration not available');
        }
        
        // Initialize Google Calendar API if not already initialized
        if (typeof window.gcal.initGoogleCalendarApi === 'function') {
            try {
                console.log('[Task] Initializing Google Calendar API...');
                await window.gcal.initGoogleCalendarApi();
                console.log('[Task] Google Calendar API initialized successfully');
            } catch (initError) {
                console.error('[Task] Failed to initialize Google Calendar API:', initError);
                throw new Error('Failed to initialize Google Calendar: ' + initError.message);
            }
        }
        
        // Check if user is signed in to Google Calendar
        if (!window.gcal.isSignedIn()) {
            console.log('[Task] User not signed in to Google Calendar, attempting to sign in...');
            try {
                await window.gcal.signIn();
                console.log('[Task] Successfully signed in to Google Calendar');
            } catch (signInError) {
                console.error('[Task] Failed to sign in to Google Calendar:', signInError);
                throw new Error('Please sign in to Google Calendar to sync tasks');
            }
        }
        
        // Check if createRecurringEvent function exists
        if (!window.gcal.createRecurringEvent) {
            throw new Error('Google Calendar recurring event function not available');
        }
        
        // Create the recurring event in Google Calendar with duration
        await window.gcal.createRecurringEvent(task, syncDuration);
        
        console.log('[Task] Recurring task synced to Google Calendar successfully');
        showToast(`"${taskTitle}" synced to Google Calendar for ${syncDuration === '1week' ? '1 week' : '1 month'}!`, 'success');
        
        // Clear stored data
        window.syncTaskData = null;
        
    } catch (error) {
        console.error('[Task] Error syncing recurring task to Google Calendar:', error);
        const errorMessage = error.message || 'Failed to sync to Google Calendar';
        showToast(`Sync failed: ${errorMessage}`, 'danger');
    } finally {
        // Always reset the sync progress flag
        window.syncInProgress = false;
    }
}

// Make function available globally
window.confirmSyncToGoogleCalendar = confirmSyncToGoogleCalendar;

// --- Delete Task with Confirmation ---
async function confirmDeleteTask(taskId, taskTitle) {
    if (!taskId) return;
    const confirmed = window.confirm(`Are you sure you want to delete the task: "${taskTitle || ''}"? This action cannot be undone.`);
    if (!confirmed) return;
    try {
        if (!window.firebaseDb || !window.firebaseAuth) throw new Error('Firebase not initialized');
        const user = window.firebaseAuth.currentUser;
        if (!user) throw new Error('User not authenticated');
        await window.firebaseDb.collection('tasks').doc(taskId).delete();
        showToast('Task deleted successfully!', 'success');
    } catch (err) {
        showToast('Failed to delete task.', 'danger');
        console.error('[Task] Delete error:', err);
    }
}

// Voice Command Integration (window.startVoiceCommand/stopVoiceCommand)
window.startVoiceCommand = function(callbacks) {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    if (callbacks && typeof callbacks.onError === 'function') callbacks.onError();
    alert('Voice recognition is not supported in this browser. Please use Chrome or Edge.');
    return;
  }
  if (window._voiceRecognition && window._voiceRecognition.active) {
    // Already listening
    return;
  }
  // Always create a new instance to avoid stuck state
  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  var recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  recognition.continuous = false;
  window._voiceRecognition = { recognition, active: true };
  var feedback = document.getElementById('voiceFeedback');
  var voiceText = document.getElementById('voiceText');
  var voiceTranscript = document.getElementById('voiceTranscript');
  if (feedback) {
    feedback.classList.remove('d-none');
    if (voiceText) voiceText.textContent = 'Listening...';
    if (voiceTranscript) voiceTranscript.textContent = '';
  }
  var didRecognize = false;
  recognition.onresult = function(event) {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      transcript += event.results[i][0].transcript;
    }
    if (voiceTranscript) voiceTranscript.textContent = transcript;
    if (event.results[event.results.length - 1].isFinal) {
      didRecognize = true;
      if (voiceText) voiceText.textContent = 'Heard: ' + transcript;
      setTimeout(function() {
        if (feedback) feedback.classList.add('d-none');
      }, 1200);
      if (window.handleVoiceCommand && typeof window.handleVoiceCommand === 'function') {
        window.handleVoiceCommand(transcript);
      } else {
        var titleInput = document.getElementById('taskTitle');
        if (titleInput) titleInput.value = transcript;
      }
      if (callbacks && typeof callbacks.onStop === 'function') callbacks.onStop();
      window._voiceRecognition.active = false;
    }
  };
  recognition.onerror = function(event) {
    if (feedback) feedback.classList.add('d-none');
    if (voiceTranscript) voiceTranscript.textContent = '';
    if (callbacks && typeof callbacks.onError === 'function') callbacks.onError();
    window._voiceRecognition.active = false;
    let msg = 'Voice recognition error: ' + (event.error || 'Unknown error');
    if (event.error === 'no-speech' || event.error === 'audio-capture') {
      msg = 'No speech detected. Please try again and speak clearly into your microphone.';
    }
    alert(msg);
  };
  recognition.onend = function() {
    if (feedback) feedback.classList.add('d-none');
    if (voiceTranscript) voiceTranscript.textContent = '';
    if (!didRecognize) {
      if (callbacks && typeof callbacks.onError === 'function') callbacks.onError();
      // Only alert if not manually stopped
      if (!window._voiceRecognition._stoppedByUser) {
        alert('No voice detected. Please try again and speak clearly into your microphone.');
      }
    } else {
      if (callbacks && typeof callbacks.onStop === 'function') callbacks.onStop();
    }
    window._voiceRecognition.active = false;
    window._voiceRecognition._stoppedByUser = false;
  };
  try {
    recognition.start();
  } catch (e) {
    if (feedback) feedback.classList.add('d-none');
    if (voiceTranscript) voiceTranscript.textContent = '';
    if (callbacks && typeof callbacks.onError === 'function') callbacks.onError();
    alert('Could not start voice recognition. Please try again.');
    window._voiceRecognition.active = false;
  }
};
window.stopVoiceCommand = function() {
  if (window._voiceRecognition && window._voiceRecognition.recognition) {
    window._voiceRecognition._stoppedByUser = true;
    window._voiceRecognition.recognition.stop();
    window._voiceRecognition.active = false;
    var feedback = document.getElementById('voiceFeedback');
    if (feedback) feedback.classList.add('d-none');
    var voiceTranscript = document.getElementById('voiceTranscript');
    if (voiceTranscript) voiceTranscript.textContent = '';
  }
};

// Google Calendar Integration for Premium Users
function initCalendarIntegration() {
    console.log('[Task] initCalendarIntegration TEST VERSION CALLED');
}

// Debug functions for troubleshooting
window.forceShowCalendar = function() {
    console.log('[Debug] Force showing calendar section');
    const calendarSection = document.getElementById('calendarIntegrationSection');
    if (calendarSection) {
        calendarSection.classList.remove('d-none');
        calendarSection.style.display = 'block';
        calendarSection.style.visibility = 'visible';
        calendarSection.style.opacity = '1';
        calendarSection.style.filter = 'none';
        calendarSection.style.pointerEvents = 'auto';
        
        console.log('[Debug] Calendar section forced to show');
        console.log('[Debug] Calendar section display style:', calendarSection.style.display);
        console.log('[Debug] Calendar section visibility:', calendarSection.style.visibility);
        
        // Remove any existing debug indicators
        const existingDebug = calendarSection.querySelector('.alert-info');
        if (existingDebug) {
            existingDebug.remove();
        }
        
        // Add a success indicator for premium users
        const successIndicator = document.createElement('div');
        successIndicator.className = 'alert alert-success mt-2';
        successIndicator.innerHTML = '<i class="bi bi-check-circle me-2"></i>Premium Calendar Integration Enabled';
        calendarSection.appendChild(successIndicator);
        
    } else {
        console.error('[Debug] Calendar section not found');
    }
};

// Debug function to force enable sync button
window.forceEnableSyncButton = function() {
    console.log('[Debug] Force enabling sync button');
    const syncBtn = document.getElementById('sync-to-google-calendar');
    if (syncBtn) {
        syncBtn.disabled = false;
        syncBtn.classList.remove('opacity-50');
        syncBtn.style.pointerEvents = 'auto';
        syncBtn.title = 'Sync selected task to Google Calendar (Forced Enabled)';
        console.log('[Debug] Sync button force enabled');
    } else {
        console.error('[Debug] Sync button not found');
    }
};

// Debug function to show calendar section
window.showCalendarSection = function() {
    console.log('[Debug] Force showing calendar section');
    const calendarSection = document.getElementById('calendarIntegrationSection');
    if (calendarSection) {
        calendarSection.classList.remove('d-none');
        calendarSection.style.display = 'block';
        calendarSection.style.visibility = 'visible';
        calendarSection.style.opacity = '1';
        calendarSection.style.filter = 'none';
        calendarSection.style.pointerEvents = 'auto';
        console.log('[Debug] Calendar section shown');
    } else {
        console.error('[Debug] Calendar section not found');
    }
};

// Debug function to check current state
window.checkSyncButtonState = function() {
    console.log('[Debug] === Checking Sync Button State ===');
    const syncBtn = document.getElementById('sync-to-google-calendar');
    console.log('[Debug] Sync button found:', !!syncBtn);
    
    if (syncBtn) {
        console.log('[Debug] Button disabled:', syncBtn.disabled);
        console.log('[Debug] Button text:', syncBtn.innerHTML);
        console.log('[Debug] Button classes:', syncBtn.className);
    }
    
    let isConnected = false;
    try {
        isConnected = window.gcal && window.gcal.isSignedIn && window.gcal.isSignedIn();
    } catch (error) {
        console.log('[Debug] Error checking connection:', error);
    }
    
    const hasTaskSelected = !!taskState.selectedTaskId;
    
    console.log('[Debug] Connection status:', isConnected);
    console.log('[Debug] Task selected:', hasTaskSelected);
    console.log('[Debug] Selected task ID:', taskState.selectedTaskId);
    console.log('[Debug] Task state exists:', !!taskState);
    console.log('[Debug] Google Calendar exists:', !!window.gcal);
    
    // Test the logic
    const shouldBeDisabled = !isConnected || !hasTaskSelected;
    console.log('[Debug] Should button be disabled?', shouldBeDisabled);
    console.log('[Debug] Current button disabled state:', syncBtn?.disabled);
    
    console.log('[Debug] === End Check ===');
};

window.forceEnableSyncButton = function() {
    console.log('[Debug] Forcing sync button to be enabled');
    const syncBtn = document.getElementById('sync-to-google-calendar');
    if (syncBtn) {
        syncBtn.disabled = false;
        syncBtn.classList.remove('opacity-50');
        syncBtn.title = 'Sync button manually enabled for testing';
        syncBtn.style.pointerEvents = 'auto';
        console.log('[Debug] Sync button manually enabled');
    } else {
        console.log('[Debug] Sync button not found');
    }
};

window.updateSyncButton = function() {
    console.log('[Debug] Updating sync button state');
    if (window.updateSyncButtonState) {
        window.updateSyncButtonState();
    } else {
        console.log('[Debug] updateSyncButtonState function not found');
    }
};

// Function to select a test task
window.selectTestTask = function(taskId) {
    console.log('[Debug] Selecting test task:', taskId);
    taskState.selectedTaskId = taskId;
    
    // Update the display
    const selectedTaskDisplay = document.getElementById('selected-task-display');
    if (selectedTaskDisplay) {
        selectedTaskDisplay.innerHTML = `
            <span class="badge bg-success">
                <i class="bi bi-check-circle me-1"></i>Test Task Selected (${taskId})
            </span>
        `;
    }
    
    // Update sync button
    if (window.updateSyncButtonState) {
        window.updateSyncButtonState();
    }
    
    console.log('[Debug] Test task selected');
};

// Function to simulate Google sign-in
window.simulateGoogleSignIn = function() {
    console.log('[Debug] Simulating Google sign-in');
    
    // Store fake token in localStorage
    localStorage.setItem('googleAccessToken', 'fake-token-for-testing');
    localStorage.setItem('googleTokenExpiry', Date.now() + 3600000); // 1 hour from now
    
    // Update connection status
    const statusDiv = document.getElementById('connection-status');
    if (statusDiv) {
        statusDiv.innerHTML = '<span class="badge bg-success">Connected</span>';
    }
    
    // Update sync button
    if (window.updateSyncButtonState) {
        window.updateSyncButtonState();
    }
    
    console.log('[Debug] Google sign-in simulated');
};

// Export task counting logic for consistency across pages
function calculateTaskCounts(tasks) {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const inProgress = tasks.filter(t => t.status === 'in-progress').length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    
    // Calculate overdue tasks
    const overdue = tasks.filter(t => {
        if (!t.dueDate || t.status === 'completed') return false;
        const due = t.dueDate instanceof Date ? t.dueDate : new Date(t.dueDate);
        return due < new Date();
    }).length;
    
    // Calculate upcoming tasks
    const now = new Date();
    const upcoming = tasks.filter(t => {
        if (!t.dueDate || t.status === 'completed') return false;
        const due = t.dueDate instanceof Date ? t.dueDate : new Date(t.dueDate);
        return due > now;
    }).length;
    
    // Calculate voice notes
    const voiceNotes = tasks.filter(t => (t.inputMethod || '').toLowerCase().trim() === 'voice').length;
    
    // Calculate completion rate
    const completionRate = total ? Math.round((completed / total) * 100) : 0;
    
    return {
        total,
        completed,
        inProgress,
        pending,
        overdue,
        upcoming,
        voiceNotes,
        completionRate
    };
}

// Expose the counting function globally for dashboard use
window.calculateTaskCounts = calculateTaskCounts;

// Manual refresh function for task page
async function refreshTaskPage() {
    console.log('[Task] Manual refresh requested');
    try {
        const db = window.firebaseDb;
        const auth = window.firebaseAuth;
        
        if (!db || !auth.currentUser) {
            console.error('[Task] Firebase not initialized or user not authenticated');
            return;
        }
        
        // Show loading state
        const refreshBtn = document.getElementById('refreshTaskBtn');
        if (refreshBtn) {
            const originalText = refreshBtn.innerHTML;
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Refreshing...';
            refreshBtn.disabled = true;
        }
        
        // Fetch all tasks for the current user
        const snapshot = await db.collection('tasks')
            .where('userId', '==', auth.currentUser.uid)
            .orderBy('createdAt', 'desc')
            .get();
            
        const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('[Task] Manual refresh fetched', tasks.length, 'tasks');
        
        // Update task state
        taskState.tasks = tasks;
        
        // Update all UI components
        updateTaskSummary(tasks);
        updatePriorityChart(tasks);
        updateProgressionChart(tasks);
        updateRecentActivity(tasks);
        renderTasks(1); // Refresh task list
        
        console.log('[Task] Manual refresh completed');
        
        // Show success message
        showToast('Task page refreshed successfully!', 'success');
        
    } catch (error) {
        console.error('[Task] Manual refresh error:', error);
        showToast('Error refreshing task page. Please try again.', 'error');
    } finally {
        // Restore button state
        const refreshBtn = document.getElementById('refreshTaskBtn');
        if (refreshBtn) {
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt me-1"></i>Refresh';
            refreshBtn.disabled = false;
        }
    }
}

// Expose refresh function globally
window.refreshTaskPage = refreshTaskPage;

// Debug function to check task counting
function debugTaskCounts() {
    console.log('[Task] === DEBUG TASK COUNTS ===');
    
    const tasks = taskState.tasks;
    console.log('[Task] Total tasks in state:', tasks.length);
    
    // Log all tasks with their status and due dates
    tasks.forEach((task, index) => {
        console.log(`[Task] Task ${index + 1}:`, {
            id: task.id,
            title: task.title,
            status: task.status,
            dueDate: task.dueDate,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt
        });
    });
    
    // Calculate counts manually
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const inProgress = tasks.filter(t => t.status === 'in-progress').length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    
    const overdue = tasks.filter(t => {
        if (!t.dueDate || t.status === 'completed') return false;
        const due = t.dueDate instanceof Date ? t.dueDate : new Date(t.dueDate);
        return due < new Date();
    }).length;
    
    const now = new Date();
    const upcoming = tasks.filter(t => {
        if (!t.dueDate || t.status === 'completed') return false;
        const due = t.dueDate instanceof Date ? t.dueDate : new Date(t.dueDate);
        return due > now;
    }).length;
    
    console.log('[Task] Calculated counts:', {
        total,
        completed,
        inProgress,
        pending,
        overdue,
        upcoming
    });
    
    // Check DOM elements
    const elements = {
        totalTasks: document.getElementById('totalTasks'),
        completedTasks: document.getElementById('completedTasks'),
        inProgressTasks: document.getElementById('inProgressTasks'),
        overdueTasks: document.getElementById('overdueTasks'),
        pendingTasks: document.getElementById('pendingTasks'),
        upcomingTasks: document.getElementById('upcomingTasks')
    };
    
    console.log('[Task] DOM Elements found:', {
        totalTasks: !!elements.totalTasks,
        completedTasks: !!elements.completedTasks,
        inProgressTasks: !!elements.inProgressTasks,
        overdueTasks: !!elements.overdueTasks,
        pendingTasks: !!elements.pendingTasks,
        upcomingTasks: !!elements.upcomingTasks
    });
    
    console.log('[Task] Current DOM values:', {
        totalTasks: elements.totalTasks?.textContent,
        completedTasks: elements.completedTasks?.textContent,
        inProgressTasks: elements.inProgressTasks?.textContent,
        overdueTasks: elements.overdueTasks?.textContent,
        pendingTasks: elements.pendingTasks?.textContent,
        upcomingTasks: elements.upcomingTasks?.textContent
    });
    
    console.log('[Task] === END DEBUG ===');
}

// Expose debug function globally
window.debugTaskCounts = debugTaskCounts;

// Expose renderTasks and taskState globally for external access
window.renderTasks = renderTasks;
window.taskState = taskState;

// Test function to manually set premium user role
window.testPremiumUser = function() {
    console.log('[Task] Testing premium user role...');
    window.userRole = 'premium';
    document.body.classList.add('premium-user');
    
    // Update premium banner display
    updatePremiumBannerDisplay();
    
    console.log('[Task] Premium user role set for testing');
};

// Function to update premium banner display based on user role
function updatePremiumBannerDisplay() {
    console.log('[Task] Updating premium banner display...');
    console.log('[Task] Current user role:', window.userRole);
    
    const premiumBanner = document.getElementById('premiumBanner');
    
    if (window.userRole === 'premium') {
        console.log('[Task] User is premium, showing banner...');
        
        // Show premium banner
        if (premiumBanner) {
            premiumBanner.classList.remove('d-none');
            premiumBanner.style.display = 'block';
            premiumBanner.style.visibility = 'visible';
            premiumBanner.style.opacity = '1';
            premiumBanner.style.position = 'absolute';
            premiumBanner.style.top = '80px';
            premiumBanner.style.left = '0';
            premiumBanner.style.right = '0';
            premiumBanner.style.zIndex = '1000';
            premiumBanner.style.width = '100%';
            premiumBanner.style.minHeight = '32px';
            console.log('[Task] Premium banner shown');
        } else {
            console.error('[Task] Premium banner element not found');
        }
        
        // Add premium class to body
        document.body.classList.add('premium-user');
        
        // Remove premium overlays for premium users
        removePremiumOverlays();
        
    } else {
        console.log('[Task] User is not premium, hiding banner...');
        
        // Hide premium banner with multiple approaches to ensure it's hidden
        if (premiumBanner) {
            // Remove all showing classes
            premiumBanner.classList.add('d-none');
            premiumBanner.classList.remove('premium-user');
            
            // Set multiple hiding styles
            premiumBanner.style.display = 'none !important';
            premiumBanner.style.visibility = 'hidden !important';
            premiumBanner.style.opacity = '0 !important';
            premiumBanner.style.position = 'absolute';
            premiumBanner.style.top = '-100px';
            premiumBanner.style.left = '-100px';
            premiumBanner.style.width = '0';
            premiumBanner.style.height = '0';
            premiumBanner.style.overflow = 'hidden';
            premiumBanner.style.pointerEvents = 'none';
            
            // Force hide with setTimeout to override any CSS
            setTimeout(() => {
                premiumBanner.style.display = 'none';
                premiumBanner.style.visibility = 'hidden';
                premiumBanner.style.opacity = '0';
            }, 0);
            
            console.log('[Task] Premium banner hidden with multiple approaches');
        }
        
        // Remove premium class from body
        document.body.classList.remove('premium-user');
    }
}

// Function to remove premium overlays for premium users
function removePremiumOverlays() {
    console.log('[Task] Removing premium overlays for premium user...');
    
    // Remove all premium overlays
    const premiumOverlays = document.querySelectorAll('.premium-overlay');
    premiumOverlays.forEach(overlay => {
        overlay.style.display = 'none';
        overlay.style.visibility = 'hidden';
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';
        console.log('[Task] Removed premium overlay:', overlay.id || 'unnamed');
    });
    
    // Enable premium feature cards
    const premiumFeatureCards = document.querySelectorAll('.premium-feature-card');
    premiumFeatureCards.forEach(card => {
        card.classList.remove('free-user');
        card.classList.add('premium-user');
        console.log('[Task] Enabled premium feature card:', card.id || 'unnamed');
    });
    
    // Remove upgrade buttons from premium features
    const upgradeButtons = document.querySelectorAll('.upgrade-btn');
    upgradeButtons.forEach(button => {
        if (button.closest('.premium-feature-card')) {
            button.style.display = 'none';
            console.log('[Task] Hidden upgrade button in premium feature card');
        }
    });
}

// Force show premium banner function
window.forceShowPremiumBanner = function() {
    console.log('[Task] Force showing premium banner...');
    const premiumBanner = document.getElementById('premiumBanner');
    if (premiumBanner) {
        // Remove all hiding classes and styles
        premiumBanner.classList.remove('d-none');
        premiumBanner.style.display = 'block';
        premiumBanner.style.visibility = 'visible';
        premiumBanner.style.opacity = '1';
        premiumBanner.style.position = 'absolute';
        premiumBanner.style.top = '80px';
        premiumBanner.style.left = '0';
        premiumBanner.style.right = '0';
        premiumBanner.style.zIndex = '1000';
        premiumBanner.style.width = '100%';
        premiumBanner.style.minHeight = '28px';
        premiumBanner.style.background = 'linear-gradient(135deg, #ffd700 0%, #ffed4e 50%, #ffd700 100%)';
        premiumBanner.style.borderBottom = '1px solid rgba(255, 215, 0, 0.3)';
        premiumBanner.style.boxShadow = '0 4px 20px rgba(255, 215, 0, 0.2)';
        
        console.log('[Task] Premium banner force shown with inline styles');
        console.log('[Task] Banner display style:', premiumBanner.style.display);
        console.log('[Task] Banner visibility:', premiumBanner.style.visibility);
        console.log('[Task] Banner position:', premiumBanner.style.position);
        console.log('[Task] Banner top:', premiumBanner.style.top);
    } else {
        console.error('[Task] Premium banner element not found');
    }
};

// Debug function to check premium banner state
window.debugPremiumBanner = function() {
    console.log('[Task] === Premium Banner Debug ===');
    console.log('[Task] User role:', window.userRole);
    console.log('[Task] Body has premium-user class:', document.body.classList.contains('premium-user'));
    
    const premiumBanner = document.getElementById('premiumBanner');
    if (premiumBanner) {
        console.log('[Task] Premium banner found in DOM');
        console.log('[Task] Banner display style:', premiumBanner.style.display);
        console.log('[Task] Banner visibility:', premiumBanner.style.visibility);
        console.log('[Task] Banner opacity:', premiumBanner.style.opacity);
        console.log('[Task] Banner classes:', premiumBanner.className);
        console.log('[Task] Banner has d-none class:', premiumBanner.classList.contains('d-none'));
        console.log('[Task] Banner computed display:', window.getComputedStyle(premiumBanner).display);
        console.log('[Task] Banner computed visibility:', window.getComputedStyle(premiumBanner).visibility);
        console.log('[Task] Banner position:', window.getComputedStyle(premiumBanner).position);
        console.log('[Task] Banner top:', window.getComputedStyle(premiumBanner).top);
        console.log('[Task] Banner z-index:', window.getComputedStyle(premiumBanner).zIndex);
    } else {
        console.error('[Task] Premium banner element not found in DOM');
    }
    
    console.log('[Task] === End Debug ===');
};

// Telegram Integration Functions
async function initializeTelegramIntegration() {
    console.log('[Task] Initializing Telegram integration...');
    
    try {
        // Wait for Firebase to be initialized
        if (window.firebaseInitialized) {
            await window.firebaseInitialized;
        }
        
        // Check if user is authenticated
        const user = firebase.auth().currentUser;
        if (!user) {
            console.log('[Task] No authenticated user, showing Telegram integration with overlay');
            showTelegramIntegration(); // Show the section but with overlay
            return;
        }
        
        // Check if user is premium from Firebase
        const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
        const isPremium = userDoc.exists && userDoc.data().role === 'premium';
        
        if (!isPremium) {
            console.log('[Task] User is not premium, showing Telegram integration with overlay');
            showTelegramIntegration(); // Show the section but with overlay
            return;
        }
        
        console.log('[Task] User is premium, showing Telegram integration');
        
        // Show Telegram integration for premium users
        showTelegramIntegration();
        
        // Add event listeners with retry mechanism
        let retryCount = 0;
        const maxRetries = 3;
        
        const setupListenersWithRetry = () => {
            const linkBtn = document.getElementById('link-telegram-account');
            if (!linkBtn && retryCount < maxRetries) {
                retryCount++;
                console.log(`[Task] Retrying event listener setup (${retryCount}/${maxRetries})...`);
                setTimeout(setupListenersWithRetry, 500);
                return;
            }
            setupTelegramEventListeners();
        };
        
        setupListenersWithRetry();
        
        // Check current Telegram status
        setTimeout(() => {
            checkTelegramStatus();
        }, 1000);
        
    } catch (error) {
        console.error('[Task] Error initializing Telegram integration:', error);
        showTelegramIntegration(); // Show the section but with overlay on error
    }
}

function setupTelegramEventListeners() {
    console.log('[Task] Setting up Telegram event listeners...');
    
    const linkTelegramBtn = document.getElementById('link-telegram-account');
    const telegramHelpBtn = document.getElementById('telegram-help-btn');
    const checkStatusBtn = document.getElementById('check-telegram-status');
    
    console.log('[Task] Found buttons:', {
        linkBtn: !!linkTelegramBtn,
        helpBtn: !!telegramHelpBtn,
        checkBtn: !!checkStatusBtn
    });
    
    if (linkTelegramBtn) {
        // Remove existing listeners to prevent duplicates
        linkTelegramBtn.removeEventListener('click', handleLinkTelegram);
        linkTelegramBtn.addEventListener('click', handleLinkTelegram);
        console.log('[Task] Link button event listener added');
    } else {
        console.error('[Task] Link button not found!');
    }
    
    if (telegramHelpBtn) {
        // Remove existing listeners to prevent duplicates
        telegramHelpBtn.removeEventListener('click', handleTelegramHelp);
        telegramHelpBtn.addEventListener('click', handleTelegramHelp);
        console.log('[Task] Help button event listener added');
    } else {
        console.error('[Task] Help button not found!');
    }
    
    if (checkStatusBtn) {
        // Remove existing listeners to prevent duplicates
        checkStatusBtn.removeEventListener('click', handleCheckTelegramStatus);
        checkStatusBtn.addEventListener('click', handleCheckTelegramStatus);
        console.log('[Task] Check status button event listener added');
    } else {
        console.error('[Task] Check status button not found!');
    }
}

function showTelegramIntegration() {
    const telegramSection = document.getElementById('telegramIntegrationSection');
    if (telegramSection) {
        telegramSection.classList.remove('d-none');
        telegramSection.style.display = 'block';
        telegramSection.style.visibility = 'visible';
        telegramSection.style.opacity = '1';
        console.log('[Task] Telegram integration section shown');
    } else {
        console.error('[Task] Telegram integration section not found');
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
    console.log('[Task] handleLinkTelegram called!');
    
    try {
        console.log('[Task] Initiating Telegram account linking...');
        
        const linkBtn = document.getElementById('link-telegram-account');
        if (linkBtn) {
            linkBtn.disabled = true;
            linkBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Generating Link...';
        }
        
        // Check if Firebase is available
        if (typeof firebase === 'undefined') {
            throw new Error('Firebase is not loaded');
        }
        
        // Check if Firebase Functions is initialized
        if (!window.firebaseFunctions) {
            console.log('[Task] Firebase Functions not initialized, trying to initialize...');
            try {
                // Initialize Firebase Functions if not already done
                if (typeof firebase !== 'undefined' && firebase.functions) {
                    window.firebaseFunctions = firebase.functions();
                    console.log('[Task] Firebase Functions initialized');
                } else {
                    throw new Error('Firebase Functions not available');
                }
            } catch (error) {
                console.error('[Task] Failed to initialize Firebase Functions:', error);
                showTelegramStatus('warning', '⚠️ **Service Unavailable**\n\nFirebase Functions is not available. Please refresh the page and try again.');
                return;
            }
        }
        
        // Check if Firebase is available
        if (typeof firebase === 'undefined') {
            throw new Error('Firebase is not loaded');
        }
        
        // Check if user is authenticated
        if (!firebase.auth) {
            throw new Error('Firebase Auth is not available');
        }
        
        const user = firebase.auth().currentUser;
        if (!user) {
            showTelegramStatus('warning', '⚠️ **Authentication Required**\n\nPlease log in to link your Telegram account.');
            return;
        }
        
        console.log('[Task] User authenticated:', user.uid);
        
        // Check if user is premium
        try {
            if (!firebase.firestore) {
                throw new Error('Firebase Firestore is not available');
            }
            
            const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
            if (!userDoc.exists || userDoc.data().role !== 'premium') {
                showTelegramUpgradePrompt();
                return;
            }
        } catch (error) {
            console.error('[Task] Error checking premium status:', error);
            showTelegramStatus('warning', '⚠️ **Premium Check Failed**\n\nUnable to verify premium status. Please try again.');
            return;
        }
        
        // Wait for Firebase to be initialized
        if (window.firebaseInitialized) {
            try {
                await window.firebaseInitialized;
                console.log('[Task] Firebase initialization completed');
            } catch (error) {
                console.error('[Task] Firebase initialization failed:', error);
                showTelegramStatus('warning', '⚠️ **Service Unavailable**\n\nFirebase initialization failed. Please refresh the page and try again.');
                return;
            }
        }
        
        // Check if Firebase Functions is available
        if (!window.firebaseFunctions) {
            console.error('[Task] Firebase Functions not available after initialization');
            showTelegramStatus('warning', '⚠️ **Service Unavailable**\n\nFirebase Functions is not available. Please refresh the page and try again.');
            return;
        }
        
        // Call Firebase function to generate linking token
        const generateLinkToken = window.firebaseFunctions.httpsCallable('generateTelegramLinkToken');
        const result = await generateLinkToken();
        
        if (result.data && result.data.success) {
            const linkUrl = `https://${window.location.hostname}/link-telegram.html?token=${result.data.token}`;
            
            // Show success message with link
            showTelegramStatus('success', `🔗 **Account Linking Ready!**\n\nClick the link below to connect your Telegram account:\n${linkUrl}\n\nThis link expires in 30 minutes.`);
            
        } else {
            throw new Error(result.data?.error || 'Failed to generate linking token');
        }
        
    } catch (error) {
        console.error('[Task] Error generating Telegram link:', error);
        
        // Provide more specific error messages
        let errorMessage = 'Failed to generate linking URL. ';
        if (error.message.includes('not available')) {
            errorMessage += 'Firebase Functions is not configured. Please contact support.';
        } else if (error.message.includes('log in')) {
            errorMessage += 'Please log in first.';
        } else {
            errorMessage += 'Please try again. Error: ' + error.message;
        }
        
        showTelegramError(errorMessage);
    } finally {
        const linkBtn = document.getElementById('link-telegram-account');
        if (linkBtn) {
            linkBtn.disabled = false;
            linkBtn.innerHTML = '<i class="fas fa-link me-1"></i>Link Account';
        }
    }
}

async function handleCheckTelegramStatus() {
    try {
        console.log('[Task] Checking Telegram account status...');
        
        const checkBtn = document.getElementById('check-telegram-status');
        if (checkBtn) {
            checkBtn.disabled = true;
            checkBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Checking...';
        }
        
        await checkTelegramStatus();
        
        // Show success message
        showTelegramStatus('success', '✅ **Status Check Complete!**\n\nYour Telegram account status has been updated. If your account is linked, the button should now show "Account Linked".');
        
    } catch (error) {
        console.error('[Task] Error checking Telegram status:', error);
        showTelegramError('Failed to check Telegram status. Please try again.');
    } finally {
        const checkBtn = document.getElementById('check-telegram-status');
        if (checkBtn) {
            checkBtn.disabled = false;
            checkBtn.innerHTML = '<i class="fas fa-sync-alt me-1"></i>Check Status';
        }
    }
}

function handleTelegramHelp() {
    const helpMessage = `📚 **How to Use Telegram Integration**

1️⃣ **Link Your Account**
   • Click "Link Account" button
   • Follow the secure linking process
   • Connect your Telegram account

2️⃣ **Send Voice Messages**
   • Open Telegram and find our bot: @quicknotes_ai_bot
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
    console.log('[Task] showTelegramStatus called with type:', type, 'message:', message);
    
    // Convert markdown-style formatting to plain text
    let formattedMessage = message
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\n/g, '\n')
        .replace(/🔗/g, '🔗 ')
        .replace(/⚠️/g, '⚠️ ')
        .replace(/✅/g, '✅ ');
    
    // Show alert with formatted message
    alert(formattedMessage);
    
    // Also update inline status as backup
    const statusDiv = document.getElementById('telegramStatus');
    const statusText = document.getElementById('telegramStatusText');
    if (statusDiv && statusText) {
        statusDiv.classList.remove('d-none');
        statusText.innerHTML = message;
        
        // Update alert class based on type
        const alertDiv = statusDiv.querySelector('.alert');
        if (alertDiv) {
            alertDiv.className = `alert alert-${type} border-2 border-${type} border-opacity-25`;
        }
    }
}

function showTelegramError(message) {
    // Use alert approach for errors to avoid modal issues
    console.log('[Task] showTelegramError called with message:', message);
    
    // Show alert with error message
    alert('Error: ' + message);
    
    // Also show inline error as backup
    const errorDiv = document.getElementById('telegramError');
    const errorMessage = document.getElementById('telegramErrorMessage');
    if (errorDiv && errorMessage) {
        errorDiv.classList.remove('d-none');
        errorMessage.textContent = message;
    }
}

function showTelegramUpgradePrompt() {
    // Show upgrade prompt without alert
    console.log('[Task] showTelegramUpgradePrompt called');
    
    // Show inline upgrade prompt
    const upgradeDiv = document.getElementById('telegramUpgradePrompt');
    if (upgradeDiv) {
        upgradeDiv.classList.remove('d-none');
    }
    
    // Show toast notification instead of alert
    showToast('Telegram integration is a premium feature. Please upgrade to use this feature.', 'info');
}

async function checkTelegramStatus() {
    try {
        // Wait for Firebase to be initialized
        if (window.firebaseInitialized) {
            await window.firebaseInitialized;
        }
        
        // Check if user is authenticated
        const user = firebase.auth().currentUser;
        if (!user) return;
        
        // Check if Firebase Functions is available
        if (!window.firebaseFunctions) {
            console.warn('[Task] Firebase Functions not available for status check');
            return;
        }
        
        // Use Firebase Function to check status
        const checkStatus = window.firebaseFunctions.httpsCallable('checkTelegramStatus');
        const result = await checkStatus();
        
        if (result.data && result.data.success && result.data.status.linked) {
            const telegramUser = result.data.status;
            console.log('[Task] Telegram account linked:', telegramUser);
            
            // Update UI to show linked status
            const linkBtn = document.getElementById('link-telegram-account');
            const statusBadge = document.getElementById('telegram-connection-status');
            
            if (linkBtn) {
                linkBtn.innerHTML = '<i class="fas fa-check me-1"></i>Account Linked';
                linkBtn.classList.remove('btn-primary');
                linkBtn.classList.add('btn-success');
                linkBtn.disabled = true;
            }
            
            if (statusBadge) {
                statusBadge.innerHTML = '<span class="badge bg-success">Linked</span>';
            }
        }
        
    } catch (error) {
        console.error('[Task] Error checking Telegram status:', error);
    }
}

// Initialize Multilingual Voice Manager
let multilingualVoiceManager = null;

// Function to initialize multilingual voice features based on user role
async function initializeMultilingualVoice() {
    try {
        console.log('[MultilingualVoice] Initializing multilingual voice features...');
        
        // Check if user is premium
        const user = window.firebaseAuth?.currentUser;
        if (!user) {
            console.log('[MultilingualVoice] No authenticated user found');
            return;
        }
        
        // Get user role from Firestore
        const userDoc = await window.firebaseDb.collection('users').doc(user.uid).get();
        const userRole = userDoc.exists ? userDoc.data().role || 'free' : 'free';
        
        console.log('[MultilingualVoice] User role:', userRole);
        
        // Get UI elements
        const multilingualSection = document.getElementById('multilingualVoiceSection');
        const upgradePrompt = document.getElementById('voiceUpgradePrompt');
        
        if (!multilingualSection || !upgradePrompt) {
            console.warn('[MultilingualVoice] Required UI elements not found');
            return;
        }
        
        if (userRole === 'premium') {
            // Show multilingual voice section for premium users
            multilingualSection.style.display = 'block';
            upgradePrompt.style.display = 'none';
            
            // Initialize multilingual voice manager
            if (!multilingualVoiceManager) {
                multilingualVoiceManager = new MultilingualVoiceManager();
                console.log('[MultilingualVoice] Manager initialized for premium user');
            }
            
            // Set default language based on browser locale
            const languageSelect = document.getElementById('voiceLanguage');
            if (languageSelect) {
                const browserLang = navigator.language || 'en-US';
                const availableOptions = Array.from(languageSelect.options).map(opt => opt.value);
                
                // Try to match browser language with available options
                let selectedLang = 'en-US';
                if (availableOptions.includes(browserLang)) {
                    selectedLang = browserLang;
                } else {
                    // Try to match language code (e.g., 'en' for 'en-US')
                    const langCode = browserLang.split('-')[0];
                    const matchingOption = availableOptions.find(opt => opt.startsWith(langCode));
                    if (matchingOption) {
                        selectedLang = matchingOption;
                    }
                }
                
                languageSelect.value = selectedLang;
                if (multilingualVoiceManager) {
                    multilingualVoiceManager.currentLanguage = selectedLang;
                }
                
                console.log('[MultilingualVoice] Language set to:', selectedLang);
            }
            
        } else {
            // Show multilingual section for free users with overlay (don't hide completely)
            multilingualSection.style.display = 'block';
            upgradePrompt.style.display = 'none';
            console.log('[MultilingualVoice] Showing multilingual section with overlay for free user');
        }
        
    } catch (error) {
        console.error('[MultilingualVoice] Error initializing:', error);
        // Show multilingual section on error (safe fallback)
        const multilingualSection = document.getElementById('multilingualVoiceSection');
        const upgradePrompt = document.getElementById('voiceUpgradePrompt');
        if (multilingualSection) multilingualSection.style.display = 'block';
        if (upgradePrompt) upgradePrompt.style.display = 'none';
    }
}

// Function to upgrade to premium (redirect to premium page)
function upgradeToPremium() {
    console.log('[Task] Redirecting to premium page...');
    showToast('Redirecting to premium page...', 'info');
    
    // Redirect to premium page after a short delay
    setTimeout(() => {
        window.location.href = 'premium.html';
    }, 1000);
}

// Initialize premium features based on user role
function initializePremiumFeatures() {
    console.log('[Task] Initializing premium features for user role:', window.userRole);
    
    if (window.userRole === 'premium') {
        // Show premium features for premium users
        console.log('[Task] Premium user - showing all premium features');
        
        // Show premium banner
        updatePremiumBannerDisplay();
        
        // Note: Calendar integration is now initialized in task.html
        
        // Enable all premium features
        enablePremiumFeatures();
        
    } else {
        // Check if user is a team admin (even if not premium)
        // Team admins should have access to team assignment features
        if (teamAssignmentManager && teamAssignmentManager.isAdmin) {
            console.log('[Task] Team admin (non-premium) - enabling team assignment features');
            
            // Initialize task manager for team admins (includes team assignment)
            if (typeof initTaskManager === 'function') {
                initTaskManager();
            }
            
            // Enable team assignment section for team admins
            const teamAssignmentSection = document.getElementById('teamAssignmentSection');
            if (teamAssignmentSection) {
                teamAssignmentSection.style.display = 'block';
                teamAssignmentSection.classList.remove('d-none');
                teamAssignmentSection.style.opacity = '1';
                teamAssignmentSection.style.pointerEvents = 'auto';
                
                // Remove any dynamic upgrade overlays that might have been added
                const teamOverlay = teamAssignmentSection.querySelector('.premium-upgrade-overlay');
                if (teamOverlay) {
                    teamOverlay.remove();
                }
                
                console.log('[Task] Team assignment section enabled for team admin');
            }
        }
        
        // Show premium features but disable them for free users
        console.log('[Task] Free user - showing premium features but disabling them');
        
        // Hide premium banner for free users
        updatePremiumBannerDisplay();
        
        // Show premium features but disable them
        showPremiumFeaturesForFreeUsers();
    }
}

// Function to enable premium features for premium users
function enablePremiumFeatures() {
    console.log('[Task] Enabling premium features for premium user');
    
    // Initialize task manager for premium users (includes team assignment)
    if (typeof initTaskManager === 'function') {
        initTaskManager();
    }
    
    // Enable Google Calendar integration and remove any dynamic overlays
    const calendarSection = document.querySelector('.dashboard-card');
    if (calendarSection) {
        calendarSection.style.display = 'block';
        calendarSection.style.opacity = '1';
        calendarSection.style.pointerEvents = 'auto';
        
        // Remove any dynamic upgrade overlays that might have been added
        const calendarOverlay = calendarSection.querySelector('.premium-upgrade-overlay');
        if (calendarOverlay) {
            calendarOverlay.remove();
        }
    }
    
    // Enable team assignment section for premium users
    const teamAssignmentSection = document.getElementById('teamAssignmentSection');
    if (teamAssignmentSection) {
        teamAssignmentSection.style.display = 'block';
        teamAssignmentSection.classList.remove('d-none');
        teamAssignmentSection.style.opacity = '1';
        teamAssignmentSection.style.pointerEvents = 'auto';
        
        // Remove any dynamic upgrade overlays that might have been added
        const teamOverlay = teamAssignmentSection.querySelector('.premium-upgrade-overlay');
        if (teamOverlay) {
            teamOverlay.remove();
        }
        
        console.log('[Task] Team assignment section enabled for premium user');
    }
    
    // Enable recurring task section
    const recurringSection = document.getElementById('recurringTaskSection');
    if (recurringSection) {
        recurringSection.style.display = 'block';
        recurringSection.classList.remove('d-none');
        recurringSection.style.opacity = '1';
        recurringSection.style.pointerEvents = 'auto';
        
        // Remove any dynamic upgrade overlays that might have been added
        const recurringOverlay = recurringSection.querySelector('.premium-upgrade-overlay');
        if (recurringOverlay) {
            recurringOverlay.remove();
        }
    }
    
    // Enable Telegram integration and hide its premium overlay
    const telegramSection = document.getElementById('telegramIntegrationSection');
    if (telegramSection) {
        telegramSection.style.display = 'block';
        telegramSection.style.opacity = '1';
        telegramSection.style.pointerEvents = 'auto';
        
        // Hide the static premium overlay for premium users
        const telegramOverlay = document.getElementById('telegramPremiumOverlay');
        if (telegramOverlay) {
            telegramOverlay.style.display = 'none';
        }
    }
    
    // Enable multilingual voice section and hide its premium overlay
    const multilingualSection = document.getElementById('multilingualVoiceSection');
    if (multilingualSection) {
        multilingualSection.style.display = 'block';
        multilingualSection.style.opacity = '1';
        multilingualSection.style.pointerEvents = 'auto';
        
        // Hide the static premium overlay for premium users
        const multilingualOverlay = document.getElementById('multilingualPremiumOverlay');
        if (multilingualOverlay) {
            multilingualOverlay.style.display = 'none';
        }
    }
    
    // Hide upgrade prompts
    const upgradePrompts = document.querySelectorAll('.premium-upgrade-prompt');
    upgradePrompts.forEach(prompt => {
        prompt.style.display = 'none';
    });
    
    // Remove any remaining dynamic overlays from premium features
    const allDynamicOverlays = document.querySelectorAll('.premium-upgrade-overlay');
    allDynamicOverlays.forEach(overlay => {
        overlay.remove();
    });
}

// Function to show premium features but disable them for free users
function showPremiumFeaturesForFreeUsers() {
    console.log('[Task] Showing premium features but disabling them for free users');
    
    // Show Google Calendar integration but disable it
    const calendarSection = document.querySelector('.dashboard-card');
    if (calendarSection) {
        calendarSection.style.display = 'block';
        calendarSection.style.opacity = '0.6';
        calendarSection.style.pointerEvents = 'none';
        // Add upgrade overlay
        addUpgradeOverlay(calendarSection, 'Google Calendar Integration');
    }
    
    // Show team assignment section but disable it
    const teamAssignmentSection = document.getElementById('teamAssignmentSection');
    if (teamAssignmentSection) {
        teamAssignmentSection.style.display = 'block';
        teamAssignmentSection.classList.remove('d-none');
        teamAssignmentSection.style.opacity = '0.6';
        teamAssignmentSection.style.pointerEvents = 'none';
        // Add upgrade overlay
        addUpgradeOverlay(teamAssignmentSection, 'Team Task Assignment');
    }
    
    // Show recurring task section but disable it
    const recurringSection = document.getElementById('recurringTaskSection');
    if (recurringSection) {
        recurringSection.style.display = 'block';
        recurringSection.classList.remove('d-none');
        recurringSection.style.opacity = '0.6';
        recurringSection.style.pointerEvents = 'none';
        // Add upgrade overlay
        addUpgradeOverlay(recurringSection, 'Recurring Tasks');
    }
    
    // Show Telegram integration but disable it (do NOT add overlay, static overlay exists in HTML)
    const telegramSection = document.getElementById('telegramIntegrationSection');
    if (telegramSection) {
        telegramSection.style.display = 'block';
        telegramSection.style.opacity = '0.6';
        telegramSection.style.pointerEvents = 'none';
        // Do NOT call addUpgradeOverlay(telegramSection, ...)
    }
    
    // Show multilingual voice section but disable it (do NOT add overlay, static overlay exists in HTML)
    const multilingualSection = document.getElementById('multilingualVoiceSection');
    if (multilingualSection) {
        multilingualSection.style.display = 'block';
        multilingualSection.style.opacity = '0.6';
        multilingualSection.style.pointerEvents = 'none';
        // Do NOT call addUpgradeOverlay(multilingualSection, ...)
    }
}

// Function to add upgrade overlay to premium features
function addUpgradeOverlay(element, featureName) {
    // Remove existing overlay if any
    const existingOverlay = element.querySelector('.premium-upgrade-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }
    
    // Create upgrade overlay
    const overlay = document.createElement('div');
    overlay.className = 'premium-upgrade-overlay';
    overlay.innerHTML = `
        <div class="upgrade-overlay-content">
            <div class="upgrade-overlay-icon">
                <i class="fas fa-crown"></i>
            </div>
            <div class="upgrade-overlay-text">
                <h6>Premium Feature</h6>
                <p>${featureName} is available for premium users only</p>
                <button class="btn btn-warning btn-sm" onclick="upgradeToPremium()">
                    <i class="fas fa-crown me-1"></i>Upgrade to Premium
                </button>
            </div>
        </div>
    `;
    
    // Add overlay styles
    overlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        border-radius: inherit;
    `;
    
    // Make parent element relative positioned if not already
    if (getComputedStyle(element).position === 'static') {
        element.style.position = 'relative';
    }
    
    // Add overlay to element
    element.appendChild(overlay);
}

// Initialize Telegram integration when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('[Task] DOM loaded, initializing premium features...');
    
    // Wait for authentication and premium status to be determined
    setTimeout(async () => {
        try {
            // Initialize premium features first
            initializePremiumFeatures();
            
            // Then initialize specific integrations
            await initializeTelegramIntegration();
            await initializeMultilingualVoice(); // Initialize multilingual voice features
        } catch (error) {
            console.error('[Task] Error during initialization:', error);
        }
    }, 2000);
});

// Test function for team assignment debugging
window.testTeamAssignment = async function() {
    console.log('[Test] === Team Assignment Debug ===');
    
    // Check if team assignment manager exists
    console.log('[Test] Team assignment manager exists:', !!teamAssignmentManager);
    
    if (teamAssignmentManager) {
        console.log('[Test] Current user:', teamAssignmentManager.currentUser);
        console.log('[Test] User role:', teamAssignmentManager.userRole);
        console.log('[Test] Is admin:', teamAssignmentManager.isAdmin);
        console.log('[Test] User teams:', teamAssignmentManager.userTeams);
        console.log('[Test] Selected team:', teamAssignmentManager.selectedTeam);
        console.log('[Test] Team members:', teamAssignmentManager.teamMembers);
    }
    
    // Check if HTML elements exist
    const elements = {
        teamAssignmentSection: document.getElementById('teamAssignmentSection'),
        teamSelect: document.getElementById('teamSelect'),
        memberSelect: document.getElementById('memberSelect'),
        assignToTeam: document.getElementById('assignToTeam')
    };
    
    console.log('[Test] HTML elements:', elements);
    
    // Check if user is premium
    console.log('[Test] Window user role:', window.userRole);
    
    // Try to create sample teams if user has no teams
    if (teamAssignmentManager && teamAssignmentManager.userTeams.length === 0) {
        console.log('[Test] No teams found, attempting to create sample teams...');
        try {
            if (teamAssignmentManager.createSampleTeamsForTesting) {
                await teamAssignmentManager.createSampleTeamsForTesting();
                console.log('[Test] Sample teams created successfully');
            } else {
                console.log('[Test] createSampleTeamsForTesting function not available');
            }
        } catch (error) {
            console.error('[Test] Error creating sample teams:', error);
        }
    }
    
    // Test team selection if teams exist
    if (teamAssignmentManager && teamAssignmentManager.userTeams.length > 0) {
        console.log('[Test] Testing team selection...');
        const firstTeam = teamAssignmentManager.userTeams[0];
        console.log('[Test] Selecting first team:', firstTeam.name);
        await teamAssignmentManager.onTeamChange(firstTeam.id);
    }
    
    console.log('[Test] === End Team Assignment Debug ===');
    
    return {
        managerExists: !!teamAssignmentManager,
        userRole: teamAssignmentManager?.userRole,
        isAdmin: teamAssignmentManager?.isAdmin,
        teamsCount: teamAssignmentManager?.userTeams?.length || 0,
        elementsExist: Object.values(elements).every(el => !!el)
    };
};

// --- Productivity Score Calculation and Star Update ---
const tasks = (window.taskState && window.taskState.tasks) ? window.taskState.tasks : [];
const total = tasks.length;
const completed = tasks.filter(t => t.completed).length;

let productivityScore = 0;
if (total > 0) {
    const completionRate = completed / total;
    productivityScore = Math.round(completionRate * 5 * 10) / 10; // 1 decimal place
}
const productivityScoreEl = document.getElementById('productivityScore');
if (productivityScoreEl) {
    productivityScoreEl.textContent = productivityScore.toFixed(1);
}
// Update star rating
const starsContainer = document.getElementById('productivityStars');
if (starsContainer) {
    let starsHtml = '';
    let score = productivityScore;
    for (let i = 1; i <= 5; i++) {
        if (score >= 1) {
            starsHtml += '<i class="bi bi-star-fill"></i>';
        } else if (score >= 0.5) {
            starsHtml += '<i class="bi bi-star-half"></i>';
        } else {
            starsHtml += '<i class="bi bi-star"></i>';
        }
        score -= 1;
    }
    starsContainer.innerHTML = starsHtml;
}

// Note: Sign out button handler is now managed in task.html for better integration
// with the calendar connection status management

// Note: Calendar integration is now initialized in task.html to prevent duplicate initializations
// and ensure proper event listener management















