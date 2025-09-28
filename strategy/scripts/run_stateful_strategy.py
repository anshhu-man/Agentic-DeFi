#!/usr/bin/env python3
"""
LLM-free runner: This script runs the stateful swapping strategy only.
It performs no calls to LLMs or external model providers (OpenAI, Ollama).
It is offline-safe by default and uses stubbed price/execution.
"""
import argparse
import time
import random
import os
import sys
from typing import Optional

# Enforce offline/LLM-free mode (no external model calls)
FORBIDDEN_ENV_VARS = ("OPENAI_API_KEY", "OLLAMA_HOST", "OLLAMA_BASE_URL")
_ignored_llm_env = [k for k in FORBIDDEN_ENV_VARS if os.getenv(k)]
if _ignored_llm_env:
    print(f"[info] LLM-related env vars detected but ignored by this runner: {', '.join(_ignored_llm_env)}")

# Ensure repo root on sys.path so `strategies` resolves if run from scripts/
REPO_ROOT = os.path.dirname(os.path.dirname(__file__))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from strategies.stateful_swapping import StatefulSwapStrategy, TradeSide

# NOTE: Replace these stubs with real connectors from the repo if available.

def get_eth_price_stub() -> float:
    # Replace with on-chain price source or Uniswap v4 quote
    return 3000 + random.uniform(-30, 30)

def execute_swap_stub(side: TradeSide, amount_eth: float, amount_usdc: float, price: float):
    # Replace with Uniswap v4 swap execution
    if side == "USDC_TO_ETH":
        # buy ETH with all USDC
        eth_bought = (amount_usdc / price) if price > 0 else 0.0
        return eth_bought, 0.0
    elif side == "ETH_TO_USDC":
        # sell all ETH
        usdc_received = amount_eth * price
        return 0.0, usdc_received
    else:
        return amount_eth, amount_usdc

def main():
    parser = argparse.ArgumentParser(description="Run stateful swapping strategy without LLM/stateless logic.")
    parser.add_argument("--iterations", type=int, default=50)
    parser.add_argument("--observe-cycles", type=int, default=0)
    parser.add_argument("--rebalance-threshold", type=float, default=0.0)
    parser.add_argument("--sleep-sec", type=float, default=2.0)
    parser.add_argument("--initial-eth", type=float, default=1.0)
    parser.add_argument("--initial-usdc", type=float, default=3000.0)
    parser.add_argument("--seed", type=int, default=None, help="Optional RNG seed for reproducibility")
    args = parser.parse_args()

    if args.seed is not None:
        random.seed(args.seed)

    strategy = StatefulSwapStrategy(
        rebalance_threshold=args.rebalance_threshold,
        observe_cycles_before_trade=args.observe_cycles,
        max_trades_kept=200
    )

    portfolio_eth = args.initial_eth
    portfolio_usdc = args.initial_usdc

    # Track an open leg to realize PnL on the next iteration
    entry_side: Optional[TradeSide] = None
    entry_price: Optional[float] = None
    entry_size_eth: float = 0.0

    for i in range(args.iterations):
        price = get_eth_price_stub()

        # Warmup observations
        if i < args.observe_cycles:
            strategy.observe(price)

        # Realize PnL from previous entry on the next tick
        if entry_side is not None and entry_price is not None:
            strategy.record_trade_outcome(entry_side, entry_price, price, entry_size_eth)
            entry_side = None
            entry_price = None
            entry_size_eth = 0.0

        # Decide action based on memory and market signal
        side = strategy.decide(
            eth_price=price,
            portfolio_eth=portfolio_eth,
            portfolio_usdc=portfolio_usdc,
            recent_market_signal=None
        )

        print(f"[{i}] Price={price:.2f} | Decide={side} | {strategy.performance_insights()}")

        if side == "USDC_TO_ETH" and portfolio_usdc > 0:
            # Execute trade
            eth_bought, _ = execute_swap_stub(side, portfolio_eth, portfolio_usdc, price)
            # Record entry to realize next iteration
            entry_side = side
            entry_price = price
            entry_size_eth = eth_bought
            # Update portfolio
            portfolio_eth += eth_bought
            portfolio_usdc = 0.0
            print(f"  Bought ETH: +{eth_bought:.6f} ETH")

        elif side == "ETH_TO_USDC" and portfolio_eth > 0:
            # Execute trade
            _, usdc_received = execute_swap_stub(side, portfolio_eth, portfolio_usdc, price)
            # Record entry to realize next iteration
            entry_side = side
            entry_price = price
            entry_size_eth = portfolio_eth
            # Update portfolio
            portfolio_usdc += usdc_received
            portfolio_eth = 0.0
            print(f"  Sold ETH: +{usdc_received:.2f} USDC")

        time.sleep(args.sleep_sec)

    print(f"Final portfolio: {portfolio_eth:.6f} ETH, {portfolio_usdc:.2f} USDC")

if __name__ == "__main__":
    main()
