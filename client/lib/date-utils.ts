export function formatTimeForDisplay(date: Date) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? "PM" : "AM";
  const normalizedHours = hours % 12 || 12;

  return `${String(normalizedHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${period}`;
}

export function formatDuration(totalMinutes: number) {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return "0m";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return [hours > 0 && `${hours}h`, minutes > 0 && `${minutes}m`].filter(Boolean).join(" ");
}
