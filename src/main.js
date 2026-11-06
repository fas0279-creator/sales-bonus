/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    const { discount, sale_price, quantity } = purchase;
    const discountRate = 1 - (discount / 100); // вычисляем коэффициент скидки
    const revenue = sale_price * quantity * discountRate; // считаем выручку
    return revenue;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    const { profit } = seller;
    let bonusByProfit;
    if (index === 0) {bonusByProfit = profit * 0.15;}
    else if (index === 1 || index === 2){bonusByProfit = profit * 0.10;}
    else if (index === total - 1) {bonusByProfit = 0;}
    else {bonusByProfit = profit * 0.05;}
    return bonusByProfit;
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    if (!data) {
        throw new Error('Ошибка! Данных нет!');
    }
    if (!Array.isArray(data.sellers) || !Array.isArray(data.products) || !Array.isArray(data.purchase_records)) {
        throw new Error('Ошибка! Данные не являются массивом!');
    }
    if (data.sellers.length === 0 || data.products.length === 0 || data.purchase_records.length === 0) {
        throw new Error('Ошибка! В массиве нет данных!');
    }
    if (!options) {
        throw new Error('Ошибка! Объект не существует!');
    }
    if (typeof options.calculateRevenue !== 'function' || typeof options.calculateBonus !== 'function') {
        throw new Error('Ошибка! Не является функцией!');
    }

    const sellerStats = [];
    data.sellers.forEach(seller => {
        const sellerStat = {
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
        }
        sellerStats.push(sellerStat);
    });

    const sellerIndex = sellerStats.reduce((result, item) => ({
    ...result,
    [item.id]: item
    }), {});

    const productIndex = data.products.reduce((result, item) => ({
    ...result,
    [item.sku]: item
    }), {});

    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        seller.sales_count++;
        seller.revenue += record.total_amount;

        record.items.forEach(item => {
            const product = productIndex[item.sku];
            const cost = product.purchase_price * item.quantity;
            const revenue = options.calculateRevenue(item, product);
            const profit = revenue - cost;
            seller.profit += profit; 
            // Учёт количества проданных товаров
            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
        });
    });

    const sortedSellers = [...sellerStats].sort((a, b) => {
        if (a.profit > b.profit) {
            return -1;
        }
        if (a.profit < b.profit) {
            return 1;
        }
        return 0;
    })

    sortedSellers.forEach((seller, index) => {
        seller.bonus = options.calculateBonus(index, sortedSellers.length, seller);

        const topProducts = Object.entries(seller.products_sold).map(([sku, quantity]) => {
            return {sku, quantity};
        }).toSorted((a, b) => {
        if (a.quantity > b.quantity) {
            return -1;
        }
        if (a.quantity < b.quantity) {
            return 1;
        }
        return 0;
    }).slice(0, 10);
        seller.top_products = topProducts;
    }); 

    return sortedSellers.map(seller => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: +(seller.revenue.toFixed(2)),
        profit: +(seller.profit.toFixed(2)),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: +(seller.bonus.toFixed(2))
    }));


}
