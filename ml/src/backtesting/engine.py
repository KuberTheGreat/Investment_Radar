import pandas as pd
import numpy as np

class BacktestEngine:
    def __init__(self):
        pass
        
    def compute_win_rates(self, df: pd.DataFrame, pattern_signals: list) -> dict:
        """
        Computes 5-day and 15-day forward win rates for the detected patterns.
        df: the historical OHLCV dataframe over 3 years.
        pattern_signals: list of dicts with 'timestamp', 'pattern_name', 'signal_direction'.
        """
        if not pattern_signals or df.empty:
            return {}
            
        # Ensure df is sorted by timestamp
        df = df.sort_index()
        results = {}
        
        # Group raw signals by pattern
        pattern_dict = {}
        for sig in pattern_signals:
            p_name = sig['pattern_name']
            if p_name not in pattern_dict:
                pattern_dict[p_name] = []
            pattern_dict[p_name].append(sig)
            
        for p_name, signals in pattern_dict.items():
            wins_5d = 0
            wins_15d = 0
            total_5d = 0
            total_15d = 0
            
            for sig in signals:
                t = sig['timestamp']
                direction = sig['signal_direction'] # 100 or -100
                
                # Get the positional index of the detection candle
                try:
                    # In pandas, index might be repeated if not deduplicated, but assuming clean data
                    idx = df.index.get_loc(t)
                    # If duplicate indices exist, get_loc returns slice/bool array, fallback to integer
                    if isinstance(idx, (slice, np.ndarray)):
                        idx = np.where(idx)[0][-1] # Get last occurrence
                except KeyError:
                    continue
                
                # Check 5 days forward
                if idx + 5 < len(df):
                    close_0 = df.iloc[idx]['Close']
                    close_5 = df.iloc[idx + 5]['Close']
                    # Use scalar value in case it's a pandas series due to multi-index
                    c0 = close_0.item() if isinstance(close_0, pd.Series) else close_0
                    c5 = close_5.item() if isinstance(close_5, pd.Series) else close_5
                    
                    if (direction > 0 and c5 > c0) or (direction < 0 and c5 < c0):
                        wins_5d += 1
                    total_5d += 1
                
                # Check 15 days forward
                if idx + 15 < len(df):
                    close_0 = df.iloc[idx]['Close']
                    close_15 = df.iloc[idx + 15]['Close']
                    
                    c0 = close_0.item() if isinstance(close_0, pd.Series) else close_0
                    c15 = close_15.item() if isinstance(close_15, pd.Series) else close_15
                    
                    if (direction > 0 and c15 > c0) or (direction < 0 and c15 < c0):
                        wins_15d += 1
                    total_15d += 1
                    
            results[p_name] = {
                "win_rate_5d": round((wins_5d / total_5d * 100), 2) if total_5d > 0 else 0.0,
                "win_rate_15d": round((wins_15d / total_15d * 100), 2) if total_15d > 0 else 0.0,
                "sample_count": len(signals)
            }
            
        return results
