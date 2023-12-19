from keras.models import load_model
from pymongo import MongoClient
from dotenv import load_dotenv
from datetime import datetime, timedelta
import pandas as pd
import pickle
import os
import sys
import tensorflow as tf
import argparse

# Disable AVX warnings (might also disable errors output)
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3' 
load_dotenv()

# Load XLSX data to match Device IDs with room types
XLSX_data = pd.read_excel(os.getenv('ROOM_DATA_PATH'))
roomtype_mapping = dict(zip(
    XLSX_data['Device ID'].dropna(),
    XLSX_data['Room type'].dropna()
))

# Add parsing of command line args
parser = argparse.ArgumentParser(description='Description of your script')
parser.add_argument('--hist', action='store_true', default=True, help='Use this flag for predicting based on historical data (past 6 hours). This flag is used by default.')
parser.add_argument('--live', action='store_true', help='Use this flag for predicting based on live data (past 6 hours + current hour).')
args = parser.parse_args()

if args.live:
    print("Flag --live is used.")
    args.hist = False

if args.hist:
    print("Flag --hist is used.")

# Load saved models
def load_saved_model():
    global model_LSTM, model_GRU, model_CNN
    
    model_LSTM = load_model('./ml/models/model_LSTM.h5')
    model_GRU = load_model('./ml/models/model_GRU.h5')
    model_CNN = load_model('./ml/models/model_CNN.h5')

# Load additional serialized data for processing data
def load_obj_data():
    global normalization_params
    global thresholds
    global sensor_label_encoder
    global x_test_example
    global roomtype_label_encoder
    
    with open('./ml/obj/normalization_params.pkl', 'rb') as file:
        normalization_params = pickle.load(file)
    
    with open('./ml/obj/thresholds.pkl', 'rb') as file:
        thresholds = pickle.load(file)
        
    with open('./ml/obj/sensor_label_encoder.pkl', 'rb') as file:
        sensor_label_encoder = pickle.load(file)
        
    with open('./ml/obj/roomtype_label_encoder.pkl', 'rb') as file:
        roomtype_label_encoder = pickle.load(file)
        
    with open('./ml/obj/test_input.pkl', 'rb') as file:
        x_test_example = pickle.load(file)

