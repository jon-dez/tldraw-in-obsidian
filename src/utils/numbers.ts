export const clamp = (num: number, min: number, max: number) => Math.max(min, Math.min(num, max))

export const msToSeconds = (ms: number) => ms / 1000
export const safeSecondsToMs = (s: number) => Math.round(s * 1000)
