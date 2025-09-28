.PHONY: run-strategy test-fast

PYTHON ?= python3

run-strategy:
	$(PYTHON) scripts/run_stateful_strategy.py --iterations 50 --observe-cycles 10 --rebalance-threshold 0.0 --sleep-sec 1.5

test-fast:
	$(PYTHON) scripts/run_stateful_strategy.py --iterations 10 --observe-cycles 3 --sleep-sec 0.5
