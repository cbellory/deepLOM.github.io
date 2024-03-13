// Определение глобальных переменных
let cryptoChart; // для хранения графика
const apiUrl = 'https://api.coingecko.com/api/v3/coins/'; // Обновленный базовый URL API CoinGecko для получения исторических данных

// Функция для изменения отображаемой криптовалюты
async function changeCrypto(cryptoId) {
    // Получение исторических данных для криптовалюты
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30); // Берем данные за последние 30 дней
    const response = await fetch(`${apiUrl}${cryptoId}/market_chart/range?vs_currency=usd&from=${startDate.getTime() / 1000}&to=${endDate.getTime() / 1000}`);
    const data = await response.json();

    // Проверка полученных данных и обновление графика и рекомендаций
    if (data && data.prices) {
        const prices = data.prices.map(price => ({ x: new Date(price[0]), y: price[1] }));
        updateChart(prices, cryptoId); // Функция обновления графика цен
        updateRecommendations(prices); // Функция обновления рекомендаций на основе новых цен

        // Предположим, что у вас есть функции для вычисления данных для MACD и RSI
        const closingPrices = prices.map(price => price.y); // Извлекаем цены закрытия для расчетов
        const macdData = calculateMACD(closingPrices); // Вычисляем данные для MACD
        const rsiData = calculateRSI(closingPrices); // Вычисляем данные для RSI

        // Обновляем графики MACD и RSI
        displayMacdAndRsiCharts(macdData, rsiData); // Вызываем функцию для отображения графиков

        console.log("MACD Data being passed to MACD chart:", macdData);
        console.log("RSI Data being passed to RSI chart:", rsiData);

    } else {
        console.error('Ошибка при получении данных');
    }
}

