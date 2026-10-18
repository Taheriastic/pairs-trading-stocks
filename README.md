# 📈 Statistical Arbitrage & Pairs Trading: Coca-Cola (KO) vs. PepsiCo (PEP)

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Streamlit App](https://img.shields.io/badge/Streamlit-Interactive_App-FF4B4B.svg)](https://streamlit.io/)
[![Strategy: Market Neutral](https://img.shields.io/badge/Strategy-Market_Neutral_StatArb-success.svg)]()
[![Method: Engle-Granger](https://img.shields.io/badge/Econometrics-Engle--Granger_Cointegration-blueviolet.svg)]()

> An econometric and quantitative finance research framework and interactive web application testing the long-term equilibrium relationship between **The Coca-Cola Company (`NYSE: KO`)** and **PepsiCo, Inc. (`NASDAQ: PEP`)** to construct, backtest, and evaluate a statistical arbitrage pairs-trading strategy.

---

## 📑 Table of Contents

- [Executive Summary](#-executive-summary)
- [The Core Question: Correlation vs. Cointegration](#-the-core-question-correlation-vs-cointegration)
- [Econometric & Mathematical Foundations](#-econometric--mathematical-foundations)
  - [1. Unit Root & Stationarity Testing (ADF)](#1-unit-root--stationarity-testing-adf)
  - [2. Engle–Granger Two-Step Cointegration](#2-englegranger-two-step-cointegration)
  - [3. Hedge Ratio Estimation](#3-hedge-ratio-estimation)
  - [4. Spread Dynamics & Ornstein–Uhlenbeck Mean Reversion](#4-spread-dynamics--ornsteinuhlenbeck-mean-reversion)
  - [5. Dynamic Z-Score Normalization](#5-dynamic-z-score-normalization)
- [Strategy Architecture & Trading Rules](#-strategy-architecture--trading-rules)
  - [Signal Generation](#signal-generation)
  - [Position Sizing & Capital Allocation](#position-sizing--capital-allocation)
  - [Risk Management & Stop-Loss Protocol](#risk-management--stop-loss-protocol)
- [Performance & Backtesting Framework](#-performance--backtesting-framework)
  - [Key Performance Indicators](#key-performance-indicators)
  - [Transaction Cost Sensitivity Analysis](#transaction-cost-sensitivity-analysis)
- [Cross-Industry Peer Comparison](#-cross-industry-peer-comparison)
- [Interactive Financial Web Application](#-interactive-financial-web-application)
- [Repository Structure](#-repository-structure)
- [Getting Started & Installation](#-getting-started--installation)
- [Academic References](#-academic-references)

---

## 🎯 Executive Summary

The consumer-staples sector presents a classic arena for statistical arbitrage. **The Coca-Cola Company (KO)** and **PepsiCo, Inc. (PEP)** share similar macroeconomic exposures, commodity cost drivers (sugar, aluminum, packaging, transportation), regulatory pressures, and consumer demand profiles. However, standard financial analysis often conflates **high correlation** with **cointegration**.

This project provides a rigorous quantitative framework that:
1. Gathers and cleans daily adjusted closing price histories for KO and PEP.
2. Formally evaluates stationarity and tests whether the price series are integrated of order 1 ($I(1)$).
3. Applies the **Engle–Granger two-step cointegration methodology** to test for a stationary ($I(0)$), mean-reverting linear combination (spread).
4. Estimates the time-series hedge ratio $\beta$ via Ordinary Least Squares (OLS) and rolling regression.
5. Models spread velocity and mean-reversion speed using an **Ornstein–Uhlenbeck (OU)** process, calculating the spread's half-life ($t_{1/2}$).
6. Deploys a **market-neutral pairs-trading strategy** that enters long/short spread positions when deviations from the mean exceed statistical thresholds ($Z$-score) and closes upon mean convergence.
7. Validates strategy robustness across transaction cost tiers (0 to 20 bps slippage/commissions) and compares performance against peer pairs across diverse industries (e.g., XOM/CVX, MSFT/GOOGL, JPM/BAC, WMT/TGT).
8. Delivers an **interactive web-based quantitative dashboard** enabling users to explore the live financial data, run custom backtests, visualize spreads and trade signals, and inspect statistical diagnostics.

---

## ⚖️ The Core Question: Correlation vs. Cointegration

A fundamental pitfall in quantitative investing is relying on simple price correlation:

$$\rho_{X, Y} = \frac{\text{Cov}(X, Y)}{\sigma_X \sigma_Y}$$

| Property | Correlation | Cointegration |
| :--- | :--- | :--- |
| **Time Horizon** | Measures short-term co-movement of returns. | Identifies stable, long-term equilibrium in price levels. |
| **Stationarity Requirement** | Can be spurious when evaluated on non-stationary price levels ($I(1)$). | Requires a linear combination $Y_t - \beta X_t$ to be strictly stationary ($I(0)$). |
| **Mean Reversion** | Does **not** guarantee prices will converge if they drift apart. | Mathematically enforces that spread deviations are temporary and mean-reverting. |
| **Strategy Suitability** | Weak foundation for pairs trading; high risk of non-converging divergence. | Robust statistical foundation for market-neutral mean-reversion arbitrage. |

*Granger & Newbold (1974)* demonstrated that non-stationary time series with independent trends often exhibit statistically significant correlations (spurious regression). Cointegration ensures that divergence represents a true temporary pricing dislocation rather than a structural drift.

---

## 📐 Econometric & Mathematical Foundations

### 1. Unit Root & Stationarity Testing (ADF)

Before testing for cointegration, we verify that individual asset prices $P_{KO,t}$ and $P_{PEP,t}$ are non-stationary in levels and stationary in first differences ($I(1)$). We employ the **Augmented Dickey–Fuller (ADF)** test:

$$\Delta y_t = \alpha + \beta t + \gamma y_{t-1} + \sum_{i=1}^p \delta_i \Delta y_{t-i} + \varepsilon_t$$

- **Null Hypothesis ($H_0$)**: $\gamma = 0$ (Unit root exists; the series is non-stationary).
- **Alternative Hypothesis ($H_1$)**: $\gamma < 0$ (The series is stationary).

### 2. Engle–Granger Two-Step Cointegration

If both series are $I(1)$, the **Engle–Granger framework** proceeds as follows:

#### Step 1: Cointegrating OLS Regression
Estimate the static cointegrating vector:

$$P_{KO, t} = \alpha + \beta P_{PEP, t} + \varepsilon_t$$

where:
- $\beta$ is the hedge ratio (units of PEP to short/long per unit of KO).
- $\alpha$ is the intercept term.
- $\varepsilon_t$ is the residual spread at time $t$.

#### Step 2: Residual Stationarity Testing
Perform an ADF test on the estimated residuals $\hat{\varepsilon}_t$:

$$\Delta \hat{\varepsilon}_t = \lambda \hat{\varepsilon}_{t-1} + \sum_{j=1}^k \psi_j \Delta \hat{\varepsilon}_{t-j} + u_t$$

Because $\hat{\varepsilon}_t$ is generated from an estimated regression rather than observed raw data, standard Dickey–Fuller critical values cannot be used. We utilize **Engle–Yoo (1987) / MacKinnon (1991, 2010)** adjusted critical values to prevent false discoveries.

### 3. Hedge Ratio Estimation

The hedge ratio $\beta$ determines the exact capital exposure:

$$\beta = \frac{\text{Cov}(P_{KO}, P_{PEP})}{\text{Var}(P_{PEP})}$$

To avoid lookahead bias and adapt to structural shifts, the project implements:
- **Static In-Sample OLS**: Baseline hedge ratio over formation period.
- **Rolling Window OLS**: Time-varying hedge ratio $\beta_t$ computed over a rolling lookback window (e.g., $M = 60, 90, 180$ days).
- **Total Least Squares (Orthogonal Regression)**: Accounting for errors-in-variables on both sides of the asset pair.

### 4. Spread Dynamics & Ornstein–Uhlenbeck Mean Reversion

The residual spread $\text{Spread}_t = P_{KO,t} - \beta P_{PEP,t} - \alpha$ is modeled as a continuous-time **Ornstein–Uhlenbeck (OU)** stochastic process:

$$d S_t = \theta (\mu - S_t) dt + \sigma dW_t$$

where:
- $\theta > 0$ represents the speed of mean reversion.
- $\mu$ is the long-term equilibrium spread level.
- $\sigma$ is the spread volatility.
- $W_t$ is a standard Brownian motion.

In discrete time, this is estimated via an AR(1) regression:

$$S_t = a + b S_{t-1} + \eta_t, \quad \text{where } b = e^{-\theta \Delta t} \approx 1 - \theta \Delta t$$

The **half-life of mean reversion** $t_{1/2}$ (the expected time required for the spread to decay halfway back to its mean) is:

$$t_{1/2} = \frac{\ln(2)}{\theta} = -\frac{\ln(2) \cdot \Delta t}{\ln(b)}$$

> An optimal trading pair exhibits an OU half-life between **5 and 30 trading days**, balancing trade frequency against transaction costs.

### 5. Dynamic Z-Score Normalization

To generate actionable signals across varying market regimes, the spread is normalized into a dimensionless rolling $Z$-score:

$$Z_t = \frac{\text{Spread}_t - \mu_w(t)}{\sigma_w(t)}$$

where $\mu_w(t)$ and $\sigma_w(t)$ are the rolling mean and rolling standard deviation over a lookback window $w$ (e.g., 30 to 60 trading days).

---

## 🕹️ Strategy Architecture & Trading Rules

```
                      +-----------------------------+
                      |   Historical Market Data    |
                      |        KO & PEP EOD         |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      |  Engle-Granger Cointegration|
                      |   ADF p-value < 0.05 Test   |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      |    Hedge Ratio (Beta) &     |
                      |   Rolling Spread Formation  |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      |     Rolling Z-Score (Z_t)   |
                      +--------------+--------------+
                                     |
              +----------------------+----------------------+
              |                                             |
              v                                             v
     [ Z_t > +Entry Threshold ]                    [ Z_t < -Entry Threshold ]
              |                                             |
              v                                             v
     +-----------------------+                     +-----------------------+
     |   SHORT SPREAD        |                     |    LONG SPREAD        |
     | - Short KO            |                     | - Long KO             |
     | - Long Beta * PEP     |                     | - Short Beta * PEP    |
     +-----------+-----------+                     +-----------+-----------+
                 |                                             |
                 v                                             v
     [ |Z_t| <= Exit Threshold ]                   [ |Z_t| <= Exit Threshold ]
                 |                                             |
                 +---------------------+-----------------------+
                                       |
                                       v
                             +-------------------+
                             |  CLOSE POSITION   |
                             |  (Capture Alpha)  |
                             +-------------------+
                                       |
              +------------------------+------------------------+
              | (If |Z_t| >= Stop Threshold: EMERGENCY CLOSE)   |
              +-------------------------------------------------+
```

### Signal Generation

1. **Short the Spread (Overvalued)**:
   - **Condition**: $Z_t > +2.0$ (KO is expensive relative to PEP).
   - **Execution**: Short 1 unit of KO; Long $\beta$ units of PEP.
2. **Long the Spread (Undervalued)**:
   - **Condition**: $Z_t < -2.0$ (KO is cheap relative to PEP).
   - **Execution**: Long 1 unit of KO; Short $\beta$ units of PEP.
3. **Exit / Take Profit (Convergence)**:
   - **Condition**: $Z_t$ reverts toward zero, $|Z_t| \le 0.5$ (or sign change of $Z$).
   - **Execution**: Liquidate both positions.
4. **Stop-Loss Protocol (Breakdown / Divergence)**:
   - **Condition**: $|Z_t| \ge 3.5$ or position duration exceeds $3 \times t_{1/2}$.
   - **Execution**: Immediate liquidation to protect capital against structural breaks (e.g., mergers, sudden antitrust litigation, individual earnings divergence).

### Position Sizing & Capital Allocation

To ensure strict dollar neutrality:

$$\text{Dollar Position}_{KO} = \pm W \cdot \frac{P_{KO}}{P_{KO} + \beta P_{PEP}}$$

$$\text{Dollar Position}_{PEP} = \mp W \cdot \frac{\beta P_{PEP}}{P_{KO} + \beta P_{PEP}}$$

where $W$ is the total trade capital allocated per signal.

---

## 📊 Performance & Backtesting Framework

### Key Performance Indicators

The backtest engine computes institutional-grade risk and performance metrics:

- **Cumulative Return**: $\prod_{t=1}^T (1 + R_t) - 1$
- **Compound Annual Growth Rate (CAGR)**: $(1 + R_{\text{cum}})^{252/T} - 1$
- **Annualized Sharpe Ratio**: $\sqrt{252} \cdot \frac{\mathbb{E}[R_t - R_f]}{\sigma(R_t)}$
- **Sortino Ratio**: $\sqrt{252} \cdot \frac{\mathbb{E}[R_t - R_f]}{\sigma_{\text{downside}}(R_t)}$
- **Maximum Drawdown (MDD)**: $\max_{\tau \in [0, t]} \left( \frac{\text{Peak}_\tau - \text{Equity}_t}{\text{Peak}_\tau} \right)$
- **Calmar Ratio**: $\frac{\text{CAGR}}{|\text{MDD}|}$
- **Trade Win Rate**: $\frac{\text{Profitable Trades}}{\text{Total Completed Trades}}$
- **Profit Factor**: $\frac{\sum \text{Gross Profits}}{\sum |\text{Gross Losses}|}$
- **Average Holding Period**: Mean number of bars held per trade cycle.

### Transaction Cost Sensitivity Analysis

Statistical arbitrage strategies frequently fail in production due to trading friction. This study evaluates net performance under five cost regimes:

| Cost Regime | Per-Leg Slippage + Commission (bps) | Round-Trip Total Cost (bps) | Impact on Sharpe |
| :--- | :--- | :--- | :--- |
| **Frictionless** | 0.0 bps | 0.0 bps | Theoretical baseline |
| **Low Friction** (Tier-1 Institutional) | 2.5 bps | 5.0 bps | Minor degradation |
| **Standard Friction** (DMA Retail / Pro) | 5.0 bps | 10.0 bps | Realistic benchmark |
| **High Friction** | 10.0 bps | 20.0 bps | Stress test |
| **Extreme Friction** | 15.0 bps | 30.0 bps | Breakeven limit check |

---

## 🌐 Cross-Industry Peer Comparison

Does the Consumer Staples duopoly (KO / PEP) provide superior mean-reversion characteristics compared to other sectors? The framework benchmarks against selected pairs:

| Sector | Pair | Hypothesis | Expected Cointegration | Expected Mean-Reversion |
| :--- | :--- | :--- | :---: | :---: |
| **Consumer Staples** | `KO` vs. `PEP` | Core Pair: Global beverage/snack duopoly | **High** | Stable, moderate half-life |
| **Energy** | `XOM` vs. `CVX` | Integrated oil supermajors, identical commodity drivers | **High** | Strong, fast half-life |
| **Technology** | `MSFT` vs. `GOOGL` | Enterprise software / cloud / digital advertising | **Moderate** | Susceptible to divergence from individual AI cycles |
| **Financials** | `JPM` vs. `BAC` | Global systemically important banks (G-SIBs) | **High** | Interest-rate sensitive |
| **Retail** | `WMT` vs. `TGT` | Big-box discount department stores | **Moderate** | Divergent margins / product mix |
| **Control Pair (Spurious)** | `KO` vs. `WMT` | Unrelated business lines with coincidentally high $R^2$ | **Low / None** | Non-stationary spread |

---

## 💻 Interactive Financial Web Application

The repository includes a modern, high-performance web application built with **Streamlit** and **Plotly** designed for quantitative analysts and portfolio managers.

### Application Capabilities:
1. **Live Data Ingestion**: One-click download of split- and dividend-adjusted closing prices via Yahoo Finance API.
2. **Interactive Statistical Workbench**:
   - Dynamic ADF stationarity tests on raw prices, log prices, and first differences.
   - Engle–Granger cointegration test runner displaying test statistics, p-values, and critical value thresholds.
   - OLS regression summary with scatter plot and fitted cointegrating line.
3. **Visual Spread & Signal Studio**:
   - Interactive candlestick and spread charts with zoom/pan capabilities.
   - Dynamic rolling $Z$-score chart overlaid with customizable entry thresholds ($\pm 1.5\sigma, \pm 2.0\sigma$) and exit bands.
   - Automatic highlighting of long spread entry, short spread entry, take-profit exit, and stop-loss events.
4. **Custom Backtest Engine**:
   - User-configurable formation period vs. trading period.
   - Adjustable lookback windows ($M \in [10, 252]$ days).
   - Real-time transaction cost slider (0 to 30 bps).
   - Equity curve comparison: Pairs Trading Strategy vs. Buy-and-Hold KO vs. Buy-and-Hold PEP.
   - Underwater drawdown visualization.
5. **Cross-Pair Benchmark Explorer**:
   - Toggle instantly between KO/PEP and other sector pairs to inspect cointegration strength side-by-side.

---

## 📁 Repository Structure

```
.
├── .gitignore                      # Git ignore rules for Python, data, and cache
├── LICENSE                         # MIT License
├── README.md                       # Quantitative research & project documentation
├── requirements.txt                # Production Python dependencies
├── pyproject.toml                  # Project packaging and metadata configuration
├── app/
│   ├── __init__.py
│   └── app.py                      # Streamlit interactive quantitative dashboard
├── src/
│   ├── __init__.py
│   ├── data_loader.py              # Historical market data fetcher and preprocessor
│   ├── cointegration.py            # ADF tests, Engle-Granger framework, OU process
│   ├── backtest.py                 # Market-neutral signal generator and execution simulator
│   └── metrics.py                  # Sharpe, Sortino, Drawdown, and cost sensitivity calculations
├── notebooks/
│   └── 01_ko_pep_cointegration.ipynb # Exploratory data analysis and research notebook
└── tests/
    ├── __init__.py
    ├── test_cointegration.py       # Unit tests for econometric calculations
    └── test_backtest.py            # Unit tests for trade signals and PnL accounting
```

---

## 🚀 Getting Started & Installation

### Prerequisites
- Python 3.10, 3.11, or 3.12+
- `pip` or `conda` package manager
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/Taheriastic/pairs-trading-ko-pep.git
cd pairs-trading-ko-pep
```

### 2. Create and Activate Virtual Environment
```bash
# macOS / Linux
python3 -m venv venv
source venv/bin/activate

# Windows
python -m venv venv
venv\Scripts\activate
```

### 3. Install Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Launch the Interactive Web Dashboard
```bash
streamlit run app/app.py
```
Open your browser at `http://localhost:8501` to explore the live quantitative analysis.

### 5. Run the Automated Test Suite
```bash
pytest tests/ -v
```

---

## 📚 Academic References

1. **Engle, R. F., & Granger, C. W. (1987).** *Co-integration and error correction: representation, estimation, and testing.* Econometrica: journal of the Econometric Society, 251-276.
2. **Granger, C. W., & Newbold, P. (1974).** *Spurious regressions in econometrics.* Journal of econometrics, 2(2), 111-120.
3. **Gatev, E., Goetzmann, W. N., & Rouwenhorst, K. G. (2006).** *Pairs trading: Performance of a relative-value arbitrage rule.* The Review of Financial Studies, 19(3), 797-827.
4. **Vidyamurthy, G. (2004).** *Pairs Trading: quantitative methods and analysis.* John Wiley & Sons.
5. **Pole, A. (2007).** *Statistical Arbitrage: Algorithmic Trading Insights and Techniques.* John Wiley & Sons.
6. **MacKinnon, J. G. (2010).** *Critical values for cointegration tests.* Queen's Economics Department Working Paper No. 1227.

---

## 📄 License

This project is open-source and distributed under the [MIT License](LICENSE).

---

*Disclaimer: This repository is for academic and educational research purposes only. It does not constitute financial or investment advice. Algorithmic trading involves substantial risk of financial loss.*
