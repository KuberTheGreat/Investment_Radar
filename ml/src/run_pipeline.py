import sys
import os
import argparse
import yfinance as yf
import pandas as pd

# Add the parent directory to the path so 'src' can be imported
sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

from src.pattern_recognition.detector import PatternDetector
from src.opportunity_radar.radar import OpportunityRadar
from src.backtesting.engine import BacktestEngine
from src.llm_engine.explainer import LLMExplainer

def run_pipeline_for_symbol(symbol):
    print(f"\n{'='*50}")
    print(f"--- Testing System Pipeline for {symbol} ---")
    print(f"{'='*50}")
    
    # 1. Fetch Data
    print("1. Fetching data...")
    df = yf.download(symbol, period='1y', interval='1d', progress=False)
    if df.empty:
        print(f"Failed to fetch data for {symbol}.")
        return
        
    # Handle multi-index columns from yfinance
    if isinstance(df.columns, pd.MultiIndex):
        df_clean = pd.DataFrame({
            'Open': df['Open'][symbol],
            'High': df['High'][symbol],
            'Low': df['Low'][symbol],
            'Close': df['Close'][symbol],
            'Volume': df['Volume'][symbol]
        })
    else:
        df_clean = df
        
    # 2. Pattern Detection
    print("\n2. Running Pattern Detection...")
    detector = PatternDetector()
    patterns = detector.detect_patterns(df_clean)
    print(f"Detected {len(patterns)} patterns.")
    if patterns:
        print(f"Sample pattern: {patterns[-1]}")
        
    # 3. Opportunity Radar
    print("\n3. Running Opportunity Radar...")
    radar = OpportunityRadar()
    # Dummy events data for radar
    events_data = {
        'date': [df_clean.index[-10].strftime('%Y-%m-%d')] if len(df_clean) > 10 else [],
        'client_name': ['PROMOTER GROUP'],
        'buy_sell': ['BUY'],
        'total_value_cr': [2.5],
        'source_reference': ['BSE']
    }
    events_df = pd.DataFrame(events_data)
    opportunities = radar.scan_for_anomalies(df_clean, events_df, symbol)
    print(f"Found {len(opportunities)} opportunities.")
    if opportunities:
        print(f"Sample opportunity: {opportunities[0]}")
        
    # 4. Backtesting Engine
    print("\n4. Running Backtest Engine...")
    engine = BacktestEngine()
    win_rates = engine.compute_win_rates(df_clean, patterns)
    print(f"Computed win rates for {len(win_rates)} pattern types.")
    for p_name, stats in list(win_rates.items())[:2]:
        print(f"  {p_name}: {stats}")
        
    # 5. LLM Engine
    print("\n5. Initializing LLM Explainer... (Not calling API to save credits)")
    # We initialize it but don't call Anthropic API without an explicit key
    explainer = LLMExplainer(api_key="dummy_api_key")
    print("LLM Explainer correctly initialized.")
    
    print(f"\n--- Pipeline Test Complete for {symbol} ---")

def main():
    parser = argparse.ArgumentParser(description="Run the Investment Radar ML Pipeline.")
    parser.add_argument(
        'symbols', 
        metavar='S', 
        type=str, 
        nargs='*', 
        help='A list of stock symbols to test (e.g., RELIANCE.NS TCS.NS).'
    )
    args = parser.parse_args()

    # If no symbols are provided, default to a predefined list
    symbols = args.symbols if args.symbols else ['HDFCBANK.NS', 'RELIANCE.NS', 'TCS.NS']

    print(f"Starting pipeline run for the following symbols: {', '.join(symbols)}")
    for symbol in symbols:
        run_pipeline_for_symbol(symbol)

if __name__ == "__main__":
    main()

