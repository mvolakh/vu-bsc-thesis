import pandas as pd
import os

def circular_day_difference(current_day, next_day):
    return (next_day - current_day) % 7

def construct_new_row(missing_day, hour, stats, sensor, roomtype):
    new_row = {'day': missing_day, 'hour': hour}
    for col in ['eCO2', 'sound', 'light']:
        new_row[col] = stats[col].get((missing_day, hour), None)
    new_row['sensor'] = sensor
    new_row['roomtype'] = roomtype
    return new_row

def calculate_day_hour_stats(df):
    grouped = df.groupby(['day', 'hour'])
    stats = {}
    for name, group in grouped:
        for col in ['eCO2', 'sound', 'light']:
            if col not in stats:
                stats[col] = {}
            stats[col][name] = group[col].mean()

    return stats

def process_folder(input_folder, output_folder):
    files = os.listdir(input_folder)

    for file in files:
        if file.endswith('.csv'):
            file_path = os.path.join(input_folder, file)
            df = pd.read_csv(file_path)

            stats = calculate_day_hour_stats(df)
            
            sensor = df.iloc[0]['sensor']
            roomtype = df.iloc[0]['roomtype']

            new_rows = []
            insert_indices = []

            for idx in range(0,len(df) - 1):
                current_day, next_day = df.loc[idx, 'day'], df.loc[idx + 1, 'day']

                day_diff = circular_day_difference(current_day, next_day)
                if day_diff > 1:
                    if current_day < next_day:
                        for missing_day in range(current_day + 1, next_day):
                            print("Found missing day:", missing_day, "idx", idx, "idx+1", idx+1)
                            insert_indices.append(idx + 1)
                            for hour in range(24):
                                new_rows.append(construct_new_row(missing_day, hour, stats, sensor, roomtype))
                    else:
                        for missing_day in range(current_day + 1, 7):
                            print("Found missing day:", missing_day, "idx", idx, "idx+1", idx+1)
                            insert_indices.append(idx + 1)
                            for hour in range(24):
                                new_rows.append(construct_new_row(missing_day, hour, stats, sensor, roomtype))

                        for missing_day in range(0, next_day):
                            print("Found missing day:", missing_day, "idx", idx, "idx+1", idx+1)
                            insert_indices.append(idx + 1)
                            for hour in range(24):
                                new_rows.append(construct_new_row(missing_day, hour, stats, sensor, roomtype))
            
            insert_counter = 0
            new_dfs = []

            last_idx = 0

            for idx in insert_indices:
                rows_to_insert = []
                for hour in range(24):
                    row = new_rows[insert_counter]
                    rows_to_insert.append(row)
                    insert_counter += 1

                rows_df = pd.DataFrame(rows_to_insert)
                new_dfs.append(df.iloc[last_idx:idx])
                new_dfs.append(rows_df)
                last_idx = idx

            new_dfs.append(df.iloc[last_idx:])

            df = pd.concat(new_dfs, ignore_index=True)
            
            for col in ['eCO2', 'sound', 'light']:
                df[col] = df[col].round(0).astype(int)

            if not os.path.exists(output_folder):
                os.makedirs(output_folder)
            output_file_path = os.path.join(output_folder, file)
            df.to_csv(output_file_path, index=False)

input_path = '../resources/NU-Heartbeat-Oct-23/data/processed/bysensor_nooutliers'
output_path = '../resources/NU-Heartbeat-Oct-23/data/processed/bysensor_imputed'
# input_path = '../resources/NU-Heartbeat-Oct-23/data/processed/test_input'
# output_path = '../resources/NU-Heartbeat-Oct-23/data/processed/test_output'

process_folder(input_path, output_path)