import { ArrowLeftRight, Barcode, Landmark, QrCode } from 'lucide-react';

const ICONS: Record<string, typeof QrCode> = { pix: QrCode, ted: Landmark, boleto: Barcode };

export function TransferTypeIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name.toLowerCase()] ?? ArrowLeftRight;
  return <Icon aria-hidden className={className} />;
}
