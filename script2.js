// --- Конфигурация IndexedDB ---
const DB_NAME = 'UniversalAppDB'; // Имя вашей базы данных
const DB_VERSION = 1;             // Версия базы данных
const STORE_NAME = 'items';       // Имя объектного хранилища (например, 'users', 'tasks', 'posts')

let db; // Переменная для хранения объекта базы данных

// --- Вспомогательные функции для работы с IndexedDB ---

/**
 * Открывает (или создает) базу данных IndexedDB.
 * Создает объектное хранилище, если оно не существует.
 * @returns {Promise<IDBDatabase>} Промис, который разрешается объектом базы данных.
 */
function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error('Ошибка открытия IndexedDB:', event.target.errorCode, event.target.error);
            reject(new Error('Ошибка открытия IndexedDB'));
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('IndexedDB успешно открыта.');
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                // Создаем объектное хранилище. 'id' будет уникальным ключом, autoIncrement генерирует его.
                const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                // Опционально: создайте индексы для свойств, по которым часто будете искать.
                // Например, если у вас есть свойство 'name' и вы хотите по нему искать:
                objectStore.createIndex('name', 'name', { unique: false });
                console.log(`Объектное хранилище "${STORE_NAME}" создано.`);
            }
        };
    });
}

/**
 * Добавляет новую запись в объектное хранилище.
 * @param {Object} item Объект для добавления.
 * @returns {Promise<number>} Промис, который разрешается ID добавленной записи.
 */
function addItem(item) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(STORE_NAME);
        const request = objectStore.add(item);

        request.onsuccess = (event) => {
            console.log('Запись успешно добавлена:', item);
            resolve(event.target.result); // Возвращает сгенерированный ID
        };

        request.onerror = (event) => {
            console.error('Ошибка добавления записи:', event.target.errorCode, event.target.error);
            reject(new Error('Ошибка добавления записи'));
        };
    });
}

/**
 * Получает все записи из объектного хранилища.
 * @returns {Promise<Array<Object>>} Промис, который разрешается массивом всех записей.
 */
function getAllItems() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const objectStore = transaction.objectStore(STORE_NAME);
        const request = objectStore.getAll(); // Получает все записи

        request.onsuccess = (event) => {
            console.log('Все записи получены.');
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            console.error('Ошибка получения всех записей:', event.target.errorCode, event.target.error);
            reject(new Error('Ошибка получения всех записей'));
        };
    });
}

/**
 * Получает запись по ее ID.
 * @param {number} id ID записи.
 * @returns {Promise<Object|undefined>} Промис, который разрешается объектом или undefined, если не найден.
 */
function getItemById(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const objectStore = transaction.objectStore(STORE_NAME);
        const request = objectStore.get(id);

        request.onsuccess = (event) => {
            console.log(`Запись с ID ${id} получена.`);
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            console.error(`Ошибка получения записи с ID ${id}:`, event.target.errorCode, event.target.error);
            reject(new Error(`Ошибка получения записи с ID ${id}`));
        };
    });
}

/**
 * Обновляет существующую запись.
 * @param {Object} item Объект с обновленными данными (должен содержать 'id').
 * @returns {Promise<void>} Промис, который разрешается после успешного обновления.
 */
function updateItem(item) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(STORE_NAME);
        const request = objectStore.put(item); // put() обновляет, если id существует, или добавляет, если нет

        request.onsuccess = () => {
            console.log('Запись успешно обновлена:', item);
            resolve();
        };

        request.onerror = (event) => {
            console.error('Ошибка обновления записи:', event.target.errorCode, event.target.error);
            reject(new Error('Ошибка обновления записи'));
        };
    });
}

/**
 * Удаляет запись по ее ID.
 * @param {number} id ID записи для удаления.
 * @returns {Promise<void>} Промис, который разрешается после успешного удаления.
 */
function deleteItem(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(STORE_NAME);
        const request = objectStore.delete(id);

        request.onsuccess = () => {
            console.log('Запись успешно удалена, ID:', id);
            resolve();
        };

        request.onerror = (event) => {
            console.error('Ошибка удаления записи:', event.target.errorCode, event.target.error);
            reject(new Error('Ошибка удаления записи'));
        };
    });
}

// --- Логика взаимодействия с DOM ---

const dataForm = document.getElementById('dataForm');
const dataNameInput = document.getElementById('dataName');
const dataValueInput = document.getElementById('dataValue');
const dataListContainer = document.getElementById('dataList');

/**
 * Отображает записи на странице.
 */
async function displayItems() {
    dataListContainer.innerHTML = ''; // Очищаем список
    try {
        const items = await getAllItems();
        if (items.length === 0) {
            dataListContainer.innerHTML = '<p>Нет записей для отображения.</p>';
            return;
        }
        items.forEach(item => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                <span>ID: ${item.id}, Название: ${item.name}, Значение: ${item.value || 'N/A'}</span>
                <button data-id="${item.id}" class="delete-btn">Удалить</button>
            `;
            dataListContainer.appendChild(listItem);

            // Добавляем обработчик для кнопки удаления
            listItem.querySelector('.delete-btn').addEventListener('click', async (event) => {
                const itemId = parseInt(event.target.dataset.id);
                await deleteItem(itemId);
                displayItems(); // Обновляем список после удаления
            });
        });
    } catch (error) {
        console.error('Ошибка при отображении записей:', error);
        dataListContainer.innerHTML = '<p style="color: red;">Ошибка загрузки данных.</p>';
    }
}

// --- Инициализация приложения ---
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await openDatabase(); // Открываем БД при загрузке страницы
        await displayItems(); // Отображаем существующие записи

        // Обработчик отправки формы
        dataForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Предотвращаем перезагрузку страницы

            const name = dataNameInput.value.trim();
            const value = dataValueInput.value.trim();

            if (name) {
                const newItem = { name: name, value: value };
                await addItem(newItem);
                dataForm.reset(); // Очищаем форму
                await displayItems(); // Обновляем список
            } else {
                alert('Пожалуйста, введите название.');
            }
        });

    } catch (error) {
        console.error('Ошибка инициализации приложения:', error);
        alert('Приложение не может быть загружено. Проверьте консоль.');
    }
});
