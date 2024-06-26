let cryptoChart; 
const apiUrl = 'https://api.coingecko.com/api/v3/coins/'; 
let macdChart;
let rsiChart;

let balance = 100000
let btcbalance = 0

const style = getComputedStyle(document.documentElement);
const chartTextColor = style.getPropertyValue('--chart-text-color').trim();
const chartLineColor = style.getPropertyValue('--chart-line-color').trim();
const chartBackgroundColor = style.getPropertyValue('--chart-background-color').trim();
const rsiCtx = document.getElementById('rsiChartNew').getContext('2d');
let numberColor;
let cryptoid;


async function changeCrypto(cryptoId) {
    cryptoid=cryptoId
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30); // Берем данные за последние 30 дней
    const response = await fetch(`${apiUrl}${cryptoId}/market_chart/range?vs_currency=usd&from=${startDate.getTime() / 1000}&to=${endDate.getTime() / 1000}`);
    const data = await response.json();

    
    if (data && data.prices) {
        const prices = data.prices.map(price => ({ x: new Date(price[0]), y: price[1] }));
        updateChart(prices, cryptoId); 
        updateRecommendations(prices); 

        
        const closingPrices = prices.map(price => price.y); 
        const pricesDates = prices.map(price => price.x);
        
        
        const macdData = calculateMACD(closingPrices); 
        const rsiData = calculateRSI(closingPrices); 

        macdChart?.destroy?.()
        rsiChart?.destroy?.()

        displayMacdAndRsiCharts(macdData, rsiData, prices); 

    } 
    else {
        console.error('Ошибка при получении данных');
    }
    expandContainer();
}

