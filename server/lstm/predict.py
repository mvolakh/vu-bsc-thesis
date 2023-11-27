from keras.models import load_model
from pymongo import MongoClient
from dotenv import load_dotenv
from datetime import datetime, timedelta
import pandas as pd
import pickle
import os
import sys
import tensorflow as tf

# Disable AVX warnings (might also disable errors output)
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3' 
load_dotenv()

def load_saved_model():
    global model
    model = load_model('./lstm/models/model.h5')

def load_obj_data():
    global normalization_params
    global label_encoder
    global x_test_example
    
    with open('./lstm/obj/normalization_params.pkl', 'rb') as file:
        normalization_params = pickle.load(file)
        
    with open('./lstm/obj/label_encoder.pkl', 'rb') as file:
        label_encoder = pickle.load(file)
        
    with open('./lstm/obj/test_input.pkl', 'rb') as file:
        x_test_example = pickle.load(file)

def db_handler():
    client = MongoClient(os.getenv('DB_URI'))
    db = client['test']
    SensorData = db['sensordatas']
    Prediction = db['predictions']
    
    current_time = datetime.now()
    start_time = current_time.replace(minute=0, second=0, microsecond=0) - timedelta(hours=6)
    end_time = current_time.replace(minute=0, second=0, microsecond=0)
    
    # print("current_time", current_time)
    # print("start_time", start_time)
    # print("end_time", end_time)
    
    sensorlist = label_encoder.classes_
    
    for sensor in sensorlist:
        pipeline = [
            {
                "$match": {
                    "sensor": sensor,
                    "timestamp": {
                        "$gte": start_time,
                        "$lt": end_time
                    }
                }
            },
            {
                "$group": {
                    "_id": {
                        "hour": {"$hour": "$timestamp"},
                        "dayOfWeek": {"$subtract": [{"$dayOfWeek": "$timestamp"}, 1]}
                    },
                    "avg_eCO2": {"$avg": "$eCO2"},
                    "avg_sound": {"$avg": "$sound"},
                    "avg_color_r": {"$avg": "$color_r"},
                    "avg_color_g": {"$avg": "$color_g"},
                    "avg_color_b": {"$avg": "$color_b"}
                }
            },
            {
                "$addFields": {
                    "hour_category": {
                        "$cond": {
                            "if": {"$lt": ["$_id.hour", start_time.hour]},
                            "then": 1,
                            "else": 0
                        }
                    },
                    "day": "$_id.dayOfWeek",
                }
            },
            {
                "$sort": {
                    "hour_category": 1,
                    "_id.hour": 1
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "hour": "$_id.hour",
                    "sensor": sensor,
                    "eCO2": "$avg_eCO2",
                    "sound": "$avg_sound",
                    "color_r": "$avg_color_r",
                    "color_g": "$avg_color_g",
                    "color_b": "$avg_color_b",
                    "day": "$day"
                }
            }
        ]
        
        data = list(SensorData.aggregate(pipeline))
        
        if (len(data) == 6):
            df_predictions = predict(preprocess_input(data))
            
            # In case the predicted sensor name is not the same as in the input sequence (temp fix)
            predicted_sensors = df_predictions['sensor'].tolist()
            for val in predicted_sensors:
                if val != sensor:
                    df_predictions['sensor'] = sensor
                    break
            
            df_predictions['colorCode'] = df_predictions.apply(lambda row: calcColorCode(row), axis=1)
            
            print(df_predictions)
            
            current_date = datetime.now()
            day_mapping = {0: 6, 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5}

            for index, row in df_predictions.iterrows():
                prediction_date = current_date - timedelta(days=current_date.weekday() - day_mapping[row['day']])
                timestamp = prediction_date.replace(hour=row['hour'], minute=0, second=0).strftime('%Y-%m-%dT%H:%M:%S')
                df_predictions.at[index, 'hour'] = timestamp
            
            df_predictions.rename(columns={'hour': 'timestamp'}, inplace=True)
            # print(df_predictions)
            
            json_predictions = []
            for index, row in df_predictions.iterrows():
                prediction_data = {
                    'timestamp': row['timestamp'],
                    'co2Level': row['eCO2'],
                    'lightLevel': row['light'],
                    'soundLevel': row['sound'],
                    'colorCode': row['colorCode']
                }
                
                json_predictions.append(prediction_data)
                
            result = Prediction.find_one_and_update(
                {'sensor': sensor}, 
                {    
                    '$set': {
                        'predictions': json_predictions
                    }
                },
                upsert=True, 
                return_document=True)
            
         
