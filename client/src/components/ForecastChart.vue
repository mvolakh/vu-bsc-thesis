<script lang='ts'>
import { computed, defineComponent, inject, ref, watch, onMounted } from "vue";
import { BarChart, useBarChart } from "vue-chart-3";
import { Chart, type ChartData, type ChartOptions, registerables, type TooltipItem } from "chart.js";
import type { ForecastData } from "../types/ForecastData";
import axios from "axios";

Chart.register(...registerables);

export default defineComponent({
  name: "ForecastChart",
  components: { BarChart },
  props: {
    roomPredictions: Object as () => ForecastData,
    sensorPredictions: Object as () => ForecastData,
    updateStatus: Boolean
  },
  setup(props) {
    const getColorCodeHex = (color: string) => {
        var colorHex = '#36454F'; 
        switch (color) {
            case 'red':
                colorHex = '#FF0000';
                break;
            case 'orange':
                colorHex = '#FFA500';
                break;
            case 'green':
                colorHex = '#008000';
                break;
        }

        return colorHex;
    }

    const getOccupancyVal = (color: string) => {
        var val = 0.0; 
        switch (color) {
            case 'red':
                val = 100.0;
                break;
            case 'orange':
                val = 66.6;
                break;
            case 'green':
                val = 33.3;
                break;
        }

        return val;
    }

    const getHourTick = (timestamp: string) => new Date(timestamp).toLocaleString('en-US', { hour: 'numeric', hour12: true });

    const roomPredictionsRef = ref(props.roomPredictions);
    const sensorPredictionsRef = ref(props.sensorPredictions);
    const dataValues = ref([33.3, 33.3, 33.3]);
    const dataLabels = ref(["9AM", "10AM", "11AM"]);
    const dataColorCode = ref(["#36454F","#36454F", "#36454F"]);

    const initRoomPredictions = function() {
        if (props.roomPredictions?.sensorData.predictions) {
            // Change bar colors
            const barColors = [];
            for (let i in props.roomPredictions?.sensorData.predictions) {
                barColors.push(getColorCodeHex(props.roomPredictions?.sensorData.predictions[i].colorCode))
            }
            dataColorCode.value = barColors;

            // Change var values
            const barVals = [];
            for (let i in props.roomPredictions?.sensorData.predictions) {
                barVals.push(getOccupancyVal(props.roomPredictions?.sensorData.predictions[i].colorCode))
            }
            dataValues.value = barVals;

            // Change bar labels
            const barXTicks = [];
            for (let i in props.roomPredictions?.sensorData.predictions) {
                barXTicks.push(getHourTick(props.roomPredictions?.sensorData.predictions[i].timestamp))
            }
            dataLabels.value = barXTicks;
        }
    }

    const initSensorPredictions = function() {
        if (props.sensorPredictions?.sensorData.predictions) {
            // Change bar colors
            const barColors = [];
            for (let i in props.sensorPredictions?.sensorData.predictions) {
                barColors.push(getColorCodeHex(props.sensorPredictions?.sensorData.predictions[i].colorCode))
            }
            dataColorCode.value = barColors;

            // Change var values
            const barVals = [];
            for (let i in props.sensorPredictions?.sensorData.predictions) {
                barVals.push(getOccupancyVal(props.sensorPredictions?.sensorData.predictions[i].colorCode))
            }
            dataValues.value = barVals;

            // Change bar labels
            const barXTicks = [];
            for (let i in props.sensorPredictions?.sensorData.predictions) {
                barXTicks.push(getHourTick(props.sensorPredictions?.sensorData.predictions[i].timestamp))
            }
            dataLabels.value = barXTicks;
        }
    }

    const testData = computed<ChartData<"bar">>(() => ({
        labels: dataLabels.value,
        datasets: [
        {
            data: dataValues.value,
            backgroundColor: dataColorCode.value,
        },
        ],
    }));

    const options = computed<ChartOptions<"bar">>(() => ({
        scales: {
            x: {
                grid: {
                    display: false
                }
            },
            y: {
                grid: {
                    display: false
                },
                ticks: {
                    display: false
                },
                border: {
                    display: false
                },
                display: false,
                suggestedMax: 100
            }
        },
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                enabled: true,
                displayColors: false,
                yAlign: "center",
                callbacks: {
                    footer: function(tooltipItems: TooltipItem<"bar">[]) {
                        const index = tooltipItems[0].dataIndex;

                        if (props.roomPredictions?.sensorData.predictions) {
                            return [
                                `CO2 Level: ${props.roomPredictions?.sensorData.predictions[index].co2Level}`,
                                `Light Level: ${props.roomPredictions?.sensorData.predictions[index].lightLevel}`,
                                `Noise Level: ${props.roomPredictions?.sensorData.predictions[index].soundLevel}`
                            ];
                        }

                        if (props.sensorPredictions?.sensorData.predictions) {
                            return [
                                `CO2 Level: ${props.sensorPredictions?.sensorData.predictions[index].co2Level}`,
                                `Light Level: ${props.sensorPredictions?.sensorData.predictions[index].lightLevel}`,
                                `Noise Level: ${props.sensorPredictions?.sensorData.predictions[index].soundLevel}`
                            ];
                        }
                        return "Unavailable";
                    },
                    label: function(tooltipItem: TooltipItem<"bar">) {
                        const index = tooltipItem.dataIndex;

                        let label = '';
                        if (props.roomPredictions?.sensorData.predictions) {
                            switch (props.roomPredictions?.sensorData.predictions[index].colorCode) {
                                case 'red':
                                    label = "Expected to be fully occupied";
                                    break;
                                case 'orange':
                                    label = "Might not have spaces available";
                                    break;
                                case 'green':
                                    label = "Expected to be unoccupied";
                                    break;
                            }
                        }

                        if (props.sensorPredictions?.sensorData.predictions) {
                            switch (props.sensorPredictions?.sensorData.predictions[index].colorCode) {
                                case 'red':
                                    label = "Expected to be fully occupied";
                                    break;
                                case 'orange':
                                    label = "Might not have spaces available";
                                    break;
                                case 'green':
                                    label = "Expected to be unoccupied";
                                    break;
                            }
                        }

                        return label;
                    },
                    labelTextColor: function(tooltipItem: TooltipItem<"bar">) {
                        const index = tooltipItem.dataIndex;

                        let labelColor = '';
                        if (props.roomPredictions?.sensorData.predictions) {
                            switch (props.roomPredictions?.sensorData.predictions[index].colorCode) {
                                case 'red':
                                    labelColor = '#FF0000';
                                    break;
                                case 'orange':
                                    labelColor = '#FFA500';
                                    break;
                                case 'green':
                                    labelColor = '#008000';
                                    break;
                            }
                        }

                        if (props.sensorPredictions?.sensorData.predictions) {
                            switch (props.sensorPredictions?.sensorData.predictions[index].colorCode) {
                                case 'red':
                                    labelColor = '#FF0000';
                                    break;
                                case 'orange':
                                    labelColor = '#FFA500';
                                    break;
                                case 'green':
                                    labelColor = '#008000';
                                    break;
                            }
                        }

                        return labelColor;
                    },
                }
            },
            title: {
                display: true,
                text: "Predicted Occupancy",
            }
        },
        categoryPercentage: 1
    }));

    const { barChartProps, barChartRef } = useBarChart({
        chartData: testData,
        options,
    });

    watch(() => props.roomPredictions?.sensorData.predictions, () => {
        initRoomPredictions();
        barChartRef.value?.update();
    });

    watch(() => props.sensorPredictions?.sensorData.predictions, () => {
        initSensorPredictions();
        barChartRef.value?.update();
    });

    watch(() => props.updateStatus, () => {
        if (props.roomPredictions?.sensorData.predictions) {
            initRoomPredictions();
        }
        if (props.sensorPredictions?.sensorData.predictions) {
            initSensorPredictions();
        }
        
        barChartRef.value?.update();
    })

    onMounted(() => {
        initRoomPredictions();
        initSensorPredictions();
    })

    // function updateChart() {
    //     barChartRef.value?.update();
    // }

    // const intervalId = setInterval(updateChart, 5000);

    return {
        testData,
        options,
        barChartRef,
        barChartProps,
    };
  },
});
</script>

<template>
    <BarChart v-bind="barChartProps"/>
    <!-- <v-btn @click="test" style="width: 100%;">Request Forecasts</v-btn> -->
</template>