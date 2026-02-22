/**
 * ═══════════════════════════════════════════════════════════════════
 *                    REGEXHELPER - FEEDBACK
 *                   Модуль обратной связи (Supabase Edge Function + Telegram)
 * ═══════════════════════════════════════════════════════════════════
 * 
 * @file shared/ui/feedback.js
 * @description Форма обратной связи с отправкой через Supabase Edge Function
 */

import { showSuccess, showError } from './notifications.js';

// ═══════════════════════════════════════════════════════════════════
// КОНФИГУРАЦИЯ
// ═══════════════════════════════════════════════════════════════════

const FEEDBACK_URL = 'https://teuatabseokbnjlxkahn.supabase.co/functions/v1/feedback';

// ═══════════════════════════════════════════════════════════════════
// DOM ЭЛЕМЕНТЫ
// ═══════════════════════════════════════════════════════════════════

let feedbackBtn = null;
let feedbackOverlay = null;
let feedbackModal = null;
let feedbackForm = null;
let feedbackCloseBtn = null;
let feedbackCancelBtn = null;
let feedbackSubmitBtn = null;
let feedbackTypeButtons = null;
let feedbackMessage = null;
let feedbackEmail = null;
let feedbackWebsite = null;
let feedbackPage = null;

let selectedType = 'bug';

// ═══════════════════════════════════════════════════════════════════
// ИНИЦИАЛИЗАЦИЯ
// ═══════════════════════════════════════════════════════════════════

/**
 * Инициализация модуля обратной связи
 */
export function initFeedback() {
  feedbackBtn = document.getElementById('feedback-btn');
  feedbackOverlay = document.getElementById('feedback-modal-overlay');
  feedbackModal = document.getElementById('feedback-modal');
  feedbackForm = document.getElementById('feedback-form');
  feedbackCloseBtn = document.getElementById('feedback-modal-close');
  feedbackCancelBtn = document.getElementById('feedback-modal-cancel');
  feedbackSubmitBtn = document.getElementById('feedback-submit-btn');
  feedbackTypeButtons = document.getElementById('feedback-type-buttons');
  feedbackMessage = document.getElementById('feedback-message');
  feedbackEmail = document.getElementById('feedback-email');
  feedbackWebsite = document.getElementById('feedback-website');
  feedbackPage = document.getElementById('feedback-page');

  if (!feedbackBtn || !feedbackOverlay) {
    console.warn('Feedback elements not found');
    return;
  }

  bindEvents();
}

// ═══════════════════════════════════════════════════════════════════
// ОБРАБОТЧИКИ СОБЫТИЙ
// ═══════════════════════════════════════════════════════════════════

/**
 * Привязка событий
 */
function bindEvents() {
  feedbackBtn.addEventListener('click', openFeedbackModal);
  feedbackCloseBtn.addEventListener('click', closeFeedbackModal);
  feedbackCancelBtn.addEventListener('click', closeFeedbackModal);
  feedbackOverlay.addEventListener('click', handleOverlayClick);
  feedbackForm.addEventListener('submit', handleSubmit);
  
  feedbackTypeButtons.addEventListener('click', handleTypeSelect);

  document.addEventListener('keydown', handleEscape);
}

/**
 * Открытие модального окна
 */
function openFeedbackModal() {
  feedbackPage.value = window.location.pathname + window.location.hash;
  
  feedbackOverlay.classList.add('active');
  feedbackOverlay.setAttribute('aria-hidden', 'false');
  
  setTimeout(() => {
    feedbackMessage.focus();
  }, 100);
}

/**
 * Закрытие модального окна
 */
function closeFeedbackModal() {
  feedbackOverlay.classList.add('closing');
  
  setTimeout(() => {
    feedbackOverlay.classList.remove('active', 'closing');
    feedbackOverlay.setAttribute('aria-hidden', 'true');
    resetForm();
  }, 200);
}

/**
 * Клик по оверлею (закрытие при клике вне модалки)
 */
function handleOverlayClick(e) {
  if (e.target === feedbackOverlay) {
    closeFeedbackModal();
  }
}

/**
 * Обработка Escape
 */
function handleEscape(e) {
  if (e.key === 'Escape' && feedbackOverlay.classList.contains('active')) {
    closeFeedbackModal();
  }
}

/**
 * Выбор типа сообщения
 */
function handleTypeSelect(e) {
  const btn = e.target.closest('.feedback-type-btn');
  if (!btn) return;

  feedbackTypeButtons.querySelectorAll('.feedback-type-btn').forEach(b => {
    b.classList.remove('active');
  });
  btn.classList.add('active');
  
  selectedType = btn.dataset.type;
}

/**
 * Отправка формы
 */
async function handleSubmit(e) {
  e.preventDefault();

  const message = feedbackMessage.value.trim();
  const email = feedbackEmail.value.trim();
  const website = feedbackWebsite.value;
  const page = feedbackPage.value;

  if (message.length < 5) {
    showError('Сообщение слишком короткое (минимум 5 символов)');
    feedbackMessage.focus();
    return;
  }

  setLoading(true);

  try {
    const response = await fetch(FEEDBACK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: selectedType,
        message: message,
        email: email || null,
        page: page,
        website: website
      })
    });

    const result = await response.json();

    if (response.ok && result.success) {
      showSuccess('Спасибо за обратную связь! Сообщение отправлено.');
      closeFeedbackModal();
    } else {
      throw new Error(result.error || 'Ошибка отправки');
    }
  } catch (error) {
    console.error('Feedback error:', error);
    showError(`Не удалось отправить: ${error.message}`);
  } finally {
    setLoading(false);
  }
}

// ═══════════════════════════════════════════════════════════════════
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ═══════════════════════════════════════════════════════════════════

/**
 * Установка состояния загрузки
 */
function setLoading(isLoading) {
  feedbackSubmitBtn.disabled = isLoading;
  
  if (isLoading) {
    feedbackSubmitBtn.classList.add('loading');
    feedbackSubmitBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      </svg> Отправка...
    `;
  } else {
    feedbackSubmitBtn.classList.remove('loading');
    feedbackSubmitBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="22" y1="2" x2="11" y2="13"/>
        <polygon points="22 2 15 22 11 13 2 9 22 2"/>
      </svg> Отправить
    `;
  }
}

/**
 * Сброс формы
 */
function resetForm() {
  feedbackForm.reset();
  
  feedbackTypeButtons.querySelectorAll('.feedback-type-btn').forEach(b => {
    b.classList.remove('active');
  });
  feedbackTypeButtons.querySelector('[data-type="bug"]').classList.add('active');
  selectedType = 'bug';
}

// ═══════════════════════════════════════════════════════════════════
// ЭКСПОРТ
// ═══════════════════════════════════════════════════════════════════

export default {
  initFeedback
};
