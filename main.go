package main

import (
	"embed"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"log"
	"net/http"
	"os"
	"sync"
	"time"
)

const (
	port       = ":8090"
	dbFileName = "backup_db.json"
)

// Директива для Go: встроить всё содержимое папки static в переменную staticFS
//
//go:embed static/*
var staticFS embed.FS

var fileMutex sync.Mutex

func main() {
	// Выделяем поддерево папки static, чтобы пути в браузере начинались сразу с index.html, а не static/index.html
	publicFS, err := fs.Sub(staticFS, "static")
	if err != nil {
		log.Fatalf("Ошибка инициализации файловой системы: %v", err)
	}

	// Раздаем статику из встроенной памяти
	http.Handle("/", http.FileServer(http.FS(publicFS)))

	// API Эндпоинты
	http.HandleFunc("/api/sync/pull", handlePull)
	http.HandleFunc("/api/sync/push", handlePush)
	http.HandleFunc("/api/timezones", handleTimezones)

	fmt.Printf("🚀 Сервер запущен на http://localhost%s\n", port)
	if err := http.ListenAndServe(port, nil); err != nil {
		log.Fatalf("Ошибка запуска сервера: %v", err)
	}
}

// ... функции handlePull и handlePush остаются без изменений ...
func handlePull(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Метод не поддерживается", http.StatusMethodNotAllowed)
		return
	}
	fileMutex.Lock()
	defer fileMutex.Unlock()
	w.Header().Set("Content-Type", "application/json")
	if _, err := os.Stat(dbFileName); os.IsNotExist(err) {
		w.Write([]byte("[]"))
		return
	}
	data, err := os.ReadFile(dbFileName)
	if err != nil {
		http.Error(w, "Ошибка чтения бэкапа", http.StatusInternalServerError)
		return
	}
	w.Write(data)
}

func handlePush(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Метод не поддерживается", http.StatusMethodNotAllowed)
		return
	}
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Ошибка чтения тела запроса", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()
	var rawList []interface{}
	if err := json.Unmarshal(body, &rawList); err != nil {
		http.Error(w, "Некорректный формат JSON", http.StatusBadRequest)
		return
	}
	fileMutex.Lock()
	err = os.WriteFile(dbFileName, body, 0644)
	fileMutex.Unlock()
	if err != nil {
		http.Error(w, "Ошибка сохранения данных", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"success"}`))
}

// В самый конец файла main.go добавьте функцию-обработчик:
func handleTimezones(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Список ключевых локаций для примера (Ubuntu поддерживает сотни зон, выберем основные)
	zones := []string{
		"UTC", "Europe/London", "Europe/Paris", "Europe/Moscow", "Europe/Kaliningrad",
		"Asia/Dubai", "Asia/Yekaterinburg", "Asia/Almaty", "Asia/Tashkent", "Asia/Novosibirsk", "Asia/Vladivostok",
		"Asia/Singapore", "Asia/Tokyo", "America/New_York", "America/Los_Angeles",
	}

	type ZoneInfo struct {
		Name   string `json:"name"`   // Например: "Europe/Moscow"
		Offset string `json:"offset"` // Например: "+03:00"
	}

	var result []ZoneInfo
	now := time.Now()

	for _, zoneName := range zones {
		loc, err := time.LoadLocation(zoneName)
		if err != nil {
			continue // Если в ОС нет такой зоны, пропускаем
		}

		// Вычисляем смещение в секундах для текущего момента времени
		_, offsetSec := now.In(loc).Zone()

		// Форматируем секунды в строку ±ЧЧ:ММ
		sign := "+"
		if offsetSec < 0 {
			sign = "-"
			offsetSec = -offsetSec
		}
		hours := offsetSec / 3600
		minutes := (offsetSec % 3600) / 60
		offsetStr := fmt.Sprintf("%s%02d:%02d", sign, hours, minutes)

		result = append(result, ZoneInfo{Name: zoneName, Offset: offsetStr})
	}

	json.NewEncoder(w).Encode(result)
}
