class Cart {
  constructor() {
    this.items = new Map();
  }

  add(product, quantity = 1) {
    const nextQuantity = (this.items.get(product.product_id) || 0) + quantity;
    if (nextQuantity > product.stock) return false;
    this.items.set(product.product_id, nextQuantity);
    return true;
  }

  change(product, change) {
    const nextQuantity = (this.items.get(product.product_id) || 0) + change;
    if (nextQuantity <= 0) this.items.delete(product.product_id);
    else if (nextQuantity <= product.stock) this.items.set(product.product_id, nextQuantity);
  }

  clear() { this.items.clear(); }
  get quantity() { return [...this.items.values()].reduce((total, quantity) => total + quantity, 0); }
  get subtotal() { return [...this.items.entries()].reduce((total, [productId, quantity]) => total + quantity * Number(productCatalog.find((product) => product.product_id === productId)?.price || 0), 0); }
}

let productCatalog = [];
const state = { products: [], categories: [], cart: new Cart(), selectedCategory: 'all', searchTerm: '' };
const money = (value) => `₹${Number(value).toFixed(2)}`;
const byId = (id) => document.getElementById(id);
const getToken = () => localStorage.getItem('freshkartToken');

class ApiClient {
  async request(url, options) {
    const headers = { ...(options?.headers || {}) };
    if (getToken()) headers.Authorization = `Bearer ${getToken()}`;
    const response = await fetch(url, { ...options, headers });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Request failed');
    return data;
  }
}

const api = new ApiClient();
const request = (url, options) => api.request(url, options);

function showToast(message) { const toast = byId('toast'); toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 3000); }
function updateAuthLink() { const authLink = byId('authLink'); if (!authLink) return; const loggedIn = Boolean(getToken()); authLink.textContent = loggedIn ? 'Log out' : 'Log in'; authLink.href = loggedIn ? '#' : 'auth.html'; authLink.onclick = loggedIn ? (event) => { event.preventDefault(); localStorage.removeItem('freshkartToken'); localStorage.removeItem('freshkartUsername'); localStorage.removeItem('freshkartRole'); window.location.reload(); } : null; }

async function loadCatalog() {
  [state.categories, state.products] = await Promise.all([request('/api/categories'), request('/api/products')]);
  productCatalog = state.products;
  renderCategories(); renderProducts();
}

function renderCategories() {
  byId('categories').innerHTML = [{ category_id: 'all', category_name: 'All groceries' }, ...state.categories].map((category) => `<button class="category-tab ${String(state.selectedCategory) === String(category.category_id) ? 'active' : ''}" data-category="${category.category_id}">${category.category_name}</button>`).join('');
  document.querySelectorAll('.category-tab').forEach((button) => button.addEventListener('click', () => { state.selectedCategory = button.dataset.category; renderCategories(); renderProducts(); }));
}

function renderProducts() {
  const categoryProducts = state.selectedCategory === 'all' ? state.products : state.products.filter((product) => String(product.category_id) === String(state.selectedCategory));
  const searchTerm = state.searchTerm.toLowerCase();
  const products = categoryProducts.filter((product) => `${product.product_name} ${product.description || ''} ${product.category_name}`.toLowerCase().includes(searchTerm));
  byId('productCount').textContent = `${products.length} products`;
  byId('products').innerHTML = products.map((product) => `<article class="product-card"><img class="product-image" src="${product.image_url}" alt="${product.product_name}" onerror="this.style.display='none'"><div class="product-info"><h3>${product.product_name}</h3><p>${product.description || 'Fresh grocery essential'}</p><div class="product-row"><span class="price">${money(product.price)}</span><button class="add-button" data-add="${product.product_id}" ${product.stock < 1 ? 'disabled' : ''}>${product.stock < 1 ? 'Sold out' : 'Add +'}</button></div></div></article>`).join('');
  document.querySelectorAll('[data-add]').forEach((button) => button.addEventListener('click', () => addToCart(Number(button.dataset.add))));
}

function addToCart(productId) { const product = state.products.find((item) => item.product_id === productId); if (state.cart.add(product)) showToast(`${product.product_name} added to basket`); else showToast(`Only ${product.stock} available`); renderCart(); }
function changeQuantity(productId, change) { const product = state.products.find((item) => item.product_id === productId); state.cart.change(product, change); renderCart(); }

function renderCart() {
  const lines = [...state.cart.items.entries()].map(([productId, quantity]) => { const product = state.products.find((item) => item.product_id === productId); return `<div class="cart-line"><div><h4>${product.product_name}</h4><small>${money(product.price)} each</small></div><div class="qty-controls"><button data-minus="${productId}">−</button><strong>${quantity}</strong><button data-plus="${productId}">+</button></div></div>`; });
  byId('cartItems').innerHTML = lines.join('') || '<p class="empty-state">Your basket is waiting for something good.</p>'; byId('cartCount').textContent = state.cart.quantity; byId('cartTotal').textContent = money(state.cart.subtotal); byId('subtotal').textContent = money(state.cart.subtotal); byId('checkoutButton').disabled = state.cart.quantity === 0;
  document.querySelectorAll('[data-minus]').forEach((button) => button.addEventListener('click', () => changeQuantity(Number(button.dataset.minus), -1))); document.querySelectorAll('[data-plus]').forEach((button) => button.addEventListener('click', () => changeQuantity(Number(button.dataset.plus), 1)));
}

byId('productSearch').addEventListener('input', (event) => { state.searchTerm = event.target.value.trim(); renderProducts(); });

byId('checkoutButton').addEventListener('click', async () => { const items = [...state.cart.items.entries()].map(([productId, quantity]) => ({ productId, quantity })); if (!getToken()) { sessionStorage.setItem('pendingCheckout', JSON.stringify({ items })); window.location.href = 'auth.html?next=payment'; return; } try { const account = await request('/api/account'); sessionStorage.setItem('pendingCheckout', JSON.stringify({ customerName: account.customer.customer_name, phone: account.customer.phone, address: account.customer.address, items })); window.location.href = 'payment.html'; } catch (error) { showToast(error.message); } }); byId('cartButton').addEventListener('click', () => byId('cartPanel').scrollIntoView({ behavior: 'smooth' }));

(async function start() { updateAuthLink(); try { await loadCatalog(); renderCart(); } catch (error) { byId('products').innerHTML = `<p class="loading">Could not load data: ${error.message}. Start MySQL and check your .env file.</p>`; } })();