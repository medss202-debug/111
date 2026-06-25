import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, onSnapshot, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDoshyzju1pEhR-9ZVgvaNZXzDzn5Rn-t4",
  authDomain: "project-5032938748792409729.firebaseapp.com",
  projectId: "project-5032938748792409729",
  storageBucket: "project-5032938748792409729.firebasestorage.app",
  messagingSenderId: "11260285119",
  appId: "1:11260285119:web:08d63ee844e03db96a760a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let products = [];
let selectedProducts = [];
let globalDeliveryCost = 5000;

const grid = document.getElementById('products-grid');
const bookingSection = document.querySelector('.booking-section');
const btnBookNow = document.getElementById('btn-book-now');

// استماع مباشر للإعدادات لجلب سعر التوصيل الديناميكي
onSnapshot(doc(db, "settings", "general"), (docSnap) => {
    if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.delivery_price) {
            globalDeliveryCost = parseInt(data.delivery_price) || 0;
            updatePriceSummary();
        }
    }
});

async function loadProducts() {
    // تحميل المنتجات المخزنة مسبقاً لسرعة العرض
    const cachedProducts = localStorage.getItem('store_products_cache');
    if (cachedProducts) {
        products = JSON.parse(cachedProducts);
        renderCustomerProducts();
    }

    try {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"), limit(6));
        const snapshot = await getDocs(q);
        products = [];
        snapshot.forEach(doc => {
            products.push({ id: doc.id, ...doc.data() });
        });
        // تحديث التخزين المحلي
        localStorage.setItem('store_products_cache', JSON.stringify(products));
        renderCustomerProducts();
    } catch(err) {
        console.error(err);
        if (!cachedProducts) {
            grid.innerHTML = '<p style="text-align:center; color:red; grid-column: span 2;">فشل في تحميل المنتجات تأكد من الاتصال بالانترنت.</p>';
        }
    }
}

loadProducts();

function renderCustomerProducts() {
    grid.innerHTML = '';
    
    if (products.length === 0) {
        grid.innerHTML = '<p style="text-align:center; color:#888; grid-column: span 2;">لا توجد منتجات حالياً.</p>';
        return;
    }

    products.forEach(p => {
        const wrapper = document.createElement('div');
        wrapper.className = 'product-wrapper';
        wrapper.dataset.id = p.id;
        
        const pImg = p.image || p.img || '';
        const pName = p.name || 'منتج غير محدد';
        const pPrice = p.price || '0';
        const pDesc = p.description || p.desc || '';
        
        const pPriceNum = parseInt(pPrice.toString().replace(/[^\d]/g, "")) || 0;
        
        wrapper.innerHTML = `
            <div class="product-card">
                <img src="${pImg}" alt="${pName}">
                <div class="product-info">
                    <h3 style="margin:0 0 5px 0; font-size:1.1rem; color:#333;">${pName}</h3>
                    <p style="color:#2ecc71; font-weight:bold; margin-bottom:8px;">${pPriceNum.toLocaleString('en-US')} د.ع</p>
                    <p style="font-size:0.9rem; color:#666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${pDesc}</p>
                </div>
            </div>
        `;
        grid.appendChild(wrapper);
    });

    document.querySelectorAll('.product-wrapper').forEach(wrapper => {
        wrapper.addEventListener('click', () => toggleSelect(wrapper, wrapper.dataset.id));
    });
}

function updatePriceSummary() {
    let subtotal = 0;
    selectedProducts.forEach(p => {
        const priceStr = p.price || '0';
        const priceNum = parseInt(priceStr.toString().replace(/[^\d]/g, "")) || 0;
        subtotal += priceNum;
    });

    const deliveryCost = globalDeliveryCost;
    const total = subtotal > 0 ? subtotal + deliveryCost : 0;

    const miniSubtotal = document.getElementById('mini-subtotal');
    const miniDelivery = document.getElementById('mini-delivery');
    const miniTotal = document.getElementById('mini-total');
    
    if (miniSubtotal) miniSubtotal.textContent = subtotal.toLocaleString('en-US');
    if (miniDelivery) miniDelivery.textContent = deliveryCost.toLocaleString('en-US');
    if (miniTotal) miniTotal.textContent = total.toLocaleString('en-US');
    
    // Also update checkout modal elements if they exist
    const checkoutSubtotal = document.getElementById('checkout-subtotal');
    const checkoutDelivery = document.getElementById('checkout-delivery');
    const checkoutTotal = document.getElementById('checkout-total');
    if (checkoutSubtotal) checkoutSubtotal.textContent = subtotal.toLocaleString('en-US');
    if (checkoutDelivery) checkoutDelivery.textContent = deliveryCost.toLocaleString('en-US');
    if (checkoutTotal) checkoutTotal.textContent = total.toLocaleString('en-US');
    
    return { subtotal, total, deliveryCost };
}

