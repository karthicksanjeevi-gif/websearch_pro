export type ItemStatus = 'pending' | 'checking' | 'valid' | 'no' | 'error';

export interface AsinItem {
  id: string;
  asin: string;
  url: string;
  status: ItemStatus;
  title: string | null;
  imageUrl: string | null;
  price: string | null;
  availability: string | null;
  statusCode: number;
  reason: string;
  checkedAt: string | null;
}

export interface CheckStats {
  total: number;
  valid: number;
  no: number;
  pending: number;
  checking: number;
}
