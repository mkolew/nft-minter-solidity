/**
 * User from the contract
 */
export interface User {
  created: boolean;
  userIndex: number;
  dateHash: string;
  dateIndex: number;
  userName: string;
  avatarId: number;
  userAddress: string;
  validator: boolean;
  approved: boolean;
  blockReason: string;
  revokeValidatorReason: string;
  dateJoined: number;
}