# Loads the historical/live data (past 6 hours w/ or w/o current hour recordings)
# Calls predict() function for every sensor, for which the recordings for the past 6 hours exist
def db_handler():
    global client, db, SensorData, Prediction
    
    client = MongoClient(os.getenv('DB_URI'))
    db = client['test']
    SensorData = db['sensordatas']
    Prediction = db['predictions']
    
    current_time = datetime.now().replace(microsecond=0) - timedelta(hours=1)
    start_time = current_time.replace(minute=0, second=0, microsecond=0) - timedelta(hours=6)
    end_time = current_time.replace(minute=0, second=0, microsecond=0)
    
    sensorlist = sensor_label_encoder.classes_
    # sensorlist = ["thingy071"]
    
    for sensor in sensorlist:
        if args.hist:
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
                        "hour": {
                            "$mod": [
                                { "$add": ["$_id.hour", 1] },
                                24
                            ]
                        },
                        "sensor": sensor,
                        "eCO2": "$avg_eCO2",
                        "sound": "$avg_sound",
                        "color_r": "$avg_color_r",
                        "color_g": "$avg_color_g",
                        "color_b": "$avg_color_b",
                        "day": {
                            "$cond": {
                                "if": { "$eq": ["$_id.hour", 23] },
                                "then": {"$mod": [{"$add": ["$_id.dayOfWeek", 1]}, 7]},
                                "else": "$_id.dayOfWeek"
                            }
                        }
                    }
                }
            ]
        elif args.live:
            pipeline = [
                {
                    "$match": {
                        "sensor": sensor,
                        "timestamp": {
                            "$gte": start_time,
                            "$lt": current_time
                        }
                    }
                },
                {
                    "$group": {
                        "_id": {
                            "hour": {
                                "$cond": {
                                    "if": {"$eq": [{"$hour": "$timestamp"}, current_time.hour]},
                                    "then": current_time.hour-1,
                                    "else": {"$hour": "$timestamp"}
                                }
                            },
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
                        "hour": {
                            "$mod": [
                                { "$add": ["$_id.hour", 1] },
                                24
                            ]
                        },
                        "sensor": sensor,
                        "eCO2": "$avg_eCO2",
                        "sound": "$avg_sound",
                        "color_r": "$avg_color_r",
                        "color_g": "$avg_color_g",
                        "color_b": "$avg_color_b",
                        "day": {
                            "$cond": {
                                "if": { "$eq": ["$_id.hour", 23] },
                                "then": {"$mod": [{"$add": ["$_id.dayOfWeek", 1]}, 7]},
                                "else": "$_id.dayOfWeek"
                            }
                        }
                    }
                }
            ]
        
        data = list(SensorData.aggregate(pipeline))
        
        if (len(data) == 6):
            global labels
            
            labels = get_labels(data)
            data = preprocess_input(data)
            
            df_predictions = predict("LSTM", data)
            save_predictions("LSTM", df_predictions)
            
            df_predictions = predict("GRU", data)
            save_predictions("GRU", df_predictions)
            
            df_predictions = predict("CNN", data)
            save_predictions("CNN", df_predictions)
            
def calcColorCode(row):
    highCounter = 0
    midCounter = 0
        
    # for metric in ['eCO2', 'light', 'sound']:
    #     if row[metric] > thresholds[row['sensor']][row['day']][row['hour']][metric]['high']:
    #         return 'red'
    #     elif row[metric] > thresholds[row['sensor']][row['day']][row['hour']][metric]['medium']:
    #         return 'orange'
    
    for metric in ['eCO2', 'light', 'sound']:
        if row[metric] > thresholds[row['sensor']][row['day']][row['hour']][metric]['high']:
            highCounter += 1
        elif row[metric] > thresholds[row['sensor']][row['day']][row['hour']][metric]['medium']:
            midCounter += 1
        
    if highCounter >= 2:
        return 'red'
    if midCounter >= 2:
        return 'orange'
    if highCounter >= 1 and midCounter >= 1:
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
    
    # Normalize metrics
    for index, row in df.iterrows():
        cols = ['eCO2', 'sound', 'light']
        for col in cols:
            mean = normalization_params[row['sensor']][row['day']][row['hour']][f"mean_{col}"]
            std = normalization_params[row['sensor']][row['day']][row['hour']][f"std_{col}"]
            
            if std == 0:
                df.at[index, col] = 0
            else:
                df.at[index, col] = (row[col] - mean) / std
                
    # One-hot encode day field
    present_days = set(df['day'])
    missing_days = set(range(7)) - present_days
    for day in missing_days:
        df[f'day_{day}'] = 0
    one_hot_encoded = pd.get_dummies(df['day'], prefix='day')
    df = pd.concat([df, one_hot_encoded], axis=1)
    df.drop('day', axis=1, inplace=True)
    
    # Normalize sensor names
    df['sensor'] = sensor_label_encoder.transform(df['sensor'])
    
    # Normalize room types
    df['roomtype'] = labels['roomtype']
    df['roomtype'] = roomtype_label_encoder.transform(df['roomtype'])
    
    # Reorder the columns
    df = df[['sensor', 'hour', 'eCO2', 'sound', 'light', 'roomtype', 'day_0', 'day_1', 'day_2', 'day_3', 'day_4', 'day_5', 'day_6']]
    
    return df.values.reshape(1, 6, 13)

# Saves the predictions to the database.
# Does some additional processing in order to match the database schema.
def save_predictions(model_type, df_predictions):    
    df_predictions['colorCode'] = df_predictions.apply(lambda row: calcColorCode(row), axis=1)
    
    # print(df_predictions)

    current_date = datetime.now()
    day_mapping = {0: 6, 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5}

    for index, row in df_predictions.iterrows():
        prediction_date = current_date - timedelta(days=current_date.weekday() - day_mapping[row['day']])
        timestamp = prediction_date.replace(hour=row['hour'], minute=0, second=0).strftime('%Y-%m-%dT%H:%M:%S')
        df_predictions.at[index, 'hour'] = timestamp
    
    df_predictions.rename(columns={'hour': 'timestamp'}, inplace=True)
    
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
        {
            'sensor': df_predictions['sensor'][0],
            'modelType': model_type
        }, 
        {    
            '$set': {
                'timestamp': datetime.now().strftime('%Y-%m-%dT%H:%M:%S'),
                'predictions': json_predictions
            }
        },
        upsert=True, 
        return_document=True
    )

