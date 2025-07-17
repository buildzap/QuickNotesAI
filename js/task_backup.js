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



// Global state management - use window.taskState from HTML file
// const taskState = {
//     tasks: [],
//     currentUser: null,
//     unsubscribeListener: null,
//     priorityChart: null,
//     filters: {
//         priority: '',
//         status: '',
//         inputMethod: '',
//         date: '',
//         title: '', // Add title filter
//         recurring: '' // Add recurring filter
//     }
// };

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

// User role for premium features - use window.userRole

// Helper function to format recurrence information
function formatRecurrenceInfo(recurrence) {
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
        
        // Update debug status after a short delay
        setTimeout(() => {
            if (typeof updateDebugStatus === 'function') {
                updateDebugStatus();
            }
        }, 1000);
        
        // Try comprehensive task loading first
        console.log('[Task] Attempting comprehensive task loading...');
        try {
            await comprehensiveTaskLoad();
            console.log('[Task] Comprehensive task loading completed');
        } catch (error) {
            console.error('[Task] Comprehensive loading failed, falling back to standard auth:', error);
            
            // Fallback to standard authentication
            const isAuthenticated = await checkAuthentication();
            if (!isAuthenticated) return;
            
            // Note: initTaskManager() is now called in enablePremiumFeatures() for premium users only
        }
    
    // Initialize voice manager
    window.voiceManager = new VoiceManager();
    
    // Initialize recurring task manager
    window.recurringTaskManager = new RecurringTaskManager();
    
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
        const recurringTasks = window.taskState.tasks.filter(t => t.recurring);
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
    
    // Initialize task history toggle
    const taskHistoryToggle = document.getElementById('taskHistoryToggle');
    if (taskHistoryToggle) {
        taskHistoryToggle.addEventListener('change', toggleTaskHistory);
        
        // Restore toggle state from localStorage
        const savedState = localStorage.getItem('taskHistoryVisible');
        if (savedState === 'false') {
            taskHistoryToggle.checked = false;
            // Apply the hidden state immediately
            setTimeout(() => toggleTaskHistory(), 100);
        }
        
        console.log('[Task] Task History toggle initialized');
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
            window.taskState.currentUser = user;
            const db = window.firebaseDb;
            userRole = 'free';
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
        
        // Initialize team assignment section if user is premium
        if (window.userRole === 'premium' && typeof window.teamTaskManager !== 'undefined') {
            console.log('[Task] Initializing team assignment section for premium user');
            // The team-tasks.js script will handle the initialization
            
            // Add a small delay to ensure team-tasks.js has initialized
            setTimeout(() => {
                if (window.teamTaskManager && window.teamTaskManager.currentTeam) {
                    console.log('[Task] Team assignment section should be visible now');
                }
            }, 1000);
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
                        
                        // Hide the premium overlay for premium users
                        const calendarOverlay = calendarSection.querySelector('.premium-overlay');
                        if (calendarOverlay) {
                            calendarOverlay.style.display = 'none';
                            console.log('[Task] Hidden Google Calendar premium overlay for premium user');
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
                    
                    // Initialize calendar integration UI
                    initCalendarIntegration();
                    
                    // Enable all premium features
                    enablePremiumFeatures();
                    
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
                    window.taskState.currentUser = null;
        window.taskState.tasks = [];
            renderTasks(currentTaskPage);
            
            // Hide all calendar integration UI when user is not authenticated
            const calendarSection = document.getElementById('calendarIntegrationSection');
            if (calendarSection) calendarSection.classList.add('d-none');
            
            const premiumPrompt = document.getElementById('premiumPromptContainer');
            if (premiumPrompt) premiumPrompt.classList.add('d-none');
        }
    });
});

// Task manager initialization
function initTaskManager() {
    console.log('[Task] Initializing task manager');
    
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
    console.log('[Task] Setting up task listener...');
    
    if (window.taskState.unsubscribeListener) {
        // Remove previous listener if any
        window.taskState.unsubscribeListener();
        window.taskState.unsubscribeListener = null;
        console.log('[Task] Removed previous listener');
    }
    
    const user = window.firebaseAuth?.currentUser;
    if (!user) {
        console.warn('[Task] No authenticated user for Firestore listener');
        showToast('Please log in to load tasks', 'warning');
        return;
    }
    
    console.log('[Task] Setting up listener for user:', user.uid);
    
    try {
        const db = window.firebase?.firestore();
        if (!db) {
            console.error('[Task] Firestore not available');
            showToast('Firebase not initialized. Please refresh.', 'danger');
            return;
        }
        
        // Listen to tasks for the current user
        window.taskState.unsubscribeListener = db.collection('tasks')
            .where('userId', '==', user.uid)
            .orderBy('createdAt', 'desc')
            .onSnapshot(
                (snapshot) => {
                    console.log('[Task] Firestore snapshot received, size:', snapshot.size);
                    
                    const tasks = [];
                    snapshot.forEach(doc => {
                        const data = doc.data();
                        console.log('[Task] Processing task:', doc.id, data.title);
                        
                        // Convert Firestore Timestamps to JS Dates
                        const parseDate = (d) => {
                            if (!d) return null;
                            if (d instanceof Date) return d;
                            if (d.toDate) return d.toDate();
                            return new Date(d);
                        };
                        
                        const task = {
                            id: doc.id,
                            ...data,
                            dueDate: parseDate(data.dueDate),
                            createdAt: parseDate(data.createdAt),
                            updatedAt: parseDate(data.updatedAt),
                        };
                        
                        tasks.push(task);
                    });
                    
                    console.log('[Task] Tasks loaded from Firestore:', tasks.length);
                    console.log('[Task] Task details:', tasks.map(t => ({ 
                        id: t.id, 
                        title: t.title, 
                        status: t.status,
                        userId: t.userId 
                    })));
                    
                    // Update task state
                    window.taskState.tasks = tasks;
                    
                    // Force immediate UI updates
                    setTimeout(() => {
                        console.log('[Task] Updating UI components...');
                        
                        // Update task summary with the loaded tasks
                        if (typeof updateTaskSummary === 'function') {
                            updateTaskSummary(tasks);
                        }
                        
                        // Render task grid
                        if (typeof renderTaskGrid === 'function') {
                            renderTaskGrid(currentTaskPage || 1);
                        }
                        
                        // Update other UI components
                        if (typeof updateTaskStats === 'function') {
                            updateTaskStats(tasks);
                        }
                        
                        if (typeof updateDashboardStats === 'function') {
                            updateDashboardStats(tasks);
                        }
                        
                        console.log('[Task] UI updated successfully');
                        
                        // Update debug status
                        if (typeof updateDebugStatus === 'function') {
                            updateDebugStatus();
                        }
                        
                        // Show success message
                        if (tasks.length > 0) {
                            showToast(`Successfully loaded ${tasks.length} tasks!`, 'success');
                        } else {
                            showToast('No tasks found. Create your first task!', 'info');
                        }
                    }, 100);
                },
                (error) => {
                    console.error('[Task] Firestore listener error:', error);
                    showToast('Error loading tasks. Please refresh.', 'danger');
                    
                    // Try to load from local storage as fallback
                    try {
                        const localTasks = JSON.parse(localStorage.getItem('quicknotes_tasks') || '[]');
                        if (localTasks.length > 0) {
                            window.taskState.tasks = localTasks;
                            renderTaskGrid(currentTaskPage || 1);
                            showToast('Loaded tasks from local storage', 'warning');
                        }
                    } catch (e) {
                        console.error('[Task] Local storage fallback failed:', e);
                    }
                }
            );
            
        console.log('[Task] Firestore listener set up successfully');
        
    } catch (error) {
        console.error('[Task] Error setting up Firestore listener:', error);
        showToast('Failed to connect to database. Please refresh.', 'danger');
    }
}

