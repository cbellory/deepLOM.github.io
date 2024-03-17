// Функция для обновления основного графика криптовалюты
function updateChart(prices, cryptoId) {
    // Получение стилей из корневого элемента для доступа к CSS переменным
    const style = getComputedStyle(document.documentElement);

    // Извлечение цветовых настроек из CSS переменных
    const chartLineColor = style.getPropertyValue('--crypto-line-color').trim();
    const smaLineColor = style.getPropertyValue('--sma-line-color').trim();
    const chartGridColor = style.getPropertyValue('--chart-grid-color').trim();
    const chartTextColor = style.getPropertyValue('--chart-text-color').trim();
    const chartBackgroundColor = style.getPropertyValue('--chart-background-color').trim();

    // Фильтрация и подготовка данных для графика
    const samplingRate = 4; // Пример рейтинга выборки
    const sampledPrices = prices.filter((_, index) => index % samplingRate === 0);
    const smaValues = calculateSMA(sampledPrices.map(price => price.y), 14);
    const smaPoints = sampledPrices.slice(14 - 1).map((price, index) => ({
        x: price.x,
        y: smaValues[index] || null // Используйте null для избегания ошибок при отсутствии данных
    })).filter(point => point.y !== null);

    // Удаление предыдущего графика, если он существует
    if (cryptoChart) {
        cryptoChart.destroy();
    }

    // Создание нового графика
    const ctx = document.getElementById('cryptoChart').getContext('2d');
    cryptoChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: `${cryptoId.toUpperCase()} Price in USD`,
                data: sampledPrices,
                borderColor: chartLineColor,
                backgroundColor: 'transparent', // Фон линии
                tension: 0.1, // Сглаживание линии
                borderWidth: 2 // Ширина линии
            }, {
                label: 'SMA 14 Days',
                data: smaPoints,
                borderColor: smaLineColor,
                backgroundColor: 'transparent', // Фон линии для SMA
                tension: 0.1, // Сглаживание линии для SMA
                borderWidth: 2 // Ширина линии для SMA
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                xAxes: [{
                    type: 'time',
                    time: {
                        unit: 'day'
                    },
                    gridLines: {
                        color: chartGridColor
                    },
                    ticks: {
                        fontColor: chartTextColor
                    }
                }],
                yAxes: [{
                    gridLines: {
                        color: chartGridColor
                    },
                    ticks: {
                        beginAtZero: false,
                        fontColor: chartTextColor
                    }
                }]
            },
            plugins: {
                legend: {
                    labels: {
                        fontColor: chartTextColor
                    }
                }
            },
            elements: {
                point: {
                    radius: 0 // Скрыть точки на линии
                }
            },
            layout: {
                padding: {
                    left: 10,
                    right: 25,
                    top: 25,
                    bottom: 10
                }
            },
            backgroundColor: chartBackgroundColor
        }
    });
}


