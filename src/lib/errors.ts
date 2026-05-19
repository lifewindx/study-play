const messages: Record<string, string> = {
  "Invalid login credentials": "Invalid email or password",
  "User already registered": "An account with this email already exists",
  "Unable to validate email address: invalid format": "Please enter a valid email address",
  "Password should be at least 6 characters": "Password must be at least 8 characters",
  "For security purposes, you can only request this after": "Please wait a moment before trying again",
  "Email rate limit exceeded": "Too many attempts. Please try again later",
  "Invalid API key": "Service temporarily unavailable. Please try again later",
};

export function sanitizeError(err: { message: string }): string {
  for (const [key, value] of Object.entries(messages)) {
    if (err.message.includes(key)) return value;
  }
  return "Something went wrong. Please try again.";
}
