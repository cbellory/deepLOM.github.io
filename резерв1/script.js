// Определение глобальных переменных
let cryptoChart; // для хранения графика
const apiUrl = 'https://api.coingecko.com/api/v3/coins/'; // Обновленный базовый URL API CoinGecko для получения исторических данных
let macdChart;
let rsiChart;



const style = getComputedStyle(document.documentElement);
const chartTextColor = style.getPropertyValue('--chart-text-color').trim();
const chartLineColor = style.getPropertyValue('--chart-line-color').trim();
const chartBackgroundColor = style.getPropertyValue('--chart-background-color').trim();
const rsiCtx = document.getElementById('rsiChartNew').getContext('2d');

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
        const pricesDates = prices.map(price => price.x);
        
        
        const macdData = calculateMACD(closingPrices); // Вычисляем данные для MACD
        const rsiData = calculateRSI(closingPrices); // Вычисляем данные для RSI

        macdChart?.destroy?.()
        rsiChart?.destroy?.()

        displayMacdAndRsiCharts(macdData, rsiData, prices); // Вызываем функцию для отображения графиков

    } else {
        console.error('Ошибка при получении данных');
    }
    expandContainer();
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

// Инициализация баланса и восстановление из localStorage
let balance = parseFloat(localStorage.getItem('usdBalance')) || 100000;
let btcbalance = parseFloat(localStorage.getItem('btcBalance')) || 0;

// Функция для обновления баланса на странице
let transactionLog = []; // Лог транзакций для хранения действий пользователя


// Функция для обновления баланса на странице и в localStorage
function updateBalances() {
    // Заранее объявляем переменные для старых значений балансов
    const oldUsdBalance = balance;
    const oldBtcBalance = btcbalance;

    // Ввод новых значений пользователя
    const newUsdBalanceInput = document.getElementById('newUsdBalance');
    const newBtcBalanceInput = document.getElementById('newBtcBalance');

    const newUsdBalance = newUsdBalanceInput ? newUsdBalanceInput.value : null;
    const newBtcBalance = newBtcBalanceInput ? newBtcBalanceInput.value : null;

    // Проверка на корректность введенных значений и на положительные значения
    if (newUsdBalance !== null && newBtcBalance !== null && !isNaN(parseFloat(newUsdBalance)) && !isNaN(parseFloat(newBtcBalance)) && parseFloat(newUsdBalance) >= 0 && parseFloat(newBtcBalance) >= 0) {
        balance = parseFloat(newUsdBalance);
        btcbalance = parseFloat(newBtcBalance);
        
        // Логирование изменений баланса
        logTransaction(oldUsdBalance, oldBtcBalance, balance, btcbalance);
    }

    // Обновление отображаемых значений
    document.getElementById('usdBalance').textContent = balance.toFixed(2);
    document.getElementById('btcBalance').textContent = btcbalance.toFixed(8);
    
    // Сохранение в localStorage
    localStorage.setItem('usdBalance', balance);
    localStorage.setItem('btcBalance', btcbalance);


    // Логирование изменений баланса, если были введены новые значения
    if (newUsdBalance !== null && newBtcBalance !== null) {
        logTransaction(oldUsdBalance, oldBtcBalance, balance, btcbalance);
    }
}

// Функция логирования изменений баланса (предполагается, что она у вас уже есть)
function logTransaction(oldUsdBalance, oldBtcBalance, newUsdBalance, newBtcBalance) {
    console.log(`Баланс изменён: USD с ${oldUsdBalance.toFixed(2)} на ${newUsdBalance.toFixed(2)}, BTC с ${oldBtcBalance.toFixed(8)} на ${newBtcBalance.toFixed(8)}.`);
}

// Вызовите функцию updateBalances при загрузке страницы
window.onload = function() {
    updateBalances(); // Инициализирует и обновляет балансы при загрузке страницы
};


function logTransaction(oldUsd, oldBtc, newUsd, newBtc) {
    // Формирование сообщения о транзакции
    const transactionMessage = `Баланс изменен: USD с ${oldUsd.toFixed(2)} на ${newUsd.toFixed(2)}, BTC с ${oldBtc.toFixed(8)} на ${newBtc.toFixed(8)}.`;
    transactionLog.push(transactionMessage); // Добавление сообщения в лог
    
    // Вывод последних 5 транзакций в консоль
    console.log("Последние транзакции:");
    transactionLog.slice(-5).forEach((transaction, index) => {
        console.log(`${index + 1}: ${transaction}`);
    });
}

