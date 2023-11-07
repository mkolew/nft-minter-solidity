import { TokenMeta } from './TokenMeta';

/**
 * NFT Token from the contract
 */
export interface Token {
  created: boolean;
  tokenId: number;
  tokenURI: string;
  owner: string;
  meta?: TokenMeta;
}
