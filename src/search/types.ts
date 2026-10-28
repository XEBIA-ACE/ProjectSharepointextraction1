export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  description: string;
  price: number;
  tags?: string[];
  active?: boolean;
}

export interface SearchHit {
  product: Product;
  score: number;
}

export interface SearchResult {
  total: number;
  hits: SearchHit[];
}

export interface SearchOptions {
  limit: number;
  offset: number;
}
