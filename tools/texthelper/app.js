/**
 * Текстовый помощник — точка входа
 */

import { initTexthelperUI, openTexthelperModal } from './ui/texthelperUI.js';

export { initTexthelperUI, openTexthelperModal };

export function initTexthelper() {
  initTexthelperUI();

  const btn = document.getElementById('texthelper-btn');
  btn?.addEventListener('click', openTexthelperModal);
}
