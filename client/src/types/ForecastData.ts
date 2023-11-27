export interface ForecastData {
    name: string;
    sensorData: {
      _id?: string;
      sensor?: string;
      __v?: number;
      predictions?: Prediction[];
    };
}
  
interface Prediction {
    timestamp: string;
    co2Level: number;
    lightLevel: number;
    soundLevel: number;
    colorCode: string;
    _id: string;
}