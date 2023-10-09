export interface RoomData {
    name: string;
    floor: number;
    x_coord: number;
    y_coord: number;
    width: number;
    height: number;
    colorCode: string;
    latestSensorData: {
      _id: string;
      sensor: string;
      eCO2: number;
      TVOC: number;
      pressure: number;
      temperature: number;
      humidity: number;
      voltage: number;
      sound: number;
      rssi: number;
      color_b: number;
      color_c: number;
      color_g: number;
      color_r: number;
      timestamp: string;
      __v: number;
    };
  isHighlighted?: boolean;
}