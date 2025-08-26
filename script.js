// Votre configuration Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBd7_E3cPprFPVkC6_CCpwt57tDghU4y2E",
    authDomain: "magestock-for-team.firebaseapp.com",
    projectId: "magestock-for-team",
    storageBucket: "magestock-for-team.firebasestorage.app",
    messagingSenderId: "109154510782",
    appId: "1:109154510782:web:fdddbf05dfab8c6d78fbef"
};

// Initialisation de Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

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

// Fonctions de rendu
const renderAll = async () => {
    const productsSnapshot = await db.collection("products").get();
    const products = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const salesSnapshot = await db.collection("sales").get();
    const sales = salesSnapshot.docs.map(doc => doc.data());

    renderStockSummary(products);
    renderCategories(products);
    renderMonthlyOutflow(sales);
    renderProductList(products);
};

const renderStockSummary = (products) => {
    const totalStock = products.reduce((sum, product) => sum + product.quantity, 0);
    totalStockSpan.textContent = totalStock;
};

const renderCategories = (products) => {
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

const renderMonthlyOutflow = (sales) => {
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

const renderProductList = (products) => {
    productList.innerHTML = '';
    products.forEach((product) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${product.designation} (${product.category}): ${product.quantity}</span>
            <div>
                <button class="add-btn" data-id="${product.id}">+</button>
                <button class="remove-btn" data-id="${product.id}">-</button>
                <button class="delete-btn" data-id="${product.id}">X</button>
            </div>
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

    const productQuery = await db.collection("products").where("designation", "==", designation).get();

    if (!productQuery.empty) {
        // Le produit existe, on met à jour la quantité et la catégorie
        const productRef = productQuery.docs[0].ref;
        const newQuantity = productQuery.docs[0].data().quantity + quantity;
        await productRef.update({ quantity: newQuantity, category });
    } else {
        // Nouveau produit, on l'ajoute
        await db.collection("products").add({ designation, category, quantity });
    }

    renderAll();
    productForm.reset();
});

productList.addEventListener('click', async (e) => {
    const productId = e.target.dataset.id;
    if (!productId) return;

    const productRef = db.collection("products").doc(productId);
    const productDoc = await productRef.get();
    const product = productDoc.data();

    if (e.target.classList.contains('add-btn')) {
        const quantityToAdd = parseInt(prompt(`Combien d'unités de "${product.designation}" voulez-vous ajouter ?`, '1'), 10);
        if (!isNaN(quantityToAdd) && quantityToAdd > 0) {
            await productRef.update({ quantity: product.quantity + quantityToAdd });
        }
    } else if (e.target.classList.contains('remove-btn') && product.quantity > 0) {
        const quantityToRemove = parseInt(prompt(`Combien d'unités de "${product.designation}" voulez-vous vendre ?`, '1'), 10);
        if (!isNaN(quantityToRemove) && quantityToRemove > 0 && quantityToRemove <= product.quantity) {
            await productRef.update({ quantity: product.quantity - quantityToRemove });
            // Enregistrer la vente dans une collection séparée pour le suivi
            await db.collection("sales").add({
                designation: product.designation,
                category: product.category,
                quantity: quantityToRemove,
                date: new Date().toISOString()
            });
        } else if (quantityToRemove > product.quantity) {
            alert("Quantité insuffisante en stock.");
        }
    } else if (e.target.classList.contains('delete-btn')) {
        if (confirm(`Êtes-vous sûr de vouloir supprimer "${product.designation}" du stock ?`)) {
            await productRef.delete();
        }
    }
    renderAll();
});

outflowMonthFilter.addEventListener('change', async () => {
    const salesSnapshot = await db.collection("sales").get();
    const sales = salesSnapshot.docs.map(doc => doc.data());
    renderMonthlyOutflow(sales);
});

// Chargement initial
renderAll();