import pandas as pd
import talib
import json
import os

CONFIG_PATH = os.path.join(os.path.dirname(__file__), 'patterns_config.json')

class PatternDetector:
    def __init__(self, config_path=CONFIG_PATH):
        with open(config_path, 'r') as f:
            config = json.load(f)
            self.active_patterns = config.get("active_patterns", [])

    def detect_patterns(self, df: pd.DataFrame) -> list:
        """
        Runs active TA-Lib CDL functions on a dataframe.
        Expects df to have ['Open', 'High', 'Low', 'Close'] columns.
        Returns a list of dictionaries with detected patterns.
        """
        results = []
        if df.empty or len(df) < 50:
            return results # Not enough data for reliable TA-Lib
            
        open_p = df['Open']
        high_p = df['High']
        low_p = df['Low']
        close_p = df['Close']
        
        for pattern in self.active_patterns:
            if hasattr(talib, pattern):
                func = getattr(talib, pattern)
                try:
                    # Compute the pattern array
                    pattern_series = func(open_p, high_p, low_p, close_p)
                    # Filter where pattern is detected (non-zero)
                    detected = pattern_series[pattern_series != 0]
                    
                    for timestamp, value in detected.items():
                        results.append({
                            "timestamp": timestamp,
                            "pattern_name": pattern,
                            "signal_direction": 100 if value > 0 else -100
                        })
                except Exception as e:
                    print(f"Error computing {pattern}: {e}")
                    
        return results
