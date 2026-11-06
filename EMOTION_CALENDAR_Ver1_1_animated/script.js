
const STORAGE_KEY = "emotionCalendarRecordsV1";
const EMOTIONS = [
  { id: "happy", label: "うれしい", image: "images/happy.png", fallback: "😊" },
  { id: "sad", label: "かなしい", image: "images/sad.png", fallback: "🥺" },
  { id: "angry", label: "おこり", image: "images/angry.png", fallback: "😡" },
  { id: "tired", label: "つかれた", image: "images/tired.png", fallback: "😴" },
  { id: "excited", label: "わくわく", image: "images/excited.png", fallback: "😆" },
  { id: "anxious", label: "ふあん", image: "images/anxious.png", fallback: "😰" },
  { id: "surprised", label: "びっくり", image: "images/surprised.png", fallback: "😲" },
  { id: "neutral", label: "ふつう", image: "images/neutral.png", fallback: "😐" }
];

let records = loadRecords();
let visibleMonth = new Date();
visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
let selectedDate = dateKey(new Date());
let draftEmotions = [];
let draftWeather = null;
let playbackTimer = null;
let playbackDay = 1;

const $ = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(2, "0");
function dateKey(date) { return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`; }
function parseDate(key) { const [y,m,d] = key.split("-").map(Number); return new Date(y,m-1,d); }
function loadRecords() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
}
function persistRecords() { localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); }
function emotionById(id) { return EMOTIONS.find(e => e.id === id); }
function imageElement(emotion, className = "") {
  const img = document.createElement("img");
  img.src = emotion.image;
  img.alt = emotion.label;
  img.className = className;
  img.onerror = () => {
    const fallback = document.createElement("span");
    fallback.className = `${className} face-fallback`;
    fallback.textContent = emotion.fallback;
    img.replaceWith(fallback);
  };
  return img;
}
function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2200);
}
function renderEmotionOptions() {
  const root = $("emotionOptions");
  root.innerHTML = "";
  EMOTIONS.forEach(emotion => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "emotion-option";
    button.dataset.emotion = emotion.id;
    button.append(imageElement(emotion));
    const label = document.createElement("span");
    label.textContent = emotion.label;
    button.append(label);
    button.addEventListener("click", () => toggleDraftEmotion(emotion.id));
    root.append(button);
  });
}
function toggleDraftEmotion(id) {
  draftEmotions = draftEmotions.includes(id) ? draftEmotions.filter(x => x !== id) : [...draftEmotions, id];
  renderDraft();
}
function renderDraft() {
  const selected = $("selectedEmotions");
  selected.innerHTML = "";
  if (!draftEmotions.length) {
    const empty = document.createElement("div"); empty.className = "empty-face"; empty.textContent = "♡";
    const message = document.createElement("p"); message.textContent = "感情を選択してください（複数選択可）";
    selected.append(empty, message);
  } else {
    draftEmotions.forEach(id => {
      const emotion = emotionById(id);
      selected.append(imageElement(emotion));
    });
  }
  document.querySelectorAll(".emotion-option").forEach(button => {
    button.classList.toggle("selected", draftEmotions.includes(button.dataset.emotion));
  });
}
function renderCalendar() {
  const year = visibleMonth.getFullYear(), month = visibleMonth.getMonth();
  $("monthLabel").textContent = `${year}年${month+1}月`;
  const grid = $("calendarGrid");
  grid.innerHTML = "";
  ["SUN","MON","TUE","WED","THU","FRI","SAT"].forEach(day => {
    const el = document.createElement("div"); el.className = "weekday"; el.textContent = day; grid.append(el);
  });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const total = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  for (let i=0; i<total; i++) {
    let date, inMonth = true;
    if (i < firstDay) { date = new Date(year, month-1, prevDays-firstDay+i+1); inMonth = false; }
    else if (i >= firstDay + daysInMonth) { date = new Date(year, month+1, i-firstDay-daysInMonth+1); inMonth = false; }
    else date = new Date(year, month, i-firstDay+1);
    const key = dateKey(date);
    const cell = document.createElement("button");
    cell.type = "button"; cell.className = `day-cell${inMonth ? "" : " other-month"}${key === selectedDate ? " selected" : ""}`;
    const number = document.createElement("span"); number.className = "day-number"; number.textContent = date.getDate(); cell.append(number);
    const faces = document.createElement("div"); faces.className = "day-faces";
    const record = records[key];
    if (record && record.emotions) {
      record.emotions.slice(0,3).forEach(id => {
        const emotion = emotionById(id); if (emotion) faces.append(imageElement(emotion));
      });
      if (record.emotions.length > 3) { const more = document.createElement("span"); more.className="more-count"; more.textContent=`+${record.emotions.length-3}`; faces.append(more); }
    } else { const spacer = document.createElement("span"); spacer.className = "day-empty"; faces.append(spacer); }
    cell.append(faces);
    cell.addEventListener("click", () => {
      selectedDate = key;
      if (!inMonth) visibleMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      loadSelectedDate(); renderCalendar();
    });
    grid.append(cell);
  }
}
function loadSelectedDate() {
  const date = parseDate(selectedDate);
  $("selectedDateLabel").textContent = `${date.getFullYear()}年${date.getMonth()+1}月${date.getDate()}日（${"日月火水木金土"[date.getDay()]}）`;
  const record = records[selectedDate] || {};
  draftEmotions = [...(record.emotions || [])];
  draftWeather = record.weather || null;
  $("dailyMemo").value = record.dailyMemo || "";
  $("memoCount").textContent = `${$("dailyMemo").value.length} / 180`;
  renderDraft();
  renderWeather();
  $("saveMessage").textContent = record.updatedAt ? "保存済みの記録を表示しています。" : "まだ記録されていません。";
}
function renderWeather() {
  if (!draftWeather) {
    $("weatherCondition").textContent = "未取得";
    $("temperature").textContent = "--°C";
    $("weatherIcon").textContent = "☁";
    $("weatherSource").textContent = "未取得";
    return;
  }
  $("weatherCondition").textContent = draftWeather.label || "天気情報";
  $("temperature").textContent = `${draftWeather.temperature ?? "--"}°C`;
  $("weatherIcon").textContent = draftWeather.icon || "☁";
  $("weatherSource").textContent = "自動取得";
}
function saveSelectedDate() {
  const memo = $("dailyMemo").value.trim();
  if (!draftEmotions.length && !memo && !draftWeather) {
    delete records[selectedDate];
  } else {
    records[selectedDate] = {
      emotions: [...draftEmotions],
      dailyMemo: memo,
      weather: draftWeather,
      updatedAt: new Date().toISOString()
    };
  }
  persistRecords();
  renderCalendar(); renderTimeline(); renderReview();
  $("saveMessage").textContent = "SAVE COMPLETE! 記録を保存しました。";
  showToast("★ SAVE COMPLETE! ★");
}
function renderTimeline() {
  const root = $("timelineTrack"); root.innerHTML = "";
  const keys = Object.keys(records).filter(key => {
    const r = records[key]; return (r.emotions && r.emotions.length) || r.dailyMemo || r.weather;
  }).sort().reverse();
  if (!keys.length) { root.innerHTML = '<p class="small-note">まだ記録がありません。カレンダーから感情を記録してみましょう。</p>'; return; }
  keys.forEach(key => {
    const record = records[key], date = parseDate(key);
    const card = document.createElement("article"); card.className = "history-card";
    const face = record.emotions && record.emotions.length ? emotionById(record.emotions[0]) : null;
    if (face) card.append(imageElement(face, "history-face"));
    const heading = document.createElement("h3"); heading.textContent = `${date.getMonth()+1}月${date.getDate()}日`;
    const emotions = document.createElement("div"); emotions.className = "history-emotions";
    (record.emotions || []).forEach(id => { const e=emotionById(id); if(e) { const s=document.createElement("span"); s.textContent=e.label; s.style.fontSize="10px"; s.style.marginRight="4px"; emotions.append(s); }});
    const memo = document.createElement("p"); memo.textContent = record.dailyMemo || "メモはありません";
    const del = document.createElement("button"); del.textContent = "この記録を削除";
    del.addEventListener("click", () => {
      if (confirm(`${date.getFullYear()}年${date.getMonth()+1}月${date.getDate()}日の記録を削除しますか？`)) {
        delete records[key]; persistRecords();
        if (key === selectedDate) loadSelectedDate();
        renderCalendar(); renderTimeline(); renderReview(); showToast("記録を削除しました");
      }
    });
    card.append(heading, emotions, memo, del); root.append(card);
  });
}
function renderReview() {
  const root = $("reviewSummary"); root.innerHTML = "";
  const prefix = `${visibleMonth.getFullYear()}-${pad(visibleMonth.getMonth()+1)}-`;
  const counts = Object.fromEntries(EMOTIONS.map(e => [e.id,0]));
  let totalDays = 0;
  Object.entries(records).forEach(([key,record]) => {
    if (key.startsWith(prefix)) {
      if ((record.emotions || []).length || record.dailyMemo || record.weather) totalDays++;
      (record.emotions || []).forEach(id => { if (counts[id] !== undefined) counts[id]++; });
    }
  });
  const intro = document.createElement("div"); intro.className = "review-card";
  intro.innerHTML = `<strong>${totalDays}</strong><span>記録した日数</span>`;
  root.append(intro);
  EMOTIONS.forEach(e => {
    const card = document.createElement("div"); card.className = "review-card";
    card.append(imageElement(e));
    const count = document.createElement("strong"); count.textContent = counts[e.id];
    const label = document.createElement("span"); label.textContent = `${e.label} の回数`;
    card.append(count,label); root.append(card);
  });
}
async function fetchWeather() {
  if (!navigator.geolocation) { showToast("このブラウザでは位置情報を利用できません"); return; }
  $("weatherButton").disabled = true; $("weatherButton").textContent = "取得中...";
  navigator.geolocation.getCurrentPosition(async position => {
    try {
      const { latitude, longitude } = position.coords;
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("weather request failed");
      const data = await response.json();
      const code = data.current.weather_code;
      const weather = weatherFromCode(code);
      draftWeather = { label: weather.label, icon: weather.icon, temperature: Math.round(data.current.temperature_2m) };
      renderWeather(); showToast("天気・気温を取得しました");
    } catch (error) { showToast("天気を取得できませんでした。あとでもう一度試してください。"); }
    finally { $("weatherButton").disabled = false; $("weatherButton").textContent = "位置情報から天気を取得"; }
  }, () => {
    showToast("位置情報が許可されませんでした");
    $("weatherButton").disabled = false; $("weatherButton").textContent = "位置情報から天気を取得";
  }, { enableHighAccuracy: false, timeout: 10000 });
}
function weatherFromCode(code) {
  if (code === 0) return {label:"快晴",icon:"☀"};
  if ([1,2].includes(code)) return {label:"晴れ・一部くもり",icon:"🌤"};
  if (code === 3) return {label:"くもり",icon:"☁"};
  if ([45,48].includes(code)) return {label:"霧",icon:"🌫"};
  if ([51,53,55,56,57].includes(code)) return {label:"霧雨",icon:"🌦"};
  if ([61,63,65,66,67,80,81,82].includes(code)) return {label:"雨",icon:"🌧"};
  if ([71,73,75,77,85,86].includes(code)) return {label:"雪",icon:"❄"};
  if ([95,96,99].includes(code)) return {label:"雷雨",icon:"⛈"};
  return {label:"天気情報",icon:"☁"};
}
function stopPlayback() {
  if (playbackTimer) clearInterval(playbackTimer);
  playbackTimer = null; $("playerStatus").textContent = "PAUSED";
  $("playButton").textContent = "▶ 再生";
}
function startPlayback() {
  stopPlayback();
  const year = visibleMonth.getFullYear(), month = visibleMonth.getMonth();
  const lastDay = new Date(year, month+1, 0).getDate();
  playbackDay = 1;
  const tick = () => {
    const date = new Date(year, month, playbackDay);
    selectedDate = dateKey(date); loadSelectedDate(); renderCalendar();
    $("playDate").textContent = `${playbackDay} / ${lastDay} 日`;
    $("playProgress").style.width = `${(playbackDay/lastDay)*100}%`;
    if (playbackDay >= lastDay) { stopPlayback(); $("playerStatus").textContent = "COMPLETE"; return; }
    playbackDay++;
  };
  $("playerStatus").textContent = "PLAYING";
  $("playButton").textContent = "▶ 再生中";
  tick();
  playbackTimer = setInterval(tick, Number($("playSpeed").value));
}
function showView(name) {
  document.querySelectorAll(".view").forEach(view => view.classList.remove("active"));
  const target = $(`view-${name}`); if (target) target.classList.add("active");
  document.querySelectorAll(".nav-link").forEach(btn => btn.classList.toggle("active", btn.dataset.view === name));
  if (name === "timeline") renderTimeline();
  if (name === "review") renderReview();
}
function exportData() {
  const blob = new Blob([JSON.stringify(records,null,2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download="emotion-calendar-records.json"; a.click();
  URL.revokeObjectURL(url);
}
function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("invalid");
      records = data; persistRecords(); renderCalendar(); loadSelectedDate(); renderTimeline(); renderReview();
      showToast("記録データを読み込みました");
    } catch { showToast("ファイルを読み込めませんでした"); }
  };
  reader.readAsText(file);
}

$("prevMonth").addEventListener("click", () => { stopPlayback(); visibleMonth = new Date(visibleMonth.getFullYear(),visibleMonth.getMonth()-1,1); renderCalendar(); renderReview(); });
$("nextMonth").addEventListener("click", () => { stopPlayback(); visibleMonth = new Date(visibleMonth.getFullYear(),visibleMonth.getMonth()+1,1); renderCalendar(); renderReview(); });
$("dailyMemo").addEventListener("input", () => $("memoCount").textContent = `${$("dailyMemo").value.length} / 180`);
$("saveButton").addEventListener("click", saveSelectedDate);
$("weatherButton").addEventListener("click", fetchWeather);
$("playButton").addEventListener("click", startPlayback);
$("stopButton").addEventListener("click", stopPlayback);
$("playSpeed").addEventListener("change", () => { if (playbackTimer) startPlayback(); });
$("exportButton").addEventListener("click", exportData);
$("importInput").addEventListener("change", e => { if(e.target.files[0]) importData(e.target.files[0]); e.target.value=""; });
document.querySelectorAll(".nav-link").forEach(btn => btn.addEventListener("click", () => showView(btn.dataset.view)));
document.querySelectorAll("[data-go-home]").forEach(btn => btn.addEventListener("click", () => showView("home")));

renderEmotionOptions();
renderCalendar();
loadSelectedDate();
renderTimeline();
renderReview();

/* ★ Ver.1.1 ボタンのポップアニメーション：既存機能を変更せず追加 */
document.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button || button.disabled || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  button.classList.remove("button-bounce");
  void button.offsetWidth;
  button.classList.add("button-bounce");
  button.addEventListener("animationend", () => button.classList.remove("button-bounce"), { once: true });
  if (button.id === "saveButton") {
    button.classList.remove("saved-flash");
    void button.offsetWidth;
    button.classList.add("saved-flash");
    button.addEventListener("animationend", () => button.classList.remove("saved-flash"), { once: true });
  }
});
