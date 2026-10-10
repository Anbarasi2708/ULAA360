import pandas as pd
import numpy as np
import os
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import json

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'data')
MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', 'models')

def train_demand_model():
    print("--- Training Demand Prediction Model ---")
    
    demand_file = os.path.join(DATA_DIR, 'historical_passenger_demand.csv')
    if not os.path.exists(demand_file):
        raise FileNotFoundError(f"Dataset not found at {demand_file}")
        
    df = pd.read_csv(demand_file)
    
    # 1. Clean Data & Handle Missing Values
    print(f"Loaded {len(df)} records.")
    df = df.dropna(subset=['pax', 'origin', 'dest', 'event_type'])
    
    # Exclude invalid 'served' rows if served is supposed to be less than pax,
    # but since 'served' is not a feature, we don't need to filter for training pax.
    
    # 2. Feature Engineering
    # Extract hour from time_interval (e.g. '08:00-09:00' -> 8)
    df['hour'] = df['time_interval'].apply(lambda x: int(x.split(':')[0]) if isinstance(x, str) else 12)
    
    # Define features and target
    features = ['origin', 'dest', 'event_type', 'hour', 'weather']
    target = 'pax'
    
    X = df[features]
    y = df[target]
    
    # 3. Preprocessing Pipeline
    categorical_features = ['origin', 'dest', 'event_type', 'weather']
    numeric_features = ['hour']
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), numeric_features),
            ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features)
        ])
        
    # 4. Model Selection
    model = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('regressor', HistGradientBoostingRegressor(random_state=42))
    ])
    
    # 5. Train-Test Split (Chronological proxy via index split or random split)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Fitting model...")
    model.fit(X_train, y_train)
    
    # 6. Evaluation
    y_pred = model.predict(X_test)
    
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)
    
    print(f"Evaluation Metrics on Held-out Set (n={len(y_test)}):")
    print(f"MAE:  {mae:.2f}")
    print(f"RMSE: {rmse:.2f}")
    print(f"R2:   {r2:.3f}")
    
    # Baseline comparison (predict mean)
    y_mean = np.full(shape=y_test.shape, fill_value=y_train.mean())
    baseline_mae = mean_absolute_error(y_test, y_mean)
    print(f"Baseline MAE (predict mean): {baseline_mae:.2f}")
    print(f"Model Improvement over Baseline: {baseline_mae - mae:.2f} pax")
    
    # 7. Serialization
    os.makedirs(MODEL_DIR, exist_ok=True)
    model_path = os.path.join(MODEL_DIR, 'demand_model.joblib')
    joblib.dump(model, model_path)
    
    # Also save metadata for the Node API fallback
    metadata = {
        "metrics": {"mae": mae, "rmse": rmse, "r2": r2},
        "features": features,
        "trained_on": len(X_train)
    }
    with open(os.path.join(MODEL_DIR, 'model_metadata.json'), 'w') as f:
        json.dump(metadata, f)
        
    print(f"Model artifact saved to {model_path}")

if __name__ == '__main__':
    train_demand_model()
