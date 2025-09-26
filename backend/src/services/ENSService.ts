import { ethers } from 'ethers';
import { logger } from '../utils/logger';

export interface ENSProfile {
  name: string;
  address: string;
  avatar?: string;
  description?: string;
  email?: string;
  url?: string;
  twitter?: string;
  github?: string;
}

export interface ENSResolveResult {
  address?: string;
  name?: string;
  isValid: boolean;
  error?: string;
}

/**
 * ENS Service for address resolution and profile management
 * Enhances UX by allowing human-readable names
 */
export class ENSService {
  private provider: ethers.providers.Provider;

  constructor(provider?: ethers.providers.Provider) {
    // Use provided provider or default to Ethereum mainnet
    this.provider = provider || new ethers.providers.JsonRpcProvider(
      process.env.ETHEREUM_RPC_URL || 'https://eth-mainnet.alchemyapi.io/v2/your-api-key'
    );
  }

  /**
   * Resolve ENS name to address
   */
  async resolveNameToAddress(ensName: string): Promise<ENSResolveResult> {
    try {
      if (!ensName.endsWith('.eth')) {
        return {
          isValid: false,
          error: 'Invalid ENS name format - must end with .eth'
        };
      }

      const address = await this.provider.resolveName(ensName);
      
      if (!address) {
        return {
          isValid: false,
          error: 'ENS name not found or not configured'
        };
      }

      return {
        name: ensName,
        address,
        isValid: true
      };
    } catch (error) {
      logger.error('ENS name resolution failed', {
        ensName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Resolution failed'
      };
    }
  }

  /**
   * Reverse resolve address to ENS name
   */
  async resolveAddressToName(address: string): Promise<ENSResolveResult> {
    try {
      if (!ethers.utils.isAddress(address)) {
        return {
          isValid: false,
          error: 'Invalid Ethereum address format'
        };
      }

      const ensName = await this.provider.lookupAddress(address);
      
      if (!ensName) {
        return {
          address,
          isValid: true,
          error: 'No ENS name configured for this address'
        };
      }

      // Verify reverse resolution
      const resolvedAddress = await this.provider.resolveName(ensName);
      if (resolvedAddress?.toLowerCase() !== address.toLowerCase()) {
        return {
          address,
          isValid: true,
          error: 'ENS reverse resolution mismatch'
        };
      }

      return {
        name: ensName,
        address,
        isValid: true
      };
    } catch (error) {
      logger.error('ENS address resolution failed', {
        address,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Resolution failed'
      };
    }
  }

  /**
   * Get basic ENS profile information (simplified for ethers v5)
   */
  async getENSProfile(ensName: string): Promise<ENSProfile | null> {
    try {
      const resolveResult = await this.resolveNameToAddress(ensName);
      if (!resolveResult.isValid || !resolveResult.address) {
        return null;
      }

      // For now, return basic profile - can be enhanced later with direct contract calls
      return {
        name: ensName,
        address: resolveResult.address
      };
    } catch (error) {
      logger.error('ENS profile fetch failed', {
        ensName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Smart address resolution - handles both ENS names and addresses
   */
  async smartResolve(input: string): Promise<ENSResolveResult> {
    // If it looks like an address, try reverse resolution
    if (ethers.utils.isAddress(input)) {
      return await this.resolveAddressToName(input);
    }

    // If it looks like an ENS name, resolve to address
    if (input.endsWith('.eth')) {
      return await this.resolveNameToAddress(input);
    }

    return {
      isValid: false,
      error: 'Input must be a valid Ethereum address or ENS name ending with .eth'
    };
  }

  /**
   * Batch resolve multiple addresses/names
   */
  async batchResolve(inputs: string[]): Promise<ENSResolveResult[]> {
    const promises = inputs.map(input => this.smartResolve(input));
    return await Promise.all(promises);
  }

  /**
   * Check if ENS name is available
   */
  async isNameAvailable(ensName: string): Promise<boolean> {
    try {
      const address = await this.provider.resolveName(ensName);
      return address === null;
    } catch (error) {
      logger.error('ENS availability check failed', {
        ensName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Get display name for address (ENS name if available, otherwise shortened address)
   */
  async getDisplayName(address: string): Promise<string> {
    const resolveResult = await this.resolveAddressToName(address);
    
    if (resolveResult.isValid && resolveResult.name) {
      return resolveResult.name;
    }

    // Return shortened address format
    if (ethers.utils.isAddress(address)) {
      return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }

    return address;
  }

  /**
   * Validate and normalize input for blockchain operations
   */
  async normalizeAddress(input: string): Promise<{
    address: string;
    displayName: string;
    isENS: boolean;
  }> {
    const resolveResult = await this.smartResolve(input);
    
    if (!resolveResult.isValid) {
      throw new Error(resolveResult.error || 'Invalid address or ENS name');
    }

    const address = resolveResult.address || input;
    const displayName = resolveResult.name || await this.getDisplayName(address);
    const isENS = !!resolveResult.name;

    return {
      address,
      displayName,
      isENS
    };
  }
}

export default ENSService;
