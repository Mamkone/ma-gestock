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
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const modalConfirmBtn = document.getElementById('modal-confirm-btn');

let allTransactions = [];

// ======================================================================
// CORRECTION : Le contenu de ces fonctions a été restauré
// ======================================================================
const renderStockSummary = (products) => {
    const totalStock = products.reduce((sum, product) => sum + (product.quantity || 0), 0);
    totalStockSpan.textContent = totalStock;
};

const renderCategories = (products) => {
    categoryList.innerHTML = '';
    const categories = products.reduce((acc, product) => {
        const categoryName = product.category || 'Non classé';
        acc[categoryName] = (acc[categoryName] || 0) + (product.quantity || 0);
        return acc;
    }, {});
    for (const category in categories) {
        const li = document.createElement('li');
        li.textContent = `${category}: ${categories[category]}`;
        categoryList.appendChild(li);
    }
};

const renderMonthlyOutflow = (transactions) => {
    const selectedMonth = outflowMonthFilter.value === 'all' ? null : parseInt(outflowMonthFilter.value, 10);
    const currentYear = new Date().getFullYear();
    let totalOutflow = 0;
    monthlyOutflowList.innerHTML = '';
    const outflowByCategory = {};
    transactions.forEach(transaction => {
        const transactionDate = new Date(transaction.date);
        const transactionMonth = transactionDate.getMonth() + 1;
        const transactionYear = transactionDate.getFullYear();
        if (transactionYear === currentYear && (selectedMonth === null || transactionMonth === selectedMonth)) {
            const categoryName = transaction.category || 'Non classé';
            if (transaction.type === 'return') {
                totalOutflow -= transaction.quantity;
                outflowByCategory[categoryName] = (outflowByCategory[categoryName] || 0) - transaction.quantity;
            } else {
                totalOutflow += transaction.quantity;
                outflowByCategory[categoryName] = (outflowByCategory[categoryName] || 0) + transaction.quantity;
            }
        }
    });
    monthlyOutflowSpan.textContent = totalOutflow;
    for (const category in outflowByCategory) {
        const li = document.createElement('li');
        li.textContent = `${category}: ${outflowByCategory[category]} unités (sorties nettes)`;
        monthlyOutflowList.appendChild(li);
    }
};

