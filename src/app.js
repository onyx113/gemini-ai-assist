import axios from 'axios';

/**
 * @fileoverview 
 * @author onyx
 * @version 2.0.0
 */

// =================================================================================
// 1. CONFIGURATION MODULE
// =================================================================================

const config = {
    // API and URL constants
    API_KEY: import.meta.env.VITE_GEMINI_API_KEY,
    API_BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/models/',

    // DOM element selectors
    selectors: {
        promptInput: '#promptInput',
        submitButton: '#submitButton',
        responseArea: '#responseArea',
        loadingIndicator: '#loadingIndicator',
        modelSelect: '#modelSelect',
        themeToggle: '#theme-toggle',
        themeToggleDarkIcon: '#theme-toggle-dark-icon',
        themeToggleLightIcon: '#theme-toggle-light-icon',
    },

    // CSS color variables
    colors: {
        primary: '--text-primary',
        orange: '--text-orange',
        red: '--text-red',
        yellow: '--text-yellow',
    },

    // CSS classes for state management
    classes: {
        hidden: 'hidden',
        disabledOpacity: 'opacity-50',
        disabledCursor: 'cursor-not-allowed',
        inputLoading: ['opacity-70', 'dark:opacity-60'],
    },
};

// =================================================================================
// 2. THEME MANAGEMENT MODULE
// =================================================================================

const ThemeManager = {
    init() {
        this.toggleButton = document.querySelector(config.selectors.themeToggle);
        this.darkIcon = document.querySelector(config.selectors.themeToggleDarkIcon);
        this.lightIcon = document.querySelector(config.selectors.themeToggleLightIcon);
        
        if (!this.toggleButton || !this.darkIcon || !this.lightIcon) return;

        this.toggleButton.addEventListener('click', () => this.toggleTheme());
        this.loadInitialTheme();
    },

    toggleTheme() {
        const isCurrentlyDark = document.documentElement.classList.contains('dark');
        this.applyTheme(!isCurrentlyDark);
    },
    
    applyTheme(isDark) {
        document.documentElement.classList.toggle('dark', isDark);
        this.lightIcon.classList.toggle(config.classes.hidden, !isDark);
        this.darkIcon.classList.toggle(config.classes.hidden, isDark);
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    },

    loadInitialTheme() {
        const storedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const initialThemeIsDark = storedTheme ? storedTheme === 'dark' : prefersDark;
        this.applyTheme(initialThemeIsDark);
    },
};

// =================================================================================
// 3. UI MANAGEMENT MODULE
// =================================================================================

const UIManager = {
    init() {
        // Cache all DOM elements
        for (const key in config.selectors) {
            this[key] = document.querySelector(config.selectors[key]);
        }
        
        if (!this.promptInput || !this.submitButton) return;
        
        this.maxTextareaHeight = parseInt(getComputedStyle(this.promptInput).maxHeight, 10);

        this.promptInput.addEventListener('input', () => {
            this.updateTextareaHeight();
            this.updateSubmitButtonState();
        });
        
        // Initial state update
        this.updateSubmitButtonState();
    },

    updateTextareaHeight() {
        this.promptInput.style.height = 'auto';
        const newHeight = Math.min(this.promptInput.scrollHeight, this.maxTextareaHeight);
        this.promptInput.style.height = `${newHeight}px`;
        this.promptInput.style.overflowY = this.promptInput.scrollHeight > this.maxTextareaHeight ? 'auto' : 'hidden';
    },

    updateSubmitButtonState() {
        const hasText = this.promptInput.value.trim().length > 0;
        this.submitButton.disabled = !hasText;
    },

    /**
     * Sets the loading state for the UI.
     * @param {boolean} isLoading - Whether the UI should be in a loading state.
     */
    setLoadingState(isLoading) {
        this.loadingIndicator.style.display = isLoading ? 'flex' : 'none';
        this.submitButton.disabled = isLoading;
        this.promptInput.disabled = isLoading;

        this.submitButton.classList.toggle(config.classes.disabledOpacity, isLoading);
        this.submitButton.classList.toggle(config.classes.disabledCursor, isLoading);
        this.promptInput.classList.toggle(...config.classes.inputLoading, isLoading);
        
        // After loading, re-evaluate button state based on text content
        if (!isLoading) {
            this.updateSubmitButtonState();
        }
    },
    
    /**
     * Displays a message in the response area.
     * @param {string} text - The message to display.
     * @param {string} colorVar - The CSS variable for the text color.
     */
    showMessage(text, colorVar = config.colors.primary) {
        this.responseArea.textContent = text;
        this.responseArea.style.color = `var(${colorVar})`;
    },

    clearResponse() {
        this.showMessage('', config.colors.primary);
    },

    getPrompt() {
        return this.promptInput.value.trim();
    },

    getSelectedModel() {
        return this.modelSelect.value;
    }
};

