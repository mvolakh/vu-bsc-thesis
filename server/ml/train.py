import array
import json
import sys
import os
import warnings
from keras.models import Model, Sequential, load_model
from keras.layers import Input, LSTM, Dense, Flatten, Reshape, GRU, Conv1D, MaxPooling1D, Dropout
from keras.optimizers import Adam
from keras.callbacks import EarlyStopping, ReduceLROnPlateau
import keras_tuner
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
ROOMTYPES = pd.read_excel(os.getenv('ROOM_DATA_PATH'))['Room type'].dropna().unique()

WINDOW_SIZE = 6
PREDICTION_HORIZON = 3
NR_OF_FEATURES = 13
INPUT_SHAPE = (WINDOW_SIZE, NR_OF_FEATURES)
OUTPUT_SHAPE = (PREDICTION_HORIZON, NR_OF_FEATURES)

normalization_params = {}
thresholds = {}
sensor_label_encoder = LabelEncoder()
roomtype_label_encoder = LabelEncoder()

def normalization_params_toJSON(normalization_params):
    json_obj = {}
    for sensor_name, days in normalization_params.items():
        sensor_data = {}
        for day, hours in days.items():
            day_data = {}
            for hour, values in hours.items():
                key = f"{hour}"
                day_data[key] = {
                    'std_eCO2': values['std_eCO2'],
                    'mean_eCO2': values['mean_eCO2'],
                    'std_sound': values['std_sound'],
                    'mean_sound': values['mean_sound'],
                    'std_light': values['std_light'],
                    'mean_light': values['mean_light'],
                }
            sensor_data[str(day)] = day_data
        json_obj[sensor_name] = sensor_data

    return json_obj

def thresholds_toJSON(thresholds):
    json_obj = {}
    for sensor_name, days in thresholds.items():
        sensor_data = {}
        for day, hours in days.items():
            day_data = {}
            for hour, cols in hours.items():
                hour_data = {}
                for col, levels in cols.items():
                    col_data = {}
                    for level, value in levels.items():
                        col_data[level] = value
                    hour_data[col] = col_data
                day_data[str(hour)] = hour_data
            sensor_data[str(day)] = day_data
        json_obj[sensor_name] = sensor_data
    return json_obj
    

def preprocess_data():
    global sensor_label_encoder, roomtype_label_encoder, normalization_params, x_train, y_train, x_val, y_val, x_test, y_test
    sensor_dfs = []

    for sensor_name, file_path in zip(SENSOR_NAMES, FILE_PATHS):
        sensor_df = normalize_sensor_data(sensor_name, file_path)
        # print(sensor_df)
        sensor_dfs.append(sensor_df)
        
    with open('./ml/obj/normalization_params.pkl', 'wb') as file:
        pickle.dump(normalization_params, file)
    
    with open('./ml/obj/normalization_params.json', 'w') as file:
        json.dump(normalization_params_toJSON(normalization_params), file, indent=4)
        
    with open('./ml/obj/thresholds.pkl', 'wb') as file:
        pickle.dump(thresholds, file)
    
    with open('./ml/obj/thresholds.json', 'w') as file:
        json.dump(thresholds_toJSON(thresholds), file, indent=4)

    # df = pd.concat(sensor_dfs, ignore_index=True)
    sensor_label_encoder.fit(SENSOR_NAMES)
    roomtype_label_encoder.fit(ROOMTYPES)

    with open('./ml/obj/sensor_label_encoder.pkl', 'wb') as file:
        pickle.dump(sensor_label_encoder, file)
        
    with open('./ml/obj/roomtype_label_encoder.pkl', 'wb') as file:
        pickle.dump(roomtype_label_encoder, file)

    for df in sensor_dfs:
        df['sensor'] = sensor_label_encoder.transform(df['sensor'])
        df['roomtype'] = roomtype_label_encoder.transform(df['roomtype'])
    
    x_train, y_train, x_val, y_val, x_test, y_test = create_sliding_window_sequences(sensor_dfs, WINDOW_SIZE, PREDICTION_HORIZON)
    
    with open('./ml/data/dataset.pkl', 'wb') as file:
        pickle.dump((x_train, y_train, x_val, y_val, x_test, y_test), file)
    

