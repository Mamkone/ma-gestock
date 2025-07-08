// Ces variables sont rendues disponibles par le script dans index.html
// Elles permettent à script.js de communiquer avec Firebase
const db = window.db;
const collection = window.collection;
const addDoc = window.addDoc;
const getDocs = window.getDocs;
const doc = window.doc;
const updateDoc = window.updateDoc;
const deleteDoc = window.deleteDoc;
const query = window.query;
const where = window.where;
const onSnapshot = window.onSnapshot;
const orderBy = window.orderBy;


document.addEventListener('DOMContentLoaded', () => {
    const productForm = document.getElementById('productForm');
    const designationInput = document.getElementById('designation');
    const quantityInput = document.getElementById('quantity');
    const productList = document.getElementById('productList');

    // Référence à la collection 'products' dans Firestore
    // C'est là que vos produits seront stockés dans la base de données Firebase
    const productsCollectionRef = collection(db, 'products');

    // Fonction pour ajouter un nouveau produit ou mettre à jour une quantité existante
    const addOrUpdateProduct = async (designation, quantity) => {
        // Cherche si un produit avec la même désignation existe déjà
        const q = query(productsCollectionRef, where('designation', '==', designation));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            // Le produit existe déjà, on met à jour sa quantité
            const documentRef = querySnapshot.docs[0];
            const currentQuantity = documentRef.data().quantity;
            await updateDoc(doc(db, 'products', documentRef.id), {
                quantity: currentQuantity + quantity
            });
        } else {
            // Le produit est nouveau, on l'ajoute à la base de données
            await addDoc(productsCollectionRef, {
                designation: designation,
                quantity: quantity
            });
        }
    };

    // Fonction pour supprimer un produit de la base de données
    const deleteProduct = async (productId) => {
        await deleteDoc(doc(db, 'products', productId));
    };

    // Fonction pour mettre à jour la quantité d'un produit existant
    const updateProductQuantity = async (productId, newQuantity) => {
        await updateDoc(doc(db, 'products', productId), {
            quantity: newQuantity
        });
    };

    // Fonction pour afficher les produits à l'écran
    // Cette fonction sera appelée automatiquement chaque fois que les données changent dans Firebase
    const renderProducts = (productsData) => {
        productList.innerHTML = ''; // Vide la liste actuelle des produits
        productsData.forEach(product => {
            const listItem = document.createElement('li');
            listItem.className = 'product-item';
            // On stocke l'ID unique de Firebase pour ce produit
            listItem.dataset.id = product.id;

            listItem.innerHTML = `
                <div class="product-info">
                    <strong>${product.designation}</strong>
                    <span>Quantité: <span id="qty-${product.id}">${product.quantity}</span></span>
                </div>
                <div class="quantity-controls">
                    <button class="decrease-qty" data-id="${product.id}">-</button>
                    <button class="increase-qty" data-id="${product.id}">+</button>
                </div>
                <button class="delete-button" data-id="${product.id}">&#x2715;</button> `;
            productList.appendChild(listItem);
        });
    };

    // Écouteur d'événements pour le formulaire d'ajout/mise à jour de produit
    productForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Empêche la page de se recharger

        const designation = designationInput.value.trim();
        const quantity = parseInt(quantityInput.value);

        // Vérifie si la saisie est valide
        if (designation && !isNaN(quantity) && quantity >= 0) {
            await addOrUpdateProduct(designation, quantity); // Appelle la fonction Firebase
            designationInput.value = ''; // Réinitialise le champ désignation
            quantityInput.value = '1'; // Réinitialise le champ quantité
        } else {
            alert('Veuillez entrer une désignation et une quantité valide.');
        }
    });

    // Écouteur d'événements pour les boutons d'augmentation/diminution/suppression
    productList.addEventListener('click', async (e) => {
        const target = e.target;
        const productId = target.dataset.id; // Récupère l'ID Firebase du produit

        if (productId) { // S'assure que l'ID est présent
            if (target.classList.contains('increase-qty')) {
                const currentQuantity = parseInt(document.getElementById(`qty-${productId}`).textContent);
                await updateProductQuantity(productId, currentQuantity + 1);
            } else if (target.classList.contains('decrease-qty')) {
                const currentQuantity = parseInt(document.getElementById(`qty-${productId}`).textContent);
                if (currentQuantity > 0) { // Ne pas descendre en dessous de 0
                    await updateProductQuantity(productId, currentQuantity - 1);
                }
            } else if (target.classList.contains('delete-button')) {
                const designation = target.closest('.product-item').querySelector('strong').textContent;
                if (confirm(`Êtes-vous sûr de vouloir supprimer "${designation}" ?`)) {
                    await deleteProduct(productId);
                }
            }
        }
    });

    // Cette partie est CRUCIALE : elle écoute les changements en temps réel dans votre base de données Firebase !
    // Chaque fois qu'un produit est ajouté, modifié ou supprimé par n'importe qui,
    // cette fonction se déclenche et met à jour la liste des produits sur tous les écrans connectés.
    onSnapshot(query(collection(db, 'products'), orderBy('designation')), (snapshot) => {
        const productsData = [];
        snapshot.forEach(doc => {
            productsData.push({ id: doc.id, ...doc.data() }); // Ajoute l'ID Firebase à chaque produit
        });
        renderProducts(productsData); // Met à jour l'affichage
    }, (error) => {
        console.error("Erreur lors de la récupération des données Firestore : ", error);
        alert("Impossible de charger les données du stock. Veuillez vérifier votre connexion.");
    });
});