// Функция для обновления графика
function updateChart(prices, cryptoId) {
    
    const style = getComputedStyle(document.body);
    
    const samplingRate = 4;
    const sampledPrices = prices.filter((_, index) => index % samplingRate === 0);
    
    const smaValues = calculateSMA(sampledPrices.map(price => price.y), 14);

    const smaPoints = sampledPrices.slice(14 - 1).map((price, index) => ({
        x: price.x,
        y: smaValues[index] || null 
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
                borderColor: style.getPropertyValue('--crypto-line-color'), 
                tension: 0.1
            },
            {
                label: 'SMA 14 Days',
                data: smaPoints,
                borderColor: style.getPropertyValue('--sma-line-color'), 
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





function calculateEMA(prices, days) {
    const k = 2 / (days + 1); 
    let emaArray = [prices[0]]; 

    for (let i = 1; i < prices.length; i++) {
        emaArray[i] = prices[i] * k + emaArray[i - 1] * (1 - k);
    }

    return emaArray;
}

// Функция для расчета MACD
function calculateMACD(prices) {
    const shortPeriod = 12;
    const longPeriod = 26;
    const signalPeriod = 9;

    const shortEMA = calculateEMA(prices, shortPeriod);
    const longEMA = calculateEMA(prices, longPeriod);
    const MACDLine = shortEMA.map((value, index) => value - longEMA[index]);
    const signalLine = calculateEMA(MACDLine, signalPeriod);
    const histogram = MACDLine.map((value, index) => value - signalLine[index]);

    return { MACDLine, signalLine, histogram };
}

// Функция для расчета RSI
function calculateRSI(prices, period = 14) {
    let gains = [];
    let losses = [];

    
    for (let i = 1; i < prices.length; i++) {
        let change = prices[i] - prices[i - 1];
        gains.push(change > 0 ? change : 0);
        losses.push(change < 0 ? -change : 0);
    }

    
    let averageGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
    let averageLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

    let rsiArray = [];

    for (let i = period; i < prices.length; i++) {
        let newGain = gains[i];
        let newLoss = losses[i];

        
        averageGain = (averageGain * (period - 1) + newGain) / period;
        averageLoss = (averageLoss * (period - 1) + newLoss) / period;

        if (averageLoss === 0) {
            rsiArray.push(100); 
        } else {
            let rs = averageGain / averageLoss;
            let rsi = 100 - (100 / (1 + rs));
            rsiArray.push(rsi);
        }
    }

    return rsiArray;
}

function calculateSMA(prices, period) {
    let sma = [];
    for (let i = period - 1; i < prices.length; i++) {
        let sum = 0;
        for (let j = 0; j < period; j++) {
            sum += prices[i - j];
        }
        sma.push(sum / period);
    }
    return sma;
}

function automateTrading(currentRsi, currentPrice) {
    const investAmount = balance / 10; 
    const rsiBuyThreshold = 30;
    const rsiSellThreshold = 70;

    
    let actionTaken = 'Никаких действий не выполнено';

    if (currentRsi < rsiBuyThreshold) {
        let coinsToBuy = investAmount / currentPrice; 
        if (coinsToBuy > 0) {
            balance -= coinsToBuy * currentPrice; 
            btcbalance += coinsToBuy; 
            actionTaken = `Выполнена покупка ${coinsToBuy.toFixed(8)} монет по цене ${currentPrice}. Новый баланс: ${balance.toFixed(2)}, BTC: ${btcbalance.toFixed(8)}`;
        }
    }

    if (currentRsi > rsiSellThreshold && btcbalance > 0) {
        const coinsToSell = btcbalance; 
        balance += coinsToSell * currentPrice; 
        btcbalance -= coinsToSell; 
        actionTaken = `Выполнена продажа ${coinsToSell.toFixed(8)} монет по цене ${currentPrice}. Новый баланс: ${balance.toFixed(2)}, BTC: ${btcbalance.toFixed(8)}`;
    }

    console.log(actionTaken);
}
    


function updateRecommendations(prices) {
    
    const closingPrices = prices.map(price => price.y); 

    
    const { MACDLine, signalLine } = calculateMACD(closingPrices);
    const lastMACD = MACDLine.slice(-1);
    const lastSignal = signalLine.slice(-1);
    const rsi = calculateRSI(closingPrices);
    
    
    let macdSignal;
    if (lastMACD > lastSignal) {
        macdSignal = 'Купувати'; 
    } else if (lastMACD < lastSignal) {
        macdSignal = 'Продавати'; 
    } else {
        macdSignal = 'Тримати'; 
    }

    
    let rsiSignal;
    if (rsi.slice(-2)[0] > 70) {
        rsiSignal = 'Продавати'; 
    } else if (rsi.slice(-2)[0] < 30) {
        rsiSignal = 'Купувати'; 
    } else {
        rsiSignal = 'Тримати'; 
    }

    
    document.getElementById('recommendations').innerText = `MACD Сигнал: ${macdSignal}, RSI Сигнал: ${rsiSignal}`;

    automateTrading(rsi.slice(-2)[0],closingPrices.slice(-1)[0]);
}

function requestCrypto() {
    const cryptoId = document.getElementById('cryptoInput').value.trim().toLowerCase();
    if (cryptoId) {
        changeCrypto(cryptoId);
    } else {
        alert('Пожалуйста, введите ID криптовалюты.');
    }
}

function setTheme(themeName) {
    localStorage.setItem('theme', themeName);
    document.body.className = themeName + '-theme';
    
}


function loadTheme() {
    const theme = localStorage.getItem('theme') || 'light'; 
    setTheme(theme);
    
}


window.onload = loadTheme;


function displayMacdAndRsiCharts(macdData, rsiData, pricesDates) {
    
    const { MACDLine, signalLine, histogram } = macdData;

    // MACD
    const macdCtx = document.getElementById('macdChartNew').getContext('2d');
    macdChart = new Chart(macdCtx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'MACD Line',
                    data: MACDLine.map((value, index) => ({ x: pricesDates[index].x, y: value })),
                    borderColor: 'blue', 
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 0
                },
                {
                    label: 'Signal Line',
                    data: signalLine.map((value, index) => ({ x: pricesDates[index].x, y: value })),
                    borderColor: 'red', 
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 0
                },
                {
                    label: 'Histogram',
                    data: histogram.map((value, index) => ({ x: pricesDates[index].x, y: value })),
                    borderColor: 'green', 
                    backgroundColor: style.getPropertyValue('--chart-background-color'), 
                    borderWidth: 1,
                    type: 'bar'
                }
            ]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        color: numberColor 
                    },
                    grid: {
                        backgroundColor: 'rgba(0, 0, 255, 0.1)', 
                    },
                },
                x: 
                
                {
                    type: 'time',
                    time: {
                        unit: 'day',
                        displayFormats: {
                            day: 'MMM dd'
                        }
                    },
                    ticks: {
                        color: numberColor 
                    },
                    grid: {
                        backgroundColor: 'rgba(0, 0, 255, 0.1)', 
                    },
                }
            }
        }
    });