// Функция для обновления графика
function updateChart(prices, cryptoId) {
    const priceValues = prices.map(price => price.y);
    const pricedays = prices.map(price => price.x);
    console.log(Pricedays);
    const smaValues = calculateSMA(priceValues, 14); // Вы можете изменить период
    const smaPoints = prices.slice(14 - 1).map((price, index) => ({
        x: price.x,
        y: smaValues[index]
    }));

    if (cryptoChart) {
        cryptoChart.destroy(); // Уничтожаем предыдущий график, если он существует
    }

    const ctx = document.getElementById('cryptoChart').getContext('2d');
    cryptoChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: `${cryptoId.toUpperCase()} Цена в USD`,
                data: prices,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            },
            {
                label: 'SMA 14 дней',
                data: smaPoints,
                borderColor: 'rgb(255, 206, 86)',
                tension: 0.1
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

// Функция для расчета EMA
function calculateEMA(prices, days) {
    const k = 2 / (days + 1); // Весовой коэффициент
    let emaArray = [prices[0]]; // Начинаем массив EMA с первого значения цены

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

    // Предполагаем, что 'prices' - это массив цен закрытия
    for (let i = 1; i < prices.length; i++) {
        let change = prices[i] - prices[i - 1];
        gains.push(change > 0 ? change : 0);
        losses.push(change < 0 ? -change : 0);
    }

    // Вычисляем средние прибыли и убытки
    let averageGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
    let averageLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

    let rsiArray = [];

    for (let i = period; i < prices.length; i++) {
        let newGain = gains[i];
        let newLoss = losses[i];

        // Сглаженные средние
        averageGain = (averageGain * (period - 1) + newGain) / period;
        averageLoss = (averageLoss * (period - 1) + newLoss) / period;

        if (averageLoss === 0) {
            rsiArray.push(100); // Если нет убытков, RSI считается равным 100
        } else {
            let rs = averageGain / averageLoss;
            let rsi = 100 - (100 / (1 + rs));
            rsiArray.push(rsi);
        }
    }

    console.log("Average gains:", averageGain);
    console.log("Average losses:", averageLoss);
    console.log("RSI array:", rsiArray);

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

// Функция для обновления рекомендаций на основе MACD и RSI
function updateRecommendations(prices) {
    // Извлечение цен закрытия
    const closingPrices = prices.map(price => price.y); // Предполагаем, что 'prices' это массив объектов с 'x' для времени и 'y' для цены

    // Расчет индикаторов
    const { MACDLine, signalLine } = calculateMACD(closingPrices);
    const lastMACD = MACDLine[MACDLine.length - 1];
    const lastSignal = signalLine[signalLine.length - 1];
    const rsi = calculateRSI(closingPrices);

    // Генерация торговых сигналов на основе MACD
    let macdSignal;
    if (lastMACD > lastSignal) {
        macdSignal = 'Покупать'; // MACD пересекает сигнальную линию снизу вверх
    } else if (lastMACD < lastSignal) {
        macdSignal = 'Продавать'; // MACD пересекает сигнальную линию сверху вниз
    } else {
        macdSignal = 'Держать'; // Нет четкого тренда
    }

    // Генерация торговых сигналов на основе RSI
    let rsiSignal;
    if (rsi > 70) {
        rsiSignal = 'Продавать'; // RSI выше 70 считается перекупленностью
    } else if (rsi < 30) {
        rsiSignal = 'Покупать'; // RSI ниже 30 считается перепроданностью
    } else {
        rsiSignal = 'Держать'; // RSI находится в нормальном диапазоне
    }

    // Обновление текста рекомендаций на странице
    document.getElementById('recommendations').innerText = `MACD Сигнал: ${macdSignal}, RSI Сигнал: ${rsiSignal}`;
}

function requestCrypto() {
    const cryptoId = document.getElementById('cryptoInput').value.trim().toLowerCase();
    if (cryptoId) {
        changeCrypto(cryptoId);
    } else {
        alert('Пожалуйста, введите ID криптовалюты.');
    }
}

function updateClocks() {
    const formatOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
    // Нью-Йорк (UTC-4)
    document.getElementById('timeNYC').innerText = 'Нью-Йорк: ' + new Date().toLocaleTimeString('ru-RU', {...formatOptions, timeZone: 'America/New_York'});
    // Лондон (UTC+1)
    document.getElementById('timeLondon').innerText = 'Лондон: ' + new Date().toLocaleTimeString('ru-RU', {...formatOptions, timeZone: 'Europe/London'});
    // Москва (UTC+3)
    document.getElementById('timeMoscow').innerText = 'Москва: ' + new Date().toLocaleTimeString('ru-RU', {...formatOptions, timeZone: 'Europe/Moscow'});
    // Токио (UTC+9)
    document.getElementById('timeTokyo').innerText = 'Токио: ' + new Date().toLocaleTimeString('ru-RU', {...formatOptions, timeZone: 'Asia/Tokyo'});
}

setInterval(updateClocks, 1000);

function setTheme(themeName) {
    localStorage.setItem('theme', themeName);
    document.body.className = themeName + '-theme';
}

// Функция для установки темы при загрузке страницы
function loadTheme() {
    const theme = localStorage.getItem('theme') || 'light'; // По умолчанию светлая тема
    setTheme(theme);
}

// Вызовите функцию loadTheme при загрузке страницы
window.onload = loadTheme;


function displayMacdAndRsiCharts(macdData, rsiData) {
    // Деструктуризация данных MACD
    const { MACDLine, signalLine, histogram } = macdData;

    // Создание графика MACD
    const macdCtx = document.getElementById('macdChartNew').getContext('2d');
    const macdChart = new Chart(macdCtx, {
        type: 'line',
        data: {
            labels: MACDLine.map((_, index) => index), // Просто используем индекс в качестве меток времени
            datasets: [
                {
                    label: 'MACD Line',
                    data: MACDLine,
                    borderColor: 'blue',
                    borderWidth: 1,
                    fill: false
                },
                {
                    label: 'Signal Line',
                    data: signalLine,
                    borderColor: 'red',
                    borderWidth: 1,
                    fill: false
                },
                {
                    label: 'Histogram',
                    data: histogram,
                    borderColor: 'green',
                    borderWidth: 1,
                    type: 'bar'
                }
            ]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: false
                }
            }
        }
    });

    // Создание графика RSI
    const rsiCtx = document.getElementById('rsiChartNew').getContext('2d');
    const rsiChart = new Chart(rsiCtx, {
        type: 'line',
        data: {
            labels: rsiData.map((_, index) => index), // Аналогично, используем индекс в качестве меток времени
            datasets: [{
                label: 'RSI',
                data: rsiData,
                borderColor: 'purple',
                borderWidth: 1,
                fill: false
            }]
        },
        options: {
            scales: {
                y: {
                    min: 0,
                    max: 100,
                    afterBuildTicks: (axis) => {
                        // Явно устанавливаем пользовательские тики
                        axis.ticks = [
                            ...axis.ticks, // Копируем существующие тики, если они есть
                            {value: 30, label: 'Перепроданность'},
                            {value: 70, label: 'Перекупленность'}
                        ];
                    }
                }
            }
        }
        
    });
}

