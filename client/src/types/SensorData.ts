export interface SensorData {
    name: string;
    colorCode: string;
    floor: number;
    height: number;
    room: string;
    width: number;
    x_coord: number;
    y_coord: number;
    latestSensorData: {
        _id: string;
        TVOC: number;
        __v: number;
        color_b: number;
        color_c: number;
        color_g: number;
        color_r: number;
        eCO2: number;
        humidity: number;
        pressure: number;
        rssi: number;
        sound: number;
        temperature: number;
        timestamp: string;
        voltage: number;
    };
    isHighlighted?: boolean;
}