const dayPattern = /^(\d{4}-\d{2}-\d{2})$/;
const minutePattern = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})\+08:00$/;

function validDay(value) {
  return !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

export function validContentTime(value) {
  if (typeof value !== 'string') return false;
  const day = value.match(dayPattern);
  if (day) return validDay(day[1]);
  const minute = value.match(minutePattern);
  return Boolean(minute && validDay(minute[1]) && Number(minute[2]) < 24 && Number(minute[3]) < 60);
}