# Save static values for predicted data:
# hours, days, sensor, roomtype
# These should stay intact regardless of the predicted values
def get_labels(data):
    labels = {}
    
    labels["sensor"] = data[0]["sensor"]
    labels["roomtype"] = roomtype_mapping.get(data[0]["sensor"])
    labels["hour"] = [(data[5]["hour"] + 1) % 24, (data[5]["hour"] + 2) % 24, (data[5]["hour"] + 3) % 24]

    days = []
    for hour in labels["hour"]:
        if hour < (data[5]["hour"]):
            new_day = (data[5]["day"] + 1) % 7
        else:
            new_day = data[5]["day"]

        days.append(new_day)

    labels["day"] = days
    
    return labels

# Gets the model based on the model type in a string format
def get_model(model_type):
    if model_type == "LSTM":
        model = model_LSTM
    elif model_type == "GRU":
        model = model_GRU
    elif model_type == "CNN":
        model = model_CNN
        
    return model

# Main function for making predictions.
# Denormalizes the values after predicting.
def predict(model_type, x_test=None):
    if x_test is None or len(x_test[0]) != 6:
        print("Input data for prediction is not defined or incomplete.")
        return

    model = get_model(model_type)

    predictions = model.predict(x_test, verbose=0)
    
    num_samples, prediction_horizon, num_features = predictions.shape
    predictions = predictions.reshape((num_samples * prediction_horizon, num_features))
    columns = ['sensor', 'hour', 'eCO2', 'sound', 'light', 'roomtype', 'day_0', 'day_1', 'day_2', 'day_3', 'day_4', 'day_5', 'day_6']
    df_predictions = pd.DataFrame(predictions, columns=columns)
    
    # 1 No verification denormalization
    # df_predictions['sensor'] = sensor_label_encoder.inverse_transform(df_predictions['sensor'].round().astype(int))
    # df_predictions['roomtype'] = roomtype_label_encoder.inverse_transform(df_predictions['roomtype'].round().astype(int))
    # df_predictions['hour'] = df_predictions['hour'].round().astype(int)
    # day_cols = ['day_0', 'day_1', 'day_2', 'day_3', 'day_4', 'day_5', 'day_6']
    # df_predictions['day'] = df_predictions[day_cols].idxmax(axis=1).str.replace('day_', '').astype(int)
    # df_predictions.drop(day_cols, axis=1, inplace=True)
    
    # 2 Denormalize by replacing with predefined labels
    df_predictions['sensor'] = labels['sensor']
    df_predictions['roomtype'] = labels['roomtype']    
    df_predictions['hour'] = labels['hour']
    day_cols = ['day_0', 'day_1', 'day_2', 'day_3', 'day_4', 'day_5', 'day_6']
    df_predictions.drop(day_cols, axis=1, inplace=True)
    df_predictions['day'] = labels['day']

    # Denormalize metrics
    for index, row in df_predictions.iterrows():
        cols = ['eCO2', 'sound', 'light']
        for col in cols:
            mean = normalization_params[labels['sensor']][labels['day'][index]][labels['hour'][index]][f"mean_{col}"]
            std = normalization_params[labels['sensor']][labels['day'][index]][labels['hour'][index]][f"std_{col}"]
            
            df_predictions.at[index, col] = (df_predictions.at[index, col] * std) + mean
            df_predictions.at[index, col] = max(0, round(df_predictions.at[index, col]))
    
    # Convert column values to integer type
    float_cols = ['eCO2', 'sound', 'light']
    df_predictions[float_cols] = df_predictions[float_cols].round().astype(int)  
    
    return df_predictions

load_obj_data()
load_saved_model()
db_handler()

# Solely for testing purposes. Uses saved data for thingy001. Should not be used normally, might need adjustments.
# predict(x_test_example)