function toggleSelect(wrapper, id) {
    const p = products.find(prod => prod.id === id);
    if (!p) return;

    if (wrapper.classList.contains('selected')) {
        wrapper.classList.remove('selected');
        selectedProducts = selectedProducts.filter(prod => prod.id !== id);
    } else {
        wrapper.classList.add('selected');
        selectedProducts.push(p);
    }

    updatePriceSummary();

    if (selectedProducts.length > 0) {
        bookingSection.classList.add('show');
    } else {
        bookingSection.classList.remove('show');
    }
}

const modalCheckout = document.getElementById('modal-checkout');
const modalSuccess = document.getElementById('modal-success');

btnBookNow.addEventListener('click', () => {
    if (selectedProducts.length === 0) return;
    
    const pImg = selectedProducts[0].image || selectedProducts[0].img || '';
    document.getElementById('checkout-img').src = pImg;
    document.getElementById('checkout-desc').textContent = selectedProducts.map(p => p.name || 'منتج').join(' + ');
    
    updatePriceSummary();
    
    document.getElementById('order-name').value = '';
    document.getElementById('order-phone').value = '';
    document.getElementById('order-gov').value = '';
    document.getElementById('order-address').value = '';

    modalCheckout.classList.add('show');
});

document.getElementById('btn-cancel-order').addEventListener('click', () => {
    modalCheckout.classList.remove('show');
});

document.getElementById('btn-submit-order').addEventListener('click', async () => {
    const name = document.getElementById('order-name').value.trim();
    const phone = document.getElementById('order-phone').value.trim();
    const gov = document.getElementById('order-gov').value;
    const address = document.getElementById('order-address').value.trim();

    document.getElementById('checkout-error').style.display = 'none';

    if (!name || !phone || !gov || !address) {
        const err = document.getElementById('checkout-error');
        err.textContent = "الرجاء إكمال جميع الحقول.";
        err.style.display = 'block';
        return;
    }

    if (!/^\d{11}$/.test(phone)) {
        const err = document.getElementById('checkout-error');
        err.textContent = "خطأ: يرجى كتابة رقم الهاتف بشكل صحيح، ويجب أن يكون 11 رقماً بالضبط.";
        err.style.display = 'block';
        return;
    }

    const btn = document.getElementById('btn-submit-order');
    btn.disabled = true;
    btn.textContent = 'جاري الإرسال...';

    const { subtotal, total, deliveryCost } = updatePriceSummary();
    
    const orderData = {
        date: new Date().toISOString(),
        productIds: selectedProducts.map(p => p.id),
        products: selectedProducts.map(p => ({
            id: p.id,
            name: p.name || 'منتج',
            img: p.image || p.img || '',
            price: parseInt((p.price || '0').toString().replace(/[^\d]/g, "")) || 0
        })),
        productImg: selectedProducts[0].image || selectedProducts[0].img || '',
        productDesc: selectedProducts.map(p => p.name || 'منتج').join(' | '),
        subtotalPrice: subtotal,
        deliveryCost: deliveryCost,
        totalPrice: total,
        name,
        phone,
        gov,
        address
    };

    try {
        await addDoc(collection(db, "orders"), orderData);

        // تفريغ التحديد
        selectedProducts = [];
        document.querySelectorAll('.product-wrapper').forEach(el => el.classList.remove('selected'));
        bookingSection.classList.remove('show');

        modalCheckout.classList.remove('show');
        modalSuccess.classList.add('show');
    } catch(e) {
        const err = document.getElementById('checkout-error');
        err.textContent = "حدث خطأ أثناء إرسال الطلب، يرجى المحاولة لاحقاً.";
        err.style.display = 'block';
        console.error(e);
    } finally {
        btn.disabled = false;
        btn.textContent = 'إرسال الطلب';
    }
});

document.getElementById('btn-visit-store').addEventListener('click', () => {
    window.location.href = 'https://medss202-debug.github.io/usr/';
});

document.getElementById('btn-skip').addEventListener('click', () => {
    modalSuccess.classList.remove('show');
});
