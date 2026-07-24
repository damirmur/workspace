// static/js/db.js
export class DatabaseManager {
    constructor(dbName, version = 1) {
        this.dbName = dbName;
        this.version = version;
        this.db = null;
    }

    connect() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Главная таблица сущностей: все хранятся в одном месте с указанием workspaceId и type
                if (!db.objectStoreNames.contains('entities')) {
                    const store = db.createObjectStore('entities', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('workspaceId', 'workspaceId', { unique: false });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onerror = (event) => reject(event.target.error);
        });
    }
}

export class EntityRepository {
    constructor(dbManager) {
        this.dbManager = dbManager;
    }

    async save(entityData) {
        const db = this.dbManager.db;
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('entities', 'readwrite');
            const store = transaction.objectStore('entities');

            // Если id есть — перезаписываем, если нет — создается новый
            const request = entityData.id ? store.put(entityData) : store.add(entityData);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getByWorkspace(workspaceId) {
        const db = this.dbManager.db;
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('entities', 'readonly');
            const store = transaction.objectStore('entities');
            const index = store.index('workspaceId');
            const request = index.getAll(workspaceId);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    async getAllEntities() {
        const db = this.dbManager.db;
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('entities', 'readonly');
            const store = transaction.objectStore('entities');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async clearAll() {
        const db = this.dbManager.db;
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('entities', 'readwrite');
            const store = transaction.objectStore('entities');
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
    async delete(id) {
        const db = this.dbManager.db;
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('entities', 'readwrite');
            const store = transaction.objectStore('entities');
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
}
