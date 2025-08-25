import {
    get,
    set
} from 'https://cdn.jsdelivr.net/npm/idb-keyval@6/+esm';

// Éléments du DOM
const productForm = document.getElementById('productForm');
const designationInput = document.getElementById('designation');
const categoryInput = document.getElementById('category');
const quantityInput = document.getElementById('quantity');
const totalStockSpan = document.getElementById('total-stock');
const monthlyOutflowSpan = document.getElementById('monthly-outflow');
const outflowMonthFilter = document.getElementById('outflowMonthFilter');
const categoryList = document.getElementById('categoryList');
const monthlyOutflowList = document.getElementById('monthlyOutflowList');
const productList = document.getElementById('productList');

// Données
let products = [];
let sales = [];

// Clés de stockage
const STOCK_KEY = 'stockManagerProducts';
const SALES_KEY = 'stockManagerSales';

// Fonction pour sauvegarder les données
const saveProducts = async () => {
    await set(STOCK_KEY, products);
};

const saveSales = async () => {
    await set(SALES_KEY, sales);
};

// Fonction pour charger les données
const loadData = async () => {
    products = await get(STOCK_KEY) || [];
    sales = await get(SALES_KEY) || [];
    renderAll();
};

// Fonctions de rendu
const renderAll = () => {
    renderStockSummary();
    renderCategories();
    renderMonthlyOutflow();
    renderProductList();
};

const renderStockSummary = () => {
    const totalStock = products.reduce((sum, product) => sum + product.quantity, 0);
    totalStockSpan.textContent = totalStock;
};

const renderCategories = () => {
    categoryList.innerHTML = '';
    const categories = products.reduce((acc, product) => {
        acc[product.category] = (acc[product.category] || 0) + product.quantity;
        return acc;
    }, {});

    for (const category in categories) {
        const li = document.createElement('li');
        li.textContent = `${category}: ${categories[category]}`;
        categoryList.appendChild(li);
    }
};

const renderMonthlyOutflow = () => {
    const selectedMonth = outflowMonthFilter.value === 'all' ? null : parseInt(outflowMonthFilter.value, 10);
    const currentYear = new Date().getFullYear();
    let totalOutflow = 0;

    monthlyOutflowList.innerHTML = '';
    const outflowByCategory = {};

    sales.forEach(sale => {
        const saleDate = new Date(sale.date);
        const saleMonth = saleDate.getMonth() + 1;
        const saleYear = saleDate.getFullYear();

        if (saleYear === currentYear && (selectedMonth === null || saleMonth === selectedMonth)) {
            totalOutflow += sale.quantity;
            outflowByCategory[sale.category] = (outflowByCategory[sale.category] || 0) + sale.quantity;
        }
    });

    monthlyOutflowSpan.textContent = totalOutflow;

    for (const category in outflowByCategory) {
        const li = document.createElement('li');
        li.textContent = `${category}: ${outflowByCategory[category]} unités sorties`;
        monthlyOutflowList.appendChild(li);
    }
};

const renderProductList = () => {
    productList.innerHTML = '';
    products.forEach((product, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${product.designation} (${product.category}): ${product.quantity}</span>
            <button class="remove-btn" data-index="${index}">-</button>
            <button class="add-btn" data-index="${index}">+</button>
            <button class="sell-btn" data-index="${index}">Vendre</button>
        `;
        productList.appendChild(li);
    });
};

// Gestion des événements
productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const designation = designationInput.value.trim();
    const category = categoryInput.value.trim();
    const quantity = parseInt(quantityInput.value, 10);

    const existingProduct = products.find(p => p.designation === designation);

    if (existingProduct) {
        existingProduct.quantity += quantity;
        existingProduct.category = category; // Met à jour la catégorie si elle a changé
    } else {
        products.push({
            designation,
            category,
            quantity
        });
    }

    await saveProducts();
    renderAll();
    productForm.reset();
});

productList.addEventListener('click', async (e) => {
    const index = e.target.dataset.index;
    if (e.target.classList.contains('remove-btn') && products[index].quantity > 0) {
        products[index].quantity -= 1;
        if (products[index].quantity === 0) {
            products.splice(index, 1);
        }
        await saveProducts();
        renderAll();
    } else if (e.target.classList.contains('add-btn')) {
        products[index].quantity += 1;
        await saveProducts();
        renderAll();
    } else if (e.target.classList.contains('sell-btn')) {
        const product = products[index];
        const quantityToSell = parseInt(prompt(`Combien d'unités de "${product.designation}" voulez-vous vendre ?`, '1'), 10);

        if (!isNaN(quantityToSell) && quantityToSell > 0 && quantityToSell <= product.quantity) {
            product.quantity -= quantityToSell;
            sales.push({
                designation: product.designation,
                category: product.category,
                quantity: quantityToSell,
                date: new Date().toISOString()
            });

            if (product.quantity === 0) {
                products.splice(index, 1);
            }

            await saveProducts();
            await saveSales();
            renderAll();
        } else if (quantityToSell > product.quantity) {
            alert("Quantité insuffisante en stock.");
        }
    }
});

outflowMonthFilter.addEventListener('change', renderMonthlyOutflow);

// Chargement initial
loadData();