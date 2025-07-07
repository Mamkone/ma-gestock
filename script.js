document.addEventListener('DOMContentLoaded', () => {
    const productForm = document.getElementById('productForm');
    const designationInput = document.getElementById('designation');
    const quantityInput = document.getElementById('quantity');
    const productList = document.getElementById('productList');

    let products = JSON.parse(localStorage.getItem('products')) || [];

    // Fonction pour sauvegarder les produits dans le localStorage
    const saveProducts = () => {
        localStorage.setItem('products', JSON.stringify(products));
    };

    // Fonction pour afficher les produits
    const renderProducts = () => {
        productList.innerHTML = ''; // Vide la liste actuelle
        products.forEach((product, index) => {
            const listItem = document.createElement('li');
            listItem.className = 'product-item';
            listItem.dataset.index = index; // Pour retrouver l'index facilement

            listItem.innerHTML = `
                <div class="product-info">
                    <strong>${product.designation}</strong>
                    <span>Quantité: <span id="qty-${index}">${product.quantity}</span></span>
                </div>
                <div class="quantity-controls">
                    <button class="decrease-qty" data-index="${index}">-</button>
                    <button class="increase-qty" data-index="${index}">+</button>
                </div>
                <button class="delete-button" data-index="${index}">&#x2715;</button> `;
            productList.appendChild(listItem);
        });
    };

    // Gère l'ajout d'un nouveau produit
    productForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Empêche le rechargement de la page

        const designation = designationInput.value.trim();
        const quantity = parseInt(quantityInput.value);

        if (designation && !isNaN(quantity) && quantity >= 0) {
            // Vérifie si le produit existe déjà
            const existingProductIndex = products.findIndex(p => p.designation.toLowerCase() === designation.toLowerCase());

            if (existingProductIndex > -1) {
                // Si le produit existe, met à jour la quantité
                products[existingProductIndex].quantity += quantity;
            } else {
                // Sinon, ajoute un nouveau produit
                products.push({ designation, quantity });
            }
            saveProducts();
            renderProducts();

            // Réinitialise le formulaire
            designationInput.value = '';
            quantityInput.value = '1';
        } else {
            alert('Veuillez entrer une désignation et une quantité valide.');
        }
    });

    // Gère la modification de quantité ou la suppression
    productList.addEventListener('click', (e) => {
        const target = e.target;
        const index = parseInt(target.dataset.index);

        if (!isNaN(index)) { // S'assure que l'index est valide
            if (target.classList.contains('increase-qty')) {
                products[index].quantity++;
                saveProducts();
                document.getElementById(`qty-${index}`).textContent = products[index].quantity; // Met à jour directement
            } else if (target.classList.contains('decrease-qty')) {
                if (products[index].quantity > 0) {
                    products[index].quantity--;
                    saveProducts();
                    document.getElementById(`qty-${index}`).textContent = products[index].quantity; // Met à jour directement
                }
            } else if (target.classList.contains('delete-button')) {
                if (confirm(`Êtes-vous sûr de vouloir supprimer "${products[index].designation}" ?`)) {
                    products.splice(index, 1); // Supprime l'élément du tableau
                    saveProducts();
                    renderProducts(); // Re-rend la liste pour mettre à jour les index
                }
            }
        }
    });

    // Charge les produits au démarrage
    renderProducts();
});