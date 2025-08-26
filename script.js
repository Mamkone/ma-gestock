// Votre configuration Firebase (inchangée)
const firebaseConfig = {
    apiKey: "VOTRE_CLE_API", // Pensez à masquer cela dans un environnement de production
    authDomain: "magestock-for-team.firebaseapp.com",
    projectId: "magestock-for-team",
    storageBucket: "magestock-for-team.appspot.com", // Correction de .firebasestorage. en .appspot.
    messagingSenderId: "109154510782",
    appId: "1:109154510782:web:fdddbf05dfab8c6d78fbef"
};

// Initialisation de Firebase (inchangée)
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Éléments du DOM (inchangés)
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

// Variable pour stocker les ventes afin d'éviter de les relire pour le filtre
let allSales = [];

// Fonctions de rendu (inchangées)
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
    // Le reste de la fonction est identique
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
    // Fonction identique
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

// Gestion des événements (simplifiée)
productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const designation = designationInput.value.trim();
    const category = categoryInput.value.trim();
    const quantity = parseInt(quantityInput.value, 10);

    const productQuery = await db.collection("products").where("designation", "==", designation).get();

    if (!productQuery.empty) {
        const productRef = productQuery.docs[0].ref;
        const newQuantity = productQuery.docs[0].data().quantity + quantity;
        await productRef.update({ quantity: newQuantity, category });
    } else {
        await db.collection("products").add({ designation, category, quantity });
    }
    // PAS BESOIN de renderAll() ici, onSnapshot s'en occupe !
    productForm.reset();
});

productList.addEventListener('click', async (e) => {
    const productId = e.target.dataset.id;
    if (!productId) return;

    const productRef = db.collection("products").doc(productId);
    const productDoc = await productRef.get(); // On a besoin de .get() ici pour avoir l'état actuel avant modification
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
    // PAS BESOIN de renderAll() ici non plus !
});

outflowMonthFilter.addEventListener('change', () => {
    // On ne relit pas la base de données, on filtre juste les données qu'on a déjà
    renderMonthlyOutflow(allSales);
});

// --- CHANGEMENT MAJEUR : MISE EN PLACE DES ÉCOUTEURS TEMPS RÉEL ---

// 1. Écouteur pour la collection "products"
db.collection("products").onSnapshot((snapshot) => {
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // À chaque mise à jour des produits, on redessine tout ce qui en dépend
    renderStockSummary(products);
    renderCategories(products);
    renderProductList(products);
});

// 2. Écouteur pour la collection "sales"
db.collection("sales").onSnapshot((snapshot) => {
    allSales = snapshot.docs.map(doc => doc.data());
    
    // À chaque mise à jour des ventes, on redessine le bloc des sorties
    renderMonthlyOutflow(allSales);
});