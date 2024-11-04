package main

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type Client struct {
	conn     *websocket.Conn
	send     chan []byte
	nickname string
}

var clients = make(map[*Client]bool)
var broadcast = make(chan []byte)
var mutex = &sync.Mutex{}

func main() {
	http.HandleFunc("/ws", handleConnections)
	// go handleMessages()
	log.Println("Server started on :5000")
	log.Fatal(http.ListenAndServe(":5000", nil))
}

func handleConnections(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Error upgrading connection:", err)
		return
	}
	client := &Client{conn: conn, send: make(chan []byte)}

	mutex.Lock()
	clients[client] = true
	mutex.Unlock()

	go handleClientMessages(client)
	broadcastUsersList()
	// Start sending messages to the client
	for msg := range client.send {
		err := conn.WriteMessage(websocket.BinaryMessage, msg)
		if err != nil {
			log.Println("Error writing message to client:", err)
			break
		}
	}

	// Clean up
	mutex.Lock()
	if _, ok := clients[client]; ok {
		close(client.send)
		delete(clients, client)
	}
	mutex.Unlock()
	conn.Close()
	broadcastUsersList()
}

func handleClientMessages(client *Client) {
	defer func() {
		// Disconnect client
		mutex.Lock()
		if _, ok := clients[client]; ok {
			close(client.send)
			delete(clients, client)
		}
		mutex.Unlock()
		client.conn.Close()
	}()

	for {
        _, message, err := client.conn.ReadMessage()
        if err != nil {
            break
        }
        
        // Проверить тип сообщения
        var jsonMsg map[string]interface{}
        if err := json.Unmarshal(message, &jsonMsg); err == nil {
            if jsonMsg["type"] == "nickname" {
                client.nickname = jsonMsg["nickname"].(string)
                continue
            }
        }
        
        // Отправка аудио с информацией о говорящем
        audioMsg := map[string]interface{}{
            "type": "audio",
            "nickname": client.nickname,
            "data": message,
        }
        
        encodedMsg, _ := json.Marshal(audioMsg)
        
        mutex.Lock()
        for client_ := range clients {
            if client_ != client {
                client_.send <- encodedMsg
            }
        }
        mutex.Unlock()
	}
}

// func handleMessages() {
// 	for {
// 		msg := <-broadcast

// 	}
// }
func broadcastUsersList() {
    usersList := make([]string, 0)
    mutex.Lock()
    for client := range clients {
        if client.nickname != "" {
            usersList = append(usersList, client.nickname)
        }
    }
    mutex.Unlock()

    message := map[string]interface{}{
        "type": "users",
        "users": usersList,
    }
    jsonMessage, _ := json.Marshal(message)

    mutex.Lock()
    for client := range clients {
        select {
        case client.send <- jsonMessage:
        default:
            log.Println("Failed to send users list")
        }
    }
    mutex.Unlock()
}