// --- Pagination State ---
let currentTaskPage = 1;
const TASKS_PER_PAGE = 10; // Show 10 records per page

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
        window.taskState.selectedTaskId = taskId;
        
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
    console.log('[renderTasks] Starting render for page:', page);
    currentTaskPage = page;
    const tasksContainer = document.getElementById('taskList');
    if (!tasksContainer) {
        console.error('[renderTasks] taskList element not found');
        return;
    }
    tasksContainer.innerHTML = '';

    // Defensive: flatten and sort tasks
    let tasks = Array.isArray(window.taskState.tasks) ? [...window.taskState.tasks] : [];
    console.log('[renderTasks] Total tasks before filtering:', tasks.length);
    // Only show tasks with a valid title (filter out test/empty tasks)
    tasks = tasks.filter(t => t.title && t.title.trim() !== '');
    console.log('[renderTasks] Tasks after title filtering:', tasks.length);
    
    if (!tasks.length) {
        console.log('[renderTasks] No tasks to display');
        tasksContainer.innerHTML = '<div class="text-muted text-center p-4">No tasks found.</div>';
        renderPagination(0, page, TASKS_PER_PAGE);
        return;
    }
    // Apply filters before sorting and pagination
    const { priority, status, inputMethod, date } = window.taskState.filters;
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
    if (window.taskState.filters.title) {
        const search = window.taskState.filters.title.trim().toLowerCase();
        if (search) {
            tasks = tasks.filter(t => (t.title || '').toLowerCase().includes(search));
        }
    }
    if (window.taskState.filters.recurring) {
        if (window.taskState.filters.recurring === 'recurring') {
            tasks = tasks.filter(t => t.recurring === true);
        } else if (window.taskState.filters.recurring === 'non-recurring') {
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
            if (window.taskState.selectedTaskId === task.id) {
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
                                            ${formatRecurrenceInfo(task.recurrence || { type: 'recurring' })}
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
                                ${task.assignedTo ? `<div class="text-end mt-2">
                                    <small class="text-muted">
                                        <i class="bi bi-person-fill me-1"></i>Assigned to: ${escapeHtml(task.assignedTo)}
                                    </small>
                                </div>` : ''}
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
                        <span class="badge rounded-pill text-bg-${getStatusColor(task.status)}">${getStatusDisplayText(task.status)}</span>
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
    // Add event listeners for checkboxes and other interactions
    addTaskEventListeners();
    setTimeout(() => {
        // Add task selection handlers
        document.querySelectorAll('.task-item').forEach(taskElement => {
            const taskId = taskElement.querySelector('.task-complete-checkbox')?.getAttribute('data-task-id');
            if (taskId) {
                // Make task selectable for calendar integration
                makeTaskSelectable(taskElement, taskId);
                
                // Update calendar integration UI if this task is already selected
                if (window.taskState.selectedTaskId === taskId) {
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
                const task = window.taskState.tasks.find(t => t.id === taskId);
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
                const taskId = this.getAttribute('data-task-id');
                window.editingTaskId = taskId;
                // Re-render the current view
                renderTaskGrid(currentTaskPage);
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
                const currentTask = window.taskState.tasks.find(t => t.id === taskId);
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
    nav.className = 'd-flex justify-content-center align-items-center';
    
    const ul = document.createElement('ul');
    ul.className = 'pagination pagination-sm mb-0';
    ul.style.cssText = 'flex-wrap: wrap; justify-content: center; gap: 0.25rem;';
    
    // Previous button
    const prevLi = document.createElement('li');
    prevLi.className = 'page-item' + (currentPage === 1 ? ' disabled' : '');
    const prevA = document.createElement('a');
    prevA.className = 'page-link';
    prevA.href = '#';
    prevA.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevA.title = 'Previous Page';
    prevA.onclick = (e) => { e.preventDefault(); if (currentPage > 1) renderTasks(currentPage - 1); };
    prevLi.appendChild(prevA);
    ul.appendChild(prevLi);
    
    // Add First button
    const firstLi = document.createElement('li');
    firstLi.className = 'page-item' + (currentPage === 1 ? ' disabled' : '');
    const firstA = document.createElement('a');
    firstA.className = 'page-link';
    firstA.href = '#';
    firstA.innerHTML = '<i class="fas fa-angle-double-left"></i>';
    firstA.title = 'First Page';
    firstA.onclick = (e) => { e.preventDefault(); if (currentPage !== 1) renderTasks(1); };
    firstLi.appendChild(firstA);
    ul.insertBefore(firstLi, ul.firstChild);
    
    // Page numbers with smart truncation for many pages
    const maxVisiblePages = 7;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // Add ellipsis before if needed
    if (startPage > 1) {
        const ellipsisLi = document.createElement('li');
        ellipsisLi.className = 'page-item disabled';
        const ellipsisA = document.createElement('span');
        ellipsisA.className = 'page-link';
        ellipsisA.textContent = '...';
        ellipsisLi.appendChild(ellipsisA);
        ul.appendChild(ellipsisLi);
    }
    
    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
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
    
    // Add ellipsis after if needed
    if (endPage < totalPages) {
        const ellipsisLi = document.createElement('li');
        ellipsisLi.className = 'page-item disabled';
        const ellipsisA = document.createElement('span');
        ellipsisA.className = 'page-link';
        ellipsisA.textContent = '...';
        ellipsisLi.appendChild(ellipsisA);
        ul.appendChild(ellipsisLi);
    }
    
    // Next button
    const nextLi = document.createElement('li');
    nextLi.className = 'page-item' + (currentPage === totalPages ? ' disabled' : '');
    const nextA = document.createElement('a');
    nextA.className = 'page-link';
    nextA.href = '#';
    nextA.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextA.title = 'Next Page';
    nextA.onclick = (e) => { e.preventDefault(); if (currentPage < totalPages) renderTasks(currentPage + 1); };
    nextLi.appendChild(nextA);
    ul.appendChild(nextLi);
    
    // Add Last button
    const lastLi = document.createElement('li');
    lastLi.className = 'page-item' + (currentPage === totalPages ? ' disabled' : '');
    const lastA = document.createElement('a');
    lastA.className = 'page-link';
    lastA.href = '#';
    lastA.innerHTML = '<i class="fas fa-angle-double-right"></i>';
    lastA.title = 'Last Page';
    lastA.onclick = (e) => { e.preventDefault(); if (currentPage !== totalPages) renderTasks(totalPages); };
    lastLi.appendChild(lastA);
    ul.appendChild(lastLi);
    
    // Add page info
    const pageInfo = document.createElement('div');
    pageInfo.className = 'ms-3 text-muted small';
    pageInfo.innerHTML = `Page ${currentPage} of ${totalPages} (${total} tasks)`;
    
    nav.appendChild(ul);
    nav.appendChild(pageInfo);
    container.appendChild(nav);
}

// --- Analytics: Task Summary ---
function updateTaskSummary(tasks = window.taskState.tasks) {
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
function updatePriorityChart(tasks = window.taskState.tasks) {
    const ctx = document.getElementById('priorityChart');
    if (!ctx) return;
    const counts = { high: 0, medium: 0, low: 0 };
    tasks.forEach(t => {
        if (t.priority) counts[t.priority.toLowerCase()] = (counts[t.priority.toLowerCase()] || 0) + 1;
    });
    if (window.taskState.priorityChart) window.taskState.priorityChart.destroy();
    window.taskState.priorityChart = new Chart(ctx, {
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
function updateProgressionChart(tasks = window.taskState.tasks) {
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
    if (window.taskState.progressionChart) window.taskState.progressionChart.destroy();
    // Create gradient
    const chartCtx = ctx.getContext('2d');
    const gradient = chartCtx.createLinearGradient(0, 0, 0, ctx.height || 300);
    gradient.addColorStop(0, 'rgba(99,102,241,0.4)');
    gradient.addColorStop(1, 'rgba(99,102,241,0.05)');
    window.taskState.progressionChart = new Chart(ctx, {
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
function updateRecentActivity(tasks = window.taskState.tasks) {
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
function updateUserInsightsChart(tasks = window.taskState.tasks) {
    const ctx = document.getElementById('userInsightsChart');
    if (!ctx) return;
    // Example: Show input method distribution (voice vs manual)
    const counts = { voice: 0, manual: 0 };
    tasks.forEach(t => {
        const method = (t.inputMethod || 'manual').toLowerCase();
        if (method === 'voice') counts.voice++;
        else counts.manual++;
    });
    if (window.taskState.userInsightsChart) window.taskState.userInsightsChart.destroy();
    window.taskState.userInsightsChart = new Chart(ctx, {
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
                window.taskState.filters.priority = e.target.value;
                renderTasks(1);
            });
        }
        if (statusSelect) {
            statusSelect.addEventListener('change', (e) => {
                window.taskState.filters.status = e.target.value;
                renderTasks(1);
            });
        }
        if (inputMethodSelect) {
            inputMethodSelect.addEventListener('change', (e) => {
                window.taskState.filters.inputMethod = e.target.value;
                renderTasks(1);
            });
        }
        if (dateSelect) {
            dateSelect.addEventListener('change', (e) => {
                window.taskState.filters.date = e.target.value;
                renderTasks(1);
            });
        }
        if (titleInput) {
            titleInput.addEventListener('input', (e) => {
                window.taskState.filters.title = e.target.value;
                renderTasks(1);
            });
        }
        if (recurringSelect) {
            recurringSelect.addEventListener('change', (e) => {
                window.taskState.filters.recurring = e.target.value;
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
        
        // Check if we're in edit mode
        const isEditing = window.editingTaskId !== null;
        console.log('[Task] Edit mode:', isEditing, 'Task ID:', window.editingTaskId);
        
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

        console.log('[Task] Final task doc:', taskDoc);

        // Check if this is a team task
        const assignedTo = document.getElementById('taskAssignedTo')?.value;
        const isTeamTask = assignedTo && assignedTo.trim() !== '';
        
        if (isTeamTask && window.userRole === 'premium') {
            console.log('[Task] Creating team task for user:', assignedTo);
            
            // Get current team from team-tasks.js
            const teamId = window.teamTaskManager?.currentTeam || null;
            
            if (!teamId) {
                console.error('[Task] No team found for team task creation');
                showToast('No team found. Please join a team first.', 'warning');
                return;
            }
            
            // Add team-specific data
            taskDoc.assignedTo = assignedTo;
            taskDoc.teamId = teamId;
            taskDoc.createdBy = user.uid;
            
            // Save to team tasks collection
            const teamTaskRef = await window.firebaseDb
                .collection('tasks')
                .doc(teamId)
                .collection('teamTasks')
                .add(taskDoc);
            
            console.log('[Task] Team task created with ID:', teamTaskRef.id);
            showToast('Team task created successfully!', 'success');
            
            // Reset team assignment
            const taskAssignedTo = document.getElementById('taskAssignedTo');
            if (taskAssignedTo) {
                taskAssignedTo.value = '';
            }
            
            // Notify team dashboard if it's open
            if (window.refreshTeamData && typeof window.refreshTeamData === 'function') {
                console.log('[Task] Notifying team dashboard to refresh');
                window.refreshTeamData();
            }
            
        } else {
            // Add to personal tasks collection or update existing task
            if (isEditing) {
                console.log('[Task] Updating existing task in Firestore...');
                await window.firebaseDb.collection('tasks').doc(window.editingTaskId).update({
                    ...taskDoc,
                    updatedAt: new Date()
                });
                console.log('[Task] Successfully updated task with ID:', window.editingTaskId);
                showToast('Task updated successfully!', 'success');
                
                // Clear edit mode
                window.editingTaskId = null;
                
                        // Reset form button
        const submitBtn = document.getElementById('submitTaskBtn');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="bi bi-plus-circle me-1"></i>Add Task';
            submitBtn.classList.remove('btn-warning');
            submitBtn.classList.add('btn-primary');
        }
            } else {
                console.log('[Task] Adding new personal task to Firestore...');
                const docRef = await window.firebaseDb.collection('tasks').add(taskDoc);
                console.log('[Task] Successfully added to Firestore with ID:', docRef.id);
            }
        }
    
        // For team tasks, skip Google Calendar integration for now
        if (isTeamTask) {
            console.log('[Task] Team task created - Google Calendar integration not yet implemented for team tasks');
        } else {
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
    }
    
    // Reset recurring form after successful add
    if (window.recurringTaskManager) {
        window.recurringTaskManager.resetRecurringForm();
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
        const task = window.taskState.tasks.find(t => t.id === taskId);
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
    console.log('[Task] Delete task called:', taskId, taskTitle);
    
    if (!taskId) {
        console.error('[Task] No task ID provided for deletion');
        return;
    }
    
    const confirmed = window.confirm(`Are you sure you want to delete the task: "${taskTitle || ''}"? This action cannot be undone.`);
    if (!confirmed) {
        console.log('[Task] Delete cancelled by user');
        return;
    }
    
    try {
        console.log('[Task] Proceeding with deletion...');
        
        if (!window.firebaseDb || !window.firebaseAuth) {
            throw new Error('Firebase not initialized');
        }
        
        const user = window.firebaseAuth.currentUser;
        if (!user) {
            throw new Error('User not authenticated');
        }
        
        console.log('[Task] Deleting task from Firebase...');
        await window.firebaseDb.collection('tasks').doc(taskId).delete();
        
        console.log('[Task] Task deleted successfully from Firebase');
        showToast('Task deleted successfully!', 'success');
        
    } catch (err) {
        console.error('[Task] Delete error:', err);
        showToast('Failed to delete task.', 'danger');
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
    console.log('[Task] Initializing Calendar Integration');
    
    // Check if user is premium
    if (window.userRole !== 'premium') {
        console.log('[Task] User is not premium, hiding Google Calendar integration');
        const calendarSection = document.querySelector('.dashboard-card');
        if (calendarSection) {
            calendarSection.style.display = 'none';
        }
        return;
    }
    
    // Get UI elements
    const connectBtn = document.getElementById('connect-google-calendar');
    const syncBtn = document.getElementById('sync-to-google-calendar');
    const connectionStatus = document.getElementById('connection-status');
    const selectedTaskDisplay = document.getElementById('selected-task-display');
    
    // Update connection status
    function updateConnectionStatus(isConnected) {
        if (connectionStatus) {
            if (isConnected) {
                connectionStatus.innerHTML = '<span class="badge bg-success">Connected</span>';
                if (connectBtn) {
                    connectBtn.innerHTML = '<i class="bi bi-check-circle me-2"></i>Connected';
                    connectBtn.classList.remove('btn-google');
                    connectBtn.classList.add('btn-success');
                    connectBtn.disabled = true;
                }
            } else {
                connectionStatus.innerHTML = '<span class="badge bg-secondary">Not Connected</span>';
                if (connectBtn) {
                    connectBtn.innerHTML = '<i class="bi bi-google me-2"></i>Connect to Google Calendar';
                    connectBtn.classList.remove('btn-success');
                    connectBtn.classList.add('btn-google');
                    connectBtn.disabled = false;
                }
            }
        }
    }
    
    // Update selected task display
    window.updateSelectedTaskDisplay = function() {
        const selectedTaskDisplay = document.getElementById('selected-task-display');
        if (!selectedTaskDisplay) return;
        
        const taskId = window.taskState.selectedTaskId;
        if (taskId) {
            const task = window.taskState.tasks.find(t => t.id === taskId);
            if (task) {
                selectedTaskDisplay.innerHTML = `
                    <div class="fw-bold text-primary">${escapeHtml(task.title)}</div>
                    <div class="small text-muted">Due: ${task.dueDate ? formatDate(task.dueDate) : 'No due date'}</div>
                    <div class="small text-muted">Priority: ${task.priority || 'Medium'}</div>
                `;
                return;
            }
        }
        
        selectedTaskDisplay.innerHTML = '<span class="text-muted">No task selected</span>';
    };
    
    // Update sync button state
    window.updateSyncButton = function() {
        const syncBtn = document.getElementById('sync-to-google-calendar');
        if (!syncBtn) {
            console.log('[Task] Sync button not found');
            return;
        }
        
        // Check Google Calendar connection status
        let isConnected = false;
        try {
            isConnected = window.gcal && window.gcal.isSignedIn && window.gcal.isSignedIn();
            
            // Additional check for localStorage token
            const accessToken = localStorage.getItem('gcal_access_token');
            const tokenExpiry = localStorage.getItem('gcal_token_expiry');
            const hasValidToken = accessToken && tokenExpiry && new Date(tokenExpiry) > new Date();
            
            console.log('[Task] Connection checks:', {
                gcalExists: !!window.gcal,
                isSignedInMethod: !!window.gcal?.isSignedIn,
                isSignedInResult: isConnected,
                hasAccessToken: !!accessToken,
                hasTokenExpiry: !!tokenExpiry,
                hasValidToken: hasValidToken
            });
            
            // If we have a valid token but isSignedIn() returns false, force it to true
            if (!isConnected && hasValidToken) {
                console.log('[Task] Found valid token but isSignedIn() returned false, forcing connection state');
                isConnected = true;
            }
            
        } catch (error) {
            console.log('[Task] Error checking Google Calendar connection:', error);
            isConnected = false;
        }
        
        // Check task selection status
        const hasTaskSelected = !!window.taskState.selectedTaskId;
        
        console.log('[Task] Sync button state check:', { 
            isConnected, 
            hasTaskSelected, 
            taskId: window.taskState.selectedTaskId,
            buttonFound: !!syncBtn,
            currentDisabled: syncBtn.disabled,
            taskStateExists: !!window.taskState,
            gcalExists: !!window.gcal
        });
        
        // Button should be ENABLED when both connected AND task is selected
        const newDisabledState = !isConnected || !hasTaskSelected;
        syncBtn.disabled = newDisabledState;
        
        console.log('[Task] Setting button disabled to:', newDisabledState, 'because:', {
            notConnected: !isConnected,
            noTaskSelected: !hasTaskSelected
        });
        
        if (syncBtn.disabled) {
            syncBtn.classList.add('opacity-50');
            syncBtn.title = !isConnected ? 'Connect to Google Calendar first' : 'Select a task first';
            console.log('[Task] Button disabled - reason:', !isConnected ? 'Not connected' : 'No task selected');
        } else {
            syncBtn.classList.remove('opacity-50');
            syncBtn.title = 'Sync selected task to Google Calendar';
            console.log('[Task] Button enabled - ready to sync');
        }
        
        // Force re-render of button state
        syncBtn.style.pointerEvents = syncBtn.disabled ? 'none' : 'auto';
        
        console.log('[Task] Final button state:', {
            disabled: syncBtn.disabled,
            opacityClass: syncBtn.classList.contains('opacity-50'),
            pointerEvents: syncBtn.style.pointerEvents
        });
    };
    
    // Event handlers
    if (connectBtn) {
        connectBtn.addEventListener('click', async () => {
            try {
                console.log('[Task] Connect button clicked');
                
                // Check if Google Calendar API is available
                if (!window.gcal) {
                    throw new Error("Google Calendar API not loaded. Please refresh the page.");
                }
                
                // Check configuration first
                const configValidation = validateGoogleConfiguration();
                if (!configValidation.isValid) {
                    console.error('[Task] Google Calendar configuration invalid:', configValidation.issues);
                    showGoogleConfigurationError(configValidation.issues);
                    throw new Error("Google Calendar configuration issues: " + configValidation.issues.join(', '));
                }
                
                if (!window.gcal.signIn) {
                    throw new Error("Google Calendar sign-in function not available.");
                }
                
                // Show loading state
                connectBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Connecting...';
                connectBtn.disabled = true;
                
                await window.gcal.signIn();
                updateConnectionStatus(true);
                
                // Force update sync button after successful sign-in
                setTimeout(() => {
                    window.updateSyncButton();
                    console.log('[Task] Sync button updated after sign-in');
                }, 100);
                
                showToast('Successfully connected to Google Calendar', 'success');
            } catch (error) {
                console.error('[Task] Failed to connect to Google Calendar:', error);
                
                // Provide specific error messages based on error type
                let errorMessage = 'Failed to connect to Google Calendar';
                if (error.message) {
                    if (error.message.includes('Client ID') || error.message.includes('API Key')) {
                        errorMessage = 'Google Calendar configuration error. Please check your API key and Client ID.';
                    } else if (error.message.includes('not loaded')) {
                        errorMessage = 'Google Calendar service not loaded. Please refresh the page.';
                    } else if (error.message.includes('configuration issues')) {
                        errorMessage = 'Google Calendar setup incomplete. Please check your configuration.';
                    } else if (error.message.includes('403')) {
                        errorMessage = 'Google Calendar API access denied. Please enable Google Calendar API in Google Cloud Console.';
                    } else if (error.message.includes('400')) {
                        errorMessage = 'Google Calendar API key is invalid. Please check your API key configuration.';
                    } else if (error.message.includes('401')) {
                        errorMessage = 'Google Calendar authentication failed. Please check your Client ID.';
                    } else {
                        errorMessage = error.message;
                    }
                } else if (error.status) {
                    if (error.status === 403) {
                        errorMessage = 'Google Calendar API access denied. Please enable Google Calendar API in Google Cloud Console.';
                    } else if (error.status === 400) {
                        errorMessage = 'Google Calendar API key is invalid. Please check your API key configuration.';
                    } else if (error.status === 401) {
                        errorMessage = 'Google Calendar authentication failed. Please check your Client ID.';
                    }
                }
                
                showToast(errorMessage, 'danger');
                
                // Reset button state
                updateConnectionStatus(false);
                window.updateSyncButton();
            }
        });
    }
    
    if (syncBtn) {
        syncBtn.addEventListener('click', async () => {
            if (!window.taskState.selectedTaskId) {
                showToast('Please select a task first', 'warning');
                return;
            }
            
            const selectedTask = window.taskState.tasks.find(t => t.id === window.taskState.selectedTaskId);
            if (selectedTask) {
                try {
                    // Show loading state
                    syncBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Syncing...';
                    syncBtn.disabled = true;
                    
                    showToast('Creating calendar event...', 'info');
                    
                    if (window.gcal && window.gcal.createEvent) {
                        // Create a proper calendar event object from the task
                        const event = createCalendarEventFromTask(selectedTask);
                        await window.gcal.createEvent(event);
                        
                        // Mark task as synced in Firestore
                        const taskRef = window.firebaseDb.collection('tasks').doc(selectedTask.id);
                        await taskRef.update({
                            synced: true,
                            syncedAt: new Date()
                        });
                        
                        showToast('Task synced to Google Calendar successfully!', 'success');
                    } else {
                        throw new Error('Google Calendar API not available');
                    }
                } catch (error) {
                    console.error('[Task] Sync error:', error);
                    showToast('Failed to sync task. Please try again.', 'danger');
                } finally {
                    // Reset button state
                    syncBtn.innerHTML = '<i class="bi bi-calendar-plus me-2"></i>Sync Task to Google Calendar';
                    window.updateSyncButton();
                }
            }
        });
    }
    
    // Check initial connection status
    if (window.gcal && window.gcal.isSignedIn) {
        const isSignedIn = window.gcal.isSignedIn();
        updateConnectionStatus(isSignedIn);
        window.updateSyncButton();
        console.log('[Task] Initial Google Calendar connection status:', isSignedIn);
    }
    
    // Update sync button when task selection changes
    const originalSelectTask = window.selectTask;
    window.selectTask = function(taskId) {
        if (originalSelectTask) {
            originalSelectTask(taskId);
        }
        window.taskState.selectedTaskId = taskId;
        window.updateSelectedTaskDisplay();
        window.updateSyncButton();
    };
    
    // Listen for task selection changes
    if (window.taskState) {
        window.taskState.onTaskSelected = function() {
            window.updateSelectedTaskDisplay();
            window.updateSyncButton();
        };
    }
    
    // Initial sync button and display update
    setTimeout(() => {
        window.updateSyncButton();
        window.updateSelectedTaskDisplay();
        console.log('[Task] Initial sync button and display update completed');
    }, 500);
    
    // Periodic sync button state check (every 2 seconds for first 10 seconds)
    let checkCount = 0;
    const maxChecks = 5;
    const checkInterval = setInterval(() => {
        if (checkCount >= maxChecks) {
            clearInterval(checkInterval);
            return;
        }
        
        const syncBtn = document.getElementById('sync-to-google-calendar');
        if (syncBtn && syncBtn.disabled) {
            // Re-check if we should enable the button
            const isConnected = window.gcal && window.gcal.isSignedIn && window.gcal.isSignedIn();
            const hasTaskSelected = !!window.taskState.selectedTaskId;
            
            if (isConnected && hasTaskSelected) {
                console.log('[Task] Periodic check: Enabling sync button');
                window.updateSyncButton();
            }
        }
        
        checkCount++;
    }, 2000);
}

// Production-ready Google Calendar integration
// Test functions removed for clean production code

// Create a calendar event object from a task
function createCalendarEventFromTask(task) {
    console.log('[Task] Creating calendar event from task:', task);
    
    // Parse due date and set event timing
    let eventStart, eventEnd;
    const now = new Date();
    
    if (task.dueDate) {
        // Parse the due date
        const dueDate = new Date(task.dueDate);
        
        // Always set event to start 30 minutes before the due date, regardless of past/future
        eventStart = new Date(dueDate.getTime() - 30 * 60 * 1000); // 30 minutes before due date
        eventEnd = new Date(dueDate.getTime() + 30 * 60 * 1000);   // 30 minutes after due date
    } else {
        // No due date, schedule for next 30 minutes
        eventStart = new Date(now.getTime() + 30 * 60 * 1000);
        eventEnd = new Date(eventStart.getTime() + 60 * 60 * 1000);
    }
    
    // Get user email for attendee
    const user = window.firebaseAuth.currentUser;
    const userEmail = user ? user.email : null;
    
    // Create event object
    const event = {
        'summary': task.title,
        'description': task.description || `Task: ${task.title}\nPriority: ${task.priority || 'Medium'}\nCategory: ${task.category || 'General'}`,
        'start': {
            'dateTime': eventStart.toISOString(),
            'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        'end': {
            'dateTime': eventEnd.toISOString(),
            'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        'reminders': {
            'useDefault': false,
            'overrides': [
                {
                    'method': 'email',
                    'minutes': 24 * 60 // 24 hours before
                },
                {
                    'method': 'popup',
                    'minutes': 30 // 30 minutes before
                }
            ]
        }
    };
    
    // Add attendee if user email is available
    if (userEmail) {
        event.attendees = [
            {
                'email': userEmail,
                'responseStatus': 'accepted'
            }
        ];
    }
    
    // Add Google Meet link for Premium users
    if (window.taskState && window.taskState.userRole === 'premium') {
        event.conferenceData = {
            'createRequest': {
                'requestId': `task-${task.id}-${Date.now()}`,
                'conferenceSolutionKey': {
                    'type': 'hangoutsMeet'
                }
            }
        };
    }
    
    console.log('[Task] Calendar event object created:', event);
    return event;
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
    
    const hasTaskSelected = !!window.taskState.selectedTaskId;
    
    console.log('[Debug] Connection status:', isConnected);
    console.log('[Debug] Task selected:', hasTaskSelected);
    console.log('[Debug] Selected task ID:', window.taskState.selectedTaskId);
    console.log('[Debug] Task state exists:', !!window.taskState);
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
    window.taskState.selectedTaskId = taskId;
    
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
        window.taskState.tasks = tasks;
        
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
    
    const tasks = window.taskState.tasks;
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

// Force task loading function
async function forceLoadTasks() {
    console.log('[Task] Force loading tasks...');
    
    try {
        // Check authentication
        const user = window.firebaseAuth?.currentUser;
        if (!user) {
            console.error('[Task] No authenticated user');
            showToast('Please log in first', 'warning');
            return;
        }
        
        console.log('[Task] Force loading tasks for user:', user.uid);
        
        // Clear existing listener
        if (window.taskState.unsubscribeListener) {
            window.taskState.unsubscribeListener();
            window.taskState.unsubscribeListener = null;
        }
        
        // Setup new listener
        setupTaskListener();
        
        // Also try manual refresh as backup
        setTimeout(() => {
            if (!window.taskState.tasks || window.taskState.tasks.length === 0) {
                console.log('[Task] No tasks loaded, trying manual refresh...');
                refreshTaskPage();
            }
        }, 2000);
        
    } catch (error) {
        console.error('[Task] Force load error:', error);
        showToast('Failed to load tasks', 'danger');
    }
}

// Expose force load function globally
window.forceLoadTasks = forceLoadTasks;

// Test task creation function for debugging
async function createTestTask() {
    console.log('[Task] Creating test task...');
    
    try {
        const user = window.firebaseAuth?.currentUser;
        if (!user) {
            console.error('[Task] No authenticated user for test task');
            showToast('Please log in first', 'warning');
            return;
        }
        
        const testTask = {
            title: `Test Task ${new Date().toLocaleTimeString()}`,
            description: 'This is a test task created for debugging purposes',
            priority: 'medium',
            status: 'pending',
            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
            inputMethod: 'manual',
            userId: user.uid,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        console.log('[Task] Creating test task:', testTask);
        
        const db = window.firebase?.firestore();
        if (!db) {
            throw new Error('Firestore not available');
        }
        
        const docRef = await db.collection('tasks').add(testTask);
        console.log('[Task] Test task created with ID:', docRef.id);
        
        showToast('Test task created successfully!', 'success');
        
        // Force refresh after a short delay
        setTimeout(() => {
            forceLoadTasks();
        }, 1000);
        
    } catch (error) {
        console.error('[Task] Error creating test task:', error);
        showToast('Failed to create test task', 'danger');
    }
}

// Expose test task function globally
window.createTestTask = createTestTask;

// Update debug status function
function updateDebugStatus() {
    const debugStatus = document.getElementById('debugStatus');
    const authStatus = document.getElementById('authStatus');
    const firebaseStatus = document.getElementById('firebaseStatus');
    const taskCount = document.getElementById('taskCount');
    
    if (!debugStatus) return;
    
    // Show debug status
    debugStatus.style.display = 'block';
    
    // Update auth status
    const user = window.firebaseAuth?.currentUser;
    if (authStatus) {
        if (user) {
            authStatus.textContent = `✅ ${user.email}`;
            authStatus.className = 'text-success';
        } else {
            authStatus.textContent = '❌ Not authenticated';
            authStatus.className = 'text-danger';
        }
    }
    
    // Update Firebase status
    if (firebaseStatus) {
        if (window.firebase && window.firebase.firestore) {
            firebaseStatus.textContent = '✅ Connected';
            firebaseStatus.className = 'text-success';
        } else {
            firebaseStatus.textContent = '❌ Not connected';
            firebaseStatus.className = 'text-danger';
        }
    }
    
    // Update task count
    if (taskCount) {
        const tasks = window.taskState?.tasks || [];
        taskCount.textContent = `Tasks: ${tasks.length}`;
        if (tasks.length > 0) {
            taskCount.className = 'text-success';
        } else {
            taskCount.className = 'text-warning';
        }
    }
}

// Expose debug status function globally
window.updateDebugStatus = updateDebugStatus;

// --- COMPREHENSIVE TASK LOADING FIX ---
// This function bypasses all authentication conflicts and directly loads tasks
async function comprehensiveTaskLoad() {
    console.log('[Task] === COMPREHENSIVE TASK LOADING ===');
    
    try {
        // Wait for Firebase to be available
        let attempts = 0;
        while (!window.firebase && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.firebase) {
            throw new Error('Firebase not available after 5 seconds');
        }
        
        console.log('[Task] Firebase available, checking auth...');
        
        // Try multiple ways to get the current user
        let user = null;
        
        // Method 1: Check window.firebaseAuth
        if (window.firebaseAuth?.currentUser) {
            user = window.firebaseAuth.currentUser;
            console.log('[Task] Found user via window.firebaseAuth:', user.email);
        }
        // Method 2: Check firebase.auth()
        else if (window.firebase?.auth?.currentUser) {
            user = window.firebase.auth().currentUser;
            console.log('[Task] Found user via firebase.auth():', user.email);
        }
        // Method 3: Wait for auth state change
        else {
            console.log('[Task] Waiting for auth state change...');
            user = await new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    console.log('[Task] Auth timeout, resolving with null');
                    resolve(null);
                }, 5000);
                
                const unsubscribe = window.firebase.auth().onAuthStateChanged((authUser) => {
                    clearTimeout(timeout);
                    unsubscribe();
                    console.log('[Task] Auth state changed:', authUser?.email);
                    resolve(authUser);
                });
            });
        }
        
        if (!user) {
            console.error('[Task] No authenticated user found');
            showToast('Please log in to load tasks', 'warning');
            return;
        }
        
        console.log('[Task] User authenticated:', user.email, user.uid);
        
        // Clear any existing listeners
        if (window.taskState?.unsubscribeListener) {
            window.taskState.unsubscribeListener();
            window.taskState.unsubscribeListener = null;
        }
        
        // Initialize task state if not exists
        if (!window.taskState) {
            window.taskState = {
                tasks: [],
                currentPage: 1,
                tasksPerPage: 5,
                filters: {
                    priority: '',
                    status: '',
                    inputMethod: '',
                    recurring: ''
                },
                totalTasks: 0,
                completedTasks: 0,
                pendingTasks: 0,
                highPriorityTasks: 0
            };
        }
        
        // Get Firestore reference
        const db = window.firebase.firestore();
        console.log('[Task] Firestore reference obtained');
        
        // Try to load tasks directly first
        console.log('[Task] Loading tasks directly for user:', user.uid);
        const snapshot = await db.collection('tasks')
            .where('userId', '==', user.uid)
            .orderBy('createdAt', 'desc')
            .get();
        
        const tasks = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            const parseDate = (d) => {
                if (!d) return null;
                if (d instanceof Date) return d;
                if (d.toDate) return d.toDate();
                return new Date(d);
            };
            
            const task = {
                id: doc.id,
                ...data,
                dueDate: parseDate(data.dueDate),
                createdAt: parseDate(data.createdAt),
                updatedAt: parseDate(data.updatedAt),
            };
            
            tasks.push(task);
            console.log('[Task] Loaded task:', task.title);
        });
        
        console.log('[Task] Direct load completed:', tasks.length, 'tasks');
        
        // Update task state
        window.taskState.tasks = tasks;
        window.taskState.currentUser = user;
        
        // Force update all UI components
        console.log('[Task] Updating UI components...');
        
        // Update task summary
        if (typeof updateTaskSummary === 'function') {
            updateTaskSummary(tasks);
        }
        
        // Render task grid
        if (typeof renderTaskGrid === 'function') {
            renderTaskGrid(1);
        }
        
        // Update stats
        if (typeof updateTaskStats === 'function') {
            updateTaskStats(tasks);
        }
        
        if (typeof updateDashboardStats === 'function') {
            updateDashboardStats(tasks);
        }
        
        // Update debug status
        if (typeof updateDebugStatus === 'function') {
            updateDebugStatus();
        }
        
        console.log('[Task] UI updated successfully');
        
        // Show success message
        if (tasks.length > 0) {
            showToast(`Successfully loaded ${tasks.length} tasks!`, 'success');
        } else {
            showToast('No tasks found. Create your first task!', 'info');
            
            // Auto-create a test task if no tasks exist
            setTimeout(async () => {
                console.log('[Task] No tasks found, creating test task...');
                try {
                    await createTestTask();
                } catch (error) {
                    console.error('[Task] Failed to create test task:', error);
                }
            }, 2000);
        }
        
        // Set up real-time listener for future updates
        console.log('[Task] Setting up real-time listener...');
        window.taskState.unsubscribeListener = db.collection('tasks')
            .where('userId', '==', user.uid)
            .orderBy('createdAt', 'desc')
            .onSnapshot(
                (snapshot) => {
                    const updatedTasks = [];
                    snapshot.forEach(doc => {
                        const data = doc.data();
                        const parseDate = (d) => {
                            if (!d) return null;
                            if (d instanceof Date) return d;
                            if (d.toDate) return d.toDate();
                            return new Date(d);
                        };
                        
                        updatedTasks.push({
                            id: doc.id,
                            ...data,
                            dueDate: parseDate(data.dueDate),
                            createdAt: parseDate(data.createdAt),
                            updatedAt: parseDate(data.updatedAt),
                        });
                    });
                    
                    window.taskState.tasks = updatedTasks;
                    console.log('[Task] Real-time update:', updatedTasks.length, 'tasks');
                    
                    // Update UI
                    if (typeof renderTaskGrid === 'function') {
                        renderTaskGrid(1);
                    }
                    if (typeof updateTaskSummary === 'function') {
                        updateTaskSummary(updatedTasks);
                    }
                    if (typeof updateDebugStatus === 'function') {
                        updateDebugStatus();
                    }
                },
                (error) => {
                    console.error('[Task] Real-time listener error:', error);
                }
            );
        
        console.log('[Task] === COMPREHENSIVE TASK LOADING COMPLETED ===');
        
    } catch (error) {
        console.error('[Task] Comprehensive task loading error:', error);
        showToast('Failed to load tasks. Please refresh the page.', 'danger');
    }
}

// Expose comprehensive load function globally
window.comprehensiveTaskLoad = comprehensiveTaskLoad;

// Simple function to check login status and redirect if needed
function checkLoginAndRedirect() {
    console.log('[Task] Checking login status...');
    
    // Check if user is logged in
    const user = window.firebaseAuth?.currentUser || window.firebase?.auth?.currentUser;
    
    if (!user) {
        console.log('[Task] No user logged in, redirecting to login...');
        window.location.href = 'login.html';
        return false;
    }
    
    console.log('[Task] User logged in:', user.email);
    return true;
}

// Expose login check function globally
window.checkLoginAndRedirect = checkLoginAndRedirect;

// Add view mode state
let currentViewMode = 'list'; // 'list' or 'tiles'

// Helper to set tasks per page based on view mode
function getTasksPerPage() {
    // Return 8 for 4x2 tile layout (4 tiles per row, 2 rows) - matching team dashboard
    return 8;
}

// Render task grid (tile view) for Task History section - Matching Team Dashboard
function renderTaskGrid(page = 1) {
    currentTaskPage = page;
    const tasksContainer = document.getElementById('taskGrid');
    const statusIndicator = document.getElementById('taskHistoryStatus');
    const pageInfo = document.getElementById('taskPageInfo');
    const prevPageBtn = document.getElementById('prevTaskPageBtn');
    const nextPageBtn = document.getElementById('nextTaskPageBtn');
    
    if (!tasksContainer) return;
    tasksContainer.innerHTML = '';

    // Defensive: flatten and sort tasks
    let tasks = Array.isArray(window.taskState.tasks) ? [...window.taskState.tasks] : [];
    // Only show tasks with a valid title (filter out test/empty tasks)
    tasks = tasks.filter(t => t.title && t.title.trim() !== '');
    
    // Update status indicator
    if (statusIndicator) {
        if (tasks.length === 0) {
            statusIndicator.className = 'badge bg-warning me-2';
            statusIndicator.innerHTML = '<i class="bi bi-exclamation-triangle me-1"></i>No Tasks';
        } else {
            statusIndicator.className = 'badge bg-success me-2';
            statusIndicator.innerHTML = `<i class="bi bi-check-circle me-1"></i>${tasks.length} Tasks`;
        }
    }
    
    if (!tasks.length) {
        tasksContainer.innerHTML = `
            <div class="text-center py-4">
                <i class="bi bi-inbox text-muted" style="font-size: 2rem;"></i>
                <p class="text-muted mt-2">No tasks found</p>
            </div>
        `;
        
        // Hide pagination controls
        if (pageInfo) pageInfo.style.display = 'none';
        if (prevPageBtn) prevPageBtn.style.display = 'none';
        if (nextPageBtn) nextPageBtn.style.display = 'none';
        return;
    }

    // Apply filters before sorting and pagination
    const { priority, status, inputMethod, date } = window.taskState.filters;
    if (priority) {
        tasks = tasks.filter(t => (t.priority || '').toLowerCase() === priority.toLowerCase());
    }
    if (status) {
        tasks = tasks.filter(t => (t.status || '').toLowerCase() === status.toLowerCase());
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
    if (window.taskState.filters.title) {
        const search = window.taskState.filters.title.trim().toLowerCase();
        if (search) {
            tasks = tasks.filter(t => (t.title || '').toLowerCase().includes(search));
        }
    }
    if (window.taskState.filters.recurring) {
        if (window.taskState.filters.recurring === 'recurring') {
            tasks = tasks.filter(t => t.recurring === true);
        } else if (window.taskState.filters.recurring === 'non-recurring') {
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
    const tasksPerPage = getTasksPerPage();
    const totalPages = Math.ceil(totalTasks / tasksPerPage);
    
    // Ensure current page is within bounds
    if (page > totalPages) {
        page = totalPages;
    }
    if (page < 1) {
        page = 1;
    }
    
    // Update pagination controls
    if (pageInfo) {
        pageInfo.textContent = `Page ${page} of ${totalPages}`;
        pageInfo.style.display = totalPages > 1 ? 'inline-block' : 'none';
    }
    
    if (prevPageBtn) {
        prevPageBtn.disabled = page <= 1;
        prevPageBtn.style.display = totalPages > 1 ? 'inline-block' : 'none';
    }
    
    if (nextPageBtn) {
        nextPageBtn.disabled = page >= totalPages;
        nextPageBtn.style.display = totalPages > 1 ? 'inline-block' : 'none';
    }
    
    const startIdx = (page - 1) * tasksPerPage;
    const endIdx = startIdx + tasksPerPage;
    const pagedTasks = tasks.slice(startIdx, endIdx);

    // Create task grid container
    let tasksHTML = '<div class="task-grid">';
    
    // Render each task as a compact tile
    pagedTasks.forEach(task => {
        const isEditing = window.editingTaskId === task.id;
        
        if (isEditing) {
            // Edit mode tile (keep as before)
            tasksHTML += `
                <div class="card h-100 border-${getPriorityColor(task.priority)}">
                    <div class="card-body p-2">
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
                    </div>
                </div>`;
        } else {
            // Compact tile view - matching team dashboard style exactly
            const statusClass = task.status === 'completed' ? 'completed' : 
                               task.status === 'in-progress' ? 'in-progress' : 'pending';
            
            // Format dates using the same function as team dashboard
            const createdDate = formatDetailedDate(task.createdAt);
            const dueDate = formatDetailedDate(task.dueDate);
            
            // Get input method
            const inputMethod = task.inputMethod || 'manual';
            const inputMethodIcon = getInputMethodIcon(inputMethod);

            // Check if this is a team task and create team task label
            let teamTaskLabel = '';
            let teamName = '';
            let isTeamTask = false;
            
            if (task.teamAssignment && task.teamAssignment.assignedToTeam) {
                isTeamTask = true;
                teamTaskLabel = `<div class="task-tile-team-label">
                    <i class="fas fa-users"></i>
                    <span>Team Task</span>
                </div>`;
                teamName = task.teamAssignment.teamName || 'Unknown Team';
            } else if (task.taskType === 'team' && task.teamId && task.assignedTo) {
                isTeamTask = true;
                teamTaskLabel = `<div class="task-tile-team-label">
                    <i class="fas fa-users"></i>
                    <span>Team Task</span>
                </div>`;
                teamName = task.teamName || 'Unknown Team';
            }

            const isCompleted = task.status === 'completed';
            
            tasksHTML += `
                <div class="task-tile ${statusClass}" data-task-id="${task.id}">
                    ${teamTaskLabel}
                    <div class="task-tile-header">
                        <div class="task-tile-input-method ${inputMethod}">
                            <i class="fas ${inputMethodIcon}"></i>
                            <span>${inputMethod}</span>
                        </div>
                        <div class="task-tile-priority priority-${task.priority || 'medium'}">${task.priority || 'Medium'}</div>
                    </div>
                    <div class="task-tile-title-section">
                        <h6 class="task-tile-title ${isCompleted ? 'completed' : ''}">${escapeHtml(task.title || '(No Title)')}</h6>
                    </div>
                    <div class="task-tile-description ${isCompleted ? 'completed' : ''}">${escapeHtml(truncate(task.description || 'No description', 80))}</div>
                    <div class="task-tile-dates">
                        <div class="task-date-item">
                            <i class="fas fa-calendar-alt text-warning"></i>
                            <span class="task-date-label">Due:</span>
                            <span class="task-date-value">${dueDate || 'No due date'}</span>
                        </div>
                        <div class="task-date-item">
                            <i class="fas fa-calendar-plus text-primary"></i>
                            <span class="task-date-label">Created:</span>
                            <span class="task-date-value">${createdDate}</span>
                        </div>
                    </div>
                    <div class="task-tile-meta">
                        ${isTeamTask ? `<div class="task-tile-team-name">
                            <i class="fas fa-users"></i>
                            <span>${teamName}</span>
                        </div>` : ''}
                        <span class="task-tile-status status-${task.status || 'pending'}">${getStatusDisplayText(task.status)}</span>
                    </div>
                    <div class="task-tile-actions">
                            <button class="status-toggle-btn ${task.status || 'pending'}" 
                                    onclick="toggleTaskStatus('${task.id}', '${task.status || 'pending'}')" 
                                    oncontextmenu="showStatusDropdown('${task.id}', '${task.status || 'pending'}', event); return false;"
                                    title="Click to toggle status, Right-click for options">
                                <i class="fas ${task.status === 'completed' ? 'fa-check-circle' : task.status === 'in-progress' ? 'fa-clock' : 'fa-circle'}"></i>
                            </button>
                            <button class="edit-task-btn" onclick="editTask('${task.id}')" title="Edit Task">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="delete-task-btn" onclick="confirmDeleteTask('${task.id}', '${escapeHtml(task.title)}')" title="Delete Task">
                                <i class="fas fa-trash"></i>
                            </button>
                            ${window.editingTaskId === task.id ? `
                                <button class="cancel-edit-btn" onclick="cancelEdit()" title="Cancel Edit">
                                    <i class="fas fa-times"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>`;
        }
    });
    
    tasksHTML += '</div>';
    
    // Add enhanced pagination at the bottom
    if (totalPages > 1) {
        tasksHTML += `
            <div class="mt-4">
                <nav aria-label="Task pagination" class="d-flex justify-content-center align-items-center">
                    <ul class="pagination pagination-sm mb-0" style="flex-wrap: wrap; justify-content: center; gap: 0.25rem;">
                        <!-- First Page -->
                        <li class="page-item ${page === 1 ? 'disabled' : ''}">
                            <a class="page-link" href="#" onclick="event.preventDefault(); renderTaskGrid(1);" title="First Page">
                                <i class="fas fa-angle-double-left"></i>
                            </a>
                        </li>
                        <!-- Previous Page -->
                        <li class="page-item ${page === 1 ? 'disabled' : ''}">
                            <a class="page-link" href="#" onclick="event.preventDefault(); renderTaskGrid(${page - 1});" title="Previous Page">
                                <i class="fas fa-chevron-left"></i>
                            </a>
                        </li>`;
        
        // Page numbers with smart truncation
        const maxVisiblePages = 7;
        let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        // Add ellipsis before if needed
        if (startPage > 1) {
            tasksHTML += `
                <li class="page-item disabled">
                    <span class="page-link">...</span>
                </li>`;
        }
        
        // Page numbers
        for (let i = startPage; i <= endPage; i++) {
            tasksHTML += `
                <li class="page-item ${i === page ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="event.preventDefault(); renderTaskGrid(${i});">${i}</a>
                </li>`;
        }
        
        // Add ellipsis after if needed
        if (endPage < totalPages) {
            tasksHTML += `
                <li class="page-item disabled">
                    <span class="page-link">...</span>
                </li>`;
        }
        
        tasksHTML += `
                        <!-- Next Page -->
                        <li class="page-item ${page === totalPages ? 'disabled' : ''}">
                            <a class="page-link" href="#" onclick="event.preventDefault(); renderTaskGrid(${page + 1});" title="Next Page">
                                <i class="fas fa-chevron-right"></i>
                            </a>
                        </li>
                        <!-- Last Page -->
                        <li class="page-item ${page === totalPages ? 'disabled' : ''}">
                            <a class="page-link" href="#" onclick="event.preventDefault(); renderTaskGrid(${totalPages});" title="Last Page">
                                <i class="fas fa-angle-double-right"></i>
                            </a>
                        </li>
                    </ul>
                    <!-- Page Info -->
                    <div class="ms-3 text-muted small">
                        Page ${page} of ${totalPages} (${totalTasks} tasks)
                    </div>
                </nav>
            </div>`;
    }
    
    tasksContainer.innerHTML = tasksHTML;
    
    // Add event listeners for checkboxes and other interactions
    addTaskEventListeners();
}

// Helper function to format detailed dates (same as team dashboard)
function formatDetailedDate(dateString) {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // Format the date
    const formattedDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
    
    // Add relative time for recent dates
    if (diffDays === 0) {
        return `${formattedDate} (Today)`;
    } else if (diffDays === 1) {
        return `${formattedDate} (Yesterday)`;
    } else if (diffDays < 7) {
        return `${formattedDate} (${diffDays} days ago)`;
    } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return `${formattedDate} (${weeks} week${weeks > 1 ? 's' : ''} ago)`;
    } else {
        return formattedDate;
    }
}

// Helper function to escape HTML to prevent XSS (already defined above)
// function escapeHtml(text) {
//     if (!text) return '';
//     const div = document.createElement('div');
//     div.textContent = text;
//     return div.innerHTML;
// }

// Helper function to get input method icon (same as team dashboard)
function getInputMethodIcon(inputMethod) {
    switch (inputMethod) {
        case 'voice':
            return 'fa-microphone';
        case 'import':
            return 'fa-file-import';
        case 'template':
            return 'fa-layer-group';
        case 'manual':
        default:
            return 'fa-edit';
    }
}

// Function to toggle task status
async function toggleTaskStatus(taskId, currentStatus) {
    try {
        console.log('[Task] Toggling status for task:', taskId, 'Current status:', currentStatus);
        
        // Determine new status based on current status
        let newStatus;
        switch (currentStatus) {
            case 'pending':
                newStatus = 'in-progress';
                break;
            case 'in-progress':
                newStatus = 'completed';
                break;
            case 'completed':
                newStatus = 'pending';
                break;
            default:
                newStatus = 'pending';
        }
        
        await updateTaskStatus(taskId, newStatus);
        
    } catch (error) {
        console.error('[Task] Error toggling task status:', error);
        showToast('Error updating task status. Please try again.', 'danger');
    }
}

// Function to update task status
async function updateTaskStatus(taskId, newStatus) {
    try {
        console.log('[Task] Updating status for task:', taskId, 'New status:', newStatus);
        
        // Update the task in Firebase
        const taskRef = firebase.firestore().collection('tasks').doc(taskId);
        await taskRef.update({
            status: newStatus,
            updatedAt: new Date()
        });
        
        console.log('[Task] Status updated successfully to:', newStatus);
        showToast(`Task status updated to ${newStatus}`, 'success');
        
        // Refresh the task grid to show updated status
        renderTaskGrid(currentTaskPage || 1);
        
    } catch (error) {
        console.error('[Task] Error updating task status:', error);
        showToast('Error updating task status. Please try again.', 'danger');
    }
}

// Function to show status change dropdown
function showStatusDropdown(taskId, currentStatus, event) {
    event.stopPropagation();
    
    // Remove any existing dropdowns
    document.querySelectorAll('.status-dropdown').forEach(dropdown => dropdown.remove());
    
    const statuses = ['pending', 'in-progress', 'completed'];
    const statusLabels = {
        'pending': '⏸️ Pending',
        'in-progress': '⏳ In Progress', 
        'completed': '✔️ Completed'
    };
    
    const dropdown = document.createElement('div');
    dropdown.className = 'status-dropdown';
    dropdown.style.cssText = `
        position: absolute;
        top: 100%;
        right: 0;
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 1000;
        min-width: 120px;
        overflow: hidden;
    `;
    
    statuses.forEach(status => {
        const item = document.createElement('div');
        item.className = 'status-dropdown-item';
        item.style.cssText = `
            padding: 0.5rem 0.75rem;
            cursor: pointer;
            transition: background-color 0.2s ease;
            border-bottom: 1px solid #f1f5f9;
            font-size: 0.8rem;
            ${status === currentStatus ? 'background-color: #f8fafc; font-weight: 600;' : ''}
        `;
        item.textContent = statusLabels[status];
        
        item.addEventListener('click', async () => {
            await updateTaskStatus(taskId, status);
            dropdown.remove();
        });
        
        item.addEventListener('mouseenter', () => {
            if (status !== currentStatus) {
                item.style.backgroundColor = '#f1f5f9';
            }
        });
        
        item.addEventListener('mouseleave', () => {
            if (status !== currentStatus) {
                item.style.backgroundColor = 'transparent';
            }
        });
        
        dropdown.appendChild(item);
    });
    
    // Position the dropdown relative to the button
    const button = event.target.closest('.status-toggle-btn');
    if (button) {
        button.style.position = 'relative';
        button.appendChild(dropdown);
    }
    
    // Close dropdown when clicking outside
    setTimeout(() => {
        document.addEventListener('click', function closeDropdown(e) {
            if (!dropdown.contains(e.target) && !button.contains(e.target)) {
                dropdown.remove();
                document.removeEventListener('click', closeDropdown);
            }
        });
    }, 0);
}

// Function to edit task
function editTask(taskId) {
    try {
        console.log('[Task] Editing task:', taskId);
        
        // Find the task in the current state
        const task = window.taskState.tasks.find(t => t.id === taskId);
        if (!task) {
            console.error('[Task] Task not found:', taskId);
            showToast('Task not found.', 'error');
            return;
        }
        
        console.log('[Task] Found task for editing:', task);
        
        // Set the task as editing
        window.editingTaskId = taskId;
        
        // Populate the form with task data
        const titleInput = document.getElementById('taskTitle');
        const descriptionInput = document.getElementById('taskDescription');
        const dueDateInput = document.getElementById('taskDueDate');
        const prioritySelect = document.getElementById('taskPriority');
        const statusSelect = document.getElementById('taskStatus');
        const inputMethodSelect = document.getElementById('taskInputMethod');
        
        console.log('[Task] Form elements found:', {
            titleInput: !!titleInput,
            descriptionInput: !!descriptionInput,
            dueDateInput: !!dueDateInput,
            prioritySelect: !!prioritySelect,
            statusSelect: !!statusSelect,
            inputMethodSelect: !!inputMethodSelect
        });
        
        if (titleInput) titleInput.value = task.title || '';
        if (descriptionInput) descriptionInput.value = task.description || '';
        if (dueDateInput) {
            const dueDate = task.dueDate ? new Date(task.dueDate) : null;
            dueDateInput.value = dueDate ? dueDate.toISOString().slice(0, 16) : '';
        }
        if (prioritySelect) prioritySelect.value = task.priority || 'medium';
        if (statusSelect) statusSelect.value = task.status || 'pending';
        if (inputMethodSelect) inputMethodSelect.value = task.inputMethod || 'manual';
        
        // Update form button text
        const submitBtn = document.getElementById('submitTaskBtn');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="bi bi-pencil me-1"></i>Update Task';
            submitBtn.classList.remove('btn-primary');
            submitBtn.classList.add('btn-warning');
            console.log('[Task] Submit button updated for edit mode');
        }
        
        // Show cancel button
        const cancelBtn = document.getElementById('cancelEditBtn');
        if (cancelBtn) {
            cancelBtn.style.display = 'inline-block';
            console.log('[Task] Cancel button shown');
        }
        
        // Scroll to form
        const form = document.getElementById('taskForm');
        if (form) {
            form.scrollIntoView({ behavior: 'smooth', block: 'center' });
            console.log('[Task] Scrolled to form');
        }
        
        showToast('Task loaded for editing. Update the fields and click "Update Task".', 'info');
        
    } catch (error) {
        console.error('[Task] Error editing task:', error);
        showToast('Error loading task for editing. Please try again.', 'danger');
    }
}

// Function to cancel editing
function cancelEdit() {
    try {
        console.log('[Task] Canceling edit mode');
        
        // Clear editing state
        window.editingTaskId = null;
        
        // Reset form
        const form = document.getElementById('taskForm');
        if (form) form.reset();
        
        // Reset form button
        const submitBtn = document.getElementById('submitTaskBtn');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="bi bi-plus-circle me-1"></i>Add Task';
            submitBtn.classList.remove('btn-warning');
            submitBtn.classList.add('btn-primary');
        }
        
        // Hide cancel button
        const cancelBtn = document.getElementById('cancelEditBtn');
        if (cancelBtn) {
            cancelBtn.style.display = 'none';
        }
        
        // Refresh task grid to hide cancel buttons in tiles
        if (typeof renderTaskGrid === 'function') {
            renderTaskGrid(currentTaskPage || 1);
        }
        
        showToast('Edit mode canceled.', 'info');
        
    } catch (error) {
        console.error('[Task] Error canceling edit:', error);
    }
}

// Make functions globally available
window.toggleTaskStatus = toggleTaskStatus;
window.updateTaskStatus = updateTaskStatus;
window.showStatusDropdown = showStatusDropdown;
window.editTask = editTask;
window.cancelEdit = cancelEdit;
window.confirmDeleteTask = confirmDeleteTask;
window.toggleViewMode = toggleViewMode;
window.toggleTaskHistory = toggleTaskHistory;

// Debug function to test button functionality
window.testTaskButtons = function() {
    console.log('[Debug] Testing task button functionality...');
    console.log('[Debug] Available functions:', {
        toggleTaskStatus: typeof window.toggleTaskStatus,
        editTask: typeof window.editTask,
        confirmDeleteTask: typeof window.confirmDeleteTask,
        cancelEdit: typeof window.cancelEdit
    });
    
    // Check if there are any tasks
    const tasks = window.taskState?.tasks || [];
    console.log('[Debug] Number of tasks:', tasks.length);
    
    if (tasks.length > 0) {
        const firstTask = tasks[0];
        console.log('[Debug] First task:', firstTask);
        console.log('[Debug] Task ID:', firstTask.id);
        console.log('[Debug] Task title:', firstTask.title);
    }
    
    // Check if buttons exist in the DOM
    const statusButtons = document.querySelectorAll('.status-toggle-btn');
    const editButtons = document.querySelectorAll('.edit-task-btn');
    const deleteButtons = document.querySelectorAll('.delete-task-btn');
    
    console.log('[Debug] Buttons found:', {
        statusButtons: statusButtons.length,
        editButtons: editButtons.length,
        deleteButtons: deleteButtons.length
    });
    
    return {
        functions: {
            toggleTaskStatus: typeof window.toggleTaskStatus,
            editTask: typeof window.editTask,
            confirmDeleteTask: typeof window.confirmDeleteTask
        },
        tasks: tasks.length,
        buttons: {
            status: statusButtons.length,
            edit: editButtons.length,
            delete: deleteButtons.length
        }
    };
};

// Task History Toggle Function
function toggleTaskHistory() {
    const toggle = document.getElementById('taskHistoryToggle');
    const taskGrid = document.getElementById('taskGrid');
    const taskList = document.getElementById('taskList');
    const taskFilters = document.querySelector('.task-filters');
    
    if (toggle && toggle.checked) {
        // Show task history
        if (taskGrid) taskGrid.style.display = 'block';
        if (taskList) taskList.style.display = 'block';
        if (taskFilters) taskFilters.style.display = 'flex';
        console.log('[Task] Task History shown');
        showToast('Task History is now visible', 'success');
        // Save state to localStorage
        localStorage.setItem('taskHistoryVisible', 'true');
    } else {
        // Hide task history
        if (taskGrid) taskGrid.style.display = 'none';
        if (taskList) taskList.style.display = 'none';
        if (taskFilters) taskFilters.style.display = 'none';
        console.log('[Task] Task History hidden');
        showToast('Task History is now hidden', 'info');
        // Save state to localStorage
        localStorage.setItem('taskHistoryVisible', 'false');
    }
}

// View Mode Toggle Function
function toggleViewMode() {
    const viewModeBtn = document.getElementById('viewModeToggle');
    const taskList = document.getElementById('taskList');
    const taskGrid = document.getElementById('taskGrid');
    
    // Get current view mode from button text or default to list
    const currentText = viewModeBtn ? viewModeBtn.innerHTML : '';
    const isTileView = currentText.includes('List View');
    
    if (isTileView) {
        // Switch to tile view
        if (viewModeBtn) viewModeBtn.innerHTML = '<i class="bi bi-list-ul me-1"></i>List View';
        if (taskList) taskList.style.display = 'none';
        if (taskGrid) taskGrid.style.display = 'block';
        console.log('[Task] Switched to tile view');
        renderTaskGrid(currentTaskPage || 1);
    } else {
        // Switch to list view
        if (viewModeBtn) viewModeBtn.innerHTML = '<i class="bi bi-grid-3x3-gap me-1"></i>Tile View';
        if (taskList) taskList.style.display = 'block';
        if (taskGrid) taskGrid.style.display = 'none';
        console.log('[Task] Switched to list view');
        renderTasks(currentTaskPage || 1);
    }
}

// Pagination functions for task history (matching team dashboard)
function nextTaskPage() {
    const currentPage = currentTaskPage || 1;
    const tasks = Array.isArray(window.taskState.tasks) ? window.taskState.tasks : [];
    const totalPages = Math.ceil(tasks.length / getTasksPerPage());
    
    if (currentPage < totalPages) {
        renderTaskGrid(currentPage + 1);
    }
}

function previousTaskPage() {
    const currentPage = currentTaskPage || 1;
    
    if (currentPage > 1) {
        renderTaskGrid(currentPage - 1);
    }
}

// Filter functions for task history (matching team dashboard)
function applyTaskFilters() {
    const priority = document.getElementById('filterPriority')?.value || '';
    const status = document.getElementById('filterStatus')?.value || '';
    const inputMethod = document.getElementById('filterInputMethod')?.value || '';
    const recurring = document.getElementById('filterRecurring')?.value || '';
    const taskType = document.getElementById('filterTaskType')?.value || '';
    
    // Update filters in taskState
    window.taskState.filters = {
        ...window.taskState.filters,
        priority,
        status,
        inputMethod,
        recurring,
        taskType
    };
    
    // Reset to first page and re-render
    renderTaskGrid(1);
}

function clearTaskFilters() {
    // Reset all filter selects
    const filterSelects = ['filterPriority', 'filterStatus', 'filterInputMethod', 'filterRecurring', 'filterTaskType'];
    filterSelects.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.value = '';
    });
    
    // Clear filters in taskState
    window.taskState.filters = {
        title: window.taskState.filters.title || '',
        date: window.taskState.filters.date || ''
    };
    
    // Reset to first page and re-render
    renderTaskGrid(1);
}

// Helper function to get status display text
function getStatusDisplayText(status) {
    switch (status?.toLowerCase()) {
        case 'completed': return '✔️ Completed';
        case 'in-progress': return '⏳ In Progress';
        case 'pending': return '⏸️ Pending';
        case 'not-started': return '📋 Not Started';
        default: return '📋 Pending';
    }
}

// Helper function to get status color
function getStatusColor(status) {
    switch (status?.toLowerCase()) {
        case 'completed': return 'success';
        case 'in-progress': return 'warning';
        case 'pending': return 'info';
        case 'not-started': return 'secondary';
        default: return 'info';
    }
}



// Add task event listeners for both list and grid views
function addTaskEventListeners() {
    // Task completion event listeners (dropdown items)
    document.querySelectorAll('.task-complete-checkbox').forEach(item => {
        item.addEventListener('click', async function(e) {
            e.preventDefault();
            const taskId = this.getAttribute('data-task-id');
            
            try {
                const task = window.taskState.tasks.find(t => t.id === taskId);
                if (task) {
                    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
                    const updatedTask = { ...task, status: newStatus };
                    await updateTask(taskId, updatedTask);
                    showToast(`Task ${newStatus === 'completed' ? 'completed' : 'marked as pending'}`, 'success');
                }
            } catch (error) {
                console.error('Error updating task status:', error);
                showToast('Error updating task status', 'danger');
            }
        });
    });

    // Edit task event listeners
    document.querySelectorAll('.edit-task-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const taskId = this.getAttribute('data-task-id');
            window.editingTaskId = taskId;
            // Re-render the current view
            renderTaskGrid(currentTaskPage);
        });
    });

    // Delete task event listeners
    document.querySelectorAll('.delete-task-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const taskId = this.getAttribute('data-task-id');
            const taskTitle = this.getAttribute('data-task-title');
            confirmDeleteTask(taskId, taskTitle);
        });
    });

    // Cancel edit event listeners
    document.querySelectorAll('.cancel-edit').forEach(btn => {
        btn.addEventListener('click', function() {
            window.editingTaskId = null;
            // Re-render the current view
            renderTaskGrid(currentTaskPage);
        });
    });

    // Save edit event listeners
    document.querySelectorAll('.save-edit').forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.preventDefault();
            const form = this.closest('.edit-task-form');
            const taskId = window.editingTaskId;
            if (!taskId || !form) return;
            try {
                const formData = new FormData(form);
                const updatedTask = {
                    title: formData.get('title'),
                    description: formData.get('description'),
                    dueDate: formData.get('dueDate'),
                    priority: formData.get('priority'),
                    status: formData.get('status'),
                    inputMethod: formData.get('inputMethod'),
                    tags: formData.get('tags').split(',').map(tag => tag.trim()).filter(tag => tag)
                };
                await updateTask(taskId, updatedTask);
                window.editingTaskId = null;
                showToast('Task updated successfully', 'success');
                // Re-render the current view
                renderTaskGrid(currentTaskPage);
            } catch (error) {
                console.error('Error updating task:', error);
                showToast('Error updating task', 'danger');
            }
        });
    });

    // Sync recurring task event listeners
    document.querySelectorAll('.sync-recurring-task-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const taskId = this.getAttribute('data-task-id');
            const taskTitle = this.getAttribute('data-task-title');
            syncRecurringTaskToGoogleCalendar(taskId, taskTitle);
        });
    });
}

// Expose functions globally
window.renderTaskGrid = renderTaskGrid;
window.initializeViewMode = initializeViewMode;
window.nextTaskPage = nextTaskPage;
window.previousTaskPage = previousTaskPage;
window.applyTaskFilters = applyTaskFilters;
window.clearTaskFilters = clearTaskFilters;
window.formatDetailedDate = formatDetailedDate;
window.getInputMethodIcon = getInputMethodIcon;
window.getStatusDisplayText = getStatusDisplayText;
window.getTasksPerPage = getTasksPerPage;

// Initialize view mode (tiles only)
function initializeViewMode() {
    const taskGrid = document.getElementById('taskGrid');
    
    console.log('Initializing view mode (tiles only)...');
    console.log('TaskGrid element:', taskGrid);
    
    if (taskGrid) {
        // Set initial state to show tiles
        taskGrid.style.display = 'block';
        console.log('View mode initialized: Tile view only');
    } else {
        console.warn('TaskGrid element not found for view mode initialization');
    }
}

// Test function to manually set premium user role
window.testPremiumUser = function() {
    console.log('[Task] Testing premium user role...');
    window.userRole = 'premium';
    userRole = 'premium';
    document.body.classList.add('premium-user');
    
    // Update premium banner display
    updatePremiumBannerDisplay();
    
    // Initialize premium features
    if (typeof initializePremiumFeatures === 'function') {
        initializePremiumFeatures();
    }
    if (typeof enablePremiumFeatures === 'function') {
        enablePremiumFeatures();
    }
    
    showToast('Premium user role set for testing', 'success');
    console.log('[Task] Premium user role set for testing');
};

// Function to check current user role and premium status
window.checkPremiumStatus = async function() {
    try {
        console.log('=== PREMIUM STATUS CHECK ===');
        console.log('Current userRole variable:', userRole);
        console.log('Current window.userRole:', window.userRole);
        console.log('Body has premium-user class:', document.body.classList.contains('premium-user'));
        
        if (window.taskState.currentUser) {
            console.log('User authenticated:', window.taskState.currentUser.email);
            console.log('User UID:', window.taskState.currentUser.uid);
            
            const db = window.firebaseDb;
            const userDoc = await db.collection('users').doc(window.taskState.currentUser.uid).get();
            console.log('User document exists:', userDoc.exists);
            if (userDoc.exists) {
                const userData = userDoc.data();
                console.log('User document data:', userData);
                console.log('User role in database:', userData.role);
                console.log('User premium status:', userData.premium);
            }
        } else {
            console.log('No authenticated user found');
        }
        
        // Check premium features visibility
        const premiumBanner = document.getElementById('premiumBanner');
        const calendarSection = document.getElementById('calendarIntegrationSection');
        const upgradeBtn = document.getElementById('upgradePremiumBtn');
        
        console.log('Premium banner visible:', premiumBanner && !premiumBanner.classList.contains('d-none'));
        console.log('Calendar section visible:', calendarSection && !calendarSection.classList.contains('d-none'));
        console.log('Upgrade button visible:', upgradeBtn && upgradeBtn.style.display !== 'none');
        
    } catch (error) {
        console.error('Error checking premium status:', error);
    }
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
        
        // Hide premium overlays for premium users
        const calendarSection = document.getElementById('calendarIntegrationSection');
        if (calendarSection) {
            const calendarOverlay = calendarSection.querySelector('.premium-overlay');
            if (calendarOverlay) {
                calendarOverlay.style.display = 'none';
                console.log('[Task] Hidden Google Calendar premium overlay in updatePremiumBannerDisplay');
            }
        }
        
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

// Function to force hide all premium overlays
window.forceHidePremiumOverlays = function() {
    console.log('[Task] Force hiding all premium overlays...');
    
    // Hide Google Calendar premium overlay
    const calendarSection = document.getElementById('calendarIntegrationSection');
    if (calendarSection) {
        const calendarOverlay = calendarSection.querySelector('.premium-overlay');
        if (calendarOverlay) {
            calendarOverlay.style.display = 'none';
            console.log('[Task] Hidden Google Calendar premium overlay');
        }
    }
    
    // Hide Telegram premium overlay
    const telegramOverlay = document.getElementById('telegramPremiumOverlay');
    if (telegramOverlay) {
        telegramOverlay.style.display = 'none';
        console.log('[Task] Hidden Telegram premium overlay');
    }
    
    // Hide multilingual voice premium overlay
    const multilingualOverlay = document.getElementById('multilingualPremiumOverlay');
    if (multilingualOverlay) {
        multilingualOverlay.style.display = 'none';
        console.log('[Task] Hidden multilingual voice premium overlay');
    }
    
    // Hide team assignment premium overlay
    const teamAssignmentOverlay = document.getElementById('teamAssignmentPremiumOverlay');
    if (teamAssignmentOverlay) {
        teamAssignmentOverlay.style.display = 'none';
        console.log('[Task] Hidden team assignment premium overlay');
    }
    
    console.log('[Task] All premium overlays hidden');
};

// Function to test premium overlay hiding
window.testPremiumOverlayHiding = function() {
    console.log('[Task] Testing premium overlay hiding...');
    
    // Check if user is premium
    if (window.userRole === 'premium') {
        console.log('[Task] User is premium, hiding overlays...');
        window.forceHidePremiumOverlays();
        showToast('Premium overlays hidden successfully!', 'success');
    } else {
        console.log('[Task] User is not premium, setting as premium for test...');
        window.userRole = 'premium';
        document.body.classList.add('premium-user');
        window.forceHidePremiumOverlays();
        showToast('Test: Premium overlays hidden!', 'success');
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
    // TEMPORARILY DISABLED due to CORS issues with Firebase Cloud Function
    console.log('[Task] Telegram integration temporarily disabled due to CORS issues');
    return;
    
    // Original code commented out until CORS is fixed:
    /*
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
    */
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
    // TEMPORARILY DISABLED due to CORS issues with Firebase Cloud Function
    // This is a server-side configuration issue that needs to be fixed in the Cloud Function
    console.log('[Task] Telegram status check temporarily disabled due to CORS issues');
    return;
    
    // Original code commented out until CORS is fixed:
    /*
    try {
        // Wait for Firebase to be initialized
        if (window.firebaseInitialized) {
            await window.firebaseInitialized;
        }
        
        // NOTE: This function may fail due to CORS issues with the Firebase Cloud Function
        // This is a server-side configuration issue and doesn't affect core functionality
        
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
    */
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
        window.userRole = userDoc.exists ? userDoc.data().role || 'free' : 'free';
        
        console.log('[MultilingualVoice] User role:', window.userRole);
        
        // Get UI elements
        const multilingualSection = document.getElementById('multilingualVoiceSection');
        const upgradePrompt = document.getElementById('voiceUpgradePrompt');
        
        if (!multilingualSection || !upgradePrompt) {
            console.warn('[MultilingualVoice] Required UI elements not found');
            return;
        }
        
        if (window.userRole === 'premium') {
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

// Placeholder function for view mode toggle (if needed)
function toggleViewMode() {
    console.log('[Task] toggleViewMode called - placeholder function');
    // This function can be implemented if view mode toggle is needed
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
        
        // Initialize premium features
        initCalendarIntegration();
        
        // Enable all premium features
        enablePremiumFeatures();
        
    } else {
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
    
    // Enable Google Calendar integration and hide its premium overlay
    const calendarSection = document.getElementById('calendarIntegrationSection');
    if (calendarSection) {
        calendarSection.style.display = 'block';
        calendarSection.style.opacity = '1';
        calendarSection.style.pointerEvents = 'auto';
        
        // Hide the static premium overlay for premium users
        const calendarOverlay = calendarSection.querySelector('.premium-overlay');
        if (calendarOverlay) {
            calendarOverlay.style.display = 'none';
            console.log('[Task] Hidden Google Calendar premium overlay for premium user');
        }
        
        // Remove any dynamic upgrade overlays that might have been added
        const dynamicOverlay = calendarSection.querySelector('.premium-upgrade-overlay');
        if (dynamicOverlay) {
            dynamicOverlay.remove();
        }
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
    
    // Enable team assignment section and hide its premium overlay
    const teamAssignmentSection = document.getElementById('teamAssignmentSection');
    if (teamAssignmentSection) {
        teamAssignmentSection.style.display = 'block';
        teamAssignmentSection.style.opacity = '1';
        teamAssignmentSection.style.pointerEvents = 'auto';
        
        // Hide the static premium overlay for premium users
        const teamAssignmentOverlay = document.getElementById('teamAssignmentPremiumOverlay');
        if (teamAssignmentOverlay) {
            teamAssignmentOverlay.style.display = 'none';
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
    
    // Show team assignment section but disable it (do NOT add overlay, static overlay exists in HTML)
    const teamAssignmentSection = document.getElementById('teamAssignmentSection');
    if (teamAssignmentSection) {
        teamAssignmentSection.style.display = 'block';
        teamAssignmentSection.style.opacity = '0.6';
        teamAssignmentSection.style.pointerEvents = 'none';
        // Do NOT call addUpgradeOverlay(teamAssignmentSection, ...)
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

// Initialize task page when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('[Task] DOM loaded, initializing task page...');
    
    // Initialize task manager first (this sets up the Firestore listener)
    initTaskManager();
    
    // Initialize view mode immediately
    initializeViewMode();
    
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
















