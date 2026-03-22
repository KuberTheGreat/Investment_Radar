import pandas as pd
import numpy as np

class OpportunityRadar:
    def __init__(self):
        pass
        
    def scan_for_anomalies(self, df: pd.DataFrame, events_df: pd.DataFrame, symbol: str) -> list:
        """
        df: daily OHLCV for the symbol
        events_df: corporate events for the symbol (Bulk/Block deals, Insider buys)
        """
        opportunities = []
        if df.empty or events_df.empty:
            return opportunities
            
        # Example anomaly: Promoter buying >= 1Cr while stock has dropped >= 5% in 5 days
        promoter_buys = events_df[(events_df['client_name'].str.contains('PROMOTER', case=False, na=False)) & 
                                  (events_df['buy_sell'] == 'BUY') &
                                  (events_df['total_value_cr'] >= 1.0)]
                                  
        for _, row in promoter_buys.iterrows():
            event_date = row['date']
            try:
                idx = df.index.get_loc(pd.to_datetime(event_date))
                if isinstance(idx, (slice, np.ndarray)):
                    idx = np.where(idx)[0][-1]
                    
                if idx >= 5:
                    current_close = df.iloc[idx]['Close']
                    past_close = df.iloc[idx - 5]['Close']
                    c_val = current_close.item() if isinstance(current_close, pd.Series) else current_close
                    p_val = past_close.item() if isinstance(past_close, pd.Series) else past_close
                    
                    price_change = (c_val - p_val) / p_val * 100
                    
                    if price_change <= -5.0:
                        opportunities.append({
                            "type": "opportunity",
                            "name": "Promoter Buy on Dip",
                            "symbol": symbol,
                            "timestamp": event_date,
                            "details": f"Promoter bought {row['total_value_cr']}Cr while stock down {price_change:.1f}%",
                            "source_reference": row.get('source_reference', 'BSE Feed')
                        })
            except KeyError:
                continue
                
        return opportunities
