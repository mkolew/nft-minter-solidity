/**
 * Drawing before it becomes an NFT
 *
 * status:
 * 0 = Pending approval
 * 1 = Approved
 * 2 = Declined
 */
export interface Drawing {
  path: string;
  title: string;
  owner: string;
  status: number;
}
