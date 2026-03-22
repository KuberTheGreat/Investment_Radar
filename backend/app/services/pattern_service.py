import talib
import numpy as np
import pandas as pd

class PatternDetectionService:
    def __init__(self):
        # We define a few key patterns for the scope of the project from Appendix A
        self.active_patterns = {
            "CDLENGULFING": talib.CDLENGULFING,
            "CDLMORNINGSTAR": talib.CDLMORNINGSTAR,
            "CDLEVENINGSTAR": talib.CDLEVENINGSTAR,
            "CDLDOJI": talib.CDLDOJI
        }

    def detect_patterns(self, df: pd.DataFrame):
        """
        Runs TA-Lib pattern detection on a pandas DataFrame containing OHLC data.
        Returns a dictionary of found patterns mapping pattern_name to rows where active.
        """
        detected_signals = {}
        for pattern_name, func in self.active_patterns.items():
            result = func(df['Open'].values, df['High'].values, df['Low'].values, df['Close'].values)
            # Find indices where pattern is positive (+100) or negative (-100)
            active_indices = np.where(result != 0)[0]
            if len(active_indices) > 0:
                for idx in active_indices:
                    signal_dir = "bullish" if result[idx] > 0 else "bearish"
                    if pattern_name not in detected_signals:
                        detected_signals[pattern_name] = []
                    
                    detected_signals[pattern_name].append({
                        "index": idx,
                        "timestamp": df.index[idx],
                        "direction": signal_dir
                    })
        return detected_signals

pattern_service = PatternDetectionService()