const renderProductList = (products) => {
    productList.innerHTML = '';
    products.forEach((product) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${product.designation} (${product.category || 'Non classé'}): ${product.quantity || 0}</span>
            <div>
                <button class="add-btn" data-id="${product.id}">+</button>
                <button class="remove-btn" data-id="${product.id}">-</button>
                <button class="delete-btn" data-id="${product.id}">X</button>
            </div>
        `;
        productList.appendChild(li);
    });
};

const renderCategoryDatalist = (products) => {
    const datalist = document.getElementById('category-options');
    if (!datalist) return;
    const uniqueCategories = [...new Set(products.map(p => p.category).filter(c => c))];
    datalist.innerHTML = '';
    uniqueCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        datalist.appendChild(option);
    });
};

const openModal = () => modal.classList.remove('hidden');
const closeModal = () => modal.classList.add('hidden');
modalCancelBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
let onConfirmAction = null;
modalConfirmBtn.addEventListener('click', () => { if (typeof onConfirmAction === 'function') onConfirmAction(); });

// Le reste du code est correct et reste inchangé...
productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const designation = designationInput.value.trim();
    const category = categoryInput.value.trim();
    const quantity = parseInt(quantityInput.value, 10);
    if (!designation || !category || isNaN(quantity)) {
        return alert("Veuillez remplir tous les champs correctement.");
    }
    const productQuery = await db.collection("products").where("designation", "==", designation).get();
    if (!productQuery.empty) {
        const productRef = productQuery.docs[0].ref;
        const oldQuantity = productQuery.docs[0].data().quantity || 0;
        await productRef.update({
            quantity: oldQuantity + quantity,
            category: category
        });
    } else {
        await db.collection("products").add({ designation, category, quantity });
    }
    productForm.reset();
});

productList.addEventListener('click', async (e) => {
    const targetButton = e.target;
    const productId = targetButton.dataset.id;
    if (!productId) return;
    const productRef = db.collection("products").doc(productId);
    const productDoc = await productRef.get();
    if (!productDoc.exists) return;
    const product = productDoc.data();
    if (targetButton.classList.contains('add-btn')) {
        modalTitle.textContent = `Ajouter à "${product.designation}"`;
        modalBody.innerHTML = `
            <p>Stock actuel : ${product.quantity || 0}</p>
            <input type="number" id="modal-quantity" min="1" value="1" placeholder="Quantité à ajouter">
            <div class="form-check" style="margin-top: 15px;">
                <input type="checkbox" id="modal-is-return">
                <label for="modal-is-return">Ceci est un retour de produit</label>
            </div>
        `;
        modalConfirmBtn.textContent = 'Confirmer';
        modalConfirmBtn.classList.remove('danger');
        openModal();
        onConfirmAction = async () => {
            const quantityToAdd = parseInt(document.getElementById('modal-quantity').value, 10);
            const isReturn = document.getElementById('modal-is-return').checked;
            if (!isNaN(quantityToAdd) && quantityToAdd > 0) {
                await productRef.update({
                    quantity: (product.quantity || 0) + quantityToAdd
                });
                if (isReturn) {
                    await db.collection("transactions").add({
                        designation: product.designation,
                        category: product.category || 'Non classé',
                        quantity: quantityToAdd,
                        date: new Date().toISOString(),
                        type: 'return'
                    });
                }
                closeModal();
            } else {
                alert("Veuillez entrer une quantité valide.");
            }
        };
    } else if (targetButton.classList.contains('remove-btn')) {
        const currentQuantity = product.quantity || 0;
        if (currentQuantity <= 0) return alert("Stock déjà à zéro.");
        modalTitle.textContent = `Vendre depuis "${product.designation}"`;
        modalBody.innerHTML = `<p>Stock actuel : ${currentQuantity}</p><input type="number" id="modal-quantity" min="1" max="${currentQuantity}" value="1" placeholder="Quantité à vendre">`;
        modalConfirmBtn.textContent = 'Vendre';
        modalConfirmBtn.classList.remove('danger');
        openModal();
        onConfirmAction = async () => {
            const quantityToRemove = parseInt(document.getElementById('modal-quantity').value, 10);
            if (!isNaN(quantityToRemove) && quantityToRemove > 0 && quantityToRemove <= currentQuantity) {
                await productRef.update({
                    quantity: currentQuantity - quantityToRemove
                });
                await db.collection("transactions").add({
                    designation: product.designation,
                    category: product.category || 'Non classé',
                    quantity: quantityToRemove,
                    date: new Date().toISOString(),
                    type: 'sale'
                });
                closeModal();
            } else {
                alert("Veuillez entrer une quantité valide (inférieure ou égale au stock).");
            }
        };
    } else if (targetButton.classList.contains('delete-btn')) {
        modalTitle.textContent = 'Confirmation de suppression';
        modalBody.innerHTML = `<p>Êtes-vous sûr de vouloir supprimer définitivement le produit "<strong>${product.designation}</strong>" ? Cette action est irréversible.</p>`;
        modalConfirmBtn.textContent = 'Supprimer';
        modalConfirmBtn.classList.add('danger');
        openModal();
        onConfirmAction = async () => {
            await productRef.delete();
            closeModal();
        };
    }
});

outflowMonthFilter.addEventListener('change', () => {
    renderMonthlyOutflow(allTransactions);
});

db.collection("products").onSnapshot((snapshot) => {
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    products.sort((a, b) => (a.designation || '').localeCompare(b.designation || ''));

    renderStockSummary(products);
    renderCategories(products);
    renderProductList(products);
    renderCategoryDatalist(products);    
});

db.collection("transactions").onSnapshot((snapshot) => {
    allTransactions = snapshot.docs.map(doc => doc.data());
    renderMonthlyOutflow(allTransactions);
});