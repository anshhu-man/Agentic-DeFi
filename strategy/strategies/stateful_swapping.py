from dataclasses import dataclass, field
from typing import List, Optional, Literal, Dict
import time

TradeSide = Literal["ETH_TO_USDC", "USDC_TO_ETH", "HOLD"]


@dataclass
class TradeRecord:
    timestamp: float
    side: TradeSide
    eth_price: float
    size_eth: float
    pnl_pct: float


@dataclass
class StrategyMemory:
    trades: List[TradeRecord] = field(default_factory=list)
    success_rates: Dict[str, float] = field(default_factory=lambda: {
        "ETH_TO_USDC": 0.0,
        "USDC_TO_ETH": 0.0,
        "HOLD": 0.0
    })
    avg_pnl: Dict[str, float] = field(default_factory=lambda: {
        "ETH_TO_USDC": 0.0,
        "USDC_TO_ETH": 0.0,
        "HOLD": 0.0
    })
    max_trades_kept: int = 100
    last_summary_at: float = 0.0
    summary_cooldown_sec: int = 120

    def update_metrics(self) -> None:
        if not self.trades:
            # reset to zeros when no trades
            for k in self.success_rates:
                self.success_rates[k] = 0.0
                self.avg_pnl[k] = 0.0
            return

        by_side = {"ETH_TO_USDC": [], "USDC_TO_ETH": [], "HOLD": []}
        for t in self.trades:
            by_side[t.side].append(t.pnl_pct)

        for side, arr in by_side.items():
            if arr:
                wins = sum(1 for x in arr if x > 0)
                self.success_rates[side] = wins / len(arr)
                self.avg_pnl[side] = sum(arr) / len(arr)
            else:
                self.success_rates[side] = 0.0
                self.avg_pnl[side] = 0.0

    def summarize_if_needed(self) -> None:
        now = time.time()
        if len(self.trades) <= self.max_trades_kept:
            return
        if now - self.last_summary_at < self.summary_cooldown_sec:
            return

        # Keep last 10 plus best trade by PnL (if not already in recent)
        best_trade = max(self.trades, key=lambda t: t.pnl_pct, default=None)
        recent = self.trades[-10:]
        kept = list(recent)
        if best_trade is not None and all(t is not best_trade for t in kept):
            kept.append(best_trade)

        self.trades = kept
        self.update_metrics()
        self.last_summary_at = now


class StatefulSwapStrategy:
    def __init__(
        self,
        rebalance_threshold: float = 0.0,
        observe_cycles_before_trade: int = 0,
        max_trades_kept: int = 100
    ):
        self.memory = StrategyMemory(max_trades_kept=max_trades_kept)
        self.rebalance_threshold = rebalance_threshold
        self.observe_cycles_before_trade = observe_cycles_before_trade
        self.observed_cycles = 0
        self._last_price: Optional[float] = None

    def observe(self, eth_price: float, market_volatility: Optional[float] = None) -> None:
        self.observed_cycles += 1
        self._last_price = eth_price

    def _market_signal(self, eth_price: float) -> float:
        if self._last_price is None:
            return 0.0
        delta = eth_price - self._last_price
        rel = (delta / self._last_price) if self._last_price > 0 else 0.0
        # Clamp signal to [-0.02, 0.02]
        return max(min(rel, 0.02), -0.02)

    def decide(
        self,
        eth_price: float,
        portfolio_eth: float,
        portfolio_usdc: float,
        recent_market_signal: Optional[float] = None
    ) -> TradeSide:
        # Wait for observation warmup
        if self.observed_cycles < self.observe_cycles_before_trade:
            self._last_price = eth_price
            return "HOLD"

        eth_to_usdc_score = self.memory.avg_pnl["ETH_TO_USDC"]
        usdc_to_eth_score = self.memory.avg_pnl["USDC_TO_ETH"]
        market_bias = self._market_signal(eth_price) if recent_market_signal is None else recent_market_signal

        # Simple scoring: use average PnL memory plus current market bias
        score_buy_eth = usdc_to_eth_score + market_bias
        score_sell_eth = eth_to_usdc_score - market_bias

        if self.rebalance_threshold <= 0:
            if score_buy_eth > score_sell_eth and portfolio_usdc > 0:
                self._last_price = eth_price
                return "USDC_TO_ETH"
            if score_sell_eth > score_buy_eth and portfolio_eth > 0:
                self._last_price = eth_price
                return "ETH_TO_USDC"
            self._last_price = eth_price
            return "HOLD"

        # Require a minimum score gap to trade
        diff = abs(score_buy_eth - score_sell_eth)
        if diff < self.rebalance_threshold:
            self._last_price = eth_price
            return "HOLD"

        self._last_price = eth_price
        return "USDC_TO_ETH" if score_buy_eth > score_sell_eth else "ETH_TO_USDC"

    def record_trade_outcome(
        self,
        side: TradeSide,
        entry_price: float,
        exit_price: float,
        size_eth: float
    ) -> None:
        if side == "USDC_TO_ETH":
            pnl_pct = (exit_price - entry_price) / entry_price if entry_price > 0 else 0.0
        elif side == "ETH_TO_USDC":
            pnl_pct = (entry_price - exit_price) / entry_price if entry_price > 0 else 0.0
        else:
            pnl_pct = 0.0

        self.memory.trades.append(TradeRecord(
            timestamp=time.time(),
            side=side,
            eth_price=exit_price,
            size_eth=size_eth,
            pnl_pct=pnl_pct
        ))
        self.memory.update_metrics()
        self.memory.summarize_if_needed()

    def performance_insights(self) -> str:
        sr = self.memory.success_rates
        ap = self.memory.avg_pnl
        return (
            f"ETH->USDC success: {sr['ETH_TO_USDC']:.2f}, avg PnL: {ap['ETH_TO_USDC']:.3f}; "
            f"USDC->ETH success: {sr['USDC_TO_ETH']:.2f}, avg PnL: {ap['USDC_TO_ETH']:.3f}"
        )
