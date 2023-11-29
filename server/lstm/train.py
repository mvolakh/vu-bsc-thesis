import array
import json
import sys
import os
import warnings
from keras.models import Model, Sequential, load_model
from keras.layers import Input, LSTM, Dense, Flatten, Reshape, GRU, Conv1D, MaxPooling1D
from keras.optimizers import Adam
from keras.callbacks import EarlyStopping, ReduceLROnPlateau
import numpy as np
import pandas as pd
from scipy.stats import zscore
from glob import glob
from dotenv import load_dotenv
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.calibration import LabelEncoder
import pickle
from sklearn.cluster import KMeans
from sklearn.exceptions import ConvergenceWarning

warnings.filterwarnings("ignore", category=ConvergenceWarning)


load_dotenv()

DATASET_PATH = os.getenv('PROCESSED_BYSENSOR_REM_DATA_PATH')
FILE_PATHS = glob(os.path.join(DATASET_PATH, '*.csv'))
SENSOR_NAMES = [os.path.splitext(os.path.basename(file_path))[0] for file_path in FILE_PATHS]

print(DATASET_PATH)

WINDOW_SIZE = 6
PREDICTION_HORIZON = 3
NR_OF_FEATURES = 12
INPUT_SHAPE = (WINDOW_SIZE, NR_OF_FEATURES)
OUTPUT_SHAPE = (PREDICTION_HORIZON, NR_OF_FEATURES)

normalization_params = {}
label_encoder = LabelEncoder()

def preprocess_data():
    global label_encoder, normalization_params, x_train, y_train, x_val, y_val, x_test, y_test
    sensor_dfs = []

    for sensor_name, file_path in zip(SENSOR_NAMES, FILE_PATHS):
        sensor_df = normalize_sensor_data(sensor_name, file_path)
        sensor_dfs.append(sensor_df)
        
    with open('./lstm/obj/normalization_params.pkl', 'wb') as file:
        pickle.dump(normalization_params, file)
    
    
    json_like_object = {
        key: {
            str(num): params
            for num, params in value.items()
        }
        for key, value in normalization_params.items()
    }
    
    with open('./lstm/obj/normalization_params.json', 'w') as file:
        json.dump(json_like_object, file, indent=4)

    # df = pd.concat(sensor_dfs, ignore_index=True)
    label_encoder.fit(SENSOR_NAMES)

    with open('./lstm/obj/label_encoder.pkl', 'wb') as file:
        pickle.dump(label_encoder, file)

    for df in sensor_dfs:
        df['sensor'] = label_encoder.transform(df['sensor'])
    
    x_train, y_train, x_val, y_val, x_test, y_test = create_sliding_window_sequences(sensor_dfs, WINDOW_SIZE, PREDICTION_HORIZON)
    

# Read and preprocess a CSV file for a specific sensor
def normalize_sensor_data(sensor_name, file_path):
    df = pd.read_csv(file_path)

    df = df[['sensor','hour', 'eCO2', 'sound', 'light', 'day']]
    
    create_normalization_params(df, sensor_name)

    # One-hot encode the 'day' column
    df = pd.concat([df, pd.get_dummies(df['day'], prefix='day')], axis=1)
    df.drop('day', axis=1, inplace=True)  # Drop the original 'day' column

    # Apply z-score normalization on a per-sensor level
    df[['eCO2', 'sound', 'light']] = df.groupby('hour')[['eCO2', 'sound', 'light']].transform(lambda x: zscore(x, ddof=1))
    
    # Replace NaN values for light level with zeros
    df['light'].fillna(0, inplace=True)

    return df

def create_normalization_params(df, sensor_name):
    global normalization_params
    
    # Group by 'sensor' and 'hour'
    grouped = df.groupby(['sensor', 'hour'])

    # Initialize normalization_params if it doesn't exist for the sensor
    if sensor_name not in normalization_params:
        normalization_params[sensor_name] = {}

    # Loop through groups and calculate mean and std for each hour
    for (sensor, hour), group in grouped:
        if hour not in normalization_params[sensor_name]:
            normalization_params[sensor_name][hour] = {}
        
        normalization_params[sensor_name][hour]['mean_eCO2'] = group['eCO2'].mean()
        normalization_params[sensor_name][hour]['std_eCO2'] = group['eCO2'].std()
        normalization_params[sensor_name][hour]['mean_sound'] = group['sound'].mean()
        normalization_params[sensor_name][hour]['std_sound'] = group['sound'].std()
        normalization_params[sensor_name][hour]['mean_light'] = group['light'].mean()
        normalization_params[sensor_name][hour]['std_light'] = group['light'].std()
    
    # print(compute_thresholds(df))
    

