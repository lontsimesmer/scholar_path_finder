/**
 * HTML escaping utility to prevent XSS/HTML injection attacks in email templates.
 * All user-provided data must be escaped before interpolating into HTML.
 */

/**
 * Escapes special HTML characters to prevent HTML injection attacks.
 * Use this function for any user-provided data that will be displayed in HTML emails.
 * 
 * @param unsafe - The potentially unsafe string containing user input
 * @returns A safe string with HTML special characters escaped
 */
export function escapeHtml(unsafe: string | null | undefined): string {
  if (unsafe === null || unsafe === undefined) {
    return "";
  }
  
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
