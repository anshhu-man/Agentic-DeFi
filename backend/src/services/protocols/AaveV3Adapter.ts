import { utils } from 'ethers';
import { IProtocolAdapter, PreparedTx } from './IProtocolAdapter';
import { ChainId } from '../NetworkConfigService';

const AAVE_V3_POOL_ABI = [
  'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)',
  'function withdraw(address asset, uint256 amount, address to) returns (uint256)'
];

export default class AaveV3Adapter implements IProtocolAdapter {
  public readonly protocolId = 'aave_v3';

  supportedChains(): number[] {
    return [ChainId.ETHEREUM, ChainId.POLYGON];
  }

  private getPoolAddress(chainId: number): string {
    // Prefer env overrides to avoid hardcoding addresses
    if (chainId === ChainId.ETHEREUM) {
      const addr = process.env.AAVE_V3_POOL_ETHEREUM || '';
      if (!addr) {
        throw new Error('AAVE_V3_POOL_ETHEREUM is not set in environment');
      }
      return addr;
    }
    if (chainId === ChainId.POLYGON) {
      const addr = process.env.AAVE_V3_POOL_POLYGON || '';
      if (!addr) {
        throw new Error('AAVE_V3_POOL_POLYGON is not set in environment');
      }
      return addr;
    }
    throw new Error(`Aave V3 not supported on chainId: ${chainId}`);
  }

  async prepareSupply(params: {
    chainId: number;
    asset: string;
    amount: string; // wei
    onBehalfOf: string;
  }): Promise<PreparedTx> {
    const pool = this.getPoolAddress(params.chainId);
    const iface = new utils.Interface(AAVE_V3_POOL_ABI);
    const data = iface.encodeFunctionData('supply', [
      params.asset,
      params.amount,
      params.onBehalfOf,
      0 // referralCode
    ]);

    return {
      to: pool,
      data,
      value: '0x0'
    };
  }

  async prepareWithdraw(params: {
    chainId: number;
    asset: string;
    amount: string; // wei
    to: string;
  }): Promise<PreparedTx> {
    const pool = this.getPoolAddress(params.chainId);
    const iface = new utils.Interface(AAVE_V3_POOL_ABI);
    const data = iface.encodeFunctionData('withdraw', [
      params.asset,
      params.amount,
      params.to
    ]);

    return {
      to: pool,
      data,
      value: '0x0'
    };
  }
}
