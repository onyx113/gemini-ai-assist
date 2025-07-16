import axios from 'axios';

// DOM Elements
const promptInput = document.getElementById('promptInput');
const submitButton = document.getElementById('submitButton');
const responseArea = document.getElementById('responseArea');
const loadingIndicator = document.getElementById('loadingIndicator');
const modelSelect = document.getElementById('modelSelect');
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Auto-resize textarea
promptInput.addEventListener('input', function () {
    this.style.height = 'auto';
    const newHeight = this.scrollHeight;
    const maxHeight = 150;
    this.style.height = `${Math.min(newHeight, maxHeight)}px`;
    this.style.overflowY = newHeight > maxHeight ? 'auto' : 'hidden';
});

// Set UI state (loading or not)
function setUILoadingState(isLoading) {
    loadingIndicator.style.display = isLoading ? 'flex' : 'none';
    submitButton.disabled = isLoading;
    promptInput.disabled = isLoading;
    if (isLoading) {
        submitButton.classList.add('opacity-50', 'cursor-not-allowed');
        promptInput.classList.add('opacity-70', 'dark:opacity-60');
    } else {
        submitButton.classList.remove('opacity-50', 'cursor-not-allowed');
        promptInput.classList.remove('opacity-70', 'dark:opacity-60');
    }
}

// Display messages in the response area
function showMessage(text, colorVar) {
    responseArea.textContent = text;
    responseArea.style.color = `var(${colorVar})`;
}

// Main function to handle form submission
submitButton.addEventListener('click', async () => {
    const promptText = promptInput.value.trim();
    const selectedModel = modelSelect.value;

    // Input Validations
    if (!promptText) {
        showMessage('لطفاً سوالی را وارد کنید.', '--text-orange');
        return;
    }
    if (!API_KEY || API_KEY === 'YOUR_API_KEY') {
        showMessage('خطا: لطفاً ابتدا یک کلید API معتبر در کد قرار دهید.', '--text-red');
        return;
    }

    setUILoadingState(true);
    showMessage('', '--text-primary'); // Clear previous response

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${API_KEY}`;
    const requestBody = {
        contents: [{ parts: [{ text: promptText }] }]
    };

    try {
        // AXIOS API Call
        const response = await axios.post(API_URL, requestBody, {
            headers: { 'Content-Type': 'application/json' }
        });

        const responseData = response.data;
        const candidate = responseData.candidates?.[0];

        if (candidate?.content?.parts?.[0]?.text) {
            showMessage(candidate.content.parts[0].text, '--text-primary');
        } else if (candidate?.finishReason === 'SAFETY') {
            let blockMessage = `درخواست شما به دلیل مسائل ایمنی مسدود شد.`;
            if (candidate.safetyRatings?.length > 0) {
                blockMessage += "\n\nجزئیات:";
                candidate.safetyRatings.forEach(rating => {
                    blockMessage += `\n- دسته: ${rating.category}, احتمال: ${rating.probability}`;
                });
            }
            showMessage(blockMessage, '--text-yellow');
        } else {
            console.error('Unexpected API response structure:', responseData);
            showMessage('ساختار پاسخ API قابل شناسایی نبود یا پاسخی دریافت نشد.', '--text-orange');
        }

    } catch (error) {
        // AXIOS Error Handling
        console.error('Error during API call:', error);
        if (error.response) {
            const status = error.response.status;
            const errorData = error.response.data.error;
            let errorMessage = `خطا در API: ${status} - ${errorData?.message || 'پاسخ خطا نامشخص'}`;

            if (status === 400 && errorData?.message.includes("API key not valid")) {
                errorMessage = 'کلید API وارد شده معتبر نیست. لطفاً آن را بررسی کنید.';
            } else if (status === 403) {
                errorMessage = 'دسترسی به API ممنوع است. کلید شما مجوز لازم برای این مدل را ندارد.';
            } else if (status === 429) {
                errorMessage = 'تعداد درخواست‌ها بیش از حد مجاز است. لطفاً کمی صبر کنید.';
            }
            showMessage(errorMessage, '--text-red');
        } else if (error.request) {
            showMessage('خطا: پاسخی از سرور دریافت نشد. لطفاً اتصال اینترنت و VPN خود را بررسی کنید.', '--text-red');
        } else {
            showMessage(`خطا در هنگام آماده‌سازی درخواست: ${error.message}`, '--text-red');
        }
    } finally {
        setUILoadingState(false);
    }
});

// Theme Management
const themeToggleDarkIcon = document.getElementById('theme-toggle-dark-icon');
const themeToggleLightIcon = document.getElementById('theme-toggle-light-icon');
const themeToggleButton = document.getElementById('theme-toggle');

function applyTheme(isDark) {
    const root = document.documentElement;
    root.classList.toggle('dark', isDark);
    themeToggleLightIcon.classList.toggle('hidden', !isDark);
    themeToggleDarkIcon.classList.toggle('hidden', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

themeToggleButton.addEventListener('click', () => {
    applyTheme(!document.documentElement.classList.contains('dark'));
});

// Initial Theme Load
const storedTheme = localStorage.getItem('theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
applyTheme(storedTheme ? storedTheme === 'dark' : prefersDark);