# Calculated z-score based on provided mean and standard deviation.
def calculate_zscores(val, mean, std):
    return (val - mean) / std if std != 0 else 0

# Read and preprocess a CSV file for a specific sensor
def normalize_sensor_data(sensor_name, file_path):
    df = pd.read_csv(file_path)

    df = df[['sensor','hour', 'eCO2', 'sound', 'light', 'roomtype', 'day']]
    
    create_normalization_params(df, sensor_name)
    compute_thresholds(df, sensor_name)

    # Apply z-score normalization on a per day-hour level
    for col in ['eCO2', 'sound', 'light']:
        df[col] = df.apply(lambda x: calculate_zscores(
            x[col], 
            normalization_params[sensor_name][x['day']][x['hour']][f'mean_{col}'], 
            normalization_params[sensor_name][x['day']][x['hour']][f'std_{col}']
        ), axis=1)
    
    # Replace NaN values with zeros 
    # df[['eCO2', 'sound', 'light']] = df[['eCO2', 'sound', 'light']].fillna(0, inplace=True)
    
    # One-hot encode the 'day' column
    df = pd.concat([df, pd.get_dummies(df['day'], prefix='day')], axis=1)
    df.drop('day', axis=1, inplace=True)  # Drop the original 'day' column

    return df

def create_normalization_params(df, sensor_name):
    global normalization_params
    
    # print(df)
    
    # Group by 'sensor' and 'hour'
    grouped = df.groupby(['day', 'hour'])

    # Initialize normalization_params if it doesn't exist for the sensor
    if sensor_name not in normalization_params:
        normalization_params[sensor_name] = {}

    # Loop through groups and calculate mean and std for each hour
    for (day, hour), group in grouped:
        if day not in normalization_params[sensor_name]:
            normalization_params[sensor_name][day] = {}
        
        if hour not in normalization_params[sensor_name][day]:
            normalization_params[sensor_name][day][hour] = {}
            
        for col in ['eCO2', 'sound', 'light']:
            if f'mean_{col}' not in normalization_params[sensor_name][day][hour]:
                normalization_params[sensor_name][day][hour][f'mean_{col}'] = {}
                normalization_params[sensor_name][day][hour][f'std_{col}'] = {}
            normalization_params[sensor_name][day][hour][f'mean_{col}'] = group[col].mean()
            normalization_params[sensor_name][day][hour][f'std_{col}'] = group[col].std()

def compute_thresholds(df, sensor_name):
    global thresholds
    grouped = df.groupby(['day', 'hour'])
    
    if sensor_name not in thresholds:
        thresholds[sensor_name] = {}

    for (day, hour), group in grouped:
        data = group[['eCO2', 'sound', 'light']]
        if day not in thresholds[sensor_name]:
            thresholds[sensor_name][day] = {}
        
        if hour not in thresholds[sensor_name][day]:
            thresholds[sensor_name][day][hour] = {}

        for col in ['eCO2', 'sound', 'light']:
            kmeans = KMeans(n_clusters=3, n_init='auto')
            kmeans.fit(data[[col]])

            cluster_centers = kmeans.cluster_centers_
            cluster_centers_sorted = sorted(cluster_centers.flatten())

            low_to_medium_threshold = cluster_centers_sorted[1]
            medium_to_high_threshold = cluster_centers_sorted[2]
            
            if col not in thresholds[sensor_name][day][hour]:
                thresholds[sensor_name][day][hour][col] = {}
                thresholds[sensor_name][day][hour][col]['medium'] = {}
                thresholds[sensor_name][day][hour][col]['high'] = {}

            thresholds[sensor_name][day][hour][col]['medium'] = low_to_medium_threshold
            thresholds[sensor_name][day][hour][col]['high'] = medium_to_high_threshold

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

def load_dataset():
    global x_train, y_train, x_val, y_val, x_test, y_test
    with open('./ml/data/dataset.pkl', 'rb') as file:
        x_train, y_train, x_val, y_val, x_test, y_test = pickle.load(file)

