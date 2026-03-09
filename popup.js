document.addEventListener("DOMContentLoaded", () => {
  console.log("[Popup] Popup script loaded");
  
  const minutesInput = document.getElementById("minutes");
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");
  const timerDisplay = document.getElementById("timerDisplay");
  const timeRemainingEl = document.getElementById("timeRemaining");

  let intervalId = null;
  let hasReloaded = false;

  function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  async function reloadYouTubeTab() {
    if (hasReloaded) return;
    hasReloaded = true;
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id && tab.url?.includes("youtube.com/")) {
      setTimeout(() => {
        chrome.tabs.reload(tab.id);
      }, 500);
    }
  }

  function updateUI(active, endTime) {
    console.log("[Popup] Updating UI:", { active, endTime });
    
    if (active && endTime) {
      hasReloaded = false;
      const remaining = endTime - Date.now();
      
      if (remaining <= 0) {
        chrome.storage.local.set({ focusActive: false, focusEndTime: null });
        updateUI(false);
        return;
      }
      
      minutesInput.disabled = true;
      startBtn.style.display = "none";
      timerDisplay.style.display = "flex";
      stopBtn.style.display = "block";
      timeRemainingEl.textContent = formatTime(remaining);
      startInterval(endTime);
    } else {
      minutesInput.disabled = false;
      startBtn.style.display = "block";
      timerDisplay.style.display = "none";
      stopBtn.style.display = "none";
      timeRemainingEl.textContent = "--:--";
      
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }
  }

  function startInterval(endTime) {
    if (intervalId) clearInterval(intervalId);
    
    const update = () => {
      const remaining = endTime - Date.now();
      
      if (remaining <= 0) {
        console.log("[Popup] Timer expired");
        clearInterval(intervalId);
        chrome.storage.local.set({ focusActive: false, focusEndTime: null });
        updateUI(false);
        reloadYouTubeTab();
        return;
      }
      
      timeRemainingEl.textContent = formatTime(remaining);
    };
    
    update();
    intervalId = setInterval(update, 1000);
  }

  chrome.storage.local.get(["focusActive", "focusEndTime"], (result) => {
    console.log("[Popup] Initial state:", result);
    if (result.focusActive && result.focusEndTime) {
      updateUI(true, result.focusEndTime);
    }
  });

  chrome.alarms.onAlarm.addListener((alarm) => {
    console.log("[Popup] Alarm received:", alarm.name);
    if (alarm.name === "focusEnd" && !hasReloaded) {
      chrome.storage.local.set({ focusActive: false, focusEndTime: null });
      updateUI(false);
      reloadYouTubeTab();
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.focusActive) {
      console.log("[Popup] Storage changed:", changes.focusActive);
      if (!changes.focusActive.newValue) {
        updateUI(false);
      }
    }
  });

  startBtn.addEventListener("click", async () => {
    const mins = parseInt(minutesInput.value, 10);
    console.log("[Popup] Start clicked, minutes:", mins);
    
    if (!mins || mins < 1) {
      console.log("[Popup] Invalid minutes input");
      return;
    }

    const endTime = Date.now() + mins * 60 * 1000;
    console.log("[Popup] Setting end time:", endTime);
    
    await chrome.storage.local.set({ focusActive: true, focusEndTime: endTime });
    chrome.alarms.create("focusEnd", { when: endTime });

    updateUI(true, endTime);

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log("[Popup] Current tab:", tab?.url);
    
    if (tab?.id && tab.url?.includes("youtube.com/")) {
      chrome.tabs.sendMessage(tab.id, { focusActive: true }, (response) => {
        console.log("[Popup] Message response:", response);
      });
    }
  });

  stopBtn.addEventListener("click", async () => {
    console.log("[Popup] Stop clicked");
    
    chrome.alarms.clear("focusEnd");
    await chrome.storage.local.set({ focusActive: false, focusEndTime: null });
    updateUI(false);
    reloadYouTubeTab();
  });
});
