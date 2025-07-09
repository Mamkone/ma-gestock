// **** NOUVEAU CONTENU COMPLET ET CORRECT DE SCRIPT.JS ****

// Import des fonctions nécessaires du SDK Firebase (spécifiques à ce module)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, onSnapshot, orderBy } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// Votre configuration Firebase (DOIT être la même que dans index.html)
const firebaseConfig = {
  apiKey: "AIzaSyBd7_E3cPprFPVkC6_CCpwt57tDghU4y2E",
  authDomain: "magestock-for-team.firebaseapp.com",
  projectId: "magestock-for-team",
  storageBucket: "magestock-for-team.firebasestorage.app",
  messagingSenderId: "109154510782",
  appId: "1:109154510782:web:fdddbf05dfab8c6d78fbef"
};

// Initialisation de Firebase et Firestore dans ce module (script.js)
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


document.addEventListener('DOMContentLoaded', () => {
    const productForm = document.getElementById('productForm');
    const designationInput = document.getElementById('designation');
    const quantityInput = document.getElementById('quantity');
    const productList = document.getElementById('productList');

    // Référence à la collection 'products' dans Firestore
    const productsCollectionRef = collection(db, 'products');

    // Fonction pour ajouter un nouveau produit ou mettre à jour une quantité existante
    const addOrUpdateProduct = async (designation, quantity) => {
        const q = query(productsCollectionRef, where('designation', '==', designation));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const documentRef = querySnapshot.docs[0];
            const currentQuantity = documentRef.data().quantity;
            await updateDoc(doc(db, 'products', documentRef.id), {
                quantity: currentQuantity + quantity
            });
        } else {
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
    const renderProducts = (productsData) => {
        productList.innerHTML = '';
        productsData.forEach(product => {
            const listItem = document.createElement('li');
            listItem.className = 'product-item';
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
                <button class="delete-button" data-id="${product.id}">&#x2715;</button>
            `;
            productList.appendChild(listItem);
        });
    };

    // Écouteur d'événements pour le formulaire d'ajout/mise à jour de produit
    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const designation = designationInput.value.trim();
        const quantity = parseInt(quantityInput.value);

        if (designation && !isNaN(quantity) && quantity >= 0) {
            await addOrUpdateProduct(designation, quantity);
            designationInput.value = '';
            quantityInput.value = '1';
        } else {
            alert('Veuillez entrer une désignation et une quantité valide.');
        }
    });

    // Écouteur d'événements pour les boutons de modification/suppression
    productList.addEventListener('click', async (e) => {
        const target = e.target;
        const productId = target.dataset.id;

        if (productId) {
            if (target.classList.contains('increase-qty')) {
                const currentQuantity = parseInt(document.getElementById(`qty-${productId}`).textContent);
                await updateProductQuantity(productId, currentQuantity + 1);
            } else if (target.classList.contains('decrease-qty')) {
                const currentQuantity = parseInt(document.getElementById(`qty-${productId}`).textContent);
                if (currentQuantity > 0) {
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

    // Écoute les changements en temps réel dans la collection 'products'
    onSnapshot(query(productsCollectionRef, orderBy('designation')), (snapshot) => {
        const productsData = [];
        snapshot.forEach(doc => {
            productsData.push({ id: doc.id, ...doc.data() });
        });
        renderProducts(productsData);
    }, (error) => {
        console.error("Erreur lors de la récupération des données Firestore : ", error);
        alert("Impossible de charger les données du stock. Veuillez vérifier votre connexion.");
    });
});