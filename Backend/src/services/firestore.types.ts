import * as admin from 'firebase-admin';

export type WhereFilterOp = admin.firestore.WhereFilterOp;
export type OrderByDirection = admin.firestore.OrderByDirection;

/**
 * Filter criteria for Firestore query helper.
 */
export interface QueryFilter {
  field: string;
  operator: WhereFilterOp;
  value: any;
}

/**
 * Sorting criteria for Firestore query helper.
 */
export interface QueryOrder {
  field: string;
  direction?: OrderByDirection;
}

/**
 * Structured query options parameters.
 */
export interface QueryOptions {
  filters?: QueryFilter[];
  orderBy?: QueryOrder[];
  limit?: number;
  startAfterDoc?: admin.firestore.DocumentSnapshot;
  startAtDoc?: admin.firestore.DocumentSnapshot;
}

/**
 * Standardized pagination response wrapper.
 */
export interface PaginationResult<T> {
  data: T[];
  lastVisibleSnapshot: admin.firestore.DocumentSnapshot | null;
  totalCount?: number;
}

/**
 * Single batch write operation payload.
 */
export interface BatchOperation<T = any> {
  type: 'create' | 'set' | 'update' | 'delete';
  docId: string;
  data?: Partial<T>;
}