// RSI
const rsiCtx = document.getElementById('rsiChartNew').getContext('2d');
rsiChart = new Chart(rsiCtx, {
    type: 'line',
    data: {
        labels: pricesDates.map(date => date.x), 
        datasets: [{
            label: 'RSI',
            data: rsiData,
            borderColor: '#8A2BE2', 
            borderWidth: 2,
            fill: false,
            pointRadius: 0 
        }],
        

    },
    options: {
        scales: {
            y: {
                beginAtZero: false,
                ticks: {
                    color: numberColor 
                },
                grid: {
                    color: 'rgba(0, 0, 255, 0.1)', 
                },
            },
            x: {
                type: 'time',
                time: {
                    unit: 'day',
                    displayFormats: {
                        day: 'MMM dd'
                    }
                },
                ticks: {
                    color: numberColor 
                },
                grid: {
                    color: 'rgba(0, 0, 255, 0.1)', 
                },
            }
        },
        plugins: {
            legend: {
                labels: {
                    color: '#FF9F40' 
                }
            },
            annotation: {
                annotations: {
                    line70: {
                        type: 'line',
                        yMin: 70,
                        yMax: 70,
                        borderColor: '#BF3030', 
                        borderWidth: 2,
                        xMin: pricesDates[0].x,
                        xMax: pricesDates[pricesDates.length - 1].x,
                        label: {
                            enabled: true,
                            content: 'Overbought',
                            position: 'start',
                            xAdjust: +1,
                            yAdjust: -20,
                            backgroundColor: 'rgba(255, 255, 255, 0.5)',
                            color: '#FF6363', 
                            font: {
                                size: 14
                            }
                        }
                    },
                    line30: {
                        type: 'line',
                        yMin: 30,
                        yMax: 30,
                        borderColor: '#2E8A21', 
                        borderWidth: 2,
                        xMin: pricesDates[0].x,
                        xMax: pricesDates[pricesDates.length - 1].x,
                        label: {
                            enabled: true,
                            content: 'Oversold',
                            position: 'start',
                            xAdjust: +1,
                            yAdjust: -20,
                            backgroundColor: 'rgba(255, 255, 255, 0.5)',
                            color: '#4BC0C0', 
                            font: {
                                size: 14
                            }
                        }
                    }
                }
            }
        }
    }
});


}

function toggleTheme() {
    const bodyClass = document.body.className;
    
    const themes = {
        light: '#000',
        dark: '#FFF',
        neutral : '#000'
    }
    let newTheme;
    if (bodyClass.includes('light-theme')) {
        newTheme = 'dark';
    } else if (bodyClass.includes('dark-theme')) {
        newTheme = 'neutral';
    } else {
        newTheme = 'light';
    }

    document.body.className = `${newTheme}-theme`;
    
    
    numberColor = themes[newTheme]
    
    
    updateThemeIcon(newTheme); 
    
    rsiChart.options.scales.y.ticks.color= numberColor
    rsiChart.options.scales.x.ticks.color= numberColor
    macdChart.options.scales.y.ticks.color= numberColor
    macdChart.options.scales.x.ticks.color= numberColor
    cryptoChart.options.scales.x.ticks.color= numberColor
    cryptoChart.options.scales.y.ticks.color= numberColor
    
    cryptoChart.update()
    rsiChart.update()
    macdChart.update()

    
}

function updateThemeIcon(theme) {
    const themeIcon = document.getElementById('theme-icon');
    
    switch (theme) {
        case 'light':
            themeIcon.src = 'icons/icon1.png'; 
            break;
        case 'dark':
            themeIcon.src = 'icons/icon2.png'; 
            break;
        case 'neutral':
            themeIcon.src = 'icons/icon3.png'; 
            break;
        default:
            themeIcon.src = 'icons/icon1.png'; 
    }
}


window.onload = function() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.className = `${savedTheme}-theme`;
    updateThemeIcon(savedTheme);
};
