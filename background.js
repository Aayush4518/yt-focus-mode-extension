chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ hideShorts: false, focusActive: false });
});

chrome.runtime.onStartup.addListener(async () => {
  const { focusActive, focusEndTime } = await chrome.storage.local.get(["focusActive", "focusEndTime"]);
  
  if (focusActive && focusEndTime && Date.now() >= focusEndTime) {
    await chrome.storage.local.set({ focusActive: false, focusEndTime: null });
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "focusEnd") {
    await chrome.storage.local.set({ focusActive: false, focusEndTime: null });
  }
});
