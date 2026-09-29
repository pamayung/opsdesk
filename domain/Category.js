export const cleanName = (s = '') => s.trim().replace(/\s+/g, ' ');
export const normalize = (s = '') => cleanName(s).toLowerCase();
