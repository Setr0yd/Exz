// Имя базы данных и версия
const DB_NAME = 'ProductDB';
const DB_VERSION = 1;
const STORE_NAME = 'products';

let db; // Переменная для хранения объекта базы данных

// Функция для открытия/создания базы данных
function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error('Ошибка открытия IndexedDB:', event.target.errorCode);
            reject('Ошибка открытия IndexedDB');
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('IndexedDB успешно открыта');
            resolve(db);
        };

        // Эта функция вызывается, если база данных еще не существует
        // или если указана новая версия (для обновления структуры)
        request.onupgradeneeded = (event) => {
            db = event.target.result;
            // Создаем хранилище объектов (аналог таблицы)
            // 'id' будет использоваться как уникальный ключ
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                // Можно создать индексы для быстрого поиска
                objectStore.createIndex('category', 'category', { unique: false });
                console.log('Хранилище объектов "products" создано');
            }
        };
    });
}

// Функция для добавления продукта
async function addProduct(product) {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.add(product);

    request.onsuccess = () => {
        console.log('Продукт добавлен:', product);
        displayProducts(); // Обновляем список после добавления
    };

    request.onerror = (event) => {
        console.error('Ошибка добавления продукта:', event.target.errorCode);
    };
}

// Функция для получения всех продуктов или продуктов по категории
async function getProducts(category = 'все') {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const objectStore = transaction.objectStore(STORE_NAME);
        const products = [];

        let request;
        if (category === 'все') {
            request = objectStore.openCursor(); // Открываем курсор для всех элементов
        } else {
            // Используем индекс для фильтрации по категории
            const categoryIndex = objectStore.index('category');
            request = categoryIndex.openCursor(IDBKeyRange.only(category));
        }

        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                products.push(cursor.value);
                cursor.continue();
            } else {
                resolve(products);
            }
        };

        request.onerror = (event) => {
            console.error('Ошибка получения продуктов:', event.target.errorCode);
            reject('Ошибка получения продуктов');
        };
    });
}

// Функция для удаления продукта
async function deleteProduct(id) {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.delete(id);

    request.onsuccess = () => {
        console.log('Продукт удален:', id);
        displayProducts(); // Обновляем список после удаления
    };

    request.onerror = (event) => {
        console.error('Ошибка удаления продукта:', event.target.errorCode);
    };
}

// Функция для отображения продуктов на странице
async function displayProducts() {
    const productsContainer = document.getElementById('productsContainer');
    productsContainer.innerHTML = ''; // Очищаем список перед обновлением

    const filterCategory = document.getElementById('filterCategory').value;
    const products = await getProducts(filterCategory);

    if (products.length === 0) {
        productsContainer.innerHTML = '<p>Нет продуктов в списке.</p>';
        return;
    }

    products.forEach(product => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `
            <span>${product.name} (${product.quantity} шт.) - ${product.category}</span>
            <button data-id="${product.id}">Удалить</button>
        `;
        productsContainer.appendChild(listItem);

        // Добавляем обработчик события для кнопки удаления
        listItem.querySelector('button').addEventListener('click', (event) => {
            const productId = parseInt(event.target.dataset.id);
            deleteProduct(productId);
        });
    });
}

// Инициализация приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await openDatabase();
        displayProducts(); // Отображаем продукты после открытия БД

        // Обработчик формы добавления продукта
        document.getElementById('productForm').addEventListener('submit', (event) => {
            event.preventDefault(); // Предотвращаем стандартную отправку формы

            const productName = document.getElementById('productName').value;
            const productQuantity = parseInt(document.getElementById('productQuantity').value);
            const productCategory = document.getElementById('productCategory').value;

            const newProduct = {
                name: productName,
                quantity: productQuantity,
                category: productCategory,
                // id будет автоматически присвоен IndexedDB
            };

            addProduct(newProduct);

            // Очищаем форму
            document.getElementById('productForm').reset();
        });

        // Обработчик изменения фильтра категории
        document.getElementById('filterCategory').addEventListener('change', displayProducts);

    } catch (error) {
        console.error('Ошибка инициализации приложения:', error);
        alert('Не удалось загрузить приложение. Проверьте консоль.');
    }
});
