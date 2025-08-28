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

// SUPPRESSION : La case à cocher n'est plus un élément global
// const isReturnCheckbox = document.getElementById('is-return-checkbox');

let allTransactions = [];

// Toutes les fonctions "render..." et la logique de la modale restent identiques
const renderStockSummary = (products) => { /* ... (inchangé) ... */ };
const renderCategories = (products) => { /* ... (inchangé) ... */ };
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
const renderProductList = (products) => { /* ... (inchangé) ... */ };
const renderCategoryDatalist = (products) => { /* ... (inchangé) ... */ };
const openModal = () => modal.classList.remove('hidden');
const closeModal = () => modal.classList.add('hidden');
modalCancelBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
let onConfirmAction = null;
modalConfirmBtn.addEventListener('click', () => { if (typeof onConfirmAction === 'function') onConfirmAction(); });


// =========================================================================
// CORRECTION : Le formulaire d'ajout n'a plus la logique de retour
// =========================================================================
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
    
    // La logique "if (isReturn)" a été supprimée ici.
    productForm.reset();
});


// =========================================================================
// CORRECTION MAJEURE : La logique de retour est déplacée dans l'action AJOUTER (+)
// =========================================================================
productList.addEventListener('click', async (e) => {
    const targetButton = e.target;
    const productId = targetButton.dataset.id;
    if (!productId) return;

    const productRef = db.collection("products").doc(productId);
    const productDoc = await productRef.get();
    if (!productDoc.exists) return;
    const product = productDoc.data();

    // -- ACTION AJOUTER (+) --
    if (targetButton.classList.contains('add-btn')) {
        modalTitle.textContent = `Ajouter à "${product.designation}"`;
        // On ajoute la case à cocher DANS la modale
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
            const isReturn = document.getElementById('modal-is-return').checked; // On vérifie la case DANS la modale

            if (!isNaN(quantityToAdd) && quantityToAdd > 0) {
                // 1. On met à jour le stock dans tous les cas
                await productRef.update({
                    quantity: (product.quantity || 0) + quantityToAdd
                });

                // 2. Si c'est un retour, on crée la transaction correspondante
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
    }

    // -- ACTION RETIRER (-) -- (logique inchangée, mais vérifiée)
    else if (targetButton.classList.contains('remove-btn')) {
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
                    type: 'sale' // C'est bien une vente
                });
                closeModal();
            } else {
                alert("Veuillez entrer une quantité valide (inférieure ou égale au stock).");
            }
        };
    }
    
    // -- ACTION SUPPRIMER (X) -- (inchangée)
    else if (targetButton.classList.contains('delete-btn')) {
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


// Filtre par mois et Écouteurs temps réel (inchangés)
outflowMonthFilter.addEventListener('change', () => {
    renderMonthlyOutflow(allTransactions);
});

db.collection("products").onSnapshot((snapshot) => {
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderStockSummary(products);
    renderCategories(products);
    renderProductList(products);
    renderCategoryDatalist(products);
});

db.collection("transactions").onSnapshot((snapshot) => {
    allTransactions = snapshot.docs.map(doc => doc.data());
    renderMonthlyOutflow(allTransactions);
});