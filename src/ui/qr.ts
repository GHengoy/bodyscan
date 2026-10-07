import QRCode from 'qrcode';

export async function renderQr(canvas: HTMLCanvasElement, text: string): Promise<void> {
  await QRCode.toCanvas(canvas, text, {
    width: 220,
    margin: 1,
    color: { dark: '#f3f4f6', light: '#0f1115' },
  });
}