def calcColorCode(row):
    orange_threshold = {
        'eCO2': normalization_params[row['sensor']][row['hour']]['mean_eCO2'] + 0.25 * normalization_params[row['sensor']][row['hour']]['std_eCO2'],
        'light': normalization_params[row['sensor']][row['hour']]['mean_light'] + 0.25 * normalization_params[row['sensor']][row['hour']]['std_light'],
        'sound': normalization_params[row['sensor']][row['hour']]['mean_sound'] + 0.25 * normalization_params[row['sensor']][row['hour']]['std_sound']
    }
    red_threshold = {
        'eCO2': normalization_params[row['sensor']][row['hour']]['mean_eCO2'] + 2 * normalization_params[row['sensor']][row['hour']]['std_eCO2'],
        'light': normalization_params[row['sensor']][row['hour']]['mean_light'] + 2 * normalization_params[row['sensor']][row['hour']]['std_light'],
        'sound': normalization_params[row['sensor']][row['hour']]['mean_sound'] + 2 * normalization_params[row['sensor']][row['hour']]['std_sound']
    }
    
    for metric in ['eCO2', 'light', 'sound']:
        if row[metric] > red_threshold[metric]:
            return 'red'
        elif row[metric] > orange_threshold[metric]:
            return 'orange'
    
    return 'green' 
                    
def preprocess_input(data):
    for hourlyData in data:
        hourlyData['light'] = int((hourlyData['color_r'] + hourlyData['color_g'] + hourlyData['color_b']) / 3)
        hourlyData['sound'] = int(hourlyData['sound'])
        hourlyData['eCO2'] = int(hourlyData['eCO2'])
        del hourlyData['color_r']
        del hourlyData['color_g']
        del hourlyData['color_b']
    
    df = pd.DataFrame(data)
    
    # One-hot encode day field
    present_days = set(df['day'])
    missing_days = set(range(7)) - present_days
    for day in missing_days:
        df[f'day_{day}'] = 0
    one_hot_encoded = pd.get_dummies(df['day'], prefix='day')
    df = pd.concat([df, one_hot_encoded], axis=1)
    df.drop('day', axis=1, inplace=True)
    
    # Normalize metrics
    for index, row in df.iterrows():
        cols = ['eCO2', 'sound', 'light']
        for col in cols:
            mean = normalization_params[row['sensor']][row['hour']][f"mean_{col}"]
            std = normalization_params[row['sensor']][row['hour']][f"std_{col}"]
            
            if std == 0:
                # row[col] = 0
                df.at[index, col] = 0
            else:
                # row[col] = (row[col] - mean) / std 
                df.at[index, col] = (row[col] - mean) / std
    
    # Normalize sensor names
    df['sensor'] = label_encoder.transform(df['sensor'])
    
    # Reorder the columns
    df = df[['sensor', 'hour', 'eCO2', 'sound', 'light', 'day_0', 'day_1', 'day_2', 'day_3', 'day_4', 'day_5', 'day_6']]
    
    return df.values.reshape(1, 6, 12)

def predict(x_test=None):
    if x_test is None or len(x_test[0]) != 6:
        print("Input data for prediction is not defined or incomplete.")
        return

    predictions = model.predict(x_test, verbose=0)
    
    # Create DataFrame containing predictions
    num_samples, prediction_horizon, num_features = predictions.shape
    predictions = predictions.reshape((num_samples * prediction_horizon, num_features))
    columns = ['sensor', 'hour', 'eCO2', 'sound', 'light', 'day_0', 'day_1', 'day_2', 'day_3', 'day_4', 'day_5', 'day_6']
    df_predictions = pd.DataFrame(predictions, columns=columns)
    
    # print(df_predictions)
    
    # Denormalize sensor names
    df_predictions['sensor'] = label_encoder.inverse_transform(df_predictions['sensor'].astype(int))
    
    # Denormalize hour values
    df_predictions['hour'] = df_predictions['hour'].round().astype(int)
    
    # Denormalize one-hot encoded days values
    day_cols = ['day_0', 'day_1', 'day_2', 'day_3', 'day_4', 'day_5', 'day_6']
    df_predictions['day'] = df_predictions[day_cols].idxmax(axis=1).str.replace('day_', '').astype(int)
    df_predictions.drop(day_cols, axis=1, inplace=True)

    # Denormalize metrics
    for index, row in df_predictions.iterrows():
        cols = ['eCO2', 'sound', 'light']
        for col in cols:
            mean = normalization_params[row['sensor']][row['hour']][f"mean_{col}"]
            std = normalization_params[row['sensor']][row['hour']][f"std_{col}"]
            
            df_predictions.at[index, col] = (df_predictions.at[index, col] * std) + mean
            df_predictions.at[index, col] = max(0, round(df_predictions.at[index, col]))
    
    # Convert columns to integer type
    float_cols = ['eCO2', 'sound', 'light']
    df_predictions[float_cols] = df_predictions[float_cols].astype(int)
        
    # print(df_predictions)    
    
    return df_predictions

load_obj_data()
load_saved_model()
db_handler()

# Solely for testing purposes. Uses saved data for thingy001.
# predict(x_test_example)