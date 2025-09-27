import https from 'https';
import { logger } from './logger';

/**
 * Network configuration utilities for handling SSL and connectivity issues
 */
export class NetworkConfig {
  private static instance: NetworkConfig;
  private httpsAgent: https.Agent;

  private constructor() {
    // Create HTTPS agent with relaxed SSL for development
    this.httpsAgent = new https.Agent({
      rejectUnauthorized: process.env.NODE_ENV === 'production',
      timeout: 30000,
      keepAlive: true,
      maxSockets: 50,
    });

    this.setupGlobalNetworkConfig();
  }

  public static getInstance(): NetworkConfig {
    if (!NetworkConfig.instance) {
      NetworkConfig.instance = new NetworkConfig();
    }
    return NetworkConfig.instance;
  }

  private setupGlobalNetworkConfig(): void {
    // Handle SSL certificate issues in development
    if (process.env.NODE_ENV !== 'production') {
      process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";
      logger.warn('SSL certificate validation disabled for development');
    }

    // Set global timeout for network requests
    process.env.NODE_OPTIONS = `${process.env.NODE_OPTIONS || ''} --max-http-header-size=32768`;
  }

  public getHttpsAgent(): https.Agent {
    return this.httpsAgent;
  }

  public getAxiosConfig() {
    return {
      timeout: 30000,
      httpsAgent: this.httpsAgent,
      headers: {
        'User-Agent': 'Agentic-DeFi-Backend/1.0.0',
        'Accept': 'application/json',
        'Connection': 'keep-alive',
      },
      maxRedirects: 3,
      validateStatus: (status: number) => status < 500, // Don't throw on 4xx errors
    };
  }

  public async testConnectivity(url: string): Promise<boolean> {
    try {
      const axios = require('axios');
      const response = await axios.get(url, {
        ...this.getAxiosConfig(),
        timeout: 5000,
      });
      return response.status < 400;
    } catch (error) {
      logger.warn('Connectivity test failed', { url, error: (error as any)?.message });
      return false;
    }
  }
}

export default NetworkConfig;