// Функция для отображения графиков MACD и RSI
function displayMacdAndRsiCharts(macdData, rsiData, pricesDates) {
    // Получение стилей для чтения CSS переменных
    const style = getComputedStyle(document.documentElement);
    const macdLineColor = style.getPropertyValue('--macd-line-color').trim();
    const signalLineColor = style.getPropertyValue('--signal-line-color').trim();
    const histogramColor = style.getPropertyValue('--histogram-color').trim();
    const rsiLineColor = style.getPropertyValue('--rsi-line-color').trim();
    const overboughtLineColor = style.getPropertyValue('--overbought-line-color').trim();
    const oversoldLineColor = style.getPropertyValue('--oversold-line-color').trim();
    const chartTextColor = style.getPropertyValue('--chart-text-color').trim();
    const chartGridColor = style.getPropertyValue('--chart-grid-color').trim();
    const chartBackgroundColor = style.getPropertyValue('--chart-background-color').trim();

    // Деструктуризация данных MACD
    const { MACDLine, signalLine, histogram } = macdData;

    // Создание графика MACD
    const macdCtx = document.getElementById('macdChart').getContext('2d');
    if (macdChart) macdChart.destroy();
    macdChart = new Chart(macdCtx, {
        type: 'bar',
        data: {
            labels: pricesDates.map(date => date.x),
            datasets: [{
                label: 'MACD',
                data: MACDLine,
                borderColor: macdLineColor,
                borderWidth: 2,
                type: 'line',
                fill: false,
                yAxisID: 'y-axis-1'
            }, {
                label: 'Signal',
                data: signalLine,
                borderColor: signalLineColor,
                borderWidth: 2,
                type: 'line',
                fill: false,
                yAxisID: 'y-axis-1'
            }, {
                label: 'Histogram',
                data: histogram,
                backgroundColor: histogram.map(value => value > 0 ? histogramColor.positive : histogramColor.negative),
                yAxisID: 'y-axis-2'
            }]
        },
        options: {
            scales: {
                xAxes: [{
                    type: 'time',
                    gridLines: {
                        color: chartGridColor
                    },
                    ticks: {
                        fontColor: chartTextColor
                    }
                }],
                yAxes: [{
                    id: 'y-axis-1',
                    position: 'left',
                    gridLines: {
                        color: chartGridColor
                    },
                    ticks: {
                        fontColor: chartTextColor
                    }
                }, {
                    id: 'y-axis-2',
                    position: 'right',
                    gridLines: {
                        display: false
                    },
                    ticks: {
                        fontColor: chartTextColor
                    }
                }]
            },
            plugins: {
                legend: {
                    labels: {
                        fontColor: chartTextColor
                    }
                }
            },
            backgroundColor: chartBackgroundColor
        }
    });

    // Создание графика RSI
    const rsiCtx = document.getElementById('rsiChart').getContext('2d');
    if (rsiChart) rsiChart.destroy();
    rsiChart = new Chart(rsiCtx, {
        type: 'line',
        data: {
            labels: pricesDates.map(date => date.x),
            datasets: [{
                label: 'RSI',
                data: rsiData,
                borderColor: rsiLineColor,
                backgroundColor: 'transparent',
                borderWidth: 2
            }]
        },
        options: {
            scales: {
                xAxes: [{
                    type: 'time',
                    gridLines: {
                        color: chartGridColor
                    },
                    ticks: {
                        fontColor: chartTextColor
                    }
                }],
                yAxes: [{
                    ticks: {
                        beginAtZero: false,
                        max: 100,
                        min: 0,
                        fontColor: chartTextColor,
                        // Добавление пользовательских линий для RSI графика
                        afterBuildTicks: chart => chart.ticks.push(30, 70)
                    },
                    gridLines: {
                        color: chartGridColor
                    },
                    afterFit: axis => {
                        axis.maxWidth = 30;  // Ограничение максимальной ширины
                    }
                }]
            },
            plugins: {
                legend: {
                    labels: {
                        fontColor: chartTextColor
                    }
                },
                annotation: {
                    annotations: {
                        line70: {
                            type: 'line',
                            mode: 'horizontal',
                            scaleID: 'y-axis-0',
                            value: 70,
                            borderColor: overboughtLineColor,
                            borderWidth: 2,
                            label: {
                                enabled: false,
                                content: 'Overbought'
                            }
                        },
                        line30: {
                            type: 'line',
                            mode: 'horizontal',
                            scaleID: 'y-axis-0',
                            value: 30,
                            borderColor: oversoldLineColor,
                            borderWidth: 2,
                            label: {
                                enabled: false,
                                content: 'Oversold'
                            }
                        }
                    }
                }
            },
            backgroundColor: chartBackgroundColor
        }
    });
}


// Функция для обновления графика
function updateChart(prices, cryptoId) {
    // Получаем стили для чтения CSS переменных
    const style = getComputedStyle(document.body);
    
    const samplingRate = 4;
    const sampledPrices = prices.filter((_, index) => index % samplingRate === 0);
    
    const smaValues = calculateSMA(sampledPrices.map(price => price.y), 14);

    const smaPoints = sampledPrices.slice(14 - 1).map((price, index) => ({
        x: price.x,
        y: smaValues[index] || null // Используем || null для избежания ошибок
    })).filter(point => point.y !== null);

    if (cryptoChart) {
        cryptoChart.destroy(); 
    }

    const ctx = document.getElementById('cryptoChart').getContext('2d');
    cryptoChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: `${cryptoId.toUpperCase()} Price in USD`,
                data: sampledPrices,
                borderColor: style.getPropertyValue('--crypto-line-color'), // Изменено на CSS переменную
                tension: 0.1
            },
            {
                label: 'SMA 14 Days',
                data: smaPoints,
                borderColor: style.getPropertyValue('--sma-line-color'), // Изменено на CSS переменную
                tension: 0.1,
                pointRadius: 0
            }]
        },
        options: {
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day'
                    }
                }
            }
        }
    });
}