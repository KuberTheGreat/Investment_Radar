import yfinance as yf
import talib
import pandas as pd
import sys

print("Fetching HDFCBANK.NS data...")
df = yf.download('HDFCBANK.NS', period='3mo', interval='1d', progress=False)

if df.empty:
    print("Failed to fetch data.")
    sys.exit(1)

# Depending on yfinance version, columns could be MultiIndex. We handle both:
if isinstance(df.columns, pd.MultiIndex):
    open_p = df['Open']['HDFCBANK.NS']
    high_p = df['High']['HDFCBANK.NS']
    low_p = df['Low']['HDFCBANK.NS']
    close_p = df['Close']['HDFCBANK.NS']
else:
    open_p = df['Open']
    high_p = df['High']
    low_p = df['Low']
    close_p = df['Close']

engulfing = talib.CDLENGULFING(open_p, high_p, low_p, close_p)
df['CDLENGULFING'] = engulfing

detected = df[df['CDLENGULFING'] != 0]
print(f"Found {len(detected)} engulfing patterns!")
print(detected[['Open', 'High', 'Low', 'Close', 'CDLENGULFING']])
