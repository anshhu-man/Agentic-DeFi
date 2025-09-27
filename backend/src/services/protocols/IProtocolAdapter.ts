import { ethers } from 'ethers';

export type PreparedTx = {
  to: string;
  data: string;
  value?: string;
  gas?: string;
};

export interface IProtocolAdapter {
  readonly protocolId: string; // e.g. 'aave_v3'
  supportedChains(): number[];
  // Prepare a single-asset supply (stake) transaction
  prepareSupply(params: {
    chainId: number;
    asset: string; // token address
    amount: string; // decimal string (wei)
    onBehalfOf: string; // user address
  }): Promise<PreparedTx>;

  // Prepare a single-asset withdraw (unstake) transaction
  prepareWithdraw(params: {
    chainId: number;
    asset: string; // token address
    amount: string; // decimal string (wei)
    to: string; // recipient
  }): Promise<PreparedTx>;
}
