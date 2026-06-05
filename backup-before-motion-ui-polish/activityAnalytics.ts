// src/lib/activityAnalytics.ts

export interface ActivitySession {
  id: string;
  url: string;
  domain: string;
  title: string;
  category: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  date: string;
}

export const getLocalDateString = (timestamp: number = Date.now()) => {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDuration = (ms: number): string => {
  if (ms <= 0) return '0m';
  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes < 1) {
    const secs = Math.round(ms / 1000);
    return `${secs}s`;
  }
  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

export const calculateAnalytics = (sessions: ActivitySession[], targetDateString: string = getLocalDateString()) => {
  // Filter sessions for target date
  const todaySessions = sessions.filter(s => s.date === targetDateString);

  let totalActiveTime = 0;
  let deepWorkTime = 0;
  let learningTime = 0;
  let casualTime = 0;

  const domainDurations: Record<string, number> = {};

  todaySessions.forEach(s => {
    totalActiveTime += s.durationMs;
    if (s.category === 'Deep Work') {
      deepWorkTime += s.durationMs;
    } else if (s.category === 'Learning') {
      learningTime += s.durationMs;
    } else {
      casualTime += s.durationMs;
    }

    domainDurations[s.domain] = (domainDurations[s.domain] || 0) + s.durationMs;
  });

  // Focus Score = (Deep Work + Learning * 0.5) / Total active time
  let focusScore = 100;
  if (totalActiveTime > 0) {
    const focusDuration = deepWorkTime + (learningTime * 0.5);
    focusScore = Math.round((focusDuration / totalActiveTime) * 100);
  }

  // Top Websites
  const topWebsites = Object.entries(domainDurations)
    .map(([domain, duration]) => ({ domain, duration }))
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 5);

  // Category Breakdown for Pie Charts
  const categoryBreakdown = [
    { name: 'Deep Work Projects', value: deepWorkTime },
    { name: 'Learning & Development', value: learningTime },
    { name: 'Casual Browsing', value: casualTime }
  ];

  // Hourly slots (timeline slots from 09:00 AM to 06:00 PM)
  const hourlySlots = [
    { name: '09:00 AM', startTime: 0, endTime: 12, value: 0, label: 'Morning Session' },
    { name: '12:00 PM', startTime: 12, endTime: 15, value: 0, label: 'Midday Session' },
    { name: '03:00 PM', startTime: 15, endTime: 18, value: 0, label: 'Afternoon Session' },
    { name: '06:00 PM', startTime: 18, endTime: 24, value: 0, label: 'Evening Session' }
  ];

  todaySessions.forEach(s => {
    const date = new Date(s.startTime);
    const hour = date.getHours();
    const slot = hourlySlots.find(h => hour >= h.startTime && hour < h.endTime);
    if (slot) {
      slot.value += s.durationMs;
    }
  });

  // Main category name
  let mainCategory = 'Casual';
  const catDurations = { 'Deep Work': deepWorkTime, 'Learning': learningTime, 'Casual': casualTime };
  const sortedCategories = Object.entries(catDurations).sort((a, b) => b[1] - a[1]);
  if (sortedCategories[0][1] > 0) {
    mainCategory = sortedCategories[0][0];
  }

  return {
    totalActiveTime,
    deepWorkTime,
    learningTime,
    casualTime,
    focusScore,
    topWebsites,
    categoryBreakdown,
    hourlySlots,
    mainCategory,
    todaySessionsCount: todaySessions.length
  };
};