// Функция для автоматического сохранения балансов каждые N минут
function autoSaveBalances(intervalMinutes = 5) {
    setInterval(() => {
        localStorage.setItem('usdBalance', balance);
        localStorage.setItem('btcBalance', btcbalance);
        console.log('Балансы автоматически сохранены.');
    }, intervalMinutes * 60000); // Преобразование минут в миллисекунды
}

// Вызовите эту функцию один раз при загрузке страницы или при инициализации
autoSaveBalances(5); // Автоматическое сохранение каждые 5 минут

// Функция для автоматического обновления курса BTC (заглушка, предполагает наличие функции getBtcUsdRate)
async function updateBtcRate() {
    const rate = await getBtcUsdRate(); // Предполагается, что эта функция возвращает текущий курс BTC к USD
    document.getElementById('btcRate').textContent = `1 BTC = $${rate.toFixed(2)}`;
}

// Функция заглушка для получения курса BTC к USD (необходимо реализовать)
async function getBtcUsdRate() {
    // Здесь должен быть код для получения актуального курса, например, через запрос к API
    return 50000; // Пример возвращаемого значения
}


// Функция для сохранения балансов в localStorage
function saveBalances() {
    localStorage.setItem('usdBalance', balance);
    localStorage.setItem('btcBalance', btcbalance);
}

// Вызовите updateBalances при загрузке страницы, чтобы отобразить текущий баланс
window.onload = function() {
    updateBalances();
    // Другие функции загрузки, если они есть
};

// В вашей функции automateTrading, добавьте вызовы функций обновления и сохранения баланса
function automateTrading(currentRsi, currentPrice) {
    const investAmount = balance / 10; // Сумма инвестиций равна 1/10 текущего баланса
    const rsiBuyThreshold = 30;
    const rsiSellThreshold = 70;

    let actionTaken = 'Никаких действий не выполнено';

    if (currentRsi < rsiBuyThreshold) {
        let coinsToBuy = investAmount / currentPrice;
        if (coinsToBuy > 0) {
            balance -= coinsToBuy * currentPrice;
            btcbalance += coinsToBuy;
            actionTaken = `Выполнена покупка ${coinsToBuy.toFixed(8)} монет по цене ${currentPrice}.`;
        }
    }

    if (currentRsi > rsiSellThreshold && btcbalance > 0) {
        const coinsToSell = btcbalance;
        balance += coinsToSell * currentPrice;
        btcbalance -= coinsToSell;
        actionTaken = `Выполнена продажа ${coinsToSell.toFixed(8)} монет по цене ${currentPrice}.`;
    }

    // Обновление и сохранение баланса
    updateBalances();
    saveBalances();
    console.log(actionTaken);
}

    

