package main

import (
    "log"
    "net/http"
    "sync"

    "github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}
var connections = make(map[*websocket.Conn]bool)
var mutex = sync.Mutex{}

func signalHandler(w http.ResponseWriter, r *http.Request) {
    conn, err := upgrader.Upgrade(w, r, nil)
    if err != nil {
        log.Println("WebSocket upgrade error:", err)
        return
    }
    defer conn.Close()

    mutex.Lock()
    connections[conn] = true
    mutex.Unlock()

    for {
        _, msg, err := conn.ReadMessage()
        if err != nil {
            log.Println("Read error:", err)
            break
        }

        mutex.Lock()
        for c := range connections {
            if c != conn {
                err := c.WriteMessage(websocket.TextMessage, msg)
                if err != nil {
                    log.Println("Write error:", err)
                    c.Close()
                    delete(connections, c)
                }
            }
        }
        mutex.Unlock()
    }

    mutex.Lock()
    delete(connections, conn)
    mutex.Unlock()
}

func main() {
    http.HandleFunc("/ws", signalHandler)
    log.Println("Server started on :5000")
    log.Fatal(http.ListenAndServe(":5000", nil))
}