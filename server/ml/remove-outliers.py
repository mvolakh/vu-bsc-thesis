import pandas as pd
import os

# Calculated z-score based on provided mean and standard deviation.
def calculate_zscores(val, mean, std):
    return (val - mean) / std if std != 0 else 0

# Detects outliers based on the z-score.
# In case z-score for any metric exceed the threshold, 
# a row containing the metric will be marked as an outlier.
def detect_outliers(df, stats):
    threshold = 2.5

    for col in ['eCO2', 'sound', 'light']:
        col_mean = stats[f'{col}_mean']
        col_std = stats[f'{col}_std']
        df[f'{col}_zscore'] = df.apply(lambda x: calculate_zscores(x[col], col_mean[x['day'], x['hour']], col_std[x['day'], x['hour']]), axis=1)

    df['max_zscore'] = df[['eCO2_zscore', 'sound_zscore', 'light_zscore']].abs().max(axis=1)
    df['is_outlier'] = df['max_zscore'] > threshold

    return df[df['is_outlier']]

# Groups the entries for the dataset specific for provided sensor
# by day and hour and calculated mean and standard deviation values
# taking day-hour seasonality into account.
# Given that statistical data, calls detect_outliers().
def process_sensor_data(file_path):
    df = pd.read_csv(file_path)

    grouped = df.groupby(['day', 'hour'])
    stats = {}
    for name, group in grouped:
        for col in ['eCO2', 'sound', 'light']:
            if f'{col}_mean' not in stats:
                stats[f'{col}_mean'] = {}
                stats[f'{col}_std'] = {}
            stats[f'{col}_mean'][name] = group[col].mean()
            stats[f'{col}_std'][name] = group[col].std()

    outliers = detect_outliers(df, stats)

    return df, outliers

# Removes days that contain partial data (not all 24 hours of recordings are present).
def remove_partial_days(df):
    to_remove = []
    prev_day = None
    consecutive_hours = set(range(24))
    day_indices = []

    for index, row in df.iterrows():
        current_day = row['day']
        current_hour = row['hour']

        if prev_day != current_day:
            if len(consecutive_hours) != 0:
                to_remove.extend(day_indices)
            consecutive_hours = set(range(24))
            day_indices = []

        consecutive_hours.discard(current_hour)
        day_indices.append(index)
        prev_day = current_day

    if len(consecutive_hours) != 0:
        to_remove.extend(day_indices)
        
    print(to_remove)

    return df.drop(to_remove)

# Parses the input folder contents and for every CSV file:
#   1. Calls process_sensor_data(), which would remove the outliers
#   2. Drops unnecessary columns, that were used for outlier detection
#   3. Calls remove_partial_days(), which removes rows 
#      for each day, for which at least one hour is missing
#   4. Saves the preprocessed data to the output path.
def process_folder(input_folder, output_folder):
    files = os.listdir(input_folder)

    for file in files:
        if file.endswith('.csv'):
            file_path = os.path.join(input_folder, file)
            df, outliers = process_sensor_data(file_path)

            df = df.drop(outliers.index)
            df = df.drop(columns=['eCO2_zscore', 'sound_zscore', 'light_zscore', 'max_zscore', 'is_outlier'])

            df = remove_partial_days(df)

            if not os.path.exists(output_folder):
                os.makedirs(output_folder)
            output_file_path = os.path.join(output_folder, file)
            df.to_csv(output_file_path, index=False)

input_path = '../resources/NU-Heartbeat-Oct-23/data/processed/bysensor'
output_path = '../resources/NU-Heartbeat-Oct-23/data/processed/bysensor_nooutliers'

process_folder(input_path, output_path)