// Функция для обновления рекомендаций на основе MACD и RSI
function updateRecommendations(prices) {
    // Извлечение цен закрытия
    const closingPrices = prices.map(price => price.y); // Предполагаем, что 'prices' это массив объектов с 'x' для времени и 'y' для цены

    // Расчет индикаторов
    const { MACDLine, signalLine } = calculateMACD(closingPrices);
    const lastMACD = MACDLine.slice(-1);
    const lastSignal = signalLine.slice(-1);
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
    if (rsi.slice(-2)[0] > 70) {
        rsiSignal = 'Продавать'; // RSI выше 70 считается перекупленностью
    } else if (rsi.slice(-2)[0] < 30) {
        rsiSignal = 'Покупать'; // RSI ниже 30 считается перепроданностью
    } else {
        rsiSignal = 'Держать'; // RSI находится в нормальном диапазоне
    }

    // Обновление текста рекомендаций на странице
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

// Функция для установки темы при загрузке страницы
function loadTheme() {
    const theme = localStorage.getItem('theme') || 'light'; // По умолчанию светлая тема
    setTheme(theme);
}

// Вызовите функцию loadTheme при загрузке страницы
window.onload = loadTheme;


function displayMacdAndRsiCharts(macdData, rsiData, pricesDates) {
    // Деструктуризация данных MACD
    const { MACDLine, signalLine, histogram } = macdData;

    // Создание графика MACD
    const macdCtx = document.getElementById('macdChartNew').getContext('2d');
    macdChart = new Chart(macdCtx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'MACD Line',
                    data: MACDLine.map((value, index) => ({ x: pricesDates[index].x, y: value })),
                    borderColor: style.getPropertyValue('--chart-line-color'), // Используем CSS переменную для цвета линии
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 0
                },
                {
                    label: 'Signal Line',
                    data: signalLine.map((value, index) => ({ x: pricesDates[index].x, y: value })),
                    borderColor: style.getPropertyValue('--chart-line-color'), // Используем CSS переменную для цвета линии
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 0
                },
                {
                    label: 'Histogram',
                    data: histogram.map((value, index) => ({ x: pricesDates[index].x, y: value })),
                    borderColor: 'green', // Зеленый для гистограммы
                    backgroundColor: style.getPropertyValue('--chart-background-color'), // Используем CSS переменную для цвета фона
                    borderWidth: 1,
                    type: 'bar'
                }
            ]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: false
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
                        color: style.getPropertyValue('--chart-text-color') // Используем CSS переменную для цвета текста
                    }
                }
            }
        }
    });
    
    rsiChart = new Chart(rsiCtx, {
        type: 'line',
        data: {
            labels: pricesDates.map(date => date.x), // Метки времени для оси X
            datasets: [{
                label: 'RSI',
                data: rsiData,
                borderColor: style.getPropertyValue('--chart-line-color-rsi'), // Используем CSS переменную для цвета линии
                borderWidth: 2,
                fill: false,
                pointRadius: 0 // Отключает точки на графике для RSI
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        color: style.getPropertyValue('--chart-text-color') // Используем CSS переменную для цвета текста оси Y
                    }
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
                        color: style.getPropertyValue('--chart-text-color') // Используем CSS переменную для цвета текста оси X
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: style.getPropertyValue('--legend-text-color') // Используем CSS переменную для цвета текста легенды
                    }
                },
                annotation: {
                    annotations: {
                        line70: {
                            type: 'line',
                            yMin: 70,
                            yMax: 70,
                            borderColor: style.getPropertyValue('--overbought-line-color'), // Используем CSS переменную
                            borderWidth: 3,
                            label: {
                                enabled: true,
                                content: 'Overbought',
                                position: 'start',
                                backgroundColor: 'rgba(255, 255, 255, 0.5)',
                                color: 'rgb(255, 99, 132)',
                                font: {
                                    size: 16
                                }
                            }
                        },
                        line30: {
                            type: 'line',
                            yMin: 30,
                            yMax: 30,
                            borderColor: style.getPropertyValue('--oversold-line-color'), // Используем CSS переменную
                            borderWidth: 3,
                            label: {
                                enabled: true,
                                content: 'Oversold',
                                position: 'start',
                                backgroundColor: 'rgba(255, 255, 255, 0.5)',
                                color: 'rgb(75, 192, 192)',
                                font: {
                                    size: 16
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

    let newTheme;
    if (bodyClass.includes('light-theme')) {
        newTheme = 'dark';
    } else if (bodyClass.includes('dark-theme')) {
        newTheme = 'neutral';
    } else {
        newTheme = 'light';
    }

    document.body.className = `${newTheme}-theme`;
    updateThemeIcon(newTheme); // Обновляем иконку в соответствии с новой темой
}

function updateThemeIcon(theme) {
    const themeIcon = document.getElementById('theme-icon');
    // Предположим, что у вас есть разные файлы изображений для каждой темы
    switch (theme) {
        case 'light':
            themeIcon.src = 'icons/icon1.png'; // Путь к вашему изображению для светлой темы
            break;
        case 'dark':
            themeIcon.src = 'icons/icon2.png'; // Путь к вашему изображению для темной темы
            break;
        case 'neutral':
            themeIcon.src = 'icons/icon3.png'; // Путь к вашему изображению для нейтральной темы
            break;
        default:
            themeIcon.src = 'icons/icon1.png'; // Фолбек на светлую тему
    }
}

// Устанавливаем класс темы для body в соответствии с сохраненной темой при загрузке страницы
window.onload = function() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.className = `${savedTheme}-theme`;
    updateThemeIcon(savedTheme);
};

function expandContainer() {
    const container = document.querySelector('.container');

    container.classList.add('container-expanding');
}

function toggleBalances() {
    var balancesDiv = document.getElementById("balances");
    if (balancesDiv.style.display === "none") {
        balancesDiv.style.display = "block"; // Если блок скрыт, показываем его
    } else {
        balancesDiv.style.display = "none"; // Иначе скрываем
    }
}
