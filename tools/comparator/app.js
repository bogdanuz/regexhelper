/**
 * Сравнитель — точка входа
 */

import { initComparatorUI, openComparatorModal, clearComparatorPanel } from './ui/comparatorUI.js';

export { initComparatorUI, openComparatorModal, clearComparatorPanel };

export function initComparator() {
  initComparatorUI();

  const btn = document.getElementById('comparator-btn');
  btn?.addEventListener('click', openComparatorModal);
}
