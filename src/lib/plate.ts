/** A flat illustrated plate as an SVG data URL, standing in for a photo thumbnail. */
export function plateThumbnail(bg: string, food: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="${bg}"/><circle cx="200" cy="150" r="110" fill="#fff" stroke="#E7DFCF" stroke-width="5"/><circle cx="200" cy="150" r="78" fill="#FFF6E0"/><circle cx="200" cy="150" r="52" fill="${food}"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
