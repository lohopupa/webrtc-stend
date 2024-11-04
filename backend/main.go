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

const (
	PKT_HELLO = iota
	PKT_UPDATE_USERS = iota
	PKT_SOUND = iota
)

type Client struct {
	conn     *websocket.Conn
	send     chan []byte
	nickname string
}

var clients = make(map[*Client]bool)
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
	client := &Client{conn: conn, send: make(chan []byte), nickname: ""}

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

		switch msgType := message[0]; msgType {
		case PKT_HELLO:
			var jsonMsg map[string]interface{}
			if err := json.Unmarshal(message[1:], &jsonMsg); err == nil {
				client.nickname = jsonMsg["nickname"].(string)
				broadcastUsersList()
				continue
			}
		case PKT_SOUND:
			
			mutex.Lock()
			for client_ := range clients {
				if client_ != client {
					client_.send <- message
				}
			}
			mutex.Unlock()
		case PKT_UPDATE_USERS:
			log.Println("Users paket")
		// default:
			// log.Fatal("PIZDA")
		}
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
        "users": usersList,
    }
    jsonMessage, _ := json.Marshal(message)

	msg := make([]byte, len(jsonMessage) + 1)
	copy(msg[1:], jsonMessage)
	msg[0] = byte(PKT_UPDATE_USERS)

    mutex.Lock()
    for client := range clients {
        select {
        case client.send <- msg:
        default:
            log.Printf("Failed to send users list to %s \n", client.nickname)
        }
    }
    mutex.Unlock()
}