import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

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

const grid = document.getElementById('products-grid');
const bookingSection = document.querySelector('.booking-section');
const btnBookNow = document.getElementById('btn-book-now');

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
        
        wrapper.innerHTML = `
            <div class="product-card">
                <img src="${p.img}" alt="Product image">
                <div class="product-info">
                    <p>${p.desc}</p>
                </div>
            </div>
        `;
        grid.appendChild(wrapper);
    });

    document.querySelectorAll('.product-wrapper').forEach(wrapper => {
        wrapper.addEventListener('click', () => toggleSelect(wrapper, wrapper.dataset.id));
    });
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
    
    document.getElementById('checkout-img').src = selectedProducts[0].img;
    document.getElementById('checkout-desc').textContent = selectedProducts.map(p => p.desc).join(' + ');
    
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

    const orderData = {
        date: new Date().toISOString(),
        productIds: selectedProducts.map(p => p.id),
        productImg: selectedProducts[0].img,
        productDesc: selectedProducts.map(p => p.desc).join(' | '),
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