def compute_thresholds(df):
    columns_to_cluster = ['eCO2', 'sound', 'light']
    grouped = df.groupby(['sensor', 'hour'])

    thresholds = []

    for name, group in grouped:
        sensor, hour = name
        data = group[columns_to_cluster]
        thresholds_low_to_medium = {}
        thresholds_medium_to_high = {}

        for column in columns_to_cluster:
            kmeans = KMeans(n_clusters=3, n_init='auto')
            column_data = data[[column]]
            kmeans.fit(column_data)

            cluster_centers = kmeans.cluster_centers_
            cluster_centers_sorted = sorted(cluster_centers.flatten())

            low_to_medium_threshold = cluster_centers_sorted[1]
            medium_to_high_threshold = cluster_centers_sorted[2]

            thresholds_low_to_medium[column] = low_to_medium_threshold
            thresholds_medium_to_high[column] = medium_to_high_threshold

        thresholds.append({'sensor': sensor, 'hour': hour, **thresholds_low_to_medium})
        thresholds.append({'sensor': sensor, 'hour': hour, **thresholds_medium_to_high})

    thresholds_df = pd.DataFrame(thresholds)
    return thresholds_df

# def create_sliding_window_sequences(dfs, input_size, output_size, validation_ratio=0.15):
#     x_train = []
#     y_train = []
#     x_val = []
#     y_val = []
    
#     for df in dfs:
#         total_samples = len(df)
#         val_samples = int(total_samples * validation_ratio)
#         train_samples = total_samples - val_samples - input_size - output_size + 1
        
#         for i in range(train_samples):
#             x_train.append(df[i:i+input_size])
#             y_train.append(df[i+input_size:i+input_size+output_size])
        
#         for i in range(train_samples, total_samples - input_size - output_size + 1):
#             x_val.append(df[i:i+input_size])
#             y_val.append(df[i+input_size:i+input_size+output_size])
    
#     return np.array(x_train), np.array(y_train), np.array(x_val), np.array(y_val)

def create_sliding_window_sequences(dfs, input_size, output_size, validation_ratio=0.1, test_ratio=0.1):
    x_train = []
    y_train = []
    x_val = []
    y_val = []
    x_test = []
    y_test = []
    
    for df in dfs:
        total_samples = len(df)
        test_samples = int(total_samples * test_ratio)
        val_samples = int(total_samples * validation_ratio)
        train_samples = total_samples - val_samples - test_samples - input_size - output_size + 1
        
        for i in range(train_samples):
            x_train.append(df[i:i+input_size])
            y_train.append(df[i+input_size:i+input_size+output_size])
        
        for i in range(train_samples, train_samples + val_samples):
            x_val.append(df[i:i+input_size])
            y_val.append(df[i+input_size:i+input_size+output_size])

        for i in range(train_samples + val_samples, train_samples + val_samples + test_samples):
            x_test.append(df[i:i+input_size])
            y_test.append(df[i+input_size:i+input_size+output_size])
    
    return (
        np.array(x_train), np.array(y_train),
        np.array(x_val), np.array(y_val),
        np.array(x_test), np.array(y_test)
    )

def train_LSTM():
    model = Sequential()
    model.add(LSTM(64, activation='relu', return_sequences=True, input_shape=INPUT_SHAPE, recurrent_dropout=0.2))
    model.add(LSTM(32, activation='relu', return_sequences=False))
    model.add(Dense(PREDICTION_HORIZON * NR_OF_FEATURES, activation='linear'))
    model.add(Reshape(OUTPUT_SHAPE))
    model.compile(loss='mse', optimizer='adam', metrics=['accuracy'])
    
    early_stopping = EarlyStopping(monitor='val_loss', patience=5, restore_best_weights=True)
    reduce_lr = ReduceLROnPlateau(monitor='val_loss', factor=0.2, patience=3, min_lr=1e-6)

    model.fit(x_train, y_train, epochs=36, batch_size=32, validation_data=(x_val, y_val), callbacks=[early_stopping, reduce_lr])
    model.save('./lstm/models/model_LSTM.h5')
    return model
    