def train_LSTM_baseline(loss_func):
    model = Sequential()
    model.add(LSTM(64, return_sequences=True, input_shape=INPUT_SHAPE, recurrent_dropout=0))
    model.add(LSTM(32, return_sequences=False))
    model.add(Dense(PREDICTION_HORIZON * NR_OF_FEATURES, activation='relu'))
    model.add(Reshape(OUTPUT_SHAPE))
    model.compile(loss=loss_func, optimizer='adam')
    
    early_stopping = EarlyStopping(monitor='val_loss', patience=5, restore_best_weights=True)
    reduce_lr = ReduceLROnPlateau(monitor='val_loss', factor=0.2, patience=3, min_lr=1e-6)

    history = model.fit(x_train, y_train, epochs=72, batch_size=32, validation_data=(x_val, y_val), callbacks=[early_stopping, reduce_lr])
    
    model.save(f'./ml/models/baseline/LSTM_{loss_func}.h5')
    # with open(f'./ml/stats/baselines/LSTM_{loss_func}_changed.pkl', 'wb') as file:
    #     pickle.dump(history.history, file)
        
    return model

def train_GRU_baseline(loss_func):
    model = Sequential()
    model.add(GRU(64, return_sequences=True, input_shape=INPUT_SHAPE, recurrent_dropout=0))
    model.add(GRU(32, return_sequences=False))
    model.add(Dense(PREDICTION_HORIZON * NR_OF_FEATURES, activation='relu'))
    model.add(Reshape(OUTPUT_SHAPE))
    model.compile(loss=loss_func, optimizer='adam')
    
    early_stopping_cb = EarlyStopping(monitor='val_loss', patience=5, restore_best_weights=True)
    reduce_lr_cb = ReduceLROnPlateau(monitor='val_loss', factor=0.2, patience=3, min_lr=1e-6)

    history = model.fit(x_train, y_train, epochs=72, batch_size=32, validation_data=(x_val, y_val), callbacks=[early_stopping_cb, reduce_lr_cb])

    model.save(f'./ml/models/baseline/GRU_{loss_func}.h5')
    # with open(f'./ml/stats/baselines/GRU_{loss_func}.pkl', 'wb') as file:
    #     pickle.dump(history.history, file)
    
    return model

def train_CNN_baseline(loss_func):
    model = Sequential()
    model.add(Conv1D(64, 3, activation='relu', input_shape=INPUT_SHAPE))
    model.add(Conv1D(32, 3, activation='relu'))
    model.add(Flatten())
    model.add(Dense(PREDICTION_HORIZON * NR_OF_FEATURES, activation='relu'))
    model.add(Reshape(OUTPUT_SHAPE))
    
    model.compile(loss=loss_func, optimizer='adam')
    
    early_stopping_cb = EarlyStopping(monitor='val_loss', patience=5, restore_best_weights=True)
    reduce_lr_cb = ReduceLROnPlateau(monitor='val_loss', factor=0.2, patience=3, min_lr=1e-6)

    history = model.fit(x_train, y_train, epochs=72, batch_size=32, validation_data=(x_val, y_val), callbacks=[early_stopping_cb, reduce_lr_cb])
    
    model.save(f'./ml/models/baselines/CNN_{loss_func}_nopol.h5')
    with open(f'./ml/stats/baselines/CNN_{loss_func}_nopol.pkl', 'wb') as file:
        pickle.dump(history.history, file)
    return model

