package main

import (
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type Client struct {
	conn *websocket.Conn
	send chan []byte
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
			log.Printf("Error reading message from client: %v", err)
			break
		}
        mutex.Lock()
		for client_ := range clients {
			if client_ != client {
                select {
                case client_.send <- message:
                default:
                    log.Println("HUI")
                    // close(client.send)
                    // delete(clients, client)
                }
            }
		}
		mutex.Unlock()
		// broadcast <- message
	}
}

// func handleMessages() {
// 	for {
// 		msg := <-broadcast
		
// 	}
// }