def train_GRU():
    model = Sequential()
    model.add(GRU(64, activation='relu', return_sequences=True, input_shape=INPUT_SHAPE, recurrent_dropout=0.2))
    model.add(GRU(32, activation='relu', return_sequences=False))
    model.add(Dense(PREDICTION_HORIZON * NR_OF_FEATURES, activation='linear'))
    model.add(Reshape(OUTPUT_SHAPE))
    model.compile(loss='mse', optimizer='adam', metrics=['accuracy'])

    model.fit(x_train, y_train, epochs=36, batch_size=32, validation_data=(x_val, y_val))
    model.save('./lstm/models/model_GRU.h5')
    return model

def train_CNN():
    model = Sequential()
    
    model.add(Conv1D(64, 3, activation='relu', input_shape=(6, 12)))
    print("After Conv1D")
    print(model.output_shape)
    
    # model.add(MaxPooling1D(2))
    # print("MaxPooling1D")
    # print(model.output_shape)
    
    model.add(Conv1D(32, 3, activation='relu'))
    print("After Conv1D")
    print(model.output_shape)
    
    model.add(MaxPooling1D(2))
    print("After MaxPooling1D")
    print(model.output_shape)

    model.add(Flatten())
    print("After Flatten")
    print(model.output_shape)
    
    model.add(Dense(PREDICTION_HORIZON * NR_OF_FEATURES, activation='linear'))
    print("After Dense")
    print(model.output_shape)
    
    model.add(Reshape(OUTPUT_SHAPE))
    
    model.compile(loss='mse', optimizer='adam', metrics=['accuracy'])

    model.fit(x_train, y_train, epochs=36, batch_size=32, validation_data=(x_val, y_val))
    model.save('./lstm/models/model_CNN.h5')
    return model

def evaluate_model(model = load_model('./lstm/models/model_LSTM.h5')):
    test_loss, test_accuracy = model.evaluate(x_test, y_test)
    print(f"Test Loss: {test_loss}, Test Accuracy: {test_accuracy}")
  
def predict_model(model = load_model('./lstm/models/model_LSTM.h5')):
    x_test=x_val[0].reshape(1, 6, 12)

    predictions = model.predict(x_test, verbose=0)
    
    # Create DataFrame containing predictions
    num_samples, prediction_horizon, num_features = predictions.shape
    predictions = predictions.reshape((num_samples * prediction_horizon, num_features))
    columns = ['sensor', 'hour', 'eCO2', 'sound', 'light', 'day_0', 'day_1', 'day_2', 'day_3', 'day_4', 'day_5', 'day_6']
    df_predictions = pd.DataFrame(predictions, columns=columns)
    
    # Denormalize sensor names
    df_predictions['sensor'] = label_encoder.inverse_transform(df_predictions['sensor'].astype(int))
    
    # Denormalize hour values
    df_predictions['hour'] = df_predictions['hour'].round().astype(int)
    
    # Denormalize one-hot encoded days values
    day_cols = ['day_0', 'day_1', 'day_2', 'day_3', 'day_4', 'day_5', 'day_6']
    df_predictions['day'] = df_predictions[day_cols].idxmax(axis=1).str.replace('day_', '').astype(int)
    df_predictions.drop(day_cols, axis=1, inplace=True)

    # Loop through each row for denormalization
    for index, row in df_predictions.iterrows():
        sensor_name = row['sensor']
        hour = row['hour']

        df_predictions.at[index, 'eCO2'] = (row['eCO2'] * normalization_params[sensor_name][hour]['std_eCO2']) + normalization_params[sensor_name][hour]['mean_eCO2']
        df_predictions.at[index, 'sound'] = (row['sound'] * normalization_params[sensor_name][hour]['std_sound']) + normalization_params[sensor_name][hour]['mean_sound']
        df_predictions.at[index, 'light'] = (row['light'] * normalization_params[sensor_name][hour]['std_light']) + normalization_params[sensor_name][hour]['mean_light']

        df_predictions.at[index, 'eCO2'] = max(0, round(df_predictions.at[index, 'eCO2']))
        df_predictions.at[index, 'sound'] = max(0, round(df_predictions.at[index, 'sound']))
        df_predictions.at[index, 'light'] = max(0, round(df_predictions.at[index, 'light']))
    
    # Convert columns to integer type
    float_cols = ['eCO2', 'sound', 'light']
    df_predictions[float_cols] = df_predictions[float_cols].astype(int)
        
    print(df_predictions)

preprocess_data()
# model_LSTM = train_LSTM()
# model_GRU = train_GRU()
# model_CNN = train_CNN()
evaluate_model()
# predict_model()