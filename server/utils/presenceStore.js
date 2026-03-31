const userTabs = new Map();

export const addTab = (userId, tabId) => {
  if (!userTabs.has(userId)) {
    userTabs.set(userId, new Set());
  }
  userTabs.get(userId).add(tabId);
};

export const removeTab = (userId, tabId) => {
  const tabs = userTabs.get(userId);
  if (!tabs) return 0;
  tabs.delete(tabId);
  if (tabs.size === 0) {
    userTabs.delete(userId);
    return 0;
  }
  return tabs.size;
};

export const tabCount = (userId) => {
  const tabs = userTabs.get(userId);
  return tabs ? tabs.size : 0;
};

export const clearUserTabs = (userId) => {
  userTabs.delete(userId);
};