// =================================================================================
// 4. API SERVICE MODULE
// =================================================================================

const ApiService = {
    /**
     * Sends a prompt to the Gemini API.
     * @param {string} promptText - The user's prompt.
     * @param {string} model - The model to use (e.g., 'gemini-pro').
     * @returns {Promise<object>} The API response data.
     */
    async generateContent(promptText, model) {
        const url = `${config.API_BASE_URL}${model}:generateContent?key=${config.API_KEY}`;
        const body = {
            contents: [{ parts: [{ text: promptText }] }]
        };
        const headers = { 'Content-Type': 'application/json' };

        return await axios.post(url, body, { headers });
    }
};

// =================================================================================
// 5. MAIN APPLICATION CONTROLLER
// =================================================================================

const App = {
    init() {
        ThemeManager.init();
        UIManager.init();
        
        if (UIManager.submitButton) {
            UIManager.submitButton.addEventListener('click', () => this.handleSubmit());
        }
    },

    handleApiError(error) {
        console.error('Error during API call:', error);
        let errorMessage;
        let errorColor = config.colors.red;

        if (error.response) {
            const { status, data } = error.response;
            const errorDetails = data?.error?.message || 'پاسخ خطا نامشخص';

            switch (status) {
                case 400:
                    errorMessage = errorDetails.includes("API key not valid")
                        ? 'کلید API وارد شده معتبر نیست. لطفاً آن را بررسی کنید.'
                        : `خطای درخواست (400): ${errorDetails}`;
                    break;
                case 403:
                    errorMessage = 'دسترسی به API ممنوع است. کلید شما مجوز لازم برای این مدل را ندارد.';
                    break;
                case 429:
                    errorMessage = 'تعداد درخواست‌ها بیش از حد مجاز است. لطفاً کمی صبر کنید.';
                    break;
                default:
                    errorMessage = `خطا در API: ${status} - ${errorDetails}`;
            }
        } else if (error.request) {
            errorMessage = 'خطا: پاسخی از سرور دریافت نشد. .';
        } else {
            errorMessage = `خطا در هنگام آماده‌سازی درخواست: ${error.message}`;
        }
        UIManager.showMessage(errorMessage, errorColor);
    },

    handleApiResponse(response) {
        const candidate = response.data?.candidates?.[0];

        if (candidate?.content?.parts?.[0]?.text) {
            UIManager.showMessage(candidate.content.parts[0].text, config.colors.primary);
        } else if (candidate?.finishReason === 'SAFETY') {
            let blockMessage = `درخواست شما به دلیل مسائل ایمنی مسدود شد.`;
            if (candidate.safetyRatings?.length) {
                blockMessage += "\n\nجزئیات:\n" + candidate.safetyRatings
                    .map(r => `- دسته: ${r.category}, احتمال: ${r.probability}`)
                    .join('\n');
            }
            UIManager.showMessage(blockMessage, config.colors.yellow);
        } else {
            console.error('Unexpected API response structure:', response.data);
            UIManager.showMessage('ساختار پاسخ API قابل شناسایی نبود یا پاسخی دریافت نشد.', config.colors.orange);
        }
    },

    async handleSubmit() {
        const promptText = UIManager.getPrompt();
        
        // --- Input Validations ---
        if (!promptText) {
            UIManager.showMessage('لطفاً سوالی را وارد کنید.', config.colors.orange);
            return;
        }
        if (!config.API_KEY || config.API_KEY === 'YOUR_API_KEY') {
            UIManager.showMessage('خطا: لطفاً ابتدا یک کلید API معتبر در کد قرار دهید.', config.colors.red);
            return;
        }
        
        UIManager.setLoadingState(true);
        UIManager.clearResponse();

        try {
            const selectedModel = UIManager.getSelectedModel();
            const response = await ApiService.generateContent(promptText, selectedModel);
            this.handleApiResponse(response);
        } catch (error) {
            this.handleApiError(error);
        } finally {
            UIManager.setLoadingState(false);
        }
    }
};

// --- Application Entry Point ---
document.addEventListener('DOMContentLoaded', () => App.init());