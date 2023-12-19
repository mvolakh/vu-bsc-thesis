import pickle
import matplotlib.pyplot as plt
import numpy as np

# Baseline

with open(f'./ml/stats/baselines/LSTM_mse.pkl', 'rb') as file:
    hist_LSTM = pickle.load(file)
    
with open(f'./ml/stats/baselines/GRU_mse.pkl', 'rb') as file:
    hist_GRU = pickle.load(file)
    
with open(f'./ml/stats/baselines/CNN_mse.pkl', 'rb') as file:
    hist_CNN = pickle.load(file)
    
# with open(f'./ml/stats/baselines/LSTM_mae.pkl', 'rb') as file:
#     hist_LSTM = pickle.load(file)
    
# with open(f'./ml/stats/baselines/GRU_mae.pkl', 'rb') as file:
#     hist_GRU = pickle.load(file)
    
# with open(f'./ml/stats/baselines/CNN_mae.pkl', 'rb') as file:
#     hist_CNN = pickle.load(file)
    
# with open(f'./ml/stats/baselines/LSTM_huber_loss.pkl', 'rb') as file:
#     hist_LSTM = pickle.load(file)
    
# with open(f'./ml/stats/baselines/GRU_huber_loss.pkl', 'rb') as file:
#     hist_GRU = pickle.load(file)
    
# with open(f'./ml/stats/baselines/CNN_huber_loss.pkl', 'rb') as file:
#     hist_CNN = pickle.load(file)

# Tuned

# with open(f'./ml/stats/tuned/LSTM_mse.pkl', 'rb') as file:
#     hist_LSTM = pickle.load(file)
    
# with open(f'./ml/stats/tuned/GRU_mse.pkl', 'rb') as file:
#     hist_GRU = pickle.load(file)
    
# with open(f'./ml/stats/tuned/LSTM_mae.pkl', 'rb') as file:
#     hist_LSTM = pickle.load(file)
    
# with open(f'./ml/stats/tuned/GRU_mae.pkl', 'rb') as file:
#     hist_GRU = pickle.load(file)
    
# with open(f'./ml/stats/tuned/LSTM_huber_loss.pkl', 'rb') as file:
#     hist_LSTM = pickle.load(file)
    
# with open(f'./ml/stats/tuned/GRU_huber_loss.pkl', 'rb') as file:
#     hist_GRU = pickle.load(file)


loss_lstm = hist_LSTM['loss']
val_loss_lstm = hist_LSTM['val_loss']

loss_gru = hist_GRU['loss']
val_loss_gru = hist_GRU['val_loss']

loss_cnn = hist_CNN['loss']
val_loss_cnn = hist_CNN['val_loss']

max_epochs = max(len(loss_lstm), len(loss_gru), len(loss_cnn))
epochs = range(1, max_epochs + 1)

loss_lstm_padded = np.pad(loss_lstm, (0, max_epochs - len(loss_lstm)), 'constant', constant_values=np.nan)
val_loss_lstm_padded = np.pad(val_loss_lstm, (0, max_epochs - len(val_loss_lstm)), 'constant', constant_values=np.nan)

loss_gru_padded = np.pad(loss_gru, (0, max_epochs - len(loss_gru)), 'constant', constant_values=np.nan)
val_loss_gru_padded = np.pad(val_loss_gru, (0, max_epochs - len(val_loss_gru)), 'constant', constant_values=np.nan)

loss_cnn_padded = np.pad(loss_cnn, (0, max_epochs - len(loss_cnn)), 'constant', constant_values=np.nan)
val_loss_cnn_padded = np.pad(val_loss_cnn, (0, max_epochs - len(val_loss_cnn)), 'constant', constant_values=np.nan)

plt.figure(figsize=(10, 6))

# plt.plot(epochs, loss_lstm_padded, 'b', label='LSTM Training loss', linewidth=2.5)
plt.plot(epochs, val_loss_lstm_padded, 'r', label='LSTM Validation Loss', linewidth=2.5)

# plt.plot(epochs, loss_gru_padded, 'g', label='GRU Training loss', linewidth=2.5)
plt.plot(epochs, val_loss_gru_padded, 'c', label='GRU Validation Loss', linewidth=2.5)

# plt.plot(epochs, loss_cnn_padded, 'm', label='CNN Training loss', linewidth=2.5)
plt.plot(epochs, val_loss_cnn_padded, 'y', label='CNN Validation Loss', linewidth=2.5)

# # plt.scatter(len(loss_lstm_padded), loss_lstm_padded[-1], color='b', s=100, zorder=3)
# plt.scatter(len(val_loss_lstm_padded), val_loss_lstm_padded[-1], color='r', s=100, zorder=3)

# # plt.scatter(len(loss_gru_padded), loss_gru_padded[-1], color='g', s=100, zorder=3)
# plt.scatter(len(val_loss_gru_padded), val_loss_gru_padded[-1], color='c', s=100, zorder=3)

# # plt.scatter(len(loss_cnn_padded), loss_cnn_padded[-1], color='m', s=100, zorder=3)
# plt.scatter(len(val_loss_cnn_padded), val_loss_cnn_padded[-1], color='y', s=100, zorder=3)

plt.title('Validation Loss (MSE) for LSTM, GRU and CNN baseline models')
plt.xlabel('Epochs')
plt.ylabel('Loss (MSE)')
plt.legend()
plt.grid()
plt.show()