import pandas as pd
import sys
sys.stdout.reconfigure(encoding='utf-8')

df = pd.read_excel('Shanghai_T2DM/2000_0_20201230.xlsx')
print('columns:', df.columns.tolist())
print('rows:', len(df))
print(df.head(5).to_string())
