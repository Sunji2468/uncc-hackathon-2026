/** Conservative edge-connected background removal. Returns null for uncertain masks. */
export function stickerMask(data: Uint8ClampedArray, width: number, height: number): Uint8Array | null {
  const count = width * height;
  if (width < 8 || height < 8 || data.length !== count * 4) return null;
  const corners = [0, width - 1, (height - 1) * width, count - 1];
  const color = [0, 1, 2].map((c) => corners.reduce((sum, p) => sum + data[p * 4 + c], 0) / 4);
  const distance = (p: number) => Math.sqrt(color.reduce((sum, c, channel) => sum + (data[p * 4 + channel] - c) ** 2, 0));
  if (corners.some((p) => distance(p) > 35)) return null;
  const removed = new Uint8Array(count);
  const queue = new Int32Array(count);
  let tail = 0;
  const visit = (p: number) => {
    if (removed[p] || distance(p) > 48) return;
    removed[p] = 1;
    queue[tail++] = p;
  };
  for (let x = 0; x < width; x++) { visit(x); visit((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { visit(y * width); visit(y * width + width - 1); }
  for (let head = 0; head < tail; head++) {
    const p = queue[head];
    if (p % width > 0) visit(p - 1);
    if (p % width < width - 1) visit(p + 1);
    if (p >= width) visit(p - width);
    if (p < count - width) visit(p + width);
  }
  if (tail / count < 0.12 || tail / count > 0.78) return null;
  let center = 0, kept = 0;
  for (let y = Math.floor(height * 0.3); y < height * 0.7; y++) {
    for (let x = Math.floor(width * 0.3); x < width * 0.7; x++) {
      center++; if (!removed[y * width + x]) kept++;
    }
  }
  if (kept / center < 0.85) return null;
  return removed;
}