class CustomModelLSTM(keras_tuner.HyperModel):
    def build(self, hp):
        dropout_rates = hp.Float('dropout_rate', min_value=0.0, max_value=0.5, step=0.1)
        num_units_first = hp.Int('lstm_first_units', min_value=32,max_value=256,step=32)
        num_units_inter = hp.Int('lstm_inter_units', min_value=16,max_value=128,step=16)
        num_units_last = hp.Int('lstm_last_units', min_value=16, max_value=128, step=16)
        activations = hp.Choice('dense_activation', values=['relu', 'sigmoid', 'tanh'], default='relu')
        
        model = Sequential()
        model.add(LSTM(num_units_first, return_sequences=True, input_shape=INPUT_SHAPE, recurrent_dropout=dropout_rates))
        for i in range(hp.Int('num_layers', 0, 3)):
            model.add(LSTM(num_units_inter,return_sequences=True, recurrent_dropout=dropout_rates))
        model.add(LSTM(num_units_last, return_sequences=False))
        model.add(Dense(PREDICTION_HORIZON * NR_OF_FEATURES, activation=activations))
        model.add(Reshape(OUTPUT_SHAPE))
        model.compile(loss='huber_loss', optimizer='adam')
        
        return model
    
    def fit(self, hp, model, *args, **kwargs):
        return model.fit(
            *args,
            batch_size=hp.Choice('batch_size', values=[2, 4, 8, 16, 32, 64, 128, 256]),
            **kwargs,
        )
        
class CustomModelGRU(keras_tuner.HyperModel):
    def build(self, hp):
        dropout_rates = hp.Float('dropout_rate', min_value=0.0, max_value=0.5, step=0.1)
        num_units_first = hp.Int('gru_first_units', min_value=32,max_value=256,step=32)
        num_units_inter = hp.Int('gru_inter_units', min_value=16,max_value=128,step=16)
        num_units_last = hp.Int('gru_last_units', min_value=16, max_value=128, step=16)
        activations = hp.Choice('dense_activation', values=['relu', 'sigmoid', 'tanh'], default='relu')
        
        model = Sequential()
        model.add(GRU(num_units_first, return_sequences=True, input_shape=INPUT_SHAPE, recurrent_dropout=dropout_rates))
        for i in range(hp.Int('num_layers', 0, 3)):
            model.add(GRU(num_units_inter,return_sequences=True, recurrent_dropout=dropout_rates))
        model.add(GRU(num_units_last, return_sequences=False))
        model.add(Dense(PREDICTION_HORIZON * NR_OF_FEATURES, activation=activations))
        model.add(Reshape(OUTPUT_SHAPE))
        model.compile(loss='huber_loss', optimizer='adam')
        
        return model
    
    def fit(self, hp, model, *args, **kwargs):
        return model.fit(
            *args,
            batch_size=hp.Choice('batch_size', values=[4, 8, 16, 32, 64, 128, 256]),
            **kwargs,
        )

def get_best_hps(build_model, loss_func, model_name):    
    tuner= keras_tuner.Hyperband(
        hypermodel=build_model(),
        objective='val_loss',
        max_epochs=36,
        factor=3,
        directory="./ml/logs", 
        project_name=f'hyperband_{model_name}_{loss_func}'
    )
    
    early_stopping_cb = EarlyStopping(monitor='val_loss', patience=5, restore_best_weights=True)
    reduce_lr_cb = ReduceLROnPlateau(monitor='val_loss', factor=0.2, patience=3, min_lr=1e-6)
    
    tuner.search(x_train, y_train, epochs=36, validation_data=(x_val, y_val), callbacks=[early_stopping_cb, reduce_lr_cb])
    best_hyperparameters = tuner.get_best_hyperparameters()[0]
    print(best_hyperparameters)
    
    # best_model = tuner.get_best_models()[0]
    # best_model.save(f'./ml/models/tuned/{model_name}_{loss_func}.h5')

# def print_history(model_name, loss_function): 
#     with open(f'./ml/stats/baselines/{model_name}_{loss_function}.pkl', 'rb') as file:
#         history = pickle.load(file)
#         print(history)
    
# preprocess_data()
load_dataset()

# train_LSTM_baseline('mse')
# train_LSTM_baseline('mae')
# train_LSTM_baseline('huber_loss')

# train_GRU_baseline('mse')
# train_GRU_baseline('mae')
# train_GRU_baseline('huber_loss')

# train_CNN_baseline('mse')
# train_CNN_baseline('mae')
# train_CNN_baseline('huber_loss')

# print_history('CNN', 'mse')
# print_history('CNN', 'mae')
# print_history('LSTM', 'huber_loss')

# get_best_hps(CustomModelLSTM, 'huber_loss', 'LSTM')
# get_best_hps(CustomModelGRU, 'huber_loss', 'GRU')