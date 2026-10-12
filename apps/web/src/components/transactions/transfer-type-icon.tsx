import { ArrowLeftRight, Barcode, Landmark, QrCode } from 'lucide-react';

const ICONS: Record<string, typeof QrCode> = { pix: QrCode, ted: Landmark, boleto: Barcode };

/** Ícone por tipo de transferência; tipos novos caem no ícone genérico. */
export function TransferTypeIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name.toLowerCase()] ?? ArrowLeftRight;
  return <Icon aria-hidden className={className} />;
}
