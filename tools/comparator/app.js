/**
 * Сравнитель — точка входа
 */

import { initComparatorUI, openComparatorModal } from './ui/comparatorUI.js';

export { initComparatorUI, openComparatorModal };

export function initComparator() {
  initComparatorUI();

  const btn = document.getElementById('comparator-btn');
  btn?.addEventListener('click', openComparatorModal);
}
